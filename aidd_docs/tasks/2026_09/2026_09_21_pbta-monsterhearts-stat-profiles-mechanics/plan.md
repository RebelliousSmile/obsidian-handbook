---
objective: "A valid Monsterhearts playbook renders its published starting-stat profiles and every declared specialized mechanic as structured content while retaining the established PbtA region order."
status: in-progress
---

# Plan: Render Monsterhearts stat profiles and mechanics as structured regions

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Project the portable `statProfiles` field inside the existing PbtA stats region, and render Monsterhearts strings, ascendants, conditions, and advances from their published structure rather than JavaScript object coercion. An empty `stats` record remains an intentional unselected state and does not suppress profiles. |
| **Source** | GitHub issue [#43](https://github.com/RebelliousSmile/obsidian-handbook/issues/43) — `fix(pbta): render Monsterhearts stat profiles and mechanics as structured regions`. |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Project published PbtA structures into existing regions | [`phase-1.md`](./phase-1.md) |
| 2 | Prove profile and Monsterhearts mechanic rendering | [`phase-2.md`](./phase-2.md) |

## Resources

| Source | Verified |
| --- | --- |
| [schema-pbta v5.5.0](https://github.com/RebelliousSmile/schema-pbta/releases/tag/v5.5.0) | The installed v5.5.0 package defines portable `statProfiles` and Monsterhearts `strings`, `ascendants`, `conditions`, and `advances`; its accepted corpus includes populated and empty optional Monsterhearts collections. |

## Decisions

| Decision | Why |
| --- | --- |
| Keep profiles within the established `stats` region and specialized structures within the established `mechanics` region. | The block shape already publishes this order; grouping published values inside those regions preserves the contract instead of adding a consumer-local game region. |
| Derive labels, fields, and ordering exclusively from schema-published property names and values. | Handbook owns DOM projection and style, while schema-pbta owns the game data vocabulary; no rules or selection behavior is inferred from a profile or mechanic. |
