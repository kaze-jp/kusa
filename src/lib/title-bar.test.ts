import { describe, it, expect } from "vitest";
import { formatWindowTitle } from "./title-bar";
import type { InputContent } from "./types";

describe("formatWindowTitle", () => {
  it("formats stdin title", () => {
    const content: InputContent = {
      source: "stdin",
      content: "# Hello",
      title: "(stdin)",
      filePath: null,
    };
    expect(formatWindowTitle(content)).toBe("kusa - (stdin)");
  });

  it("formats clipboard title", () => {
    const content: InputContent = {
      source: "clipboard",
      content: "# Hello",
      title: "(clipboard)",
      filePath: null,
    };
    expect(formatWindowTitle(content)).toBe("kusa - (clipboard)");
  });

  it("formats github title", () => {
    const content: InputContent = {
      source: "github",
      content: "# Hello",
      title: "gh:owner/repo/README.md",
      filePath: null,
    };
    expect(formatWindowTitle(content)).toBe("kusa - gh:owner/repo/README.md");
  });

  it("formats url title", () => {
    const content: InputContent = {
      source: "url",
      content: "# Hello",
      title: "https://example.com/file.md",
      filePath: null,
    };
    expect(formatWindowTitle(content)).toBe(
      "kusa - https://example.com/file.md",
    );
  });

  it("formats file title", () => {
    const content: InputContent = {
      source: "file",
      content: "# Hello",
      title: "test.md",
      filePath: "/path/to/test.md",
    };
    expect(formatWindowTitle(content)).toBe("kusa - test.md");
  });
});
