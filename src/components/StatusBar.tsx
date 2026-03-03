/**
 * StatusBar: displays Vim mode, cursor position, save status, and dirty indicator.
 *
 * Layout: [VIM_MODE] ---- [notification] ---- [dirty] [Ln:Col]
 */

import { createSignal, createEffect, Show, type Accessor } from "solid-js";

interface StatusBarProps {
  vimMode: Accessor<"NORMAL" | "INSERT" | "VISUAL" | "COMMAND">;
  cursorPosition: Accessor<{ line: number; col: number }>;
  isDirty: Accessor<boolean>;
  notification: Accessor<{ text: string; type: "success" | "error" } | null>;
}

export default function StatusBar(props: StatusBarProps) {
  const [showNotification, setShowNotification] = createSignal(false);

  // Auto-hide notification after 2 seconds
  createEffect(() => {
    const note = props.notification();
    if (note) {
      setShowNotification(true);
      const timer = setTimeout(() => setShowNotification(false), 2000);
      return () => clearTimeout(timer);
    } else {
      setShowNotification(false);
    }
  });

  function vimModeColor(): string {
    switch (props.vimMode()) {
      case "INSERT":
        return "bg-green-600";
      case "VISUAL":
        return "bg-purple-600";
      case "COMMAND":
        return "bg-amber-600";
      default:
        return "bg-blue-600";
    }
  }

  return (
    <div class="flex h-6 flex-shrink-0 items-center justify-between bg-zinc-800 px-3 text-xs text-zinc-300">
      {/* Left: Vim mode */}
      <div class="flex items-center gap-2">
        <span
          class={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold text-white ${vimModeColor()}`}
        >
          {props.vimMode()}
        </span>
      </div>

      {/* Center: notification */}
      <div class="flex-1 text-center">
        <Show when={showNotification() && props.notification()}>
          {(note) => (
            <span
              class={`text-[11px] transition-opacity duration-300 ${
                note().type === "error" ? "text-red-400" : "text-green-400"
              }`}
            >
              {note().text}
            </span>
          )}
        </Show>
      </div>

      {/* Right: dirty indicator + cursor position */}
      <div class="flex items-center gap-3 font-mono">
        <Show when={props.isDirty()}>
          <span class="text-amber-400" title="Unsaved changes">
            [+]
          </span>
        </Show>
        <span>
          {props.cursorPosition().line}:{props.cursorPosition().col}
        </span>
      </div>
    </div>
  );
}
