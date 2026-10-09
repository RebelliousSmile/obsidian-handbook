---
objective: "Un train dont l'épingle de producteur ne connaît pas les capacités du pack est refusé avant `present`, et `supervise preview` ne laisse aucun processus node derrière lui."
status: implemented
---

# Plan: Garde d'épingle de producteur et nettoyage de `supervise preview`

## Overview

| Field         | Value                                                                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Goal**      | Deux corrections du superviseur, faites dans un worktree : (1) vérifier avant les analyses que le Handbook épinglé par les workflows du producteur connaît ce que ses packs exigent ; (2) fermer les serveurs de prévisualisation. |
| **Source**    | Demande de l'utilisateur (2026-10-09) : « cette correction dans un worktree. profite en pour corriger la commande de supervise qui crée des instances node sans les fermer ». Cas vus : Monster of the Week et The Sprawl, `release.yml` rouge après un cycle complet. |
| **Exécution** | Worktrees du superviseur (`pnpm supervise worktree <W>`, jamais `git worktree add`), tout se pousse sur `main`. Éditer `tools/supervisor/**`, `tools/supervisor*.harness.mts` et `tools/assert-supervisor.mjs` demande l'accord de l'utilisateur (règle `ask`). À ne commencer qu'une fois le `ship --run` en cours terminé : le superviseur ne se modifie pas pendant qu'il tourne. |
| **Versions**  | Aucune release : le superviseur est un outil du dépôt. Les versions sont désignées par rôle (épingle du producteur, `main` de Handbook).                                                       |

## Phases

| #   | Phase                                          | File                         |
| --- | ---------------------------------------------- | ---------------------------- |
| 1   | Worktree et garde d'épingle de producteur      | [`phase-1.md`](./phase-1.md) |
| 2   | Fermeture des processus de `supervise preview` | [`phase-2.md`](./phase-2.md) |
| 3   | Documentation, porte complète et mémoire       | [`phase-3.md`](./phase-3.md) |

## Decisions

| Decision                                                                 | Why                                                                                                                                                                              |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La garde vit dans `present` (avant toute validation), pas dans `publish` | L'échec coûtait un cycle entier (présenter, publier, relire le journal) : `present` est le premier point où le superviseur lit déjà les dépôts du train. Elle ne vaut que pour un fournisseur dont les workflows épinglent un `ref` de Handbook. |
| Le test compare des capacités, pas des numéros                           | Une garde affirme un rôle : les capacités exigées par les `pack.json` du producteur doivent être déclarées par le Handbook épinglé, lues par `git show <ref>:<fichier>` dans le checkout de Handbook. Aucun littéral de version ni de SHA. |
| Une épingle en retard est refusée, pas réécrite                          | Avancer l'épingle est un commit du producteur (`ci.yml` et `release.yml`) ; le superviseur n'écrit pas dans un workflow. Il nomme la tête de `main` de Handbook comme candidat.      |
| Les serveurs de prévisualisation sont tués par arbre de processus et à toute sortie | `child.kill()` sous Windows ne tue pas les petits-enfants ; seuls `SIGINT`/`SIGTERM` étaient écoutés.                                                                  |
