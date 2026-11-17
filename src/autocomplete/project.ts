// Autocomplete for symbols defined in the user's own Lua code: functions and
// variables in the current buffer, and the members of a table or of a module
// brought in with `local mod = require("mod")`. Pure and host-agnostic: it works
// on source text and the filesystem only. Scanning is line-based and
// intentionally approximate; it favours useful suggestions over full Lua parsing.

import { readFileSync } from "fs";
import { relative } from "path";
import { findLocalRequireBinding, resolveRequire } from "../hyperclick/resolve";

export type ProjectSymbolType = "function" | "method" | "variable";

export interface ProjectSymbol {
  name: string;
  type: ProjectSymbolType;
  // Call signature for functions and methods, the bare name for variables.
  signature: string;
  // 1-based line of the definition.
  line: number;
}

export interface ProjectSuggestion extends ProjectSymbol {
  // Where the symbol comes from, e.g. "player.lua:12" or "this file:12".
  origin: string;
}

const KEYWORDS = new Set([
  "and", "break", "do", "else", "elseif", "end", "false", "for", "function", "goto", "if",
  "in", "local", "nil", "not", "or", "repeat", "return", "then", "true", "until", "while",
]);

const IDENT = "[A-Za-z_][A-Za-z0-9_]*";
const SEPARATOR_CHAR = /[A-Za-z0-9_.:]/;

// Reads backward from the cursor collecting an identifier chain that may use
// `.` or `:` separators. "  Player:mo" -> "Player:mo".
export function extractMemberPrefix(line: string): string {
  let start = line.length;
  while (start > 0 && SEPARATOR_CHAR.test(line[start - 1] as string)) start--;
  return line.slice(start);
}

function stripComment(line: string): string {
  const idx = line.indexOf("--");
  return idx === -1 ? line : line.slice(0, idx);
}

function params(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Functions and variables declared at line start in a buffer. Local variables
// declared with `local a, b = ...` yield one symbol per name.
export function scanSymbols(source: string, skipLine?: number): ProjectSymbol[] {
  const found = new Map<string, ProjectSymbol>();
  const add = (symbol: ProjectSymbol) => {
    if (KEYWORDS.has(symbol.name) || found.has(symbol.name)) return;
    found.set(symbol.name, symbol);
  };

  const localFn = new RegExp(`^local\\s+function\\s+(${IDENT})\\s*\\(([^)]*)\\)`);
  const globalFn = new RegExp(`^function\\s+(${IDENT})\\s*\\(([^)]*)\\)`);
  const assignedFn = new RegExp(`^(?:local\\s+)?(${IDENT})\\s*=\\s*function\\s*\\(([^)]*)\\)`);
  const localVars = new RegExp(`^local\\s+(${IDENT}(?:\\s*,\\s*${IDENT})*)\\s*(?:<\\w+>\\s*)?(?:=|$)`);
  const globalVar = new RegExp(`^(${IDENT})\\s*=(?!=)`);

  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (skipLine === i + 1) continue;
    const text = stripComment(lines[i] as string).trim();
    const line = i + 1;

    const fn = localFn.exec(text) ?? globalFn.exec(text) ?? assignedFn.exec(text);
    if (fn) {
      const name = fn[1] as string;
      add({ name, type: "function", signature: `${name}(${params(fn[2] as string)})`, line });
      continue;
    }

    const vars = localVars.exec(text);
    if (vars) {
      for (const name of (vars[1] as string).split(",")) {
        add({ name: name.trim(), type: "variable", signature: name.trim(), line });
      }
      continue;
    }

    const global = globalVar.exec(text);
    if (global) add({ name: global[1] as string, type: "variable", signature: global[1] as string, line });
  }
  return [...found.values()];
}

