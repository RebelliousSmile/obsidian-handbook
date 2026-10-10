---
status: pending
---

# Instruction: Train, rendu validé, livraison et fermeture de #42

## Tasks to do

1. Vérifier qu'aucun train n'est actif (`pnpm supervise status`), puis `ship-train` : `board`, `prepare` (version par `pnpm version`, jamais à la main), `preview` : l'utilisateur valide le rendu de l'exemple « Infecté Zy-2 »
2. `pnpm supervise ship --run` ; lire tout échec dans le journal complet que nomme `Whole output:`
3. Fermer #42 avec le tableau d'audit ; sans train (audit propre), le tableau suffit ; #64 est référencée (une nouvelle issue seulement si la phase 1 l'a justifiée)

## Test acceptance criteria

| Task | Acceptance criteria |
| ---- | ------------------- |
| 1 | Rendu validé par l'utilisateur avant toute publication |
| 2 | `ship` sort 0, train `closed` |
| 3 | #42 fermée avec preuves ; issue sœur référencée |
