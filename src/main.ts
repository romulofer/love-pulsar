// Package entry point. Pulsar calls activate() on load and deactivate() on
// unload, reads `config` for the settings UI, and calls the exported service
// functions (provideAutocomplete, provideHyperclick, consumeDatatipService) to
// wire providers. This module stays thin: every provider delegates to a tested
// pure core, and the Pulsar/Node APIs are touched only here, behind a guard so
// the module still loads in a non-editor context (tests, build).

import { spawn } from "child_process";
import { CompositeDisposable, type Disposable, type Notifier } from "./host/types";
import { configSchema, resolveConfig, sourceRoots, type RawConfig } from "./config";
import { Dataset } from "./api/dataset";
import { suggestionsForLine, hoverMarkdownForSymbol } from "./host/adapters";
import { extractDottedPrefix } from "./autocomplete/provider";
import {
  LoveRunner,
  findProjectRoot,
  defaultLoveBinary,
  type SpawnFn,
  type ChildProcessLike,
} from "./run/runner";
import { resolveClick } from "./hyperclick/resolve";
import { performResolution, type NavigationHost } from "./hyperclick/provider";
import { parseErrorLocations } from "./run/console";
import { lintSource } from "./lint/provider";
import { loveSymbolAt } from "./hover/token";

// Pulsar reads this exported schema to render the package settings UI.
export const config = configSchema;

const dataset = Dataset.load();

// The live editor global, present only inside Pulsar. Typed loosely on purpose:
// this is the single seam where we touch the untyped host API.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AtomLike = any;

let subscriptions: CompositeDisposable | null = null;
let runner: LoveRunner | null = null;

export function activate(): void {
  subscriptions = new CompositeDisposable();

  const atom = getAtom();
  if (!atom) return; // running outside Pulsar (tests, build): nothing to wire

  installPackageDeps(); // auto-install hyperclick + datatip so those features work

  const notifier = createNotifier(atom);
  const spawnFn = createSpawnFn(atom);
  runner = new LoveRunner(spawnFn, notifier);

  const commands: Disposable = atom.commands.add("atom-workspace", {
    "love-pulsar:run": () => runProject(atom, notifier),
    "love-pulsar:stop": () => runner?.stop(),
  });
  subscriptions.add(commands);
}

export function deactivate(): void {
  runner?.stop();
  runner = null;
  subscriptions?.dispose();
  subscriptions = null;
}

// autocomplete-plus service. Declared in package.json providedServices.
export function provideAutocomplete(): unknown {
  return {
    selector: ".source.lua",
    disableForSelector: ".source.lua .comment, .source.lua .string",
    inclusionPriority: 1,
    getSuggestions(request: { editor: AtomLike; bufferPosition: AtomLike }): unknown[] {
      const { row, column } = request.bufferPosition;
      const line = request.editor.getTextInRange([[row, 0], [row, column]]);
      return suggestionsForLine(dataset, line);
    },
  };
}

// hyperclick service. Declared in package.json providedServices.
export function provideHyperclick(): unknown {
  return {
    priority: 1,
    grammarScopes: ["source.lua"],
    getSuggestionForWord(editor: AtomLike, text: string, range: AtomLike): unknown {
      const atom = getAtom();
      if (!atom) return null;
      const notifier = createNotifier(atom);
      const row = range.start.row as number;
      const lineText = editor.lineTextForBufferRow(row) as string;
      const dottedPath = extractDottedPrefix(lineText.slice(0, range.end.column));
      const roots = currentSourceRoots(atom, editor);
      const resolution = resolveClick({
        lineText,
        word: text,
        dottedPath,
        source: editor.getText(),
        roots,
        isApiPath: (p) => dataset.lookup(p) !== undefined,
      });
      return {
        range,
        callback: () => performResolution(resolution, navigationHost(atom, notifier)),
      };
    },
  };
}

// datatip (hover) service. Declared in package.json consumedServices.
export function consumeDatatipService(service: AtomLike): Disposable {
  const provider = {
    providerName: "love-pulsar",
    priority: 1,
    grammarScopes: ["source.lua"],
    datatip(editor: AtomLike, position: AtomLike): unknown {
      const row = position.row as number;
      const lineText = editor.lineTextForBufferRow(row) as string;
      const span = loveSymbolAt(lineText, position.column as number);
      if (!span) return null;
      const markdown = hoverMarkdownForSymbol(dataset, span.path);
      if (!markdown) return null;
      // datatip needs a real Range to anchor and dismiss the tooltip; a null
      // range renders nothing. Range comes from the host 'atom' module.
      const { Range } = require("atom") as { Range: AtomLike };
      return {
        markedStrings: [{ type: "markdown", value: markdown }],
        range: Range.fromObject([
          [row, span.start],
          [row, span.end],
        ]),
      };
    },
  };
  const disposable: Disposable = service.addProvider(provider);
  subscriptions?.add(disposable);
  return disposable;
}

