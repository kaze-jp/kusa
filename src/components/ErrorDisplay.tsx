import { Show } from "solid-js";
import type { Component } from "solid-js";

interface ErrorDisplayProps {
  message: string;
  filePath?: string;
  /** Optional hint text shown below the error message */
  hint?: string;
}

/**
 * Categorize error messages into display types for appropriate icon/color.
 */
function getErrorCategory(message: string): "network" | "not-found" | "clipboard" | "parse" | "rate-limit" | "generic" {
  if (message.includes("レート制限") || message.includes("rate limit")) {
    return "rate-limit";
  }
  if (message.includes("ネットワーク") || message.includes("タイムアウト") || message.includes("network") || message.includes("timeout")) {
    return "network";
  }
  if (message.includes("見つかりません") || message.includes("not found") || message.includes("404")) {
    return "not-found";
  }
  if (message.includes("クリップボード") || message.includes("clipboard")) {
    return "clipboard";
  }
  if (message.includes("形式が不正") || message.includes("invalid format")) {
    return "parse";
  }
  return "generic";
}

function getErrorIcon(category: ReturnType<typeof getErrorCategory>): string {
  switch (category) {
    case "network":
      return "⚡";
    case "not-found":
      return "?";
    case "clipboard":
      return "📋";
    case "rate-limit":
      return "⏱";
    case "parse":
      return "⚠";
    default:
      return "!";
  }
}

function getErrorColor(category: ReturnType<typeof getErrorCategory>): string {
  switch (category) {
    case "network":
    case "rate-limit":
      return "text-amber-500";
    case "not-found":
      return "text-zinc-500";
    case "clipboard":
      return "text-blue-500";
    case "parse":
      return "text-orange-500";
    default:
      return "text-zinc-600";
  }
}

const ErrorDisplay: Component<ErrorDisplayProps> = (props) => {
  const category = () => getErrorCategory(props.message);

  return (
    <div class="h-full flex items-center justify-center">
      <div class="max-w-md text-center space-y-4">
        <div class={`text-4xl ${getErrorColor(category())}`}>
          {getErrorIcon(category())}
        </div>
        <p class="text-zinc-300 text-lg">{props.message}</p>
        <Show when={props.hint}>
          <p class="text-zinc-500 text-sm">{props.hint}</p>
        </Show>
        <Show when={props.filePath}>
          <p class="text-zinc-500 text-sm font-mono break-all">
            {props.filePath}
          </p>
        </Show>
      </div>
    </div>
  );
};

export default ErrorDisplay;
