---
objective: "Handbook refuse tout package schema-adrenaline autre que v1.0.0 tout en conservant son contrôle local hors ligne, et la parité de release avec Lantern est constatée."
status: in-progress
---

# Plan: Finaliser la preuve du contrat Adrenaline v1

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Compléter la garde de version du package publié sans élargir une migration Handbook déjà implémentée. |
| **Source** | Issue GitHub [RebelliousSmile/schema-adrenaline#6](https://github.com/RebelliousSmile/schema-adrenaline/issues/6), après dérive de dépôt du plan initial. |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Verrouillage de version et preuve inter-consommateurs | [phase-1.md](./phase-1.md) |

## Resources

| Source | Verified |
| --- | --- |
| https://github.com/RebelliousSmile/schema-adrenaline/issues/6 | Exige la release immuable v1.0.0, les codecs/corpus publiés, l’autonomie de Handbook et la consommation commune avec Lantern. |
| https://github.com/RebelliousSmile/obsidian-handbook/issues/30 | La migration complète du corpus et des renderers est déjà implémentée dans Handbook. |
| https://github.com/RebelliousSmile/lantern/blob/main/package.json | Lantern déclare actuellement la même URL publique de release `schema-adrenaline` v1.0.0. |

## Decisions

| Decision | Why |
| --- | --- |
| Ajouter une garde de version au helper local et garder la comparaison avec Lantern comme vérification externe de livraison. | `pnpm check` doit rester exécutable hors ligne et ne peut pas dépendre d’une requête réseau vers un autre dépôt. |
