---
objective: "Schema-aware assertion harnesses execute published asset modules without CommonJS import.meta failures, and the complete Handbook check passes."
status: in-progress
---

# Plan: Resolve contextual pack asset URL check failures

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Run schema-aware assertion harnesses in a module format that preserves asset `import.meta.url` resolution and deterministic cleanup. |
| **Source** | GitHub issue [#58](https://github.com/RebelliousSmile/obsidian-handbook/issues/58) |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Make contextual harnesses schema-module compatible | [phase-1.md](./phase-1.md) |
| 2 | Cover shared harnesses and prove the full check | [phase-2.md](./phase-2.md) |

## Resources

| Source | Verified |
| --- | --- |
| [Handbook #58](https://github.com/RebelliousSmile/obsidian-handbook/issues/58) | The failing check must handle schema-pack relative font assets and retain a regression. |

## Decisions

| Decision | Why |
| --- | --- |
| Execute harness bundles as ESM and keep PostCSS external. | Published schema modules use `import.meta.url`; bundling PostCSS CommonJS into ESM introduces unsupported dynamic requires. |
| Keep generated harnesses beneath `tools/` until cleanup. | Node resolves project dependencies from this location while the harness remains isolated and removed after each run. |
