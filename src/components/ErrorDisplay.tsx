import type { Component } from "solid-js";

interface ErrorDisplayProps {
  message: string;
  filePath?: string;
}

const ErrorDisplay: Component<ErrorDisplayProps> = (props) => {
  return (
    <div class="h-full flex items-center justify-center">
      <div class="max-w-md text-center space-y-4">
        <div class="text-4xl text-zinc-600">!</div>
        <p class="text-zinc-300 text-lg">{props.message}</p>
        {props.filePath && (
          <p class="text-zinc-500 text-sm font-mono break-all">
            {props.filePath}
          </p>
        )}
      </div>
    </div>
  );
};

export default ErrorDisplay;
