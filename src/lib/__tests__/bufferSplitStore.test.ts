import { describe, it, expect } from "vitest";
import { createBufferSplitStore } from "../bufferSplitStore";
import type { Tab } from "../tabStore";

function makeTabs(count: number): Tab[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `tab-${i}`,
    filePath: `/path/file${i}.md`,
    fileName: `file${i}.md`,
    content: `# File ${i}`,
    isDirty: false,
    scrollPosition: 0,
    isUntitled: false,
  }));
}

describe("createBufferSplitStore", () => {
  it("starts inactive", () => {
    const store = createBufferSplitStore();
    expect(store.state().active).toBe(false);
    expect(store.state().leftTabId).toBeNull();
    expect(store.state().rightTabId).toBeNull();
  });

  it("enterSplit sets left pane to current tab and shows picker", () => {
    const store = createBufferSplitStore();
    store.enterSplit("tab-0");

    expect(store.state().active).toBe(true);
    expect(store.state().leftTabId).toBe("tab-0");
    expect(store.state().rightTabId).toBeNull();
    expect(store.state().focusedPane).toBe("right");
    expect(store.state().showBufferPicker).toBe(true);
  });

  it("exitSplit resets all state", () => {
    const store = createBufferSplitStore();
    store.enterSplit("tab-0");
    store.switchPaneBuffer("tab-1");
    store.setFocusedPane("left");

    store.exitSplit();

    expect(store.state().active).toBe(false);
    expect(store.state().leftTabId).toBeNull();
    expect(store.state().rightTabId).toBeNull();
    expect(store.state().focusedPane).toBe("left");
    expect(store.state().showBufferPicker).toBe(false);
  });

  it("setFocusedPane switches focus", () => {
    const store = createBufferSplitStore();
    store.enterSplit("tab-0");

    expect(store.state().focusedPane).toBe("right");
    store.setFocusedPane("left");
    expect(store.state().focusedPane).toBe("left");
    store.setFocusedPane("right");
    expect(store.state().focusedPane).toBe("right");
  });

  it("switchPaneBuffer assigns buffer to focused pane", () => {
    const store = createBufferSplitStore();
    store.enterSplit("tab-0");
    // Focus is right after enterSplit
    store.switchPaneBuffer("tab-1");

    expect(store.state().rightTabId).toBe("tab-1");
    expect(store.state().showBufferPicker).toBe(false);

    // Switch focus to left and assign
    store.setFocusedPane("left");
    store.switchPaneBuffer("tab-2");
    expect(store.state().leftTabId).toBe("tab-2");
  });

  it("cyclePaneBuffer wraps forward", () => {
    const tabs = makeTabs(3);
    const store = createBufferSplitStore();
    store.enterSplit("tab-0");
    store.switchPaneBuffer("tab-2"); // right = tab-2

    store.cyclePaneBuffer("next", tabs);
    expect(store.state().rightTabId).toBe("tab-0"); // wraps to start
  });

  it("cyclePaneBuffer wraps backward", () => {
    const tabs = makeTabs(3);
    const store = createBufferSplitStore();
    store.enterSplit("tab-0");
    store.switchPaneBuffer("tab-0"); // right = tab-0

    store.cyclePaneBuffer("prev", tabs);
    expect(store.state().rightTabId).toBe("tab-2"); // wraps to end
  });

  it("focusedTabId returns the correct tab id", () => {
    const store = createBufferSplitStore();
    store.enterSplit("tab-0");
    store.switchPaneBuffer("tab-1");

    // Focused = right
    expect(store.focusedTabId()).toBe("tab-1");

    store.setFocusedPane("left");
    expect(store.focusedTabId()).toBe("tab-0");
  });

  it("closeBufferPicker hides picker without changing buffers", () => {
    const store = createBufferSplitStore();
    store.enterSplit("tab-0");
    expect(store.state().showBufferPicker).toBe(true);

    store.closeBufferPicker();
    expect(store.state().showBufferPicker).toBe(false);
    expect(store.state().rightTabId).toBeNull();
  });
});
