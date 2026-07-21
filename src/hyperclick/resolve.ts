// Go-to-definition resolution. Pure and host-agnostic: given the text under a
// click, it resolves require() paths to Lua files, local symbols to their
// definition line, and LOVE API symbols to an api link. The provider adapter
// turns a Resolution into an editor action (open file, move cursor, show hover)
// or a notification when nothing resolves.

import { existsSync } from "fs";
import { join } from "path";

export interface Definition {
  line: number; // 1-based
  column: number; // 1-based
}

export type Resolution =
  | { kind: "file"; path: string }
  | { kind: "definition"; line: number; column: number }
  | { kind: "api"; path: string }
  | { kind: "missing" };

// Extracts the module string from a require('mod') / require("mod") call.
export function findRequireTarget(lineText: string): string | null {
  const match = /require\s*\(?\s*["']([^"']+)["']/.exec(lineText);
  return match ? (match[1] as string) : null;
}

// Resolves a dotted Lua module name to a file under one of the given roots.
// Tries both "mod/name.lua" and "mod/name/init.lua", matching Lua's loader.
export function resolveRequire(moduleName: string, roots: string[]): string | null {
  const relative = moduleName.replace(/\./g, "/");
  for (const root of roots) {
    const candidates = [join(root, relative + ".lua"), join(root, relative, "init.lua")];
    for (const candidate of candidates) {
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

// Finds the definition of a local function or variable within a source file.
export function resolveLocalDefinition(source: string, name: string): Definition | null {
  const escaped = escapeRegExp(name);
  const patterns = [
    new RegExp(`^\\s*local\\s+function\\s+${escaped}\\b`),
    new RegExp(`^\\s*function\\s+[\\w.:]*\\b${escaped}\\s*\\(`),
    new RegExp(`^\\s*local\\s+${escaped}\\s*=`),
    new RegExp(`^\\s*${escaped}\\s*=`),
  ];
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i] as string;
    if (patterns.some((p) => p.test(text))) {
      return { line: i + 1, column: text.indexOf(name) + 1 };
    }
  }
  return null;
}

// Orchestrates a click: require file first, then LOVE API symbol, then local
// definition, otherwise missing. isApiPath is injected so this stays decoupled
// from the dataset.
export function resolveClick(input: {
  lineText: string;
  word: string;
  dottedPath?: string;
  source: string;
  roots: string[];
  isApiPath: (path: string) => boolean;
}): Resolution {
  const requireTarget = findRequireTarget(input.lineText);
  if (requireTarget) {
    const path = resolveRequire(requireTarget, input.roots);
    return path ? { kind: "file", path } : { kind: "missing" };
  }

  if (input.dottedPath && input.isApiPath(input.dottedPath)) {
    return { kind: "api", path: input.dottedPath };
  }

  const def = resolveLocalDefinition(input.source, input.word);
  if (def) return { kind: "definition", line: def.line, column: def.column };

  return { kind: "missing" };
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
