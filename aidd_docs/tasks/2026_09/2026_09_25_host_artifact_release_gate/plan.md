---
objective: "Handbook publishes a patch release only after its exact production bundle loads in Obsidian 1.13.7, provider candidate evidence includes that proof, and final schema pins are canonical and integrity checked."
status: in-progress
---

# Plan: Gate Handbook publication on an Obsidian plugin load

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Prove the production plugin in a fresh Obsidian vault, enforce that proof in candidate and release paths, then ship a consistent patch release. |
| **Source** | GitHub issue [#63](https://github.com/RebelliousSmile/obsidian-handbook/issues/63) |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Guard and diagnose the production bundle | [phase-1.md](./phase-1.md) |
| 2 | Require host load in candidate and publication gates | [phase-2.md](./phase-2.md) |
| 3 | Adopt final provider archives and publish the patch | [phase-3.md](./phase-3.md) |

## Resources

| Source | Verified |
| --- | --- |
| [Handbook issue #63](https://github.com/RebelliousSmile/obsidian-handbook/issues/63) | Failure, required gates, final pins, and release acceptance criteria. |
| [schema-pbta releases](https://github.com/RebelliousSmile/schema-pbta/releases) | A final v8.4.3 archive and staged candidate exist as release context; a corrected candidate must still pass the new host gate before the patch adopts its final bytes. |

## Decisions

| Decision | Why |
| --- | --- |
| Treat the built `dist/main.js` and a real isolated Obsidian 1.13.7 vault as the release artifact proof. | The existing source and contract checks passed while Obsidian rejected the published bundle. |
| Keep the schema-owned release-train manifest exact and add host proof to Handbook-owned evidence. | The cross-repository rule forbids consumer fields in the orchestration manifest. |
| Publish only from final provider release URLs with verified lockfile SRI. | Staging URLs are not the canonical consumer pin after promotion. |
