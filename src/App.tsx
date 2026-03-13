import {
  type Component,
  createSignal,
  createEffect,
  createMemo,
  onCleanup,
  onMount,
  Show,
  Switch,
  Match,
} from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { save, confirm } from "@tauri-apps/plugin-dialog";
import { processMarkdown, extractHeadings } from "./lib/markdown";
import { useActiveHeading } from "./lib/useActiveHeading";
import { useReadingProgress } from "./lib/useReadingProgress";
import { useVimNav } from "./lib/useVimNav";
import { useFocusMode } from "./lib/useFocusMode";
import { useTheme } from "./lib/useTheme";
import { useZoom } from "./lib/useZoom";
import { createTabStore } from "./lib/tabStore";
import { resolveInputSource } from "./lib/input-resolver";
import { updateWindowTitle } from "./lib/title-bar";
import { createBufferManager } from "./lib/buffer";
import { createFileWatcher } from "./lib/fileWatcher";
import { createEditorLazyLoader, type CMEditorInstance } from "./lib/editor";
import { createSyncEngine, type SyncEngineInstance } from "./lib/sync";
import { createScrollSync, type ScrollSyncInstance } from "./lib/scroll-sync";
import { createBufferSplitStore } from "./lib/bufferSplitStore";
import type { InputContent, CliArgs } from "./lib/types";
import type { Tab } from "./lib/tabStore";
import Preview from "./components/Preview";
import BufferPane from "./components/BufferPane";
import BufferPicker from "./components/BufferPicker";
import TOCPanel from "./components/TOCPanel";
import HeadingPicker from "./components/HeadingPicker";
import ReadingProgress from "./components/ReadingProgress";
import PeekShell from "./components/PeekShell";
import SearchBar from "./components/SearchBar";
import FileList, { type MdFileEntry } from "./components/FileList";
import FilePicker from "./components/FilePicker";
import { useRecentFiles } from "./lib/useRecentFiles";
import TabBar from "./components/TabBar";
import ErrorDisplay from "./components/ErrorDisplay";
import DropZone from "./components/DropZone";
import EditorPane from "./components/EditorPane";
import SplitLayout from "./components/SplitLayout";
import StatusBar from "./components/StatusBar";
import {
  initWindowMode,
  isPeekMode,
  type WindowMode,
} from "./stores/windowMode";

/** View mode for the top-level layout */
type AppViewMode = "loading" | "demo" | "file-list" | "preview" | "buffer" | "error";

/** Sub-mode for edit capabilities within preview view */
type EditMode = "preview" | "edit" | "split";

