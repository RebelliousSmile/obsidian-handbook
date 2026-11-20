---
objective: "La feuille de relations d'Adrenaline (`relations`, schema-adrenaline 6.4.0) se rend dans Handbook et s'édite dans Lantern, et les deux consommateurs adoptent par un train les versions publiées de schema-adrenaline et de schema-pbta."
status: in-progress
---

<!-- Fill or omit these sections; never add, rename, or reorder one. -->

# Plan: Feuille de relations Adrenaline et adoption des fournisseurs

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Publier schema-adrenaline (cible `relations`) et schema-pbta (correctif Urban Shadows), puis rendre la feuille de relations dans Handbook et l'éditer dans Lantern, en un seul train. |
| **Source** | Quatre issues ouvertes le 2026-11-20 : schema-pbta#53, schema-adrenaline#51, obsidian-handbook#139, lantern#81. |

## Phases

| #   | Phase | File |
| --- | ----- | ---- |
| 1   | Fournisseurs : publier schema-pbta et schema-adrenaline (#53, #51) | [`phase-1.md`](./phase-1.md) |
| 2   | Handbook : rendre la feuille de relations (#139) | [`phase-2.md`](./phase-2.md) |
| 3   | Lantern : éditer la feuille de relations (#81) | [`phase-3.md`](./phase-3.md) |
| 4   | Train : livraison et verdict de rendu | [`phase-4.md`](./phase-4.md) |

## Resources

Aucune source externe : tout vient des dépôts frères (`schema-adrenaline`, `schema-pbta`, `lantern`) et de `doc/supervisor.fr.md`.

## Decisions

| Decision | Why |
| -------- | --- |
| **Un seul train, qui embarque aussi les changements non livrés du plan `notes-de-partie-suites`** (lantern#78 et #79, obsidian-handbook#137). Les deux fournisseurs, Lantern et Handbook y sont liés ; les fournisseurs passent d'abord (candidate, puis finale), les consommateurs ensuite. | Un dépôt engagé dans un train ouvert est refusé dans un autre (`doc/supervisor.fr.md`, `link`) : Lantern et Handbook ne peuvent pas avoir deux trains à la fois. Les issues #80 (constats au navigateur) et #136 / #138 (superviseur, déjà commité) n'y entrent pas. |
| **Pendant le codage, les consommateurs se construisent contre les checkouts des fournisseurs, sans paquet publié** : `preview` et `present` redirigent chaque paquet déclaré vers son dossier ; pour un `pnpm build` ou un `assert:*` local, une épingle tarball locale (`pnpm pack` du fournisseur), jamais commitée. La finale n'est épinglée que par le superviseur, après publication. | `origin/main` de schema-adrenaline porte 6.4.0 sans tag, donc aucun paquet n'existe ; le superviseur ne publie la candidate qu'à `publish`, après `present`. |
| **schema-pbta n'a pas de code consommateur** : le train ne fait que l'adopter (octets de `playbook.css` d'Urban Shadows). | L'issue #53 ne demande qu'une publication ; l'adoption se prouve par les harnais existants. |
| **Le rendu consomme `RELATIONS_PRESENTATION`, sans repli local** : formes `name-card`, `pc-ties`, `counter`, `npc-entries`, `fieldRows` par élément, `maxItems` du schéma pour le nombre d'emplacements imprimés. Le modificateur d'attitude se lit dans `ATTITUDE_LEVELS`, jamais saisi ni stocké. | Contrat et sémantique de présentation vivent dans le schéma ; l'issue #139 le demande. |
| **`block:adrenaline-relations` entre dans le `requires` du pack avec le rendu, dans la même livraison, et ce `requires` est le fichier du fournisseur** (`schema-adrenaline/handbook/adrenaline/pack.json`), pas un fichier de Handbook : la liste que Handbook déclare (`src/games/capabilities.ts`) s'étend en phase 2, le `pack.json` par un commit de schema-adrenaline **avant la publication de la candidate**. 6.4.0 n'étant pas tagué, ce commit entre dans 6.4.0 sans nouvelle version ; la version du pack et son `minimumHandbookVersion` se règlent dans ce même commit. | Une capacité exigée avant d'être rendue ferait refuser le pack à tort ; l'inverse (rendu sans exigence) laisse un Handbook trop ancien charger le pack sans pouvoir afficher la feuille. |
| **Un rendu dédié de style PJ, sans toucher `compactCard.ts` ni `settings/types.ts`.** La feuille a sa racine `brumes-adrenaline-relations` (surface `paper-sheet`, comme la fiche PJ), son `renderer.ts` et son `_relations.scss` ; elle n'a pas de drapeau de fonctionnalité. Le nombre d'emplacements se lit dans le `maxItems` du schéma publié (`publishedMaxItems`). | `compactCard.ts` est la carte compacte des PNJ/créatures (surface `card`) : y greffer une feuille A4 mêlerait deux surfaces. Les blocs Adrenaline s'activent par la capacité du pack, pas par `features.*`. |
| **Si le premier rendu réel déborde (capacités `maxLength` estimées sans mesure), l'ajustement passe par une version mineure du schéma**, pas par une troncature locale. | Aucun repli sémantique local ; l'écart devient une issue de schema-adrenaline, hors de ce plan. |
| **Numéros de PNJ : Lantern attribue le prochain numéro libre (1 à 99) et le garde stable** ; Handbook ne renumérote jamais. | Le schéma ne vérifie ni l'unicité ni l'existence des numéros référencés : c'est le rôle de l'éditeur. |
| **Sans backlog-link.** Quatre sources dans quatre dépôts, le fichier de lien n'en nomme qu'une. | Les issues se citent dans l'Overview et dans chaque phase. |
