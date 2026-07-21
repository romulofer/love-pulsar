import { describe, it, expect } from "bun:test";
import { Dataset } from "../src/api/dataset";
import { suggestionsForLine, hoverMarkdownForSymbol } from "../src/host/adapters";

const ds = Dataset.load();

describe("suggestionsForLine", () => {
  it("maps a line ending in a dotted prefix to autocomplete items", () => {
    const items = suggestionsForLine(ds, "  local g = love.gr");
    const texts = items.map((i) => i.text);
    expect(texts).toContain("graphics");
    for (const item of items) {
      expect(item.text).toBeTruthy();
      expect(item.type).toBeTruthy();
      expect(item.description).toBeTruthy();
    }
  });

  it("returns no items when the line has no love prefix", () => {
    expect(suggestionsForLine(ds, "local x = 1 + ")).toHaveLength(0);
  });
});

describe("hoverMarkdownForSymbol", () => {
  it("returns rendered markdown for a known symbol", () => {
    const md = hoverMarkdownForSymbol(ds, "love.graphics.draw");
    expect(md).not.toBeNull();
    expect(md!).toContain("love.graphics.draw");
  });

  it("returns null for an unknown symbol", () => {
    expect(hoverMarkdownForSymbol(ds, "love.nope")).toBeNull();
  });
});
