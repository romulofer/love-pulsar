"use strict";
// Package settings. configSchema is the Pulsar-facing schema (rendered in the
// settings UI). resolveConfig turns the raw values Pulsar provides into a
// typed, defaulted config, and sourceRoots expands source dirs against a
// project root for the require resolver. Kept pure so it is testable without
// the editor.
Object.defineProperty(exports, "__esModule", { value: true });
exports.configSchema = void 0;
exports.resolveConfig = resolveConfig;
exports.sourceRoots = sourceRoots;
const path_1 = require("path");
const runner_1 = require("./run/runner");
exports.configSchema = {
    loveBinaryPath: {
        type: "string",
        default: "",
        title: "LOVE binary path",
        description: "Path to the love executable. Leave empty to use the platform default (love on PATH).",
        order: 1,
    },
    sourceDirs: {
        type: "array",
        default: ["."],
        items: { type: "string" },
        title: "Source directories",
        description: "Directories, relative to the project root, searched when resolving require() paths.",
        order: 2,
    },
};
function resolveConfig(raw, platform) {
    const trimmed = raw.loveBinaryPath?.trim();
    const loveBinaryPath = trimmed && trimmed.length > 0 ? trimmed : (0, runner_1.defaultLoveBinary)(platform);
    const sourceDirs = raw.sourceDirs && raw.sourceDirs.length > 0 ? raw.sourceDirs : ["."];
    return { loveBinaryPath, sourceDirs };
}
// Absolute search roots for require resolution.
function sourceRoots(config, projectRoot) {
    return config.sourceDirs.map((dir) => (0, path_1.join)(projectRoot, dir));
}
//# sourceMappingURL=config.js.map