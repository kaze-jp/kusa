/**
 * rehype plugin: add data-source-line attributes to block-level elements.
 *
 * Each block element (h1-h6, p, ul, ol, li, pre, blockquote, table, hr, div)
 * gets a `data-source-line` attribute set to its start line in the original
 * Markdown source. This enables editor ↔ preview scroll synchronisation.
 */

import type { Root, Element, ElementContent } from "hast";
import type { Plugin } from "unified";

const BLOCK_TAGS = new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "ul",
  "ol",
  "li",
  "pre",
  "blockquote",
  "table",
  "hr",
  "div",
]);

function visit(node: Root | Element, fn: (el: Element) => void) {
  const children: ElementContent[] =
    "children" in node ? (node.children as ElementContent[]) : [];
  for (const child of children) {
    if (child.type === "element") {
      fn(child);
      visit(child, fn);
    }
  }
}

const rehypeSourceLines: Plugin<[], Root> = () => {
  return (tree: Root) => {
    visit(tree, (node: Element) => {
      if (BLOCK_TAGS.has(node.tagName) && node.position?.start?.line) {
        node.properties = node.properties || {};
        node.properties["dataSourceLine"] = node.position.start.line;
      }
    });
  };
};

export default rehypeSourceLines;
