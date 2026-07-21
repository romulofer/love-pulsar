"use strict";
// Parses LOVE process output for clickable error locations. Pure: the console
// adapter feeds captured stdout/stderr through parseErrorLocations and renders
// each result as a clickable entry that opens the file at the line.
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseErrorLocations = parseErrorLocations;
// Matches "somefile.lua:123" anywhere in the output, including stack traces.
const FILE_LINE = /([\w./\\-]+\.lua):(\d+)/g;
function parseErrorLocations(output) {
    const locations = [];
    for (const match of output.matchAll(FILE_LINE)) {
        locations.push({
            file: match[1],
            line: Number(match[2]),
            raw: match[0],
        });
    }
    return locations;
}
//# sourceMappingURL=console.js.map