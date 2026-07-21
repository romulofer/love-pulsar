// Host wiring for go-to-definition. Thin: it turns a Resolution into a concrete
// editor action through an injected NavigationHost, and surfaces a notification
// (never a throw) when nothing resolves. The NavigationHost is implemented by
// the Pulsar adapter in main.ts; tests supply a fake.

import type { Resolution } from "./resolve";
import type { Notifier } from "../host/types";

export interface NavigationHost {
  openFile(path: string): void;
  moveCursor(line: number, column: number): void;
  showApiReference(path: string): void;
  notifier: Notifier;
}

export function performResolution(resolution: Resolution, host: NavigationHost): void {
  switch (resolution.kind) {
    case "file":
      host.openFile(resolution.path);
      return;
    case "definition":
      host.moveCursor(resolution.line, resolution.column);
      return;
    case "api":
      host.showApiReference(resolution.path);
      return;
    case "missing":
      host.notifier.warn("love-pulsar: could not resolve the target under the cursor.");
      return;
  }
}
