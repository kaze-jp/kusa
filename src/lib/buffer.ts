import { createSignal } from "solid-js";
import type { Accessor } from "solid-js";
import type { InputContent } from "./types";

/** Buffer state interface */
export interface BufferState {
  /** Current input content */
  inputContent: Accessor<InputContent | null>;
  /** Whether in temporary buffer mode (non-file source) */
  isBufferMode: Accessor<boolean>;
  /** Whether the content is editable (false in buffer mode) */
  isEditable: Accessor<boolean>;
}

/** Buffer manager return type */
export interface BufferManager {
  state: BufferState;
  /** Set input content */
  setContent(content: InputContent): void;
  /** Clear the buffer */
  clear(): void;
}

/**
 * Create a buffer manager for managing input content state.
 * Handles both file-based and temporary buffer (stdin, clipboard, url, github) modes.
 */
export function createBufferManager(): BufferManager {
  const [inputContent, setInputContent] = createSignal<InputContent | null>(
    null,
  );

  const isBufferMode: Accessor<boolean> = () => {
    const content = inputContent();
    return content !== null && content.source !== "file";
  };

  const isEditable: Accessor<boolean> = () => {
    return !isBufferMode();
  };

  return {
    state: {
      inputContent,
      isBufferMode,
      isEditable,
    },
    setContent(content: InputContent) {
      setInputContent(content);
    },
    clear() {
      setInputContent(null);
    },
  };
}
