import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeExternalLinks from "rehype-external-links";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

type Schema = NonNullable<Parameters<typeof rehypeSanitize>[0]>;

const sanitizeSchema: Schema = {
  ...defaultSchema,
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
  },
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "input", // for checkboxes
  ],
};

const baseProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypePrettyCode, {
    theme: "github-dark",
    keepBackground: true,
  })
  .use(rehypeExternalLinks, {
    target: "_blank",
    rel: ["noopener", "noreferrer"],
  })
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

export function isMarkdownFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return ext === "md" || ext === "markdown" || ext === "mdx";
}
