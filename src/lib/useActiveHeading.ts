import { createSignal, onCleanup } from "solid-js";

/**
 * Tracks which heading is currently visible in the preview container
 * using IntersectionObserver. Returns the active heading ID as a signal.
 */
export function useActiveHeading() {
  const [activeId, setActiveId] = createSignal<string | null>(null);
  let observer: IntersectionObserver | null = null;

  /**
   * Start observing heading elements within the given container.
   * Tracks which heading is closest to the top of the viewport.
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

    // Track visibility of all headings
    const visibleHeadings = new Map<string, IntersectionObserverEntry>();

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).id;
          if (entry.isIntersecting) {
            visibleHeadings.set(id, entry);
          } else {
            visibleHeadings.delete(id);
          }
        }

        // Find the topmost visible heading
        if (visibleHeadings.size > 0) {
          let topmost: { id: string; top: number } | null = null;
          for (const [id, entry] of visibleHeadings) {
            if (!topmost || entry.boundingClientRect.top < topmost.top) {
              topmost = { id, top: entry.boundingClientRect.top };
            }
          }
          if (topmost) {
            setActiveId(topmost.id);
          }
        } else {
          // No heading visible: find the last heading that scrolled past the top
          const containerRect = container.getBoundingClientRect();
          let lastPassedId: string | null = null;

          for (const el of headingElements) {
            const rect = el.getBoundingClientRect();
            if (rect.top < containerRect.top + 10) {
              lastPassedId = el.id;
            }
          }

          if (lastPassedId) {
            setActiveId(lastPassedId);
          }
        }
      },
      {
        root: container,
        rootMargin: "0px 0px -70% 0px",
        threshold: [0, 1],
      }
    );

    for (const el of headingElements) {
      observer.observe(el);
    }

    // Set initial active heading (first heading)
    if (headingElements.length > 0) {
      setActiveId(headingElements[0].id);
    }
  }

  function disconnect() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  onCleanup(disconnect);

  return { activeId, observe, disconnect };
}
