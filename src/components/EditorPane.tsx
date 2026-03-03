/**
 * EditorPane: hosts a CodeMirror 6 editor instance with vim mode.
 *
 * Receives loaded CodeMirror modules via props, initialises CMEditor,
 * and cleans up on unmount.
 */

import { onMount, onCleanup } from "solid-js";
import {
  createCMEditor,
  type CodeMirrorModules,
  type CMEditorInstance,
  type CMEditorConfig,
} from "../lib/editor";

interface EditorPaneProps {
  modules: CodeMirrorModules;
  initialContent: string;
  onContentChange: (content: string) => void;
  onVimModeChange: (mode: "NORMAL" | "INSERT" | "VISUAL" | "COMMAND") => void;
  onCursorChange: (pos: { line: number; col: number }) => void;
  onSaveCommand: () => void;
  onSaveQuitCommand: () => void;
  onQuitCommand: () => void;
  /** Ref callback to expose editor instance to parent */
  onEditorReady?: (editor: CMEditorInstance) => void;
}

export default function EditorPane(props: EditorPaneProps) {
  let containerRef: HTMLDivElement | undefined;
  let editor: CMEditorInstance | null = null;

  onMount(() => {
    if (!containerRef) return;

    const config: CMEditorConfig = {
      initialContent: props.initialContent,
      onContentChange: props.onContentChange,
      onVimModeChange: props.onVimModeChange,
      onCursorChange: props.onCursorChange,
      onSaveCommand: props.onSaveCommand,
      onSaveQuitCommand: props.onSaveQuitCommand,
      onQuitCommand: props.onQuitCommand,
    };

    editor = createCMEditor(containerRef, props.modules, config);
    props.onEditorReady?.(editor);

    // Focus editor after mount
    requestAnimationFrame(() => {
      editor?.focus();
    });
  });

  onCleanup(() => {
    editor?.destroy();
    editor = null;
  });

  return (
    <div
      ref={containerRef}
      class="h-full w-full overflow-hidden bg-[#282c34]"
    />
  );
}
