import { describe, it, expect } from "bun:test";
import { Dataset } from "../src/api/dataset";
import { lintSource } from "../src/lint/provider";

const ds = Dataset.load();

describe("lintSource", () => {
  it("returns no diagnostics for known LOVE API usage", () => {
    const src = "function love.draw()\n  love.graphics.draw(img, 0, 0)\nend\n";
    expect(lintSource(ds, src)).toEqual([]);
  });

  it("flags an unknown love.* symbol as a warning", () => {
    const src = "love.graphics.notARealFunction()\n";
    const diags = lintSource(ds, src);
    expect(diags).toHaveLength(1);
    expect(diags[0]!.severity).toBe("warning");
    expect(diags[0]!.message).toContain("love.graphics.notARealFunction");
  });

  it("reports 1-based line and a column range spanning the symbol", () => {
    const src = "local x = 1\nlove.bogus.thing()\n";
    const diags = lintSource(ds, src);
    expect(diags).toHaveLength(1);
    expect(diags[0]!.line).toBe(2);
    expect(diags[0]!.column).toBe(0);
    expect(diags[0]!.endColumn).toBe("love.bogus.thing".length);
  });

  it("ignores symbols inside line comments", () => {
    const src = "-- love.bogus.thing is fine in a comment\nlove.graphics.draw(img)\n";
    expect(lintSource(ds, src)).toEqual([]);
  });

  it("accepts a bare namespace prefix of a known symbol", () => {
    const src = "local g = love.graphics\n";
    expect(lintSource(ds, src)).toEqual([]);
  });

  it("does not flag real API across modules (regression: full dataset)", () => {
    const src = [
      'love.window.setTitle("Hello World - Love2D")',
      "love.timer.getFPS()",
      "love.keyboard.isDown('space')",
      "love.filesystem.read('save.txt')",
      "love.math.random()",
    ].join("\n");
    expect(lintSource(ds, src)).toEqual([]);
  });
});
