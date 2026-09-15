---
objective: "Handbook lets a note author arrange adjacent rendered Markdown sections in a local responsive column region, without nested Markdown blocks or global settings."
status: implemented
---

# Plan: Régions de colonnes locales lues depuis la source

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Conserver les marqueurs `handbook-layout` dans la note, puis associer leurs lignes source aux sections Markdown rendues pour les placer dans une grille locale. |
| **Source** | Conversation du 2026-09-15 et verdict de la sonde Obsidian réelle. |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Cartographier les régions dans la source | [phase-1.md](./phase-1.md) |
| 2 | Grouper les sections rendues par leurs lignes | [phase-2.md](./phase-2.md) |
| 3 | Styliser, documenter et vérifier dans Obsidian | [phase-3.md](./phase-3.md) |

## Resources

| Source | Verified |
| --- | --- |
| https://docs.obsidian.md/Reference/TypeScript%20API/MarkdownPostProcessorContext/getSectionInfo | Un post-processeur reçoit une section et peut obtenir ses lignes `lineStart` et `lineEnd`; l’absence de résultat doit être traitée sans mutation. |
| https://docs.obsidian.md/Reference/TypeScript%20API/Vault/cachedRead | Le contenu d’une note peut être lu sans l’écrire; il sert à interpréter les marqueurs source. |
| https://docs.obsidian.md/Plugins/Vault | `cachedRead` est le choix prévu pour une lecture d’affichage sans écriture ni copie périmée. |

## Decisions

| Decision | Why |
| --- | --- |
| Les marqueurs restent `<!-- handbook-layout: columns=N -->` et `<!-- /handbook-layout -->`, chacun seul sur sa ligne. | La note conserve la syntaxe validée; les commentaires peuvent être invisibles au rendu puisqu’ils sont lus depuis la source. |
| Le post-processeur joint les intervalles de lignes source aux sections `.markdown-preview-section` de même parent. | Il groupe des frères déjà rendus, jamais des cellules ni des blocs Markdown imbriqués. |
| Une directive dans un bloc de code, mal appariée, invalide ou sans section rendue est ignorée sans déplacer de DOM. | Le mécanisme reste non destructif et ne transforme pas des exemples de syntaxe en mise en page. |
| La lecture est asynchrone et mise en cache par rendu, puis la région est marquée comme traitée. | Les post-processeurs sont appelés section par section; cela évite lectures et groupements concurrents. |
