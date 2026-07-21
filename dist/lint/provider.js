"use strict";
// Diagnostics for LOVE source. Pure and host-agnostic: lintSource scans a Lua
// buffer for dotted love.* symbol chains and flags any that are not part of the
// bundled API surface, so the editor can render them as squiggles. The Pulsar
// linter adapter (wired in main.ts) maps each Diagnostic to a linter message.
Object.defineProperty(exports, "__esModule", { value: true });
exports.lintSource = lintSource;
// A love.* chain: the root followed by one or more dotted identifier segments.
const LOVE_CHAIN = /love(?:\.[A-Za-z0-9_]+)+/g;
// Flags every love.* symbol chain that is neither a known API entry nor a
// namespace prefix of one. Symbols in line comments are ignored.
function lintSource(dataset, source) {
    const diagnostics = [];
    const lines = source.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const code = stripComment(lines[i]);
        for (const match of code.matchAll(LOVE_CHAIN)) {
            const path = match[0];
            if (isKnownApi(dataset, path))
                continue;
            const column = match.index ?? 0;
            diagnostics.push({
                line: i + 1,
                column,
                endColumn: column + path.length,
                severity: "warning",
                message: `Unknown LOVE API symbol '${path}'.`,
            });
        }
    }
    return diagnostics;
}
// A path is known if it is an entry itself or a namespace prefix of one, e.g.
// "love.graphics" is valid because "love.graphics.draw" exists.
function isKnownApi(dataset, path) {
    if (dataset.lookup(path))
        return true;
    const prefix = path + ".";
    return dataset.all().some((e) => e.path.startsWith(prefix));
}
// Removes a trailing line comment so symbols mentioned in comments are ignored.
function stripComment(line) {
    const idx = line.indexOf("--");
    return idx === -1 ? line : line.slice(0, idx);
}
//# sourceMappingURL=provider.js.map