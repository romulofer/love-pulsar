import { describe, it, expect } from "bun:test";
import { loveSymbolAt } from "../src/hover/token";

describe("loveSymbolAt", () => {
  const line = '  love.window.setTitle("hi")';
  const col = line.indexOf("setTitle") + 2; // inside "setTitle"

  it("expands over the full dotted love.* path around the column", () => {
    const span = loveSymbolAt(line, col);
    expect(span).not.toBeNull();
    expect(span!.path).toBe("love.window.setTitle");
    expect(line.slice(span!.start, span!.end)).toBe("love.window.setTitle");
  });

  it("returns null when the token is not a love.* symbol", () => {
    const other = "local title = 42";
    expect(loveSymbolAt(other, 8)).toBeNull();
  });

  it("returns null in empty space", () => {
    expect(loveSymbolAt("   ", 1)).toBeNull();
  });
});
