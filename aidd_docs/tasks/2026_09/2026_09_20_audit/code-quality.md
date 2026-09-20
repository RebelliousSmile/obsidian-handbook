---
name: audit
description: Codebase audit report - code-quality pillar, handbook
argument-hint: N/A
---

# Codebase Audit: handbook / code-quality

Hygiène globalement saine (aucun TODO, aucun `any` explicite, journalisation centralisée), gâtée par un bug de correction dans le chargeur de CSS de pack et un fichier de réglages de 843 lignes.

- **Date**: 2026-09-20
- **Scope**: handbook / code-quality
- **Health**: fair
- **Findings**: 1 critical, 1 warning, 2 minor

## Findings

| Sev | Category     | Location                    | Issue                                                                                                                                                                                                                                              | Suggested fix                                                                              | Effort |
| --- | ------------ | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------ |
| 🔴  | code-quality | `src/games/assets.ts:315`   | `return state` tout-ou-rien dans la boucle des feuilles de style (aussi `:323`) : une feuille manquante ou fautive jette **toutes** les feuilles du pack, alors que la règle documentée est « une valeur fautive se perd elle-même, le reste s'applique » | Remplacer les deux `return state` par `continue`, pour qu'une feuille fautive ne perde qu'elle-même | S      |
| 🟡  | code-quality | `src/settings/index.ts:1`   | 843 lignes dans un seul fichier, le plus gros du dépôt, mêlant rendu des onglets, gestion des sources, surcharges de pack et plomberie de tâches (suivants : `fromSchema.ts` 591, `BrumesPlugin.ts` 500, `assets.ts` 414)                             | Découper par section de réglages (sources / packs / surcharges), chacune derrière sa fonction de rendu | M      |
| 🟢  | code-quality | `tools/check.mjs:11`        | `externalSchemaAssertions` exclut `assert:adrenaline-source`, un script qui n'existe plus dans `package.json`                                                                                                                                        | Supprimer l'entrée morte pour que la liste d'exclusion reflète la réalité                  | S      |
| 🟢  | code-quality | `src/settings/index.ts:114` | `@typescript-eslint/no-deprecated` désactivé pour appeler le `this.display()` d'avant 1.13                                                                                                                                                           | Migrer `redisplay()` vers l'API de rafraîchissement post-1.13 et retirer la désactivation   | S      |

Vérifié sain : 0 `TODO`/`FIXME` dans `src/`, 0 `any` explicite, `console.*` confiné à `src/utils/logger.ts:58-67`.

## Top actions

1. Corriger la perte tout-ou-rien des feuilles de style à `src/games/assets.ts:315,323` — c'est un bug de correction contre un contrat documenté, pas un souci de style. Passer la main à `refactor`, et ajouter un harnais qui prouve qu'un pack avec une feuille cassée applique quand même les autres.
2. Éclater `src/settings/index.ts` : chaque évolution des réglages doit aujourd'hui y toucher.
3. Nettoyer les deux nits restants (`tools/check.mjs:11`, `src/settings/index.ts:114`) dans la même passe.

## Coverage

- **Scanned**: code-quality (138 fichiers `src/`, taille des fichiers et fonctions, code mort, gestion d'erreurs, duplication, discipline de journalisation)
- **Skipped**: none
