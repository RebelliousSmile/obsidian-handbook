---
objective: "Handbook exposes a pack-by-pack integration check that names every installed pack’s runtime readiness and actionable gaps."
status: implemented
---

# Plan: Pack integration check

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Complement PbtA coverage with a runtime integration report for every installed game pack. |
| **Source** | Conversation of 22 September 2026. |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Measure pack readiness | [`phase-1.md`](./phase-1.md) |
| 2 | Present and prove the check | [`phase-2.md`](./phase-2.md) |

## Decisions

| Decision | Why |
| --- | --- |
| The check reports installation/runtime integration, not note validity. | A pack’s readiness can be measured from its registration and manifest without scanning user content. |
| Findings are pack-specific and actionable. | A single global “coverage” count cannot tell an author which pack needs attention. |
