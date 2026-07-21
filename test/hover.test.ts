import { describe, it, expect } from "bun:test";
import { Dataset } from "../src/api/dataset";
import { buildHover, renderHoverMarkdown } from "../src/hover/provider";

const ds = Dataset.load();

describe("buildHover", () => {
  it("returns signature, params, returns, and description for a known symbol", () => {
    const doc = buildHover(ds, "love.graphics.draw");
    expect(doc).not.toBeNull();
    expect(doc!.signature).toBeTruthy();
    expect(doc!.description).toBeTruthy();
    expect(doc!.params.map((p) => p.name)).toContain("drawable");
    expect(Array.isArray(doc!.returns)).toBe(true);
  });

  it("returns null for an unknown symbol", () => {
    expect(buildHover(ds, "love.nope.missing")).toBeNull();
  });
});

describe("renderHoverMarkdown", () => {
  it("renders signature, each parameter, and the description", () => {
    const doc = buildHover(ds, "love.graphics.draw")!;
    const md = renderHoverMarkdown(doc);
    expect(md).toContain("love.graphics.draw");
    expect(md).toContain("drawable");
    expect(md).toContain("Draws a Drawable");
  });

  it("never emits an em dash", () => {
    const doc = buildHover(ds, "love.graphics.draw")!;
    expect(renderHoverMarkdown(doc)).not.toContain("—");
  });

  it("renders a module with no params without error", () => {
    const doc = buildHover(ds, "love.graphics")!;
    expect(doc).not.toBeNull();
    const md = renderHoverMarkdown(doc);
    expect(md).toContain("love.graphics");
  });
});
