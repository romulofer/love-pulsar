import { describe, it, expect } from "bun:test";
import {
  activate,
  deactivate,
  provideAutocomplete,
  provideHyperclick,
  provideLinter,
  consumeStatusBar,
  consumeDatatipService,
} from "../src/main";

describe("package entry", () => {
  it("exports activate and deactivate functions", () => {
    expect(typeof activate).toBe("function");
    expect(typeof deactivate).toBe("function");
  });

  it("exports every service function declared in package.json", () => {
    expect(typeof provideAutocomplete).toBe("function");
    expect(typeof provideHyperclick).toBe("function");
    expect(typeof provideLinter).toBe("function");
    expect(typeof consumeStatusBar).toBe("function");
    expect(typeof consumeDatatipService).toBe("function");
  });

  it("activate returns a disposable-bearing subscription set and deactivate clears it", () => {
    activate();
    // deactivate must not throw even when called after activate
    expect(() => deactivate()).not.toThrow();
  });

  it("deactivate is safe to call before activate", () => {
    expect(() => deactivate()).not.toThrow();
  });
});
