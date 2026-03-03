import { invoke } from "@tauri-apps/api/core";
import type { InputContent, CliArgs } from "./types";
import {
  isGitHubShorthand,
  isGitHubUrl,
  isUrl,
  parseGitHubShorthand,
  parseGitHubUrl,
} from "./github";

/**
 * Resolve the input source based on CLI arguments and stdin state.
 *
 * Priority order:
 * 1. stdin pipe (always checked first)
 * 2. --clipboard flag
 * 3. CLI argument: gh: shorthand
 * 4. CLI argument: GitHub URL (github.com)
 * 5. CLI argument: generic URL (http/https)
 * 6. CLI argument: local file path (delegated to existing instant-read flow)
 * 7. No input -> null (fallback to file list)
 *
 * Returns InputContent for non-file sources, or null to delegate to existing flow.
 */
export async function resolveInputSource(
  cliArgs: CliArgs,
): Promise<InputContent | null> {
  // 1. Check stdin pipe
  try {
    const stdinContent = await invoke<InputContent | null>("read_stdin");
    if (stdinContent) {
      return stdinContent;
    }
  } catch {
    // stdin read failed - continue to next source
  }

  // 2. Check --clipboard flag
  if (cliArgs.clipboard) {
    // This will throw on error (empty clipboard, etc.)
    return await invoke<InputContent>("read_clipboard");
  }

  // 3-5. Check CLI file argument for gh:/URL patterns
  const fileArg = cliArgs.file;
  if (fileArg) {
    // 3. gh: shorthand
    if (isGitHubShorthand(fileArg)) {
      const target = parseGitHubShorthand(fileArg);
      if (!target) {
        throw new Error(
          "GitHub shorthand の形式が不正です。正しい形式: gh:owner/repo/path",
        );
      }
      return await invoke<InputContent>("fetch_url", {
        url: target.apiUrl,
        isGithubApi: true,
        title: target.displayTitle,
      });
    }

    // 4. GitHub URL
    if (isGitHubUrl(fileArg)) {
      const target = parseGitHubUrl(fileArg);
      if (!target) {
        throw new Error(
          "GitHub URL の形式が不正です。対応形式: https://github.com/owner/repo/blob/branch/path",
        );
      }
      return await invoke<InputContent>("fetch_url", {
        url: target.apiUrl,
        isGithubApi: true,
        title: target.displayTitle,
      });
    }

    // 5. Generic URL
    if (isUrl(fileArg)) {
      return await invoke<InputContent>("fetch_url", {
        url: fileArg,
        isGithubApi: false,
        title: fileArg,
      });
    }

    // 6. Local file path - return null to let existing flow handle it
    return null;
  }

  // 7. No input - return null for file list fallback
  return null;
}
