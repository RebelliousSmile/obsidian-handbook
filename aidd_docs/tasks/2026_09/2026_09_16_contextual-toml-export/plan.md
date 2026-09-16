---
objective: "The Handbook context menu copies the TOML export of the supported fenced block under the cursor, without presenting irrelevant export actions."
status: implemented
---

# Plan: Contextual TOML export

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Make the existing TOML export command directly available from Handbook’s editor context menu for the block under the cursor. |
| **Source** | User request, 2026-09-16. |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Add contextual export and coverage | [`phase-1.md`](./phase-1.md) |

## Decisions

| Decision | Why |
| --- | --- |
| Show only the one export matching the fenced block at the cursor. | The menu stays short and the action cannot accidentally serialize an unrelated block type. |
