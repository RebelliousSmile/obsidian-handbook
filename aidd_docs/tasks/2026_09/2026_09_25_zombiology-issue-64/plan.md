---
objective: "The three Zombiology sheets load and match approved references in isolated Obsidian, consume only a canonical published Adrenaline presentation contract, and pass rendering, capability, TOML, and frozen-install proofs."
status: blocked
---

# Plan: Reprendre et valider les fiches Zombiology

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Intégrer sur `main` les trois fiches depuis le contrat publié, obtenir leur validation visuelle et prouver les parcours Obsidian et TOML. |
| **Source** | GitHub issue [#64](https://github.com/RebelliousSmile/obsidian-handbook/issues/64) |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Vérifier le contrat publié et la preuve hôte | [phase-1.md](./phase-1.md) |
| 2 | Reprendre les trois présentations et recueillir la revue visuelle | [phase-2.md](./phase-2.md) |
| 3 | Prouver les trois parcours et stabiliser la livraison | [phase-3.md](./phase-3.md) |

## Resources

| Source | Verified |
| --- | --- |
| [Handbook #64](https://github.com/RebelliousSmile/obsidian-handbook/issues/64) | Périmètre, ordre de travail et critères d'acceptation des trois fiches. |
| [Handbook #63](https://github.com/RebelliousSmile/obsidian-handbook/issues/63#issuecomment-5839538633) | Le chargement d'un artefact de production dans Obsidian 1.13.7 est prouvé pour v2.29.2 ; chaque nouvelle construction doit repasser cette porte. |
| [Brouillon de reprise](https://github.com/RebelliousSmile/obsidian-handbook/blob/feat/zombiology-presentation-preview/aidd_docs/tasks/2026_09/2026_09_25_zombiology-preview/handoff.md) | Les trois rendus existent en brouillon, mais ni la revue visuelle ni l'adoption depuis un paquet publié ne sont acquises. |
| [schema-adrenaline #36](https://github.com/RebelliousSmile/schema-adrenaline/issues/36) | L'archive finale canonique du producteur reste un prérequis externe ouvert. |

## Decisions

| Decision | Why |
| --- | --- |
| Reprendre le brouillon par lecture et intégration sur `main`, sans changer de branche ni créer de worktree. | La règle locale impose l'exécution sur `main`; le brouillon reste une source, pas une livraison. |
| Faire dépendre les trois fiches du sous-chemin `schema-adrenaline/presentation` d'une archive finale publiée. | Le contrat et ses valeurs de présentation appartiennent au producteur ; Handbook ne doit pas en recopier la sémantique. |
| Conserver la note et les JPG du coffre comme témoins externes en lecture seule ; n'écrire que dans un coffre isolé pour la preuve. | L'issue exclut toute modification des données du coffre utilisateur et exige une approbation visuelle sur les trois fiches. |
| Garder les changements locaux sur `main` jusqu'à la fin des preuves, puis seulement les livrer par commit et push. | Il n'y a pas de branche à fusionner dans ce dépôt ; la porte « fusionner seulement quand les preuves sont vertes » devient une porte de livraison vérifiable. |
