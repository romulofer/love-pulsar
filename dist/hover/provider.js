"use strict";
// Hover documentation for love.* symbols. Pure and host-agnostic: buildHover
// resolves a fully-qualified path to a structured doc, and renderHoverMarkdown
// formats it for display. The Pulsar adapter maps a hovered token to a path,
// calls buildHover, and shows the rendered markdown in a tooltip.
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildHover = buildHover;
exports.renderHoverMarkdown = renderHoverMarkdown;
// Resolves a symbol path to a hover doc, or null if the symbol is unknown.
function buildHover(dataset, path) {
    const entry = dataset.lookup(path);
    if (!entry)
        return null;
    return {
        path: entry.path,
        kind: entry.kind,
        signature: entry.signature ?? entry.path,
        params: entry.params ?? [],
        returns: entry.returns ?? [],
        description: entry.description ?? "",
        url: entry.url,
    };
}
// Formats a hover doc as markdown: a signature code block, a parameter list, a
// returns list, and the description. Uses plain hyphens, never em dashes.
function renderHoverMarkdown(doc) {
    const lines = [];
    lines.push("```lua");
    lines.push(doc.signature);
    lines.push("```");
    if (doc.params.length > 0) {
        lines.push("");
        lines.push("**Parameters:**");
        for (const p of doc.params) {
            lines.push(`- \`${p.name}\`${formatType(p.type)}${formatDesc(p.description)}`);
        }
    }
    if (doc.returns.length > 0) {
        lines.push("");
        lines.push("**Returns:**");
        for (const r of doc.returns) {
            const label = r.name ? `\`${r.name}\`` : "value";
            lines.push(`- ${label}${formatType(r.type)}${formatDesc(r.description)}`);
        }
    }
    if (doc.description) {
        lines.push("");
        lines.push(doc.description);
    }
    if (doc.url) {
        lines.push("");
        lines.push(`[Reference](${doc.url})`);
    }
    return lines.join("\n");
}
function formatType(type) {
    return type ? ` (${type})` : "";
}
function formatDesc(description) {
    return description ? `: ${description}` : "";
}
//# sourceMappingURL=provider.js.map