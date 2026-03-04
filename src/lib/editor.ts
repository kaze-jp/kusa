/**
 * CodeMirror 6 editor service with Vim extension, lazy loading, and dark theme.
 *
 * Provides:
 * - createEditorLazyLoader(): dynamic import of all CM modules
 * - createCMEditor(): initialise EditorView with vim mode, markdown, dark theme
 */

import { createSignal, type Accessor } from "solid-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LoaderState = "idle" | "loading" | "loaded" | "error";

export interface CodeMirrorModules {
  EditorView: typeof import("@codemirror/view").EditorView;
  EditorState: typeof import("@codemirror/state").EditorState;
  keymap: typeof import("@codemirror/view").keymap;
  lineNumbers: typeof import("@codemirror/view").lineNumbers;
  drawSelection: typeof import("@codemirror/view").drawSelection;
  highlightActiveLine: typeof import("@codemirror/view").highlightActiveLine;
  highlightSpecialChars: typeof import("@codemirror/view").highlightSpecialChars;
  markdown: typeof import("@codemirror/lang-markdown").markdown;
  oneDark: typeof import("@codemirror/theme-one-dark").oneDark;
  vim: typeof import("@replit/codemirror-vim").vim;
  Vim: typeof import("@replit/codemirror-vim").Vim;
  getCM: typeof import("@replit/codemirror-vim").getCM;
  defaultKeymap: typeof import("@codemirror/commands").defaultKeymap;
  history: typeof import("@codemirror/commands").history;
  historyKeymap: typeof import("@codemirror/commands").historyKeymap;
  indentOnInput: typeof import("@codemirror/language").indentOnInput;
  syntaxHighlighting: typeof import("@codemirror/language").syntaxHighlighting;
  defaultHighlightStyle: typeof import("@codemirror/language").defaultHighlightStyle;
  bracketMatching: typeof import("@codemirror/language").bracketMatching;
}

export interface LazyLoaderResult {
  state: Accessor<LoaderState>;
  load(): Promise<void>;
  getModules(): CodeMirrorModules | null;
}

export interface CMEditorConfig {
  initialContent: string;
  onContentChange: (content: string) => void;
  onVimModeChange: (mode: "NORMAL" | "INSERT" | "VISUAL" | "COMMAND") => void;
  onCursorChange: (pos: { line: number; col: number }) => void;
  onSaveCommand: () => void;
  onSaveQuitCommand: () => void;
  onQuitCommand: () => void;
}

export interface CMEditorInstance {
  getContent(): string;
  setContent(content: string): void;
  focus(): void;
  destroy(): void;
  getView(): InstanceType<CodeMirrorModules["EditorView"]> | null;
}

// ---------------------------------------------------------------------------
// Lazy Loader
// ---------------------------------------------------------------------------

let cachedModules: CodeMirrorModules | null = null;

export function createEditorLazyLoader(): LazyLoaderResult {
  const [state, setState] = createSignal<LoaderState>(
    cachedModules ? "loaded" : "idle",
  );

  async function load() {
    if (cachedModules) {
      setState("loaded");
      return;
    }
    setState("loading");
    try {
      const [viewMod, stateMod, langMdMod, themeMod, vimMod, cmdMod, langMod] =
        await Promise.all([
          import("@codemirror/view"),
          import("@codemirror/state"),
          import("@codemirror/lang-markdown"),
          import("@codemirror/theme-one-dark"),
          import("@replit/codemirror-vim"),
          import("@codemirror/commands"),
          import("@codemirror/language"),
        ]);

      cachedModules = {
        EditorView: viewMod.EditorView,
        EditorState: stateMod.EditorState,
        keymap: viewMod.keymap,
        lineNumbers: viewMod.lineNumbers,
        drawSelection: viewMod.drawSelection,
        highlightActiveLine: viewMod.highlightActiveLine,
        highlightSpecialChars: viewMod.highlightSpecialChars,
        markdown: langMdMod.markdown,
        oneDark: themeMod.oneDark,
        vim: vimMod.vim,
        Vim: vimMod.Vim,
        getCM: vimMod.getCM,
        defaultKeymap: cmdMod.defaultKeymap,
        history: cmdMod.history,
        historyKeymap: cmdMod.historyKeymap,
        indentOnInput: langMod.indentOnInput,
        syntaxHighlighting: langMod.syntaxHighlighting,
        defaultHighlightStyle: langMod.defaultHighlightStyle,
        bracketMatching: langMod.bracketMatching,
      };
      setState("loaded");
    } catch {
      setState("error");
    }
  }

  function getModules(): CodeMirrorModules | null {
    return cachedModules;
  }

  return { state, load, getModules };
}

// ---------------------------------------------------------------------------
// CM Editor
// ---------------------------------------------------------------------------

