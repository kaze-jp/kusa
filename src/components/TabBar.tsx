/**
 * TabBar: horizontal tab bar displaying open file tabs with a new-tab button.
 *
 * Features:
 * - Active tab highlighting
 * - Close button per tab
 * - isDirty indicator (dot)
 * - Horizontal scroll overflow
 * - "+" button to create untitled tabs
 * - Dark theme styling
 * - Pointer-event based drag & drop reordering (works reliably in Tauri WebView)
 */

import { For, Show, createSignal, type Component } from "solid-js";
import type { Tab } from "../lib/tabStore";
import type { TabLabel } from "../lib/tabLabelResolver";
import type { Accessor } from "solid-js";

interface TabBarProps {
  tabs: Accessor<Tab[]>;
  activeTabId: Accessor<string | null>;
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
  onNewTab: () => void;
  onTabMove?: (fromIndex: number, toIndex: number) => void;
  tabLabels?: Accessor<Map<string, TabLabel>>;
  isMaxTabs: boolean;
  hasDir?: boolean;
  onShowFileList?: () => void;
  onOpenFilePicker?: () => void;
}

/** Minimum px movement before drag starts */
const DRAG_THRESHOLD = 5;

const TabBar: Component<TabBarProps> = (props) => {
  const [dragIndex, setDragIndex] = createSignal<number | null>(null);
  const [dropIndex, setDropIndex] = createSignal<number | null>(null);

  // Refs for pointer-based drag
  let tabRefs: HTMLButtonElement[] = [];
  let startX = 0;
  let isDragging = false;
  let pendingDragIndex: number | null = null;

  function handlePointerDown(e: PointerEvent, index: number) {
    // Only left button, ignore close button clicks
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-close-btn]")) return;

    pendingDragIndex = index;
    startX = e.clientX;
    isDragging = false;

    const onPointerMove = (ev: PointerEvent) => {
      if (!isDragging && Math.abs(ev.clientX - startX) >= DRAG_THRESHOLD) {
        isDragging = true;
        setDragIndex(pendingDragIndex);
      }
      if (!isDragging) return;

      // Find which tab the pointer is over
      for (let i = 0; i < tabRefs.length; i++) {
        const rect = tabRefs[i]?.getBoundingClientRect();
        if (!rect) continue;
        if (ev.clientX >= rect.left && ev.clientX < rect.right) {
          setDropIndex(i);
          break;
        }
      }
    };

    const onPointerUp = () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);

      if (isDragging) {
        const from = dragIndex();
        const to = dropIndex();
        if (from !== null && to !== null && from !== to) {
          props.onTabMove?.(from, to);
        }
      }

      isDragging = false;
      pendingDragIndex = null;
      setDragIndex(null);
      setDropIndex(null);
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  }

  return (
    <div class="flex h-9 flex-shrink-0 items-end overflow-x-auto bg-zinc-900 border-b border-zinc-700/50 scrollbar-hide">
      {/* File picker button (only when directory is loaded) */}
      <Show when={props.hasDir}>
        <button
          class="flex h-8 items-center px-2.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors select-none border-r border-zinc-700/30"
          onClick={() => props.onOpenFilePicker?.()}
          title="Open file (⌘P)"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L14 14" stroke-linecap="round" />
          </svg>
        </button>
      </Show>

      <For each={props.tabs()}>
        {(tab, index) => {
          const isActive = () => props.activeTabId() === tab.id;

          return (
            <button
              ref={(el) => { tabRefs[index()] = el; }}
              class="group relative flex h-8 items-center gap-1.5 border-r border-zinc-700/30 px-3 text-xs transition-colors select-none whitespace-nowrap"
              classList={{
                "bg-zinc-800 text-zinc-200": isActive(),
                "bg-zinc-900 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50": !isActive(),
                "opacity-50": dragIndex() === index(),
              }}
              onPointerDown={(e) => handlePointerDown(e, index())}
              onClick={() => props.onTabClick(tab.id)}
              title={tab.isUntitled ? tab.fileName : tab.filePath}
            >
              {/* Drop indicator */}
              <Show when={dropIndex() === index() && dragIndex() !== null && dragIndex() !== index()}>
                <div class="absolute top-0 bottom-0 left-0 w-0.5 bg-blue-500" />
              </Show>
              {/* Dirty indicator dot */}
              <Show when={tab.isDirty}>
                <span class="h-2 w-2 rounded-full bg-amber-400 flex-shrink-0" />
              </Show>

              {/* File name with optional directory prefix */}
              <span class="max-w-[160px] truncate">
                {(() => {
                  const label = props.tabLabels?.()?.get(tab.id);
                  if (label && label.prefix) {
                    return (
                      <>
                        <span class="text-zinc-500">{label.prefix}/</span>
                        {label.fileName}
                      </>
                    );
                  }
                  return tab.fileName;
                })()}
              </span>

              {/* Close button */}
              <span
                data-close-btn
                class="ml-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded opacity-0 transition-opacity hover:bg-zinc-600 group-hover:opacity-100"
                classList={{
                  "opacity-100": isActive(),
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  props.onTabClose(tab.id);
                }}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="currentColor"
                  class="text-zinc-400 hover:text-zinc-200"
                >
                  <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none" />
                </svg>
              </span>

              {/* Active tab top indicator */}
              <Show when={isActive()}>
                <div class="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />
              </Show>
            </button>
          );
        }}
      </For>

      {/* New tab button */}
      <button
        class="flex h-8 items-center px-2.5 text-zinc-500 transition-colors select-none"
        classList={{
          "hover:text-zinc-300 hover:bg-zinc-800/50 cursor-pointer": !props.isMaxTabs,
          "opacity-30 cursor-not-allowed": props.isMaxTabs,
        }}
        onClick={() => { if (!props.isMaxTabs) props.onNewTab(); }}
        disabled={props.isMaxTabs}
        title={props.isMaxTabs ? "Tab limit reached" : "New tab"}
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
          <path d="M7 2v10M2 7h10" />
        </svg>
      </button>
    </div>
  );
};

export default TabBar;
