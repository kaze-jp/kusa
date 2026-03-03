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
import type { InputContent, CliArgs } from "./lib/types";
import Preview from "./components/Preview";
import TOCPanel from "./components/TOCPanel";
import HeadingPicker from "./components/HeadingPicker";
import ReadingProgress from "./components/ReadingProgress";
import PeekShell from "./components/PeekShell";
import SearchBar from "./components/SearchBar";
import FileList, { type MdFileEntry } from "./components/FileList";
import TabBar from "./components/TabBar";
import ErrorDisplay from "./components/ErrorDisplay";
import DropZone from "./components/DropZone";
import {
  initWindowMode,
  isPeekMode,
  type WindowMode,
} from "./stores/windowMode";

/** View mode for the top-level layout */
type AppViewMode = "loading" | "demo" | "file-list" | "preview" | "buffer" | "error";

const App: Component = () => {
  // Window mode initialization
  const [modeReady, setModeReady] = createSignal(false);

  // View mode
  const [viewMode, setViewMode] = createSignal<AppViewMode>("loading");

  // Directory state
  const [dirPath, setDirPath] = createSignal<string | null>(null);
  const [fileList, setFileList] = createSignal<MdFileEntry[]>([]);

  // Tab store
  const tabStore = createTabStore();

  // Core state (for current active tab or demo)
  const [markdown, setMarkdown] = createSignal("");
  const [html, setHtml] = createSignal("");
  const [tocVisible, setTocVisible] = createSignal(true);
  const [searchOpen, setSearchOpen] = createSignal(false);

  // Error state
  const [errorMessage, setErrorMessage] = createSignal("");
  const [errorHint, setErrorHint] = createSignal<string | undefined>(undefined);

  // Buffer manager for universal input (stdin, clipboard, github, url)
  const bufferManager = createBufferManager();

  // Track whether initial input has been resolved to avoid race conditions
  let initialInputResolved = false;

  // File watching state
  const [fileNotification, setFileNotification] = createSignal<{
    text: string;
    type: "info" | "warning" | "error";
  } | null>(null);

  // Preview container ref
  let previewRef: HTMLDivElement | undefined;
  const getPreviewRef = () => previewRef;

  // Derived data
  const headings = createMemo(() => extractHeadings(markdown()));

  // Hooks
  const theme = useTheme();
  const zoom = useZoom();
  const { activeId, observe } = useActiveHeading();
  const readingProgress = useReadingProgress();
  const focusMode = useFocusMode(getPreviewRef, activeId);
  const { pickerOpen, setPickerOpen, actions } = useVimNav(
    getPreviewRef,
    headings,
    activeId,
    {
      onNextTab: () => tabStore.nextTab(),
      onPrevTab: () => tabStore.prevTab(),
    }
  );

  // File watcher: auto-reload preview when file changes externally
  const fileWatcher = createFileWatcher({
    onFileChanged(content, _path) {
      setMarkdown(content);
      setFileNotification({ text: "File updated externally", type: "info" });
      setTimeout(() => setFileNotification(null), 3000);
    },
    onFileDeleted(path) {
      setFileNotification({
        text: `File deleted: ${path.split("/").pop() ?? path}`,
        type: "error",
      });
    },
    onConflict(_path) {
      return true;
    },
    isDirty() {
      return false;
    },
  });

  onCleanup(() => fileWatcher.destroy());

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
    } catch (err) {
      console.error("Failed to read file:", err);
    }
  }

  /** Handle file selection from FileList */
  function handleFileSelect(path: string) {
    openFileInTab(path);
  }

  /** Handle file drop */
  function handleFileDrop(path: string) {
    openFileInTab(path);
  }

  /** Handle tab close */
  function handleTabClose(id: string) {
    const hasRemaining = tabStore.closeTab(id);
    if (!hasRemaining) {
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
  // Sync active tab content to markdown signal
  // -----------------------------------------------------------------------

  createEffect(() => {
    const tab = tabStore.activeTab();
    if (tab) {
      setMarkdown(tab.content);
    }
  });

  // Save scroll position before switching tabs
  let previousTabId: string | null = null;
  createEffect(() => {
    const currentId = tabStore.activeTabId();
    if (previousTabId && previousTabId !== currentId && previewRef) {
      tabStore.saveScrollPosition(previousTabId, previewRef.scrollTop);
    }
    previousTabId = currentId;

    const tab = tabStore.activeTab();
    if (tab && previewRef) {
      requestAnimationFrame(() => {
        if (previewRef) {
          previewRef.scrollTop = tab.scrollPosition;
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

    // 2. Setup Tauri event listeners
    await setupTauriListeners();

    // 3. Show window once the frontend is ready
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

  // Setup observers when preview HTML changes
  createEffect(() => {
    const _html = html(); // track
    if (!previewRef) return;

    requestAnimationFrame(() => {
      if (previewRef) {
        observe(previewRef);
        readingProgress.attach(previewRef);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Keyboard shortcuts
  // -----------------------------------------------------------------------

  function handleKeyDown(e: KeyboardEvent) {
    // Cmd+F / Ctrl+F always works, even when input is focused (to toggle search)
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === "f") {
      e.preventDefault();
      setSearchOpen((v) => !v);
      return;
    }

    // Don't handle other shortcuts when input elements are focused
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return;
    }

    const isMeta = e.metaKey || e.ctrlKey;

    // Cmd+W: Close active tab, or close window if no tabs
    if (isMeta && e.key === "w") {
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
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "f" || e.key === "F")) {
      e.preventDefault();
      focusMode.toggle();
      return;
    }

    // Cmd+= / Ctrl+=: Zoom in
    if ((e.metaKey || e.ctrlKey) && (e.key === "=" || e.key === "+")) {
      e.preventDefault();
      zoom.zoomIn();
      return;
    }

    // Cmd+- / Ctrl+-: Zoom out
    if ((e.metaKey || e.ctrlKey) && e.key === "-") {
      e.preventDefault();
      zoom.zoomOut();
      return;
    }

    // Cmd+0 / Ctrl+0: Reset zoom
    if ((e.metaKey || e.ctrlKey) && e.key === "0") {
      e.preventDefault();
      zoom.resetZoom();
      return;
    }

    // Vim `/`: Open search (only when search is not already open)
    if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !searchOpen()) {
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
        />
        <div class="preview-wrapper">
          <SearchBar
            isOpen={searchOpen()}
            onClose={() => setSearchOpen(false)}
            getContainer={getPreviewRef}
          />
          <Preview
            html={html()}
            ref={(el) => (previewRef = el)}
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

  // Loading indicator
  const LoadingView = () => (
    <div class="h-full flex items-center justify-center">
      <div class="text-zinc-500 text-lg animate-pulse">Loading...</div>
    </div>
  );

  // Full mode content layout
  const FullContent = () => (
    <div class="flex h-full flex-col">
      {/* Tab bar: shown when tabs exist */}
      <TabBar
        tabs={tabStore.tabs}
        activeTabId={tabStore.activeTabId}
        onTabClick={(id) => tabStore.switchTab(id)}
        onTabClose={handleTabClose}
      />

      {/* Main content area */}
      <div class="flex-1 min-h-0">
        <Switch fallback={<LoadingView />}>
          <Match when={viewMode() === "loading"}>
            <LoadingView />
          </Match>

          <Match when={viewMode() === "preview" || viewMode() === "demo" || viewMode() === "buffer"}>
            <DropZone onFileDrop={handleFileDrop}>
              <PreviewContent />
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
                  ref={(el) => (previewRef = el)}
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
