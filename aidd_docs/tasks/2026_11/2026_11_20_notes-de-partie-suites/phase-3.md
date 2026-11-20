---
status: pending
---

<!-- Fill or omit these sections; never add, rename, or reorder one. -->

# Instruction: Lantern : export PDF, TOML et feuilles papier, constatés

Issue : lantern#80. Constat dans le navigateur ; aucun code attendu sauf si un écart est corrigé (il devient alors une issue, hors de ce plan).

## Architecture projection

> Tree of the final files. ✅ create · ✏️ modify · ❌ delete

```txt
obsidian-handbook/
└── aidd_docs/tasks/2026_11/2026_11_20_notes-de-partie-suites/
    └── verdicts.md   ✅ un verdict par point constaté (export PDF, TOML, comparaison à chaque feuille papier)
```

## User Journey

```mermaid
flowchart TD
  A[Serveur de développement Lantern] --> B[Fiche d'un jeu du périmètre]
  B --> C[Export PDF avec la page de notes puis sans]
  B --> D[Export TOML avec puis sans « Inclure les notes »]
  B --> E[Aperçu contre la feuille papier de référence]
  C --> F[Verdict par point]
  D --> F
  E --> F
  F -->|écart| G[Issue ouverte]
```

## Test Scope

```mermaid
---
title: Test scope
---
journey
  section Setup
    Serveur de développement lancé, une fiche remplie par jeu avec des notes => états prêts: 5: browser
  section Happy path
    Export PDF => impression native, une page A4 par page déclarée, texte sélectionnable: 5: browser
    Export TOML avec notes => le champ de notes est présent: 5: browser
    Aperçu de chaque fiche => conforme à sa référence papier: 5: browser
  section Edge case - sans notes
    Export PDF sans la page de notes => aucune page de notes: 1: browser
    Export TOML sans « Inclure les notes » => aucun champ de notes, le reste intact: 1: browser
  section Edge case - écart
    Un point ne tient pas => issue ouverte, verdict « écart » nommé: 1: browser
```

## Tasks to do

### `1)` Export PDF

> Ce que l'utilisateur obtient en choisissant PDF.

1. Sur chaque jeu du périmètre : lancer l'export PDF avec la page de notes, puis sans ; vérifier le nombre de pages, l'ordre, la taille A4, une `@page` nommée par page, le texte sélectionnable.
2. Noter le verdict de chaque jeu dans `verdicts.md`.

### `2)` Export TOML

> Les notes partent, ou ne partent pas, selon la case.

1. Exporter le TOML avec « Inclure les notes » puis sans ; comparer les deux : seul le champ de notes diffère.
2. Réimporter le TOML avec notes : le texte revient dans la page de notes.

### `3)` Feuilles papier

> Chaque fiche est comparée à sa référence.

1. Comparer l'aperçu de chaque fiche à la feuille papier de référence du plan d'origine ; la référence se nomme dans le verdict.
2. Tout écart devient une issue ; le plan ne corrige pas en passant.

## Test acceptance criteria

| Task | Acceptance criteria |
| ---- | ------------------- |
| 1 | `verdicts.md` porte un verdict d'export PDF, avec et sans page de notes, pour chaque jeu du périmètre. |
| 2 | `verdicts.md` porte un verdict TOML avec et sans notes, et la réimportation. |
| 3 | `verdicts.md` porte un verdict par fiche contre sa référence papier ; chaque écart renvoie à une issue. |
