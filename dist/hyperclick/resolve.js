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
// Orchestrates a click: require file first, then LOVE API symbol, then local
// definition, otherwise missing. isApiPath is injected so this stays decoupled
// from the dataset.
function resolveClick(input) {
    const requireTarget = findRequireTarget(input.lineText);
    if (requireTarget) {
        const path = resolveRequire(requireTarget, input.roots);
        return path ? { kind: "file", path } : { kind: "missing" };
    }
    if (input.dottedPath && input.isApiPath(input.dottedPath)) {
        return { kind: "api", path: input.dottedPath };
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