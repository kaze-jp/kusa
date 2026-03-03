/**
 * DOM-based in-document search service for the preview pane.
 *
 * Uses TreeWalker to find text nodes matching the query, wraps matches
 * in <mark> elements, and provides navigation between matches.
 */

const HIGHLIGHT_CLASS = "search-highlight";
const CURRENT_HIGHLIGHT_CLASS = "search-highlight-current";

export interface SearchState {
  /** Total number of matches */
  total: number;
  /** Current match index (0-based), -1 if no matches */
  currentIndex: number;
}

/**
 * Clear all search highlights from the container.
 */
export function clearHighlights(container: HTMLElement): void {
  const marks = container.querySelectorAll(`mark.${HIGHLIGHT_CLASS}`);
  for (const mark of marks) {
    const parent = mark.parentNode;
    if (!parent) continue;
    // Replace the <mark> with its text content
    const text = document.createTextNode(mark.textContent ?? "");
    parent.replaceChild(text, mark);
    // Merge adjacent text nodes
    parent.normalize();
  }
}

/**
 * Find all text matches in the container and wrap them in <mark> elements.
 * Returns the total number of matches found.
 */
export function highlightMatches(
  container: HTMLElement,
  query: string
): number {
  clearHighlights(container);

  if (!query || query.length === 0) {
    return 0;
  }

  const lowerQuery = query.toLowerCase();
  const textNodes = collectTextNodes(container);
  let totalMatches = 0;

  // Process text nodes in reverse to avoid offset issues when modifying DOM
  for (let i = textNodes.length - 1; i >= 0; i--) {
    const node = textNodes[i];
    const text = node.textContent ?? "";
    const lowerText = text.toLowerCase();

    // Find all occurrences in this text node
    const ranges: Array<{ start: number; end: number }> = [];
    let searchPos = 0;

    while (searchPos < lowerText.length) {
      const index = lowerText.indexOf(lowerQuery, searchPos);
      if (index === -1) break;
      ranges.push({ start: index, end: index + query.length });
      searchPos = index + 1; // Allow overlapping matches
    }

    if (ranges.length === 0) continue;

    totalMatches += ranges.length;

    // Split text node and wrap matches in <mark> elements
    // Process ranges in reverse order to maintain offsets
    const parent = node.parentNode;
    if (!parent) continue;

    let currentNode: Text = node;

    for (let j = ranges.length - 1; j >= 0; j--) {
      const range = ranges[j];

      // Split after the match end
      if (range.end < currentNode.length) {
        currentNode.splitText(range.end);
      }

      // Split before the match start
      let matchNode: Text;
      if (range.start > 0) {
        matchNode = currentNode.splitText(range.start);
      } else {
        matchNode = currentNode;
      }

      // Wrap the match node in a <mark>
      const mark = document.createElement("mark");
      mark.className = HIGHLIGHT_CLASS;
      parent.replaceChild(mark, matchNode);
      mark.appendChild(matchNode);

      // For the next iteration (going backwards), work with the text before this match
      if (range.start > 0) {
        // currentNode is now the text before the match
        // it's already set correctly
      } else {
        // The match was at the start, find the previous text node sibling
        const prev = mark.previousSibling;
        if (prev && prev.nodeType === Node.TEXT_NODE) {
          currentNode = prev as Text;
        }
      }
    }
  }

  return totalMatches;
}

/**
 * Set the current active match by index.
 * Removes current highlight from previous match, adds it to new one,
 * and scrolls it into view.
 */
export function setCurrentMatch(
  container: HTMLElement,
  index: number
): void {
  const marks = container.querySelectorAll(`mark.${HIGHLIGHT_CLASS}`);

  // Remove current class from all
  for (const mark of marks) {
    mark.classList.remove(CURRENT_HIGHLIGHT_CLASS);
  }

  if (marks.length === 0 || index < 0 || index >= marks.length) {
    return;
  }

  const currentMark = marks[index];
  currentMark.classList.add(CURRENT_HIGHLIGHT_CLASS);

  // Scroll into view with some padding
  currentMark.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

/**
 * Get the count of all highlight marks in the container.
 */
export function getMatchCount(container: HTMLElement): number {
  return container.querySelectorAll(`mark.${HIGHLIGHT_CLASS}`).length;
}

/**
 * Navigate to the next match. Returns the new current index.
 */
export function navigateNext(
  container: HTMLElement,
  currentIndex: number
): number {
  const total = getMatchCount(container);
  if (total === 0) return -1;

  const nextIndex = (currentIndex + 1) % total;
  setCurrentMatch(container, nextIndex);
  return nextIndex;
}

/**
 * Navigate to the previous match. Returns the new current index.
 */
export function navigatePrev(
  container: HTMLElement,
  currentIndex: number
): number {
  const total = getMatchCount(container);
  if (total === 0) return -1;

  const prevIndex = (currentIndex - 1 + total) % total;
  setCurrentMatch(container, prevIndex);
  return prevIndex;
}

/**
 * Collect all text nodes within the container, skipping <mark> ancestor check
 * (since we clear highlights before searching).
 * Also skips code-lang-label and code-copy-btn elements to avoid
 * highlighting UI elements.
 */
function collectTextNodes(root: HTMLElement): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node: Node): number {
      // Skip text inside code-copy-btn and code-lang-label
      let parent = node.parentElement;
      while (parent && parent !== root) {
        if (
          parent.classList.contains("code-copy-btn") ||
          parent.classList.contains("code-lang-label")
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        parent = parent.parentElement;
      }
      // Skip empty/whitespace-only nodes
      if (!node.textContent || node.textContent.length === 0) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Text);
  }

  return nodes;
}
