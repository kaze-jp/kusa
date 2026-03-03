/**
 * File watcher service: listens for Tauri backend file-change events
 * and triggers re-read / notification on the frontend.
 *
 * Usage:
 *   const watcher = createFileWatcher({ ... });
 *   watcher.watch("/path/to/file.md");
 *   // later:
 *   watcher.unwatch();
 *   watcher.destroy();
 */

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FileWatcherConfig {
  /** Called with new file content when the file changes externally */
  onFileChanged: (content: string, path: string) => void;
  /** Called when the watched file is deleted */
  onFileDeleted: (path: string) => void;
  /**
   * Called when an external change is detected while local edits are dirty.
   * Returns true if the external change should be applied, false to keep local.
   */
  onConflict: (path: string) => boolean;
  /** Returns whether the editor has unsaved local changes */
  isDirty: () => boolean;
}

export interface FileWatcherInstance {
  /** Start watching a file path (stops any previous watch) */
  watch(path: string): Promise<void>;
  /** Stop the current watch */
  unwatch(): Promise<void>;
  /** Tear down all listeners */
  destroy(): void;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export function createFileWatcher(
  config: FileWatcherConfig,
): FileWatcherInstance {
  let currentPath: string | null = null;
  let changedUnlisten: UnlistenFn | null = null;
  let deletedUnlisten: UnlistenFn | null = null;
  let destroyed = false;

  /** Set up Tauri event listeners (only once) */
  async function setupListeners(): Promise<void> {
    if (changedUnlisten) return; // already set up

    changedUnlisten = await listen<string>("file-changed", async (event) => {
      if (destroyed) return;
      const changedPath = event.payload;

      // Only handle if it matches our current watch target
      if (changedPath !== currentPath) return;

      // Check for dirty conflict
      if (config.isDirty()) {
        const applyExternal = config.onConflict(changedPath);
        if (!applyExternal) return; // user chose to keep local changes
      }

      // Re-read the file and notify
      try {
        const content = await invoke<string>("read_file", {
          path: changedPath,
        });
        if (!destroyed) {
          config.onFileChanged(content, changedPath);
        }
      } catch (err) {
        console.error("Failed to re-read changed file:", err);
      }
    });

    deletedUnlisten = await listen<string>("file-deleted", (event) => {
      if (destroyed) return;
      const deletedPath = event.payload;

      if (deletedPath !== currentPath) return;

      config.onFileDeleted(deletedPath);
    });
  }

  async function watch(path: string): Promise<void> {
    if (destroyed) return;

    // Ensure listeners are set up
    await setupListeners();

    // Stop previous watch if path changed
    if (currentPath && currentPath !== path) {
      try {
        await invoke("stop_file_watch");
      } catch {
        // ignore errors stopping old watch
      }
    }

    currentPath = path;

    try {
      await invoke("start_file_watch", { path });
    } catch (err) {
      console.error("Failed to start file watch:", err);
    }
  }

  async function unwatch(): Promise<void> {
    if (!currentPath) return;

    try {
      await invoke("stop_file_watch");
    } catch {
      // ignore
    }
    currentPath = null;
  }

  function destroy(): void {
    destroyed = true;
    currentPath = null;

    // Clean up Tauri event listeners
    if (changedUnlisten) {
      changedUnlisten();
      changedUnlisten = null;
    }
    if (deletedUnlisten) {
      deletedUnlisten();
      deletedUnlisten = null;
    }

    // Stop backend watcher
    invoke("stop_file_watch").catch(() => {});
  }

  return { watch, unwatch, destroy };
}
