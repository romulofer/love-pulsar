"use strict";
// Loads and queries the bundled LOVE API dataset. Fully offline: the JSON ships
// in the package and is read from disk, never fetched.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dataset = exports.UNKNOWN_VERSION = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
// data/ sits two levels above this module both in source (src/api/dataset.ts)
// and in the compiled output (dist/api/dataset.js), so the same relative path
// resolves correctly in tests and at runtime.
const DATA_DIR = (0, path_1.join)(__dirname, "..", "..", "data");
const DATASET_PATH = (0, path_1.join)(DATA_DIR, "love-api.json");
const DEPRECATED_PATH = (0, path_1.join)(DATA_DIR, "deprecated.json");
// Version reported by datasets that predate the version field (a bare array).
exports.UNKNOWN_VERSION = "unknown";
class Dataset {
    constructor(entries, loveVersion = exports.UNKNOWN_VERSION, deprecations = {}) {
        this.entries = entries;
        this.byPath = new Map(entries.map((e) => [e.path, e]));
        this.loveVersion = loveVersion;
        this.deprecations = new Map(Object.entries(deprecations));
    }
    // Loads the bundled dataset and deprecation list from disk.
    static load() {
        const deprecations = JSON.parse((0, fs_1.readFileSync)(DEPRECATED_PATH, "utf8"));
        return Dataset.fromJson((0, fs_1.readFileSync)(DATASET_PATH, "utf8"), deprecations);
    }
    // Parses a dataset from a JSON string. Kept separate from load() so callers
    // can construct datasets from fixtures without touching the filesystem.
    // Accepts the current `{ loveVersion, entries }` shape and the older bare
    // array of entries.
    static fromJson(text, deprecations = {}) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed))
            return new Dataset(parsed, exports.UNKNOWN_VERSION, deprecations);
        return new Dataset(parsed.entries, parsed.loveVersion ?? exports.UNKNOWN_VERSION, deprecations);
    }
    all() {
        return this.entries;
    }
    // Exact lookup by fully-qualified path.
    lookup(path) {
        return this.byPath.get(path);
    }
    // Deprecation info for a symbol that is deprecated but still works, if any.
    deprecation(path) {
        return this.deprecations.get(path);
    }
    // Prefix search over paths, e.g. query("love.gr") matches "love.graphics".
    // Results are sorted by path for stable ordering.
    query(prefix) {
        if (prefix.length === 0)
            return [...this.entries].sort(byPath);
        return this.entries.filter((e) => e.path.startsWith(prefix)).sort(byPath);
    }
    // Direct children of a path: entries one dotted segment deeper, excluding the
    // parent itself and any deeper descendants.
    membersOf(path) {
        const prefix = path + ".";
        return this.entries
            .filter((e) => {
            if (!e.path.startsWith(prefix))
                return false;
            const rest = e.path.slice(prefix.length);
            return rest.length > 0 && !rest.includes(".");
        })
            .sort(byPath);
    }
}
exports.Dataset = Dataset;
function byPath(a, b) {
    return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
}
//# sourceMappingURL=dataset.js.map