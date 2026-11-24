---
status: done
---

# Instruction: Relever l'état de rendu et le verdict de l'utilisateur

## Architecture projection

```txt
aidd_docs/tasks/2026_11/2026_11_09_pbta-playbook-shared-styles/
├── reference.md ✏️ colonne « verdict » par point de contrôle, jeu et outil ; liste des écarts à corriger
└── reference/ ✏️ captures du rendu actuel (ignorées par git)
```

## User Journey

```mermaid
flowchart TD
  A[Capture La Selkie et The Aware, Obsidian] --> B[Capture dans Lantern]
  B --> C[Comparaison aux recadrages PDF de reference/]
  C --> D{Verdict de l'utilisateur sur 6 points}
  D -- écarts --> E[Liste des corrections dans reference.md]
  D -- tout validé --> F[Phase 3 seule]
```

## Test Scope

```mermaid
---
title: Test scope
---
journey
  section Setup
    construire dist/ avec pnpm build => dist/main.js et dist/styles.css à jour: 5: cli
  section Happy path
    lancer tools/e2e/playbook-capture.ps1 -Game all => handbook-monsterhearts-1400.png et handbook-urban-shadows-1400.png écrits: 5: cli
    afficher les deux outils face au PDF => l'utilisateur rend un verdict par point: 5: browser
  section Edge case - capture intermittente
    lancer trois captures d'Urban Shadows de suite => aucune n'échoue sur une largeur nulle: 3: cli
  section Edge case - polices à choisir
    comparer deux ou trois polices libres pour le nom de La Selkie et les titres d'Urban Shadows => choix consigné: 3: browser
  section Edge case - Lantern en anglais
    ouvrir La Selkie dans Lantern en langue anglaise => libellés anglais présents, constat noté: 3: browser
```

## Tasks to do

### `1)` Capturer l'état actuel

> Partir du rendu réellement livré, pas de celui du 2026-11-09.

0. Corriger d'abord `tools/e2e/playbook-capture-cdp.py` (écart 3 : capture d'Urban Shadows échouant par intermittence, boîte mesurée avant la mise en page) : attendre la mise en page (`document.fonts.ready` puis deux `requestAnimationFrame`) avant de mesurer, et relancer trois captures de suite sans échec.
1. `rtk proxy pnpm build`, puis `pwsh tools/e2e/playbook-capture.ps1 -Game all -SchemaRoot ../schema-pbta` (paquet épinglé à jour dans le coffre temporaire).
2. Capturer La Selkie et The Aware dans Lantern, lancé en local.
3. Ranger les captures dans `reference/` à côté des recadrages PDF.

### `2)` Obtenir le verdict

> Le verdict est à l'utilisateur ; il fixe ce que les phases 2 et 3 corrigent.

1. Présenter, par jeu et par outil, les trois points de contrôle de `reference.md` face au PDF.
2. Consigner chaque écart annoncé dans `reference.md` (§ Verdict) : région, outil, rendu attendu.
3. Constater aussi l'export PDF actuel de La Selkie, sans le corriger (phase 3).
4. Faire trancher par l'utilisateur les deux choix de police en suspens : le nom de La Selkie (écart 2 : `IM Fell Double Pica` italique ou un script libre) et les titres et étiquettes de `stat-spread` / `circle-status` d'Urban Shadows (écart 9 : pinceau penché à pointes, sans-serif gras). Présenter pour chacun deux ou trois candidates sous licence libre déjà publiables, rendues côte à côte ; consigner le choix.

## Test acceptance criteria

| Task | Acceptance criteria |
| ---- | -------------------- |
| 1 | Une capture par jeu et par outil existe dans `reference/`, avec le Handbook et le paquet courants. |
| 2 | `reference.md` porte un verdict par point de contrôle, jeu et outil, et la liste des écarts à corriger (éventuellement vide), polices comprises : les écarts 2 et 9 y portent le choix de l'utilisateur. |
| 3 (outillage) | Trois captures d'Urban Shadows de suite aboutissent, sans « Cannot take screenshot with 0 width ». |
