/**
 * BufferSplitStore: manages nvim-like buffer split state.
 *
 * - Tracks left/right pane buffer assignments
 * - Manages focused pane and buffer picker visibility
 * - Independent from tabStore (read-only reference)
 */

import { createSignal, type Accessor } from "solid-js";
import type { Tab } from "./tabStore";

export interface BufferSplitState {
  active: boolean;
  leftTabId: string | null;
  rightTabId: string | null;
  focusedPane: "left" | "right";
  showBufferPicker: boolean;
}

export interface BufferSplitStore {
  state: Accessor<BufferSplitState>;
  enterSplit(currentTabId: string): void;
  exitSplit(): void;
  setFocusedPane(pane: "left" | "right"): void;
  switchPaneBuffer(tabId: string): void;
  cyclePaneBuffer(direction: "next" | "prev", tabs: Tab[]): void;
  closeBufferPicker(): void;
  focusedTabId: Accessor<string | null>;
}

const INITIAL_STATE: BufferSplitState = {
  active: false,
  leftTabId: null,
  rightTabId: null,
  focusedPane: "left",
  showBufferPicker: false,
};

export function createBufferSplitStore(): BufferSplitStore {
  const [state, setState] = createSignal<BufferSplitState>({ ...INITIAL_STATE });

  function enterSplit(currentTabId: string): void {
    setState({
      active: true,
      leftTabId: currentTabId,
      rightTabId: null,
      focusedPane: "right",
      showBufferPicker: true,
    });
  }

  function exitSplit(): void {
    setState({ ...INITIAL_STATE });
  }

  function setFocusedPane(pane: "left" | "right"): void {
    setState((prev) => ({ ...prev, focusedPane: pane }));
  }

  function switchPaneBuffer(tabId: string): void {
    setState((prev) => {
      const key = prev.focusedPane === "left" ? "leftTabId" : "rightTabId";
      return { ...prev, [key]: tabId, showBufferPicker: false };
    });
  }

  function cyclePaneBuffer(direction: "next" | "prev", tabs: Tab[]): void {
    if (tabs.length === 0) return;
    const s = state();
    const currentId = s.focusedPane === "left" ? s.leftTabId : s.rightTabId;
    const idx = tabs.findIndex((t) => t.id === currentId);
    let nextIdx: number;
    if (idx === -1) {
      nextIdx = 0;
    } else if (direction === "next") {
      nextIdx = (idx + 1) % tabs.length;
    } else {
      nextIdx = (idx - 1 + tabs.length) % tabs.length;
    }
    switchPaneBuffer(tabs[nextIdx].id);
  }

  function closeBufferPicker(): void {
    setState((prev) => ({ ...prev, showBufferPicker: false }));
  }

  const focusedTabId: Accessor<string | null> = () => {
    const s = state();
    return s.focusedPane === "left" ? s.leftTabId : s.rightTabId;
  };

  return {
    state,
    enterSplit,
    exitSplit,
    setFocusedPane,
    switchPaneBuffer,
    cyclePaneBuffer,
    closeBufferPicker,
    focusedTabId,
  };
}
