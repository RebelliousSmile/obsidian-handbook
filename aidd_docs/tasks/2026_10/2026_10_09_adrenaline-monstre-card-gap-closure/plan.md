---
objective: "L'issue schema-adrenaline#42 est fermée sur preuves : les six questions ouvertes sont tranchées, chaque critère d'acceptation est vérifié au rendu de l'exemple « Infecté Zy-2 », et les écarts réels restants sont corrigés par un train du superviseur."
status: pending
---

# Plan: Clore schema-adrenaline#42 (fiche monstre Zombiology)

## Overview

| Field | Value |
| ----- | ----- |
| **Goal** | Fermer #42 avec des preuves. L'issue décrit un schéma 3.0.0 et un renderer Handbook qui ignorait `actions`, `defense`, `etats`, `etatActif` : le contrat et le rendu ont avancé depuis. Le plan commence donc par un audit au rendu. |
| **Source** | `RebelliousSmile/schema-adrenaline#42` (aucun commentaire) ; référence visuelle `schema-adrenaline/aidd_docs/tasks/2026_10/2026_10_02_fiche-monstre-maquette/` (`preview.html`, `monstre.jpg`, `comparaison.png`) ; `src/presentation.ts` (`MONSTRE_PRESENTATION`) ; `src/zod/adrenaline/monstre.ts` et `src/zod/common/{combat,degats,etat-monstre}.ts` ; `examples/adrenaline/monstre/infecte-zy-2.toml` ; côté Handbook `src/features/adrenalineMonstre/renderer.ts`, `src/features/adrenaline/compactCard.ts`, `src/styles/adrenaline/_monstre.scss`. |
| **Déjà livré (relevé du 2026-10-09)** | **Schéma** : `categorie`, `etatDeBase` (nom, déclencheurs), `etatsPermanents`, `malusAvantHs`, `etatPrincipal`, `etats[]` à delta, `defense.niveau` (le booléen reste en forme historique), type commun de dégâts (`degats.ts` : versant, nature, profils avec condition, propriétés, munitions, portée), actions enchaînées sous l'action (un seul niveau). **Exemple** `infecte-zy-2.toml` écrit d'après la maquette, saisi « tel qu'imprimé ». **Présentation** : surface `compact-card`, `categories` (variantes et icônes dont `biohazard`), cartes `principal` / `secondaire`, `state-header`, `labelFrom` (`/typeDeCorps`, `/instinct`, `/typeInfecte`), `action-lines`, `inline-list` pour l'équipement, section « Meneur » repliable (comportement, traits, compétences, contagion, notes). **Handbook** : le renderer lit `etatPrincipal`, `etatActif`, `etatDeBase`, `etats[]` (et l'ancien `etatAlternatif`), une carte par état à profil résolu (base + delta), harnais `assert:adrenaline-theme` qui analyse l'exemple Zy-2. |
| **À confirmer au rendu ou à trancher** | (a) Les six questions ouvertes de l'issue (carte principale, source des cercles Malus, retrait d'Art martial et de Bave, icône biohazard, trois niveaux de défense, où imprimer `comportement[]` / `traitsSpeciaux` / `contagion`) : la plupart ont une réponse visible dans le schéma, à confirmer avec l'utilisateur plutôt qu'à supposer ; (b) valeurs de l'exemple contre les règles (Corps faible : DEX 30 %, 2 m, détection 3 m) : l'exemple suit les règles, la maquette non, à acter ; (c) aucun exemple du pack ne garde `etatAlternatif` (relevé du 2026-10-09 : `infecte-rodeur.toml` utilise `etats[]`) ; le codec de `documents.ts` et le renderer conservent la lecture de l'ancienne forme, à garder ; (d) case d'état actif, filet des déclencheurs et pastille : les jetons `--adrenaline-trigger-bg` / `--adrenaline-trigger-ink` existent déjà (la maquette cyan y est devenue un fond clair à encre sombre) ; relever seulement qu'ils sont lus au rendu, en clair et en sombre, et que `validate:pack` en vérifie la paire encre/fond ; (e) probable écart réel : `malusAvantHs` est imprimé en ligne de valeur (forme `compact-rows`, libellé « Malus avant HS »), alors que la maquette imprime des cercles vides puis HS ; `etatsPermanents` (« Insensible ») s'imprime en `inline-list` dans Santé : vérifier la présence sur les deux cartes ; (f) badges jaune/rouge et propriétés sur ligne séparée dans `action-lines` ; (g) carte secondaire : « Comportement et santé » fusionnés, équipement en ligne, pas de section Agir (`agir` n'est déclarée que pour `principal`) ; (h) preuves automatiques : le harnais `assertAdrenalineTheme` affirme déjà pour Zy-2 les deux cartes, la carte principale = `etatPrincipal`, les déclencheurs, le titre « Corps (Corps faible) », les actions par round, la défense, les badges de dés et le lien « ou », les deux suites et l'équipement sur la carte secondaire ; **il n'affirme ni « Insensible », ni les propriétés des dégâts, ni la piste Malus** : ces trois rôles sont les preuves à ajouter si l'audit les retient ; `assert:adrenaline-zombiology-style` couvre le style commun aux fiches ; (i) issue sœur Handbook demandée par l'issue : l'issue ouverte #64 (« reprendre et valider les fiches Zombiology depuis le contrat publié ») la porte déjà ; la rattacher à #42 plutôt qu'en ouvrir une, sauf si un écart Handbook retenu sort de son périmètre. |
| **Hors périmètre** | Fiches PJ et PNJ (#41), police de la maquette si l'utilisateur garde celle du pack, refonte de `check` (issue à part). |
| **Mode** | Un train du superviseur (`doc/supervisor.fr.md`) conduit par `ship-train` si l'audit trouve un écart de contrat ou de style : `schema-adrenaline` → `obsidian-handbook` (+ `lantern` en épingle seule). Un écart purement Handbook donne un train Handbook seul. **Pas de train si l'audit est propre** : on ferme #42 avec le tableau d'audit. |
| **Versions** | Désignées par rôle : **v\<N>** est le contrat Adrenaline publié au départ, **v\<N+1>** celui du train. Aucun numéro ni SHA en dur. |

## Phases

| # | Phase | File |
| - | ----- | ---- |
| 1 | Audit : rendu de l'exemple contre `preview.html`, réponse à chaque question ouverte | [`phase-1.md`](./phase-1.md) |
| 2 | Corrections retenues : schéma, présentation, jetons (schema-adrenaline) puis Handbook | [`phase-2.md`](./phase-2.md) |
| 3 | Train, rendu validé, livraison et fermeture de #42 | [`phase-3.md`](./phase-3.md) |

## Decisions

| Decision | Why |
| -------- | --- |
| Auditer avant de coder | Le tableau de l'issue décrit un schéma 3.0.0 ; presque chaque ligne est déjà dans le contrat publié (voir « Déjà livré »). |
| Les questions ouvertes sont posées à l'utilisateur, une fois, avec la capture du rendu | Cercles Malus dérivés ou saisis, retrait des actions et placement des notes sont des décisions de règles du jeu ou de design, que le code ne tranche pas. |
| Valeurs et jetons dans le pack, sélecteurs dans Handbook | Règle inter-dépôts de `CLAUDE.md` : aucun repli sémantique local. |
| Partager avec #41 ce qui est commun | Le type de dégâts, les jetons de badge et les formes `compact-rows` / `inline-list` sont communs : un écart se règle une fois, dans l'un ou l'autre plan, pas deux. |
| Pas de train vide | `present` refuse un train sans nouveau contenu. |
