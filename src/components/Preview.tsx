import type { Component } from "solid-js";

interface PreviewProps {
  html: string;
}

const Preview: Component<PreviewProps> = (props) => {
  return (
    <div class="h-full overflow-y-auto">
      <article class="prose" innerHTML={props.html} />
    </div>
  );
};

export default Preview;