// Members assigned on a table: `function T.name()`, `function T:name()`,
// `T.name = function()` and `T.name = value`.
export function scanMembers(source: string, table: string, skipLine?: number): ProjectSymbol[] {
  const t = escapeRegExp(table);
  const dotFn = new RegExp(`^function\\s+${t}\\.(${IDENT})\\s*\\(([^)]*)\\)`);
  const colonFn = new RegExp(`^function\\s+${t}:(${IDENT})\\s*\\(([^)]*)\\)`);
  const assignedFn = new RegExp(`^${t}\\.(${IDENT})\\s*=\\s*function\\s*\\(([^)]*)\\)`);
  const assigned = new RegExp(`^${t}\\.(${IDENT})\\s*=(?!=)`);

  const found = new Map<string, ProjectSymbol>();
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (skipLine === i + 1) continue;
    const text = stripComment(lines[i] as string).trim();
    const line = i + 1;
    let symbol: ProjectSymbol | null = null;

    let m = dotFn.exec(text) ?? assignedFn.exec(text);
    if (m) {
      symbol = { name: m[1] as string, type: "function", signature: `${table}.${m[1]}(${params(m[2] as string)})`, line };
    } else if ((m = colonFn.exec(text))) {
      symbol = { name: m[1] as string, type: "method", signature: `${table}:${m[1]}(${params(m[2] as string)})`, line };
    } else if ((m = assigned.exec(text))) {
      symbol = { name: m[1] as string, type: "variable", signature: `${table}.${m[1]}`, line };
    }
    if (symbol && !found.has(symbol.name)) found.set(symbol.name, symbol);
  }
  return [...found.values()];
}

// Name of the table a module file returns (`return M`), or null when it returns
// something else (a literal table, a call) that this scanner cannot follow.
export function moduleTable(source: string): string | null {
  let name: string | null = null;
  for (const raw of source.split(/\r?\n/)) {
    const match = new RegExp(`^return\\s+(${IDENT})\\s*$`).exec(stripComment(raw).trim());
    if (match && !KEYWORDS.has(match[1] as string)) name = match[1] as string;
  }
  return name;
}

// Suggestions for the text before the cursor. With no separator it offers the
// buffer's own functions and variables. After `name.` or `name:` it offers the
// members of the local table `name`, or of the module bound by
// `local name = require(...)`. LOVE's own `love.*` is left to the API dataset.
export function projectSuggestions(input: {
  source: string;
  lineBeforeCursor: string;
  roots: string[];
  // 1-based line the cursor is on; definitions on it are skipped so the word
  // being typed is not suggested back to the user.
  cursorLine?: number;
  // Directory used to shorten module paths in suggestion origins.
  projectRoot?: string;
}): ProjectSuggestion[] {
  const prefix = extractMemberPrefix(input.lineBeforeCursor);
  if (prefix.length === 0) return [];

  const sep = Math.max(prefix.lastIndexOf("."), prefix.lastIndexOf(":"));
  const partial = sep === -1 ? prefix : prefix.slice(sep + 1);
  const parent = sep === -1 ? "" : prefix.slice(0, sep);
  const methodsOnly = sep !== -1 && prefix[sep] === ":";

  let symbols: ProjectSuggestion[] = [];
  if (parent === "") {
    symbols = scanSymbols(input.source, input.cursorLine).map((s) => ({ ...s, origin: `this file:${s.line}` }));
  } else if (new RegExp(`^${IDENT}$`).test(parent) && parent !== "love") {
    symbols = membersFor(input, parent);
  }

  return symbols.filter(
    (s) => s.name.startsWith(partial) && s.name !== partial && (!methodsOnly || s.type !== "variable"),
  );
}

function membersFor(
  input: { source: string; roots: string[]; cursorLine?: number; projectRoot?: string },
  parent: string,
): ProjectSuggestion[] {
  const local = scanMembers(input.source, parent, input.cursorLine).map((s) => ({
    ...s,
    origin: `this file:${s.line}`,
  }));

  const moduleName = findLocalRequireBinding(input.source, parent);
  if (!moduleName) return local;
  const path = resolveRequire(moduleName, input.roots);
  if (!path) return local;

  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return local;
  }
  const table = moduleTable(text);
  if (!table) return local;

  const label = input.projectRoot ? relative(input.projectRoot, path) : path;
  const fromModule = scanMembers(text, table).map((s) => ({
    ...s,
    // Show the name the user types, not the module's internal table name.
    signature: s.signature.replace(table, parent),
    origin: `${label}:${s.line}`,
  }));
  const seen = new Set(local.map((s) => s.name));
  return [...local, ...fromModule.filter((s) => !seen.has(s.name))];
}
