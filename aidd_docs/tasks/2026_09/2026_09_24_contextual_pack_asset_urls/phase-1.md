---
status: done
---

# Instruction: Make contextual harnesses schema-module compatible

## Architecture projection

> Tree of the final files. ✅ create · ✏️ modify · ❌ delete

```txt
tools/
├── assert-contextual-pack-blocks.mjs ✏️ bundles and runs the contextual block harness as ESM, then removes its project-local temporary directory
└── assert-contextual-toml-export.mjs ✏️ bundles and runs the contextual TOML harness with the same ESM and cleanup boundary
```

## User Journey

```mermaid
flowchart TD
  A[Run a contextual assertion] --> B[Build an ESM harness with an Obsidian stub]
  B --> C[Schema asset module resolves import.meta.url]
  C --> D[Harness reports its assertion result]
  D --> E[Temporary harness directory is removed]
```

## Test Scope

```mermaid
---
title: Test scope
---
journey
  section Setup
    system: create a project-local harness directory and Obsidian stub => ESM bundle inputs are ready: 5: fs
  section Happy path
    cli: run contextual pack-block and TOML-export assertions => published schema assets load and both assertions pass: 5: cli
  section Edge case - schema asset module
    system: evaluate a module that uses import.meta.url => relative package asset URL has a valid module base: 5: cli
  section Teardown
    system: finish each harness run => its temporary directory no longer exists: 5: fs
```

## Tasks to do

### `1)` Convert contextual bundle execution to ESM

> Preserve the module context required by published schema asset modules.

1. Write contextual bundles with an `.mjs` output.
2. Configure esbuild for Node ESM while retaining the local Obsidian stub alias.
3. Externalize PostCSS so Node loads its CommonJS implementation without an ESM dynamic-require shim.
4. Keep the existing contextual assertions as the regression: their published schema-pack imports must run without a new synthetic fixture.

### `2)` Make lifecycle cleanup observable and reliable

> Prevent an assertion exit status from bypassing temporary-directory cleanup.

1. Capture the spawned harness status instead of exiting inside the `try` block.
2. Remove the work directory in `finally`.
3. Exit with the captured status only after cleanup completes.

## Test acceptance criteria

| Task | Acceptance criteria |
| --- | --- |
| 1 | Both contextual assertions load the published schema asset module without an `Invalid URL` error. |
| 1 | PostCSS-dependent code executes without an ESM dynamic-require failure. |
| 1 | The existing contextual assertions remain the regression coverage for the published relative-asset module path. |
| 2 | Passing and failing harness runs remove their project-local temporary directories before returning a process status. |
