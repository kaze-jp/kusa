/**
 * BufferPane: container for a single pane in buffer split view.
 * Shows a header with file name + focus indicator, and a Preview below.
 */

import { type Component, Show } from "solid-js";
import type { Tab } from "../lib/tabStore";
import Preview from "./Preview";

interface BufferPaneProps {
  tabId: string | null;
  tabs: Tab[];
  html: string;
  isFocused: boolean;
  onFocus: () => void;
  previewRef?: (el: HTMLDivElement) => void;
}

const BufferPane: Component<BufferPaneProps> = (props) => {
  const tab = () => props.tabs.find((t) => t.id === props.tabId) ?? null;
  const fileName = () => tab()?.fileName ?? "No buffer";

  return (
    <div
      class="flex h-full flex-col overflow-hidden"
      onClick={() => props.onFocus()}
    >
      {/* Pane header */}
      <div
        class="flex h-7 flex-shrink-0 items-center px-3 text-xs select-none border-b"
        classList={{
          "bg-zinc-800 text-zinc-200 border-blue-500 border-b-2": props.isFocused,
          "bg-zinc-900 text-zinc-500 border-zinc-700/50": !props.isFocused,
        }}
      >
        <span class="truncate">{fileName()}</span>
      </div>

      {/* Scrollable preview area — this div is the scroll container for vim nav */}
      <div
        class="buffer-split-pane flex-1 min-h-0 overflow-auto"
        ref={(el) => props.previewRef?.(el)}
        style={{ "scrollbar-width": "thin", "scrollbar-color": "var(--color-scrollbar-thumb) var(--color-scrollbar-track)" }}
      >
        <Show
          when={props.tabId}
          fallback={
            <div class="flex h-full items-center justify-center text-zinc-600 text-sm">
              Select a buffer
            </div>
          }
        >
          <Preview html={props.html} />
        </Show>
      </div>
    </div>
  );
};

export default BufferPane;
