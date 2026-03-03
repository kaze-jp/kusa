import { createSignal } from "solid-js";

export type WindowMode = "peek" | "full";

export interface WindowModeState {
  /** Current window mode */
  mode: WindowMode;
  /** Mode at launch time (used to detect promotion) */
  initialMode: WindowMode;
}

const [windowModeState, setWindowModeState] = createSignal<WindowModeState>({
  mode: "full",
  initialMode: "full",
});

/** Whether the window is currently in peek mode */
export const isPeekMode = () => windowModeState().mode === "peek";

/** Whether the window was originally launched in peek mode */
export const wasLaunchedAsPeek = () =>
  windowModeState().initialMode === "peek";

/** Get the current window mode state */
export const windowMode = windowModeState;

/** Initialize window mode from Rust backend event */
export function initWindowMode(mode: WindowMode): void {
  setWindowModeState({ mode, initialMode: mode });
}

/** Promote from peek to full mode (frontend state only) */
export function promoteToFullMode(): void {
  setWindowModeState((prev) => ({
    ...prev,
    mode: "full",
  }));
}
