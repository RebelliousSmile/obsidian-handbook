---
status: pending
---

# Instruction: Modèles, preuves et livraison

## Tasks to do

1. Ordre : Masks (un seul bloc, déjà prouvé en phase 2), puis Monster of the Week, puis The Sprawl. Un modèle par bloc retenu en phase 1 (définition, éditeur, aperçu, exemple, TOML) ; les libellés sont en français d'abord
2. Preuve par pack : l'export TOML d'un exemple passe la validation du schéma publié
3. Livrer par un train du superviseur (`ship-train`) ; rendu validé par l'utilisateur avant publication ; fermer lantern#58

## Test acceptance criteria

| Task | Acceptance criteria |
| ---- | ------------------- |
| 1    | Chaque bloc du plan est listé et s'ouvre dans Lantern |
| 2    | TOML exporté valide contre le schéma du pack |
| 3    | Train clos, #58 fermée sur preuves |
