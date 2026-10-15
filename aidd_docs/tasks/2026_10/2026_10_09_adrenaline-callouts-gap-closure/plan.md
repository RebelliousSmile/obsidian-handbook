---
objective: "L'issue schema-adrenaline#40 est fermée sur preuves : chaque critère d'acceptation est vérifié au rendu, et les écarts réels restants (retrait des listes, filet de h4, preuves manquantes) sont corrigés par un train du superviseur."
status: closed-on-audit
---

# Plan: Clore schema-adrenaline#40 (callouts, titres et listes Zombiology)

## Overview

| Field         | Value |
| ------------- | ----- |
| **Goal**      | Fermer #40 avec des preuves. L'état réel diffère de l'issue : la plupart des critères sont déjà livrés (plusieurs trains schema-adrenaline et Handbook déjà publiés), donc ce plan commence par un audit, pas par du code. |
| **Source**    | `RebelliousSmile/schema-adrenaline#40` ; maquettes dans `zombiology/_sources/Design/` (dossier JdR) ; `handbook/adrenaline/callout-contract.md` et `callouts-example.md` ; `src/styles/adrenaline/_content.scss` et `_callouts.scss`. |
| **Déjà livré (relevé du 2026-10-09)** | `ADRENALINE_VISUAL_CALLOUTS` (8 entrées, `style:adrenaline`, modificateurs `fond` et `video`/`audio`/`livre`/`lien`) consommé par `nativeCallouts.ts` ; `paquetage` fusionné dans `formation\|fond`, `table` devenu `roller`, `description`, `role` et `mention` ajoutés ; h3 sur filet sans bandeau, h4 droit, h5 ; `ol` épargné (`ul > li::marker`) ; glyphe en Live Preview ; `adrenaline-keyword`, `adrenaline-result-*` ; exemple Markdown de 19 callouts, h1 à h5 et liste imbriquée. |
| **Écarts à confirmer ou corriger** | (a) retrait suspendu et alignement du marqueur sur la marge (issue §3.3) : aucun retrait dans `_content.scss` ; (b) h4 : l'issue demande un filet pleine largeur, le contrat publié dit « sans filet » (décision à rendre explicite) ; (c) `assert:adrenaline-zombiology-style` couvre déjà h3 (sans bandeau, filet), h4 et le glyphe de liste ; il manque seulement la preuve que `ol` garde ses numéros et que la fenêtre liste les 8 callouts ; (d) l'issue sœur Handbook demandée n'a jamais été ouverte (des trains Handbook l'ont remplacée) ; (e) le filet pointillé noir de `titre3.jpg` n'est pas tranché ; (f) retrait de première ligne et justification des paragraphes, hors demande mais notés. |
| **Hors périmètre** | `Sidebar-Motel.png`, blocs `monstre`/`pnj`/`pj`, polices grunge sous licence (suivi à part si l'audit le réclame). |
| **Mode**      | Un train du superviseur (`doc/supervisor.fr.md`) conduit par `ship-train` : `schema-adrenaline` → `obsidian-handbook` (+ `lantern` en épingle seule). **Si l'audit (phase 1) ne trouve aucun écart (a), (b), (d), (e), (f) et que la preuve (c) est déjà couverte, pas de train** : on ferme #40 avec le rapport d'audit. **Si seul (c) demande du code, train Handbook seul** (phase 2 sautée, pas de contrat Adrenaline nouveau). |
| **Exécution** | Les worktrees du superviseur (`pnpm supervise worktree <W>`) ne servent que si un autre travail bloque le train ; sinon on travaille sur `main`. Aucune édition de `tools/supervisor/**` n'est nécessaire. |
| **Versions**  | Désignées par rôle : **v\<N>** est le contrat Adrenaline publié au départ, **v\<N+1>** celui du train, au plus une mineure. Aucun numéro ni SHA en dur. |

## Phases

| #   | Phase                                                     | File                         |
| --- | --------------------------------------------------------- | ---------------------------- |
| 1   | Audit des critères d'acceptation au rendu et décisions    | [`phase-1.md`](./phase-1.md) |
| 2   | schema-adrenaline : jetons, exemple et contrat des écarts | [`phase-2.md`](./phase-2.md) |
| 3   | Handbook : sélecteurs, preuves automatiques, issue sœur   | [`phase-3.md`](./phase-3.md) |
| 4   | Train, rendu validé, livraison et fermeture de #40        | [`phase-4.md`](./phase-4.md) |

## Decisions

| Decision | Why |
| -------- | --- |
| Auditer avant de coder | L'issue date d'avant les trains déjà publiés ; la recopier en tâches referait un travail livré. |
| Les valeurs vont dans le pack, les sélecteurs dans Handbook | Règle inter-dépôts de `CLAUDE.md` : le consommateur ne porte aucun repli sémantique local. Un retrait de liste est donc un jeton `--adrenaline-list-*` publié, puis consommé. |
| Étendre l'existant, ne pas dupliquer | La preuve de (c) complète `assertAdrenalineZombiologyStyle`, qui couvre déjà h3, h4 et le glyphe. |
| Pas de train si l'audit est propre | Un train sans changement est refusé par `present` (cas du train Monsterhearts). |
| L'issue sœur Handbook est ouverte à la phase 3, pas avant | Elle n'a de sens que pour un écart réel côté consommateur ; sinon on documente son absence dans #40. |

## Audit du 2026-10-15

Critères 1 à 5 tenus (preuves : `nativeCallouts.ts`, `validate:pack`, `validate:presentation`, `assert:adrenaline-zombiology-style`, `callouts-example.md`), critère 6 sans objet. Écarts (a), (b), (e), (f) tranchés hors périmètre ou voulu ; aucun train : phases 2 à 4 sautées. Le tableau d'audit est le commentaire de clôture de #40.
