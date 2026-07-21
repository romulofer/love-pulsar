import { describe, it, expect } from "bun:test";
import { Dataset } from "../src/api/dataset";
import { buildSuggestions, extractDottedPrefix } from "../src/autocomplete/provider";

const ds = Dataset.load();

describe("extractDottedPrefix", () => {
  it("reads the dotted identifier chain ending at the cursor", () => {
    expect(extractDottedPrefix("  love.gr")).toBe("love.gr");
    expect(extractDottedPrefix("local x = love.graphics.")).toBe("love.graphics.");
    expect(extractDottedPrefix("foo(love.audio.pl")).toBe("love.audio.pl");
  });

  it("returns empty when no identifier precedes the cursor", () => {
    expect(extractDottedPrefix("foo + ")).toBe("");
  });
});

describe("buildSuggestions", () => {
  it("suggests love.graphics for the prefix love.gr", () => {
    const names = buildSuggestions(ds, "love.gr").map((s) => s.text);
    expect(names).toContain("graphics");
  });

  it("suggests direct members after love.graphics.", () => {
    const names = buildSuggestions(ds, "love.graphics.").map((s) => s.text);
    expect(names).toContain("draw");
    expect(names).toContain("print");
    expect(names).toContain("rectangle");
    // grandchildren and the module itself are not members
    expect(names).not.toContain("graphics");
  });

  it("gives each suggestion a type, signature snippet, and description", () => {
    const suggestions = buildSuggestions(ds, "love.graphics.");
    expect(suggestions.length).toBeGreaterThan(0);
    for (const s of suggestions) {
      expect(["function", "module", "callback", "enum", "constant"]).toContain(s.type);
      expect(s.signature).toBeTruthy();
      expect(s.description).toBeTruthy();
    }
  });

  it("filters members by the partial segment after the last dot", () => {
    const names = buildSuggestions(ds, "love.graphics.pr").map((s) => s.text);
    expect(names).toContain("print");
    expect(names).not.toContain("draw");
  });

  it("returns nothing for a prefix that matches no API symbol", () => {
    expect(buildSuggestions(ds, "zzz.nope")).toHaveLength(0);
  });
});
