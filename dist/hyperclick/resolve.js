"use strict";
// Go-to-definition resolution. Pure and host-agnostic: given the text under a
// click, it resolves require() paths to Lua files, local symbols to their
// definition line, and LOVE API symbols to an api link. The provider adapter
// turns a Resolution into an editor action (open file, move cursor, show hover)
// or a notification when nothing resolves.
Object.defineProperty(exports, "__esModule", { value: true });
exports.findRequireTarget = findRequireTarget;
exports.resolveRequire = resolveRequire;
exports.resolveLocalDefinition = resolveLocalDefinition;
exports.resolveClick = resolveClick;
const fs_1 = require("fs");
const path_1 = require("path");
// Extracts the module string from a require('mod') / require("mod") call.
function findRequireTarget(lineText) {
    const match = /require\s*\(?\s*["']([^"']+)["']/.exec(lineText);
    return match ? match[1] : null;
}
// Resolves a dotted Lua module name to a file under one of the given roots.
// Tries both "mod/name.lua" and "mod/name/init.lua", matching Lua's loader.
function resolveRequire(moduleName, roots) {
    const relative = moduleName.replace(/\./g, "/");
    for (const root of roots) {
        const candidates = [(0, path_1.join)(root, relative + ".lua"), (0, path_1.join)(root, relative, "init.lua")];
        for (const candidate of candidates) {
            if ((0, fs_1.existsSync)(candidate))
                return candidate;
        }
    }
    return null;
}
// Finds the definition of a local function or variable within a source file.
function resolveLocalDefinition(source, name) {
    const escaped = escapeRegExp(name);
    const patterns = [
        new RegExp(`^\\s*local\\s+function\\s+${escaped}\\b`),
        new RegExp(`^\\s*function\\s+[\\w.:]*\\b${escaped}\\s*\\(`),
        new RegExp(`^\\s*local\\s+${escaped}\\s*=`),
        new RegExp(`^\\s*${escaped}\\s*=`),
    ];
    const lines = source.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const text = lines[i];
        if (patterns.some((p) => p.test(text))) {
            return { line: i + 1, column: text.indexOf(name) + 1 };
        }
    }
    return null;
}
// Finds the module a local name was bound to via `local name = require(...)`,
// so a click on `Module.member` can be traced back to the file it came from.
function findLocalRequireBinding(source, name) {
    const escaped = escapeRegExp(name);
    const pattern = new RegExp(`^\\s*local\\s+${escaped}\\s*=\\s*require\\s*\\(?\\s*["']([^"']+)["']`);
    for (const line of source.split(/\r?\n/)) {
        const match = pattern.exec(line);
        if (match)
            return match[1];
    }
    return null;
}
// Resolves a click on `Module.member`: traces `Module` back to the file it was
// required from, then looks for `member`'s definition in that file.
function resolveMemberDefinition(input) {
    const lastDot = input.dottedPath.lastIndexOf(".");
    if (lastDot === -1)
        return null;
    const prefix = input.dottedPath.slice(0, lastDot);
    const member = input.dottedPath.slice(lastDot + 1);
    if (member !== input.word || prefix.includes("."))
        return null;
    const moduleName = findLocalRequireBinding(input.source, prefix);
    if (!moduleName)
        return null;
    const path = resolveRequire(moduleName, input.roots);
    if (!path)
        return null;
    const def = resolveLocalDefinition((0, fs_1.readFileSync)(path, "utf8"), member);
    return def ? { kind: "definition", path, line: def.line, column: def.column } : null;
}
// Orchestrates a click: require file first, then LOVE API symbol, then a
// cross-file member (Module.member), then a same-file local definition,
// otherwise missing. isApiPath is injected so this stays decoupled from the
// dataset.
function resolveClick(input) {
    const requireTarget = findRequireTarget(input.lineText);
    if (requireTarget) {
        const path = resolveRequire(requireTarget, input.roots);
        return path ? { kind: "file", path } : { kind: "missing" };
    }
    if (input.dottedPath && input.isApiPath(input.dottedPath)) {
        return { kind: "api", path: input.dottedPath };
    }
    if (input.dottedPath) {
        const memberDef = resolveMemberDefinition({
            dottedPath: input.dottedPath,
            word: input.word,
            source: input.source,
            roots: input.roots,
        });
        if (memberDef)
            return memberDef;
    }
    const def = resolveLocalDefinition(input.source, input.word);
    if (def)
        return { kind: "definition", line: def.line, column: def.column };
    return { kind: "missing" };
}
function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
//# sourceMappingURL=resolve.js.map