/**
 * FilePicker: fzf-like fuzzy file finder popup.
 *
 * Two modes:
 * - "directory" (Cmd+P): fuzzy match files from the directory file list
 * - "system" (Cmd+Shift+P): search system-wide, recent files, path scoping
 *
 * Keyboard navigation: up/down arrows, Enter to select, Esc to close
 */

import {
  For,
  Show,
  createSignal,
  createEffect,
  createMemo,
  on,
  type Component,
} from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import type { MdFileEntry } from "./FileList";
import type { RecentFileEntry } from "../lib/useRecentFiles";

export type FilePickerMode = "directory" | "system";

interface FilePickerProps {
  files: MdFileEntry[];
  isOpen: boolean;
  dirPath: string;
  onSelect: (path: string) => void;
  onClose: () => void;
  mode?: FilePickerMode;
  recentFiles?: RecentFileEntry[];
}

/** Simple fuzzy match: characters must appear in order */
function fuzzyMatch(
  query: string,
  text: string,
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

/** Collapse home directory prefix to ~ */
function collapsePath(filePath: string): string {
  const home = filePath.match(/^(\/Users\/[^/]+|\/home\/[^/]+)/)?.[0];
  if (home && filePath.startsWith(home)) {
    return "~" + filePath.slice(home.length);
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
        ),
      )}
    </span>
  );
}

/** Check if input looks like a path prefix */
function isPathInput(query: string): boolean {
  return query.startsWith("~/") || query.startsWith("/");
}

/** Extract directory and file filter from a path input */
function parsePathInput(query: string): { dir: string; filter: string } {
  const lastSlash = query.lastIndexOf("/");
  if (lastSlash === -1) return { dir: query, filter: "" };

  const dir = query.slice(0, lastSlash + 1);
  const filter = query.slice(lastSlash + 1);
  return { dir, filter };
}

