---
objective: "Les six suites du train `notes-de-partie` sont traitées : le superviseur détecte avant le départ un ordre de fournisseurs faux et un paquet présenté périmé, `present` joue les harnais de Lantern, l'aperçu Masques suit l'ordre d'export, les notes ont leur contrôle de couverture, l'export PDF et le TOML sans notes sont constatés, et la question d'affichage des notes dans Handbook est tranchée."
status: implemented
---

<!-- Fill or omit these sections; never add, rename, or reorder one. -->

# Plan: Suites du train notes-de-partie

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Solder les réserves laissées par la livraison des notes de partie et de l'export par pages, et corriger les deux accidents de `ship --run` de ce train. |
| **Source** | Six issues ouvertes le 2026-11-20 : lantern#78, lantern#79, lantern#80, obsidian-handbook#136, obsidian-handbook#137, obsidian-handbook#138. Plan d'origine : `aidd_docs/tasks/2026_11/2026_11_20_notes-de-partie-export-par-pages/plan.md` (Decisions, dernières lignes). |

## Phases

| #   | Phase | File |
| --- | ----- | ---- |
| 1   | Superviseur : ordre des fournisseurs, paquet présenté périmé (#138) et validations complètes de Lantern (#136) | [`phase-1.md`](./phase-1.md) |
| 2   | Lantern : ordre des faces de l'aperçu Masques (#78) et contrôle des notes dans la couverture (#79) | [`phase-2.md`](./phase-2.md) |
| 3   | Lantern : export PDF, TOML sans notes et comparaison aux feuilles papier, constatés (#80) | [`phase-3.md`](./phase-3.md) |
| 4   | Handbook : affichage des notes dans les blocs, mêmes champs que Lantern (#137) | [`phase-4.md`](./phase-4.md) |

## Resources

Références de rendu de la phase 3 : celles du plan d'origine (feuilles papier d'Adrenaline PJ, Otherscape, Masques, Urban Shadows, The Sprawl, Monsterhearts), à ne pas redresser ici.

| Source | Verified |
| ------ | -------- |
| `doc/supervisor.fr.md` (§ `present`, § `publish`, « Hors du superviseur ») | Le code du superviseur se corrige hors train, se prouve par `pnpm assert:supervisor`, se commite et se pousse sur `origin/main` avant qu'un train ne tourne de nouveau ; `present` revérifie tout avant le départ. |
| `lantern/package.json` (scripts `check:project`, `assert:*`) | Les harnais `assert:export-pages` et `assert:pbta-notes` existent ; ils ne figurent pas dans les validations `lantern` de `supervisor/topology.json`. |
| `schema-pbta/src/presentation/playbook-pages.ts` | `getPbtaPlaybookPages` publie recto, verso, notes ; le contrat `masks-playbook` liste ses faces `verso`, `recto`. |

## Decisions

| Decision | Why |
| -------- | --- |
| **Ordre d'exécution : 1, puis 2, puis 3.** La phase 1 corrige le superviseur hors train (commit et push avant tout train) ; la phase 2 livre ses changements de Lantern par un train, protégé par les validations élargies ; la phase 3 constate sur ce que la phase 2 a livré, donc après elle. | Un constat de rendu sur du code que la phase 2 va encore changer serait refait. |
| **#137 tranché par l'utilisateur le 2026-11-20 : Handbook affiche les notes de partie, avec les mêmes champs que Lantern.** Il ajoute qu'en fin de séance le joueur peut stocker le contenu et le vider pour la suivante, ou le résumer : lu comme l'usage du texte (édition), pas comme une fonction « archiver » ou « vider » à bâtir. | Décision de produit que le code ne tranchait pas ; la lecture « usage, pas fonction » est à confirmer, la phase 4 la porte. |
| **La phase 4 est indépendante des phases 1 à 3 sauf pour sa livraison** : elle passe par un train du superviseur, donc après la phase 1. Un schéma à étendre (tâche 1.3) passe avant le travail Handbook. | Flux inter-dépôts : le schéma d'abord, publié avant adoption. |
| **Détection avant le départ, pas de réparation par le superviseur.** Le superviseur nomme l'ordre manquant et les fichiers périmés, ne modifie jamais le fichier de train ni ne supprime de `dist/`. | « Toute suppression est un geste humain » et « tout se contrôle avant le départ du train » (`doc/supervisor.fr.md`). |
| **Un fichier de sortie de build est périmé s'il est empaqueté, ignoré par git et plus ancien que le début du build de `present`.** Aucune liste de fichiers ni de dossiers en dur. | Une garde affirme un rôle, jamais un chiffre : le critère se lit du dépôt (`git check-ignore`) et de l'horloge du build, il vaut pour tout fournisseur. |
| **L'ordre des fournisseurs se contrôle par un rejeu, pas par une règle statique.** `present` construit le consommateur dans l'ordre de publication, en n'installant que les paquets déjà passés plus le courant, comme la preuve de `publish`. Repli si le coût est intenable : la règle est documentée dans `doc/supervisor.fr.md`. | Constaté sur ce train : `present` validait avec tous les paquets ensemble, la preuve du premier fournisseur construit avec l'ancienne version du suivant. Une règle « tout fournisseur listé par un consommateur est ordonné » refuserait à tort les trains à fournisseurs indépendants. |
| **L'ordre des pages vient de `getPbtaPlaybookPages`, pas du contrat de présentation.** L'aperçu Masques trie ses faces selon les pages que le pack publie pour l'export ; le contrat de `schema-pbta` n'est pas modifié ici. | Un seul ordre fait foi pour l'aperçu et l'export. |
| **Le vérificateur de la phase 3 est le navigateur, pas un harnais.** Les points sont constatés sur un serveur de développement Lantern, chacun avec un verdict ; les écarts deviennent des issues. | L'impression native et la comparaison au papier ne se jouent pas hors navigateur (les harnais `assert:*` ne rendent pas les pages). |
| **Phase 1 réalisée avec trois écarts.** (1) La détection des fichiers périmés est `staleFiles` dans `packedFiles.mjs`, une fonction séparée de `packedFiles` (qui garde sa forme) : `present` l'appelle avec l'instant de début du build. (2) Le rejeu d'ordre est `replayInOrder` dans `present.mjs` : il ne rejoue que les **préfixes stricts** de l'ordre de publication (le cas « tous ensemble » est déjà la validation), et l'ordre entre dans la clé de preuve (`evidence.mjs` ne trie plus les fournisseurs). (3) `publish.mjs` ne change que dans un commentaire : il n'a pas de message d'accident d'ordre propre, sa preuve étant celle de `present`. Les cinq harnais manquants de `check:project` de Lantern entrent tous dans la topologie, aucun n'est laissé de côté. Sonde anti-faux-refus : après un build sur un `dist/` existant, aucun fichier périmé sur les trois fournisseurs. | Mesuré le 2026-11-20 : `pnpm assert:supervisor` vert (95 scénarios), build et deux portées de lint à zéro. |
| **Phase 2, tâches 1 et 2 codées dans Lantern, non commitées ; la livraison (tâche 3) attend la demande de commit.** #78 : `MasksPlaybookPreview.tsx` trie ses faces selon `playbookPages('masks-playbook')` ; Sprawl et Urban Shadows étaient déjà dans l'ordre publié (le harnais le prouve), rien à y changer. #79 : le contrôle des notes est dans `tools/assertExportPages.harness.mts` (règle `notesScopeFindings`, avec ses preuves de refus) et **non** dans `assert-presentation-coverage.mjs`, qui ne charge aucun modèle (il lit les JSON des packs) alors que le harnais d'export charge déjà tout le registre. L'issue demande le harnais qui échoue en nommant la fiche, pas un fichier précis ; `assert:export-pages` est dans `check:project` et, depuis la phase 1, dans les validations de `present`. Le harnais compare désormais l'ordre des nœuds, pas les ensembles triés : il échoue sur Masques sans la correction (constaté). | Mesuré le 2026-11-20 : `npm run check:project` de Lantern vert. |
| **Phase 4, tâches 1 et 2 codées dans Handbook, non commitées ; la livraison (train, verdict de rendu) attend la demande de commit.** Aucune extension de schéma : le contrat publie page, champ, capacité et libellés, ce qui suffit ; le dessin (cadre, saut de page) est une décision de rendu portée par `renderSessionNotes` et soumise au verdict de l'utilisateur, avec la page de notes de Lantern pour référence. Otherscape ne conservait pas `session_notes` : il est maintenant lu et réécrit, sans quoi vider ou résumer les notes dans Handbook les aurait perdues. Le harnais est `assert:session-notes`, joué par `pnpm check`. | Mesuré le 2026-11-20 : build, `eslint src --ext .ts`, `pnpm lint` et `assert:style-scope` verts ; `pnpm check` vert (sortie 0, `assert:session-notes` joué). |
| **Sans backlog-link.** Le plan a six sources, le fichier de lien n'en nomme qu'une. | Les issues se citent dans l'Overview et dans chaque phase. |
