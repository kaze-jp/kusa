import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import type { Schema } from "rehype-sanitize";

const sanitizeSchema: Schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ["className", /^language-./],
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
  .use(rehypeSanitize, sanitizeSchema)
  .use(rehypeStringify);

export async function processMarkdown(markdown: string): Promise<string> {
  const result = await baseProcessor.process(markdown);
  return String(result);
}

export function isMarkdownFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return ext === "md" || ext === "markdown" || ext === "mdx";
}
