import { Component, createSignal, onCleanup, Show, For } from "solid-js";

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  separator?: boolean;
  disabled?: boolean;
  shortcut?: string;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  containerRef: () => HTMLElement | undefined;
}

/**
 * Right-click context menu for preview area.
 * Includes custom items + standard text operations (Copy, Select All).
 */
const ContextMenu: Component<ContextMenuProps> = (props) => {
  const [visible, setVisible] = createSignal(false);
  const [position, setPosition] = createSignal({ x: 0, y: 0 });
  const [hasSelection, setHasSelection] = createSignal(false);

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    const sel = window.getSelection();
    setHasSelection(!!sel && sel.toString().length > 0);
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 200);
    setPosition({ x, y });
    setVisible(true);
  };

  const hide = () => setVisible(false);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") hide();
  };

  // Standard text operations
  const copySelection = () => {
    const sel = window.getSelection();
    if (sel && sel.toString()) {
      navigator.clipboard.writeText(sel.toString());
    }
  };

  const selectAll = () => {
    const container = props.containerRef();
    if (!container) return;
    const range = document.createRange();
    range.selectNodeContents(container);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  const allItems = (): ContextMenuItem[] => [
    ...props.items,
    { label: "Copy", onClick: copySelection, shortcut: "⌘C", disabled: !hasSelection(), separator: true },
    { label: "Select All", onClick: selectAll, shortcut: "⌘A" },
  ];

  const attach = () => {
    const container = props.containerRef();
    if (container) {
      container.addEventListener("contextmenu", handleContextMenu);
    }
    document.addEventListener("click", hide);
    document.addEventListener("keydown", handleKeyDown);
  };

  const detach = () => {
    const container = props.containerRef();
    if (container) {
      container.removeEventListener("contextmenu", handleContextMenu);
    }
    document.removeEventListener("click", hide);
    document.removeEventListener("keydown", handleKeyDown);
  };

  setTimeout(attach, 0);
  onCleanup(detach);

  return (
    <Show when={visible()}>
      <div
        class="context-menu"
        style={{
          left: `${position().x}px`,
          top: `${position().y}px`,
        }}
      >
        <For each={allItems()}>
          {(item) => (
            <>
              {item.separator && <div class="context-menu-separator" />}
              <button
                class="context-menu-item"
                classList={{ "context-menu-item--disabled": item.disabled }}
                disabled={item.disabled}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick();
                    hide();
                  }
                }}
              >
                <span>{item.label}</span>
                {item.shortcut && <span class="context-menu-shortcut">{item.shortcut}</span>}
              </button>
            </>
          )}
        </For>
      </div>
    </Show>
  );
};

export default ContextMenu;
