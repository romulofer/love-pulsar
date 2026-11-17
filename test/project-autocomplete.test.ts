import { describe, it, expect } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import {
  extractMemberPrefix,
  scanSymbols,
  scanMembers,
  moduleTable,
  projectSuggestions,
} from "../src/autocomplete/project";
import { suggestionsForLine } from "../src/host/adapters";
import { Dataset } from "../src/api/dataset";

const GAME_ROOT = join(__dirname, "fixtures", "game");
const mainSource = readFileSync(join(GAME_ROOT, "main.lua"), "utf8");

describe("extractMemberPrefix", () => {
  it("keeps . and : separators", () => {
    expect(extractMemberPrefix("  player.sp")).toBe("player.sp");
    expect(extractMemberPrefix("  Enemy:hu")).toBe("Enemy:hu");
    expect(extractMemberPrefix("foo(bar")).toBe("bar");
    expect(extractMemberPrefix("x = ")).toBe("");
  });
});

describe("scanSymbols", () => {
  const source = [
    "local speed, health = 10, 100",
    "local function greet(name, greeting)",
    "end",
    "function spawn(x, y) end",
    "local helper = function(a) end",
    "score = 0",
    "-- local commented = 1",
    "if speed == 1 then end",
  ].join("\n");
  const byName = new Map(scanSymbols(source).map((s) => [s.name, s]));

  it("finds functions with their parameters", () => {
    expect(byName.get("greet")?.signature).toBe("greet(name, greeting)");
    expect(byName.get("spawn")?.signature).toBe("spawn(x, y)");
    expect(byName.get("helper")?.type).toBe("function");
  });

  it("finds local and global variables, one per declared name", () => {
    expect(byName.get("speed")?.type).toBe("variable");
    expect(byName.get("health")?.type).toBe("variable");
    expect(byName.get("score")?.type).toBe("variable");
  });

  it("ignores comments and comparisons", () => {
    expect(byName.has("commented")).toBe(false);
    expect(byName.has("if")).toBe(false);
  });

  it("reports 1-based definition lines and can skip the cursor line", () => {
    expect(byName.get("greet")?.line).toBe(2);
    const skipped = scanSymbols(source, 2).map((s) => s.name);
    expect(skipped).not.toContain("greet");
  });
});

describe("scanMembers", () => {
  const source = [
    "local M = {}",
    "function M.hello(a) end",
    "function M:update(dt) end",
    "M.count = 0",
    "M.callback = function(x) end",
    "function Other.nope() end",
  ].join("\n");
  const byName = new Map(scanMembers(source, "M").map((s) => [s.name, s]));

  it("finds dot functions, colon methods and assigned fields", () => {
    expect(byName.get("hello")?.signature).toBe("M.hello(a)");
    expect(byName.get("update")?.type).toBe("method");
    expect(byName.get("update")?.signature).toBe("M:update(dt)");
    expect(byName.get("count")?.type).toBe("variable");
    expect(byName.get("callback")?.type).toBe("function");
  });

  it("ignores members of other tables", () => {
    expect(byName.has("nope")).toBe(false);
  });
});

describe("moduleTable", () => {
  it("returns the table a module returns", () => {
    expect(moduleTable("local M = {}\nreturn M\n")).toBe("M");
  });

  it("returns null when the module returns something else", () => {
    expect(moduleTable("return { a = 1 }\n")).toBeNull();
    expect(moduleTable("local x = 1\n")).toBeNull();
  });
});

describe("projectSuggestions", () => {
  const roots = [GAME_ROOT];

  it("suggests functions of the current file by prefix", () => {
    const names = projectSuggestions({ source: mainSource, lineBeforeCursor: "  gre", roots }).map(
      (s) => s.name,
    );
    expect(names).toContain("greet");
  });

  it("does not suggest the definition sitting on the cursor line", () => {
    const names = projectSuggestions({
      source: "local gre\n",
      lineBeforeCursor: "local gre",
      roots,
      cursorLine: 1,
    }).map((s) => s.name);
    expect(names).not.toContain("gre");
  });

  it("does not suggest a symbol identical to what was typed", () => {
    const names = projectSuggestions({ source: mainSource, lineBeforeCursor: "greet", roots }).map(
      (s) => s.name,
    );
    expect(names).not.toContain("greet");
  });

  it("suggests members of a required module", () => {
    const items = projectSuggestions({ source: mainSource, lineBeforeCursor: "  player.", roots, projectRoot: GAME_ROOT });
    const spawn = items.find((s) => s.name === "spawn");
    expect(spawn?.signature).toBe("player.spawn()");
    expect(spawn?.origin).toBe("player.lua:3");
  });

  it("follows dotted module names and renames the table to the local binding", () => {
    const items = projectSuggestions({ source: mainSource, lineBeforeCursor: "bar.he", roots, projectRoot: GAME_ROOT });
    expect(items.map((s) => s.signature)).toEqual(["bar.hello()"]);
    expect(items[0]?.origin).toBe("foo/bar.lua:3");
  });

  it("uses the absolute module path when no project root is given", () => {
    const items = projectSuggestions({ source: mainSource, lineBeforeCursor: "player.", roots });
    expect(items[0]?.origin).toBe(`${join(GAME_ROOT, "player.lua")}:3`);
  });

  it("suggests members of a table defined in the same file", () => {
    const source = "local Enemy = {}\nfunction Enemy:hurt(n) end\nfunction Enemy.new() end\n";
    const items = projectSuggestions({ source, lineBeforeCursor: "Enemy:", roots });
    expect(items.map((s) => s.name).sort()).toEqual(["hurt", "new"]);
  });

  it("offers only callable members after a colon", () => {
    const source = "local E = {}\nfunction E:hurt() end\nE.hp = 3\n";
    const items = projectSuggestions({ source, lineBeforeCursor: "E:", roots });
    expect(items.map((s) => s.name)).toEqual(["hurt"]);
  });

  it("returns nothing for unknown tables, missing modules and the love namespace", () => {
    expect(projectSuggestions({ source: mainSource, lineBeforeCursor: "nope.", roots })).toEqual([]);
    expect(
      projectSuggestions({ source: "local x = require('missing')\n", lineBeforeCursor: "x.", roots }),
    ).toEqual([]);
    expect(
      projectSuggestions({ source: "function love.load() end\n", lineBeforeCursor: "love.", roots }),
    ).toEqual([]);
  });
});

describe("suggestionsForLine with project context", () => {
  const ds = Dataset.load();

  it("merges LOVE API items with project items", () => {
    const source = "local lovely = 1\n";
    const items = suggestionsForLine(ds, "  lov", { source, roots: [GAME_ROOT] });
    const texts = items.map((i) => i.text);
    expect(texts).toContain("love");
    expect(texts).toContain("lovely");
  });

  it("maps project symbols to autocomplete-plus items", () => {
    const items = suggestionsForLine(ds, "  player.sp", { source: mainSource, roots: [GAME_ROOT] });
    expect(items).toEqual([
      {
        text: "spawn",
        type: "function",
        displayText: "spawn",
        rightLabel: expect.stringContaining("player.lua"),
        description: "player.spawn()",
      },
    ]);
  });

  it("keeps API-only behavior without a project context", () => {
    expect(suggestionsForLine(ds, "  player.sp")).toEqual([]);
  });
});
