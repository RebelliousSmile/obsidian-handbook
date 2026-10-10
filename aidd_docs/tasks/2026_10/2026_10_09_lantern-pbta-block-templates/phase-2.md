---
status: pending
---

# Instruction: Usine de modèle de bloc PbtA

## Tasks to do

1. Lire `createSpecializedPlaybookTemplate` (`definitionFactory.tsx`) et dire ce qui est propre au playbook (schéma, TOML, aperçu) et ce qui se généralise à un bloc
2. Étendre ou doubler l'usine pour produire un modèle de bloc depuis un schéma de données et un contrat de présentation de `schema-pbta`
3. Prouver sur un bloc (le PNJ de Masks, premier de l'ordre de la phase 3) : entrée de registre, ouverture dans la barre latérale, export TOML valide ; `assertTemplateRegistryIntegrity` reste vert

## Test acceptance criteria

| Task | Acceptance criteria |
| ---- | ------------------- |
| 1-2  | Le « Livret » existant d'un pack garde son comportement ; aucun champ défini localement |
| 3    | Le bloc apparaît sous son pack et s'exporte en TOML conforme au schéma publié |
