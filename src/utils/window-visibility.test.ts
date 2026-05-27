import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mocks for the Tauri window object methods. They are reset in beforeEach.
const showMock = vi.fn();
const isVisibleMock = vi.fn();
const setFocusMock = vi.fn();
const centerMock = vi.fn();

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    show: showMock,
    isVisible: isVisibleMock,
    setFocus: setFocusMock,
    center: centerMock,
  }),
}));

// Import after vi.mock so the mock is wired up before module evaluation.
import { ensureWindowVisible } from "./window-visibility";

describe("ensureWindowVisible", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    showMock.mockReset();
    isVisibleMock.mockReset();
    setFocusMock.mockReset();
    centerMock.mockReset();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("returns on first try when show succeeds and isVisible=true", async () => {
    showMock.mockResolvedValue(undefined);
    isVisibleMock.mockResolvedValue(true);

    await ensureWindowVisible();

    expect(showMock).toHaveBeenCalledTimes(1);
    expect(isVisibleMock).toHaveBeenCalledTimes(1);
    expect(setFocusMock).not.toHaveBeenCalled();
    expect(centerMock).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("retries when isVisible returns false then true, logs warning, no fallback", async () => {
    showMock.mockResolvedValue(undefined);
    isVisibleMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    const p = ensureWindowVisible();
    // Advance 100ms for attempt 1 backoff.
    await vi.advanceTimersByTimeAsync(100);
    await p;

    expect(showMock).toHaveBeenCalledTimes(2);
    expect(isVisibleMock).toHaveBeenCalledTimes(2);
    expect(setFocusMock).not.toHaveBeenCalled();
    expect(centerMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain("attempt 1");
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("retries when show throws, logs error, succeeds on next try", async () => {
    showMock
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(undefined);
    isVisibleMock.mockResolvedValueOnce(true);

    const p = ensureWindowVisible();
    await vi.advanceTimersByTimeAsync(100);
    await p;

    expect(showMock).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0]?.[0]).toContain("attempt 1/3");
    expect(setFocusMock).not.toHaveBeenCalled();
    expect(centerMock).not.toHaveBeenCalled();
  });

  it("exhausts retries and runs fallback setFocus -> center -> show", async () => {
    showMock.mockResolvedValue(undefined);
    isVisibleMock.mockResolvedValue(false);
    setFocusMock.mockResolvedValue(undefined);
    centerMock.mockResolvedValue(undefined);

    const p = ensureWindowVisible();
    // 3 retries → backoff 100 + 200 + 300 = 600ms total.
    await vi.advanceTimersByTimeAsync(600);
    await p;

    expect(showMock).toHaveBeenCalledTimes(4); // 3 retries + 1 fallback
    expect(warnSpy).toHaveBeenCalledTimes(3);
    expect(setFocusMock).toHaveBeenCalledTimes(1);
    expect(centerMock).toHaveBeenCalledTimes(1);
    // Fallback order check: setFocus before center before final show.
    expect(setFocusMock.mock.invocationCallOrder[0]).toBeLessThan(
      centerMock.mock.invocationCallOrder[0]!,
    );
    expect(centerMock.mock.invocationCallOrder[0]).toBeLessThan(
      showMock.mock.invocationCallOrder[3]!,
    );
    // No FATAL: fallback succeeded.
    const fatalLogged = errorSpy.mock.calls.some((call: unknown[]) =>
      String(call[0]).includes("FATAL"),
    );
    expect(fatalLogged).toBe(false);
  });

  it("logs FATAL when fallback also throws and returns normally", async () => {
    showMock.mockResolvedValue(undefined);
    isVisibleMock.mockResolvedValue(false);
    setFocusMock.mockRejectedValue(new Error("setFocus failed"));

    const p = ensureWindowVisible();
    await vi.advanceTimersByTimeAsync(600);
    await expect(p).resolves.toBeUndefined();

    const fatalLogged = errorSpy.mock.calls.some((call: unknown[]) =>
      String(call[0]).includes("FATAL"),
    );
    expect(fatalLogged).toBe(true);
  });

  it("with retries=0 skips the loop and runs fallback immediately", async () => {
    showMock.mockResolvedValue(undefined);
    setFocusMock.mockResolvedValue(undefined);
    centerMock.mockResolvedValue(undefined);

    await ensureWindowVisible(0);

    expect(setFocusMock).toHaveBeenCalledTimes(1);
    expect(centerMock).toHaveBeenCalledTimes(1);
    expect(showMock).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("uses increasing backoff (100ms, 200ms, 300ms) before each retry", async () => {
    showMock.mockResolvedValue(undefined);
    isVisibleMock.mockResolvedValue(false);
    setFocusMock.mockResolvedValue(undefined);
    centerMock.mockResolvedValue(undefined);

    const p = ensureWindowVisible();

    // After 0ms: only the first attempt should have run (1 show).
    await vi.advanceTimersByTimeAsync(0);
    expect(showMock).toHaveBeenCalledTimes(1);

    // After 100ms: second attempt should have run (2 shows).
    await vi.advanceTimersByTimeAsync(100);
    expect(showMock).toHaveBeenCalledTimes(2);

    // After +200ms: third attempt (3 shows).
    await vi.advanceTimersByTimeAsync(200);
    expect(showMock).toHaveBeenCalledTimes(3);

    // After +300ms: retries exhausted; fallback runs (4 total shows).
    await vi.advanceTimersByTimeAsync(300);
    await p;
    expect(showMock).toHaveBeenCalledTimes(4);
  });
});
