import { createSignal, onMount, onCleanup } from "solid-js";
import type { Component, JSX } from "solid-js";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import type { UnlistenFn } from "@tauri-apps/api/event";

interface DropZoneProps {
  onFileDrop: (path: string) => void;
  children: JSX.Element;
}

const DropZone: Component<DropZoneProps> = (props) => {
  const [isDragging, setIsDragging] = createSignal(false);
  let unlisten: UnlistenFn | undefined;

  onMount(async () => {
    const appWindow = getCurrentWebviewWindow();
    unlisten = await appWindow.onDragDropEvent((event) => {
      if (event.payload.type === "over") {
        setIsDragging(true);
      } else if (event.payload.type === "drop") {
        setIsDragging(false);
        const paths = event.payload.paths;
        if (paths.length > 0) {
          props.onFileDrop(paths[0]);
        }
      } else {
        // cancel
        setIsDragging(false);
      }
    });
  });

  onCleanup(() => {
    unlisten?.();
  });

  return (
    <div class="relative h-full">
      {props.children}
      {isDragging() && (
        <div class="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center z-50">
          <p class="text-blue-300 text-lg font-medium">
            Drop file to preview
          </p>
        </div>
      )}
    </div>
  );
};

export default DropZone;
