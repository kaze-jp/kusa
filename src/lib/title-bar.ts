import { getCurrentWindow } from "@tauri-apps/api/window";
import type { InputContent } from "./types";

/**
 * Format the window title based on input content.
 * Returns "kusa - {title}" for all sources.
 */
export function formatWindowTitle(content: InputContent): string {
  return `kusa - ${content.title}`;
}

/**
 * Update the native window title based on the current input content.
 * Uses the Tauri Window API to set the title.
 */
export async function updateWindowTitle(content: InputContent): Promise<void> {
  const title = formatWindowTitle(content);
  await getCurrentWindow().setTitle(title);
}
