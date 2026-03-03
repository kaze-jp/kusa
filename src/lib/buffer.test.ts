import { describe, it, expect } from "vitest";
import { createRoot } from "solid-js";
import { createBufferManager } from "./buffer";
import type { InputContent } from "./types";

describe("createBufferManager", () => {
  it("starts with null content", () => {
    createRoot((dispose) => {
      const manager = createBufferManager();
      expect(manager.state.inputContent()).toBeNull();
      expect(manager.state.isBufferMode()).toBe(false);
      expect(manager.state.isEditable()).toBe(true);
      dispose();
    });
  });

  it("sets content and updates buffer mode for stdin", () => {
    createRoot((dispose) => {
      const manager = createBufferManager();
      const content: InputContent = {
        source: "stdin",
        content: "# Hello",
        title: "(stdin)",
        filePath: null,
      };
      manager.setContent(content);

      expect(manager.state.inputContent()).toEqual(content);
      expect(manager.state.isBufferMode()).toBe(true);
      expect(manager.state.isEditable()).toBe(false);
      dispose();
    });
  });

  it("sets content for clipboard source", () => {
    createRoot((dispose) => {
      const manager = createBufferManager();
      const content: InputContent = {
        source: "clipboard",
        content: "# Clipboard content",
        title: "(clipboard)",
        filePath: null,
      };
      manager.setContent(content);

      expect(manager.state.isBufferMode()).toBe(true);
      expect(manager.state.isEditable()).toBe(false);
      dispose();
    });
  });

  it("sets content for github source", () => {
    createRoot((dispose) => {
      const manager = createBufferManager();
      const content: InputContent = {
        source: "github",
        content: "# GitHub README",
        title: "gh:owner/repo/README.md",
        filePath: null,
      };
      manager.setContent(content);

      expect(manager.state.isBufferMode()).toBe(true);
      expect(manager.state.isEditable()).toBe(false);
      dispose();
    });
  });

  it("sets content for url source", () => {
    createRoot((dispose) => {
      const manager = createBufferManager();
      const content: InputContent = {
        source: "url",
        content: "# URL content",
        title: "https://example.com/file.md",
        filePath: null,
      };
      manager.setContent(content);

      expect(manager.state.isBufferMode()).toBe(true);
      expect(manager.state.isEditable()).toBe(false);
      dispose();
    });
  });

  it("is editable for file source", () => {
    createRoot((dispose) => {
      const manager = createBufferManager();
      const content: InputContent = {
        source: "file",
        content: "# File content",
        title: "test.md",
        filePath: "/path/to/test.md",
      };
      manager.setContent(content);

      expect(manager.state.isBufferMode()).toBe(false);
      expect(manager.state.isEditable()).toBe(true);
      dispose();
    });
  });

  it("clears content", () => {
    createRoot((dispose) => {
      const manager = createBufferManager();
      manager.setContent({
        source: "stdin",
        content: "# Hello",
        title: "(stdin)",
        filePath: null,
      });
      expect(manager.state.inputContent()).not.toBeNull();

      manager.clear();
      expect(manager.state.inputContent()).toBeNull();
      expect(manager.state.isBufferMode()).toBe(false);
      expect(manager.state.isEditable()).toBe(true);
      dispose();
    });
  });
});
