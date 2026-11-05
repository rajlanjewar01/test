# ADR 0001: Testing Vue single-file components with Mocha

## Status

Accepted, pending verification on the author's machine and in CI (E0-05).

## Context

The project fixes Mocha and Chai for frontend tests, with `@vue/test-utils`, jsdom, MSW and c8.
Mocha cannot load `.vue` files on its own, so something has to compile them. Jest and Vitest are
ruled out by the project brief.

## Decision

A small in-process loader in `apps/web/test-support`:

- `register-vue-loader.mjs` uses `module.registerHooks()` to intercept `.vue` imports.
- `compile-sfc.mjs` parses the file with `vue/compiler-sfc` (the same package as
  `@vue/compiler-sfc`), keeps the `<script>` block on the same line numbers as the source, compiles
  the `<template>` to a render function, and runs the result through esbuild to emit an inline
  source map that points back at the `.vue` file.
- `setup-dom.mjs` installs jsdom globals but leaves Node's `fetch`, `Event` and `AbortController`
  alone, so MSW intercepts the native fetch.

## Consequences

- Coverage for a `.vue` file is attributed to its script block. The generated render function is
  not mapped, so template code is not counted.
- Supported: Options API, plain JavaScript `<script>`, `<template>`. Not supported (with a clear
  error): `<script setup>` and `lang="ts"`. `<style>` blocks are ignored.
- c8 runs with `all: true`, so a `.vue` file that no test loads is counted from its raw source
  and reported as uncovered. Every component therefore needs a test.
- The loader is about 50 lines of our own code to maintain, and tracks `vue/compiler-sfc`.

## Alternatives

- **Vite-based runner (vite-node) under Mocha.** Handles `.vue` through the Vite plugin and gives
  proper source maps, at the cost of another moving part and a second module pipeline.
- **Pre-building test bundles with Vite.** Closest to production output, but slower, and coverage
  maps through bundles.
- **`module.register()` with a separate loader thread.** Works too. `registerHooks()` was chosen
  because it runs in-process and synchronously, which keeps source maps and coverage simple.
- **Jest or Vitest.** Excluded by the project brief.

## Escalation

Stop and bring the options to the project owner if any of these happen: coverage cannot be mapped
accurately onto `.vue` files, the loader needs features it was not designed for (TypeScript,
`<script setup>`), or maintaining it costs more than adopting the Vite-based runner.
