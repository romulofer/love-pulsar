import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import {
  resolveRequire,
  resolveLocalDefinition,
  findRequireTarget,
  resolveClick,
} from "../src/hyperclick/resolve";
import { performResolution, type NavigationHost } from "../src/hyperclick/provider";

function fakeHost() {
  const calls: string[] = [];
  const host: NavigationHost = {
    openFile: (p) => calls.push(`open:${p}`),
    openFileAt: (p, l, c) => calls.push(`openAt:${p}:${l}:${c}`),
    moveCursor: (l, c) => calls.push(`move:${l}:${c}`),
    showApiReference: (p) => calls.push(`api:${p}`),
    notifier: {
      info: (m) => calls.push(`info:${m}`),
      warn: (m) => calls.push(`warn:${m}`),
      error: (m) => calls.push(`error:${m}`),
    },
  };
  return { host, calls };
}

const GAME_ROOT = join(__dirname, "fixtures", "game");
const mainSource = readFileSync(join(GAME_ROOT, "main.lua"), "utf8");

describe("findRequireTarget", () => {
  it("extracts the module string from a require call", () => {
    expect(findRequireTarget("local bar = require('foo.bar')")).toBe("foo.bar");
    expect(findRequireTarget('local p = require("player")')).toBe("player");
  });

  it("returns null for a line with no require", () => {
    expect(findRequireTarget("local x = 1")).toBeNull();
  });
});

describe("resolveRequire", () => {
  it("resolves a dotted module to its lua file under a root", () => {
    const resolved = resolveRequire("foo.bar", [GAME_ROOT]);
    expect(resolved).not.toBeNull();
    expect(resolved!.endsWith(join("foo", "bar.lua"))).toBe(true);
    expect(existsSync(resolved!)).toBe(true);
  });

  it("returns null when no root contains the module", () => {
    expect(resolveRequire("missing.mod", [GAME_ROOT])).toBeNull();
  });
});

describe("resolveLocalDefinition", () => {
  it("finds a local function definition line", () => {
    const def = resolveLocalDefinition(mainSource, "greet");
    expect(def).not.toBeNull();
    // "local function greet" is on line 9 of the fixture
    expect(def!.line).toBe(9);
  });

  it("returns null for an undefined symbol", () => {
    expect(resolveLocalDefinition(mainSource, "nonexistent")).toBeNull();
  });
});

describe("resolveClick", () => {
  const isApiPath = (p: string) => p === "love.graphics" || p === "love.load";

  it("resolves a require click to a file", () => {
    const r = resolveClick({
      lineText: "local bar = require('foo.bar')",
      word: "bar",
      source: mainSource,
      roots: [GAME_ROOT],
      isApiPath,
    });
    expect(r.kind).toBe("file");
    if (r.kind === "file") expect(existsSync(r.path)).toBe(true);
  });

  it("resolves an API dotted path to an api link", () => {
    const r = resolveClick({
      lineText: "  love.graphics.draw(img, 0, 0)",
      word: "graphics",
      dottedPath: "love.graphics",
      source: mainSource,
      roots: [GAME_ROOT],
      isApiPath,
    });
    expect(r.kind).toBe("api");
  });

  it("resolves a local symbol click to its definition", () => {
    const r = resolveClick({
      lineText: "  greet()",
      word: "greet",
      source: mainSource,
      roots: [GAME_ROOT],
      isApiPath,
    });
    expect(r.kind).toBe("definition");
    if (r.kind === "definition") expect(r.line).toBe(9);
  });

  it("resolves a Module.member click to the definition in the required file", () => {
    const r = resolveClick({
      lineText: "  player.spawn()",
      word: "spawn",
      dottedPath: "player.spawn",
      source: mainSource,
      roots: [GAME_ROOT],
      isApiPath,
    });
    expect(r.kind).toBe("definition");
    if (r.kind === "definition") {
      expect(r.path).toBe(join(GAME_ROOT, "player.lua"));
      // "function player.spawn()" is on line 3 of player.lua
      expect(r.line).toBe(3);
    }
  });

  it("reports missing when nothing resolves", () => {
    const r = resolveClick({
      lineText: "  wat()",
      word: "wat",
      source: mainSource,
      roots: [GAME_ROOT],
      isApiPath,
    });
    expect(r.kind).toBe("missing");
  });
});

describe("performResolution", () => {
  it("opens the file for a file resolution", () => {
    const { host, calls } = fakeHost();
    performResolution({ kind: "file", path: "/x/foo.lua" }, host);
    expect(calls).toEqual(["open:/x/foo.lua"]);
  });

  it("moves the cursor for a same-file definition resolution", () => {
    const { host, calls } = fakeHost();
    performResolution({ kind: "definition", line: 9, column: 16 }, host);
    expect(calls).toEqual(["move:9:16"]);
  });

  it("opens the file and moves the cursor for a cross-file definition resolution", () => {
    const { host, calls } = fakeHost();
    performResolution({ kind: "definition", path: "/x/player.lua", line: 3, column: 12 }, host);
    expect(calls).toEqual(["openAt:/x/player.lua:3:12"]);
  });

  it("shows the api reference for an api resolution", () => {
    const { host, calls } = fakeHost();
    performResolution({ kind: "api", path: "love.graphics" }, host);
    expect(calls).toEqual(["api:love.graphics"]);
  });

  it("warns via the notifier and does not throw on a missing resolution", () => {
    const { host, calls } = fakeHost();
    expect(() => performResolution({ kind: "missing" }, host)).not.toThrow();
    expect(calls[0]?.startsWith("warn:")).toBe(true);
  });
});
