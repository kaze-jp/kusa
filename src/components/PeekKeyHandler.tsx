import { type Component, onMount, onCleanup } from "solid-js";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { isPeekMode, promoteToFullMode } from "../stores/windowMode";

/**
 * PeekKeyHandler listens for peek-mode-specific keyboard shortcuts.
 * - Esc / q: close the peek window
 * - f: promote to full window
 *
 * Only active when in peek mode. After promotion, these bindings
 * are disabled and normal window key handlers take over.
 */
const PeekKeyHandler: Component = () => {
  async function handleKeyDown(e: KeyboardEvent) {
    if (!isPeekMode()) return;

    switch (e.key) {
      case "Escape":
      case "q": {
        e.preventDefault();
        e.stopPropagation();
        const appWindow = getCurrentWindow();
        await appWindow.close();
        break;
      }
      case "f": {
        e.preventDefault();
        e.stopPropagation();
        await promoteToFull();
        break;
      }
    }
  }

  async function promoteToFull() {
    promoteToFullMode();
    try {
      await invoke("promote_to_full");
    } catch (err) {
      console.error("Failed to promote to full window:", err);
    }
  }

  onMount(() => {
    // Use capture phase to intercept before other handlers
    document.addEventListener("keydown", handleKeyDown, true);
  });

  onCleanup(() => {
    document.removeEventListener("keydown", handleKeyDown, true);
  });

  // Renderless component - only handles key events
  return null;
};

export default PeekKeyHandler;
