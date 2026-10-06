---
objective: "Every finding of the callouts and options audits is fixed or explicitly deferred, with build, both lint scopes and the callout/settings harnesses green and no change to the rendered DOM."
status: implemented
---

<!-- Fill or omit these sections; never add, rename, or reorder one. -->

# Plan: corrections of the callouts and options audits

## Overview

| Field      | Value                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Goal**   | Close the two unchecked inputs, remove the duplicated callout logic, break the settings ↔ callouts cycle, slim the settings tab |
| **Source** | [`code-quality.md`](./code-quality.md) and [`architecture.md`](./architecture.md), audit of 2026-10-06                          |

## Phases

| #   | Phase                                          | File                         |
| --- | ---------------------------------------------- | ---------------------------- |
| 1   | Close the unchecked inputs (id, native alias)  | [`phase-1.md`](./phase-1.md) |
| 2   | One visibility filter and callout-domain DRY   | [`phase-2.md`](./phase-2.md) |
| 3   | Make the callout types a leaf, break the cycle | [`phase-3.md`](./phase-3.md) |
| 4   | Table-driven settings tab, dead code out       | [`phase-4.md`](./phase-4.md) |
| 5   | Split the settings tab by domain               | [`phase-5.md`](./phase-5.md) |

## Decisions

| Decision                                                                                                 | Why                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Architecture row 2 (settings sections declared by the game packs, `gameSettings.ts:15`) is **deferred**. | L effort, and it changes the `GamePack` contract (`schemas/appearance`, owned by Handbook). Schedule it with the next built-in game, not as a cleanup. |
| The `features.*` keys and legacy flags (`tagsSyntax`, `adrenaline*Parser`) stay untouched.               | Frozen `data.json` format, kept on purpose (`game-packs.md:21`); the audit did not count them as findings.                                             |
| The rendered DOM must not change: `pnpm dump:dom` is compared before phase 1 and after each phase.       | Every phase is a refactor except phase 1, whose only visible effect is an invalid id being regenerated.                                                |
| Order 1 → 5, one commit per phase, on `main`.                                                            | Phase 1 is the only behavioural fix; phase 3 precedes 5 so the domain modules import a leaf; phase 4 precedes 5 so the split moves already-compact code. |
