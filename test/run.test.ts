import { describe, it, expect } from "bun:test";
import { join } from "path";
import {
  findProjectRoot,
  defaultLoveBinary,
  buildRunCommand,
  LoveRunner,
  type ChildProcessLike,
  type SpawnFn,
} from "../src/run/runner";
import { parseErrorLocations } from "../src/run/console";

const GAME_ROOT = join(__dirname, "fixtures", "game");

describe("findProjectRoot", () => {
  it("returns the directory that directly contains main.lua", () => {
    expect(findProjectRoot(GAME_ROOT)).toBe(GAME_ROOT);
  });

  it("walks up ancestors to find the nearest main.lua", () => {
    expect(findProjectRoot(join(GAME_ROOT, "foo"))).toBe(GAME_ROOT);
  });

  it("returns null when no ancestor contains main.lua", () => {
    expect(findProjectRoot(join(GAME_ROOT, "..", ".."))).toBeNull();
  });
});

describe("defaultLoveBinary", () => {
  it("uses the app bundle path on macOS", () => {
    expect(defaultLoveBinary("darwin")).toContain("love.app");
  });

  it("uses love.exe on Windows", () => {
    expect(defaultLoveBinary("win32")).toBe("love.exe");
  });

  it("falls back to love on the PATH elsewhere", () => {
    expect(defaultLoveBinary("linux")).toBe("love");
  });
});

describe("buildRunCommand", () => {
  it("passes the project root as the sole argument", () => {
    const cmd = buildRunCommand("love", GAME_ROOT);
    expect(cmd.command).toBe("love");
    expect(cmd.args).toEqual([GAME_ROOT]);
  });
});

describe("parseErrorLocations", () => {
  it("extracts file and line from a LOVE runtime error", () => {
    const output = [
      "Error: main.lua:10: attempt to index a nil value (global 'foo')",
      "stack traceback:",
      "\t[C]: in function 'error'",
      "\tplayer.lua:4: in function 'spawn'",
    ].join("\n");
    const locs = parseErrorLocations(output);
    expect(locs.some((l) => l.file === "main.lua" && l.line === 10)).toBe(true);
    expect(locs.some((l) => l.file === "player.lua" && l.line === 4)).toBe(true);
  });

  it("returns nothing for output with no file:line", () => {
    expect(parseErrorLocations("just some plain text")).toHaveLength(0);
  });
});

describe("LoveRunner", () => {
  function fakeSpawn() {
    const handlers: Record<string, (arg: unknown) => void> = {};
    let killed = false;
    const child: ChildProcessLike = {
      on: (event, cb) => {
        handlers[event] = cb as (arg: unknown) => void;
      },
      kill: () => {
        killed = true;
      },
    };
    const spawn: SpawnFn = () => child;
    return { spawn, child, handlers, wasKilled: () => killed };
  }

  function fakeNotifier() {
    const messages: string[] = [];
    return {
      notifier: {
        info: (m: string) => messages.push(`info:${m}`),
        warn: (m: string) => messages.push(`warn:${m}`),
        error: (m: string) => messages.push(`error:${m}`),
      },
      messages,
    };
  }

  it("marks itself running after run and clears on stop", () => {
    const { spawn } = fakeSpawn();
    const { notifier } = fakeNotifier();
    const runner = new LoveRunner(spawn, notifier);
    runner.run("love", GAME_ROOT);
    expect(runner.running).toBe(true);
    runner.stop();
    expect(runner.running).toBe(false);
  });

  it("kills the child process on stop", () => {
    const { spawn, wasKilled } = fakeSpawn();
    const { notifier } = fakeNotifier();
    const runner = new LoveRunner(spawn, notifier);
    runner.run("love", GAME_ROOT);
    runner.stop();
    expect(wasKilled()).toBe(true);
  });

  it("notifies with a clear message when the binary is missing (ENOENT)", () => {
    const { spawn, handlers } = fakeSpawn();
    const { notifier, messages } = fakeNotifier();
    const runner = new LoveRunner(spawn, notifier);
    runner.run("love", GAME_ROOT);
    handlers["error"]?.({ code: "ENOENT", message: "spawn love ENOENT" });
    expect(messages.some((m) => m.startsWith("error:") && m.includes("not found"))).toBe(true);
  });
});
