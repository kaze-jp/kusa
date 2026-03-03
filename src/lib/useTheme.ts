import { createSignal, createEffect, onCleanup } from "solid-js";

type Theme = "dark" | "light";

/**
 * Manages the application theme (dark/light).
 *
 * - On init: tries to load saved preference, falls back to OS setting
 * - Toggle: switches theme and saves preference
 * - OS listener: follows OS changes when user hasn't explicitly set a theme
 *
 * Note: Tauri IPC calls for persistence are wrapped in try/catch to degrade gracefully.
 * In development (Vite dev server without Tauri), IPC calls will silently fail.
 */
export function useTheme() {
  const [currentTheme, setCurrentTheme] = createSignal<Theme>("dark");
  const [isUserExplicit, setIsUserExplicit] = createSignal(false);

  // Apply theme to the <html> element
  function applyTheme(theme: Theme) {
    const html = document.documentElement;
    html.classList.remove("dark", "light");
    html.classList.add(theme);
  }

  // Try to load theme from Tauri IPC, fallback to OS preference
  async function initTheme() {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const saved = await invoke<string | null>("load_preference", {
        key: "theme",
      });
      if (saved === "dark" || saved === "light") {
        setCurrentTheme(saved);
        setIsUserExplicit(true);
        applyTheme(saved);
        return;
      }
    } catch {
      // Not in Tauri context or IPC failed — use OS preference
    }

    // Fall back to OS preference
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const osTheme: Theme = prefersDark ? "dark" : "light";
    setCurrentTheme(osTheme);
    applyTheme(osTheme);
  }

  // Save theme preference via Tauri IPC
  async function saveTheme(theme: Theme) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("save_preference", { key: "theme", value: theme });
    } catch {
      // Silently fail in dev mode
    }
  }

  // Toggle between dark and light
  function toggle() {
    const newTheme: Theme = currentTheme() === "dark" ? "light" : "dark";
    setCurrentTheme(newTheme);
    setIsUserExplicit(true);
    applyTheme(newTheme);
    saveTheme(newTheme);
  }

  // Listen for OS dark mode changes
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  function handleOSChange(e: MediaQueryListEvent) {
    if (!isUserExplicit()) {
      const osTheme: Theme = e.matches ? "dark" : "light";
      setCurrentTheme(osTheme);
      applyTheme(osTheme);
    }
  }

  mediaQuery.addEventListener("change", handleOSChange);
  onCleanup(() => mediaQuery.removeEventListener("change", handleOSChange));

  // Sync class on theme signal changes
  createEffect(() => {
    applyTheme(currentTheme());
  });

  // Initialize on creation
  initTheme();

  return { currentTheme, isUserExplicit, toggle };
}
