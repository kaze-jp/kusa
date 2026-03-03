import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Test the key sequence logic of Vim navigation.
 * Since useVimNav depends on SolidJS signals and DOM, we test
 * the sequence parsing logic in isolation.
 */

interface KeySequenceResult {
  action: string | null;
}

/**
 * Minimal key sequence parser that mirrors useVimNav logic.
 * Used for unit testing without SolidJS/DOM dependencies.
 */
function parseKeySequence(keys: string[]): KeySequenceResult {
  if (keys.length === 0) return { action: null };

  // Single key: G
  if (keys.length === 1 && keys[0] === "G") {
    return { action: "scrollToBottom" };
  }

  // Two-key sequences
  if (keys.length === 2) {
    const seq = keys.join("");
    switch (seq) {
      case "gg":
        return { action: "scrollToTop" };
      case "gd":
        return { action: "openPicker" };
      case "]]":
        return { action: "jumpToNextHeading" };
      case "[[":
        return { action: "jumpToPrevHeading" };
    }
  }

  return { action: null };
}

describe("Vim key sequence parsing", () => {
  it("recognizes G for scroll to bottom", () => {
    expect(parseKeySequence(["G"])).toEqual({ action: "scrollToBottom" });
  });

  it("recognizes gg for scroll to top", () => {
    expect(parseKeySequence(["g", "g"])).toEqual({ action: "scrollToTop" });
  });

  it("recognizes gd for heading picker", () => {
    expect(parseKeySequence(["g", "d"])).toEqual({ action: "openPicker" });
  });

  it("recognizes ]] for next heading", () => {
    expect(parseKeySequence(["]", "]"])).toEqual({
      action: "jumpToNextHeading",
    });
  });

  it("recognizes [[ for previous heading", () => {
    expect(parseKeySequence(["[", "["])).toEqual({
      action: "jumpToPrevHeading",
    });
  });

  it("returns null for unknown single key", () => {
    expect(parseKeySequence(["a"])).toEqual({ action: null });
  });

  it("returns null for unknown sequence", () => {
    expect(parseKeySequence(["g", "x"])).toEqual({ action: null });
  });

  it("returns null for mixed bracket sequence", () => {
    expect(parseKeySequence(["]", "["])).toEqual({ action: null });
    expect(parseKeySequence(["[", "]"])).toEqual({ action: null });
  });

  it("returns null for empty key array", () => {
    expect(parseKeySequence([])).toEqual({ action: null });
  });

  it("distinguishes G from g", () => {
    expect(parseKeySequence(["G"])).toEqual({ action: "scrollToBottom" });
    // Single 'g' is not a complete action (it's a prefix)
    expect(parseKeySequence(["g"])).toEqual({ action: null });
  });
});

describe("Heading navigation logic", () => {
  const headings = [
    { id: "h1", text: "First", level: 1, index: 0 },
    { id: "h2", text: "Second", level: 2, index: 1 },
    { id: "h3", text: "Third", level: 2, index: 2 },
    { id: "h4", text: "Fourth", level: 3, index: 3 },
  ];

  function findNextHeading(
    currentId: string | null,
    items: typeof headings
  ): string | null {
    if (items.length === 0) return null;
    const idx = items.findIndex((h) => h.id === currentId);
    if (idx < items.length - 1) return items[idx + 1].id;
    return items[idx]?.id ?? null;
  }

  function findPrevHeading(
    currentId: string | null,
    items: typeof headings
  ): string | null {
    if (items.length === 0) return null;
    const idx = items.findIndex((h) => h.id === currentId);
    if (idx > 0) return items[idx - 1].id;
    return items[0]?.id ?? null;
  }

  it("finds next heading from current position", () => {
    expect(findNextHeading("h1", headings)).toBe("h2");
    expect(findNextHeading("h2", headings)).toBe("h3");
    expect(findNextHeading("h3", headings)).toBe("h4");
  });

  it("stays at last heading when at end", () => {
    expect(findNextHeading("h4", headings)).toBe("h4");
  });

  it("finds previous heading from current position", () => {
    expect(findPrevHeading("h4", headings)).toBe("h3");
    expect(findPrevHeading("h3", headings)).toBe("h2");
    expect(findPrevHeading("h2", headings)).toBe("h1");
  });

  it("stays at first heading when at start", () => {
    expect(findPrevHeading("h1", headings)).toBe("h1");
  });

  it("returns null for empty headings list", () => {
    expect(findNextHeading("h1", [])).toBe(null);
    expect(findPrevHeading("h1", [])).toBe(null);
  });
});
