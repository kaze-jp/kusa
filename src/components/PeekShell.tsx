import { type Component, type JSX, onMount, onCleanup, createSignal } from "solid-js";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isPeekMode } from "../stores/windowMode";
import HintBar from "./HintBar";
import PeekKeyHandler from "./PeekKeyHandler";

export interface PeekShellProps {
  children: JSX.Element;
}

/**
 * PeekShell wraps content with peek-mode-specific UI:
 * - Rounded corners and drop shadow (CSS-based, no window transparency needed)
 * - Focus-loss auto-close (blur event)
 * - HintBar for keyboard shortcut hints
 * - PeekKeyHandler for Esc/q/f shortcuts
 */
const PeekShell: Component<PeekShellProps> = (props) => {
  const [hasFocus, setHasFocus] = createSignal(true);
  let blurCleanup: (() => void) | undefined;

  onMount(async () => {
    const appWindow = getCurrentWindow();

    // Listen for window focus/blur events
    const unlistenBlur = await appWindow.onFocusChanged(({ payload: focused }) => {
      setHasFocus(focused);

      if (!focused && isPeekMode()) {
        // Auto-close on focus loss in peek mode
        appWindow.close().catch((err) => {
          console.error("Failed to close peek window on blur:", err);
        });
      }
    });

    blurCleanup = unlistenBlur;
  });

  onCleanup(() => {
    blurCleanup?.();
  });

  return (
    <div
      class="h-full w-full overflow-hidden"
      classList={{
        "rounded-lg shadow-2xl": isPeekMode(),
      }}
      style={{
        ...(isPeekMode()
          ? {
              "box-shadow":
                "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)",
            }
          : {}),
      }}
    >
      <PeekKeyHandler />
      <div class="h-full w-full overflow-auto bg-zinc-900 text-zinc-100">
        {props.children}
      </div>
      <HintBar visible={isPeekMode()} />
    </div>
  );
};

export default PeekShell;
