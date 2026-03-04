/**
 * SplitLayout: resizable left + right pane layout with a draggable divider.
 *
 * - Default 50:50 split
 * - Minimum pane width 200px
 * - Maintains ratio on window resize
 */

import { createSignal, onMount, onCleanup, type JSX } from "solid-js";

interface SplitLayoutProps {
  left: JSX.Element;
  right: JSX.Element;
}

export default function SplitLayout(props: SplitLayoutProps) {
  let containerRef: HTMLDivElement | undefined;
  const [leftRatio, setLeftRatio] = createSignal(0.5);
  const [dragging, setDragging] = createSignal(false);

  const MIN_PX = 200;

  function getLeftWidth(): string {
    return `calc(${leftRatio() * 100}% - 2px)`;
  }

  function getRightWidth(): string {
    return `calc(${(1 - leftRatio()) * 100}% - 2px)`;
  }

  function onPointerDown(e: PointerEvent) {
    e.preventDefault();
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging() || !containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    const totalWidth = rect.width;
    const x = e.clientX - rect.left;

    // Clamp to minimum pane widths
    const minRatio = MIN_PX / totalWidth;
    const maxRatio = 1 - MIN_PX / totalWidth;
    const ratio = Math.max(minRatio, Math.min(maxRatio, x / totalWidth));
    setLeftRatio(ratio);
  }

  function onPointerUp() {
    setDragging(false);
  }

  // Keep ratio stable on window resize (ratio is already relative, so this
  // naturally preserves the split). We just need to clamp if the window gets
  // very small.
  function onResize() {
    if (!containerRef) return;
    const totalWidth = containerRef.getBoundingClientRect().width;
    if (totalWidth < MIN_PX * 2 + 4) return; // too small, don't adjust
    const minRatio = MIN_PX / totalWidth;
    const maxRatio = 1 - MIN_PX / totalWidth;
    setLeftRatio((r) => Math.max(minRatio, Math.min(maxRatio, r)));
  }

  onMount(() => {
    window.addEventListener("resize", onResize);
  });

  onCleanup(() => {
    window.removeEventListener("resize", onResize);
  });

  return (
    <div
      ref={containerRef}
      class="flex h-full w-full overflow-hidden"
      style={{ "user-select": dragging() ? "none" : "auto" }}
    >
      {/* Left pane (editor) */}
      <div
        class="h-full overflow-hidden"
        style={{ width: getLeftWidth(), "flex-shrink": "0" }}
      >
        {props.left}
      </div>

      {/* Divider */}
      <div
        class="h-full w-[4px] cursor-col-resize flex-shrink-0 bg-zinc-700 transition-colors hover:bg-zinc-500"
        classList={{ "bg-zinc-500": dragging() }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />

      {/* Right pane (preview) */}
      <div
        class="flex h-full flex-col overflow-hidden"
        style={{ width: getRightWidth(), "flex-shrink": "0" }}
      >
        {props.right}
      </div>
    </div>
  );
}
