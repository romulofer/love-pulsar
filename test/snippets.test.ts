import { describe, it, expect } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import { Dataset } from "../src/api/dataset";

interface Snippet {
  prefix: string;
  body: string;
  description?: string;
}

const file = JSON.parse(readFileSync(join(__dirname, "..", "snippets", "love.json"), "utf8")) as {
  [scope: string]: Record<string, Snippet>;
};
const snippets = file[".source.lua"] as Record<string, Snippet>;
const ds = Dataset.load();

describe("snippets/love.json", () => {
  it("targets Lua only", () => {
    expect(Object.keys(file)).toEqual([".source.lua"]);
  });

  it("gives every snippet a unique prefix and a body", () => {
    const prefixes = Object.values(snippets).map((s) => s.prefix);
    expect(new Set(prefixes).size).toBe(prefixes.length);
    for (const s of Object.values(snippets)) expect(s.body).toBeTruthy();
  });

  it("uses tabs, never spaces, for indentation", () => {
    for (const s of Object.values(snippets)) expect(s.body).not.toMatch(/\n +\S/);
  });

  it("has a snippet for each common callback, matching the API parameters", () => {
    for (const path of ["love.load", "love.update", "love.draw", "love.keypressed", "love.mousepressed"]) {
      const entry = ds.lookup(path);
      const snippet = snippets[path];
      expect(entry).toBeDefined();
      expect(snippet).toBeDefined();
      const args = (entry?.params ?? []).map((p, i) => `\${${i + 1}:${p.name}}`).join(", ");
      expect(snippet?.body).toBe(`function ${path}(${args})\n\t$0\nend`);
    }
  });

  it("only names callbacks that exist in the dataset", () => {
    for (const key of Object.keys(snippets)) {
      if (!key.startsWith("love.")) continue;
      if (key === "love.conf") continue;
      expect(ds.lookup(key)?.kind).toBe("callback");
    }
  });
});
