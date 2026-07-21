# love-pulsar Task List

Detail in [plan.md](./plan.md). Order top to bottom; `[P]` = parallelizable within its phase.

## Phase A — Foundation
- [ ] T0 Scaffold: package.json, tsconfig (strict), build to dist/, main.ts activate/deactivate, host adapter interface, smoke test
- [ ] CHECKPOINT 1 — `bun test` green + package loads in Pulsar. Human review.

## Phase B — API-data features
- [ ] T1 API dataset: data/love-api.json seed, api/types.ts, api/dataset.ts (load + prefix/path query) + tests
- [ ] T2 [P] Autocomplete provider + tests
- [ ] T3 [P] Hover docs provider + tests
- [ ] CHECKPOINT 2 — autocomplete + hover work offline against dataset. Human review.

## Phase C — Navigation & run
- [ ] T4 [P] Hyperclick: resolve.ts (require + local defs), provider.ts, fixtures + tests
- [ ] T5 [P] Run/debug: runner.ts (spawn love, nearest main.lua, stop), console.ts (error file:line parse) + tests
- [ ] CHECKPOINT 3 — go-to-def + launch/error-click work. Human review.

## Phase D — Ship
- [ ] T6 Config settings schema (love binary path, source dirs) + defaults test
- [ ] T7 Package polish, README, full test pass, acceptance-criteria -> test mapping
- [ ] CHECKPOINT 4 — all section-2 acceptance criteria pass; installable. Human review.
