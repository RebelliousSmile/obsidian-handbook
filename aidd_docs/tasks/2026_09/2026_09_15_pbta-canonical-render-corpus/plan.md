---
objective: "Handbook consomme les cas canoniques schema-pbta v1.0.0 pour ses blocs move et playbook, sans témoins contractuels locaux ni contrat fondé sur un identifiant de jeu."
status: implemented
---

# Plan: Corpus PbtA canonique dans les harnais de rendu

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Remplacer les deux témoins PbtA contractuels locaux par le manifeste installé, tout en gardant les dégradations propres à Handbook. |
| **Source** | Issue GitHub [RebelliousSmile/obsidian-handbook#31](https://github.com/RebelliousSmile/obsidian-handbook/issues/31). |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Lecteur de corpus et assertions de projection | [phase-1.md](./phase-1.md) |
| 2 | Dump déterministe, retrait des doublons et validation | [phase-2.md](./phase-2.md) |

## Resources

| Source | Verified |
| --- | --- |
| https://github.com/RebelliousSmile/obsidian-handbook/issues/31 | L’issue exige que les deux blocs PbtA consomment le corpus installé dans les assertions et le dump, sans copies locales et sans renderer supplémentaire. |
| https://github.com/RebelliousSmile/schema-pbta/releases/tag/v1.0.0 | La release immuable fournit le package déjà épinglé par Handbook, ses codecs et son manifeste `corpus/cases.json`. |

## Decisions

| Decision | Why |
| --- | --- |
| Un helper PbtA résout le manifeste depuis le package installé et mappe uniquement les cibles portables `move` et `playbook` vers les ids de blocs Handbook. | Le manifeste canonique reste la source de vérité, tandis que les capacités de blocs évitent de créer un contrat par identifiant de jeu. |
| Les cas canoniques rejetés restent contrôlés par `assert:pbta-contract`; les harnais de rendu ne consomment que les cas TOML acceptés, et les refus de dégradation spécifiques restent sous `corpus/refus/`. | Un refus strict ne doit pas être transformé en fixture de projection sans verdict Handbook explicite. |
