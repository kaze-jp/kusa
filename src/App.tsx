/**
 * App shell: manages view modes (Preview / Edit / Split), keyboard handling,
 * lazy loading of CodeMirror, and wiring of all sub-components.
 */

import {
  createSignal,
  createEffect,
  onMount,
  onCleanup,
  Show,
  type Component,
} from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

import {
  createEditorLazyLoader,
  type CMEditorInstance,
  type CodeMirrorModules,
} from "./lib/editor";
import { createSyncEngine, type SyncEngineInstance } from "./lib/sync";

import { processMarkdown } from "./lib/markdown";

import SplitLayout from "./components/SplitLayout";
import EditorPane from "./components/EditorPane";
import Preview from "./components/Preview";
import StatusBar from "./components/StatusBar";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewMode = "preview" | "edit" | "split";

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const App: Component = () => {
  // --- State ---
  const [viewMode, setViewMode] = createSignal<ViewMode>("preview");
  const [filePath, setFilePath] = createSignal<string>("");
  const [rawContent, setRawContent] = createSignal<string>("");
  const [previewHtml, setPreviewHtml] = createSignal<string>("");
  const [isDirty, setIsDirty] = createSignal(false);
  const [vimMode, setVimMode] =
    createSignal<"NORMAL" | "INSERT" | "VISUAL" | "COMMAND">("NORMAL");
  const [cursorPos, setCursorPos] = createSignal({ line: 1, col: 1 });
  const [notification, setNotification] = createSignal<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [noFile, setNoFile] = createSignal(false);

  // --- Lazy loader ---
  const loader = createEditorLazyLoader();
  const [editorModules, setEditorModules] =
    createSignal<CodeMirrorModules | null>(null);

  // --- Refs ---
  let editorInstance: CMEditorInstance | null = null;
  let syncEngine: SyncEngineInstance | null = null;

  // Track escape key for double-escape -> preview
  let lastEscapeTime = 0;

  // --- File loading ---
  async function loadFile(path: string) {
    try {
      setLoading(true);
      const content = await invoke<string>("read_file", { path });
      setFilePath(path);
      setRawContent(content);
      setNoFile(false);
      setLoading(false);
    } catch (e: any) {
      console.error("Failed to load file:", e);
      setLoading(false);
    }
  }

  // --- Sync engine setup ---
  function setupSyncEngine(path: string) {
    syncEngine?.destroy();
    syncEngine = createSyncEngine({
      previewDebounceMs: 250,
      autoSaveDebounceMs: 800,
      filePath: path,
      initialContent: rawContent(),
      onPreviewUpdate: (html) => setPreviewHtml(html),
      onSaveComplete: () => {
        setIsDirty(false);
        setNotification({ text: "Saved", type: "success" });
      },
      onSaveError: (err) => {
        setNotification({ text: `Save failed: ${err}`, type: "error" });
      },
      onDirtyChange: (dirty) => setIsDirty(dirty),
    });
    return syncEngine;
  }

  // --- Mode switching ---
  async function enterEditMode(mode: "edit" | "split") {
    // Ensure CodeMirror is loaded
    if (loader.state() !== "loaded") {
      await loader.load();
    }
    const mods = loader.getModules();
    if (!mods) return;
    setEditorModules(mods);

    // Setup sync engine if not already
    if (!syncEngine && filePath()) {
      setupSyncEngine(filePath());
    }

    setViewMode(mode);
  }

  function enterPreviewMode() {
    setViewMode("preview");
  }

  // --- Save handlers ---
  function handleSaveCommand() {
    syncEngine?.forceSave();
  }

  async function handleSaveQuitCommand() {
    await syncEngine?.forceSave();
    try {
      await getCurrentWindow().close();
    } catch {
      // Window close might fail in dev
    }
  }

  async function handleQuitCommand() {
    try {
      await getCurrentWindow().close();
    } catch {
      // Window close might fail in dev
    }
  }

  // --- Content change from editor ---
  function handleContentChange(content: string) {
    setRawContent(content);
    syncEngine?.handleContentChange(content);
  }

  // --- Keyboard handler ---
  function handleKeyDown(e: KeyboardEvent) {
    const mode = viewMode();
    const target = e.target as HTMLElement;
    const isInEditor = target.closest(".cm-editor") !== null;

    // In preview mode: Enter or i -> split mode
    if (mode === "preview") {
      if (e.key === "Enter" || e.key === "i") {
        e.preventDefault();
        enterEditMode("split");
        return;
      }
    }

    // Double Escape -> preview mode (only from normal vim mode or when not in editor)
    if (e.key === "Escape") {
      // If in editor and vim is in INSERT mode, let vim handle first escape
      if (isInEditor && vimMode() === "INSERT") {
        return;
      }

      const now = Date.now();
      if (now - lastEscapeTime < 500) {
        // Double escape detected
        e.preventDefault();
        enterPreviewMode();
        lastEscapeTime = 0;
        return;
      }
      lastEscapeTime = now;
    }
  }

  // --- Initialization ---
  onMount(async () => {
    // Listen for CLI open events
    const unlistenCli = await listen<string>("cli-open", async (event) => {
      await loadFile(event.payload);
    });

    // Listen for open-file events (single instance)
    const unlistenOpen = await listen<string>("open-file", async (event) => {
      await loadFile(event.payload);
    });

    window.addEventListener("keydown", handleKeyDown);

    // Check if no file was provided after a short delay
    setTimeout(() => {
      if (!filePath()) {
        setNoFile(true);
        setLoading(false);
      }
    }, 500);

    onCleanup(() => {
      unlistenCli();
      unlistenOpen();
      window.removeEventListener("keydown", handleKeyDown);
      syncEngine?.destroy();
    });
  });

  // When rawContent changes in preview mode, trigger initial preview render
  createEffect(() => {
    const content = rawContent();
    const mode = viewMode();
    if (mode === "preview" && content) {
      processMarkdown(content).then((html) => {
        setPreviewHtml(html);
      });
    }
  });

  // When entering split/edit mode and sync engine exists, do initial preview
  createEffect(() => {
    const mode = viewMode();
    if ((mode === "split" || mode === "edit") && syncEngine && rawContent()) {
      syncEngine.forcePreviewUpdate();
    }
  });

  // --- Render ---
  return (
    <div class="flex h-full flex-col bg-zinc-900 text-zinc-100">
      {/* Loading state */}
      <Show when={loading()}>
        <div class="flex h-full items-center justify-center text-zinc-500">
          Loading...
        </div>
      </Show>

      {/* No file state */}
      <Show when={!loading() && noFile()}>
        <div class="flex h-full flex-col items-center justify-center gap-4 text-zinc-500">
          <p class="text-lg">kusa -- Markdown Editor</p>
          <p class="text-sm">
            Usage: <code class="rounded bg-zinc-800 px-2 py-1">kusa file.md</code>
          </p>
        </div>
      </Show>

      {/* Main content area */}
      <Show when={!loading() && !noFile()}>
        <div class="flex-1 overflow-hidden">
          {/* Preview mode */}
          <Show when={viewMode() === "preview"}>
            <Preview rawMarkdown={rawContent} />
          </Show>

          {/* Edit mode (editor only) */}
          <Show when={viewMode() === "edit" && editorModules()}>
            <Show
              when={loader.state() === "loaded"}
              fallback={
                <div class="flex h-full items-center justify-center text-zinc-500">
                  Loading editor...
                </div>
              }
            >
              <EditorPane
                modules={editorModules()!}
                initialContent={rawContent()}
                onContentChange={handleContentChange}
                onVimModeChange={setVimMode}
                onCursorChange={setCursorPos}
                onSaveCommand={handleSaveCommand}
                onSaveQuitCommand={handleSaveQuitCommand}
                onQuitCommand={handleQuitCommand}
                onEditorReady={(ed) => {
                  editorInstance = ed;
                  if (!syncEngine && filePath()) {
                    setupSyncEngine(filePath());
                  }
                }}
              />
            </Show>
          </Show>

          {/* Split mode */}
          <Show when={viewMode() === "split" && editorModules()}>
            <Show
              when={loader.state() === "loaded"}
              fallback={
                <div class="flex h-full items-center justify-center text-zinc-500">
                  Loading editor...
                </div>
              }
            >
              <SplitLayout
                left={
                  <EditorPane
                    modules={editorModules()!}
                    initialContent={rawContent()}
                    onContentChange={handleContentChange}
                    onVimModeChange={setVimMode}
                    onCursorChange={setCursorPos}
                    onSaveCommand={handleSaveCommand}
                    onSaveQuitCommand={handleSaveQuitCommand}
                    onQuitCommand={handleQuitCommand}
                    onEditorReady={(ed) => {
                      editorInstance = ed;
                      if (!syncEngine && filePath()) {
                        setupSyncEngine(filePath());
                      }
                    }}
                  />
                }
                right={<Preview htmlContent={previewHtml} />}
              />
            </Show>
          </Show>
        </div>

        {/* Status bar: only in edit/split modes */}
        <Show when={viewMode() !== "preview"}>
          <StatusBar
            vimMode={vimMode}
            cursorPosition={cursorPos}
            isDirty={isDirty}
            notification={notification}
          />
        </Show>
      </Show>
    </div>
  );
};

export default App;
