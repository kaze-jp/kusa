import { createSignal, onCleanup } from "solid-js";

/**
 * Tracks scroll progress of a container element.
 * Returns progress (0-100) and whether the progress bar should be visible.
 * Uses requestAnimationFrame for scroll event throttling.
 */
export function useReadingProgress() {
  const [progress, setProgress] = createSignal(0);
  const [isScrollable, setIsScrollable] = createSignal(false);

  let rafId: number | null = null;
  let currentContainer: HTMLElement | null = null;

  function handleScroll() {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (!currentContainer) return;

      const { scrollTop, scrollHeight, clientHeight } = currentContainer;
      const maxScroll = scrollHeight - clientHeight;

      if (maxScroll <= 0) {
        setProgress(0);
        setIsScrollable(false);
        return;
      }

      setIsScrollable(true);
      setProgress((scrollTop / maxScroll) * 100);
    });
  }

  function attach(container: HTMLElement) {
    detach();
    currentContainer = container;
    container.addEventListener("scroll", handleScroll, { passive: true });

    // Check initial scrollability
    requestAnimationFrame(() => {
      if (!currentContainer) return;
      const { scrollHeight, clientHeight } = currentContainer;
      setIsScrollable(scrollHeight > clientHeight);
    });
  }

  function detach() {
    if (currentContainer) {
      currentContainer.removeEventListener("scroll", handleScroll);
      currentContainer = null;
    }
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  onCleanup(detach);

  return { progress, isScrollable, attach, detach };
}
