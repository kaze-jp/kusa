import { For } from "solid-js";
import type { Component } from "solid-js";

export interface MdFileEntry {
  name: string;
  path: string;
  modified_at: number;
  size: number;
}

interface FileListProps {
  files: MdFileEntry[];
  onSelect: (path: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(timestamp: number): string {
  if (timestamp === 0) return "";
  const date = new Date(timestamp * 1000);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}`;
}

const FileList: Component<FileListProps> = (props) => {
  return (
    <div class="h-full overflow-y-auto">
      <div class="max-w-2xl mx-auto p-6">
        <h1 class="text-zinc-300 text-lg font-semibold mb-4">
          Markdown Files
        </h1>
        <ul class="space-y-1">
          <For each={props.files}>
            {(file) => (
              <li>
                <button
                  class="w-full text-left px-4 py-3 rounded-lg hover:bg-zinc-800 transition-colors group"
                  onClick={() => props.onSelect(file.path)}
                >
                  <div class="flex items-baseline justify-between">
                    <span class="text-zinc-200 group-hover:text-white font-medium truncate">
                      {file.name}
                    </span>
                    <span class="text-zinc-500 text-xs ml-4 shrink-0">
                      {formatSize(file.size)}
                    </span>
                  </div>
                  <div class="text-zinc-500 text-xs mt-0.5">
                    {formatDate(file.modified_at)}
                  </div>
                </button>
              </li>
            )}
          </For>
        </ul>
        {props.files.length === 0 && (
          <p class="text-zinc-500 text-center py-8">
            No Markdown files found in this directory.
          </p>
        )}
      </div>
    </div>
  );
};

export default FileList;
