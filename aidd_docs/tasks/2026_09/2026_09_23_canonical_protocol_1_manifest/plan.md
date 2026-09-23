---
objective: "Handbook accepts the canonical three-key protocol-1 manifest and derives adjacent evidence without changing the evidence envelope."
status: in-progress
---

# Plan: Accept the canonical protocol-1 manifest

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Remove the runner-supplied evidence path from Handbook’s protocol-1 input while retaining immutable candidate-adoption evidence. |
| **Source** | GitHub issue [#57](https://github.com/RebelliousSmile/obsidian-handbook/issues/57) |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Derive adjacent evidence from the canonical manifest | [phase-1.md](./phase-1.md) |
| 2 | Prove and document the three-key contract | [phase-2.md](./phase-2.md) |

## Resources

| Source | Verified |
| --- | --- |
| [Handbook #57](https://github.com/RebelliousSmile/obsidian-handbook/issues/57) | The canonical protocol-1 input contains only `protocol`, `candidate`, and `consumers`; evidence remains adjacent to the manifest. |

## Decisions

| Decision | Why |
| --- | --- |
| Derive `<manifest>.evidence.json` inside Handbook rather than accepting it as manifest data. | The canonical producer contract has three input keys, and the evidence location is a deterministic consumer-side convention. |
| Reject `evidencePath` as an unexpected input field. | Accepting a legacy extension would hide producer drift and recreate the Lantern/Handbook contract split. |
