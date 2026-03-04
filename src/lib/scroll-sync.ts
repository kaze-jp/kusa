/**
 * Scroll sync: synchronise CodeMirror cursor position → Preview scroll.
 *
 * Uses `data-source-line` attributes on block elements to map editor lines
 * to preview DOM nodes, then scrolls the matching element into view.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScrollSyncConfig {
  getPreviewContainer: () => HTMLElement | null;
  debounceMs?: number; // default: 80
}

export interface ScrollSyncInstance {
  /** Scroll preview to the element matching the given source line. */
  syncToLine(line: number): void;
  /** Return the source line closest to the current preview scroll position. */
  getLineFromScroll(): number | null;
  destroy(): void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface LineElement {
  line: number;
  el: HTMLElement;
}

/** Collect all [data-source-line] elements, sorted by line number. */
function collectLineElements(container: HTMLElement): LineElement[] {
  const nodes = container.querySelectorAll<HTMLElement>("[data-source-line]");
  const items: LineElement[] = [];
  for (const el of nodes) {
    const v = el.getAttribute("data-source-line");
    if (v) {
      const line = parseInt(v, 10);
      if (!Number.isNaN(line)) items.push({ line, el });
    }
  }
  // Should already be in document order ≈ line order, but sort to be safe
  items.sort((a, b) => a.line - b.line);
  return items;
}

/**
 * Binary-search for the element whose source line is ≤ target line.
 * Returns the closest match (floor).
 */
function findClosest(items: LineElement[], targetLine: number): LineElement | null {
  if (items.length === 0) return null;

  let lo = 0;
  let hi = items.length - 1;
  let best: LineElement | null = null;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (items[mid].line <= targetLine) {
      best = items[mid];
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return best;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createScrollSync(config: ScrollSyncConfig): ScrollSyncInstance {
  const debounceMs = config.debounceMs ?? 80;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;
  let lastSyncedLine = -1;

  // --- Public ---

  function syncToLine(line: number) {
    if (destroyed) return;
    // Skip if same line (avoid redundant scrolls)
    if (line === lastSyncedLine) return;
    lastSyncedLine = line;

    // Debounce
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      doSync(line);
    }, debounceMs);
  }

  function getLineFromScroll(): number | null {
    const container = config.getPreviewContainer();
    if (!container) return null;

    const items = collectLineElements(container);
    if (items.length === 0) return null;

    const containerRect = container.getBoundingClientRect();

    // Find the element closest to the top of the visible area
    let best: LineElement | null = null;
    let bestDist = Infinity;

    for (const item of items) {
      const rect = item.el.getBoundingClientRect();
      // Distance from element top to container top
      const dist = Math.abs(rect.top - containerRect.top);
      if (dist < bestDist) {
        bestDist = dist;
        best = item;
      }
      // Once elements are well below the viewport, stop searching
      if (rect.top > containerRect.bottom) break;
    }

    return best?.line ?? null;
  }

  function destroy() {
    destroyed = true;
    if (timer !== null) clearTimeout(timer);
  }

  // --- Internal ---

  function doSync(line: number) {
    if (destroyed) return;
    const container = config.getPreviewContainer();
    if (!container) return;

    const items = collectLineElements(container);
    const match = findClosest(items, line);
    if (!match) return;

    // Scroll the element into view within the preview container
    const containerRect = container.getBoundingClientRect();
    const elRect = match.el.getBoundingClientRect();
    const offset = elRect.top - containerRect.top;
    const center = container.clientHeight / 3; // aim for upper-third

    container.scrollTo({
      top: container.scrollTop + offset - center,
      behavior: "instant",
    });
  }

  return { syncToLine, getLineFromScroll, destroy };
}
