---
objective: "Un pack de jeu déposé dans le dossier du plugin (coffre) apparaît au démarrage dans le registre, la liste déroulante des réglages et le rendu, sans qu'une ligne de code ne soit écrite."
status: implemented
---

<!-- Fill or omit these sections; never add, rename, or reorder one. -->

# Plan: Registre de packs dynamique

## Overview

| Field      | Value                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| **Goal**   | Rendre `GAME_REGISTRATIONS`/`GAME_PACKS` chargeables depuis `<dossier du plugin>/packs/*.json`, en plus des jeux déclarés dans le code, sans dépôt distant ni UI de déclaration. |
| **Source** | `aidd_docs/tasks/2026_09/2026_09_09_game-schema-repos/discovery-brief.md`, recadré par l'utilisateur sur le seul registre dynamique (pas de dépôts distants, pas de suivi de mise à jour, pas de bundling multi-jeux dans ce plan). |

## Phases

| #   | Phase                                        | File                          |
| --- | --------------------------------------------- | ------------------------------ |
| 1   | Lecture et fusion des packs personnalisés     | [`phase-1.md`](./phase-1.md)  |
| 2   | Branchement au cycle de vie et harnais        | [`phase-2.md`](./phase-2.md)  |

## Resources

<!-- External sources only (URLs, docs), not code files. Omit if none consulted. -->

Aucune consultée en dehors du dépôt et de son frère `schema-in-the-mist` (déjà cités dans `discovery-brief.md`).

## Decisions

<!-- Architecture-magnitude only, one you'd regret reversing. Omit if none qualify. -->

| Decision                                                                                          | Why                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Un pack personnalisé se dépose dans `<dossier du plugin>/packs/*.json`, jamais un dépôt distant déclaré. | Le contrat `GamePack` est déjà publié et gelé (`schema-in-the-mist`) ; ce plan ferme l'angle mort « le registre est statique par choix » noté dans `CLAUDE.md`, pas celui du mécanisme à la BRAT, hors scope par choix explicite de l'utilisateur. |
| Le chargement des packs personnalisés a lieu **avant** `loadSettings()`/`applySettings()` dans `onload()`, pas en tâche de fond après coup. | Le motif fire-and-forget déjà en place pour `overrides.json` ne suffit pas ici : un `mode` sauvegardé pointant vers un pack personnalisé doit le trouver dès le premier rendu, sinon il retombe silencieusement sur le pack par défaut. |
| `GAME_REGISTRATIONS`/`GAME_PACKS` et `MODE_CLASSES`/`VARIANT_CLASSES` cessent d'être des `const` de module figées à l'import, au profit d'un état rempli par une fonction d'initialisation appelée une fois. | C'est le refactor que `CLAUDE.md` annonçait déjà comme nécessaire (« rendre ces trois points dynamiques… c'est un refactor, pas un ajout ») ; le reporter reviendrait à réécrire ce plan plus tard sous une autre forme. |
| Un pack personnalisé fautif (id invalide, collision avec un id déclaré, champ illisible) s'écarte seul ; les autres packs, déclarés ou personnalisés, chargent normalement. | Précédent déjà posé par `acceptRegistrations` pour les jeux déclarés dans le code — l'étendre aux packs du coffre garde une seule règle au lieu de deux. |
