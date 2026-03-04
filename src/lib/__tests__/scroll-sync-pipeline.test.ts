import { describe, it, expect } from "vitest";
import { processMarkdown } from "../markdown";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import type { Root, Element, ElementContent } from "hast";

function visitHast(node: Root | Element, fn: (el: Element) => void) {
  const children: ElementContent[] = "children" in node ? (node.children as ElementContent[]) : [];
  for (const child of children) {
    if (child.type === "element") {
      fn(child);
      visitHast(child, fn);
    }
  }
}

describe("scroll-sync pipeline", () => {
  const md = `# Hello

This is a paragraph.

## Second heading

Another paragraph here.

- list item 1
- list item 2
`;

  it("remarkRehype should preserve position info on hAST elements", () => {
    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype, { allowDangerousHtml: false });

    const tree = processor.runSync(processor.parse(md)) as Root;

    const positions: { tag: string; line: number | undefined }[] = [];
    visitHast(tree, (node) => {
      positions.push({
        tag: node.tagName,
        line: node.position?.start?.line,
      });
    });

    console.log("Position info after remarkRehype:", JSON.stringify(positions, null, 2));

    // Headings and paragraphs should have position
    const h1 = positions.find((p) => p.tag === "h1");
    expect(h1?.line).toBeDefined();
    expect(h1?.line).toBe(1);

    const p = positions.find((p) => p.tag === "p");
    expect(p?.line).toBeDefined();
  });

  it("processMarkdown should produce HTML with data-source-line attributes", async () => {
    const html = await processMarkdown(md);

    console.log("=== Full HTML output ===");
    console.log(html);
    console.log("=== End ===");

    expect(html).toContain("data-source-line");
  });

  it("should have correct line numbers on headings and paragraphs", async () => {
    const simpleMd = `# Line 1 heading

Paragraph on line 3.

## Line 5 heading
`;
    const html = await processMarkdown(simpleMd);
    console.log("=== Line number HTML ===");
    console.log(html);

    expect(html).toMatch(/data-source-line="1"/);
    expect(html).toMatch(/data-source-line="3"/);
    expect(html).toMatch(/data-source-line="5"/);
  });
});