const App: Component = () => {
  // Window mode initialization
  const [modeReady, setModeReady] = createSignal(false);

  // View mode
  const [viewMode, setViewMode] = createSignal<AppViewMode>("loading");

  // Edit sub-mode (only relevant when viewMode is "preview")
  const [editMode, setEditMode] = createSignal<EditMode>("preview");

  // Directory state
  const [dirPath, setDirPath] = createSignal<string | null>(null);
  const [fileList, setFileList] = createSignal<MdFileEntry[]>([]);

  // Tab store
  const tabStore = createTabStore();

  // Buffer split store (nvim-like vsplit)
  const bufferSplit = createBufferSplitStore();

  // Ctrl-W two-stroke keybinding state
  const [ctrlWPending, setCtrlWPending] = createSignal(false);
  let ctrlWTimer: ReturnType<typeof setTimeout> | null = null;

  // Core state (for current active tab or demo)
  const [markdown, setMarkdown] = createSignal("");
  const [html, setHtml] = createSignal("");
  const [tocVisible, setTocVisible] = createSignal(true);
  const [searchOpen, setSearchOpen] = createSignal(false);
  const [filePickerOpen, setFilePickerOpen] = createSignal(false);
  const [systemPickerOpen, setSystemPickerOpen] = createSignal(false);

  // Error state
  const [errorMessage, setErrorMessage] = createSignal("");
  const [errorHint, setErrorHint] = createSignal<string | undefined>(undefined);

  // Buffer manager for universal input (stdin, clipboard, github, url)
  const bufferManager = createBufferManager();

  // Recent files history
  const recentFiles = useRecentFiles();

  // Track whether initial input has been resolved to avoid race conditions
  let initialInputResolved = false;

  // File watching state
  const [fileNotification, setFileNotification] = createSignal<{
    text: string;
    type: "info" | "warning" | "error";
  } | null>(null);

  // Editor state signals
  const [vimMode, setVimMode] = createSignal<"NORMAL" | "INSERT" | "VISUAL" | "COMMAND">("NORMAL");
  const [cursorPosition, setCursorPosition] = createSignal<{ line: number; col: number }>({ line: 1, col: 1 });
  const [isDirty, setIsDirty] = createSignal(false);
  const [saveNotification, setSaveNotification] = createSignal<{ text: string; type: "success" | "error" } | null>(null);

  // Editor lazy loader (initialized once, modules cached)
  const lazyLoader = createEditorLazyLoader();

  // Mutable refs for editor and sync engine
  let editorRef: CMEditorInstance | null = null;
  let syncEngineRef: SyncEngineInstance | null = null;
  let returningToPreview = false;

  // Preview container ref (signal to trigger observer re-attachment on mount)
  const [previewRef, setPreviewRef] = createSignal<HTMLDivElement | undefined>();
  const getPreviewRef = previewRef;

  // Buffer split pane refs (for vim nav targeting)
  const [leftPaneRef, setLeftPaneRef] = createSignal<HTMLDivElement | undefined>();
  const [rightPaneRef, setRightPaneRef] = createSignal<HTMLDivElement | undefined>();

  // Active container: returns focused pane in split mode, main preview otherwise
  const getActiveContainer = () => {
    if (bufferSplit.state().active) {
      return bufferSplit.state().focusedPane === "left" ? leftPaneRef() : rightPaneRef();
    }
    return previewRef();
  };

  // Derived data
  const headings = createMemo(() => extractHeadings(markdown()));

  // Hooks
  const theme = useTheme();
  const zoom = useZoom();
  const { activeId, observe } = useActiveHeading();
  const readingProgress = useReadingProgress();
  const focusMode = useFocusMode(getPreviewRef, activeId);
  const { pickerOpen, setPickerOpen, actions } = useVimNav(
    getActiveContainer,
    headings,
    activeId,
    {
      onNextTab: () => {
        if (bufferSplit.state().active) {
          bufferSplit.cyclePaneBuffer("next", tabStore.tabs());
        } else {
          tabStore.nextTab();
        }
      },
      onPrevTab: () => {
        if (bufferSplit.state().active) {
          bufferSplit.cyclePaneBuffer("prev", tabStore.tabs());
        } else {
          tabStore.prevTab();
        }
      },
      onEnterEdit: () => enterEditMode("edit"),
      getEditMode: () => editMode(),
    }
  );

  // File watcher: auto-reload preview when file changes externally
  const fileWatcher = createFileWatcher({
    onFileChanged(content, path) {
      setMarkdown(content);
      // Also update the tab store so tab content stays in sync
      const tab = tabStore.activeTab();
      if (tab && tab.filePath === path) {
        tabStore.updateTabContent(tab.id, content);
        tabStore.markClean(tab.id);
      }
      // Update editor content if in edit/split mode and not dirty
      if (editMode() !== "preview" && editorRef && !isDirty()) {
        editorRef.setContent(content);
      }
      setFileNotification({ text: "File updated externally", type: "info" });
      setTimeout(() => setFileNotification(null), 3000);
    },
    onFileDeleted(path) {
      setFileNotification({
        text: `File deleted: ${path.split(/[\\/]/).pop() ?? path}`,
        type: "error",
      });
    },
    onConflict(_path) {
      // When dirty, default to accepting external changes
      // (future: show a user prompt dialog)
      return true;
    },
    isDirty() {
      const tab = tabStore.activeTab();
      return tab?.isDirty ?? false;
    },
  });

  onCleanup(() => {
    fileWatcher.destroy();
    syncEngineRef?.destroy();
    editorRef = null;
  });

  // -----------------------------------------------------------------------
  // Tauri event listeners
  // -----------------------------------------------------------------------

  async function setupTauriListeners() {
    // Listen for directory open
    const unlistenDir = await listen<string>("cli-open-dir", async (event) => {
      // Only handle directory events if input hasn't been resolved to buffer mode
      if (initialInputResolved) return;

      const dir = event.payload;
      setDirPath(dir);
      try {
        const files = await invoke<MdFileEntry[]>("list_md_files", { dirPath: dir });
        setFileList(files);
        // If no tabs are open, show file list
        if (tabStore.tabCount() === 0) {
          setViewMode("file-list");
        }
      } catch (err) {
        console.error("Failed to list md files:", err);
        setFileList([]);
        setViewMode("file-list");
      }
    });

    // Listen for single file open (CLI arg or drag-drop)
    const unlistenFile = await listen<string>("cli-open", async (event) => {
      const filePath = event.payload;
      await openFileInTab(filePath);
    });

    // Listen for CLI args (universal input: stdin, clipboard, gh:, URL)
    const unlistenCliArgs = await listen<CliArgs>("cli-args", async (event) => {
      const args = event.payload;
      try {
        const result = await resolveInputSource(args);
        if (result) {
          initialInputResolved = true;
          displayBufferContent(result);
        }
      } catch (err) {
        initialInputResolved = true;
        handleInputError(err);
      }
    });

    onCleanup(() => {
      unlistenDir();
      unlistenFile();
      unlistenCliArgs();
    });
  }

  // -----------------------------------------------------------------------
  // File operations
  // -----------------------------------------------------------------------

  /** Open a file by path, reading content and creating a tab */
  async function openFileInTab(filePath: string) {
    const parts = filePath.split(/[\\/]/);
    const fileName = parts[parts.length - 1] || filePath;

    try {
      const content = await invoke<string>("read_file", { path: filePath });
      tabStore.openTab(filePath, fileName, content);
      setViewMode("preview");
      setFileNotification(null);

      // Update title bar
      const fileContent: InputContent = {
        source: "file",
        content,
        title: fileName,
        filePath,
      };
      updateWindowTitle(fileContent);

      // Start watching the file for external changes
      await fileWatcher.watch(filePath);

      // Track in recent files
      recentFiles.addEntry(filePath, fileName);
    } catch (err) {
      console.error("[kusa] Failed to read file:", filePath, err);
      setErrorMessage(`Cannot open file: ${filePath}\n${String(err)}`);
      setViewMode("error");
    }
  }

  /** Handle file selection from FileList or FilePicker */
  function handleFileSelect(path: string) {
    openFileInTab(path);
  }

  /** Handle file selection from FilePicker */
  function handleFilePickerSelect(path: string) {
    // Return to preview mode if in edit/split
    if (editMode() !== "preview") {
      returnToPreview();
    }
    openFileInTab(path);
  }

  /** Handle file drop */
  async function handleFileDrop(path: string) {
    // Return to preview mode if in edit/split before opening new file
    if (editMode() !== "preview") {
      await returnToPreview();
    }
    openFileInTab(path);
  }

  /** Create a new untitled tab */
  function handleNewTab() {
    const id = tabStore.createUntitledTab();
    if (id) {
      setViewMode("preview");
      setMarkdown("");
      setHtml("");
      updateWindowTitle({ source: "file", content: "", title: tabStore.activeTab()?.fileName ?? "Untitled", filePath: null });
    }
  }

  /** Handle tab close */
  async function handleTabClose(id: string) {
    // Check if closing a dirty untitled tab — confirm discard
    const tab = tabStore.tabs().find((t) => t.id === id);
    if (tab?.isUntitled && tab.isDirty) {
      const confirmed = await confirm("Discard unsaved changes?", { title: "kusa", kind: "warning" });
      if (!confirmed) return;
    }

    // If closing the active tab while in edit/split mode, save and clean up
    if (editMode() !== "preview" && tabStore.activeTabId() === id) {
      // Only force save if it's a file tab (not untitled)
      if (isDirty() && !tab?.isUntitled) {
        await syncEngineRef?.forceSave();
      }
      syncEngineRef?.destroy();
      syncEngineRef = null;
      editorRef = null;
      setEditMode("preview");
      setIsDirty(false);
    }

    // Exit buffer split if the closed tab was assigned to a pane
    const splitState = bufferSplit.state();
    if (splitState.active && (splitState.leftTabId === id || splitState.rightTabId === id)) {
      bufferSplit.exitSplit();
    }

    const hasRemaining = tabStore.closeTab(id);
    if (!hasRemaining) {
      // No tabs remaining — stop watching
      fileWatcher.unwatch();
      if (dirPath()) {
        setViewMode("file-list");
      } else {
        setViewMode("demo");
        setMarkdown("");
      }
    }
  }

  // -----------------------------------------------------------------------
  // Universal input helpers
  // -----------------------------------------------------------------------

  /** Display resolved input content (stdin, clipboard, github, url) */
  function displayBufferContent(content: InputContent) {
    bufferManager.setContent(content);
    setMarkdown(content.content);
    setViewMode("buffer");
    updateWindowTitle(content);
  }

  /** Handle errors from input resolution with source-specific hints */
  function handleInputError(err: unknown) {
    const errMsg = String(err);
    setErrorMessage(errMsg);

    if (errMsg.includes("形式が不正")) {
      setErrorHint("Correct format: gh:owner/repo/path/to/file.md");
    } else if (errMsg.includes("レート制限")) {
      setErrorHint("GitHub API allows 60 requests per hour for unauthenticated access.");
    } else {
      setErrorHint(undefined);
    }

    setViewMode("error");
  }

  // -----------------------------------------------------------------------
  // Edit mode management
  // -----------------------------------------------------------------------

  /** Create a SyncEngine instance for the given tab */
  function createSyncEngineForTab(tab: Tab, initialContent: string): SyncEngineInstance {
    return createSyncEngine({
      previewDebounceMs: 250,
      autoSaveDebounceMs: 800,
      filePath: tab.filePath,
      initialContent,
      skipAutoSave: true,
      onPreviewUpdate: (newHtml) => setHtml(newHtml),
      onSaveComplete: () => {
        setSaveNotification({ text: "Saved", type: "success" });
        setIsDirty(false);
        const t = tabStore.activeTab();
        if (t) tabStore.markClean(t.id);
      },
      onSaveError: (error) => {
        setSaveNotification({ text: `Save failed: ${error}`, type: "error" });
      },
      onDirtyChange: (dirty) => setIsDirty(dirty),
    });
  }

  /** Enter edit or split mode */
  async function enterEditMode(mode: "edit" | "split") {
    // Guard: peek mode is read-only, no editor
    if (isPeekMode()) return;
    // Guard: only allow when in file preview mode and editable
    if (viewMode() !== "preview") return;
    if (bufferManager.state.isBufferMode()) return;
    if (editMode() !== "preview") return;

    // Load CodeMirror modules if needed
    if (lazyLoader.state() !== "loaded") {
      if (lazyLoader.state() === "loading") return;
      await lazyLoader.load();
      if (lazyLoader.state() === "error") {
        setFileNotification({ text: "Failed to load editor", type: "error" });
        setTimeout(() => setFileNotification(null), 3000);
        return;
      }
    }

    // Create sync engine for the active tab
    const tab = tabStore.activeTab();
    if (!tab) return;

    // Capture preview scroll position before switching to split mode
    const ref = previewRef();
    if (mode === "split" && ref) {
      const els = ref.querySelectorAll<HTMLElement>("[data-source-line]");
      const containerRect = ref.getBoundingClientRect();
      let bestLine: number | null = null;
      let bestDist = Infinity;
      for (const el of els) {
        const v = el.getAttribute("data-source-line");
        if (!v) continue;
        const rect = el.getBoundingClientRect();
        const dist = Math.abs(rect.top - containerRect.top);
        if (dist < bestDist) {
          bestDist = dist;
          bestLine = parseInt(v, 10);
        }
        if (rect.top > containerRect.bottom) break;
      }
      preSplitPreviewLine = bestLine;
    }

    syncEngineRef?.destroy();
    syncEngineRef = createSyncEngineForTab(tab, markdown());

    setEditMode(mode);
  }

  /** Return to preview mode from edit/split */
  async function returnToPreview(forceSave = false) {
    if (editMode() === "preview" || returningToPreview) return;
    returningToPreview = true;
    try {
      // Get latest content from editor before unmount
      const content = editorRef?.getContent() ?? markdown();

      // Save if dirty or force save requested (:wq)
      const tab = tabStore.activeTab();
      if (forceSave || isDirty()) {
        if (tab?.isUntitled) {
          // For untitled tabs, trigger Save As on :wq
          await handleSaveAs(tab);
        } else {
          await syncEngineRef?.forceSave();
        }
      }

      // Clean up sync engine
      syncEngineRef?.destroy();
      syncEngineRef = null;
      editorRef = null;

      // Update markdown for preview rendering
      setMarkdown(content);

      // Update tab content (re-read active tab since it may have been promoted)
      const currentTab = tabStore.activeTab();
      if (currentTab) {
        tabStore.updateTabContent(currentTab.id, content);
        tabStore.markClean(currentTab.id);
      }

      // Reset editor state
      setIsDirty(false);
      setVimMode("NORMAL");
      setCursorPosition({ line: 1, col: 1 });

      // Switch to preview
      setEditMode("preview");
    } finally {
      returningToPreview = false;
    }
  }

  /** Handle content change from editor (feeds sync engine only, NOT markdown signal) */
  function handleEditorChange(content: string) {
    syncEngineRef?.handleContentChange(content);
  }

  /** Handle :w command — force save or Save As for untitled */
  async function handleSave() {
    const tab = tabStore.activeTab();
    if (tab?.isUntitled) {
      await handleSaveAs(tab);
      return;
    }
    syncEngineRef?.forceSave();
  }

  /** Save As dialog for untitled tabs */
  async function handleSaveAs(tab: Tab) {
    const filePath = await save({
      filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }],
    });
    if (!filePath) return; // cancelled

    const content = editorRef?.getContent() ?? tab.content;
    try {
      await invoke("write_file", { path: filePath, content });
    } catch (e) {
      setSaveNotification({ text: `Save failed: ${String(e)}`, type: "error" });
      return;
    }

    const fileName = filePath.split(/[\\/]/).pop() || filePath;
    tabStore.promoteToFile(tab.id, filePath, fileName);

    // Recreate SyncEngine for promoted file tab
    syncEngineRef?.destroy();
    const promoted = tabStore.activeTab();
    if (promoted) {
      syncEngineRef = createSyncEngineForTab(promoted, content);
    }

    // Start file watcher
    await fileWatcher.watch(filePath);

    updateWindowTitle({ source: "file", content, title: fileName, filePath });
    setSaveNotification({ text: "Saved", type: "success" });
    setIsDirty(false);
  }

  /** Handle :wq command — save and return to preview */
  function handleSaveQuit() {
    returnToPreview(true);
  }

  /** Handle :q command — return to preview */
  function handleQuit() {
    returnToPreview();
  }

  /** Handle editor ready callback */
  function handleEditorReady(editor: CMEditorInstance) {
    editorRef = editor;
  }

  // -----------------------------------------------------------------------
  // Sync active tab content to markdown signal
  // -----------------------------------------------------------------------

  createEffect(() => {
    const tab = tabStore.activeTab();
    if (tab) {
      setMarkdown(tab.content);
      // Watch the active tab's file for external changes (skip for untitled)
      if (!tab.isUntitled) {
        fileWatcher.watch(tab.filePath).catch(() => {});
      }

      // If in edit/split mode, update editor content and recreate sync engine
      if (editMode() !== "preview" && editorRef) {
        editorRef.setContent(tab.content);
        syncEngineRef?.destroy();
        syncEngineRef = createSyncEngineForTab(tab, tab.content);
        setIsDirty(false);
      }
    }
  });

  // Save scroll position before switching tabs
  let previousTabId: string | null = null;
  createEffect(() => {
    const currentId = tabStore.activeTabId();
    const ref = previewRef();
    if (previousTabId && previousTabId !== currentId && ref) {
      tabStore.saveScrollPosition(previousTabId, ref.scrollTop);
    }
    previousTabId = currentId;

    const tab = tabStore.activeTab();
    if (tab && ref) {
      requestAnimationFrame(() => {
        const el = previewRef();
        if (el) {
          el.scrollTop = tab.scrollPosition;
        }
      });
    }
  });

  // -----------------------------------------------------------------------
  // Initialize
  // -----------------------------------------------------------------------

  onMount(async () => {
    // 1. Initialize window mode
    try {
      const mode = (await invoke<string>("get_window_mode")) as WindowMode;
      initWindowMode(mode);
    } catch (err) {
      console.error("Failed to get window mode, defaulting to full:", err);
      initWindowMode("full");
    }
    setModeReady(true);

    // 2. Setup Tauri event listeners (for drag-drop, single-instance, etc.)
    await setupTauriListeners();

    // 3. Pull CLI args from backend (avoids race condition with events)
    try {
      const args = await invoke<{ file?: string; clipboard?: boolean; dir?: string } | null>("get_cli_args");
      if (args) {
        if (args.file) {
          await openFileInTab(args.file);
        } else if (args.clipboard) {
          const result = await resolveInputSource({ clipboard: true });
          if (result) {
            initialInputResolved = true;
            displayBufferContent(result);
          }
        } else if (args.dir) {
          setDirPath(args.dir);
          try {
            const files = await invoke<MdFileEntry[]>("list_md_files", { dirPath: args.dir });
            setFileList(files);
            if (tabStore.tabCount() === 0) {
              setViewMode("file-list");
            }
          } catch (err) {
            console.error("Failed to list md files:", err);
            setFileList([]);
            setViewMode("file-list");
          }
        }
      }
    } catch (err) {
      console.error("Failed to get CLI args:", err);
    }

    // 4. Show window once the frontend is ready
    getCurrentWindow().show();
  });

  // Process markdown to HTML
  createEffect(async () => {
    const md = markdown();
    if (!md) {
      setHtml("");
      return;
    }
    const result = await processMarkdown(md);
    setHtml(result);
  });

  // Setup observers when preview HTML changes or preview container mounts
  createEffect(() => {
    const _html = html(); // track
    const ref = previewRef(); // track
    if (!ref) return;

    requestAnimationFrame(() => {
      if (ref) {
        observe(ref);
        readingProgress.attach(ref);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Keyboard shortcuts
  // -----------------------------------------------------------------------

  function handleKeyDown(e: KeyboardEvent) {
    const isMeta = e.metaKey || e.ctrlKey;

    // === Global shortcuts (work even when CodeMirror editor has focus) ===

    // Cmd+Shift+P / Ctrl+Shift+P: Toggle system file picker
    if (isMeta && e.shiftKey && (e.key === "p" || e.key === "P")) {
      e.preventDefault();
      recentFiles.load();
      setSystemPickerOpen((v) => !v);
      return;
    }

    // Cmd+P / Ctrl+P: Toggle file picker (only when dirPath is set)
    if (isMeta && !e.shiftKey && e.key === "p") {
      if (dirPath() && fileList().length > 0) {
        e.preventDefault();
        setFilePickerOpen((v) => !v);
        return;
      }
    }

    // Cmd+F / Ctrl+F: Toggle search
    if (isMeta && !e.shiftKey && e.key === "f") {
      e.preventDefault();
      setSearchOpen((v) => !v);
      return;
    }

    // Ctrl+E: Toggle split mode (preview ↔ split)
    if (e.ctrlKey && !e.metaKey && e.key === "e") {
      if (viewMode() !== "preview" || bufferManager.state.isBufferMode()) return;
      if (bufferSplit.state().active) return; // Req 4.1
      e.preventDefault();
      if (editMode() === "split") {
        returnToPreview();
      } else {
        enterEditMode("split");
      }
      return;
    }

    // Ctrl-W: Two-stroke keybinding prefix for buffer split (Vim-style)
    if (e.ctrlKey && !e.metaKey && e.key === "w") {
      e.preventDefault(); // Always prevent default to avoid window/tab close
      // Activate prefix when in preview mode with tabs, or when split is already active
      const splitActive = bufferSplit.state().active;
      if (
        (viewMode() === "preview" && editMode() === "preview" && tabStore.tabCount() > 0) ||
        splitActive
      ) {
        setCtrlWPending(true);
        if (ctrlWTimer) clearTimeout(ctrlWTimer);
        ctrlWTimer = setTimeout(() => setCtrlWPending(false), 500);
      }
      return;
    }

    // Second stroke after Ctrl-W
    if (ctrlWPending()) {
      setCtrlWPending(false);
      if (ctrlWTimer) { clearTimeout(ctrlWTimer); ctrlWTimer = null; }

      const splitState = bufferSplit.state();

      switch (e.key) {
        case "v": // Ctrl-W v: enter buffer split
          e.preventDefault();
          if (!splitState.active && editMode() === "preview") { // Req 4.3
            const activeId = tabStore.activeTabId();
            if (activeId) bufferSplit.enterSplit(activeId);
          }
          return;
        case "q": // Ctrl-W q: exit buffer split
          e.preventDefault();
          if (splitState.active) bufferSplit.exitSplit();
          return;
        case "h": // Ctrl-W h: focus left pane
          e.preventDefault();
          if (splitState.active) bufferSplit.setFocusedPane("left");
          return;
        case "l": // Ctrl-W l: focus right pane
          e.preventDefault();
          if (splitState.active) bufferSplit.setFocusedPane("right");
          return;
      }
      return;
    }

    // Ctrl+H/J/K/L: Direct pane focus in buffer split
    if (e.ctrlKey && !e.metaKey && bufferSplit.state().active) {
      if (e.key === "h" || e.key === "k") {
        e.preventDefault();
        bufferSplit.setFocusedPane("left");
        return;
      }
      if (e.key === "l" || e.key === "j") {
        e.preventDefault();
        bufferSplit.setFocusedPane("right");
        return;
      }
    }

    // Escape: Return to preview from edit/split NORMAL mode, exit buffer split, or from file-list to active tab
    if (e.key === "Escape" && !searchOpen() && !filePickerOpen() && !systemPickerOpen()) {
      // Exit buffer split picker first, then buffer split itself
      if (bufferSplit.state().showBufferPicker) {
        e.preventDefault();
        bufferSplit.closeBufferPicker();
        return;
      }
      if (editMode() !== "preview" && vimMode() === "NORMAL") {
        e.preventDefault();
        returnToPreview();
        return;
      }
      // Return from buffer mode (clipboard, stdin, etc.)
      if (viewMode() === "buffer") {
        e.preventDefault();
        bufferManager.clear();
        if (tabStore.tabCount() > 0) {
          setViewMode("preview");
        } else if (dirPath()) {
          setViewMode("file-list");
        } else {
          setViewMode("demo");
        }
        return;
      }
      // Return from file-list view to active tab
      if (viewMode() === "file-list" && tabStore.tabCount() > 0) {
        e.preventDefault();
        setViewMode("preview");
        return;
      }
    }

    // Cmd+W: Close active tab, or close window if no tabs
    if (e.metaKey && e.key === "w") {
      e.preventDefault();
      const activeId = tabStore.activeTabId();
      if (activeId && tabStore.tabCount() > 0) {
        handleTabClose(activeId);
        return;
      }
      getCurrentWebviewWindow().close();
      return;
    }

    // Cmd+Shift+] : Next tab
    if (isMeta && e.shiftKey && e.key === "]") {
      e.preventDefault();
      tabStore.nextTab();
      return;
    }

    // Cmd+Shift+[ : Previous tab
    if (isMeta && e.shiftKey && e.key === "[") {
      e.preventDefault();
      tabStore.prevTab();
      return;
    }

    // Cmd+1-9: Switch to tab by index
    if (isMeta && !e.shiftKey && e.key >= "1" && e.key <= "9") {
      e.preventDefault();
      const index = parseInt(e.key, 10) - 1;
      tabStore.switchToIndex(index);
      return;
    }

    // Ctrl+T: Toggle theme
    if (e.ctrlKey && e.key === "t") {
      e.preventDefault();
      theme.toggle();
      return;
    }

    // Ctrl+B: Toggle TOC
    if (e.ctrlKey && e.key === "b") {
      e.preventDefault();
      setTocVisible((v) => !v);
      return;
    }

    // Cmd+Shift+F / Ctrl+Shift+F: Toggle focus mode
    if (isMeta && e.shiftKey && (e.key === "f" || e.key === "F")) {
      e.preventDefault();
      focusMode.toggle();
      return;
    }

    // Cmd+= / Ctrl+=: Zoom in
    if (isMeta && (e.key === "=" || e.key === "+")) {
      e.preventDefault();
      zoom.zoomIn();
      return;
    }

    // Cmd+- / Ctrl+-: Zoom out
    if (isMeta && e.key === "-") {
      e.preventDefault();
      zoom.zoomOut();
      return;
    }

    // Cmd+0 / Ctrl+0: Reset zoom
    if (isMeta && e.key === "0") {
      e.preventDefault();
      zoom.resetZoom();
      return;
    }

    // Cmd+Shift+C / Ctrl+Shift+C: Copy preview as rich text (for Slack/Notion)
    if (isMeta && e.shiftKey && (e.key === "c" || e.key === "C")) {
      e.preventDefault();
      const ref = previewRef();
      if (ref) {
        const html = ref.innerHTML;
        const plain = ref.innerText;
        navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([plain], { type: "text/plain" }),
          }),
        ]).then(
          () => setSaveNotification({ text: "Copied as rich text", type: "success" }),
          () => setSaveNotification({ text: "Copy failed", type: "error" }),
        );
      }
      return;
    }

    // Cmd+Shift+V / Ctrl+Shift+V: Open clipboard content as a tab
    if (isMeta && e.shiftKey && (e.key === "v" || e.key === "V")) {
      e.preventDefault();
      invoke<InputContent>("read_clipboard").then(
        (content) => {
          const id = tabStore.createClipboardTab(content.content);
          if (id) {
            setViewMode("preview");
            setMarkdown(content.content);
            updateWindowTitle({ source: "clipboard", content: content.content, title: "clipboard", filePath: null });
          }
        },
        (err) => handleInputError(err),
      );
      return;
    }

    // === Preview-only shortcuts (blocked when editor/input has focus) ===

    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return;
    }

    // Vim `/`: Open search (only when search is not already open)
    if (e.key === "/" && !isMeta && !e.altKey && !searchOpen()) {
      e.preventDefault();
      setSearchOpen(true);
      return;
    }
  }

  document.addEventListener("keydown", handleKeyDown);
  onCleanup(() => document.removeEventListener("keydown", handleKeyDown));

  // Handle heading click from TOC
  function handleHeadingClick(id: string) {
    actions.jumpToHeading(id);
  }

  // Handle heading select from picker
  function handleHeadingSelect(id: string) {
    actions.jumpToHeading(id);
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  // Notification banner for file watch events
  const FileNotification = () => (
    <Show when={fileNotification()}>
      {(notification) => {
        const colorClass = () => {
          switch (notification().type) {
            case "error":
              return "bg-red-900/80 text-red-200 border-red-700";
            case "warning":
              return "bg-amber-900/80 text-amber-200 border-amber-700";
            default:
              return "bg-blue-900/80 text-blue-200 border-blue-700";
          }
        };
        return (
          <div
            class={`fixed top-2 right-2 z-50 rounded border px-3 py-1.5 text-xs shadow-lg transition-opacity ${colorClass()}`}
          >
            <span>{notification().text}</span>
            <button
              class="ml-2 opacity-60 hover:opacity-100"
              onClick={() => setFileNotification(null)}
            >
              x
            </button>
          </div>
        );
      }}
    </Show>
  );

  // Buffer split HTML signals (process markdown for each pane independently)
  const [leftHtml, setLeftHtml] = createSignal("");
  const [rightHtml, setRightHtml] = createSignal("");

  createEffect(async () => {
    const s = bufferSplit.state();
    if (!s.active) return;
    const leftTab = s.leftTabId ? tabStore.tabs().find((t) => t.id === s.leftTabId) : null;
    if (leftTab) {
      const result = await processMarkdown(leftTab.content);
      setLeftHtml(result);
    } else {
      setLeftHtml("");
    }
  });

  createEffect(async () => {
    const s = bufferSplit.state();
    if (!s.active) return;
    const rightTab = s.rightTabId ? tabStore.tabs().find((t) => t.id === s.rightTabId) : null;
    if (rightTab) {
      const result = await processMarkdown(rightTab.content);
      setRightHtml(result);
    } else {
      setRightHtml("");
    }
  });

  // Buffer split content (two preview panes side by side)
  const BufferSplitContent = () => {
    const splitState = () => bufferSplit.state();
    return (
      <div class="relative h-full">
        <SplitLayout
          left={
            <BufferPane
              tabId={splitState().leftTabId}
              tabs={tabStore.tabs()}
              html={leftHtml()}
              isFocused={splitState().focusedPane === "left"}
              onFocus={() => bufferSplit.setFocusedPane("left")}
              previewRef={setLeftPaneRef}
            />
          }
          right={
            <BufferPane
              tabId={splitState().rightTabId}
              tabs={tabStore.tabs()}
              html={rightHtml()}
              isFocused={splitState().focusedPane === "right"}
              onFocus={() => bufferSplit.setFocusedPane("right")}
              previewRef={setRightPaneRef}
            />
          }
        />
        <Show when={splitState().showBufferPicker}>
          <BufferPicker
            tabs={tabStore.tabs()}
            onSelect={(id) => bufferSplit.switchPaneBuffer(id)}
            onCancel={() => bufferSplit.closeBufferPicker()}
          />
        </Show>
      </div>
    );
  };

  // Preview content with reading-support features
  const PreviewContent = () => (
    <>
      <FileNotification />
      <ReadingProgress
        progress={readingProgress.progress()}
        visible={readingProgress.isScrollable()}
      />
      <div class="app-layout">
        <TOCPanel
          headings={headings()}
          activeHeadingId={activeId()}
          isVisible={tocVisible()}
          onHeadingClick={handleHeadingClick}
          onToggle={() => setTocVisible((v) => !v)}
        />
        <div class="preview-wrapper">
          <SearchBar
            isOpen={searchOpen()}
            onClose={() => setSearchOpen(false)}
            getContainer={getPreviewRef}
          />
          <Preview
            html={html()}
            ref={setPreviewRef}
          />
        </div>
      </div>
      <HeadingPicker
        headings={headings()}
        isOpen={pickerOpen()}
        onSelect={handleHeadingSelect}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );

  // Edit mode content (full-screen editor + status bar)
  const EditContent = () => {
    const modules = lazyLoader.getModules();
    if (!modules) return null;
    return (
      <div class="flex h-full flex-col">
        <div class="flex-1 min-h-0">
          <EditorPane
            modules={modules}
            initialContent={markdown()}
            onContentChange={handleEditorChange}
            onVimModeChange={setVimMode}
            onCursorChange={setCursorPosition}
            onSaveCommand={handleSave}
            onSaveQuitCommand={handleSaveQuit}
            onQuitCommand={handleQuit}
            onEditorReady={handleEditorReady}
          />
        </div>
        <StatusBar
          vimMode={vimMode}
          cursorPosition={cursorPosition}
          isDirty={isDirty}
          notification={saveNotification}
        />
      </div>
    );
  };

  // Capture preview line before switching to split mode for initial sync
  let preSplitPreviewLine: number | null = null;

  // Split mode content (editor left + preview right + status bar)
  const SplitContent = () => {
    const modules = lazyLoader.getModules();
    if (!modules) return null;

    let splitPreviewRef: HTMLDivElement | undefined;
    let scrollSyncRef: ScrollSyncInstance | null = null;

    const handleSplitEditorReady = (editor: CMEditorInstance) => {
      handleEditorReady(editor);

      // Initial sync: move editor cursor to match saved preview position
      const savedLine = preSplitPreviewLine;
      preSplitPreviewLine = null; // consume once

      if (savedLine && savedLine > 1) {
        const view = editor.getView();
        if (view) {
          const doc = view.state.doc;
          if (savedLine <= doc.lines) {
            const pos = doc.line(savedLine).from;
            view.dispatch({
              selection: { anchor: pos },
              scrollIntoView: true,
            });
          }
        }
      } else if (splitPreviewRef && scrollSyncRef) {
        // Fallback: query current preview scroll position
        requestAnimationFrame(() => {
          const line = scrollSyncRef?.getLineFromScroll();
          if (line && line > 1) {
            const view = editor.getView();
            if (view) {
              const doc = view.state.doc;
              if (line <= doc.lines) {
                const pos = doc.line(line).from;
                view.dispatch({
                  selection: { anchor: pos },
                  scrollIntoView: true,
                });
              }
            }
          }
        });
      }
    };

    const handleSplitCursorChange = (pos: { line: number; col: number }) => {
      setCursorPosition(pos);
      scrollSyncRef?.syncToLine(pos.line);
    };

    // Initialize scroll sync after preview mounts
    const initScrollSync = (el: HTMLDivElement) => {
      splitPreviewRef = el;
      scrollSyncRef = createScrollSync({
        getPreviewContainer: () => splitPreviewRef ?? null,
      });
    };

    // Cleanup on unmount
    onCleanup(() => {
      scrollSyncRef?.destroy();
      scrollSyncRef = null;
    });

    return (
      <div class="flex h-full flex-col">
        <div class="flex-1 min-h-0">
          <SplitLayout
            left={
              <EditorPane
                modules={modules}
                initialContent={markdown()}
                onContentChange={handleEditorChange}
                onVimModeChange={setVimMode}
                onCursorChange={handleSplitCursorChange}
                onSaveCommand={handleSave}
                onSaveQuitCommand={handleSaveQuit}
                onQuitCommand={handleQuit}
                onEditorReady={handleSplitEditorReady}
              />
            }
            right={
              <Preview
                html={html()}
                ref={initScrollSync}
              />
            }
          />
        </div>
        <StatusBar
          vimMode={vimMode}
          cursorPosition={cursorPosition}
          isDirty={isDirty}
          notification={saveNotification}
        />
      </div>
    );
  };

  // Loading indicator
  const LoadingView = () => (
    <div class="h-full flex items-center justify-center">
      <div class="text-zinc-500 text-lg animate-pulse">Loading...</div>
    </div>
  );

  // Full mode content layout
  const FullContent = () => (
    <div class="flex h-full flex-col">
      {/* File picker overlay — directory mode */}
      <FilePicker
        files={fileList()}
        isOpen={filePickerOpen()}
        dirPath={dirPath() ?? ""}
        onSelect={handleFilePickerSelect}
        onClose={() => setFilePickerOpen(false)}
        mode="directory"
      />

      {/* File picker overlay — system mode */}
      <FilePicker
        files={[]}
        isOpen={systemPickerOpen()}
        dirPath=""
        onSelect={handleFilePickerSelect}
        onClose={() => setSystemPickerOpen(false)}
        mode="system"
        recentFiles={recentFiles.entries()}
      />

      {/* Tab bar: always shown (includes + button) */}
      <TabBar
        tabs={tabStore.tabs}
        activeTabId={() => bufferSplit.state().active ? bufferSplit.focusedTabId() : tabStore.activeTabId()}
        onTabClick={(id) => {
          if (bufferSplit.state().active) {
            bufferSplit.switchPaneBuffer(id);
          } else {
            tabStore.switchTab(id);
          }
        }}
        onTabClose={handleTabClose}
        onNewTab={handleNewTab}
        onTabMove={(from, to) => tabStore.moveTab(from, to)}
        isMaxTabs={tabStore.tabCount() >= 20}
        hasDir={!!dirPath() && fileList().length > 0}
        onShowFileList={() => setViewMode("file-list")}
        onOpenFilePicker={() => setFilePickerOpen(true)}
      />

      {/* Main content area */}
      <div class="flex-1 min-h-0">
        <Switch fallback={<LoadingView />}>
          <Match when={viewMode() === "loading"}>
            <LoadingView />
          </Match>

          <Match when={viewMode() === "preview" || viewMode() === "demo" || viewMode() === "buffer"}>
            <DropZone onFileDrop={handleFileDrop}>
              <Show
                when={viewMode() === "preview" && (editMode() !== "preview" || bufferSplit.state().active)}
                fallback={<PreviewContent />}
              >
                <Switch>
                  <Match when={bufferSplit.state().active}>
                    <BufferSplitContent />
                  </Match>
                  <Match when={editMode() === "edit"}>
                    <EditContent />
                  </Match>
                  <Match when={editMode() === "split"}>
                    <SplitContent />
                  </Match>
                </Switch>
              </Show>
            </DropZone>
          </Match>

          <Match when={viewMode() === "file-list"}>
            <DropZone onFileDrop={handleFileDrop}>
              <FileList
                files={fileList()}
                onSelect={handleFileSelect}
              />
            </DropZone>
          </Match>

          <Match when={viewMode() === "error"}>
            <ErrorDisplay
              message={errorMessage()}
              hint={errorHint()}
            />
          </Match>
        </Switch>
      </div>
    </div>
  );

  return (
    <Show when={modeReady()} fallback={<div class="h-full bg-zinc-900" />}>
      <Show
        when={isPeekMode()}
        fallback={<FullContent />}
      >
        <PeekShell>
          <FileNotification />
          <Switch fallback={<LoadingView />}>
            <Match when={viewMode() === "loading"}>
              <LoadingView />
            </Match>
            <Match when={viewMode() === "preview" || viewMode() === "buffer"}>
              <div class="preview-wrapper">
                <SearchBar
                  isOpen={searchOpen()}
                  onClose={() => setSearchOpen(false)}
                  getContainer={getPreviewRef}
                />
                <Preview
                  html={html()}
                  ref={setPreviewRef}
                />
              </div>
            </Match>
            <Match when={viewMode() === "error"}>
              <ErrorDisplay
                message={errorMessage()}
                hint={errorHint()}
              />
            </Match>
          </Switch>
        </PeekShell>
      </Show>
    </Show>
  );
};

export default App;
