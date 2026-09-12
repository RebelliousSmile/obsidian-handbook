---
objective: "L'export PDF/impression d'une note conserve, pour chacun des quatre jeux Handbook, ses couleurs, sa police, ses callouts et ses blocs de jeu en polarité light forcée, avec une mise en page simplifiée (une colonne, fond uni), sans jamais dupliquer les valeurs d'un pack."
status: in-progress
---

<!-- Fill or omit these sections; never add, rename, or reorder one. -->

# Plan: Fidélité de l'export PDF/impression, tous thèmes Handbook

## Overview

| Field      | Value                   |
| ---------- | ----------------------- |
| **Goal**   | Un export PDF/impression, quel que soit le jeu actif, conserve l'identité visuelle du thème (couleurs, police, callouts, blocs de jeu) en polarité light forcée, avec colonnes réduites à une seule et texture de fond remplacée par une couleur unie — le tout dérivé automatiquement du pack actif via `styleElement.ts`, jamais recopié. |
| **Source** | Brainstorm `/aidd-refine:01-brainstorm` (bug rapporté : "je n'ai ni les colonnes, ni le fond, ni les mêmes styles" à l'export PDF) + investigation live DevTools (modale "Exporter au format PDF" ouverte, `#brumes-game-style` confirmé présent et non vide dans la fenêtre principale) |

## Phases

| #   | Phase        | File                         |
| --- | ------------ | ----------------------------- |
| 1   | Investigation du contexte de rendu PDF | [`phase-1.md`](./phase-1.md) |
| 2   | Mécanisme d'impression générique dans styleElement.ts | [`phase-2.md`](./phase-2.md) |
| 3   | Mise en page à l'impression (colonnes et texture) | [`phase-3.md`](./phase-3.md) |
| 4   | Recette visuelle croisée sur les quatre jeux | [`phase-4.md`](./phase-4.md) |

## Resources

<!-- External sources only (URLs, docs), not code files. Omit if none consulted. -->

Aucune source externe consultée : le comportement d'export PDF d'Obsidian relève du binaire Electron fermé, non documenté publiquement à ce niveau de détail — la phase 1 le confirme empiriquement plutôt que par une doc externe.

## Decisions

<!-- Architecture-magnitude only, one you'd regret reversing. Omit if none qualify. -->

| Decision | Why |
| ---------- | ----- |
| Le mécanisme d'impression ajoute une fonction dédiée `buildPrintOverride()` (et non un second appel à `buildGameStyle` avec polarité forcée, qui produirait du CSS mort : voir phase-2.md tâche 1) qui réécrit, avec la couche `light` (ou `base` si le pack ne déclare pas `light`), **tous** les sélecteurs que l'écran peut produire (`.theme-light`/`.theme-dark`, `.brumes--colour-light`/`.brumes--colour-dark`, sélecteur nu) en réutilisant les helpers existants `noteSelector`/`workspaceSelector`/`renderLayer`. Le résultat est concaténé dans le même élément `#brumes-game-style` sous une portée `@media print` — jamais une feuille statique ni des valeurs recopiées à la main. | Contrainte explicite de l'utilisateur : toute correction doit repartir de la source de vérité (le pack actif), sinon une évolution future d'un schéma (schema-adrenaline, schema-in-the-mist, schema-pbta) divergerait silencieusement du rendu imprimé. Un second appel à `buildGameStyle` avec polarité forcée ne suffit pas : la classe DOM qu'il vise (`.brumes--colour-light`) n'est posée sur `body` que si le coffre a réellement ce réglage, donc rien ne matche quand le coffre est en thème sombre. |
| Le périmètre couvre les quatre jeux nommés par l'utilisateur (City of Mist, Legend in the Mist, :Otherscape, Adrenaline). Les jeux `pbta` (`urban-shadows`, `monsterhearts`), qui partagent le même mixin de page qu'Adrenaline, ne sont pas traités dans ce chantier. | L'utilisateur a explicitement nommé "tous les handbooks" en désignant ces quatre jeux dans le brainstorm ; `urban-shadows`/`monsterhearts` n'ont jamais été mentionnés. Le mécanisme générique de la phase 2 les couvre déjà sans travail supplémentaire — étendre le SCSS de la phase 3 à ce sous-dossier reste une extension triviale et non régressive si demandée plus tard. |
| Le fond d'impression simplifié utilise la couleur de fond light propre au pack actif (`--background-primary` tel que posé par `#brumes-game-style` en polarité light), jamais un blanc pur codé en dur. | Cohérent avec la contrainte de non-duplication : un blanc pur casserait l'identité visuelle propre à chaque jeu (ex. le parchemin de Legend in the Mist) et serait une valeur inventée par Handbook plutôt que dérivée du pack. Reste ajustable sans dupliquer de valeur : un futur changement de teinte suit automatiquement le pack. |
| Colonnes et texture ne sont simplifiées qu'en `@media print`, jamais en écran — la mise en page écran actuelle (dont l'option d'opt-out par note `:not(.adrenaline-one-column)`) reste inchangée. | Limite le risque de régression visuelle à l'écran à zéro ; le brief ne demande de simplifier que l'impression. |
