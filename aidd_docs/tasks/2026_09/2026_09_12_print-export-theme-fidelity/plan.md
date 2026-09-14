---
objective: "Les exports PDF préservent le style et la polarité active de chaque pack, dont les règles propres sont fournies par son schéma après Handbook."
status: pending
---

# Plan: Fidélité des exports et contrat CSS des packs

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Préserver l’identité du jeu actif sans confondre City (light/dark) et Legend (mono-clair), sans dupliquer un style de pack dans Handbook. |
| **Source** | Révision de ce plan, recette des quatre coffres et [schema-in-the-mist#11](https://github.com/RebelliousSmile/schema-in-the-mist/issues/11). |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Réaligner l’impression sur la polarité active | [`phase-1.md`](./phase-1.md) |
| 2 | Étendre le contrat de pack avec une feuille CSS | [`phase-2.md`](./phase-2.md) |
| 3 | Migrer City vers le style fourni par son schéma | [`phase-3.md`](./phase-3.md) |
| 4 | Recette croisée et archivage | [`phase-4.md`](./phase-4.md) |

## Resources

| Source | Verified |
| --- | --- |
| [schema-in-the-mist#11](https://github.com/RebelliousSmile/schema-in-the-mist/issues/11) | Les packs actuels transportent tokens et assets, pas de feuille CSS de jeu. |

## Decisions

| Decision | Why |
| --- | --- |
| L’export conserve la polarité active. | City déclare `light` et `dark`; Legend ne déclare que `light`. Forcer light mélange leurs contrats. |
| Handbook garde les comportements d’impression communs uniquement. | Typographie, cartes, callouts, surfaces et chrome d’un jeu appartiennent au schéma qui les déclare. |
| Une liste de feuilles CSS de pack suit la CSS générique et chaque règle est préfixée par son jeu. | Le schéma devient l’autorité visuelle sans fuite entre jeux, sans refermer le contrat si un pack doit séparer base, composants et variante. |
| Le contrat est publié avant sa consommation par Handbook. | Le manifeste du schéma, sa version minimale Handbook et le rechargement de source forment une même livraison ; aucune migration locale ne peut supposer un fichier absent du pack installé. |
| La migration City dépend du contrat CSS. | Une nouvelle correction locale recréerait la duplication constatée. |
