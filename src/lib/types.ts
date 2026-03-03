/** Input source type - matches Rust side source field */
export type InputSource = "file" | "stdin" | "clipboard" | "github" | "url";

/** Unified input content type - matches Rust InputContent struct */
export interface InputContent {
  /** Input source type */
  source: InputSource;
  /** Markdown content body */
  content: string;
  /** Label to display in title bar */
  title: string;
  /** File path for file sources (null for temporary buffers) */
  filePath: string | null;
}

/** CLI arguments received from Tauri backend */
export interface CliArgs {
  file?: string;
  clipboard?: boolean;
}

/** View mode for the application */
export type ViewMode = "preview" | "file-list" | "error" | "buffer" | "loading";
