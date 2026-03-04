import { describe, it, expect } from "vitest";
import { createTabStore } from "./tabStore";

describe("tabStore", () => {
  describe("createUntitledTab", () => {
    it("creates an untitled tab with empty content", () => {
      const store = createTabStore();
      const id = store.createUntitledTab();

      expect(id).toMatch(/^untitled-/);
      const tab = store.activeTab();
      expect(tab).not.toBeNull();
      expect(tab!.isUntitled).toBe(true);
      expect(tab!.content).toBe("");
      expect(tab!.fileName).toMatch(/^Untitled-\d+$/);
      expect(tab!.filePath).toBe("");
      expect(tab!.isDirty).toBe(false);
    });

    it("generates unique sequential names", () => {
      const store = createTabStore();
      const id1 = store.createUntitledTab();
      const id2 = store.createUntitledTab();

      expect(id1).not.toBe(id2);
      const tabs = store.tabs();
      expect(tabs[0].fileName).not.toBe(tabs[1].fileName);
    });

    it("sets created tab as active", () => {
      const store = createTabStore();
      store.openTab("/a.md", "a.md", "a");
      const id = store.createUntitledTab();
      expect(store.activeTabId()).toBe(id);
    });

    it("respects MAX_TABS limit", () => {
      const store = createTabStore();
      for (let i = 0; i < 20; i++) {
        store.createUntitledTab();
      }
      expect(store.tabCount()).toBe(20);

      const id = store.createUntitledTab();
      expect(id).toBe("");
      expect(store.tabCount()).toBe(20);
    });

    it("does not reuse numbers after closing", () => {
      const store = createTabStore();
      const id1 = store.createUntitledTab();
      const name1 = store.activeTab()!.fileName;

      store.closeTab(id1);
      store.createUntitledTab();
      const name2 = store.activeTab()!.fileName;

      expect(name1).not.toBe(name2);
    });
  });

  describe("promoteToFile", () => {
    it("promotes untitled tab to file tab", () => {
      const store = createTabStore();
      const id = store.createUntitledTab();

      store.promoteToFile(id, "/saved.md", "saved.md");

      const tab = store.activeTab();
      expect(tab).not.toBeNull();
      expect(tab!.isUntitled).toBe(false);
      expect(tab!.filePath).toBe("/saved.md");
      expect(tab!.fileName).toBe("saved.md");
      expect(tab!.id).toBe("/saved.md");
      expect(tab!.isDirty).toBe(false);
    });

    it("updates activeTabId when promoting active tab", () => {
      const store = createTabStore();
      const id = store.createUntitledTab();
      expect(store.activeTabId()).toBe(id);

      store.promoteToFile(id, "/new.md", "new.md");
      expect(store.activeTabId()).toBe("/new.md");
    });
  });

  describe("openTab with isUntitled", () => {
    it("creates file tabs with isUntitled=false", () => {
      const store = createTabStore();
      store.openTab("/file.md", "file.md", "content");
      const tab = store.activeTab();
      expect(tab!.isUntitled).toBe(false);
    });

    it("duplicate check does not match untitled tabs", () => {
      const store = createTabStore();
      store.createUntitledTab();
      store.createUntitledTab();
      // Both should exist (untitled tabs don't have filePath collision)
      expect(store.tabCount()).toBe(2);
    });
  });
});