// linter service. Declared in package.json providedServices. Flags unknown
// love.* symbols as squiggles. Lints on save to avoid noise mid-edit.
export function provideLinter(): unknown {
  return {
    name: "love-pulsar",
    grammarScopes: ["source.lua"],
    scope: "file",
    lintsOnChange: false,
    lint(editor: AtomLike): unknown[] {
      const file: string | null = editor.getPath?.() ?? null;
      return lintSource(dataset, editor.getText()).map((d) => ({
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
export function consumeStatusBar(statusBar: AtomLike): void {
  const atom = getAtom();
  const doc = (globalThis as { document?: AtomLike }).document;
  if (!atom || !doc) return;

  const button = doc.createElement("a");
  button.classList.add("love-pulsar-run", "inline-block");
  button.textContent = "▶ LOVE";
  button.title = "Run LOVE project (F5)";
  const onClick = () =>
    atom.commands.dispatch(atom.views.getView(atom.workspace), "love-pulsar:run");
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
function installPackageDeps(): void {
  try {
    const deps = require("atom-package-deps") as { install: (name: string) => Promise<void> };
    void deps.install("love-pulsar");
  } catch {
    // atom-package-deps missing: skip auto-install, features degrade gracefully
  }
}

function getAtom(): AtomLike | null {
  return (globalThis as { atom?: AtomLike }).atom ?? null;
}

function createNotifier(atom: AtomLike): Notifier {
  return {
    info: (m) => atom.notifications.addInfo(m),
    warn: (m) => atom.notifications.addWarning(m),
    error: (m) => atom.notifications.addError(m),
  };
}

function createSpawnFn(atom: AtomLike): SpawnFn {
  return (command, args) => {
    const cp = spawn(command, args);
    const onData = (chunk: unknown) => handleOutput(atom, String(chunk));
    cp.stdout?.on("data", onData);
    cp.stderr?.on("data", onData);
    const facade: ChildProcessLike = {
      on: (event, listener) => cp.on(event, listener as (arg: unknown) => void),
      kill: () => cp.kill(),
    };
    return facade;
  };
}

function handleOutput(atom: AtomLike, text: string): void {
  const locations = parseErrorLocations(text);
  for (const loc of locations) {
    atom.notifications.addError(`LOVE error at ${loc.file}:${loc.line}`, {
      detail: text,
      dismissable: true,
    });
  }
}

function navigationHost(atom: AtomLike, notifier: Notifier): NavigationHost {
  return {
    openFile: (path) => atom.workspace.open(path),
    openFileAt: (path, line, column) => {
      Promise.resolve(atom.workspace.open(path)).then((editor: AtomLike) => {
        editor?.setCursorBufferPosition([line - 1, column - 1]);
      });
    },
    moveCursor: (line, column) => {
      const editor = atom.workspace.getActiveTextEditor();
      editor?.setCursorBufferPosition([line - 1, column - 1]);
    },
    showApiReference: (path) => {
      const entry = dataset.lookup(path);
      if (entry?.url) atom.workspace.open(entry.url);
    },
    notifier,
  };
}

function runProject(atom: AtomLike, notifier: Notifier): void {
  const editor = atom.workspace.getActiveTextEditor();
  const startDir: string | undefined =
    editor?.getPath?.() ?? atom.project.getPaths()[0];
  if (!startDir) {
    notifier.error("love-pulsar: open a file in your LOVE project first.");
    return;
  }
  const root = findProjectRoot(startDir);
  if (!root) {
    notifier.error("love-pulsar: no main.lua found in this project.");
    return;
  }
  const config = resolveConfig(readConfig(atom), process.platform);
  runner?.run(config.loveBinaryPath || defaultLoveBinary(process.platform), root);
}

function currentSourceRoots(atom: AtomLike, editor: AtomLike): string[] {
  const startDir: string | undefined = editor.getPath?.() ?? atom.project.getPaths()[0];
  const root = startDir ? findProjectRoot(startDir) ?? atom.project.getPaths()[0] : undefined;
  if (!root) return [];
  return sourceRoots(resolveConfig(readConfig(atom), process.platform), root);
}

function readConfig(atom: AtomLike): RawConfig {
  return {
    loveBinaryPath: atom.config.get("love-pulsar.loveBinaryPath"),
    sourceDirs: atom.config.get("love-pulsar.sourceDirs"),
  };
}
