---
objective: "Handbook consomme le package immuable schema-adrenaline v1.0.0 et son corpus canonique pour ses trois renderers, sans checkout frère requis par pnpm check ni copies locales du contrat métier."
status: pending
---

# Plan: Contrat Adrenaline v1

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Épingler le contrat Adrenaline publié, exercer ses codecs et son corpus depuis Handbook, puis retirer les doublons locaux sans altérer la projection tolérante. |
| **Source** | Issue GitHub [RebelliousSmile/obsidian-handbook#30](https://github.com/RebelliousSmile/obsidian-handbook/issues/30). |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Épinglage reproductible et harnais de contrat | [phase-1.md](./phase-1.md) |
| 2 | Bascule du corpus et retrait sélectif des doublons | [phase-2.md](./phase-2.md) |
| 3 | Documentation et validation intégrale | [phase-3.md](./phase-3.md) |

## Resources

| Source | Verified |
| --- | --- |
| https://github.com/RebelliousSmile/obsidian-handbook/issues/30 | Le ticket demande l’asset v1.0.0 immuable, une assertion couvrant les trois codecs, les projections/renderers, la migration de `assert:corpus` et `dump:dom`, puis une installation figée hors ligne. |
| https://github.com/RebelliousSmile/schema-adrenaline/issues/6 | Le producteur confirme que schémas, codecs et corpus métier restent propriétaires de `schema-adrenaline`, Handbook ne gardant que projection et rendu tolérants. |
| https://github.com/RebelliousSmile/schema-adrenaline/releases/tag/v1.0.0 | La release publique non préversion publie `schema-adrenaline-1.0.0.tgz` avec le digest SHA-256 `1b8b61415cdf9653ffd30ba5caeb9458695d5a955abcff8047c1b165742d284f`. |
| https://github.com/RebelliousSmile/schema-adrenaline/blob/v1.0.0/corpus/cases.json | Le manifeste v1 contient 35 cas JSON/TOML — 10 acceptés et 25 rejetés — sur les trois cibles `pj`, `pnj` et `monstre`; il ne porte pas de verdict propre à Handbook. |

## Decisions

| Decision | Why |
| --- | --- |
| Le helper de corpus Adrenaline lit `cases.json` et les sources depuis le package résolu, applique le parseur strict correspondant au format, puis adapte les cas JSON acceptés en TOML via le codec pour nourrir les parseurs Handbook. | Le package est l’unique source de vérité et le corpus mixe JSON et TOML, alors que les blocs Handbook lisent du TOML. |
| L’assertion stricte du package et la preuve de dégradation/rendu Handbook restent distinctes: chaque entrée est jugée strictement dans son format, et les sources TOML ou JSON acceptés convertibles alimentent séparément Handbook. | Les refus JSON n’ont pas de représentation TOML canonique à inventer; cette séparation conserve leur preuve stricte sans fabriquer de fixture et maintient la tolérance sur les entrées réellement consommables. |
| Seules les fixtures locales qui recouvrent un cas métier canonique sont retirées; une fixture dédiée à une assertion visuelle ou à une propriété de renderer reste locale. | Le ticket interdit les copies concurrentes sans supprimer les attentes qui appartiennent effectivement à Handbook. |
