---
status: pending
---

# Instruction: Inventaire des blocs et formats

## Tasks to do

1. Lister, pour chaque pack de `schema-pbta/schemas/v<N>/`, les schémas de données (blocs, mais aussi front, move, définition de jeu) et les `*-presentation-contract.json` correspondants
2. Lister ce que `registry.tsx` et `pbta/specialized/` modélisent déjà, par jeu
3. Dire si l'aperçu Lantern reprend les rendus de bloc de Handbook (`sprawlBlocks.ts`) ou garde les siens, pour ne pas diverger
4. Écrire l'écart par bloc (modèle existant, à créer, schéma à étendre) et le poster dans lantern#58

## Test acceptance criteria

| Task | Acceptance criteria |
| ---- | ------------------- |
| 1-2  | Chaque bloc du tableau du plan a une ligne avec ses champs lus dans le schéma publié |
| 3    | Décision écrite : rendus de Handbook repris ou propres à Lantern |
| 4    | Aucun bloc « à voir » ; Urban Shadows, Monsterhearts, Salvage Run tranchés |
