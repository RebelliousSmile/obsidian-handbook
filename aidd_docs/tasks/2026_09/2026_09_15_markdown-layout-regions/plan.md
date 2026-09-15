---
objective: "Handbook lets a note author place adjacent rendered Markdown elements in a responsive local column region without nesting blocks or changing global settings."
status: blocked
---

# Plan: Zones de colonnes locales dans les notes

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Permettre à une note de grouper tableaux et blocs rendus dans une grille locale, responsive et déclarée par deux commentaires Markdown. |
| **Source** | Brainstorm de la conversation du 2026-09-15. |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Prouver les bornes dans Obsidian | [phase-1.md](./phase-1.md) |
| 2 | Interpréter et grouper les régions Markdown | [phase-2.md](./phase-2.md) |
| 3 | Rendre la grille responsive et documenter son usage | [phase-3.md](./phase-3.md) |

## Decisions

| Decision | Why |
| --- | --- |
| Une région commence par `<!-- handbook-layout: columns=N -->` et finit par `<!-- /handbook-layout -->`. | Les marqueurs encadrent des frères déjà rendus sans pouvoir entrer en collision avec une autre directive Handbook. |
| `N` est un entier positif ; `1` conserve les éléments sur une colonne et toute valeur supérieure les organise en grille. | Une seule syntaxe répond aux tableaux isolés comme aux fiches placées côte à côte. |
| La région dispose les éléments Markdown de premier niveau, jamais les cellules d’un tableau. | Le conteneur règle la composition de la note ; il ne réécrit pas la sémantique ni l’accessibilité d’un tableau. |
| La grille revient à une colonne sur espace étroit. | Une fiche peut tenir sur une rangée large sans produire de colonnes illisibles sur mobile ou dans une fenêtre étroite. |
| La première phase valide les marqueurs dans Obsidian réel avant le développement du post-processeur. | Le DOM que reçoit un post-processeur est l’unique preuve que des commentaires Markdown peuvent servir de bornes. |
