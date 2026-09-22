---
objective: "Les schémas PbtA peuvent publier une répartition de régions existantes en colonnes, validée une fois et interprétée de façon cohérente par Handbook et Lantern."
status: pending
---

# Plan: Régions de mise en page déclarées par contrat

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Supprimer, pour les documents issus d’un schéma, la dépendance aux marqueurs Markdown de colonnes au profit d’une disposition déclarée et validée dans le contrat, sans retirer la fonction de note existante. |
| **Source** | Brainstorm du 21 septembre 2026 : colonnes génériques Handbook, régions existantes seulement, TOML sans markup, repli canonique. |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Publier et valider le contrat de disposition | [`phase-1.md`](./phase-1.md) |
| 2 | Faire consommer le contrat par Handbook | [`phase-2.md`](./phase-2.md) |
| 3 | Faire consommer et vérifier le contrat par Lantern | [`phase-3.md`](./phase-3.md) |

## Resources

| Source | Verified |
| ------ | -------- |
| [Contrat inter-dépôts](../../../../.codex/rules/00-architecture/0-cross-repo-contract-flow.md) | Le schéma publie régions et ordre ; les consommateurs n’inventent pas de sémantique locale. |

## Decisions

| Decision | Why |
| --- | --- |
| Publier un ordre canonique de régions et une disposition optionnelle de colonnes depuis une donnée unique dans le contrat PbtA. | Le validateur peut vérifier références et doublons, et npm comme l’installation source ne peuvent pas diverger, tandis que les TOML restent des données portables. |
| Une région absente de la disposition est rendue après la grille dans l’ordre canonique. | Une évolution du schéma ne peut pas faire disparaître un bloc chez un consommateur non encore mis à jour. |
| Handbook conserve le moteur de grille et Lantern implémente la même projection à partir du même contrat. | La géométrie reste propre à chaque consommateur, sans dialecte de contrat ni balises spécifiques. |
