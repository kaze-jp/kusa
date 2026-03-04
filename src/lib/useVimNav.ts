import { createSignal, onCleanup } from "solid-js";
import { isPeekMode } from "../stores/windowMode";
import type { HeadingInfo } from "./markdown";

const SEQUENCE_TIMEOUT = 500;

export interface VimNavActions {
  /** Jump to a specific heading by ID */
  jumpToHeading: (id: string) => void;
  /** Scroll to the top of the document */
  scrollToTop: () => void;
  /** Scroll to the bottom of the document */
  scrollToBottom: () => void;
  /** Jump to the next heading from current position */
  jumpToNextHeading: () => void;
  /** Jump to the previous heading from current position */
  jumpToPrevHeading: () => void;
  /** Open the heading picker */
  openPicker: () => void;
}

export interface VimNavOptions {
  /** Callback for gt (next tab) */
  onNextTab?: () => void;
  /** Callback for gT (previous tab) */
  onPrevTab?: () => void;
  /** Callback for i key (enter edit mode) */
  onEnterEdit?: () => void;
  /** Accessor for current edit mode — skips navigation when not in preview */
  getEditMode?: () => string;
}

/**
 * Vim-style keyboard navigation for heading jumps.
 *
 * Supported sequences:
 * - `gd` -> Open heading picker
 * - `gg` -> Scroll to top
 * - `gt` -> Next tab (if callback provided)
 * - `G`  -> Scroll to bottom
 * - `gT` -> Previous tab (if callback provided)
 * - `H`  -> Previous tab (if callback provided)
 * - `L`  -> Next tab (if callback provided)
 * - `]]` -> Jump to next heading
 * - `[[` -> Jump to previous heading
 */
export function useVimNav(
  getContainer: () => HTMLElement | undefined,
  getHeadings: () => HeadingInfo[],
  getActiveId: () => string | null,
  options?: VimNavOptions
) {
  const [pickerOpen, setPickerOpen] = createSignal(false);
  let pendingKey: string | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  function resetSequence() {
    pendingKey = null;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  function startTimeout() {
    timeoutId = setTimeout(resetSequence, SEQUENCE_TIMEOUT);
  }

  function findHeadingElement(container: HTMLElement, id: string): HTMLElement | null {
    return container.querySelector(`#${CSS.escape(id)}`);
  }

  function scrollToHeading(id: string) {
    const container = getContainer();
    if (!container) return;
    const el = findHeadingElement(container, id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function scrollToTop() {
    const container = getContainer();
    if (container) {
      container.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function scrollToBottom() {
    const container = getContainer();
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  }

  function jumpToNextHeading() {
    const headings = getHeadings();
    const activeId = getActiveId();
    if (headings.length === 0) return;

    const currentIndex = headings.findIndex((h) => h.id === activeId);
    const nextIndex = currentIndex < headings.length - 1 ? currentIndex + 1 : currentIndex;
    scrollToHeading(headings[nextIndex].id);
  }

  function jumpToPrevHeading() {
    const headings = getHeadings();
    const activeId = getActiveId();
    if (headings.length === 0) return;

    const currentIndex = headings.findIndex((h) => h.id === activeId);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : 0;
    scrollToHeading(headings[prevIndex].id);
  }

  function handleKeyDown(e: KeyboardEvent) {
    // Don't handle keys when input elements are focused
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return;
    }

    // Don't handle when picker is open (it has its own handler)
    if (pickerOpen()) return;

    // Skip vim navigation when in edit/split mode (CodeMirror handles keys)
    if (options?.getEditMode && options.getEditMode() !== "preview") return;

    const key = e.key;
    const container = getContainer();

    // DEBUG: trace vim nav container resolution
    if (key === "j" || key === "k") {
      console.log("[vimNav]", { key, container, scrollHeight: container?.scrollHeight, clientHeight: container?.clientHeight, className: container?.className });
    }

    // i: Enter edit mode (disabled in peek mode)
    if (key === "i" && !pendingKey && options?.onEnterEdit && !isPeekMode()) {
      e.preventDefault();
      options.onEnterEdit();
      return;
    }

    // j/k line scroll
    if (key === "j" && !pendingKey) {
      e.preventDefault();
      container?.scrollBy({ top: 60 });
      return;
    }
    if (key === "k" && !pendingKey) {
      e.preventDefault();
      container?.scrollBy({ top: -60 });
      return;
    }

    // Ctrl+D / Ctrl+U half-page scroll
    if (e.ctrlKey && key === "d") {
      e.preventDefault();
      if (container) container.scrollBy({ top: container.clientHeight / 2 });
      return;
    }
    if (e.ctrlKey && key === "u") {
      e.preventDefault();
      if (container) container.scrollBy({ top: -container.clientHeight / 2 });
      return;
    }

    // Single-key: G -> scroll to bottom
    if (key === "G" && !pendingKey) {
      e.preventDefault();
      scrollToBottom();
      resetSequence();
      return;
    }

    // H (Shift+h): Previous tab
    if (key === "H" && !pendingKey && options?.onPrevTab) {
      e.preventDefault();
      options.onPrevTab();
      return;
    }

    // L (Shift+l): Next tab
    if (key === "L" && !pendingKey && options?.onNextTab) {
      e.preventDefault();
      options.onNextTab();
      return;
    }

    // Two-key sequences
    if (pendingKey) {
      const sequence = pendingKey + key;
      resetSequence();

      switch (sequence) {
        case "gg":
          e.preventDefault();
          scrollToTop();
          return;
        case "gd":
          e.preventDefault();
          setPickerOpen(true);
          return;
        case "gt":
          if (options?.onNextTab) {
            e.preventDefault();
            options.onNextTab();
          }
          return;
        case "gT":
          if (options?.onPrevTab) {
            e.preventDefault();
            options.onPrevTab();
          }
          return;
        case "]]":
          e.preventDefault();
          jumpToNextHeading();
          return;
        case "[[":
          e.preventDefault();
          jumpToPrevHeading();
          return;
      }
      // Unknown sequence, ignore
      return;
    }

    // Start of potential sequence
    if (key === "g" || key === "]" || key === "[") {
      pendingKey = key;
      startTimeout();
      return;
    }
  }

  // Register global key listener
  document.addEventListener("keydown", handleKeyDown);

  onCleanup(() => {
    document.removeEventListener("keydown", handleKeyDown);
    resetSequence();
  });

  return {
    pickerOpen,
    setPickerOpen,
    actions: {
      jumpToHeading: scrollToHeading,
      scrollToTop,
      scrollToBottom,
      jumpToNextHeading,
      jumpToPrevHeading,
      openPicker: () => setPickerOpen(true),
    } satisfies VimNavActions,
  };
}
