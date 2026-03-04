import { createSignal } from "solid-js";
import { invoke } from "@tauri-apps/api/core";

const STORAGE_KEY = "recentFiles";
const MAX_ENTRIES = 50;

export interface RecentFileEntry {
  path: string;
  name: string;
  openedAt: number;
}

export function useRecentFiles() {
  const [entries, setEntries] = createSignal<RecentFileEntry[]>([]);
  let loaded = false;

  async function load() {
    if (loaded) return;
    try {
      const raw = await invoke<string | null>("load_preference", { key: STORAGE_KEY });
      if (raw) {
        const parsed = JSON.parse(raw) as RecentFileEntry[];
        setEntries(parsed.slice(0, MAX_ENTRIES));
      }
    } catch {
      // ignore load errors
    }
    loaded = true;
  }

  async function save(list: RecentFileEntry[]) {
    try {
      await invoke("save_preference", {
        key: STORAGE_KEY,
        value: JSON.stringify(list),
      });
    } catch {
      // ignore save errors
    }
  }

  async function addEntry(path: string, name: string) {
    if (!loaded) await load();

    const now = Date.now();
    const current = entries();

    // Remove existing entry with same path, then prepend
    const filtered = current.filter((e) => e.path !== path);
    const updated = [{ path, name, openedAt: now }, ...filtered].slice(0, MAX_ENTRIES);

    setEntries(updated);
    await save(updated);
  }

  return { entries, load, addEntry };
}
