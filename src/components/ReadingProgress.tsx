import { Component, Show } from "solid-js";

interface ReadingProgressProps {
  progress: number;
  visible: boolean;
}

/**
 * ReadingProgress displays a thin progress bar at the top of the viewport
 * showing how far the user has scrolled through the document.
 */
const ReadingProgress: Component<ReadingProgressProps> = (props) => {
  return (
    <Show when={props.visible}>
      <div class="reading-progress" aria-hidden="true">
        <div
          class="reading-progress-bar"
          style={{ width: `${Math.min(100, Math.max(0, props.progress))}%` }}
        />
        <span class="reading-progress-text">
          {Math.round(props.progress)}%
        </span>
      </div>
    </Show>
  );
};

export default ReadingProgress;
