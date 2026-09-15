---
objective: "Handbook owns, validates, documents, and tests the GamePack appearance contract locally, without changing how external game sources are installed."
status: implemented
---

# Plan: Rapatrier le schéma d’apparence dans Handbook

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Faire de Handbook la source de vérité du contrat `GamePack` et supprimer sa dépendance documentaire à `schema-in-the-mist` pour l’apparence. |
| **Source** | Demande utilisateur du 2026-09-15 : « ramener ce schéma dans Handbook ». |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Établir le contrat local vérifiable | [phase-1.md](./phase-1.md) |
| 2 | Rebrancher Handbook sur son contrat | [phase-2.md](./phase-2.md) |
| 3 | Clarifier la propriété et la migration | [phase-3.md](./phase-3.md) |

## Decisions

| Decision | Why |
| --- | --- |
| Le JSON Schema `GamePack` vit dans Handbook et est validé localement avec Ajv. | L’apparence est un protocole du moteur de rendu Handbook, pas du contenu Mist ; le contrat reste vérifiable sans publication ni synchronisation inter-dépôts. |
| Les dépôts de jeux restent des fournisseurs de `pack.json`, non les propriétaires du schéma. | Les sources externes et leur installation apportent des packs et assets versionnés ; les dissocier du contrat local évite de supprimer cette capacité utile. |
| La suppression du duplicat dans `schema-in-the-mist` suit une release Handbook compatible. | Les anciennes releases et sources installées restent lisibles pendant la migration ; aucun utilisateur ne perd un pack par changement d’autorité. |
