---
status: done
---

# Instruction: Adoption par Handbook et Lantern, puis versions et pose du travail

> Exécution dans les worktrees du superviseur (`plan.md`, ligne Exécution) : chemins sous `<W>/<dépôt>`, commandes `pnpm supervise` lancées depuis `<W>/obsidian-handbook` avec `--root <W>`.

Les tâches 1 et 2 sont de l'écriture, sans train ni commit. La tâche 3 vient après l'essai au coffre (phase 7, tâche 1) et avant l'ouverture du train. Le modèle est la phase 4 du plan Masks ; si la règle d'appartenance `<pack.id>-<type>` y est déjà livrée, la tâche 1 se réduit à sa vérification.

## Architecture projection

> Tree of the final files. ✅ create · ✏️ modify · ❌ delete

```txt
obsidian-handbook/
├── src/features/pbta/specializedPlaybooks.ts   ✏️ règle d'appartenance lue dans le contrat du pack (vérifier)
├── package.json, pnpm-lock.yaml                ✏️ épingle tarball locale, jamais commitée ; puis release publiée
├── CHANGELOG.md                                ✏️ section de la version du train
├── manifest.json, versions.json                ✏️ tenus par `pnpm version`
└── tools/                                      ✏️ listes de cibles des harnais de contrat
lantern/
├── package.json, package-lock.json             ✏️ épingle
└── CHANGELOG.md                                ✏️
```

## User Journey

```mermaid
flowchart TD
  A[npm pack de schema-pbta dans W] --> B[Épingle locale dans Handbook]
  B --> C[Phases 5 et 6 écrites]
  C --> D[Dernière porte, épingle restaurée]
  D --> E[Versions et CHANGELOG préparés]
  E --> F[Messages de commit prêts]
```

## Test Scope

```mermaid
---
title: Test scope
---
journey
  section Setup
    npm pack de W/schema-pbta => tarball hors dépôt: 5: cli
  section Happy path
    épingler le tarball puis build => compilé contre le contrat neuf: 5: cli
    restaurer l'épingle ligne par ligne => package.json sans résidu local: 5: cli
  section Edge case - script neuf
    package.json porte aussi un script de harnais => seule la ligne d'épingle est restaurée: 3: cli
  section Edge case - harnais jetable
    src/__assert_ restant => supprimé avant le build: 3: cli
  section Edge case - version déjà publiée
    prepare sur une version existante => refus, nouvelle version: 1: cli
```

## Tasks to do

### `1)` Règle d'appartenance

1. Vérifier que Handbook déduit le pack d'une cible par `documents[].target` de `pack-contract.json` (`<pack.id>-<type>`), pas en retirant un suffixe. Reprendre la tâche correspondante du plan Masks si elle n'est pas livrée

### `2)` Épingle locale

1. `npm pack` de `<W>/schema-pbta` vers un dossier hors dépôt ; épingler ce tarball dans Handbook (`package.json`, `pnpm-lock.yaml`) via `rtk proxy pnpm add`, et dans Lantern
2. Tant qu'elle est là, `pnpm check` s'arrête sur les harnais d'épingle (rouges par construction) : lancer `rtk proxy pnpm build`, les deux lints et les `assert:*` un par un

### `3)` Versions, restauration, pose

1. Dernière porte avant de quitter l'épingle : build, `pnpm lint`, `eslint src --ext .ts`, `assert:guards-by-role`, `assert:pbta-pack-coverage`, `assert:style-scope`, `assert:mist-font-packs`, et les harnais de blocs et de layout de ce plan
2. Restaurer l'épingle : `package.json` et `pnpm-lock.yaml` visent la release publiée de `schema-pbta` ; ligne par ligne si un script neuf y figure
3. Supprimer tout harnais jetable `src/__assert_*.ts`
4. Lantern, seulement si du code y a changé ; sa version déjà en avance sur sa release est laissée : version et `CHANGELOG` par l'action `prepare` de `ship-train` (`npm version`)
5. Handbook : même action `prepare`, `pnpm version <x.y.z>`, jamais à la main ; la version est celle que `prepare` calcule
6. Montrer à l'utilisateur les trois diffs de version tirés, puis écrire les trois messages de commit en anglais dans le fichier que donne `git rev-parse --git-path SUPERVISOR_COMMIT_MSG` de chaque worktree modifié (en worktree lié, `.git` est un fichier), chacun fermant l\'issue liée

## Test acceptance criteria

| Task | Acceptance criteria |
| ---- | ------------------- |
| 1 | Aucune cible spécialisée n'est rattachée à son pack par retrait de suffixe |
| 2 | Handbook et Lantern compilent contre le tarball local ; aucun fichier d'épingle n'est dans un commit |
| 3 | Aucune épingle locale, aucun harnais jetable ; versions et `CHANGELOG` des consommateurs prêts ; messages de commit écrits |
