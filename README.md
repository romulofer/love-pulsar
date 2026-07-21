# love-pulsar

Coding tooling for making [LOVE (love2d)](https://love2d.org) games inside the
[Pulsar](https://pulsar-edit.dev) editor. It combines, in one maintained and
tested package, the functionality of three Atom-era packages:

- autocomplete-love (LOVE API autocomplete)
- hyperclick-love (Ctrl/Cmd-click go-to-definition)
- love-ide (run LOVE from the editor)

## Features

- **Autocomplete** for the `love.*` API surface. Typing `love.gr` suggests
  `love.graphics`, and `love.graphics.` lists its members. Each suggestion shows
  its type, signature, and description, sourced from a bundled dataset (no
  network at runtime).
- **Hover docs.** Hovering a `love.*` symbol shows its signature, parameters,
  returns, and description.
- **Go-to-definition.** Ctrl/Cmd-click a `require('foo.bar')` to open
  `foo/bar.lua`, or a locally defined function to jump to its definition. LOVE
  API symbols link to their online reference. Unresolved targets produce a
  notification, never a crash.
- **Run LOVE.** Launch the current project (the nearest ancestor containing
  `main.lua`) with the `love` binary, capture output, surface runtime errors as
  clickable `file:line`, and stop the running instance. A status-bar button runs
  the project with one click.
- **Diagnostics.** A linter flags `love.*` symbols that are not part of the LOVE
  API as warnings (squiggles), sourced from the same bundled dataset.

The hover, go-to-definition, and diagnostics features rely on Pulsar's
`hyperclick`, `atom-ide-datatip`, and `linter` packages; love-pulsar installs
them automatically on first activation.

## Install

From Pulsar:

```
pulsar -p install love-pulsar
```

Or clone into your packages directory and build:

```
git clone <repo> love-pulsar
cd love-pulsar
bun install
bun run build
```

## Commands

- `love-pulsar:run` - launch the current LOVE project.
- `love-pulsar:stop` - stop the running instance.

## Settings

- **LOVE binary path** (`love-pulsar.loveBinaryPath`) - path to the `love`
  executable. Empty uses the platform default (`love` on PATH; the app bundle on
  macOS; `love.exe` on Windows).
- **Source directories** (`love-pulsar.sourceDirs`) - directories, relative to
  the project root, searched when resolving `require()` paths. Defaults to `.`.

## Development

```
bun install        # install dev dependencies
bun test           # run the test suite
bun run build      # compile TypeScript to dist/
bun run typecheck  # type-check without emitting
```

The architecture keeps all logic pure and host-agnostic under `src/` (API
dataset, autocomplete, hover, hyperclick resolution, run logic). The Pulsar host
API is touched only in `src/main.ts`, so every feature is unit-tested without a
live editor. Fixtures for a sample LOVE project live under `test/fixtures/`.

### Regenerating the API dataset

`data/love-api.json` powers autocomplete, hover, and the linter. It is generated
from the [love2d-community/love-api](https://github.com/love2d-community/love-api)
source:

```
git clone --depth 1 https://github.com/love2d-community/love-api /tmp/love-api
lua scripts/build-dataset.lua /tmp/love-api > data/love-api.json
```

## License

MIT
