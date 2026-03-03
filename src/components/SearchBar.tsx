/**
 * SearchBar: floating in-document search UI.
 *
 * Shows at the top of the preview area. Provides:
 * - Incremental text search with real-time highlighting
 * - Match count display (N/M format)
 * - Next/Prev navigation via buttons and keyboard
 * - Esc to close
 */

import {
  type Component,
  createSignal,
  createEffect,
  onCleanup,
  Show,
} from "solid-js";
import {
  highlightMatches,
  clearHighlights,
  setCurrentMatch,
  navigateNext,
  navigatePrev,
  getMatchCount,
} from "../lib/searchService";

interface SearchBarProps {
  /** Whether the search bar is visible */
  isOpen: boolean;
  /** Callback to close the search bar */
  onClose: () => void;
  /** Ref getter for the preview container to search within */
  getContainer: () => HTMLElement | undefined;
}

const SearchBar: Component<SearchBarProps> = (props) => {
  const [query, setQuery] = createSignal("");
  const [currentIndex, setCurrentIndex] = createSignal(-1);
  const [totalMatches, setTotalMatches] = createSignal(0);
  let inputRef: HTMLInputElement | undefined;

  // Focus input when opened
  createEffect(() => {
    if (props.isOpen) {
      setQuery("");
      setCurrentIndex(-1);
      setTotalMatches(0);
      requestAnimationFrame(() => inputRef?.focus());
    } else {
      // Clean up highlights when closed
      const container = props.getContainer();
      if (container) {
        clearHighlights(container);
      }
    }
  });

  // Perform search when query changes
  createEffect(() => {
    const q = query();
    const container = props.getContainer();
    if (!container) return;

    if (!props.isOpen) return;

    const total = highlightMatches(container, q);
    setTotalMatches(total);

    if (total > 0) {
      setCurrentIndex(0);
      setCurrentMatch(container, 0);
    } else {
      setCurrentIndex(-1);
    }
  });

  // Clean up on unmount
  onCleanup(() => {
    const container = props.getContainer();
    if (container) {
      clearHighlights(container);
    }
  });

  function handleNext() {
    const container = props.getContainer();
    if (!container) return;
    const newIndex = navigateNext(container, currentIndex());
    setCurrentIndex(newIndex);
    setTotalMatches(getMatchCount(container));
  }

  function handlePrev() {
    const container = props.getContainer();
    if (!container) return;
    const newIndex = navigatePrev(container, currentIndex());
    setCurrentIndex(newIndex);
    setTotalMatches(getMatchCount(container));
  }

  function handleClose() {
    const container = props.getContainer();
    if (container) {
      clearHighlights(container);
    }
    setQuery("");
    setCurrentIndex(-1);
    setTotalMatches(0);
    props.onClose();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      handleClose();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrev();
      } else {
        handleNext();
      }
      return;
    }
  }

  /** Display string for match count */
  const matchDisplay = () => {
    const total = totalMatches();
    const idx = currentIndex();
    if (total === 0 && query().length > 0) {
      return "0/0";
    }
    if (total === 0) {
      return "";
    }
    return `${idx + 1}/${total}`;
  };

  return (
    <Show when={props.isOpen}>
      <div class="search-bar" role="search" aria-label="Document search">
        <div class="search-bar-inner">
          {/* Search input */}
          <input
            ref={inputRef}
            type="text"
            class="search-bar-input"
            placeholder="Search..."
            value={query()}
            onInput={(e) => setQuery(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            aria-label="Search text"
          />

          {/* Match count */}
          <Show when={matchDisplay()}>
            <span
              class="search-bar-count"
              classList={{
                "search-bar-count-zero":
                  totalMatches() === 0 && query().length > 0,
              }}
            >
              {matchDisplay()}
            </span>
          </Show>

          {/* Navigation buttons */}
          <button
            class="search-bar-btn"
            onClick={handlePrev}
            disabled={totalMatches() === 0}
            title="Previous match (Shift+Enter)"
            aria-label="Previous match"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M3.22 9.78a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 0l4.25 4.25a.749.749 0 01-.326 1.275.749.749 0 01-.734-.215L8 6.06 4.28 9.78a.75.75 0 01-1.06 0z" />
            </svg>
          </button>
          <button
            class="search-bar-btn"
            onClick={handleNext}
            disabled={totalMatches() === 0}
            title="Next match (Enter)"
            aria-label="Next match"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M12.78 6.22a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0L3.22 7.28a.749.749 0 01.326-1.275.749.749 0 01.734.215L8 9.94l3.72-3.72a.75.75 0 011.06 0z" />
            </svg>
          </button>

          {/* Close button */}
          <button
            class="search-bar-btn search-bar-close"
            onClick={handleClose}
            title="Close (Esc)"
            aria-label="Close search"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.749.749 0 011.275.326.749.749 0 01-.215.734L9.06 8l3.22 3.22a.749.749 0 01-.326 1.275.749.749 0 01-.734-.215L8 9.06l-3.22 3.22a.749.749 0 01-1.275-.326.749.749 0 01.215-.734L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>
      </div>
    </Show>
  );
};

export default SearchBar;
