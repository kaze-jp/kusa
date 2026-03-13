/**
 * Tab label resolver: computes smart display labels for tabs.
 *
 * When multiple tabs share the same file name, adds the minimum
 * directory prefix needed to distinguish them (VS Code style).
 */

import type { Tab } from "./tabStore";

export interface TabLabel {
  /** Directory prefix (e.g. "src/components"). Empty string if not needed. */
  prefix: string;
  /** File name (e.g. "README.md") */
  fileName: string;
}

/**
 * Compute display labels for all tabs.
 * Tabs with duplicate fileNames get a minimal directory prefix for disambiguation.
 */
export function computeTabLabels(tabs: Tab[]): Map<string, TabLabel> {
  const result = new Map<string, TabLabel>();

  // Separate file tabs from special tabs (untitled, clipboard, empty path)
  const fileTabs: Tab[] = [];
  for (const tab of tabs) {
    if (tab.isUntitled || !tab.filePath) {
      result.set(tab.id, { prefix: "", fileName: tab.fileName });
    } else {
      fileTabs.push(tab);
    }
  }

  // Group file tabs by fileName
  const groups = new Map<string, Tab[]>();
  for (const tab of fileTabs) {
    const existing = groups.get(tab.fileName);
    if (existing) {
      existing.push(tab);
    } else {
      groups.set(tab.fileName, [tab]);
    }
  }

  for (const [, group] of groups) {
    if (group.length === 1) {
      result.set(group[0].id, { prefix: "", fileName: group[0].fileName });
      continue;
    }

    // Need disambiguation: compute minimum prefix depth
    const segments = group.map((tab) => {
      const parts = tab.filePath.split("/");
      // Remove empty first element (leading /) and fileName (last element)
      parts.pop(); // fileName
      if (parts[0] === "") parts.shift(); // leading /
      return parts;
    });

    // Track which tabs still need more depth
    const depths = new Array<number>(group.length).fill(1);
    let resolved = false;

    while (!resolved) {
      // Build prefixes at current depths
      const prefixes = segments.map((parts, i) => {
        const depth = depths[i];
        return parts.slice(-depth).join("/");
      });

      // Check for duplicates among unresolved tabs
      resolved = true;
      const seen = new Map<string, number[]>();
      for (let i = 0; i < prefixes.length; i++) {
        const p = prefixes[i];
        const indices = seen.get(p);
        if (indices) {
          indices.push(i);
        } else {
          seen.set(p, [i]);
        }
      }

      for (const [, indices] of seen) {
        if (indices.length > 1) {
          // Still ambiguous — increase depth for these tabs only
          for (const i of indices) {
            if (depths[i] < segments[i].length) {
              depths[i]++;
              resolved = false;
            }
          }
        }
      }

      // Safety: if we can't resolve further (all segments exhausted), stop
      if (!resolved && depths.every((d, i) => d >= segments[i].length)) {
        break;
      }
    }

    // Set results
    for (let i = 0; i < group.length; i++) {
      const depth = depths[i];
      const prefix = segments[i].slice(-depth).join("/");
      result.set(group[i].id, { prefix, fileName: group[i].fileName });
    }
  }

  return result;
}
