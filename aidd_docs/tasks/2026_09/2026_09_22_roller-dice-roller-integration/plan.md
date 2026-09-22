---
objective: "Handbook can render pack-declared rollers backed by native Dice Roller tables and copy one selected table result from its contextual menu."
status: blocked
---

# Plan: Pack-declared Dice Roller tables

## Overview

| Field      | Value                   |
| ---------- | ----------------------- |
| **Goal**   | Add a portable `roller` primitive whose one-or-more tables remain native Markdown targets for Dice Roller, then let Handbook roll and copy a selected table result. |
| **Source** | Conversation of 22 September 2026 and `C:\Users\fxgui\Documents\Perso\RPG\monsterhearts\2026\09\nastya-lebedeva\parallaxe.md` |

## Phases

| #   | Phase        | File                         |
| --- | ------------ | ---------------------------- |
| 1   | Publish the roller contract | [`phase-1.md`](./phase-1.md) |
| 2   | Render and roll in Handbook | [`phase-2.md`](./phase-2.md) |
| 3   | Prove the integration | [`phase-3.md`](./phase-3.md) |

## Resources

| Source | Verified |
| ------ | -------- |
| https://github.com/obsidian-ttrpg-community/dice-roller | A table roller targets a native Markdown table through a note/block wikilink; the plugin exposes `getRoller(diceString, sourceFile)`. |

## Decisions

| Decision | Why |
| -------- | --- |
| A new `schema-roller` package owns the shared `roller` capability, while each pack owns its oracle and table content. | Handbook must not hard-code Parallaxe or any game’s semantics, and a PbtA-specific schema cannot own a primitive intended for every game family. |
| A roller references a native Markdown table by a stable Dice Roller block reference; it does not embed that table in a fenced code block. | Dice Roller reads source tables, not a table produced only by Handbook’s renderer. |
| Copying a result is non-mutating and requires Dice Roller to be installed. | The player chooses where to paste a result and the plugin remains the single roll engine. |
