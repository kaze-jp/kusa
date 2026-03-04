/**
 * FilePicker: fzf-like fuzzy file finder popup.
 *
 * - Triggered by Cmd+P / Ctrl+P
 * - Fuzzy matches file names from the directory file list
 * - Keyboard navigation: up/down arrows, Enter to select, Esc to close
 */

import {
  For,
  Show,
  createSignal,
  createEffect,
  createMemo,
  type Component,
} from "solid-js";
import type { MdFileEntry } from "./FileList";

interface FilePickerProps {
  files: MdFileEntry[];
  isOpen: boolean;
  dirPath: string;
  onSelect: (path: string) => void;
  onClose: () => void;
}

/** Simple fuzzy match: characters must appear in order */
function fuzzyMatch(
  query: string,
  text: string
): { match: boolean; score: number; indices: number[] } {
  const lq = query.toLowerCase();
  const lt = text.toLowerCase();

  if (lq.length === 0) return { match: true, score: 0, indices: [] };

  let qi = 0;
  let score = 0;
  let prevIdx = -2;
  const indices: number[] = [];

  for (let i = 0; i < lt.length && qi < lq.length; i++) {
    if (lt[i] === lq[qi]) {
      score += 1;
      if (i === prevIdx + 1) score += 3; // consecutive bonus
      if (i === 0) score += 4; // start of string bonus
      if (i > 0 && /[/\-_. ]/.test(lt[i - 1])) score += 3; // word boundary
      prevIdx = i;
      indices.push(i);
      qi++;
    }
  }

  return { match: qi === lq.length, score, indices };
}

/** Strip common dir prefix to show relative path */
function relativePath(filePath: string, dirPath: string): string {
  if (filePath.startsWith(dirPath)) {
    const rel = filePath.slice(dirPath.length);
    return rel.startsWith("/") ? rel.slice(1) : rel;
  }
  return filePath;
}

/** Render text with fuzzy-matched characters highlighted */
function HighlightedText(props: { text: string; indices: number[] }) {
  return (
    <span>
      {props.text.split("").map((ch, i) =>
        props.indices.includes(i) ? (
          <span class="text-blue-400 font-semibold">{ch}</span>
        ) : (
          ch
        )
      )}
    </span>
  );
}

const FilePicker: Component<FilePickerProps> = (props) => {
  const [query, setQuery] = createSignal("");
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  let inputRef: HTMLInputElement | undefined;
  let listRef: HTMLDivElement | undefined;

  // Reset on open
  createEffect(() => {
    if (props.isOpen) {
      setQuery("");
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef?.focus());
    }
  });

  // Filtered & scored results
  const results = createMemo(() => {
    const q = query();
    const dir = props.dirPath;

    return props.files
      .map((file) => {
        const rel = relativePath(file.path, dir);
        const m = fuzzyMatch(q, rel);
        return { file, rel, ...m };
      })
      .filter((r) => r.match)
      .sort((a, b) => b.score - a.score);
  });

  // Clamp selected index when results change
  createEffect(() => {
    const len = results().length;
    if (selectedIndex() >= len) {
      setSelectedIndex(Math.max(0, len - 1));
    }
  });

  // Scroll selected item into view
  createEffect(() => {
    const idx = selectedIndex();
    if (!listRef) return;
    const el = listRef.children[idx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  });

  function handleKeyDown(e: KeyboardEvent) {
    const len = results().length;

    if (e.key === "ArrowDown" || (e.ctrlKey && e.key === "n")) {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % Math.max(len, 1));
    } else if (e.key === "ArrowUp" || (e.ctrlKey && e.key === "p")) {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + Math.max(len, 1)) % Math.max(len, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results()[selectedIndex()];
      if (r) {
        props.onSelect(r.file.path);
        props.onClose();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      props.onClose();
    }
  }

  // Close on backdrop click
  function handleBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).dataset.backdrop) {
      props.onClose();
    }
  }

  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50"
        data-backdrop="true"
        onClick={handleBackdropClick}
      >
        <div class="w-full max-w-lg rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">
          {/* Search input */}
          <div class="flex items-center border-b border-zinc-700/50 px-3">
            <svg
              class="mr-2 text-zinc-500 shrink-0"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5L14 14" stroke-linecap="round" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              class="flex-1 bg-transparent py-2.5 text-sm text-zinc-200 outline-none placeholder-zinc-500"
              placeholder="Search files..."
              value={query()}
              onInput={(e) => {
                setQuery(e.currentTarget.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
            />
            <Show when={query()}>
              <button
                class="text-zinc-500 hover:text-zinc-300 ml-1"
                onClick={() => {
                  setQuery("");
                  inputRef?.focus();
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                  <path d="M3 3l8 8M11 3l-8 8" />
                </svg>
              </button>
            </Show>
          </div>

          {/* Results list */}
          <div ref={listRef} class="max-h-[40vh] overflow-y-auto py-1">
            <Show
              when={results().length > 0}
              fallback={
                <div class="px-4 py-6 text-center text-zinc-500 text-sm">
                  No matching files
                </div>
              }
            >
              <For each={results()}>
                {(result, index) => (
                  <button
                    class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors"
                    classList={{
                      "bg-blue-600/20 text-zinc-200": index() === selectedIndex(),
                      "text-zinc-400 hover:bg-zinc-800/50": index() !== selectedIndex(),
                    }}
                    onClick={() => {
                      props.onSelect(result.file.path);
                      props.onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(index())}
                  >
                    {/* File icon */}
                    <svg
                      class="shrink-0 text-zinc-500"
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.2"
                    >
                      <path d="M3 1.5h5l3 3v8H3z" />
                      <path d="M8 1.5v3h3" />
                    </svg>

                    {/* File name with highlights */}
                    <span class="truncate">
                      <HighlightedText
                        text={result.rel}
                        indices={result.indices}
                      />
                    </span>
                  </button>
                )}
              </For>
            </Show>
          </div>

          {/* Footer hint */}
          <div class="flex items-center gap-3 border-t border-zinc-700/50 px-3 py-1.5 text-[11px] text-zinc-500">
            <span>
              <kbd class="rounded bg-zinc-800 px-1 py-0.5 text-zinc-400">↑↓</kbd> navigate
            </span>
            <span>
              <kbd class="rounded bg-zinc-800 px-1 py-0.5 text-zinc-400">↵</kbd> open
            </span>
            <span>
              <kbd class="rounded bg-zinc-800 px-1 py-0.5 text-zinc-400">esc</kbd> close
            </span>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default FilePicker;
