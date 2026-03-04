import {
  Component,
  For,
  Show,
  createEffect,
  createSignal,
  onCleanup,
} from "solid-js";
import type { HeadingInfo } from "../lib/markdown";

interface TOCPanelProps {
  headings: HeadingInfo[];
  activeHeadingId: string | null;
  isVisible: boolean;
  onHeadingClick: (id: string) => void;
  onToggle: () => void;
}

/**
 * TOCPanel displays a hierarchical table of contents from heading data.
 * Highlights the currently active heading and supports auto-scrolling
 * to keep the active item visible within the panel.
 */
const TOCPanel: Component<TOCPanelProps> = (props) => {
  let panelRef: HTMLElement | undefined;

  // Auto-scroll TOC panel to keep active item visible
  createEffect(() => {
    const activeId = props.activeHeadingId;
    if (!activeId || !panelRef) return;

    const activeEl = panelRef.querySelector(
      `[data-heading-id="${activeId}"]`
    ) as HTMLElement | null;

    if (activeEl) {
      const panelRect = panelRef.getBoundingClientRect();
      const itemRect = activeEl.getBoundingClientRect();

      if (itemRect.top < panelRect.top || itemRect.bottom > panelRect.bottom) {
        activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  });

  // Indent levels: h1=0, h2=1, h3=2, etc.
  const indentClass = (level: number): string => {
    const indents: Record<number, string> = {
      1: "pl-2",
      2: "pl-4",
      3: "pl-6",
      4: "pl-8",
      5: "pl-10",
      6: "pl-12",
    };
    return indents[level] ?? "pl-2";
  };

  return (
    <Show when={props.headings.length > 0}>
      <Show
        when={props.isVisible}
        fallback={
          <button
            type="button"
            class="toc-collapsed-toggle"
            onClick={() => props.onToggle()}
            aria-label="Show table of contents"
            title="Show TOC (Ctrl+B)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 3h12v1.5H2V3zm0 4h8v1.5H2V7zm0 4h10v1.5H2V11z" />
            </svg>
          </button>
        }
      >
        <nav
          ref={panelRef}
          role="navigation"
          aria-label="Table of contents"
          class="toc-panel"
        >
          <div class="toc-header">
            <span class="toc-title">Contents</span>
            <button
              type="button"
              class="toc-toggle-btn"
              onClick={() => props.onToggle()}
              aria-label="Hide table of contents"
              title="Hide TOC (Ctrl+B)"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M10.354 3.146a.5.5 0 0 1 0 .708L6.207 8l4.147 4.146a.5.5 0 0 1-.708.708l-4.5-4.5a.5.5 0 0 1 0-.708l4.5-4.5a.5.5 0 0 1 .708 0z" />
              </svg>
            </button>
          </div>
          <ul class="toc-list">
            <For each={props.headings}>
              {(heading) => (
                <li
                  data-heading-id={heading.id}
                  class={`toc-item ${indentClass(heading.level)} ${
                    props.activeHeadingId === heading.id ? "toc-item-active" : ""
                  }`}
                  onClick={() => props.onHeadingClick(heading.id)}
                >
                  <span class="toc-item-text" title={heading.text}>
                    {heading.text}
                  </span>
                </li>
              )}
            </For>
          </ul>
        </nav>
      </Show>
    </Show>
  );
};

export default TOCPanel;
