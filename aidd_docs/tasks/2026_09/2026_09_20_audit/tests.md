---
name: audit
description: Codebase audit report - tests pillar, handbook
argument-hint: N/A
---

# Codebase Audit: handbook / tests

26 harnais existent et `check` les découvre dynamiquement, mais cinq d'entre eux — les trois `e2e:*` et deux assertions adrenaline — ne tournent dans aucun enchaînement automatisé.

- **Date**: 2026-09-20
- **Scope**: handbook / tests
- **Health**: fair
- **Findings**: 0 critical, 3 warning, 0 minor

## Findings

| Sev | Category | Location                        | Issue                                                                                                                                                                                                                       | Suggested fix                                                                                                    | Effort |
| --- | -------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------ |
| 🟡  | tests    | `package.json:24`               | `e2e:request-url` (`:24`), `e2e:layout-regions` (`:25`) et `e2e:layout-regions:linux` (`:26`) ne sont collectés ni par `tools/check.mjs` (qui ne ramasse que les scripts `assert:`) ni par `.github/workflows/ci.yml:39`        | Ajouter un job CI qui lance les `e2e:*`, ou les intégrer à `check` derrière un drapeau explicite                   | M      |
| 🟡  | tests    | `tools/check.mjs:12`            | `assert:adrenaline-theme` (`:12`) et `assert:adrenaline-zombiology-style` (`:13`) sont exclus de `check`, et aucun autre enchaînement du dépôt ne les appelle : ils ne tournent donc jamais côté handbook                       | Les faire tourner dans un job CI dédié qui installe le pack adrenaline, ou documenter qu'ils appartiennent au dépôt de schémas | M      |
| 🟡  | tests    | `.github/workflows/ci.yml:39`   | `pnpm check` est la seule étape de vérification du workflow : la couverture automatisée du dépôt tient entièrement à ce que `tools/check.mjs` veut bien découvrir                                                              | Expliciter la liste des suites attendues en CI plutôt que de la déduire du nommage des scripts                      | S      |

Mesures : 26 harnais pour 138 fichiers `src/`. `tools/check.mjs:15-17` découvre les assertions dynamiquement (`build`, `lint`, puis tout script `assert:` non exclu), ce qui est robuste à l'ajout mais aveugle aux familles nommées autrement — exactement le trou des `e2e:*`.

## Top actions

1. Brancher les trois `e2e:*` sur la CI (`package.json:24-26`) : ce sont les seuls tests du dépôt qui exercent le chargement réel et les régions de mise en page.
2. Décider du sort des deux assertions adrenaline exclues (`tools/check.mjs:12-13`) — les rattacher à un job, ou les retirer avec l'entrée morte `:11` signalée dans `code-quality.md`.
3. Après cela, ajouter un harnais pour la perte tout-ou-rien des feuilles de style (`src/games/assets.ts:315`), qui n'est aujourd'hui couverte par rien.

## Coverage

- **Scanned**: tests (inventaire des harnais, découverte par `check`, enchaînements CI, équilibre de la pyramide, couverture des chemins critiques)
- **Skipped**: aucun pilier écarté, mais no coverage tool, static inspection only — le dépôt n'embarque aucun outil de couverture, la couverture des chemins critiques a donc été estimée en confrontant les harnais aux modules, sans mesure de lignes
