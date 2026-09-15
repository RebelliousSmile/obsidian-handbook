---
objective: "Handbook owns the complete, validated GamePack contract and schema-appearance becomes an archived compatibility record rather than a live schema repository."
status: in-progress
---

# Plan: Migration explicite de schema-appearance

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Transférer les fixtures et leur provenance vers Handbook, publier ce contrat, puis déprécier explicitement le dépôt séparé sans casser son URL historique. |
| **Source** | Conversation du 2026-09-15 : rendre la migration avant suppression explicite et vérifiable. |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Importer et valider les fixtures historiques | [phase-1.md](./phase-1.md) |
| 2 | Publier Handbook puis archiver le dépôt | [phase-2.md](./phase-2.md) |

## Resources

| Source | Verified |
| --- | --- |
| https://raw.githubusercontent.com/RebelliousSmile/schema-appearance/main/schemas/appearance/game-pack.schema.json | C’est l’URL publique historique à préserver par archivage plutôt que par suppression immédiate. |
| `schema-appearance/examples/appearance/game-pack/*.json` local | Les cinq fixtures sont acceptées par le schéma Handbook actuel. |

## Decisions

| Decision | Why |
| --- | --- |
| Handbook reste l’unique source canonique du JSON Schema et de sa validation. | Le plugin le charge et le valide déjà localement; un second dépôt ne sert plus de dépendance runtime. |
| Les cinq fixtures JSON migrent dans `corpus/game-packs/appearance-fixtures/` avec leur provenance. | Elles rendent les différences passées observables et évitent de perdre une couverture inter-jeux utile. |
| `schema-appearance` est archivé, pas supprimé immédiatement. | Son historique et son URL brute restent disponibles comme dernier instantané aux éventuels consommateurs externes, tout en empêchant qu’il soit pris pour une source vivante. |
| La dépréciation pointe vers le schéma Handbook avec une date et une explication de compatibilité. | Les auteurs de packs savent quelle URL employer; une URL `raw` archivée ne peut pas rediriger et demeure donc un instantané historique. |
| La source Zod et son générateur ne migrent pas. | Handbook maintient déjà le JSON Schema réellement chargé et validé; la documentation acte l’abandon de la seconde source d’autorité au lieu de la recréer ailleurs. |
