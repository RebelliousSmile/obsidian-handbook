---
objective: "Roller tables expose their contextual roll action in Obsidian reading mode, and the Windows end-to-end journey selects the two visible tables deterministically."
status: in-progress
---

# Plan: Fix Roller reading-mode menu and Windows E2E rendering

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Fix the two symptoms reported in GitHub ticket #50 without changing Roller table syntax or Dice Roller integration. |
| **Source** | [GitHub ticket #50](https://github.com/RebelliousSmile/obsidian-handbook/issues/50) |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Preserve the Roller context action in reading mode | [`phase-1.md`](./phase-1.md) |
| 2 | Make Windows Roller rendering assertions visibility-scoped | [`phase-2.md`](./phase-2.md) |

## Decisions

| Decision | Why |
| --- | --- |
| Bind the action to the clicked rendered table and consume that browser event. | The native Obsidian menu must not replace a table-scoped action, and no editor-global stale table state is reintroduced. |
| Drive E2E from visible Roller tables under the active Markdown view, not all matching DOM nodes. | Obsidian 1.13.7 can retain duplicate renderer nodes: CI observed four matches while the active preview correctly contained two authored tables. |
