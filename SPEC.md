# love-pulsar Specification

## 1. Objective

Provide coding tooling for making games with [LÖVE (love2d)](https://love2d.org) inside the [Pulsar](https://pulsar-edit.dev) editor.

love-pulsar is a single Pulsar package that combines the functionality of three separate Atom-era packages into one maintained, tested codebase:

- [autocomplete-love](https://github.com/rameshvarun/autocomplete-love) — LÖVE API autocomplete
- [hyperclick-love](https://github.com/rameshvarun/hyperclick-love) — Ctrl/Cmd-click go-to-definition
- [love-ide](https://github.com/rameshvarun/love-ide) — run/debug LÖVE from the editor

### Target users

Developers writing LÖVE (Lua) games who use the Pulsar editor and want autocomplete, navigation, inline docs, and one-key run without leaving the editor.

### Non-goals (v1)

- Full Lua language server / general Lua intelligence beyond the LÖVE API
- Editors other than Pulsar (design keeps API/data layer host-agnostic to allow later reuse, but no other host is shipped)
- Debugging protocol integration (step debugger); "debug" in v1 means launch + console output + error surfacing

## 2. Core Features (v1 scope)

All four capabilities are in scope for v1.

### 2.1 Autocomplete

- Autocomplete provider for the `love.*` API surface (modules, functions, callbacks, enums).
- Suggestions include function signature and short description.
- Triggered on `.` after `love` and its submodules, and on identifier prefix.

Acceptance:
- Typing `love.gr` suggests `love.graphics` (and members after `love.graphics.`).
- Each suggestion carries type (function/module/enum), signature snippet, and description text.
- Suggestions come from the bundled dataset only; no network at runtime.

### 2.2 Hyperclick / go-to-definition

- Ctrl/Cmd-click (and command) on a symbol jumps to its definition.
- Resolves `require('module')` string paths to the target Lua file in the project.
- Resolves locally-defined functions/variables within the open file/project.
- LÖVE API symbols link to their hover doc / online reference (no local source to jump to).

Acceptance:
- Clicking a `require('foo.bar')` opens `foo/bar.lua` relative to project root / configured source dirs.
- Clicking a locally defined `function` name jumps to its definition line.
- Missing targets produce a non-fatal notification, not a crash.

### 2.3 Run / debug LÖVE

- Command to launch the current project with the `love` executable.
- Configurable path to the `love` binary (setting), with sensible per-platform defaults.
- Captures stdout/stderr into an editor console panel.
- Surfaces Lua runtime errors with file:line, clickable to jump to source.
- Command to stop the running instance.

Acceptance:
- "LÖVE: Run" launches the project root (nearest ancestor containing `main.lua`).
- Console panel shows live output; a runtime error line is clickable and opens the offending file at the line.
- Configurable binary path is respected; missing binary yields a clear notification.

### 2.4 API hover docs

- Hovering a `love.*` symbol shows a tooltip with signature, parameters, returns, and description.
- Data sourced from the same bundled dataset as autocomplete.

Acceptance:
- Hovering `love.graphics.draw` shows its signature, parameter list, and description.
- Unknown symbols show no tooltip (no error).

## 3. Tech Stack & Constraints

| Category | Choice |
|----------|--------|
| Language | TypeScript |
| Runtime / toolchain | Bun (latest); Node 22 compatible |
| Test runner | `bun test` |
| Host | Pulsar editor package |
| LÖVE API data | Bundled, versioned JSON dataset |

Constraints:
- No network calls at runtime; the API dataset ships in the package.
- Package must load in Pulsar's package host (CommonJS/ESM per Pulsar's loader; build output targets what Pulsar consumes).
- No em dashes in source, docs, or output.

## 4. Project Structure

```
love-pulsar/
  package.json            # Pulsar package manifest + npm scripts
  SPEC.md
  CLAUDE.md
  tsconfig.json
  src/
    main.ts               # package entry: activate/deactivate, wires providers
    autocomplete/
      provider.ts         # autocomplete provider
    hyperclick/
      provider.ts         # hyperclick/go-to-def provider
      resolve.ts          # require() + local symbol resolution
    run/
      runner.ts           # spawn love binary, manage process
      console.ts          # output panel + clickable errors
    hover/
      provider.ts         # hover doc provider
    api/
      dataset.ts          # load + query bundled LOVE API JSON
      types.ts            # shared API types
    config.ts             # package settings schema (love binary path, source dirs)
  data/
    love-api.json         # bundled, versioned LOVE API dataset
  test/
    autocomplete.test.ts
    hyperclick.test.ts
    run.test.ts
    hover.test.ts
    api-dataset.test.ts
  dist/                   # build output consumed by Pulsar (generated)
```

## 5. Code Style

- TypeScript, strict mode on.
- Explicit types on public/exported functions; infer locals.
- Pure logic (parsing, resolution, dataset queries) kept separate from Pulsar host API calls, so it is unit-testable without the editor.
- Host-facing modules (`main.ts`, providers) thin; delegate to pure modules.
- No em dashes anywhere.
- Naming: camelCase functions/vars, PascalCase types, kebab-case files/dirs.
- Errors surfaced to the user as Pulsar notifications; never throw across the host boundary.

## 6. Testing Strategy

- Runner: `bun test`.
- Unit tests cover the pure layer with no editor dependency:
  - `api/dataset` query + load correctness against `data/love-api.json`.
  - `hyperclick/resolve` require-path and local-symbol resolution over fixture files.
  - `run/console` error-line parsing (file:line extraction) from sample LÖVE error output.
  - autocomplete/hover suggestion shaping from dataset.
- Host boundary (Pulsar API) mocked via thin adapter interfaces so providers can be tested without a live editor.
- Fixtures: sample LÖVE project under `test/fixtures/` (with `main.lua`, `require`d modules, sample error output).
- Target: every pure module has tests; every acceptance criterion in section 2 maps to at least one test.

## 7. Boundaries

### Always do
- Ship the LÖVE API dataset in-package; work fully offline at runtime.
- Keep pure logic decoupled from the Pulsar host API for testability.
- Add/extend tests with every feature change.
- Surface failures (missing binary, unresolved target) as user notifications.

### Ask first
- Adding a runtime network dependency.
- Adding a second editor host (VSCode, Neovim) or extracting an LSP server.
- Changing the API data source strategy (bundled JSON -> build-time parse).
- Adding a step-debugger / debug adapter protocol.

### Never do
- Use em dashes in code, docs, commit messages, or output.
- Author or co-author commits.
- Push upstream.
- Make network calls at runtime.
