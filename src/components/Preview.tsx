import { Component, createEffect, onCleanup } from "solid-js";

interface PreviewProps {
  html: string;
  ref?: (el: HTMLDivElement) => void;
  onScroll?: (event: Event) => void;
}

/**
 * Preview component renders sanitized HTML from the markdown pipeline.
 * Handles code block copy buttons after each render.
 */
const Preview: Component<PreviewProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;

  const setRef = (el: HTMLDivElement) => {
    containerRef = el;
    props.ref?.(el);
  };

  // Add copy buttons to code blocks after HTML changes
  createEffect(() => {
    const _html = props.html; // track reactivity
    if (!containerRef) return;

    // Wait for DOM update
    requestAnimationFrame(() => {
      if (!containerRef) return;
      const codeBlocks = containerRef.querySelectorAll("pre > code");

      for (const code of codeBlocks) {
        const pre = code.parentElement;
        if (!pre || pre.querySelector(".code-copy-btn")) continue;

        // Extract language from class name
        const langClass = Array.from(code.classList).find((c) =>
          c.startsWith("language-")
        );
        const lang = langClass?.replace("language-", "") ?? "";

        // Add language label
        if (lang) {
          const label = document.createElement("span");
          label.className = "code-lang-label";
          label.textContent = lang;
          pre.style.position = "relative";
          pre.insertBefore(label, pre.firstChild);
        }

        // Add copy button
        const btn = document.createElement("button");
        btn.className = "code-copy-btn";
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"/><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"/></svg>`;
        btn.title = "Copy code";
        pre.style.position = "relative";
        pre.appendChild(btn);

        btn.addEventListener("click", async () => {
          const text = code.textContent ?? "";
          try {
            await navigator.clipboard.writeText(text);
            btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/></svg>`;
            setTimeout(() => {
              btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"/><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"/></svg>`;
            }, 2000);
          } catch {
            // Fallback: select text for manual copy
            const range = document.createRange();
            range.selectNodeContents(code);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
        });
      }
    });
  });

  const handleScroll = (e: Event) => {
    props.onScroll?.(e);
  };

  return (
    <div
      ref={setRef}
      class="preview-container markdown-body"
      onScroll={handleScroll}
      innerHTML={props.html}
    />
  );
};

export default Preview;