const FilePicker: Component<FilePickerProps> = (props) => {
  const mode = () => props.mode ?? "directory";
  const [query, setQuery] = createSignal("");
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [systemResults, setSystemResults] = createSignal<MdFileEntry[]>([]);
  const [isSearching, setIsSearching] = createSignal(false);
  let inputRef: HTMLInputElement | undefined;
  let listRef: HTMLDivElement | undefined;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  // Reset on open
  createEffect(() => {
    if (props.isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setSystemResults([]);
      setIsSearching(false);
      requestAnimationFrame(() => inputRef?.focus());
    }
  });

  // System mode: debounced search
  createEffect(
    on(query, (q) => {
      if (mode() !== "system") return;
      if (debounceTimer) clearTimeout(debounceTimer);

      if (q.length === 0) {
        setSystemResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      debounceTimer = setTimeout(async () => {
        try {
          let rootPath: string;
          let filterText: string;

          if (isPathInput(q)) {
            const { dir, filter } = parsePathInput(q);
            rootPath = dir;
            filterText = filter;
          } else {
            rootPath = "~";
            filterText = q;
          }

          const files = await invoke<MdFileEntry[]>("search_md_files", {
            rootPath,
            maxResults: 200,
            maxDepth: 6,
          });

          // Apply fuzzy filter if there's a text portion
          if (filterText) {
            const filtered = files
              .map((f) => {
                const display = collapsePath(f.path);
                const m = fuzzyMatch(filterText, display);
                return { file: f, ...m };
              })
              .filter((r) => r.match)
              .sort((a, b) => b.score - a.score)
              .map((r) => r.file);
            setSystemResults(filtered);
          } else {
            setSystemResults(files);
          }
        } catch (err) {
          console.error("[FilePicker] search error:", err);
          setSystemResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 200);
    }),
  );

  // Directory mode: filtered & scored results
  const directoryResults = createMemo(() => {
    if (mode() !== "directory") return [];
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

  // System mode: results with fuzzy match data for display
  const systemDisplayResults = createMemo(() => {
    if (mode() !== "system") return [];

    const q = query();

    // Empty query: show recent files
    if (q.length === 0) {
      return (props.recentFiles ?? []).map((r) => ({
        file: {
          name: r.name,
          path: r.path,
          modified_at: r.openedAt,
          size: 0,
        } as MdFileEntry,
        rel: collapsePath(r.path),
        match: true,
        score: 0,
        indices: [] as number[],
        isRecent: true,
      }));
    }

    // Search results
    const filterText = isPathInput(q) ? parsePathInput(q).filter : q;
    return systemResults().map((file) => {
      const display = collapsePath(file.path);
      const m = filterText
        ? fuzzyMatch(filterText, display)
        : { match: true, score: 0, indices: [] as number[] };
      return { file, rel: display, ...m, isRecent: false };
    });
  });

  // Unified results based on mode
  const results = createMemo(() => {
    if (mode() === "directory") return directoryResults();
    return systemDisplayResults();
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

  const placeholder = () =>
    mode() === "system"
      ? "Search system (~/path/ to scope)..."
      : "Search files...";

  const showRecentHeader = () =>
    mode() === "system" &&
    query().length === 0 &&
    (props.recentFiles?.length ?? 0) > 0;

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
              placeholder={placeholder()}
              value={query()}
              onInput={(e) => {
                setQuery(e.currentTarget.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
            />
            <Show when={mode() === "system"}>
              <span class="ml-1 rounded bg-indigo-600/30 px-1.5 py-0.5 text-[10px] font-medium text-indigo-300 uppercase tracking-wide">
                System
              </span>
            </Show>
            <Show when={query()}>
              <button
                class="text-zinc-500 hover:text-zinc-300 ml-1"
                onClick={() => {
                  setQuery("");
                  inputRef?.focus();
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                >
                  <path d="M3 3l8 8M11 3l-8 8" />
                </svg>
              </button>
            </Show>
          </div>

          {/* Results list */}
          <div ref={listRef} class="max-h-[40vh] overflow-y-auto py-1">
            {/* Recent files header */}
            <Show when={showRecentHeader()}>
              <div class="px-3 py-1 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                Recent Files
              </div>
            </Show>

            {/* Searching indicator */}
            <Show when={isSearching()}>
              <div class="px-4 py-3 text-center text-zinc-500 text-sm animate-pulse">
                Searching...
              </div>
            </Show>

            <Show when={!isSearching()}>
              <Show
                when={results().length > 0}
                fallback={
                  <div class="px-4 py-6 text-center text-zinc-500 text-sm">
                    {mode() === "system" && query().length === 0
                      ? "No recent files"
                      : "No matching files"}
                  </div>
                }
              >
                <For each={results()}>
                  {(result, index) => (
                    <button
                      class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors"
                      classList={{
                        "bg-blue-600/20 text-zinc-200":
                          index() === selectedIndex(),
                        "text-zinc-400 hover:bg-zinc-800/50":
                          index() !== selectedIndex(),
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
            </Show>
          </div>

          {/* Footer hint */}
          <div class="flex items-center gap-3 border-t border-zinc-700/50 px-3 py-1.5 text-[11px] text-zinc-500">
            <span>
              <kbd class="rounded bg-zinc-800 px-1 py-0.5 text-zinc-400">
                ↑↓
              </kbd>{" "}
              navigate
            </span>
            <span>
              <kbd class="rounded bg-zinc-800 px-1 py-0.5 text-zinc-400">
                ↵
              </kbd>{" "}
              open
            </span>
            <span>
              <kbd class="rounded bg-zinc-800 px-1 py-0.5 text-zinc-400">
                esc
              </kbd>{" "}
              close
            </span>
            <span class="ml-auto text-zinc-600">
              {mode() === "directory"
                ? "\u2318\u21E7P system search"
                : "\u2318P dir search"}
            </span>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default FilePicker;
