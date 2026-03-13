import { Component, createSignal, onCleanup, Show } from "solid-js";

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  separator?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  containerRef: () => HTMLElement | undefined;
}

/**
 * Right-click context menu for preview area.
 * Attaches to a container element and shows custom menu items.
 */
const ContextMenu: Component<ContextMenuProps> = (props) => {
  const [visible, setVisible] = createSignal(false);
  const [position, setPosition] = createSignal({ x: 0, y: 0 });
  let menuRef: HTMLDivElement | undefined;

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    // Position menu at cursor, clamping to viewport
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - 150);
    setPosition({ x, y });
    setVisible(true);
  };

  const handleClick = () => {
    setVisible(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") setVisible(false);
  };

  // Attach/detach listeners
  const attach = () => {
    const container = props.containerRef();
    if (container) {
      container.addEventListener("contextmenu", handleContextMenu);
    }
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeyDown);
  };

  const detach = () => {
    const container = props.containerRef();
    if (container) {
      container.removeEventListener("contextmenu", handleContextMenu);
    }
    document.removeEventListener("click", handleClick);
    document.removeEventListener("keydown", handleKeyDown);
  };

  // Use MutationObserver-like pattern: re-attach when containerRef changes
  // For SolidJS, we use createEffect in the parent to call attach()
  // But simpler: attach on mount via setTimeout to ensure ref is set
  setTimeout(attach, 0);
  onCleanup(detach);

  return (
    <Show when={visible()}>
      <div
        ref={menuRef}
        class="context-menu"
        style={{
          left: `${position().x}px`,
          top: `${position().y}px`,
        }}
      >
        {props.items.map((item) => (
          <>
            {item.separator && <div class="context-menu-separator" />}
            <button
              class="context-menu-item"
              onClick={() => {
                item.onClick();
                setVisible(false);
              }}
            >
              {item.label}
            </button>
          </>
        ))}
      </div>
    </Show>
  );
};

export default ContextMenu;
