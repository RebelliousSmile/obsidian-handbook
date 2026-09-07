---
objective: "Legend in the Mist renders challenge, journey and theme-kit code blocks as styled cards through a shared block registry, with the existing story-theme card renamed and kept working."
status: implemented
---

<!-- Fill or omit these sections; never add, rename, or reorder one. -->

# Plan: Legend in the Mist block formats

## Overview

| Field      | Value                                                                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Goal**   | Add Challenge, Journey and Theme Kit code blocks to the Legend in the Mist mode, on a registry that removes the per-block wiring duplication.                                    |
| **Source** | Conversation spec of 2026-09-06 (four block grammars), grounded on `Legend_in_the_Mist_Core_Book-1.txt` and `Hearts_of_Ravensdale_I_The_Dales.pdf`, plus `src/features/storyThemes/`. |

## Phases

| #   | Phase                     | File                         |
| --- | ------------------------- | ---------------------------- |
| 1   | Block registry            | [`phase-1.md`](./phase-1.md) |
| 2   | Challenge block           | [`phase-2.md`](./phase-2.md) |
| 3   | Journey block             | [`phase-3.md`](./phase-3.md) |
| 4   | Theme kit block           | [`phase-4.md`](./phase-4.md) |
| 5   | Theme card rename         | [`phase-5.md`](./phase-5.md) |

## Resources

<!-- External sources only (URLs, docs), not code files. Omit if none consulted. -->

| Source                                                                                          | Verified                                                                                                                                        |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `RPG/legends-in-the-mist/_sources/chapitres-litm/08_Chapter_V_The_Satchel_of_Perils.md`          | Challenge profile anatomy (roles, LIMITS, MIGHT, TAGS & STATUSES, SPECIAL FEATURES, THREATS & CONSEQUENCES); Journey and Vignette definitions.    |
| `RPG/legends-in-the-mist/_sources/chapitres-litm/03_Chapter_I_The_Makings_of_a_Hero.md`          | Theme kit shape: themebook category, kit name, 9 power tags, 4 weakness tags, one Quest.                                                          |
| `RPG/legends-in-the-mist/_sources/Legend_in_the_Mist_Core_Book-1.txt` (l. 1874, 5243, 5500)      | A Story Theme is a title tag, extra tags and one negative tag; origin/adventure/greatness are Might levels of Hero themes, not Story Themes.      |
| `RPG/legends-in-the-mist/_sources/Hearts_of_Ravensdale_I_The_Dales.pdf` (p. 216, 249-258)        | Adds `SECRETS` to challenge profiles and a named Special Improvement to theme kits; confirms `Suggested Benefits:` on Undertaking journeys only. |

## Decisions

<!-- Architecture-magnitude only, one you'd regret reversing. Omit if none qualify. -->

| Decision                                                                                                                                | Why                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A single `BrumesBlock<T>` registry owns block id, mode, feature flag, parser, renderer and insertion template.                            | Each new format otherwise touches five wiring points (processor, context menu, feature flag, normalizer, settings tab). The registry turns that into one entry.                  |
| Feature flags stay flat booleans on `BrumesFeatureSettings`, one per block, rather than a keyed map.                                      | `data.json` already holds `features.storyThemeParser`; a map would silently drop the user's saved value on upgrade.                                                              |
| The existing `story-theme` block is renamed `theme-card`, with `story-theme` kept as an alias, instead of shipping a second block.        | The block already renders both objects: with a level it is a Hero theme, without one it is exactly the core-book Story Theme. A rename fixes the name; a new block would duplicate. |
| Each format ships as its own PR toward `4rtamis/obsidian-brumes`, behind its own feature flag, after the registry PR.                     | One branch, one topic, one PR is the repo rule; a flagged block can land without forcing the parser on existing vaults. If the upstream author declines a pure-refactor PR, phase 1 folds into the challenge PR so the diff carries a visible feature; the phase order does not change, only the PR boundary. |
