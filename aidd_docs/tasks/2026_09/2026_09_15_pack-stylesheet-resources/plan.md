---
objective: "Handbook charge de façon sûre les feuilles déclarées par le pack actif, les isole à ce jeu dans chaque fenêtre et laisse City of Mist posséder son rendu structurel."
status: blocked
---

# Plan: Ressources de feuilles de style des packs

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Consommer `assets.stylesheets` depuis la release immuable du schéma qui la publie, après le style générique, sans fuite entre jeux, sources, variantes ou fenêtres. |
| **Source** | Issue GitHub [RebelliousSmile/obsidian-handbook#32](https://github.com/RebelliousSmile/obsidian-handbook/issues/32). |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Contrat lu et ressource installée de façon sûre | [phase-1.md](./phase-1.md) |
| 2 | Injection isolée et cycle de vie multi-fenêtres | [phase-2.md](./phase-2.md) |
| 3 | Migration du rendu City of Mist et non-régressions | [phase-3.md](./phase-3.md) |

## Resources

| Source | Verified |
| --- | --- |
| https://github.com/RebelliousSmile/obsidian-handbook/issues/32 | Exige le chargement sûr, le retrait au changement et la couverture des fenêtres détachées. |
| https://github.com/RebelliousSmile/schema-in-the-mist/issues/11 | Le contrat amont prévoit des ressources de feuille de style déclarées par le pack et isolées au jeu actif ; sa release est un prérequis de cette tâche. |

## Decisions

| Decision | Why |
| --- | --- |
| Réutiliser l’élément de style que `GameStyleWriter` possède déjà par document pour écrire les couches dynamiques du pack. | Son remplacement atomique et son suivi des fenêtres détachées empêchent les fuites de CSS et évitent un second cycle de vie ; cet élément suit le CSS générique compilé de Handbook. |
| Considérer une feuille de pack comme un asset installé, borné au répertoire du pack et validé avant toute injection ; une violation invalide le fichier entier. | Une feuille est du texte interprété par le moteur CSS ; chemins, URL, imports, sélecteurs et polarités doivent être contrôlés au même périmètre que la ressource déclarée, sans conserver une moitié ambiguë. |
