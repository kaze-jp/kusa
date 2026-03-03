import {
  createSignal,
  createResource,
  Show,
  Switch,
  Match,
  onMount,
} from "solid-js";
import type { Component } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import Preview from "./components/Preview";
import ErrorDisplay from "./components/ErrorDisplay";
import FileList from "./components/FileList";
import type { MdFileEntry } from "./components/FileList";
import DropZone from "./components/DropZone";
import {
  processMarkdown,
  processMarkdownChunked,
  isMarkdownFile,
  isLargeFile,
} from "./lib/markdown";
import { initKeyboardHandler } from "./lib/keyboard";

type ViewMode = "preview" | "file-list" | "error";

const App: Component = () => {
  const [currentFilePath, setCurrentFilePath] = createSignal<string | null>(
    null,
  );
  const [currentDirPath, setCurrentDirPath] = createSignal<string | null>(null);
  const [viewMode, setViewMode] = createSignal<ViewMode>("preview");
  const [errorMessage, setErrorMessage] = createSignal("");

  const [fileContent] = createResource(currentFilePath, async (path) => {
    if (!path) return null;
    return invoke<string>("read_file", { path });
  });

  const [chunkedHtml, setChunkedHtml] = createSignal<string | null>(null);

  const [htmlContent] = createResource(
    () => fileContent(),
    async (content) => {
      if (content == null) return "";
      setChunkedHtml(null);
      const path = currentFilePath();
      if (path && isMarkdownFile(path)) {
        if (isLargeFile(content)) {
          await processMarkdownChunked(content, (html) => {
            setChunkedHtml(html);
          });
          return chunkedHtml() ?? "";
        }
        return processMarkdown(content);
      }
      // Non-markdown: wrap in pre for plain text display
      const escaped = content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `<pre class="whitespace-pre-wrap text-zinc-300 p-4 font-mono text-sm">${escaped}</pre>`;
    },
  );

  const [dirFiles] = createResource(currentDirPath, async (dirPath) => {
    if (!dirPath) return [];
    return invoke<MdFileEntry[]>("list_md_files", { dirPath });
  });

  async function openFile(path: string) {
    setErrorMessage("");
    setCurrentDirPath(null);
    setCurrentFilePath(path);
    setViewMode("preview");
  }

  async function openDirectory(path: string) {
    setErrorMessage("");
    setCurrentFilePath(null);
    setCurrentDirPath(path);
    setViewMode("file-list");
  }

  function handleFileSelect(path: string) {
    openFile(path);
  }

  onMount(async () => {
    initKeyboardHandler();

    // Listen for CLI open events
    await listen<string>("cli-open", (event) => {
      openFile(event.payload);
    });

    // Listen for open-file events (single instance, file association)
    await listen<string>("open-file", (event) => {
      openFile(event.payload);
    });

    // Listen for directory open events
    await listen<string>("cli-open-dir", (event) => {
      openDirectory(event.payload);
    });

    // Show window after setup
    const appWindow = getCurrentWebviewWindow();
    await appWindow.show();
  });

  return (
    <DropZone onFileDrop={openFile}>
    <div class="h-full bg-zinc-900 text-zinc-100">
      <Show
        when={!fileContent.error && !dirFiles.error}
        fallback={
          <ErrorDisplay
            message={
              String(fileContent.error || dirFiles.error || "Unknown error")
            }
            filePath={currentFilePath() ?? currentDirPath() ?? undefined}
          />
        }
      >
        <Switch
          fallback={
            <div class="h-full flex items-center justify-center">
              <p class="text-zinc-500">kusa</p>
            </div>
          }
        >
          <Match when={viewMode() === "preview" && (chunkedHtml() || htmlContent())}>
            <Preview html={chunkedHtml() || htmlContent()!} />
          </Match>
          <Match when={viewMode() === "file-list" && dirFiles()}>
            <FileList
              files={dirFiles()!}
              onSelect={handleFileSelect}
            />
          </Match>
          <Match when={viewMode() === "error"}>
            <ErrorDisplay
              message={errorMessage()}
              filePath={currentFilePath() ?? undefined}
            />
          </Match>
          <Match when={fileContent.loading || dirFiles.loading || htmlContent.loading}>
            <div class="h-full flex items-center justify-center">
              <p class="text-zinc-500">Loading...</p>
            </div>
          </Match>
        </Switch>
      </Show>
    </div>
    </DropZone>
  );
};

export default App;
