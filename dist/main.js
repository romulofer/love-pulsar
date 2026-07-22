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
exports.provideLinter = provideLinter;
exports.consumeStatusBar = consumeStatusBar;
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
const provider_3 = require("./lint/provider");
const token_1 = require("./hover/token");
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
    installPackageDeps(); // auto-install hyperclick + datatip so those features work
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
            const row = position.row;
            const lineText = editor.lineTextForBufferRow(row);
            const span = (0, token_1.loveSymbolAt)(lineText, position.column);
            if (!span)
                return null;
            const markdown = (0, adapters_1.hoverMarkdownForSymbol)(dataset, span.path);
            if (!markdown)
                return null;
            // datatip needs a real Range to anchor and dismiss the tooltip; a null
            // range renders nothing. Range comes from the host 'atom' module.
            const { Range } = require("atom");
            return {
                markedStrings: [{ type: "markdown", value: markdown }],
                range: Range.fromObject([
                    [row, span.start],
                    [row, span.end],
                ]),
            };
        },
    };
    const disposable = service.addProvider(provider);
    subscriptions?.add(disposable);
    return disposable;
}
// linter service. Declared in package.json providedServices. Flags unknown
// love.* symbols as squiggles. Lints on save to avoid noise mid-edit.
function provideLinter() {
    return {
        name: "love-pulsar",
        grammarScopes: ["source.lua"],
        scope: "file",
        lintsOnChange: false,
        lint(editor) {
            const file = editor.getPath?.() ?? null;
            return (0, provider_3.lintSource)(dataset, editor.getText()).map((d) => ({
                severity: d.severity,
                location: {
                    file,
                    position: [
                        [d.line - 1, d.column],
                        [d.line - 1, d.endColumn],
                    ],
                },
                excerpt: d.message,
            }));
        },
    };
}
// status-bar service. Declared in package.json consumedServices. Adds a
// clickable "Run" button that dispatches the love-pulsar:run command.
function consumeStatusBar(statusBar) {
    const atom = getAtom();
    const doc = globalThis.document;
    if (!atom || !doc)
        return;
    const button = doc.createElement("a");
    button.classList.add("love-pulsar-run", "inline-block");
    button.textContent = "▶ LOVE";
    button.title = "Run LOVE project (F5)";
    const onClick = () => atom.commands.dispatch(atom.views.getView(atom.workspace), "love-pulsar:run");
    button.addEventListener("click", onClick);
    const tile = statusBar.addLeftTile({ item: button, priority: 100 });
    subscriptions?.add({
        dispose: () => {
            button.removeEventListener("click", onClick);
            tile.destroy();
        },
    });
}
// --- Host glue (only reached inside Pulsar) ---
// Auto-installs the packages that provide/consume the hyperclick and datatip
// services, without which Ctrl-click and hover never fire. Best-effort: if
// atom-package-deps is unavailable the providers still register.
function installPackageDeps() {
    try {
        const deps = require("atom-package-deps");
        void deps.install("love-pulsar");
    }
    catch {
        // atom-package-deps missing: skip auto-install, features degrade gracefully
    }
}
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
        openFileAt: (path, line, column) => {
            Promise.resolve(atom.workspace.open(path)).then((editor) => {
                editor?.setCursorBufferPosition([line - 1, column - 1]);
            });
        },
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
//# sourceMappingURL=main.js.map