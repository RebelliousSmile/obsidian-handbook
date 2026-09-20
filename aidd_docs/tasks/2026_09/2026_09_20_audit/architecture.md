---
name: audit
description: Codebase audit report - architecture pillar, handbook
argument-hint: N/A
---

# Codebase Audit: handbook / architecture

Le découpage en couches tient, mais les épingles de schémas ont dérivé de leurs sources et de l'autre consommateur, et `games` importe désormais du code d'exécution depuis `features`.

- **Date**: 2026-09-20
- **Scope**: handbook / architecture
- **Health**: fair
- **Findings**: 1 critical, 2 warning, 1 minor

## Findings

| Sev | Category     | Location                      | Issue                                                                                                                                                                                                                                       | Suggested fix                                                                                     | Effort |
| --- | ------------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------ |
| 🔴  | architecture | `package.json:66`             | `schema-adrenaline` épinglé en **v1.0.0** alors que le dépôt source est en 2.x et que lantern installe **v2.0.0** : les deux consommateurs du même contrat sont sur des majeures différentes                                                    | Trancher une majeure pour tout le projet et réaligner les deux consommateurs, ou documenter l'écart | M      |
| 🟡  | architecture | `src/games/fromSchema.ts:25`  | `src/games` importe l'aide d'exécution `zoneOverrideFields` depuis `../features/blocks/shape`, alors que `features` importe `games` 22 fois : la dépendance est bidirectionnelle (aussi `src/games/overrides.ts:2`, `src/games/types.ts:23`)     | Déplacer `shape` vers une couche dont les deux peuvent dépendre (`src/core` ou `src/utils`)         | M      |
| 🟡  | architecture | `package.json:67`             | `schema-in-the-mist` épinglé en **v1.3.0** alors que la source et lantern sont tous deux en 1.3.3                                                                                                                                              | Monter l'épingle à 1.3.3 puis relancer `check`                                                     | S      |
| 🟢  | architecture | `.github/workflows/ci.yml:14` | `path: handbook` niche un checkout mono-dépôt dans un sous-dossier, ce qui force des `working-directory` et un `cache-dependency-path` partout en aval (`:31`)                                                                                  | Retirer l'entrée `path:` et les surcharges qu'elle impose, sauf si un second checkout en a besoin   | S      |

Vérifié sain : aucun import croisé entre les arbres `src/games/<jeu>` ; `src/utils` ne dépend de rien au-dessus de lui.

## Top actions

1. Trancher la majeure adrenaline entre handbook et lantern (`package.json:66`) — un contrat installé à deux majeures finira par diverger sans bruit.
2. Casser le cycle `games ↔ features` en relogeant `features/blocks/shape`.
3. Monter l'épingle mist, puis supprimer le `path: handbook` vestigial.

## Coverage

- **Scanned**: architecture (frontières de couches, sens des imports, isolation inter-jeux, épingles de contrat inter-dépôts, topologie CI)
- **Skipped**: none — aucun diagramme C4 ni jeu d'ADR n'existe dans `aidd_docs/`, la conformité a donc été mesurée contre le graphe d'imports et le découpage documenté dans `CLAUDE.md`
