---
status: pending
---

# Instruction: Train, rendu validé, livraison et fermeture de #41

## Tasks to do

1. Vérifier qu'aucun train n'est actif (`pnpm supervise status`), puis `ship-train` : `board`, `prepare` (version par `pnpm version`, jamais à la main), `preview` : l'utilisateur valide le rendu de l'exemple « Agent de sécurité »
2. `pnpm supervise ship --run` ; lire tout échec dans le journal complet que nomme `Whole output:`
3. Fermer #41 avec le tableau d'audit ; sans train (audit propre), le tableau suffit

## Test acceptance criteria

| Task | Acceptance criteria |
| ---- | ------------------- |
| 1 | Rendu validé par l'utilisateur avant toute publication |
| 2 | `ship` sort 0, train `closed` |
| 3 | #41 fermée avec preuves ; issue sœur référencée |
