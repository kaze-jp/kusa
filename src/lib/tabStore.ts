/**
 * Tab store: signal-based state management for multi-file tabs.
 *
 * - Manages a list of open tabs with active tab tracking
 * - Each tab holds file path, content, dirty state, and scroll position
 * - Prevents duplicate tabs (same filePath)
 * - Supports untitled (unsaved) tabs with Save As promotion
 * - Max 20 tabs
 */

import { createSignal, type Accessor } from "solid-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Tab {
  /** Unique tab identifier (filePath or generated id) */
  id: string;
  /** Absolute file path (empty string for untitled tabs) */
  filePath: string;
  /** Display name (file name only) */
  fileName: string;
  /** Current markdown content */
  content: string;
  /** Whether the tab has unsaved changes */
  isDirty: boolean;
  /** Saved scroll position for restoration on tab switch */
  scrollPosition: number;
  /** Whether this tab is an untitled buffer (no file on disk) */
  isUntitled: boolean;
}

export interface TabStore {
  /** Reactive list of open tabs */
  tabs: Accessor<Tab[]>;
  /** Currently active tab id */
  activeTabId: Accessor<string | null>;
  /** Currently active tab (derived) */
  activeTab: Accessor<Tab | null>;
  /** Open a file in a new tab or switch to existing */
  openTab(filePath: string, fileName: string, content: string): void;
  /** Create a new untitled tab with empty content. Returns tab id. */
  createUntitledTab(): string;
  /** Create a new clipboard tab with pasted content. Returns tab id. */
  createClipboardTab(content: string): string;
  /** Promote an untitled tab to a file tab */
  promoteToFile(id: string, filePath: string, fileName: string): void;
  /** Close a tab by id. Returns true if tabs remain, false if all closed. */
  closeTab(id: string): boolean;
  /** Switch to a tab by id */
  switchTab(id: string): void;
  /** Switch to next tab (wraps around) */
  nextTab(): void;
  /** Switch to previous tab (wraps around) */
  prevTab(): void;
  /** Switch to tab by index (0-based) */
  switchToIndex(index: number): void;
  /** Update content for a tab */
  updateTabContent(id: string, content: string): void;
  /** Mark a tab as dirty */
  markDirty(id: string): void;
  /** Mark a tab as clean */
  markClean(id: string): void;
  /** Save scroll position for a tab */
  saveScrollPosition(id: string, position: number): void;
  /** Move a tab from one index to another (drag & drop reorder) */
  moveTab(fromIndex: number, toIndex: number): void;
  /** Check if any tab has unsaved changes */
  hasUnsavedChanges: Accessor<boolean>;
  /** Get number of open tabs */
  tabCount: Accessor<number>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_TABS = 20;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/** Module-level counter for untitled tabs (never reused) */
let untitledCounter = 0;

/** Module-level counter for clipboard tabs (never reused) */
let clipboardCounter = 0;

export function createTabStore(): TabStore {
  const [tabs, setTabs] = createSignal<Tab[]>([]);
  const [activeTabId, setActiveTabId] = createSignal<string | null>(null);

  // Derived: active tab
  const activeTab: Accessor<Tab | null> = () => {
    const id = activeTabId();
    if (!id) return null;
    return tabs().find((t) => t.id === id) ?? null;
  };

  // Derived: has unsaved changes
  const hasUnsavedChanges: Accessor<boolean> = () => {
    return tabs().some((t) => t.isDirty);
  };

  // Derived: tab count
  const tabCount: Accessor<number> = () => tabs().length;

  function openTab(filePath: string, fileName: string, content: string): void {
    const current = tabs();

    // Check for existing tab with same filePath
    const existing = current.find((t) => t.filePath === filePath);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }

    // Check max tab limit
    if (current.length >= MAX_TABS) {
      console.warn(`Tab limit reached (${MAX_TABS}). Close a tab before opening a new one.`);
      return;
    }

    const newTab: Tab = {
      id: filePath, // Use filePath as unique id
      filePath,
      fileName,
      content,
      isDirty: false,
      scrollPosition: 0,
      isUntitled: false,
    };

    setTabs([...current, newTab]);
    setActiveTabId(newTab.id);
  }

