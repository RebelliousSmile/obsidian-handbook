---
objective: "Handbook épingle l’asset immuable schema-in-the-mist v1.0.0 avec une intégrité reproductible, exerce les 14 cibles de son corpus canonique tout en conservant ses 12 renderers tolérants, puis ne garde localement aucun doublon de corpus Mist."
status: in-progress
---

# Plan: Contrat Mist Engine v1

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Achever la bascule déjà amorcée vers le contrat et le corpus canoniques de `schema-in-the-mist` v1.0.0, sans régression du rendu tolérant de Handbook. |
| **Source** | Issue GitHub [RebelliousSmile/obsidian-handbook#29](https://github.com/RebelliousSmile/obsidian-handbook/issues/29). |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Épinglage reproductible et lecteur canonique | [phase-1.md](./phase-1.md) |
| 2 | Bascule des harnais et retrait des doublons Mist | [phase-2.md](./phase-2.md) |
| 3 | Documentation et validation intégrale | [phase-3.md](./phase-3.md) |

## Resources

| Source | Verified |
| --- | --- |
| https://github.com/RebelliousSmile/obsidian-handbook/issues/29 | Le ticket exige l’asset GitHub Release immuable, les codecs canoniques, les 14 cibles du corpus, le maintien des projections tolérantes et des 12 renderers, puis le retrait des seules copies locales Mist. |
| https://github.com/RebelliousSmile/schema-in-the-mist/issues/10 | Le contrat amont v1 impose des schémas et codecs publics, un corpus partagé, un aller-retour TOML sémantique et une URL de release immuable avec intégrité dans les lockfiles consommateurs. |
| https://github.com/RebelliousSmile/schema-in-the-mist/releases/tag/v1.0.0 | La release est immuable et publie `schema-in-the-mist-1.0.0.tgz` avec le digest SHA-256 `106efd4e0ce6aae850414977ae0024ad2ca5d70d986c353b8032ed1b84dc3e08`. |
| https://github.com/RebelliousSmile/lantern/issues/2 | Lantern partage la même exigence de registre générique, d’URL/SRI épinglés et de corpus inter-dépôts. |
| https://github.com/RebelliousSmile/lantern/issues/3 | La migration sœur conserve les 14 formes canoniques et les valeurs limites avant de supprimer ses copies locales. |

## Decisions

| Decision | Why |
| --- | --- |
| Le manifeste installé de `schema-in-the-mist` devient l’unique source des cas Mist dans tous les harnais Handbook. | Garder des fixtures Mist locales recréerait la dérive inter-dépôts que le contrat v1 cherche précisément à supprimer. |
| La validation canonique stricte et la projection Handbook tolérante sont testées séparément sur chaque même cas. | Un refus du codec doit pouvoir devenir un rendu dégradé dans Handbook ; confondre ces deux frontières casserait la compatibilité volontaire du consommateur. |
| Les deux cibles canoniques sans renderer Handbook restent explicitement non rendues. | Le corpus comporte 14 cibles mais le produit ne promet que 12 renderers ; ajouter deux renderers dépasserait le ticket et modifierait le produit. |
