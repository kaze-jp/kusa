import { describe, it, expect } from "vitest";
import { processMarkdown, isMarkdownFile } from "./markdown";

describe("processMarkdown", () => {
  it("renders headings", async () => {
    const html = await processMarkdown("# Hello\n## World");
    expect(html).toContain("<h1>Hello</h1>");
    expect(html).toContain("<h2>World</h2>");
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
