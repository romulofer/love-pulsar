"use strict";
// Package entry point. Pulsar calls activate() on load and deactivate() on
// unload, reads `config` for the settings UI, and calls the exported service
// functions (provideAutocomplete, provideHyperclick, consumeDatatipService) to
// wire providers. This module stays thin: every provider delegates to a tested
// pure core, and the Pulsar/Node APIs are touched only here, behind a guard so
// the module still loads in a non-editor context (tests, build).
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.activate = activate;
exports.deactivate = deactivate;
exports.provideAutocomplete = provideAutocomplete;
exports.provideHyperclick = provideHyperclick;
exports.consumeDatatipService = consumeDatatipService;
const child_process_1 = require("child_process");
const types_1 = require("./host/types");
const config_1 = require("./config");
const dataset_1 = require("./api/dataset");
const adapters_1 = require("./host/adapters");
const provider_1 = require("./autocomplete/provider");
const runner_1 = require("./run/runner");
const resolve_1 = require("./hyperclick/resolve");
const provider_2 = require("./hyperclick/provider");
const console_1 = require("./run/console");
// Pulsar reads this exported schema to render the package settings UI.
exports.config = config_1.configSchema;
const dataset = dataset_1.Dataset.load();
let subscriptions = null;
let runner = null;
function activate() {
    subscriptions = new types_1.CompositeDisposable();
    const atom = getAtom();
    if (!atom)
        return; // running outside Pulsar (tests, build): nothing to wire
    const notifier = createNotifier(atom);
    const spawnFn = createSpawnFn(atom);
    runner = new runner_1.LoveRunner(spawnFn, notifier);
    const commands = atom.commands.add("atom-workspace", {
        "love-pulsar:run": () => runProject(atom, notifier),
        "love-pulsar:stop": () => runner?.stop(),
    });
    subscriptions.add(commands);
}
function deactivate() {
    runner?.stop();
    runner = null;
    subscriptions?.dispose();
    subscriptions = null;
}
// autocomplete-plus service. Declared in package.json providedServices.
function provideAutocomplete() {
    return {
        selector: ".source.lua",
        disableForSelector: ".source.lua .comment, .source.lua .string",
        inclusionPriority: 1,
        getSuggestions(request) {
            const { row, column } = request.bufferPosition;
            const line = request.editor.getTextInRange([[row, 0], [row, column]]);
            return (0, adapters_1.suggestionsForLine)(dataset, line);
        },
    };
}
// hyperclick service. Declared in package.json providedServices.
function provideHyperclick() {
    return {
        priority: 1,
        grammarScopes: ["source.lua"],
        getSuggestionForWord(editor, text, range) {
            const atom = getAtom();
            if (!atom)
                return null;
            const notifier = createNotifier(atom);
            const row = range.start.row;
            const lineText = editor.lineTextForBufferRow(row);
            const dottedPath = (0, provider_1.extractDottedPrefix)(lineText.slice(0, range.end.column));
            const roots = currentSourceRoots(atom, editor);
            const resolution = (0, resolve_1.resolveClick)({
                lineText,
                word: text,
                dottedPath,
                source: editor.getText(),
                roots,
                isApiPath: (p) => dataset.lookup(p) !== undefined,
            });
            return {
                range,
                callback: () => (0, provider_2.performResolution)(resolution, navigationHost(atom, notifier)),
            };
        },
    };
}
// datatip (hover) service. Declared in package.json consumedServices.
function consumeDatatipService(service) {
    const provider = {
        providerName: "love-pulsar",
        priority: 1,
        grammarScopes: ["source.lua"],
        datatip(editor, position) {
            const path = symbolPathAt(editor, position);
            if (!path)
                return null;
            const markdown = (0, adapters_1.hoverMarkdownForSymbol)(dataset, path);
            if (!markdown)
                return null;
            return { markedStrings: [{ type: "markdown", value: markdown }], range: null };
        },
    };
    const disposable = service.addProvider(provider);
    subscriptions?.add(disposable);
    return disposable;
}
// --- Host glue (only reached inside Pulsar) ---
function getAtom() {
    return globalThis.atom ?? null;
}
function createNotifier(atom) {
    return {
        info: (m) => atom.notifications.addInfo(m),
        warn: (m) => atom.notifications.addWarning(m),
        error: (m) => atom.notifications.addError(m),
    };
}
function createSpawnFn(atom) {
    return (command, args) => {
        const cp = (0, child_process_1.spawn)(command, args);
        const onData = (chunk) => handleOutput(atom, String(chunk));
        cp.stdout?.on("data", onData);
        cp.stderr?.on("data", onData);
        const facade = {
            on: (event, listener) => cp.on(event, listener),
            kill: () => cp.kill(),
        };
        return facade;
    };
}
function handleOutput(atom, text) {
    const locations = (0, console_1.parseErrorLocations)(text);
    for (const loc of locations) {
        atom.notifications.addError(`LOVE error at ${loc.file}:${loc.line}`, {
            detail: text,
            dismissable: true,
        });
    }
}
function navigationHost(atom, notifier) {
    return {
        openFile: (path) => atom.workspace.open(path),
        moveCursor: (line, column) => {
            const editor = atom.workspace.getActiveTextEditor();
            editor?.setCursorBufferPosition([line - 1, column - 1]);
        },
        showApiReference: (path) => {
            const entry = dataset.lookup(path);
            if (entry?.url)
                atom.workspace.open(entry.url);
        },
        notifier,
    };
}
function runProject(atom, notifier) {
    const editor = atom.workspace.getActiveTextEditor();
    const startDir = editor?.getPath?.() ?? atom.project.getPaths()[0];
    if (!startDir) {
        notifier.error("love-pulsar: open a file in your LOVE project first.");
        return;
    }
    const root = (0, runner_1.findProjectRoot)(startDir);
    if (!root) {
        notifier.error("love-pulsar: no main.lua found in this project.");
        return;
    }
    const config = (0, config_1.resolveConfig)(readConfig(atom), process.platform);
    runner?.run(config.loveBinaryPath || (0, runner_1.defaultLoveBinary)(process.platform), root);
}
function currentSourceRoots(atom, editor) {
    const startDir = editor.getPath?.() ?? atom.project.getPaths()[0];
    const root = startDir ? (0, runner_1.findProjectRoot)(startDir) ?? atom.project.getPaths()[0] : undefined;
    if (!root)
        return [];
    return (0, config_1.sourceRoots)((0, config_1.resolveConfig)(readConfig(atom), process.platform), root);
}
function readConfig(atom) {
    return {
        loveBinaryPath: atom.config.get("love-pulsar.loveBinaryPath"),
        sourceDirs: atom.config.get("love-pulsar.sourceDirs"),
    };
}
// Resolves the dotted love.* symbol under a hover position, or null.
function symbolPathAt(editor, position) {
    const row = position.row;
    const lineText = editor.lineTextForBufferRow(row);
    const col = position.column;
    // Expand left and right over identifier characters around the column.
    let start = col;
    let end = col;
    const isIdent = (c) => /[A-Za-z0-9_.]/.test(c);
    while (start > 0 && isIdent(lineText[start - 1]))
        start--;
    while (end < lineText.length && isIdent(lineText[end]))
        end++;
    const token = lineText.slice(start, end);
    return token.startsWith("love") ? token : null;
}
//# sourceMappingURL=main.js.map