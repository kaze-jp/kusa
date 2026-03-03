import {
  Component,
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
} from "solid-js";
import type { HeadingInfo } from "../lib/markdown";

interface HeadingPickerProps {
  headings: HeadingInfo[];
  isOpen: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
}

/**
 * HeadingPicker shows a filterable overlay list of headings.
 * Triggered by `gd` Vim shortcut. Supports arrow navigation,
 * Enter to confirm, Esc to cancel, and text filtering.
 */
const HeadingPicker: Component<HeadingPickerProps> = (props) => {
  const [filterText, setFilterText] = createSignal("");
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  let inputRef: HTMLInputElement | undefined;

  const filteredHeadings = createMemo(() => {
    const filter = filterText().toLowerCase();
    if (!filter) return props.headings;
    return props.headings.filter((h) =>
      h.text.toLowerCase().includes(filter)
    );
  });

  // Focus input when opened
  createEffect(() => {
    if (props.isOpen) {
      setFilterText("");
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef?.focus());
    }
  });

  // Reset selection when filter changes
  createEffect(() => {
    filterText(); // track
    setSelectedIndex(0);
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    const items = filteredHeadings();

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (items.length > 0) {
          props.onSelect(items[selectedIndex()].id);
          props.onClose();
        }
        break;
      case "Escape":
        e.preventDefault();
        props.onClose();
        break;
    }
  };

  const indentClass = (level: number): string => {
    const indents: Record<number, string> = {
      1: "pl-2",
      2: "pl-5",
      3: "pl-8",
      4: "pl-11",
      5: "pl-14",
      6: "pl-17",
    };
    return indents[level] ?? "pl-2";
  };

  return (
    <Show when={props.isOpen}>
      <div
        class="heading-picker-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) props.onClose();
        }}
      >
        <div class="heading-picker" role="listbox" aria-label="Jump to heading">
          <div class="heading-picker-search">
            <input
              ref={inputRef}
              type="text"
              class="heading-picker-input"
              placeholder="Jump to heading..."
              value={filterText()}
              onInput={(e) => setFilterText(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <ul class="heading-picker-list">
            <For each={filteredHeadings()}>
              {(heading, i) => (
                <li
                  role="option"
                  aria-selected={i() === selectedIndex()}
                  class={`heading-picker-item ${indentClass(heading.level)} ${
                    i() === selectedIndex() ? "heading-picker-item-active" : ""
                  }`}
                  onClick={() => {
                    props.onSelect(heading.id);
                    props.onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(i())}
                >
                  <span class="heading-picker-level">H{heading.level}</span>
                  <span class="heading-picker-text">{heading.text}</span>
                </li>
              )}
            </For>
            <Show when={filteredHeadings().length === 0}>
              <li class="heading-picker-empty">No matching headings</li>
            </Show>
          </ul>
        </div>
      </div>
    </Show>
  );
};

export default HeadingPicker;
