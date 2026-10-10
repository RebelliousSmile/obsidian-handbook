---
objective: "L'issue schema-adrenaline#41 est fermée sur preuves : les cinq questions ouvertes sont tranchées, chaque critère d'acceptation est vérifié au rendu de l'exemple « Agent de sécurité », et les écarts réels restants sont corrigés par un train du superviseur."
status: pending
---

# Plan: Clore schema-adrenaline#41 (fiche PNJ Zombiology)

## Overview

| Field | Value |
| ----- | ----- |
| **Goal** | Fermer #41 avec des preuves. L'issue date d'avant les trains déjà publiés : une grande part des écarts qu'elle liste est livrée. Le plan commence donc par un audit au rendu. |
| **Source** | `RebelliousSmile/schema-adrenaline#41` ; référence visuelle `schema-adrenaline/aidd_docs/tasks/2026_10/2026_10_02_fiche-pnj-maquette/` (`preview.html`, `pnj.jpg`, `comparaison.png`) ; `src/presentation.ts` (`PNJ_PRESENTATION`) ; `schemas/adrenaline/pnj.schema.json` ; `examples/adrenaline/pnj/agent-de-securite.toml` ; `obsidian-handbook/src/features/adrenaline/compactCard.ts` et `_pnj.scss`. |
| **Déjà livré (relevé du 2026-10-09)** | Exemple « Agent de sécurité » conforme à la maquette ; dégâts portés par la compétence (`competences.degats` : versant, profils, propriétés, munitions, portée) ; `reduction` et `couverture` dans le schéma ; pistes `malus-tracks` (10 cercles, 2 de stress par défaut) ; formes `compact-rows` et `inline-list` ; surface `compact-card` ; `narratif` rangé dans une section « Meneur » repliable ; `PNJ_PRESENTATION` déclare déjà l'en-tête en bannière (icônes `Police` et `Animal`), la section « Santé », « Formations » et « Compétences » scindées (`skill-lines`) et l'équipement en `inline-list` ; rendu Handbook piloté par `PNJ_PRESENTATION` (`compactCard.ts`). |
| **À confirmer au rendu ou à trancher** | (a) Questions ouvertes 1 à 5 de l'issue : réduction contre bonus de seuil, badges jaune/rouge = Choquante/Blessante, source du nombre de cercles de stress, pâlissement des cercles Malus, police ; (b) l'en-tête déclaré donne-t-il bien deux étages et l'icône au rendu ; (c) probable écart réel : « Santé » garde « Seuils », « Protections », « Stress et malus » et « État de partie » en blocs séparés, alors que la maquette range armure et caractère sous leurs seuils par versant, et `status-frames` ne doit pas doubler les pistes imprimées ; (d) formations et compétences scindées, filet grenat par ligne ; (e) valeurs imprimées et titres de section calés à gauche sur bandeau pour `compact-card` ; (f) `narratif` hors de la carte : déjà rangé dans la section « Meneur » repliable (`details`), que `assert:adrenaline-theme` exclut des sections de la carte ; confirmer seulement au rendu ; (g) paires encre/fond des jetons de badge de dés et de déclencheur ; la réduction du caractère n’a pas de jeton propre dans le pack (à relever, puis créer un jeton ou réutiliser le badge de dés) ; (h) preuves automatiques : `assert:adrenaline-zombiology-style` et `assert:adrenaline-theme` couvrent-ils chaque rôle retenu ; (i) issue sœur Handbook demandée par l'issue : #64 (« reprendre et valider les fiches Zombiology depuis le contrat publié », ouverte) la porte déjà ; la rattacher à #41, et n'en ouvrir une que si un écart Handbook retenu sort de son périmètre. |
| **Hors périmètre** | Fiches PJ et monstre (autres issues), police de la maquette si l'utilisateur garde celle du pack. |
| **Mode** | Un train du superviseur (`doc/supervisor.fr.md`) conduit par `ship-train` si l'audit trouve un écart de contrat ou de style : `schema-adrenaline` → `obsidian-handbook` (+ `lantern` en épingle seule). **Pas de train si l'audit est propre** : on ferme #41 avec le tableau d'audit. Un écart purement Handbook donne un train Handbook seul. |
| **Versions** | Désignées par rôle : **v\<N>** est le contrat Adrenaline publié au départ, **v\<N+1>** celui du train. Aucun numéro ni SHA en dur. |

## Phases

| # | Phase | File |
| - | ----- | ---- |
| 1 | Audit : rendu de l'exemple contre `preview.html`, réponse à chaque question ouverte | [`phase-1.md`](./phase-1.md) |
| 2 | Corrections retenues : schéma, présentation, jetons (schema-adrenaline) puis Handbook | [`phase-2.md`](./phase-2.md) |
| 3 | Train, rendu validé, livraison et fermeture de #41 | [`phase-3.md`](./phase-3.md) |

## Decisions

| Decision | Why |
| -------- | --- |
| Auditer avant de coder | Le tableau de l'issue décrit un schéma 3.0.0 ; le contrat publié a avancé (dégâts, réduction, pistes, formes). |
| Les questions ouvertes sont posées à l'utilisateur, une fois, avec la capture du rendu | Les questions 1, 2 et 4 sont des décisions de règles du jeu, que le code ne tranche pas. |
| Valeurs et jetons dans le pack, sélecteurs dans Handbook | Règle inter-dépôts de `CLAUDE.md` : aucun repli sémantique local. |
| Pas de train vide | `present` refuse un train sans nouveau contenu. |
