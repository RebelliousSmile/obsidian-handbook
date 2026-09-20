---
name: audit
description: Codebase audit report - dependencies pillar, handbook
argument-hint: N/A
---

# Codebase Audit: handbook / dependencies

Sept avis ouverts, dont deux de sévérité haute sur `postcss`, qui est une dépendance d'exécution utilisée précisément pour analyser du CSS tiers non fiable.

- **Date**: 2026-09-20
- **Scope**: handbook / dependencies
- **Health**: fair
- **Findings**: 1 critical, 1 warning, 1 minor

## Findings

| Sev | Category     | Location            | Issue                                                                                                                                                                                                                                | Suggested fix                                                                        | Effort |
| --- | ------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------ |
| 🔴  | dependencies | `package.json:64`   | `postcss` 8.5.6 en dépendance d'exécution porte 4 avis : traversée de chemin (≤8.5.17), lecture de fichier arbitraire (≤8.5.11), correctif incomplet (≤8.5.22), XSS (<8.5.10). Le plugin l'utilise sur du CSS de pack tiers (`src/games/assets.ts:333`) | Monter à ≥8.5.23 et relancer `pnpm check`                                             | S      |
| 🟡  | dependencies | `package.json:65`   | `postcss-selector-parser` 7.1.0 : déni de service (≥7.1.0 <7.1.3), également sur le chemin d'exécution du CSS de pack                                                                                                                  | Monter à ≥7.1.3                                                                       | S      |
| 🟢  | dependencies | `package.json:77`   | `ajv` 6.12.6 (devDependency) : ReDoS, corrigé en 6.14.0                                                                                                                                                                              | Monter à ≥6.14.0, ou vers ajv 8 si les schémas le tolèrent                             | S      |

Totaux de l'audit de dépendances : 0 critical, 2 high, 4 moderate, 1 low. Tous les correctifs sont disponibles sans changement de majeure.

Vérifié : les trois dépendances de schémas (`package.json:66-68`) sont installées depuis des tarballs de release GitHub, avec un hachage d'intégrité `sha512` présent dans `pnpm-lock.yaml` — les octets ne peuvent donc pas changer en silence ; le risque résiduel est la disponibilité (supprimer ou re-couper une release casse toute installation propre), pas la substitution. Licences : aucune dépendance copyleft. `packageManager` est déclaré, et `pnpm-lock.yaml` est le seul lockfile suivi.

## Top actions

1. Monter `postcss` et `postcss-selector-parser` (`package.json:64-65`) : ce sont les seules dépendances d'exécution exposées à une entrée tierce, et les deux avis de sévérité haute sont là.
2. Monter `ajv` dans la même passe.
3. Traiter le risque de disponibilité des tarballs de release en parallèle du pilier `architecture` (les épingles adrenaline et mist sont de toute façon à réaligner).

## Coverage

- **Scanned**: dependencies (avis de vulnérabilité, épingles d'exécution vs dev, chaîne d'approvisionnement des tarballs, intégrité du lockfile, licences)
- **Skipped**: none
