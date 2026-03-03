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
import { getCurrentWindow } from "@tauri-apps/api/window";
import { processMarkdown, extractHeadings } from "./lib/markdown";
import { useActiveHeading } from "./lib/useActiveHeading";
import { useReadingProgress } from "./lib/useReadingProgress";
import { useVimNav } from "./lib/useVimNav";
import { useFocusMode } from "./lib/useFocusMode";
import { useTheme } from "./lib/useTheme";
import { useZoom } from "./lib/useZoom";
import Preview from "./components/Preview";
import TOCPanel from "./components/TOCPanel";
import HeadingPicker from "./components/HeadingPicker";
import ReadingProgress from "./components/ReadingProgress";
import PeekShell from "./components/PeekShell";
import SearchBar from "./components/SearchBar";
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

const App: Component = () => {
  // Window mode initialization
  const [modeReady, setModeReady] = createSignal(false);

  // Core state
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
    activeId
  );

  // Initialize window mode from Rust backend, then show window
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

  // Global keyboard shortcuts
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

  // Full mode content (reading-support features: TOC, vim nav, focus mode, etc.)
  const FullContent = () => (
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
