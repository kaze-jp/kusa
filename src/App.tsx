import {
  type Component,
  createSignal,
  createEffect,
  createMemo,
  onCleanup,
  onMount,
  Show,
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
import Preview from "./components/Preview";
import TOCPanel from "./components/TOCPanel";
import HeadingPicker from "./components/HeadingPicker";
import ReadingProgress from "./components/ReadingProgress";
import PeekShell from "./components/PeekShell";
import SearchBar from "./components/SearchBar";
import FileList, { type MdFileEntry } from "./components/FileList";
import TabBar from "./components/TabBar";
import {
  initWindowMode,
  isPeekMode,
  type WindowMode,
} from "./stores/windowMode";

// Demo content for development
const DEMO_MARKDOWN = `# kusa — Markdown Reader

A beautiful Markdown reader for AI developers.

## Features

### TOC Navigation

The table of contents panel on the left shows the document structure. Click any heading to jump directly to that section.

### Vim-Style Navigation

- \`gd\` — Open heading picker
- \`]]\` — Jump to next heading
- \`[[\` — Jump to previous heading
- \`gg\` — Scroll to top
- \`G\` — Scroll to bottom

### GFM Support

#### Tables

| Feature | Status |
|---------|--------|
| Tables | ✅ Supported |
| Checklists | ✅ Supported |
| Footnotes | ✅ Supported |
| Strikethrough | ✅ Supported |

#### Task Lists

- [x] Markdown parsing
- [x] GFM support
- [x] Syntax highlighting
- [ ] Mermaid diagrams
- [ ] KaTeX math

#### Blockquotes

> "Ghostty がターミナル体験を再定義したように、kusa が Markdown 体験を再定義する"

#### Footnotes

This is a sentence with a footnote[^1].

[^1]: This is the footnote content.

#### Strikethrough

~~This text is deleted~~ and this is not.

### Code Blocks

\`\`\`typescript
interface HeadingInfo {
  id: string;
  text: string;
  level: number;
  index: number;
}

function extractHeadings(markdown: string): HeadingInfo[] {
  const tree = parser.parse(markdown);
  return tree.children
    .filter(node => node.type === "heading")
    .map((node, index) => ({
      id: generateSlug(node.text),
      text: node.text,
      level: node.depth,
      index,
    }));
}
\`\`\`

\`\`\`rust
#[tauri::command]
fn save_preference(
    app: tauri::AppHandle,
    key: String,
    value: String,
) -> Result<(), String> {
    let config_dir = app.path().config_dir()
        .map_err(|e| e.to_string())?;
    let prefs_path = config_dir.join("kusa/preferences.json");
    // ... implementation
    Ok(())
}
\`\`\`

\`\`\`python
def process_markdown(content: str) -> str:
    """Convert markdown to HTML with syntax highlighting."""
    import markdown
    extensions = ['fenced_code', 'tables', 'toc']
    return markdown.markdown(content, extensions=extensions)
\`\`\`

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| \`Ctrl+T\` | Toggle theme (dark/light) |
| \`Ctrl+B\` | Toggle TOC panel |
| \`Cmd+F\` | Document search |
| \`/\` | Document search (Vim) |
| \`Cmd+Shift+F\` | Toggle focus mode |
| \`gd\` | Open heading picker |
| \`]]\` | Next heading |
| \`[[\` | Previous heading |

### Theme Support

The editor supports both **dark** and **light** themes. Press \`Ctrl+T\` to toggle.

Theme preference is persisted across sessions.

## はじめに

日本語の見出しもサポートしています。TOCパネルで確認できます。

## Architecture

### Frontend (SolidJS)

The frontend uses **SolidJS** for fine-grained reactivity:

- \`Preview\` — Renders sanitized HTML
- \`TOCPanel\` — Hierarchical heading navigation
- \`HeadingPicker\` — Fuzzy heading search overlay
- \`ReadingProgress\` — Scroll progress indicator

### Backend (Rust / Tauri)

Minimal Rust backend:

- File I/O
- CLI argument parsing
- Preference persistence

## Conclusion

kusa aims to be the definitive Markdown reading experience for terminal-native AI developers.
`;

/** View mode for the top-level layout */
type AppViewMode = "demo" | "file-list" | "preview";

const App: Component = () => {
  // Window mode initialization
  const [modeReady, setModeReady] = createSignal(false);

  // View mode: demo (no CLI args), file-list (directory mode), preview (file open)
  const [viewMode, setViewMode] = createSignal<AppViewMode>("demo");

  // Directory state
  const [dirPath, setDirPath] = createSignal<string | null>(null);
  const [fileList, setFileList] = createSignal<MdFileEntry[]>([]);

  // Tab store
  const tabStore = createTabStore();

  // Core state (for current active tab or demo)
  const [markdown, setMarkdown] = createSignal(DEMO_MARKDOWN);
  const [html, setHtml] = createSignal("");
  const [tocVisible, setTocVisible] = createSignal(true);
  const [searchOpen, setSearchOpen] = createSignal(false);

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

  // -----------------------------------------------------------------------
  // Tauri event listeners
  // -----------------------------------------------------------------------

  async function setupTauriListeners() {
    // Listen for directory open
    const unlistenDir = await listen<string>("cli-open-dir", async (event) => {
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

    onCleanup(() => {
      unlistenDir();
      unlistenFile();
    });
  }

  // -----------------------------------------------------------------------
  // File operations
  // -----------------------------------------------------------------------

  /** Open a file by path, reading content and creating a tab */
  async function openFileInTab(filePath: string) {
    // Extract filename from path
    const parts = filePath.split(/[\\/]/);
    const fileName = parts[parts.length - 1] || filePath;

    try {
      const content = await invoke<string>("read_file", { path: filePath });
      tabStore.openTab(filePath, fileName, content);
      setViewMode("preview");
    } catch (err) {
      console.error("Failed to read file:", err);
    }
  }

  /** Handle file selection from FileList */
  function handleFileSelect(path: string) {
    openFileInTab(path);
  }

  /** Handle tab close */
  function handleTabClose(id: string) {
    const hasRemaining = tabStore.closeTab(id);
    if (!hasRemaining) {
      // No tabs left: return to file list if in directory mode, else demo
      if (dirPath()) {
        setViewMode("file-list");
      } else {
        setViewMode("demo");
        setMarkdown(DEMO_MARKDOWN);
      }
    }
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
    // Save scroll position of the previous tab
    if (previousTabId && previousTabId !== currentId && previewRef) {
      tabStore.saveScrollPosition(previousTabId, previewRef.scrollTop);
    }
    previousTabId = currentId;

    // Restore scroll position of the new tab
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
    // Query window mode from Rust backend via command (reliable, no race condition)
    try {
      const mode = (await invoke<string>("get_window_mode")) as WindowMode;
      initWindowMode(mode);
      setModeReady(true);
    } catch (err) {
      console.error("Failed to get window mode, defaulting to full:", err);
      initWindowMode("full");
      setModeReady(true);
    }

    // Setup Tauri event listeners
    await setupTauriListeners();

    // Show window once the frontend is ready
    getCurrentWindow().show();
  });

  // Process markdown to HTML
  createEffect(async () => {
    const md = markdown();
    const result = await processMarkdown(md);
    setHtml(result);
  });

  // Setup observers when preview HTML changes
  createEffect(() => {
    const _html = html(); // track
    if (!previewRef) return;

    // Wait for DOM render
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
      // No tabs: close the window
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

    // Cmd+Shift+F / Ctrl+Shift+F: Toggle focus mode (moved from Ctrl+F)
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

  // Preview content with reading-support features
  const PreviewContent = () => (
    <>
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
        <Show when={viewMode() === "file-list"}>
          <FileList
            files={fileList()}
            onSelect={handleFileSelect}
          />
        </Show>

        <Show when={viewMode() === "preview" || viewMode() === "demo"}>
          <PreviewContent />
        </Show>
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
        </PeekShell>
      </Show>
    </Show>
  );
};

export default App;
