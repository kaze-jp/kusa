/**
 * Preview: renders sanitised HTML from the Markdown pipeline.
 *
 * Accepts either:
 * - htmlContent (pre-rendered HTML string from sync engine)
 * - or renders its own from rawMarkdown via processMarkdown
 *
 * Maintains last good render on parse failure (flicker prevention).
 */

import { createSignal, createEffect, Show, type Accessor } from "solid-js";
import { processMarkdown } from "../lib/markdown";

interface PreviewProps {
  /** Pre-rendered HTML from SyncEngine (used in split/edit mode) */
  htmlContent?: Accessor<string>;
  /** Raw markdown source (used in preview-only mode) */
  rawMarkdown?: Accessor<string>;
}

export default function Preview(props: PreviewProps) {
  const [html, setHtml] = createSignal("");
  const [loading, setLoading] = createSignal(true);

  // If htmlContent is provided (split mode), use it directly
  createEffect(() => {
    if (props.htmlContent) {
      const content = props.htmlContent();
      if (content != null) {
        setHtml(content);
        setLoading(false);
      }
    }
  });

  // If rawMarkdown is provided (preview-only mode), process it
  createEffect(() => {
    if (props.rawMarkdown) {
      const md = props.rawMarkdown();
      if (md !== undefined) {
        processMarkdown(md)
          .then((result) => {
            setHtml(result);
            setLoading(false);
          })
          .catch(() => {
            // Keep last good HTML
            setLoading(false);
          });
      }
    }
  });

  return (
    <div class="h-full w-full overflow-auto bg-zinc-900 px-8 py-6">
      <Show
        when={!loading() || html()}
        fallback={
          <div class="flex h-full items-center justify-center text-zinc-500">
            Loading preview...
          </div>
        }
      >
        <div
          class="prose prose-invert max-w-none"
          innerHTML={html()}
        />
      </Show>
    </div>
  );
}
