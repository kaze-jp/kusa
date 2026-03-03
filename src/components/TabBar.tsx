/**
 * TabBar: horizontal tab bar displaying open file tabs.
 *
 * Features:
 * - Active tab highlighting
 * - Close button per tab
 * - isDirty indicator (dot)
 * - Horizontal scroll overflow
 * - Dark theme styling
 */

import { For, Show, type Component } from "solid-js";
import type { Tab } from "../lib/tabStore";
import type { Accessor } from "solid-js";

interface TabBarProps {
  tabs: Accessor<Tab[]>;
  activeTabId: Accessor<string | null>;
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
}

const TabBar: Component<TabBarProps> = (props) => {
  return (
    <Show when={props.tabs().length > 0}>
      <div class="flex h-9 flex-shrink-0 items-end overflow-x-auto bg-zinc-900 border-b border-zinc-700/50 scrollbar-hide">
        <For each={props.tabs()}>
          {(tab) => {
            const isActive = () => props.activeTabId() === tab.id;

            return (
              <button
                class="group relative flex h-8 items-center gap-1.5 border-r border-zinc-700/30 px-3 text-xs transition-colors select-none whitespace-nowrap"
                classList={{
                  "bg-zinc-800 text-zinc-200": isActive(),
                  "bg-zinc-900 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50": !isActive(),
                }}
                onClick={() => props.onTabClick(tab.id)}
                title={tab.filePath}
              >
                {/* Dirty indicator dot */}
                <Show when={tab.isDirty}>
                  <span class="h-2 w-2 rounded-full bg-amber-400 flex-shrink-0" />
                </Show>

                {/* File name */}
                <span class="max-w-[160px] truncate">
                  {tab.fileName}
                </span>

                {/* Close button */}
                <span
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
      </div>
    </Show>
  );
};

export default TabBar;
