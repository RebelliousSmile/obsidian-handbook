---
objective: "Les fiches PJ, PNJ et monstre restituent chacune la hiérarchie de leur source Zombiology tout en restant lisibles et compactes sur mobile."
status: blocked
---

# Plan: Fidélité visuelle des statblocks Adrenaline

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Différencier les compositions PJ, PNJ et monstre selon leur usage imprimé, sans sacrifier le repli mobile. |
| **Source** | Brainstorm utilisateur du 15 septembre 2026, capture de rendu et extraction de référence Zombiology. |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Hiérarchiser les données du monstre | [`phase-1.md`](./phase-1.md) |
| 2 | Composer chaque fiche selon son original | [`phase-2.md`](./phase-2.md) |
| 3 | Verrouiller les rendus de référence | [`phase-3.md`](./phase-3.md) |

## Resources

| Source | Verified |
| --- | --- |
| https://github.com/RebelliousSmile/obsidian-handbook/blob/main/aidd_docs/tasks/2026_09/2026_09_09_adrenaline-game/reference-layout-extraction.md | Les zones et la géométrie de référence diffèrent bien entre PJ et fiches verticales PNJ/monstre. |
| https://github.com/RebelliousSmile/obsidian-handbook/blob/main/aidd_docs/tasks/2026_09/2026_09_09_adrenaline-game/visual-findings.md | Les fiches PNJ et monstre sont des cartes verticales distinctes ; la fiche PJ privilégie une feuille fonctionnelle en grille. |

## Decisions

| Decision | Why |
| --- | --- |
| Préserver des compositions spécifiques à chaque statblock | Les fiches d’origine n’ont ni la même densité ni le même ordre de lecture ; un composant visuellement unique les dégraderait. |
| Conserver les six zones publiques de chaque bloc et enrichir seulement la structure interne du monstre | Le contrat de rendu reste stable, tandis que les capacités hétérogènes deviennent repérables sans aplatir la donnée. |
| Réserver le breakpoint 520 px à un repli pensé par fiche | Sur mobile, les colonnes se superposent et les contenus longs restent segmentés, au lieu de reproduire une mise en page imprimée illisible. |
