import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

let colonPressed = false;
let colonTimeout: ReturnType<typeof setTimeout> | undefined;

export function initKeyboardHandler() {
  document.addEventListener("keydown", async (e: KeyboardEvent) => {
    // Cmd+W (Mac) / Ctrl+W (Windows/Linux) to close
    if ((e.metaKey || e.ctrlKey) && e.key === "w") {
      e.preventDefault();
      const appWindow = getCurrentWebviewWindow();
      await appWindow.close();
      return;
    }

    // Vim-style :q sequence
    if (e.key === ":") {
      colonPressed = true;
      clearTimeout(colonTimeout);
      colonTimeout = setTimeout(() => {
        colonPressed = false;
      }, 1000);
      return;
    }

    if (colonPressed && e.key === "q") {
      colonPressed = false;
      clearTimeout(colonTimeout);
      const appWindow = getCurrentWebviewWindow();
      await appWindow.close();
      return;
    }

    // Any other key resets the :q sequence
    if (e.key !== "Shift" && e.key !== ":") {
      colonPressed = false;
    }
  });
}