  function createUntitledTab(): string {
    const current = tabs();

    // Check max tab limit
    if (current.length >= MAX_TABS) {
      console.warn(`Tab limit reached (${MAX_TABS}). Close a tab before opening a new one.`);
      return "";
    }

    untitledCounter++;
    const id = `untitled-${untitledCounter}`;
    const fileName = `Untitled-${untitledCounter}`;

    const newTab: Tab = {
      id,
      filePath: "",
      fileName,
      content: "",
      isDirty: false,
      scrollPosition: 0,
      isUntitled: true,
    };

    setTabs([...current, newTab]);
    setActiveTabId(id);
    return id;
  }

  function createClipboardTab(content: string): string {
    const current = tabs();

    // Check max tab limit
    if (current.length >= MAX_TABS) {
      console.warn(`Tab limit reached (${MAX_TABS}). Close a tab before opening a new one.`);
      return "";
    }

    clipboardCounter++;
    const id = `clipboard-${clipboardCounter}`;
    const fileName = "clipboard";

    const newTab: Tab = {
      id,
      filePath: "",
      fileName,
      content,
      isDirty: false,
      scrollPosition: 0,
      isUntitled: true,
    };

    setTabs([...current, newTab]);
    setActiveTabId(id);
    return id;
  }

  function promoteToFile(id: string, filePath: string, fileName: string): void {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, id: filePath, filePath, fileName, isUntitled: false, isDirty: false }
          : t
      )
    );
    // Update activeTabId if promoting the active tab
    if (activeTabId() === id) {
      setActiveTabId(filePath);
    }
  }

  function closeTab(id: string): boolean {
    const current = tabs();
    const index = current.findIndex((t) => t.id === id);
    if (index === -1) return current.length > 0;

    const newTabs = current.filter((t) => t.id !== id);
    setTabs(newTabs);

    // If closing the active tab, switch to an adjacent tab
    if (activeTabId() === id) {
      if (newTabs.length === 0) {
        setActiveTabId(null);
      } else {
        // Prefer the tab at the same index, or the last tab
        const newIndex = Math.min(index, newTabs.length - 1);
        setActiveTabId(newTabs[newIndex].id);
      }
    }

    return newTabs.length > 0;
  }

  function switchTab(id: string): void {
    const current = tabs();
    if (current.some((t) => t.id === id)) {
      setActiveTabId(id);
    }
  }

  function nextTab(): void {
    const current = tabs();
    if (current.length <= 1) return;

    const id = activeTabId();
    const index = current.findIndex((t) => t.id === id);
    const nextIndex = (index + 1) % current.length;
    setActiveTabId(current[nextIndex].id);
  }

  function prevTab(): void {
    const current = tabs();
    if (current.length <= 1) return;

    const id = activeTabId();
    const index = current.findIndex((t) => t.id === id);
    const prevIndex = (index - 1 + current.length) % current.length;
    setActiveTabId(current[prevIndex].id);
  }

  function switchToIndex(index: number): void {
    const current = tabs();
    if (index >= 0 && index < current.length) {
      setActiveTabId(current[index].id);
    }
  }

  function updateTabContent(id: string, content: string): void {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, content } : t))
    );
  }

  function markDirty(id: string): void {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isDirty: true } : t))
    );
  }

  function markClean(id: string): void {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isDirty: false } : t))
    );
  }

  function saveScrollPosition(id: string, position: number): void {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, scrollPosition: position } : t))
    );
  }

  function moveTab(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return;
    setTabs((prev) => {
      if (fromIndex < 0 || fromIndex >= prev.length) return prev;
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  return {
    tabs,
    activeTabId,
    activeTab,
    openTab,
    createUntitledTab,
    createClipboardTab,
    promoteToFile,
    closeTab,
    switchTab,
    nextTab,
    prevTab,
    switchToIndex,
    updateTabContent,
    markDirty,
    markClean,
    saveScrollPosition,
    moveTab,
    hasUnsavedChanges,
    tabCount,
  };
}
