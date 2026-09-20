---
objective: "Handbook installe schema-pbta v5.5.0 depuis une épingle vérifiable, et prouve contre les métadonnées inter-outils que cette release publie ce que le plugin déclare localement sur les capacités PbtA et l'appartenance des cibles aux packs."
status: in-progress
---

# Plan: Épingle schema-pbta v5.5.0 et preuve contre les métadonnées inter-outils

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Passer l'épingle `schema-pbta` de v5.4.0 à v5.5.0, dériver cette épingle au lieu de la recopier, puis faire lire `cross-tool-provider.json` et `packs/*/pack-contract.json` par le contrôle `assert:pbta-pack-coverage` — qui prouve les déclarations locales de Handbook au lieu de les remplacer par des imports amont dans le bundle. |
| **Source** | GitHub issue [#36](https://github.com/RebelliousSmile/obsidian-handbook/issues/36) — `chore(deps): bump the schema-pbta pin to v5.5.0`, dont la section « Then the coverage control can be tightened » ouvre la phase 2. |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Épingler v5.5.0 et rendre l'épingle vérifiable | [`phase-1.md`](./phase-1.md) |
| 2 | Prouver capacités et appartenance contre les métadonnées publiées | [`phase-2.md`](./phase-2.md) |

## Resources

| Source | Verified |
| --- | --- |
| [Release `schema-pbta` v5.5.0](https://github.com/RebelliousSmile/schema-pbta/releases/tag/v5.5.0) | L'asset `schema-pbta-5.5.0.tgz` est public et accompagné de son `.sha256` ; le tarball téléchargé vaut `ed963c62d5734768268f71bfb142e87210bc6a2d870e2dbde595734aa7ba4f35`, identique au condensat publié. |
| `cross-tool-provider.json` du tarball v5.5.0 | `providerVersion 1`, `contractVersion 5`, `corpus: "corpus/contract/cases.json"`, `packManifest: "packs/*/pack-contract.json"`, `capabilities.handbook = ["block:pbta-playbook", "block:pbta-move", "style:pbta"]` — exactement `PORTABLE_GAME_PLUGIN_SUPPORT` de `src/games/capabilities.ts`, donc une inclusion à prouver, pas une liste à importer. |
| `packs/<id>/pack-contract.json` du tarball v5.5.0 | Six packs (`masks`, `monster-of-the-week`, `monsterhearts`, `salvage-run`, `the-sprawl`, `urban-shadows`), 7 documents déclarés ; chaque `fixture` nommée existe dans le corpus publié (vérifiée une à une). Chaque `requirements.handbook` vaut `["block:pbta-playbook", "style:pbta"]`. Aucune métadonnée d'alias n'y est publiée. |
| `corpus/contract/cases.json` v5.4.0 vs v5.5.0 | Corpus identique : 30 cas, `tomlVersion 1.0.0`, même distribution par cible. Le bump ne peut donc casser aucune assertion de corpus existante. |
| Commit `51951f5` (`build(deps): pin schema-pbta to its stable release tarball`) | Recette de réparation du lockfile : l'entrée signée `release-assets.githubusercontent.com` sans `integrity` avait été remplacée par l'URL `releases/download/v5.4.0/…` et son SRI. À reproduire pour v5.5.0. |

## Decisions

| Decision | Why |
| --- | --- |
| L'épingle se dérive de `package.json`, elle ne se recopie pas dans les outils. | `assert-pbta-contract.mjs` est le dernier lanceur à figer l'URL et la version en littéral ; les deux autres producteurs les dérivent déjà. Recopié, chaque bump devient une chasse aux occurrences ; dérivé, il reste une modification d'une ligne. |
| Les métadonnées amont sont lues par le contrôle, pas importées dans le bundle du plugin. | `packManifest` est un glob : un bundle ne l'énumère pas et devrait figer six imports nommés, c'est-à-dire la liste même qu'on prétend supprimer. Le motif déjà retenu pour `PBTA_ALIAS_TARGETS` — déclarer localement, prouver au build — vaut pour les capacités et l'appartenance. |
| La liste des capacités PbtA du runtime devient `PORTABLE_GAME_PLUGIN_SUPPORT`, et son inclusion dans `capabilities.handbook` est prouvée. | `coverage.ts` duplique une liste que `src/games/capabilities.ts` détient déjà, et c'est celle-là que `gamePluginCapabilityIssues` oppose aux manifestes de packs installés. Trois sources valent zéro ; une source locale plus une assertion amont valent une preuve. |
| L'appartenance d'une cible à un pack reste déduite du nom de la cible, mais cette convention devient une assertion contre les contrats publiés. | Les identifiants de packs du runtime viennent des manifestes *installés* (`initGameRegistry` remplit `GAME_REGISTRATIONS`), pas du producteur : substituer `pack.id` amont déplacerait la convention sans la supprimer. Prouver que chaque cible de playbook publiée vaut exactement `pack.id` suivi de `-playbook` rend la règle fausse-au-build plutôt que muette-à-l'exécution, et rend le nom du pack attendu affichable sans métadonnée embarquée. |
| `PBTA_ALIAS_TARGETS` reste déclaré et mesuré localement. | v5.5.0 ne publie aucune notion d'alias — et `packs/salvage-run/pack-contract.json` déclare au contraire `salvage-run-playbook` comme cible de plein droit. Lire l'alias en amont importerait une contradiction ; la liste locale, prouvée contre le corpus, reste la seule source. |
| Une cible ou un pack ajoutés en amont sont une observation, une régression de ce que Handbook déclare est un échec. | Les trois dépôts avancent à leur rythme. L'asymétrie déjà retenue pour la couverture PbtA s'étend aux nouveaux contrôles : sinon chaque release amont repeint le build en rouge sans que rien ne soit cassé. |
