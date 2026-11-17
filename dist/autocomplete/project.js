"use strict";
// Autocomplete for symbols defined in the user's own Lua code: functions and
// variables in the current buffer, and the members of a table or of a module
// brought in with `local mod = require("mod")`. Pure and host-agnostic: it works
// on source text and the filesystem only. Scanning is line-based and
// intentionally approximate; it favours useful suggestions over full Lua parsing.
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractMemberPrefix = extractMemberPrefix;
exports.scanSymbols = scanSymbols;
exports.scanMembers = scanMembers;
exports.moduleTable = moduleTable;
exports.projectSuggestions = projectSuggestions;
const fs_1 = require("fs");
const path_1 = require("path");
const resolve_1 = require("../hyperclick/resolve");
const KEYWORDS = new Set([
    "and", "break", "do", "else", "elseif", "end", "false", "for", "function", "goto", "if",
    "in", "local", "nil", "not", "or", "repeat", "return", "then", "true", "until", "while",
]);
const IDENT = "[A-Za-z_][A-Za-z0-9_]*";
const SEPARATOR_CHAR = /[A-Za-z0-9_.:]/;
// Reads backward from the cursor collecting an identifier chain that may use
// `.` or `:` separators. "  Player:mo" -> "Player:mo".
function extractMemberPrefix(line) {
    let start = line.length;
    while (start > 0 && SEPARATOR_CHAR.test(line[start - 1]))
        start--;
    return line.slice(start);
}
function stripComment(line) {
    const idx = line.indexOf("--");
    return idx === -1 ? line : line.slice(0, idx);
}
function params(raw) {
    return raw.trim().replace(/\s+/g, " ");
}
function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
// Functions and variables declared at line start in a buffer. Local variables
// declared with `local a, b = ...` yield one symbol per name.
function scanSymbols(source, skipLine) {
    const found = new Map();
    const add = (symbol) => {
        if (KEYWORDS.has(symbol.name) || found.has(symbol.name))
            return;
        found.set(symbol.name, symbol);
    };
    const localFn = new RegExp(`^local\\s+function\\s+(${IDENT})\\s*\\(([^)]*)\\)`);
    const globalFn = new RegExp(`^function\\s+(${IDENT})\\s*\\(([^)]*)\\)`);
    const assignedFn = new RegExp(`^(?:local\\s+)?(${IDENT})\\s*=\\s*function\\s*\\(([^)]*)\\)`);
    const localVars = new RegExp(`^local\\s+(${IDENT}(?:\\s*,\\s*${IDENT})*)\\s*(?:<\\w+>\\s*)?(?:=|$)`);
    const globalVar = new RegExp(`^(${IDENT})\\s*=(?!=)`);
    const lines = source.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        if (skipLine === i + 1)
            continue;
        const text = stripComment(lines[i]).trim();
        const line = i + 1;
        const fn = localFn.exec(text) ?? globalFn.exec(text) ?? assignedFn.exec(text);
        if (fn) {
            const name = fn[1];
            add({ name, type: "function", signature: `${name}(${params(fn[2])})`, line });
            continue;
        }
        const vars = localVars.exec(text);
        if (vars) {
            for (const name of vars[1].split(",")) {
                add({ name: name.trim(), type: "variable", signature: name.trim(), line });
            }
            continue;
        }
        const global = globalVar.exec(text);
        if (global)
            add({ name: global[1], type: "variable", signature: global[1], line });
    }
    return [...found.values()];
}
// Members assigned on a table: `function T.name()`, `function T:name()`,
// `T.name = function()` and `T.name = value`.
function scanMembers(source, table, skipLine) {
    const t = escapeRegExp(table);
    const dotFn = new RegExp(`^function\\s+${t}\\.(${IDENT})\\s*\\(([^)]*)\\)`);
    const colonFn = new RegExp(`^function\\s+${t}:(${IDENT})\\s*\\(([^)]*)\\)`);
    const assignedFn = new RegExp(`^${t}\\.(${IDENT})\\s*=\\s*function\\s*\\(([^)]*)\\)`);
    const assigned = new RegExp(`^${t}\\.(${IDENT})\\s*=(?!=)`);
    const found = new Map();
    const lines = source.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        if (skipLine === i + 1)
            continue;
        const text = stripComment(lines[i]).trim();
        const line = i + 1;
        let symbol = null;
        let m = dotFn.exec(text) ?? assignedFn.exec(text);
        if (m) {
            symbol = { name: m[1], type: "function", signature: `${table}.${m[1]}(${params(m[2])})`, line };
        }
        else if ((m = colonFn.exec(text))) {
            symbol = { name: m[1], type: "method", signature: `${table}:${m[1]}(${params(m[2])})`, line };
        }
        else if ((m = assigned.exec(text))) {
            symbol = { name: m[1], type: "variable", signature: `${table}.${m[1]}`, line };
        }
        if (symbol && !found.has(symbol.name))
            found.set(symbol.name, symbol);
    }
    return [...found.values()];
}
// Name of the table a module file returns (`return M`), or null when it returns
// something else (a literal table, a call) that this scanner cannot follow.
function moduleTable(source) {
    let name = null;
    for (const raw of source.split(/\r?\n/)) {
        const match = new RegExp(`^return\\s+(${IDENT})\\s*$`).exec(stripComment(raw).trim());
        if (match && !KEYWORDS.has(match[1]))
            name = match[1];
    }
    return name;
}
// Suggestions for the text before the cursor. With no separator it offers the
// buffer's own functions and variables. After `name.` or `name:` it offers the
// members of the local table `name`, or of the module bound by
// `local name = require(...)`. LOVE's own `love.*` is left to the API dataset.
function projectSuggestions(input) {
    const prefix = extractMemberPrefix(input.lineBeforeCursor);
    if (prefix.length === 0)
        return [];
    const sep = Math.max(prefix.lastIndexOf("."), prefix.lastIndexOf(":"));
    const partial = sep === -1 ? prefix : prefix.slice(sep + 1);
    const parent = sep === -1 ? "" : prefix.slice(0, sep);
    const methodsOnly = sep !== -1 && prefix[sep] === ":";
    let symbols = [];
    if (parent === "") {
        symbols = scanSymbols(input.source, input.cursorLine).map((s) => ({ ...s, origin: `this file:${s.line}` }));
    }
    else if (new RegExp(`^${IDENT}$`).test(parent) && parent !== "love") {
        symbols = membersFor(input, parent);
    }
    return symbols.filter((s) => s.name.startsWith(partial) && s.name !== partial && (!methodsOnly || s.type !== "variable"));
}
function membersFor(input, parent) {
    const local = scanMembers(input.source, parent, input.cursorLine).map((s) => ({
        ...s,
        origin: `this file:${s.line}`,
    }));
    const moduleName = (0, resolve_1.findLocalRequireBinding)(input.source, parent);
    if (!moduleName)
        return local;
    const path = (0, resolve_1.resolveRequire)(moduleName, input.roots);
    if (!path)
        return local;
    let text;
    try {
        text = (0, fs_1.readFileSync)(path, "utf8");
    }
    catch {
        return local;
    }
    const table = moduleTable(text);
    if (!table)
        return local;
    const label = input.projectRoot ? (0, path_1.relative)(input.projectRoot, path) : path;
    const fromModule = scanMembers(text, table).map((s) => ({
        ...s,
        // Show the name the user types, not the module's internal table name.
        signature: s.signature.replace(table, parent),
        origin: `${label}:${s.line}`,
    }));
    const seen = new Set(local.map((s) => s.name));
    return [...local, ...fromModule.filter((s) => !seen.has(s.name))];
}
//# sourceMappingURL=project.js.map