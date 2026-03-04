import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeExternalLinks from "rehype-external-links";
import rehypeSlug from "rehype-slug";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import rehypeSourceLines from "./rehype-source-lines";
import type { Root as MdastRoot, Heading, PhrasingContent } from "mdast";

// --- Types ---

export interface HeadingInfo {
  /** rehype-slug compatible ID */
  id: string;
  /** Heading text content */
  text: string;
  /** Heading level 1-6 */
  level: number;
  /** Document order index */
  index: number;
}

// --- Sanitize schema ---

type Schema = NonNullable<Parameters<typeof rehypeSanitize>[0]>;

const sanitizeSchema: Schema = {
  ...defaultSchema,
  // Disable the user-content- prefix that rehype-sanitize adds to IDs
  clobberPrefix: "",
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      ["target"],
      ["rel"],
    ],
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ["className", /^language-./],
      ["style"],
    ],
    span: [
      ...(defaultSchema.attributes?.span ?? []),
      ["className", /^(hljs|shiki|line)/],
      ["style"],
    ],
    pre: [
      ...(defaultSchema.attributes?.pre ?? []),
      ["className"],
      ["style"],
    ],
    // Allow data-source-line on all block elements for scroll sync
    "*": [
      ...(defaultSchema.attributes?.["*"] ?? []),
      "dataSourceLine",
    ],
    // Allow id on headings for rehype-slug
    h1: [["id"]],
    h2: [["id"]],
    h3: [["id"]],
    h4: [["id"]],
    h5: [["id"]],
    h6: [["id"]],
  },
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "input", // for checkboxes
  ],
};

// --- Pipeline ---

const baseProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypePrettyCode, {
    theme: "github-dark",
    keepBackground: true,
  })
  .use(rehypeSlug)
  .use(rehypeExternalLinks, {
    target: "_blank",
    rel: ["noopener", "noreferrer"],
  })
  .use(rehypeSourceLines)
  .use(rehypeSanitize, sanitizeSchema)
  .use(rehypeStringify);

const LARGE_FILE_THRESHOLD = 1024 * 1024; // 1MB

export async function processMarkdown(markdown: string): Promise<string> {
  const result = await baseProcessor.process(markdown);
  return String(result);
}

export function isLargeFile(content: string): boolean {
  return content.length >= LARGE_FILE_THRESHOLD;
}

export async function processMarkdownChunked(
  markdown: string,
  onChunk: (html: string) => void,
): Promise<void> {
  // Split by double newline to get logical sections
  const sections = markdown.split(/\n\n/);
  const chunkSize = Math.ceil(sections.length / 4);

  let accumulated = "";
  for (let i = 0; i < sections.length; i += chunkSize) {
    const chunk = sections.slice(i, i + chunkSize).join("\n\n");
    accumulated += (accumulated ? "\n\n" : "") + chunk;
    const html = await processMarkdown(accumulated);
    onChunk(html);
  }
}

// --- Heading Extraction ---

/**
 * Extract heading text from mdast phrasing content nodes.
 * Handles nested inline elements (bold, italic, code, links, etc.)
 */
function extractText(nodes: PhrasingContent[]): string {
  return nodes
    .map((node) => {
      if (node.type === "text") return node.value;
      if (node.type === "inlineCode") return node.value;
      if ("children" in node) {
        return extractText(node.children as PhrasingContent[]);
      }
      return "";
    })
    .join("");
}

/**
 * Generate a slug from heading text, matching rehype-slug's algorithm (github-slugger).
 * - Lowercase
 * - Replace spaces with hyphens
 * - Remove non-alphanumeric characters (except hyphens)
 * - Handle duplicates by appending -1, -2, etc.
 */
function generateSlug(text: string, existing: Map<string, number>): string {
  let slug = text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}\-_]/gu, "")
    .replace(/--+/g, "-")
    .replace(/^-|-$/g, "");

  if (!slug) slug = "heading";

  const count = existing.get(slug) ?? 0;
  existing.set(slug, count + 1);

  if (count > 0) {
    slug = `${slug}-${count}`;
  }

  return slug;
}

const mdastParser = unified().use(remarkParse).use(remarkGfm);

/**
 * Extract heading information from a Markdown string.
 * The IDs generated match what rehype-slug produces.
 */
export function extractHeadings(markdown: string): HeadingInfo[] {
  const tree = mdastParser.parse(markdown) as MdastRoot;
  const headings: HeadingInfo[] = [];
  const slugCounts = new Map<string, number>();
  let index = 0;

  for (const node of tree.children) {
    if (node.type === "heading") {
      const heading = node as Heading;
      const text = extractText(heading.children);
      const id = generateSlug(text, slugCounts);
      headings.push({
        id,
        text,
        level: heading.depth,
        index: index++,
      });
    }
  }

  return headings;
}

// --- Utilities ---

export function isMarkdownFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return ext === "md" || ext === "markdown" || ext === "mdx";
}
