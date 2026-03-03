import { createSignal, createEffect, onCleanup } from "solid-js";

/**
 * Focus mode dims all sections except the currently active one.
 * Uses CSS opacity on section boundaries determined by heading elements.
 */
export function useFocusMode(
  getContainer: () => HTMLElement | undefined,
  getActiveId: () => string | null
) {
  const [isEnabled, setIsEnabled] = createSignal(false);

  function applyFocus(container: HTMLElement, activeId: string | null) {
    const allElements = container.children;

    if (!activeId || !isEnabled()) {
      // Remove all dimming
      for (const el of allElements) {
        (el as HTMLElement).style.opacity = "";
        (el as HTMLElement).style.transition = "opacity 0.3s ease";
      }
      return;
    }

    // Find the active heading element
    const activeEl = container.querySelector(`#${CSS.escape(activeId)}`);
    if (!activeEl) return;

    // Determine the section: from active heading to next heading of same or higher level
    const activeTag = activeEl.tagName; // e.g., H2
    const activeLevel = parseInt(activeTag[1], 10);

    let inActiveSection = false;

    for (const el of allElements) {
      const htmlEl = el as HTMLElement;
      htmlEl.style.transition = "opacity 0.3s ease";

      if (el === activeEl) {
        inActiveSection = true;
        htmlEl.style.opacity = "1";
        continue;
      }

      if (inActiveSection) {
        // Check if this is a heading of same or higher level (end of section)
        const tag = el.tagName;
        if (/^H[1-6]$/.test(tag)) {
          const level = parseInt(tag[1], 10);
          if (level <= activeLevel) {
            inActiveSection = false;
            htmlEl.style.opacity = "0.2";
            continue;
          }
        }
        htmlEl.style.opacity = "1";
      } else {
        htmlEl.style.opacity = "0.2";
      }
    }
  }

  // Re-apply focus when active heading changes or mode toggles
  createEffect(() => {
    const container = getContainer();
    const activeId = getActiveId();
    const enabled = isEnabled();

    if (!container) return;

    if (enabled) {
      applyFocus(container, activeId);
    } else {
      // Clear all opacity
      for (const el of container.children) {
        (el as HTMLElement).style.opacity = "";
        (el as HTMLElement).style.transition = "";
      }
    }
  });

  return { isEnabled, setIsEnabled, toggle: () => setIsEnabled((v) => !v) };
}