export function createCMEditor(
  parent: HTMLElement,
  modules: CodeMirrorModules,
  config: CMEditorConfig,
): CMEditorInstance {
  const {
    EditorView,
    EditorState,
    keymap,
    lineNumbers,
    drawSelection,
    highlightActiveLine,
    highlightSpecialChars,
    markdown,
    oneDark,
    vim,
    Vim,
    defaultKeymap,
    history,
    historyKeymap,
    indentOnInput,
    syntaxHighlighting,
    defaultHighlightStyle,
    bracketMatching,
  } = modules;

  // Register Vim ex-commands before creating the view
  Vim.defineEx("write", "w", () => {
    config.onSaveCommand();
  });

  Vim.defineEx("wq", "wq", () => {
    config.onSaveQuitCommand();
  });

  Vim.defineEx("quit", "q", () => {
    config.onQuitCommand();
  });

  // Map jk to escape in insert mode
  Vim.map("jk", "<Esc>", "insert");

  // Yank to system clipboard by default (like vim's clipboard=unnamedplus)
  Vim.map("y", '"+y', "normal");
  Vim.map("y", '"+y', "visual");
  Vim.map("Y", '"+Y', "normal");

  // Track IME composition in non-insert vim mode to block document changes
  let normalModeComposing = false;

  // Build extensions
  const extensions = [
    // Block document changes from IME composition in vim normal/visual mode
    EditorState.transactionFilter.of((tr) => {
      if (normalModeComposing && tr.docChanged) {
        return [];
      }
      return tr;
    }),
    // Override Ctrl+D/U before vim processes them to prevent wrap-around at boundaries
    EditorView.domEventHandlers({
      compositionstart(_event, view) {
        // Block IME composition in vim normal/visual mode
        // (only allow in insert mode)
        const cmInstance = modules.getCM(view);
        if (cmInstance) {
          const vimState = (cmInstance as any).state?.vim;
          if (vimState && !vimState.insertMode) {
            normalModeComposing = true;
            view.contentDOM.blur();
            setTimeout(() => {
              normalModeComposing = false;
              view.focus();
            }, 10);
            return true;
          }
        }
        return false;
      },
      compositionend() {
        normalModeComposing = false;
        return false;
      },
      keydown(event, view) {
        if (!event.ctrlKey) return false;
        if (event.key !== "d" && event.key !== "u") return false;

        event.preventDefault();
        const doc = view.state.doc;
        const sel = view.state.selection.main;
        const currentLine = doc.lineAt(sel.head);
        const visibleLines = Math.max(
          1,
          Math.floor(view.dom.clientHeight / view.defaultLineHeight / 2),
        );

        if (event.key === "d") {
          // Half-page down: clamp to last line
          const targetLineNum = Math.min(
            currentLine.number + visibleLines,
            doc.lines,
          );
          const targetLine = doc.line(targetLineNum);
          const col = Math.min(sel.head - currentLine.from, targetLine.length);
          view.dispatch({
            selection: { anchor: targetLine.from + col },
            scrollIntoView: true,
          });
        } else {
          // Half-page up: clamp to first line
          const targetLineNum = Math.max(
            currentLine.number - visibleLines,
            1,
          );
          const targetLine = doc.line(targetLineNum);
          const col = Math.min(sel.head - currentLine.from, targetLine.length);
          view.dispatch({
            selection: { anchor: targetLine.from + col },
            scrollIntoView: true,
          });
        }
        return true;
      },
    }),
    vim(),
    lineNumbers(),
    highlightActiveLine(),
    highlightSpecialChars(),
    drawSelection(),
    history(),
    indentOnInput(),
    bracketMatching(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    markdown(),
    oneDark,
    keymap.of([...defaultKeymap, ...historyKeymap]),
    // Content change listener
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        config.onContentChange(update.state.doc.toString());
      }
      // Cursor position
      const sel = update.state.selection.main;
      const line = update.state.doc.lineAt(sel.head);
      config.onCursorChange({
        line: line.number,
        col: sel.head - line.from + 1,
      });
    }),
    // Dark background styling
    EditorView.theme({
      "&": {
        height: "100%",
        fontSize: "14px",
      },
      ".cm-scroller": {
        overflow: "auto",
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      },
      ".cm-gutters": {
        backgroundColor: "#1e1e2e",
        borderRight: "1px solid #313244",
      },
      "&.cm-focused .cm-cursor": {
        borderLeftColor: "#cdd6f4",
      },
      ".cm-fat-cursor": {
        backgroundColor: "rgba(205, 214, 244, 0.3) !important",
      },
    }),
  ];

  const state = EditorState.create({
    doc: config.initialContent,
    extensions,
  });

  const view = new EditorView({
    state,
    parent,
  });

  // Poll Vim mode changes via CM adapter
  let lastVimMode = "NORMAL";
  const modeInterval = setInterval(() => {
    try {
      const cmInstance = modules.getCM(view);
      if (cmInstance) {
        const vimState = (cmInstance as any).state?.vim;
        if (vimState) {
          let currentMode: "NORMAL" | "INSERT" | "VISUAL" | "COMMAND" = "NORMAL";
          if (vimState.insertMode) {
            currentMode = "INSERT";
          } else if (vimState.visualMode) {
            currentMode = "VISUAL";
          } else if (
            vimState.mode === "visual" ||
            vimState.mode === "visual_line" ||
            vimState.mode === "visual_block"
          ) {
            currentMode = "VISUAL";
          }
          if (currentMode !== lastVimMode) {
            lastVimMode = currentMode;
            config.onVimModeChange(currentMode);
          }
        }
      }
    } catch {
      // getCM may fail if view is destroyed
    }
  }, 100);

  return {
    getContent(): string {
      return view.state.doc.toString();
    },
    setContent(content: string): void {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: content,
        },
      });
    },
    focus(): void {
      view.focus();
    },
    destroy(): void {
      clearInterval(modeInterval);
      view.destroy();
    },
    getView() {
      return view;
    },
  };
}
