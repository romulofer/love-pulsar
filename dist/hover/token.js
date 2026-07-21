"use strict";
// Locates the love.* symbol under a cursor column within a single line. Pure
// and host-agnostic so the datatip adapter in main.ts can turn the result into
// an editor Range without any editor API. Returns the dotted path plus its
// column span, or null when the token under the column is not a love.* symbol.
Object.defineProperty(exports, "__esModule", { value: true });
exports.loveSymbolAt = loveSymbolAt;
const IDENT = /[A-Za-z0-9_.]/;
function loveSymbolAt(lineText, column) {
    let start = column;
    let end = column;
    while (start > 0 && IDENT.test(lineText[start - 1]))
        start--;
    while (end < lineText.length && IDENT.test(lineText[end]))
        end++;
    const path = lineText.slice(start, end);
    if (!path.startsWith("love"))
        return null;
    return { path, start, end };
}
//# sourceMappingURL=token.js.map