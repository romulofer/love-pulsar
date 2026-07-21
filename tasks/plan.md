# love-pulsar Implementation Plan

Source: [SPEC.md](../SPEC.md). Empty repo, greenfield.

## Strategy

Vertical slices. Each feature task delivers one complete path (data -> pure logic -> host adapter -> tests) that can be verified in isolation. Foundation and shared API dataset come first because every feature depends on them.

## Dependency Graph

```
T0 Scaffold (build, bun test, main.ts activate/deactivate)
        |
        +--> T1 API dataset (data/love-api.json, api/dataset.ts, types)
        |         |
        |         +--> T2 Autocomplete   (depends dataset)
        |         +--> T3 Hover docs      (depends dataset)
        |
        +--> T4 Hyperclick / go-to-def   (depends scaffold only)
        |
        +--> T5 Run / debug LOVE          (depends scaffold only)
        |
        +--> T6 Config settings           (used by T4, T5; ship-time wiring)
                  |
                  v
             T7 Package polish + README + full test pass
```

Parallelizable after T1: {T2, T3} and independently {T4}, {T5}. T6 config keys land with the feature that needs them; T7 last.

## Phases & Checkpoints

### Phase A — Foundation
- **T0** Scaffold.
- **CHECKPOINT 1**: `bun test` runs (green, even if only a smoke test). Package activates/deactivates in Pulsar without error. Human review before feature work.

### Phase B — API-data features
- **T1** API dataset.
- **T2** Autocomplete.
- **T3** Hover docs.
- **CHECKPOINT 2**: autocomplete + hover work against bundled dataset, offline. Human review.

### Phase C — Navigation & run
- **T4** Hyperclick / go-to-def.
- **T5** Run / debug LOVE.
- **CHECKPOINT 3**: can jump to require targets + local symbols; can launch a LOVE project and click an error line. Human review.

### Phase D — Ship
- **T6** Config settings (consolidate).
- **T7** Package polish, README, full test + acceptance-criteria mapping pass.
- **CHECKPOINT 4**: all section-2 acceptance criteria pass; ready for install. Human review.

## Task Detail

### T0 Scaffold [DONE]
- Create `package.json` (Pulsar manifest fields + npm scripts: `build`, `test`), `tsconfig.json` (strict), build to `dist/`.
- `src/main.ts` with `activate()`/`deactivate()` wiring stubs + disposables.
- Define host adapter interface(s) so pure logic never imports Pulsar directly.
- One smoke test.
- **Acceptance**: `bun test` green; build emits `dist/`; package loads in Pulsar.
- **Verify**: `bun run build && bun test`; manual load in Pulsar dev mode.

### T1 API dataset [DONE]
- Seed `data/love-api.json` (modules/functions/callbacks/enums with signature, params, returns, description).
- `src/api/types.ts` shared types; `src/api/dataset.ts` load + query (lookup by path, prefix search).
- **Acceptance**: dataset loads; `query('love.gr')` returns `love.graphics`; member lookup works; no runtime network.
- **Verify**: `bun test test/api-dataset.test.ts`.

### T2 Autocomplete [DONE]
- `src/autocomplete/provider.ts` shapes suggestions (type, signature snippet, description) from dataset via host adapter.
- **Acceptance**: `love.gr` -> `love.graphics`; members after `love.graphics.`; each suggestion has type+signature+description.
- **Verify**: `bun test test/autocomplete.test.ts`.

### T3 Hover docs
- `src/hover/provider.ts` builds tooltip (signature, params, returns, description) from dataset.
- **Acceptance**: hover `love.graphics.draw` shows signature+params+description; unknown symbol -> no tooltip, no error.
- **Verify**: `bun test test/hover.test.ts`.

### T4 Hyperclick / go-to-def
- `src/hyperclick/resolve.ts`: resolve `require('a.b')` -> `a/b.lua` under project root / configured source dirs; resolve local function/var defs.
- `src/hyperclick/provider.ts`: host wiring; LOVE API symbols link to hover/reference.
- Fixture LOVE project under `test/fixtures/`.
- **Acceptance**: `require('foo.bar')` opens `foo/bar.lua`; local `function` name jumps to def line; missing target -> notification, no crash.
- **Verify**: `bun test test/hyperclick.test.ts`.

### T5 Run / debug LOVE
- `src/run/runner.ts`: spawn `love` at nearest ancestor with `main.lua`; configurable binary path + platform defaults; stop command.
- `src/run/console.ts`: output panel + parse `file:line` from LOVE error output into clickable entries.
- **Acceptance**: "LOVE: Run" launches project root; console shows live output; error line clickable opens file at line; missing binary -> clear notification.
- **Verify**: `bun test test/run.test.ts` (error-parse + nearest-main.lua logic); manual launch.

### T6 Config settings
- `src/config.ts`: settings schema (love binary path, source dirs). Consolidate keys introduced by T4/T5.
- **Acceptance**: settings appear in Pulsar; binary path respected by runner; source dirs respected by resolver.
- **Verify**: unit test config defaults; manual settings check.

### T7 Package polish + README
- README (install, features, settings, dev). Map every section-2 acceptance criterion to a test.
- **Acceptance**: full `bun test` green; each acceptance criterion has >=1 test; package installable.
- **Verify**: `bun run build && bun test`; fresh Pulsar install smoke.

## Constraints (from SPEC boundaries)
- No em dashes. No runtime network. Pure logic decoupled from host. No co-author commits, no upstream push.
