---
objective: "Monsterhearts playbooks use a compact, recognisable editorial layout and pack-published typography without changing their schema data or affecting other PbtA packs."
status: in-progress
---

# Plan: Give PbtA playbooks a Monsterhearts editorial layout

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Publish IM Fell English and Averia Serif Libre with explicit Monsterhearts text/title roles, then use the existing PbtA block regions to produce a responsive, scoped Monsterhearts editorial projection. |
| **Source** | GitHub issue [#44](https://github.com/RebelliousSmile/obsidian-handbook/issues/44), extended with the reported schema-appearance reintegration regression: the pack references, but does not distribute, its two SIL OFL typefaces and their licences. |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Publish Monsterhearts typography in schema-pbta | [`phase-1.md`](./phase-1.md) |
| 2 | Project the published layout in Handbook | [`phase-2.md`](./phase-2.md) |
| 3 | Prove scope, responsive layout, and installed assets | [`phase-3.md`](./phase-3.md) |

## Resources

| Source | Verified |
| --- | --- |
| [schema-pbta Monsterhearts pack](https://github.com/RebelliousSmile/schema-pbta/tree/main/handbook/monsterhearts) | The installable pack has `pack.json`, assets, styles, and previews; Handbook’s source installer already copies every declared `assets.fonts` file. |
| [schema-pbta v5.5.0](https://github.com/RebelliousSmile/schema-pbta/releases/tag/v5.5.0) | Its portable Monsterhearts contract already publishes stat profiles, strings, ascendants, conditions, advances, and harm; no new vault data field is needed. |

## Decisions

| Decision | Why |
| --- | --- |
| Publish font files, SIL OFL notices, and role tokens in a tagged schema-pbta source revision before Handbook styling. | The game repository owns values and assets; Handbook’s runtime installer reads that source revision, while its npm tarball pin is contract/corpus-only. |
| Keep the existing PbtA region order and scope all visual rules under `.brumes--monsterhearts`. | A pack changes presentation only; another pack rendering the same document must retain its own treatment. |
| Retain current host font fallbacks during the ordered release. | Existing installed packs must remain readable while the schema package adoption propagates. |
