// Launches and manages a LOVE process. The spawn function is injected so the
// pure launch logic (project-root discovery, binary defaults, command building)
// and lifecycle handling are testable without actually starting a process. The
// Pulsar adapter injects a real child_process.spawn.

import { existsSync } from "fs";
import { dirname, join } from "path";
import type { Notifier } from "../host/types";

export interface ChildProcessLike {
  on(event: "error" | "exit", listener: (arg: unknown) => void): void;
  kill(): void;
}

export type SpawnFn = (command: string, args: string[]) => ChildProcessLike;

interface SpawnError {
  code?: string;
  message?: string;
}

// Walks up from startDir to the nearest ancestor containing main.lua.
export function findProjectRoot(startDir: string): string | null {
  let dir = startDir;
  for (;;) {
    if (existsSync(join(dir, "main.lua"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null; // reached the filesystem root
    dir = parent;
  }
}

// Sensible per-platform default for the LOVE binary. Overridable via settings.
export function defaultLoveBinary(platform: NodeJS.Platform): string {
  switch (platform) {
    case "darwin":
      return "/Applications/love.app/Contents/MacOS/love";
    case "win32":
      return "love.exe";
    default:
      return "love"; // resolved from PATH on Linux and others
  }
}

export function buildRunCommand(
  binary: string,
  projectRoot: string
): { command: string; args: string[] } {
  return { command: binary, args: [projectRoot] };
}

export class LoveRunner {
  private child: ChildProcessLike | null = null;

  constructor(private readonly spawnFn: SpawnFn, private readonly notifier: Notifier) {}

  run(binary: string, projectRoot: string): void {
    const { command, args } = buildRunCommand(binary, projectRoot);
    const child = this.spawnFn(command, args);

    child.on("error", (arg) => {
      const err = arg as SpawnError;
      if (err?.code === "ENOENT") {
        this.notifier.error(
          `love-pulsar: LOVE binary not found at "${command}". Set the path in settings.`
        );
      } else {
        this.notifier.error(`love-pulsar: failed to launch LOVE: ${err?.message ?? String(arg)}`);
      }
      this.child = null;
    });

    child.on("exit", () => {
      this.child = null;
    });

    this.child = child;
  }

  stop(): void {
    this.child?.kill();
    this.child = null;
  }

  get running(): boolean {
    return this.child !== null;
  }
}
