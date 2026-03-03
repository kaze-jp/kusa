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
    <Show when={props.isVisible && props.headings.length > 0}>
      <nav
        ref={panelRef}
        role="navigation"
        aria-label="Table of contents"
        class="toc-panel"
      >
        <div class="toc-header">
          <span class="toc-title">Contents</span>
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
  );
};

export default TOCPanel;
