import { describe, it, expect } from "vitest";
import { computeTabLabels } from "./tabLabelResolver";
import type { Tab } from "./tabStore";

function makeTab(overrides: Partial<Tab> & { filePath: string; fileName: string }): Tab {
  return {
    id: overrides.filePath || `untitled-${Math.random()}`,
    content: "",
    isDirty: false,
    scrollPosition: 0,
    isUntitled: false,
    ...overrides,
  };
}

describe("computeTabLabels", () => {
  it("returns empty map for empty tabs", () => {
    const result = computeTabLabels([]);
    expect(result.size).toBe(0);
  });

  it("returns fileName only when single tab", () => {
    const tabs = [makeTab({ filePath: "/a/b/README.md", fileName: "README.md" })];
    const result = computeTabLabels(tabs);
    expect(result.get(tabs[0].id)).toEqual({ prefix: "", fileName: "README.md" });
  });

  it("returns fileName only when all fileNames are unique", () => {
    const tabs = [
      makeTab({ filePath: "/a/README.md", fileName: "README.md" }),
      makeTab({ filePath: "/a/CLAUDE.md", fileName: "CLAUDE.md" }),
      makeTab({ filePath: "/a/design.md", fileName: "design.md" }),
    ];
    const result = computeTabLabels(tabs);
    expect(result.get(tabs[0].id)!.prefix).toBe("");
    expect(result.get(tabs[1].id)!.prefix).toBe("");
    expect(result.get(tabs[2].id)!.prefix).toBe("");
  });

  it("adds parent directory when two tabs have same fileName", () => {
    const tabs = [
      makeTab({ filePath: "/projects/a/README.md", fileName: "README.md" }),
      makeTab({ filePath: "/projects/b/README.md", fileName: "README.md" }),
    ];
    const result = computeTabLabels(tabs);
    expect(result.get(tabs[0].id)).toEqual({ prefix: "a", fileName: "README.md" });
    expect(result.get(tabs[1].id)).toEqual({ prefix: "b", fileName: "README.md" });
  });

  it("adds deeper directories when parent dirs are also the same", () => {
    const tabs = [
      makeTab({ filePath: "/a/x/components/README.md", fileName: "README.md" }),
      makeTab({ filePath: "/a/y/components/README.md", fileName: "README.md" }),
    ];
    const result = computeTabLabels(tabs);
    expect(result.get(tabs[0].id)).toEqual({ prefix: "x/components", fileName: "README.md" });
    expect(result.get(tabs[1].id)).toEqual({ prefix: "y/components", fileName: "README.md" });
  });

  it("only adds depth to tabs that are still ambiguous", () => {
    const tabs = [
      makeTab({ filePath: "/a/x/components/README.md", fileName: "README.md" }),
      makeTab({ filePath: "/a/y/components/README.md", fileName: "README.md" }),
      makeTab({ filePath: "/b/z/README.md", fileName: "README.md" }),
    ];
    const result = computeTabLabels(tabs);
    // z is unique at depth 1, so stays at depth 1
    expect(result.get(tabs[2].id)).toEqual({ prefix: "z", fileName: "README.md" });
    // x/components and y/components need depth 2
    expect(result.get(tabs[0].id)).toEqual({ prefix: "x/components", fileName: "README.md" });
    expect(result.get(tabs[1].id)).toEqual({ prefix: "y/components", fileName: "README.md" });
  });

  it("skips untitled tabs", () => {
    const tabs = [
      makeTab({ filePath: "/a/README.md", fileName: "README.md" }),
      makeTab({ id: "untitled-1", filePath: "", fileName: "Untitled-1", isUntitled: true }),
      makeTab({ filePath: "/b/README.md", fileName: "README.md" }),
    ];
    const result = computeTabLabels(tabs);
    expect(result.get("untitled-1")).toEqual({ prefix: "", fileName: "Untitled-1" });
    expect(result.get(tabs[0].id)!.prefix).toBe("a");
    expect(result.get(tabs[2].id)!.prefix).toBe("b");
  });

  it("skips clipboard tabs", () => {
    const tabs = [
      makeTab({ id: "clipboard-1", filePath: "", fileName: "clipboard", isUntitled: true }),
      makeTab({ filePath: "/a/README.md", fileName: "README.md" }),
    ];
    const result = computeTabLabels(tabs);
    expect(result.get("clipboard-1")).toEqual({ prefix: "", fileName: "clipboard" });
    expect(result.get(tabs[1].id)!.prefix).toBe("");
  });

  it("skips tabs with empty filePath", () => {
    const tabs = [
      makeTab({ id: "empty", filePath: "", fileName: "test" }),
    ];
    const result = computeTabLabels(tabs);
    expect(result.get("empty")).toEqual({ prefix: "", fileName: "test" });
  });

  it("does not add prefix to unique fileName even when other names collide", () => {
    const tabs = [
      makeTab({ filePath: "/a/README.md", fileName: "README.md" }),
      makeTab({ filePath: "/b/README.md", fileName: "README.md" }),
      makeTab({ filePath: "/a/CLAUDE.md", fileName: "CLAUDE.md" }),
    ];
    const result = computeTabLabels(tabs);
    expect(result.get(tabs[2].id)).toEqual({ prefix: "", fileName: "CLAUDE.md" });
  });
});
