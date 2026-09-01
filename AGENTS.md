# Wave Arena — Agent Context

## Goal

Wave Arena is a deterministic 2D wave-arena shooter. The current frontend is a web prototype. Core gameplay must remain portable to Unity.

## Architecture

* `src/core`: engine-independent game rules, state and content.
* `src/web`: browser-only input, rendering, HUD and audio.
* `src/core` MUST NOT depend on DOM, Canvas, browser APIs or Unity concepts.
* Unity will eventually replace `src/web`; core behaviour must be preserved.

## Important files

* `src/core/Simulation.ts`: main simulation and run lifecycle.
* `src/core/types.ts`: shared state/data contracts.
* `src/core/content/*`: classes, boosts, enemies, waves, strategic systems and progression.
* `src/core/rng.ts`: deterministic Mulberry32 RNG.
* `src/web/main.ts`: web orchestration.
* `src/web/InputAdapter.ts`: browser input.
* `src/web/CanvasView.ts`: browser renderer.

## Core invariants

* WORLD = 2880 × 1620.
* VIEW = 960 × 540.
* Never replace seeded RNG with `Math.random()`.
* Preserve deterministic behaviour for identical seed + inputs.
* Preserve Simulation tick ordering unless the task explicitly changes it.
* Gameplay rules belong in `src/core`, not `src/web`.
* Content/data should live under `src/core/content`.

## Commands

* `npm run dev`
* `npm test`
* `npm run build`

## Agent change rules

1. Work only on the claimed task.
2. Do not perform unrelated refactors.
3. Read the smallest relevant file set first.
4. Add/update tests for gameplay-rule changes.
5. Run `npm test` and `npm run build` before completion.
6. Do not modify public contracts unnecessarily.
7. Do not introduce browser dependencies into `src/core`.
8. Avoid simultaneous edits to `Simulation.ts`; treat it as a single-writer file until decomposed.
9. Preserve existing seeded behaviour unless acceptance criteria explicitly require a behaviour change.
10. At completion report only:

* changed files
* behaviour changed
* tests added/changed
* test/build result

## Task prompt

Implement task `<TASK_ID>` according to its acceptance criteria.

Read `AGENTS.md` first. Inspect only the files necessary for the task. Do not broaden scope. Preserve architecture and deterministic behaviour. Add relevant tests, then run `npm test` and `npm run build`.
