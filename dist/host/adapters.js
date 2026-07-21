"use strict";
// Mapping helpers that bridge the pure cores to the shapes Pulsar's services
// expect. These stay pure (input strings in, plain objects out) so they are
// testable without the editor; main.ts calls them from within the live
// autocomplete-plus and datatip providers.
Object.defineProperty(exports, "__esModule", { value: true });
exports.suggestionsForLine = suggestionsForLine;
exports.hoverMarkdownForSymbol = hoverMarkdownForSymbol;
const provider_1 = require("../autocomplete/provider");
const provider_2 = require("../hover/provider");
function suggestionsForLine(dataset, lineBeforeCursor) {
    const prefix = (0, provider_1.extractDottedPrefix)(lineBeforeCursor);
    if (prefix.length === 0)
        return [];
    return (0, provider_1.buildSuggestions)(dataset, prefix).map((s) => ({
        text: s.text,
        type: s.type,
        displayText: s.text,
        rightLabel: s.type,
        description: s.description || s.signature,
    }));
}
// Rendered hover markdown for a symbol path, or null if unknown.
function hoverMarkdownForSymbol(dataset, path) {
    const doc = (0, provider_2.buildHover)(dataset, path);
    return doc ? (0, provider_2.renderHoverMarkdown)(doc) : null;
}
//# sourceMappingURL=adapters.js.map