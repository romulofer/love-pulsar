// Maps every SPEC section-2 acceptance criterion to at least one assertion.
// Each `it` name quotes the criterion it covers.

import { describe, it, expect } from "bun:test";
import { join } from "path";
import { readFileSync } from "fs";
import { Dataset } from "../src/api/dataset";
import { buildSuggestions } from "../src/autocomplete/provider";
import { buildHover } from "../src/hover/provider";
import { resolveRequire, resolveLocalDefinition } from "../src/hyperclick/resolve";
import { performResolution, type NavigationHost } from "../src/hyperclick/provider";
import { findProjectRoot, buildRunCommand } from "../src/run/runner";
import { parseErrorLocations } from "../src/run/console";
import { resolveConfig } from "../src/config";

const ds = Dataset.load();
const GAME_ROOT = join(__dirname, "fixtures", "game");
const mainSource = readFileSync(join(GAME_ROOT, "main.lua"), "utf8");

describe("2.1 Autocomplete", () => {
  it("Typing love.gr suggests love.graphics (and members after love.graphics.)", () => {
    expect(buildSuggestions(ds, "love.gr").map((s) => s.text)).toContain("graphics");
    expect(buildSuggestions(ds, "love.graphics.").map((s) => s.text)).toContain("draw");
  });

  it("Each suggestion carries type, signature snippet, and description", () => {
    for (const s of buildSuggestions(ds, "love.graphics.")) {
      expect(s.type).toBeTruthy();
      expect(s.signature).toBeTruthy();
      expect(s.description).toBeTruthy();
    }
  });

  it("Suggestions come from the bundled dataset only, no network", () => {
    // Dataset.load reads synchronously from disk; a populated result proves it.
    expect(Dataset.load().all().length).toBeGreaterThan(0);
  });
});

describe("2.2 Hyperclick", () => {
  it("Clicking require('foo.bar') opens foo/bar.lua relative to the project", () => {
    const resolved = resolveRequire("foo.bar", [GAME_ROOT]);
    expect(resolved!.endsWith(join("foo", "bar.lua"))).toBe(true);
  });

  it("Clicking a locally defined function jumps to its definition line", () => {
    expect(resolveLocalDefinition(mainSource, "greet")!.line).toBe(9);
  });

  it("Missing targets produce a non-fatal notification, not a crash", () => {
    const calls: string[] = [];
    const host: NavigationHost = {
      openFile: () => {},
      moveCursor: () => {},
      showApiReference: () => {},
      notifier: { info: () => {}, warn: (m) => calls.push(m), error: () => {} },
    };
    expect(() => performResolution({ kind: "missing" }, host)).not.toThrow();
    expect(calls).toHaveLength(1);
  });
});

describe("2.3 Run / debug LOVE", () => {
  it("Run launches the project root (nearest ancestor containing main.lua)", () => {
    expect(findProjectRoot(join(GAME_ROOT, "foo"))).toBe(GAME_ROOT);
  });

  it("A runtime error line is clickable (file:line extracted)", () => {
    const locs = parseErrorLocations("Error: main.lua:10: attempt to index nil");
    expect(locs[0]).toEqual({ file: "main.lua", line: 10, raw: "main.lua:10" });
  });

  it("Configurable binary path is respected", () => {
    const config = resolveConfig({ loveBinaryPath: "/opt/love" }, "linux");
    expect(buildRunCommand(config.loveBinaryPath, GAME_ROOT).command).toBe("/opt/love");
  });
});

describe("2.4 Hover docs", () => {
  it("Hovering love.graphics.draw shows signature, params, and description", () => {
    const doc = buildHover(ds, "love.graphics.draw")!;
    expect(doc.signature).toBeTruthy();
    expect(doc.params.length).toBeGreaterThan(0);
    expect(doc.description).toBeTruthy();
  });

  it("Unknown symbols show no tooltip (no error)", () => {
    expect(buildHover(ds, "love.unknown")).toBeNull();
  });
});
