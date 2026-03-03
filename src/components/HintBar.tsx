import { type Component, createSignal, onMount, onCleanup } from "solid-js";

export interface HintBarProps {
  /** Whether the hint bar should be visible (peek mode only) */
  visible: boolean;
}

/**
 * HintBar displays keyboard shortcut hints at the bottom of the peek window.
 * Auto-fades after 3 seconds, re-shows on mouse move or key press.
 */
const HintBar: Component<HintBarProps> = (props) => {
  const [show, setShow] = createSignal(true);
  let fadeTimer: ReturnType<typeof setTimeout> | undefined;

  function startFadeTimer() {
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(() => {
      setShow(false);
    }, 3000);
  }

  function resetVisibility() {
    setShow(true);
    startFadeTimer();
  }

  onMount(() => {
    startFadeTimer();

    // Re-show on mouse movement or key press within the window
    document.addEventListener("mousemove", resetVisibility);
    document.addEventListener("keydown", resetVisibility);
  });

  onCleanup(() => {
    clearTimeout(fadeTimer);
    document.removeEventListener("mousemove", resetVisibility);
    document.removeEventListener("keydown", resetVisibility);
  });

  return (
    <div
      class="fixed bottom-0 left-0 right-0 flex items-center justify-center px-4 py-2 text-xs transition-opacity duration-300 pointer-events-none select-none"
      style={{
        opacity: props.visible && show() ? "1" : "0",
        "background":
          "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)",
      }}
    >
      <div class="flex items-center gap-4 text-zinc-400">
        <span>
          <kbd class="px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300 font-mono text-[10px]">
            Esc
          </kbd>{" "}
          閉じる
        </span>
        <span>
          <kbd class="px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300 font-mono text-[10px]">
            f
          </kbd>{" "}
          フルウィンドウ
        </span>
        <span>
          <kbd class="px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300 font-mono text-[10px]">
            q
          </kbd>{" "}
          閉じる
        </span>
      </div>
    </div>
  );
};

export default HintBar;
