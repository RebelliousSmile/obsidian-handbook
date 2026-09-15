# Contrat GamePack

`game-pack.schema.json` est le contrat canonique d’apparence de Handbook. Il
est chargé par le plugin et validé par `pnpm assert:game-pack-contract`.

Les fixtures inter-jeux qui ont servi au contrat vivent dans
[`../../corpus/game-packs/appearance-fixtures/`](../../corpus/game-packs/appearance-fixtures/).
Elles ont été migrées le 2026-09-15 depuis le dépôt désormais historique
`RebelliousSmile/schema-appearance` et restent validées à chaque assertion.

Le générateur Zod de cet ancien dépôt n’est pas migré : il aurait créé une
seconde source d’autorité. Handbook maintient directement le JSON Schema qu’il
exécute et publie.
