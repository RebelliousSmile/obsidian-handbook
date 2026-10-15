---
status: done
---

<!-- Fill or omit these sections; never add, rename, or reorder one. -->

# Instruction: Scénarios de `assert:supervisor`

## Architecture projection

> Tree of the final files. ✅ create · ✏️ modify · ❌ delete

```txt
.
└── tools/supervisor.harness.mts   ✏️ scénarios autour de `present` : un par refus, un par acceptation
```

## User Journey

```mermaid
flowchart TD
  A[scenario] --> B[openTrain + seedIssues]
  B --> C[écrire conduct dans le dossier de train]
  C --> D[world.supervise present]
  D --> E{refus attendu ?}
  E -->|oui| F[exit non nul, raison nommée, aucune validation lancée]
  E -->|non| G[exit 0]
```

## Test Scope

```mermaid
---
title: Test scope
---
journey
  section Setup
    Monde du harnais, train ouvert dont les éléments sont done => prêt: 5: cli
  section Happy path
    conduct sans rien d'ouvert => present => exit 0: 5: cli
  section Edge case - décision ouverte
    openDecisions touchesRender sans decision => present => exit 1, id nommé, journal sans validation: 4: cli
  section Edge case - cycle excédentaire
    Cycle de rang max+1 sans decision => present => exit 1, item et rang nommés: 4: cli
  section Edge case - consigné
    Les deux avec decision => present => exit 0: 4: cli
  section Edge case - sans maximum
    Topologie sans conduct, cycle de rang élevé => present => exit 0: 3: cli
```

## Tasks to do

### `1)` Scénarios

> Chaque refus a son témoin et chaque témoin a rougi sous mutation.

1. Reprendre les helpers existants (`seedIssues`, `openTrain`, `readRecord`, `trainPath`, `world.supervise([...], { topology })`) ; une `scenario("…")` par ligne du Test Scope.
2. Le rang excédentaire se construit à partir de la valeur de la topologie du scénario (`maxControllerCycles + 1`), jamais en littéral : le harnais ne recopie pas le chiffre de la topologie réelle.
3. Pour chaque refus : vérifier que la raison nomme l'id ou l'item et qu'aucune validation n'a été lancée (journal des commandes).

### `2)` Preuve

> `assert:supervisor` compare `git status` avant et après : arbre quiescent, hors de tout autre travail.

1. Mutation : retirer le refus de `checkConduct` dans un exemplaire jetable et constater que les scénarios de refus rougissent.
2. `pnpm assert:supervisor` complet, puis `pnpm assert:guards-by-role`, puis `pnpm check`.

## Test acceptance criteria

| Task | Acceptance criteria |
| ---- | ------------------- |
| 1    | Un scénario par refus et par acceptation ; aucun nombre de cycles écrit en littéral dans le harnais. |
| 2    | Chaque scénario de refus rougit sous mutation ; `assert:supervisor`, `assert:guards-by-role` et `pnpm check` verts sur un arbre quiescent. |
