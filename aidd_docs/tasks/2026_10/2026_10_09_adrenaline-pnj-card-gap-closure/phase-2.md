---
status: pending
---

# Instruction: Corrections retenues

Ne s'exécute que pour les écarts que la phase 1 retient. Sans écart, passer à la phase 3, tâche 3 (fermeture sans train).

## Tasks to do

1. schema-adrenaline : champs de schéma retenus, exemples (`examples/adrenaline/pnj/`), `PNJ_PRESENTATION`, jetons en light et en dark ; `npm run validate:pack`, `validate:presentation`, `validate:contract`, `build` verts ; commit par `pnpm supervise commit schema-adrenaline` depuis Handbook
2. Handbook : adopter la version publiée du pack par la voie du superviseur, sélecteurs (`_pnj.scss`, `compactCard.ts`) d'après les jetons ; compléter `assertAdrenalineZombiologyStyle.harness.mts` pour tout rôle nouveau
3. Portes : `rtk proxy pnpm build`, `pnpm lint` et `eslint src --ext .ts` à zéro erreur, `pnpm check` vert

## Test acceptance criteria

| Task | Acceptance criteria |
| ---- | ------------------- |
| 1 | Chaque champ ou jeton ajouté existe en light et en dark et est cité par le contrat et un exemple |
| 2 | Le harnais échoue si le rôle disparaît, passe sinon |
| 3 | Build vert, deux portées de lint à zéro, `pnpm check` vert |
