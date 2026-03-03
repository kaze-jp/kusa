import { describe, it, expect } from "vitest";
import { processMarkdown, isMarkdownFile, extractHeadings } from "./markdown";

describe("processMarkdown", () => {
  it("renders headings with id attributes", async () => {
    const html = await processMarkdown("# Hello\n## World");
    expect(html).toContain('<h1 id="hello">Hello</h1>');
    expect(html).toContain('<h2 id="world">World</h2>');
  });

  it("renders paragraphs", async () => {
    const html = await processMarkdown("Hello world");
    expect(html).toContain("<p>Hello world</p>");
  });

  it("renders lists", async () => {
    const html = await processMarkdown("- item 1\n- item 2");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>item 1</li>");
    expect(html).toContain("<li>item 2</li>");
  });

  it("renders blockquotes", async () => {
    const html = await processMarkdown("> quoted text");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("quoted text");
  });

  it("renders links", async () => {
    const html = await processMarkdown("[link](https://example.com)");
    expect(html).toContain('<a href="https://example.com"');
    expect(html).toContain("link</a>");
  });

  it("renders images", async () => {
    const html = await processMarkdown("![alt](https://example.com/img.png)");
    expect(html).toContain('<img src="https://example.com/img.png"');
    expect(html).toContain('alt="alt"');
  });

  it("renders code blocks with syntax highlighting", async () => {
    const html = await processMarkdown("```js\nconsole.log('hi')\n```");
    expect(html).toContain("<pre");
    expect(html).toContain("<code");
    expect(html).toContain("console.");
    expect(html).toContain("log");
    // rehype-pretty-code wraps tokens in styled spans
    expect(html).toContain("style=");
  });

  it("renders inline code", async () => {
    const html = await processMarkdown("Use `npm install`");
    expect(html).toContain("<code>npm install</code>");
  });

  // GFM extensions
  it("renders GFM tables", async () => {
    const md = "| a | b |\n|---|---|\n| 1 | 2 |";
    const html = await processMarkdown(md);
    expect(html).toContain("<table>");
    expect(html).toContain("<th>a</th>");
    expect(html).toContain("<td>1</td>");
  });

  it("renders GFM checklists", async () => {
    const md = "- [x] done\n- [ ] todo";
    const html = await processMarkdown(md);
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("done");
    expect(html).toContain("todo");
  });

  it("renders GFM strikethrough", async () => {
    const html = await processMarkdown("~~deleted~~");
    expect(html).toContain("<del>deleted</del>");
  });

  it("renders GFM footnotes", async () => {
    const md = "Text[^1]\n\n[^1]: Footnote content";
    const html = await processMarkdown(md);
    expect(html).toContain("Footnote content");
  });

  // Security
  it("sanitizes dangerous HTML", async () => {
    const html = await processMarkdown('<script>alert("xss")</script>');
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("alert");
  });

  it("strips onclick handlers", async () => {
    const html = await processMarkdown('<div onclick="alert(1)">test</div>');
    expect(html).not.toContain("onclick");
  });

  // Syntax highlighting
  it("applies syntax highlighting to code blocks", async () => {
    const html = await processMarkdown("```js\nconst x = 1;\n```");
    expect(html).toContain("<pre");
    expect(html).toContain("<code");
    expect(html).toContain("const");
  });

  it("highlights TypeScript code", async () => {
    const html = await processMarkdown(
      "```ts\ninterface User { name: string; }\n```",
    );
    expect(html).toContain("<pre");
    expect(html).toContain("interface");
  });

  it("highlights Rust code", async () => {
    const html = await processMarkdown("```rust\nfn main() {}\n```");
    expect(html).toContain("<pre");
    expect(html).toContain("main");
  });

  it("highlights Python code", async () => {
    const html = await processMarkdown("```python\ndef hello():\n    pass\n```");
    expect(html).toContain("<pre");
    expect(html).toContain("hello");
  });

  it("handles code blocks without language", async () => {
    const html = await processMarkdown("```\nplain code\n```");
    expect(html).toContain("<pre");
    expect(html).toContain("plain code");
  });

  // External links
  it("adds target and rel to external links", async () => {
    const html = await processMarkdown("[ext](https://example.com)");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  // rehype-slug integration
  it("adds id attributes to headings via rehype-slug", async () => {
    const html = await processMarkdown("# Getting Started\n## Installation Guide");
    expect(html).toContain('id="getting-started"');
    expect(html).toContain('id="installation-guide"');
  });

  it("handles duplicate heading IDs", async () => {
    const html = await processMarkdown("# Foo\n## Foo\n### Foo");
    expect(html).toContain('id="foo"');
    expect(html).toContain('id="foo-1"');
    expect(html).toContain('id="foo-2"');
  });
});

describe("extractHeadings", () => {
  it("extracts h1-h6 headings", () => {
    const md = "# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6";
    const headings = extractHeadings(md);
    expect(headings).toHaveLength(6);
    expect(headings[0]).toEqual({ id: "h1", text: "H1", level: 1, index: 0 });
    expect(headings[1]).toEqual({ id: "h2", text: "H2", level: 2, index: 1 });
    expect(headings[2]).toEqual({ id: "h3", text: "H3", level: 3, index: 2 });
    expect(headings[3]).toEqual({ id: "h4", text: "H4", level: 4, index: 3 });
    expect(headings[4]).toEqual({ id: "h5", text: "H5", level: 5, index: 4 });
    expect(headings[5]).toEqual({ id: "h6", text: "H6", level: 6, index: 5 });
  });

  it("returns empty array for document with no headings", () => {
    const md = "Just a paragraph\n\nAnother one.";
    const headings = extractHeadings(md);
    expect(headings).toHaveLength(0);
  });

  it("returns empty array for empty string", () => {
    expect(extractHeadings("")).toHaveLength(0);
  });

  it("extracts text from headings with inline formatting", () => {
    const md = "# **Bold** heading\n## *Italic* heading\n### `Code` heading";
    const headings = extractHeadings(md);
    expect(headings[0].text).toBe("Bold heading");
    expect(headings[1].text).toBe("Italic heading");
    expect(headings[2].text).toBe("Code heading");
  });

  it("extracts text from headings with links", () => {
    const md = "# [Linked](https://example.com) heading";
    const headings = extractHeadings(md);
    expect(headings[0].text).toBe("Linked heading");
  });

  it("handles duplicate heading texts with incremented IDs", () => {
    const md = "# Setup\n## Setup\n## Setup";
    const headings = extractHeadings(md);
    expect(headings[0].id).toBe("setup");
    expect(headings[1].id).toBe("setup-1");
    expect(headings[2].id).toBe("setup-2");
  });

  it("generates slugs with hyphens for spaces", () => {
    const md = "# Getting Started Guide";
    const headings = extractHeadings(md);
    expect(headings[0].id).toBe("getting-started-guide");
  });

  it("handles special characters in headings", () => {
    const md = "# What's New?\n## C++ Guide";
    const headings = extractHeadings(md);
    expect(headings[0].id).toBe("whats-new");
    expect(headings[1].id).toBe("c-guide");
  });

  it("handles Japanese headings", () => {
    const md = "# はじめに\n## インストール";
    const headings = extractHeadings(md);
    expect(headings[0].id).toBe("はじめに");
    expect(headings[1].id).toBe("インストール");
  });

  it("preserves document order via index", () => {
    const md = "# First\nSome text\n## Second\nMore text\n### Third";
    const headings = extractHeadings(md);
    expect(headings[0].index).toBe(0);
    expect(headings[1].index).toBe(1);
    expect(headings[2].index).toBe(2);
  });
});

describe("isMarkdownFile", () => {
  it("returns true for .md files", () => {
    expect(isMarkdownFile("readme.md")).toBe(true);
  });

  it("returns true for .markdown files", () => {
    expect(isMarkdownFile("notes.markdown")).toBe(true);
  });

  it("returns true for .mdx files", () => {
    expect(isMarkdownFile("page.mdx")).toBe(true);
  });

  it("returns false for non-markdown files", () => {
    expect(isMarkdownFile("code.ts")).toBe(false);
    expect(isMarkdownFile("style.css")).toBe(false);
    expect(isMarkdownFile("data.json")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isMarkdownFile("README.MD")).toBe(true);
  });
});
