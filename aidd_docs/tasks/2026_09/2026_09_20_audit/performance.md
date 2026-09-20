---
name: audit
description: Codebase audit report - performance pillar, handbook
argument-hint: N/A
---

# Codebase Audit: handbook / performance

96,6 % de la feuille de style livrée sont des polices en base64 chargées quel que soit le jeu actif, et la réinstallation des sources fait ses appels réseau en série.

- **Date**: 2026-09-20
- **Scope**: handbook / performance
- **Health**: fair
- **Findings**: 1 critical, 2 warning, 0 minor

## Findings

| Sev | Category    | Location                      | Issue                                                                                                                                                                                                                                             | Suggested fix                                                                                                                | Effort |
| --- | ----------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------ |
| 🔴  | performance | `src/styles/fonts.scss:16`    | Les 11 `@use` de polices (`:16-26`) embarquent 3 568 437 octets de `data:` base64, chargés inconditionnellement : la feuille livrée pèse 3 685 026 octets dont 3 557 316 (96,6 %) en 32 URI base64, pour un plugin Obsidian qui n'affiche qu'un jeu à la fois | Charger les polices depuis des fichiers `.woff2` du dossier du plugin plutôt qu'en base64, et ne déclarer que les faces du jeu actif | L      |
| 🟡  | performance | `src/BrumesPlugin.ts:219`     | `reloadInstalledSchemaSources` boucle en `await` strict : N sources installées = N résolutions GitHub puis N installations, toutes sérialisées, avec l'UI bloquée pendant tout le trajet                                                              | Paralléliser avec `Promise.all` (ou une file bornée) et agréger les échecs                                                    | M      |
| 🟡  | performance | `src/games/assets.ts:333`     | Chaque feuille de pack passe par un analyseur CSS complet sans borne de taille ni mise en cache du résultat, à chaque rechargement de source                                                                                                         | Borner l'entrée et mémoriser le résultat d'analyse par révision de pack                                                       | M      |

Mesures : `dist/main.js` 983 414 octets, `dist/styles.css` 3 685 026 octets. Le poids JS n'est pas signalé comme finding : pour un plugin Obsidian il est chargé une fois au démarrage du coffre, sans coût réseau par navigation.

## Top actions

1. Sortir les polices du base64 (`src/styles/fonts.scss:16-26`) : un seul changement supprime 96,6 % de la feuille livrée. Passer la main à `refactor`.
2. Paralléliser la réinstallation des sources (`src/BrumesPlugin.ts:219`), qui est aussi le point où l'UI manque d'état de chargement (voir `ui.md`).
3. Borner et mémoriser l'analyse CSS des packs — le même correctif sert le pilier `security`.

## Coverage

- **Scanned**: performance (poids des artefacts livrés, chemins chauds, appels réseau sérialisés, opérations lourdes au chargement)
- **Skipped**: aucun pilier écarté, mais no profiler, static heuristics only — les tailles proviennent de la mesure des artefacts et des sources, pas d'un profilage à l'exécution dans Obsidian
