import { describe, it, expect } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import { Dataset } from "../src/api/dataset";

describe("Dataset.load", () => {
  it("loads the bundled dataset synchronously with no network", () => {
    const ds = Dataset.load();
    expect(ds.all().length).toBeGreaterThan(0);
  });
});

describe("Dataset.lookup", () => {
  const ds = Dataset.load();

  it("returns a full entry for love.graphics.draw", () => {
    const entry = ds.lookup("love.graphics.draw");
    expect(entry).toBeDefined();
    expect(entry!.kind).toBe("function");
    expect(entry!.signature).toBeTruthy();
    expect(Array.isArray(entry!.params)).toBe(true);
    expect(entry!.description).toBeTruthy();
  });

  it("returns undefined for an unknown path", () => {
    expect(ds.lookup("love.nope.missing")).toBeUndefined();
  });
});

describe("Dataset.query (prefix search)", () => {
  const ds = Dataset.load();

  it("returns love.graphics for the prefix love.gr", () => {
    const paths = ds.query("love.gr").map((e) => e.path);
    expect(paths).toContain("love.graphics");
  });

  it("returns nothing for a non-matching prefix", () => {
    expect(ds.query("zzz.nope")).toHaveLength(0);
  });
});

describe("Dataset.membersOf", () => {
  const ds = Dataset.load();

  it("returns direct children of love.graphics", () => {
    const members = ds.membersOf("love.graphics").map((e) => e.name);
    expect(members).toContain("draw");
    expect(members).toContain("print");
  });

  it("excludes deeper descendants and the parent itself", () => {
    const paths = ds.membersOf("love").map((e) => e.path);
    expect(paths).toContain("love.graphics");
    // direct child only: love.graphics.draw is a grandchild, must be excluded
    expect(paths).not.toContain("love.graphics.draw");
    expect(paths).not.toContain("love");
  });
});

describe("Dataset.deprecation", () => {
  const ds = Dataset.load();

  it("knows deprecated symbols that the API description omits", () => {
    expect(ds.lookup("love.filesystem.exists")).toBeUndefined();
    expect(ds.deprecation("love.filesystem.exists")).toEqual({
      since: "11.0",
      replacement: "love.filesystem.getInfo",
    });
  });

  it("returns undefined for current symbols", () => {
    expect(ds.deprecation("love.filesystem.getInfo")).toBeUndefined();
  });

  it("points every replacement at a real API symbol", () => {
    const file = join(__dirname, "..", "data", "deprecated.json");
    for (const path of Object.keys(JSON.parse(readFileSync(file, "utf8")))) {
      const replacement = ds.deprecation(path)?.replacement;
      if (replacement) expect(ds.lookup(replacement)).toBeDefined();
    }
  });
});
