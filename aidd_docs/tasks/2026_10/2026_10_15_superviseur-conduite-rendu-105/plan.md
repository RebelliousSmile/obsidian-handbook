---
objective: "`supervise present` refuse un train dont une décision de contrat touchant le rendu est restée ouverte, ou dont un élément a dépassé le nombre de cycles exécutant→contrôleur lu dans la topologie sans décision consignée ; le superviseur ne rouvre aucune approbation."
status: pending
---

<!-- Fill or omit these sections; never add, rename, or reorder one. -->

# Plan: Superviseur : porter les règles de conduite d'une phase de rendu (#105, portée réduite)

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Faire porter par `present` les deux règles de conduite d'une phase de rendu qui se vérifient sans verdict ni accord : aucune décision de contrat ouverte touchant le rendu, aucun cycle exécutant→contrôleur au-delà du maximum de la topologie sans décision consignée. Les autres points de l'issue deviennent du texte. |
| **Source** | RebelliousSmile/obsidian-handbook#105, portée réduite décidée par l'utilisateur le 2026-10-15 : « le superviseur ne rouvre aucune approbation » (pas d'accord de rendu dans `ship`, pas de verdict) |

## Phases

| #   | Phase                                                           | File                         |
| --- | --------------------------------------------------------------- | ---------------------------- |
| 1   | Contrat : champ `conduct` de la topologie et du dossier de train | [`phase-1.md`](./phase-1.md) |
| 2   | Refus de `present`                                              | [`phase-2.md`](./phase-2.md) |
| 3   | Scénarios de `assert:supervisor`                                | [`phase-3.md`](./phase-3.md) |
| 4   | Documentation et texte de conduite                              | [`phase-4.md`](./phase-4.md) |

## Decisions

| Decision | Why |
| -------- | --- |
| Aucun verdict de rendu ni accord n'entre dans le superviseur | `approve` a été retiré après usage (« lancer `ship --run`, c'est la validation ») ; le verdict de rendu se demande dans la conversation, seul geste que l'utilisateur garde. Un ancien ticket ne défait pas cette évolution. |
| La consignation est un champ optionnel `conduct` du dossier de train, édité à la main, sans nouvelle commande | Un champ optionnel laisse valides les dossiers existants (`supervisor/trains/` n'est pas touché) ; une commande de plus serait de la surface pour deux listes courtes. |
| Le maximum de cycles vit dans la topologie, jamais en littéral dans le code ni dans la doc | `assert:guards-by-role` : une garde affirme un rôle, jamais un chiffre. Sans valeur dans la topologie, la règle des cycles ne s'applique pas. |
| Les points 1, 3, 5 et 6 de l'issue ne produisent aucun code | Ils portent sur le jugement de rendu (cible validée, points de contrôle, gardes lourds après le rendu, accord avant `ship`) : les coder ferait revenir une approbation. Ils s'écrivent dans la doc du superviseur et dans le texte du skill `ship-train`. |
