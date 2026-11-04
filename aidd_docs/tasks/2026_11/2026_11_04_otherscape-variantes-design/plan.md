---
objective: "Dans le coffre Otherscape, la variante Cairo reproduit ses maquettes de `_sources/Design` en clair comme en sombre (typographie condensée, fond texturé, titres à bandeau, encarts, cartes), et les règles propres aux variantes de Handbook s'appliquent."
status: in-progress
---

# Plan: Otherscape — rendre aux variantes leur design (Cairo d'abord)

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Combler les écarts entre le rendu de Cairo et ses maquettes : sélecteurs de variante cassés côté Handbook, fond de note blanc, typographie absente, design de Cairo jamais projeté par le schéma. |
| **Source** | Diagnostic `/aidd-dev:08-debug` du 2026-11-04 : tableau d'écarts maquette / rendu et quatre causes, A (polices), B (Cairo hors projection), C (fond blanc), D (sélecteurs de variante). Référence de rendu : `C:/Users/fxgui/Documents/Perso/RPG/otherscape/_sources/Design/`. |

## Phases

| #   | Phase                                                          | File                         |
| --- | -------------------------------------------------------------- | ---------------------------- |
| 1   | Handbook : sélecteurs de variante Otherscape                   | [`phase-1.md`](./phase-1.md) |
| 2   | Handbook : fond de note écrasé en clair                        | [`phase-2.md`](./phase-2.md) |
| 3   | schema-in-the-mist : typographie condensée d'Otherscape        | [`phase-3.md`](./phase-3.md) |
| 4   | schema-in-the-mist : projection du design Cairo (clair, sombre) | [`phase-4.md`](./phase-4.md) |
| 5   | Train : rendu dans le coffre puis livraison                    | [`phase-5.md`](./phase-5.md) |

## Resources

| Source | Verified |
| ------ | -------- |
| `schema-in-the-mist/aidd_docs/tasks/2026_09/2026_09_15_otherscape-handbook-design-schema/plan.md` | Seule `metro` est projetée depuis les maquettes ; « `cairo` et `tokyo` sont explicitement hors migration ». |
| `schema-in-the-mist/aidd_docs/tasks/2026_09/2026_09_23_package_asset_delivery_replan/plan.md` et l'issue schema-in-the-mist#16 | Le passage de tous les packs à IM Fell English et Averia Serif Libre est **voulu** : il réduit la taille du paquet en ne gardant que deux faces OFL. |
| `schema-in-the-mist/tools/validate-package.ts` | Plafond d'archive `MAX_ARCHIVE_BYTES` (538 582 octets). `npm pack --dry-run` mesure 511,2 kB le 2026-11-04, soit environ 27 kB de marge. |
| `.obsidian/themes/Border/theme.css` du coffre Otherscape | Border peint le split racine et les onglets en `!important` avec `--background-mod-root-split`, une variable déclarée sur le `body`. C'est l'hypothèse C, à confirmer en phase 2. |

## Decisions

| Decision | Why |
| -------- | --- |
| Otherscape s'écarte du contrat à deux faces du #16 : il n'ajoute qu'**une** face condensée grasse, en sous-ensemble latin, pour les titres. Le texte courant passe sur une pile système sans empattement. | Les maquettes sont en sans empattement condensé, ce qu'IM Fell et Averia ne rendent pas. Une seule face d'environ 25 kB tient dans la marge mesurée ; plusieurs faces n'y tiendraient pas. |
| La texture de croix de Cairo est un motif CSS (dégradés ou SVG en ligne), pas un JPEG ou un WebP embarqué. | Les fonds `bgds/*.jpg` ne tiennent pas sous le plafond d'archive, alors qu'un motif CSS ne coûte que quelques centaines d'octets. |
| Tokyo sort de ce plan. Un ticket ouvert en phase 5 la fera suivre le même chemin que Cairo. | Cairo est la variante sélectionnée dans le coffre et la mieux documentée. Traiter une variante à la fois garde la phase de rendu bornée. |
