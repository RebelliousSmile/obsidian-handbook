---
objective: "Handbook can render a generic roller block containing a Markdown table and copy one Dice Roller result from that table’s contextual menu."
status: in-progress
---

# Plan: Generic Dice Roller tables

## Overview

| Field      | Value                   |
| ---------- | ----------------------- |
| **Goal**   | Add a generic `roller` block that parses its own Markdown table, delegates randomness to Dice Roller, and copies the selected result. |
| **Source** | Conversation of 22 September 2026 |

## Phases

| #   | Phase        | File                         |
| --- | ------------ | ---------------------------- |
| 1   | Render generic roller tables | [`phase-1.md`](./phase-1.md) |
| 2   | Delegate and copy results | [`phase-2.md`](./phase-2.md) |

## Resources

| Source | Verified |
| ------ | -------- |
| https://github.com/obsidian-ttrpg-community/dice-roller | The plugin exposes formula rollers and array rollers, which let Handbook delegate a block-contained table’s randomness without a schema-specific target. |

## Decisions

| Decision | Why |
| -------- | --- |
| `roller` is a Handbook block with no schema or pack capability. | Its table grammar and interaction are invariant across games. |
| A roller contains one Markdown table and parses it locally. | Authors can write tables where they need them and right-click the rendered table directly. |
| Ordinary tables use Dice Roller’s array API; lookup tables roll their declared formula through Dice Roller before Handbook selects its matching row. | Both paths retain Dice Roller as the random engine without requiring an external table target. |
| Copying a result is non-mutating and requires Dice Roller to be installed. | The player chooses where to paste a result and the plugin remains the single roll engine. |
