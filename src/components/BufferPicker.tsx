/**
 * BufferPicker: overlay list for selecting a buffer to display in a pane.
 * Supports j/k navigation, Enter to select, Esc to cancel.
 */

import { type Component, createSignal, For, onMount, onCleanup } from "solid-js";
import type { Tab } from "../lib/tabStore";

interface BufferPickerProps {
  tabs: Tab[];
  onSelect: (tabId: string) => void;
  onCancel: () => void;
}

const BufferPicker: Component<BufferPickerProps> = (props) => {
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  let containerRef: HTMLDivElement | undefined;

  function handleKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case "j":
      case "ArrowDown":
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((i) => Math.min(i + 1, props.tabs.length - 1));
        break;
      case "k":
      case "ArrowUp":
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        e.stopPropagation();
        if (props.tabs.length > 0) {
          props.onSelect(props.tabs[selectedIndex()].id);
        }
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        props.onCancel();
        break;
    }
  }

  onMount(() => {
    document.addEventListener("keydown", handleKeyDown, true);
    containerRef?.focus();
  });

  onCleanup(() => {
    document.removeEventListener("keydown", handleKeyDown, true);
  });

  return (
    <div
      ref={containerRef}
      class="absolute inset-0 z-40 flex items-center justify-center bg-black/50"
      onClick={() => props.onCancel()}
      tabIndex={-1}
    >
      <div
        class="w-64 max-h-80 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="px-3 py-2 text-xs text-zinc-500 border-b border-zinc-700/50">
          Select buffer
        </div>
        <For each={props.tabs}>
          {(tab, index) => (
            <button
              class="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors"
              classList={{
                "bg-blue-600 text-white": index() === selectedIndex(),
                "text-zinc-300 hover:bg-zinc-800": index() !== selectedIndex(),
              }}
              onClick={() => props.onSelect(tab.id)}
              onMouseEnter={() => setSelectedIndex(index())}
            >
              <span class="truncate">{tab.fileName}</span>
            </button>
          )}
        </For>
        {props.tabs.length === 0 && (
          <div class="px-3 py-3 text-xs text-zinc-600 text-center">
            No buffers open
          </div>
        )}
      </div>
    </div>
  );
};

export default BufferPicker;
