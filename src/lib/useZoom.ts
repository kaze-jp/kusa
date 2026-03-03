import { createSignal, createEffect } from "solid-js";

const DEFAULT_ZOOM = 100;
const MIN_ZOOM = 50;
const MAX_ZOOM = 200;
const ZOOM_STEP = 10;
const PREFERENCE_KEY = "zoom-level";

/**
 * Manages the font-size zoom level for preview and editor.
 *
 * - On init: loads saved preference, falls back to 100%
 * - zoomIn/zoomOut/resetZoom: adjust level, persist, update CSS custom property
 * - CSS custom property `--zoom-font-size` is applied to document.documentElement
 *
 * Note: Tauri IPC calls for persistence are wrapped in try/catch to degrade gracefully.
 * In development (Vite dev server without Tauri), IPC calls will silently fail.
 */
export function useZoom() {
  const [zoomLevel, setZoomLevel] = createSignal(DEFAULT_ZOOM);

  /** Apply the CSS custom property so containers can pick it up */
  function applyZoom(level: number) {
    const fontSize = (16 * level) / 100;
    document.documentElement.style.setProperty(
      "--zoom-font-size",
      `${fontSize}px`
    );
  }

  /** Clamp the zoom level to the valid range */
  function clamp(value: number): number {
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
  }

  /** Save zoom preference via Tauri IPC */
  async function saveZoom(level: number) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("save_preference", {
        key: PREFERENCE_KEY,
        value: String(level),
      });
    } catch {
      // Silently fail in dev mode (no Tauri context)
    }
  }

  /** Load saved zoom preference, fallback to default */
  async function initZoom() {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const saved = await invoke<string | null>("load_preference", {
        key: PREFERENCE_KEY,
      });
      if (saved !== null && saved !== undefined) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_ZOOM && parsed <= MAX_ZOOM) {
          setZoomLevel(parsed);
          applyZoom(parsed);
          return;
        }
      }
    } catch {
      // Not in Tauri context or IPC failed — use default
    }

    applyZoom(DEFAULT_ZOOM);
  }

  function zoomIn() {
    const next = clamp(zoomLevel() + ZOOM_STEP);
    setZoomLevel(next);
    saveZoom(next);
  }

  function zoomOut() {
    const next = clamp(zoomLevel() - ZOOM_STEP);
    setZoomLevel(next);
    saveZoom(next);
  }

  function resetZoom() {
    setZoomLevel(DEFAULT_ZOOM);
    saveZoom(DEFAULT_ZOOM);
  }

  // Sync CSS custom property whenever the signal changes
  createEffect(() => {
    applyZoom(zoomLevel());
  });

  // Load persisted zoom on creation
  initZoom();

  return { zoomLevel, zoomIn, zoomOut, resetZoom };
}
