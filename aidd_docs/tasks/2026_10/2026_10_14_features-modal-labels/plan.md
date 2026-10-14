---
objective: "La modale « Fonctionnalités » d'un jeu présente deux familles seulement, les encadrés (`> [!type]`) et les blocs de contenu (code fence), sans section Handouts ni libellé « bloc de code » qui contredise l'autre."
status: implemented
---

<!-- Fill or omit these sections; never add, rename, or reorder one. -->

# Plan: Intitulés de la modale features : encadrés et blocs de contenu

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Remplacer les trois rubriques Handouts / Callouts / Code blocks de la modale par deux familles alignées sur la syntaxe que l'utilisateur tape, sans toucher au schéma ni au drapeau interne `handout`. |
| **Source** | RebelliousSmile/obsidian-handbook#67 |

## Phases

| #   | Phase                                  | File                         |
| --- | -------------------------------------- | ---------------------------- |
| 1   | Deux familles dans la modale           | [`phase-1.md`](./phase-1.md) |
| 2   | Changelog, version et verdict de rendu | [`phase-2.md`](./phase-2.md) |

## Decisions

| Decision | Why |
| -------- | --- |
| Le changement ne porte que sur ce qui est affiché ; `handout?` et `utility?` de `BrumesBlock` restent. | Seule la modale lit `handout` (`pbta/block.ts` le pose, `themeContentsModal.ts` le lit) ; `utility` est lu par `assertCorpus.harness.mts` et `customPacks.harness.mts` pour écarter les blocs de l'export TOML. Retirer l'un ou l'autre touche le contrat `BrumesBlock`, que l'issue (« peut rester dans le schéma des packs ») ne demande pas de modifier. |
| Aucune troisième rubrique : le drapeau `handout` devient une mention « document de jeu » sous le libellé du bloc. Pas de mention « utilitaire ». | C'est la proposition de l'issue ; la section vide « Aucun handout » disparaît d'Adrenaline. Le seul bloc `utility` (`roller`) n'est déclaré par aucune capacité `block:` des jeux (`src/games/capabilities.ts`) : la modale ne peut pas l'afficher, une mention serait du code mort. |
| Les fiches Adrenaline ne reçoivent pas le drapeau `handout` dans ce plan : seul `pbta-playbook` porte la mention « document de jeu ». | Poser `handout: true` sur trois blocs est une décision de présentation distincte ; l'issue porte sur les intitulés et le retrait de la section vide, pas sur la classification des fiches. |
| Les titres portent la syntaxe, « Encadrés (`> [!type]`) » et « Blocs de contenu (code fence) », et chaque bloc affiche sa clôture. | Le vocabulaire doit se lire comme ce qu'on tape dans une note. |
| « callout » devient « encadré » dans toute l'interface française (décidé par l'utilisateur après livraison de la modale). | Le mot unique évite que la modale et les menus parlent de deux objets ; les clés anglaises gardent « callout » (vocabulaire d'Obsidian). |
