/** Parsed GitHub target with API URL */
export interface GitHubTarget {
  owner: string;
  repo: string;
  path: string;
  branch?: string;
  apiUrl: string;
  displayTitle: string;
  /**
   * For blob/tree URLs, the raw segments after blob/tree joined as a path.
   * Useful for fallback: if the initial API call with the inferred branch
   * fails (e.g., 404 due to slash-containing branch name), the caller can
   * retry with the full rawPathWithRef as the path without a ref parameter.
   */
  rawPathWithRef?: string;
}

/**
 * Check if an input string is a gh: shorthand.
 * Format: gh:owner/repo or gh:owner/repo/path/to/file.md
 */
export function isGitHubShorthand(input: string): boolean {
  return input.startsWith("gh:");
}

/**
 * Check if a URL is a GitHub web URL (github.com).
 */
export function isGitHubUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "github.com";
  } catch {
    return false;
  }
}

/**
 * Check if a string is any URL (http/https).
 */
export function isUrl(input: string): boolean {
  return input.startsWith("http://") || input.startsWith("https://");
}

/**
 * Parse a gh: shorthand into a GitHubTarget.
 *
 * Examples:
 *   gh:owner/repo -> README.md
 *   gh:owner/repo/path/to/file.md -> path/to/file.md
 *
 * Returns null if the format is invalid.
 */
export function parseGitHubShorthand(input: string): GitHubTarget | null {
  if (!isGitHubShorthand(input)) {
    return null;
  }

  const rest = input.slice(3); // Remove "gh:"
  if (!rest || rest.startsWith("/")) {
    return null;
  }

  const parts = rest.split("/");
  if (parts.length < 2) {
    return null; // Need at least owner/repo
  }

  const owner = parts[0];
  const repo = parts[1];

  if (!owner || !repo) {
    return null;
  }

  // Everything after owner/repo is the path
  const path = parts.length > 2 ? parts.slice(2).join("/") : "README.md";

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const displayTitle = `gh:${owner}/${repo}/${path}`;

  return {
    owner,
    repo,
    path,
    apiUrl,
    displayTitle,
  };
}

/**
 * Infer where the branch name ends and the file path begins
 * in the segments after "blob/" or "tree/" in a GitHub URL.
 *
 * GitHub branch names can contain slashes (e.g., "feature/x"),
 * making URL parsing ambiguous without an API call. We use a
 * best-effort heuristic: treat the first segment as the branch
 * name and everything else as the file path. This works for the
 * most common branch names (main, master, develop, v1.0, etc.).
 *
 * For slash-containing branches, callers should fall back to the
 * GitHub API with the full remaining path if the initial ref fails.
 *
 * Returns { branch, filePath }.
 */
function inferBranchAndPath(segments: string[]): {
  branch: string;
  filePath: string;
} {
  if (segments.length === 0) {
    return { branch: "", filePath: "" };
  }
  if (segments.length === 1) {
    return { branch: segments[0], filePath: "README.md" };
  }

  // Default: first segment is the branch, rest is the file path.
  // This handles the most common case (main, master, develop, etc.)
  return {
    branch: segments[0],
    filePath: segments.slice(1).join("/"),
  };
}

/**
 * Parse a GitHub web URL into a GitHubTarget.
 *
 * Supported formats:
 *   https://github.com/owner/repo/blob/branch/path/to/file.md
 *   https://github.com/owner/repo/blob/feature/x/docs/readme.md (slash in branch)
 *   https://github.com/owner/repo (-> README.md)
 *
 * Returns null if the URL is not a valid GitHub URL.
 */
export function parseGitHubUrl(url: string): GitHubTarget | null {
  if (!isGitHubUrl(url)) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split("/").filter(Boolean);

    if (pathParts.length < 2) {
      return null; // Need at least owner/repo
    }

    const owner = pathParts[0];
    const repo = pathParts[1];

    if (!owner || !repo) {
      return null;
    }

    // https://github.com/owner/repo (no path)
    if (pathParts.length === 2) {
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/README.md`;
      return {
        owner,
        repo,
        path: "README.md",
        apiUrl,
        displayTitle: `gh:${owner}/${repo}/README.md`,
      };
    }

    // https://github.com/owner/repo/blob/<branch>/<path>...
    if (
      pathParts.length >= 4 &&
      (pathParts[2] === "blob" || pathParts[2] === "tree")
    ) {
      // Everything after blob/tree is branch + file path, which may be ambiguous
      // when the branch name contains slashes (e.g., "feature/x").
      const afterBlobOrTree = pathParts.slice(3);
      const rawPathWithRef = afterBlobOrTree.join("/");
      const { branch, filePath } = inferBranchAndPath(afterBlobOrTree);

      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
      return {
        owner,
        repo,
        path: filePath,
        branch,
        apiUrl,
        displayTitle: `gh:${owner}/${repo}/${filePath}`,
        rawPathWithRef,
      };
    }

    return null;
  } catch {
    return null;
  }
}
