import { describe, it, expect } from "bun:test";
import { join } from "path";
import { configSchema, resolveConfig, sourceRoots } from "../src/config";
import { resolveRequire } from "../src/hyperclick/resolve";

const GAME_ROOT = join(__dirname, "fixtures", "game");

describe("configSchema", () => {
  it("declares the settings Pulsar renders", () => {
    expect(configSchema.loveBinaryPath).toBeDefined();
    expect(configSchema.sourceDirs).toBeDefined();
  });
});

describe("resolveConfig", () => {
  it("falls back to the platform default binary when unset", () => {
    expect(resolveConfig({}, "linux").loveBinaryPath).toBe("love");
    expect(resolveConfig({ loveBinaryPath: "   " }, "darwin").loveBinaryPath).toContain("love.app");
  });

  it("respects an explicit binary path", () => {
    expect(resolveConfig({ loveBinaryPath: "/opt/love" }, "linux").loveBinaryPath).toBe("/opt/love");
  });

  it("defaults source dirs to the project root and respects overrides", () => {
    expect(resolveConfig({}, "linux").sourceDirs).toEqual(["."]);
    expect(resolveConfig({ sourceDirs: ["src", "lib"] }, "linux").sourceDirs).toEqual(["src", "lib"]);
  });
});

describe("sourceRoots", () => {
  it("resolves configured source dirs against the project root", () => {
    const config = resolveConfig({ sourceDirs: ["src", "lib"] }, "linux");
    expect(sourceRoots(config, "/proj")).toEqual([join("/proj", "src"), join("/proj", "lib")]);
  });
});

describe("config integration", () => {
  it("source dirs from config drive require resolution", () => {
    const config = resolveConfig({ sourceDirs: ["."] }, "linux");
    const roots = sourceRoots(config, GAME_ROOT);
    const resolved = resolveRequire("foo.bar", roots);
    expect(resolved).not.toBeNull();
    expect(resolved!.endsWith(join("foo", "bar.lua"))).toBe(true);
  });
});
