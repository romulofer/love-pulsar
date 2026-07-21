"use strict";
// Autocomplete logic for the love.* API surface. Pure and host-agnostic: it
// turns a typed dotted prefix into shaped suggestions from the dataset. The
// Pulsar autocomplete-plus adapter (wired in main.ts) calls extractDottedPrefix
// on the current line, then buildSuggestions, then maps the result to the
// editor's suggestion shape.
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractDottedPrefix = extractDottedPrefix;
exports.buildSuggestions = buildSuggestions;
const IDENTIFIER_CHAR = /[A-Za-z0-9_.]/;
// Reads backward from the end of a line, collecting the dotted identifier chain
// that ends at the cursor. "local x = love.graphics." -> "love.graphics.".
function extractDottedPrefix(line) {
    let start = line.length;
    while (start > 0 && IDENTIFIER_CHAR.test(line[start - 1])) {
        start--;
    }
    return line.slice(start);
}
// Builds suggestions for a dotted prefix. A trailing dot lists all members of
// the parent; otherwise the segment after the last dot filters members by name.
function buildSuggestions(dataset, prefix) {
    const lastDot = prefix.lastIndexOf(".");
    const parent = lastDot === -1 ? "" : prefix.slice(0, lastDot);
    const partial = lastDot === -1 ? prefix : prefix.slice(lastDot + 1);
    const candidates = parent === "" ? topLevel(dataset) : dataset.membersOf(parent);
    return candidates
        .filter((e) => e.name.startsWith(partial))
        .map(toSuggestion);
}
function topLevel(dataset) {
    return dataset.all().filter((e) => !e.path.includes("."));
}
function toSuggestion(entry) {
    return {
        text: entry.name,
        path: entry.path,
        type: entry.kind,
        signature: entry.signature ?? entry.path,
        description: entry.description ?? "",
    };
}
//# sourceMappingURL=provider.js.map