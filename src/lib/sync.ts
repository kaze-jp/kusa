/**
 * Sync engine: debounced editor -> preview sync, plus auto-save handler.
 *
 * - Preview debounce: 250ms (configurable)
 * - Auto-save debounce: 800ms (configurable)
 * - Maintains last-good HTML on parse failure
 */

import { invoke } from "@tauri-apps/api/core";
import { processMarkdown } from "./markdown";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SyncEngineConfig {
  previewDebounceMs: number; // 200-300ms recommended
  autoSaveDebounceMs: number; // 500-1000ms recommended
  filePath: string;
  initialContent?: string; // seed buffer so :w before any edit won't blank the file
  onPreviewUpdate: (html: string) => void;
  onSaveComplete: () => void;
  onSaveError: (error: string) => void;
  onDirtyChange: (isDirty: boolean) => void;
}

export interface SyncEngineInstance {
  handleContentChange(content: string): void;
  forcePreviewUpdate(): void;
  forceSave(): Promise<void>;
  destroy(): void;
}

// ---------------------------------------------------------------------------
// Tauri IPC helper
// ---------------------------------------------------------------------------

interface WriteFileResult {
  bytes_written: number;
}

async function writeFile(
  path: string,
  content: string,
): Promise<WriteFileResult> {
  return invoke<WriteFileResult>("write_file", { path, content });
}

// ---------------------------------------------------------------------------
// Debounce utility
// ---------------------------------------------------------------------------

function debounce<T extends (...args: any[]) => void>(
  fn: T,
  ms: number,
): { call: T; cancel: () => void; flush: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    lastArgs = null;
  };

  const flush = () => {
    if (lastArgs !== null) {
      const args = lastArgs;
      cancel();
      fn(...args);
    }
  };

  const call = ((...args: Parameters<T>) => {
    lastArgs = args;
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      const a = lastArgs;
      lastArgs = null;
      if (a) fn(...a);
    }, ms);
  }) as T;

  return { call, cancel, flush };
}

// ---------------------------------------------------------------------------
// Sync Engine
// ---------------------------------------------------------------------------

export function createSyncEngine(config: SyncEngineConfig): SyncEngineInstance {
  let lastGoodHtml = "";
  let currentContent = config.initialContent ?? "";
  let isDirty = false;
  let saving = false;
  let pendingSave = false;
  let destroyed = false;

  // --- Preview debounce ---
  const previewDebounce = debounce(async (content: string) => {
    if (destroyed) return;
    try {
      const html = await processMarkdown(content);
      lastGoodHtml = html;
      config.onPreviewUpdate(html);
    } catch {
      // On parse failure keep last-good HTML
      config.onPreviewUpdate(lastGoodHtml);
    }
  }, config.previewDebounceMs);

  // --- Auto-save debounce ---
  async function doSave() {
    if (destroyed) return;
    if (saving) {
      pendingSave = true;
      return;
    }
    saving = true;
    try {
      await writeFile(config.filePath, currentContent);
      setDirty(false);
      config.onSaveComplete();
    } catch (e: any) {
      config.onSaveError(String(e));
    } finally {
      saving = false;
      if (pendingSave && !destroyed) {
        pendingSave = false;
        await doSave();
      }
    }
  }

  const saveDebounce = debounce(() => {
    doSave();
  }, config.autoSaveDebounceMs);

  function setDirty(value: boolean) {
    if (isDirty !== value) {
      isDirty = value;
      config.onDirtyChange(value);
    }
  }

  // --- Public API ---

  function handleContentChange(content: string) {
    currentContent = content;
    setDirty(true);
    previewDebounce.call(content);
    saveDebounce.call();
  }

  function forcePreviewUpdate() {
    previewDebounce.cancel();
    processMarkdown(currentContent)
      .then((html) => {
        lastGoodHtml = html;
        if (!destroyed) config.onPreviewUpdate(html);
      })
      .catch(() => {
        if (!destroyed) config.onPreviewUpdate(lastGoodHtml);
      });
  }

  async function forceSave(): Promise<void> {
    saveDebounce.cancel();
    await doSave();
  }

  function destroy() {
    destroyed = true;
    previewDebounce.cancel();
    saveDebounce.cancel();
  }

  return { handleContentChange, forcePreviewUpdate, forceSave, destroy };
}
