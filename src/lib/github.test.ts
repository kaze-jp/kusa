import { describe, it, expect } from "vitest";
import {
  isGitHubShorthand,
  isGitHubUrl,
  isUrl,
  parseGitHubShorthand,
  parseGitHubUrl,
} from "./github";

describe("isGitHubShorthand", () => {
  it("returns true for gh: prefix", () => {
    expect(isGitHubShorthand("gh:owner/repo")).toBe(true);
    expect(isGitHubShorthand("gh:owner/repo/README.md")).toBe(true);
  });

  it("returns false for non-gh: strings", () => {
    expect(isGitHubShorthand("https://github.com/owner/repo")).toBe(false);
    expect(isGitHubShorthand("owner/repo")).toBe(false);
    expect(isGitHubShorthand("")).toBe(false);
  });
});

describe("isGitHubUrl", () => {
  it("returns true for github.com URLs", () => {
    expect(isGitHubUrl("https://github.com/owner/repo")).toBe(true);
    expect(
      isGitHubUrl("https://github.com/owner/repo/blob/main/README.md"),
    ).toBe(true);
  });

  it("returns false for non-GitHub URLs", () => {
    expect(isGitHubUrl("https://example.com/file.md")).toBe(false);
    expect(
      isGitHubUrl("https://raw.githubusercontent.com/owner/repo/main/file.md"),
    ).toBe(false);
  });

  it("returns false for non-URLs", () => {
    expect(isGitHubUrl("gh:owner/repo")).toBe(false);
    expect(isGitHubUrl("not a url")).toBe(false);
  });
});

describe("isUrl", () => {
  it("returns true for http/https URLs", () => {
    expect(isUrl("https://example.com")).toBe(true);
    expect(isUrl("http://example.com")).toBe(true);
  });

  it("returns false for non-URLs", () => {
    expect(isUrl("gh:owner/repo")).toBe(false);
    expect(isUrl("file:///path")).toBe(false);
    expect(isUrl("/local/path")).toBe(false);
    expect(isUrl("")).toBe(false);
  });
});

describe("parseGitHubShorthand", () => {
  it("parses gh:owner/repo/path/to/file.md", () => {
    const result = parseGitHubShorthand("gh:solidjs/solid/README.md");
    expect(result).not.toBeNull();
    expect(result!.owner).toBe("solidjs");
    expect(result!.repo).toBe("solid");
    expect(result!.path).toBe("README.md");
    expect(result!.apiUrl).toBe(
      "https://api.github.com/repos/solidjs/solid/contents/README.md",
    );
    expect(result!.displayTitle).toBe("gh:solidjs/solid/README.md");
  });

  it("defaults to README.md when no path given", () => {
    const result = parseGitHubShorthand("gh:solidjs/solid");
    expect(result).not.toBeNull();
    expect(result!.owner).toBe("solidjs");
    expect(result!.repo).toBe("solid");
    expect(result!.path).toBe("README.md");
    expect(result!.apiUrl).toBe(
      "https://api.github.com/repos/solidjs/solid/contents/README.md",
    );
    expect(result!.displayTitle).toBe("gh:solidjs/solid/README.md");
  });

  it("handles nested paths", () => {
    const result = parseGitHubShorthand(
      "gh:owner/repo/docs/guide/getting-started.md",
    );
    expect(result).not.toBeNull();
    expect(result!.path).toBe("docs/guide/getting-started.md");
    expect(result!.apiUrl).toBe(
      "https://api.github.com/repos/owner/repo/contents/docs/guide/getting-started.md",
    );
  });

  it("returns null for invalid formats", () => {
    expect(parseGitHubShorthand("gh:")).toBeNull();
    expect(parseGitHubShorthand("gh:owner")).toBeNull();
    expect(parseGitHubShorthand("gh:/owner/repo")).toBeNull();
    expect(parseGitHubShorthand("not-a-shorthand")).toBeNull();
    expect(parseGitHubShorthand("")).toBeNull();
  });
});

describe("parseGitHubUrl", () => {
  it("parses blob URL with branch", () => {
    const result = parseGitHubUrl(
      "https://github.com/solidjs/solid/blob/main/README.md",
    );
    expect(result).not.toBeNull();
    expect(result!.owner).toBe("solidjs");
    expect(result!.repo).toBe("solid");
    expect(result!.path).toBe("README.md");
    expect(result!.branch).toBe("main");
    expect(result!.apiUrl).toBe(
      "https://api.github.com/repos/solidjs/solid/contents/README.md?ref=main",
    );
    expect(result!.displayTitle).toBe("gh:solidjs/solid/README.md");
  });

  it("parses repo URL without path (defaults to README.md)", () => {
    const result = parseGitHubUrl("https://github.com/solidjs/solid");
    expect(result).not.toBeNull();
    expect(result!.owner).toBe("solidjs");
    expect(result!.repo).toBe("solid");
    expect(result!.path).toBe("README.md");
    expect(result!.apiUrl).toBe(
      "https://api.github.com/repos/solidjs/solid/contents/README.md",
    );
  });

  it("parses tree URL", () => {
    const result = parseGitHubUrl(
      "https://github.com/owner/repo/tree/develop/docs/file.md",
    );
    expect(result).not.toBeNull();
    expect(result!.branch).toBe("develop");
    expect(result!.path).toBe("docs/file.md");
  });

  it("returns null for non-GitHub URLs", () => {
    expect(parseGitHubUrl("https://example.com/file.md")).toBeNull();
    expect(parseGitHubUrl("not a url")).toBeNull();
  });

  it("returns null for incomplete GitHub URLs", () => {
    expect(parseGitHubUrl("https://github.com/")).toBeNull();
    expect(parseGitHubUrl("https://github.com/owner")).toBeNull();
  });

  it("returns null for unsupported GitHub URL patterns", () => {
    // e.g. /owner/repo/issues/123 - not a file path
    expect(
      parseGitHubUrl("https://github.com/owner/repo/issues/123"),
    ).toBeNull();
    expect(
      parseGitHubUrl("https://github.com/owner/repo/pull/456"),
    ).toBeNull();
  });
});
