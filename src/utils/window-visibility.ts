import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Ensure the current Tauri window is visible.
 *
 * The kusa Tauri window is created with `.visible(false)` (see issue #69),
 * so the frontend is solely responsible for making the window visible.
 * Previously this responsibility was a single `getCurrentWindow().show()`
 * call wrapped in an empty `.catch(() => {})`, which silently swallowed
 * any failure and left the window permanently hidden.
 *
 * This helper:
 *   1. Tries `show()` up to `retries` times (default 3).
 *   2. After each attempt, confirms visibility via `isVisible()` and retries
 *      if `isVisible()` returns `false`.
 *   3. Backs off by `100 * (i + 1)` ms (100ms, 200ms, 300ms by default).
 *   4. Logs every failure to the console.
 *   5. On retry exhaustion, runs a final fallback chain
 *      `setFocus -> center -> show` to force visibility.
 *   6. If the fallback also fails, logs a FATAL error and returns normally
 *      (never throws) so callers do not have to handle exceptions.
 *
 * @param retries number of show attempts before falling back (default 3)
 */
export async function ensureWindowVisible(retries = 3): Promise<void> {
  const win = getCurrentWindow();

  for (let i = 0; i < retries; i++) {
    try {
      await win.show();
      const visible = await win.isVisible();
      if (visible) return;
      console.warn(
        `[kusa] show() succeeded but isVisible=false, attempt ${i + 1}`,
      );
    } catch (err) {
      console.error(
        `[kusa] window.show() failed (attempt ${i + 1}/${retries}):`,
        err,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 100 * (i + 1)));
  }

  // Final fallback: force visibility via setFocus + center + show.
  try {
    await win.setFocus();
    await win.center();
    await win.show();
  } catch (err) {
    console.error("[kusa] FATAL: cannot show window:", err);
  }
}
