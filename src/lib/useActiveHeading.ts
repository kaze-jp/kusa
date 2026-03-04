import { createSignal, onCleanup } from "solid-js";

/**
 * Tracks which heading is currently active in the preview container
 * using scroll position. Returns the active heading ID as a signal.
 *
 * Algorithm: find the last heading whose top edge has scrolled past
 * a threshold near the top of the container. Falls back to the first
 * heading when nothing has scrolled past yet.
 */
export function useActiveHeading() {
  const [activeId, setActiveId] = createSignal<string | null>(null);
  let cleanupFn: (() => void) | null = null;

  /**
   * Start tracking heading elements within the given scroll container.
   */
  function observe(container: HTMLElement) {
    disconnect();

    const headingElements = container.querySelectorAll(
      "h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]"
    );

    if (headingElements.length === 0) {
      setActiveId(null);
      return;
    }

    let ticking = false;
    let rafId: number | null = null;

    function update() {
      ticking = false;
      rafId = null;

      const containerTop = container.getBoundingClientRect().top;
      // A heading is "active" when its top edge is at or above this
      // threshold (slightly below the container's top edge).
      const threshold = containerTop + 40;

      let active: string | null = null;

      for (const el of headingElements) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= threshold) {
          active = el.id;
        }
      }

      // If nothing has scrolled past yet, highlight the first heading
      if (!active && headingElements.length > 0) {
        active = (headingElements[0] as HTMLElement).id;
      }

      setActiveId(active);
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        rafId = requestAnimationFrame(update);
      }
    }

    // Set initial state
    update();

    container.addEventListener("scroll", onScroll, { passive: true });

    cleanupFn = () => {
      container.removeEventListener("scroll", onScroll);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
        ticking = false;
      }
    };
  }

  function disconnect() {
    if (cleanupFn) {
      cleanupFn();
      cleanupFn = null;
    }
  }

  onCleanup(disconnect);

  return { activeId, observe, disconnect };
}
