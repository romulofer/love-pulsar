import { describe, it, expect } from "bun:test";
import { parseLoveVersion, versionMismatchMessage } from "../src/api/version";
import { Dataset, UNKNOWN_VERSION } from "../src/api/dataset";

describe("parseLoveVersion", () => {
  it("reads the version from love --version output", () => {
    expect(parseLoveVersion("LOVE 11.5 (Mysterious Mysteries)")).toEqual({ major: 11, minor: 5 });
  });

  it("reads bare and patch versions", () => {
    expect(parseLoveVersion("11.5")).toEqual({ major: 11, minor: 5 });
    expect(parseLoveVersion("0.10.2")).toEqual({ major: 0, minor: 10 });
  });

  it("returns null when there is no version", () => {
    expect(parseLoveVersion("command not found")).toBeNull();
  });
});

describe("versionMismatchMessage", () => {
  it("is silent when major.minor match", () => {
    expect(versionMismatchMessage("LOVE 11.5 (x)", "11.5")).toBeNull();
    expect(versionMismatchMessage("LOVE 11.5.1 (x)", "11.5")).toBeNull();
  });

  it("warns when they differ", () => {
    const message = versionMismatchMessage("LOVE 12.0 (x)", "11.5");
    expect(message).toContain("12.0");
    expect(message).toContain("11.5");
  });

  it("is silent when either side is unknown", () => {
    expect(versionMismatchMessage("garbage", "11.5")).toBeNull();
    expect(versionMismatchMessage("LOVE 11.5", UNKNOWN_VERSION)).toBeNull();
  });
});

describe("bundled dataset version", () => {
  it("records the LOVE version it describes", () => {
    expect(Dataset.load().loveVersion).toMatch(/^\d+\.\d+/);
  });

  it("still loads a bare array dataset as unknown version", () => {
    const ds = Dataset.fromJson('[{"path":"love","name":"love","kind":"module"}]');
    expect(ds.loveVersion).toBe(UNKNOWN_VERSION);
    expect(ds.lookup("love")).toBeDefined();
  });
});
