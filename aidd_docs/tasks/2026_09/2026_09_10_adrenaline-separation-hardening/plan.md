---
objective: "Adrenaline est un package déclaratif durable et compatible, dont les présentations claire et sombre reprennent le langage éditorial du livret Police sans laisser de données utilisateur ni de palette de jeu dans le code remplaçable de Handbook."
status: in-progress
---

<!-- Fill or omit these sections; never add, rename, or reorder one. -->

# Plan: Durcir la séparation Adrenaline et réaliser ses deux présentations

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Corriger les six constats d'architecture et construire les présentations Adrenaline light/dark décrites par la critique visuelle. |
| **Source** | [`../2026_09_10_audit/architecture.md`](../2026_09_10_audit/architecture.md) et [`../../../../design/critique/2026_09_10-z1l04-livret-police.md`](../../../../design/critique/2026_09_10-z1l04-livret-police.md) |

## Phases

| #   | Phase | File |
| --- | ----- | ---- |
| 1 | Stockage durable et migration non destructive | [`phase-1.md`](./phase-1.md) |
| 2 | Capacités garanties par identifiant de jeu | [`phase-2.md`](./phase-2.md) |
| 3 | Contrat visuel et assets dans `schema-adrenaline` | [`phase-3.md`](./phase-3.md) |
| 4 | Compositions light/dark et callouts dans Handbook | [`phase-4.md`](./phase-4.md) |
| 5 | Compatibilité croisée, documentation et recette visuelle | [`phase-5.md`](./phase-5.md) |

## Decisions

| Decision | Why |
| -------- | --- |
| Les données utilisateur vivent sous `<vault>/<configDir>/handbook/`, jamais sous le répertoire installé du plugin. | `Vault.configDir` respecte les coffres dont le dossier de configuration n'est pas `.obsidian`, et cette racine survit aux remplacements BRAT. |
| Le passage initial exige une copie pré-update documentée ; la migration au démarrage ne constitue qu'un filet de sécurité lorsque l'ancien dossier existe encore. | BRAT peut supprimer le dossier legacy avant que le nouveau code s'exécute : promettre une récupération post-update serait faux. Une destination stable déjà alimentée est la seule garantie. |
| Une capacité est fournie pour un identifiant de jeu précis, pas seulement présente dans un catalogue global. | Les renderers et le SCSS sont activés par `block.mode` et `.brumes--<id>` ; un pack d'un autre id ne peut pas réellement les utiliser. |
| `schema-adrenaline` conserve valeurs, fontes, textures et motifs ; Handbook conserve comportement, sélecteurs et géométrie. | Le package reste déclaratif, commun à Handbook et Lantern, sans exécuter du CSS ou du code externe. |
| Les textures sont des créations originales légères, jamais des pages ou fragments extraits du PDF. | Le résultat reprend un langage visuel sans redistribuer le contenu éditorial de l'ouvrage ni alourdir la lecture. |
| La composition à deux colonnes concerne la lecture large de Markdown standard ; l'édition reste en une colonne et les titres/callouts pilotent le rythme sans nouveau balisage. | Le DOM Obsidian existant fournit ces primitives, alors que des régions abstraites sans convention d'auteur ne seraient pas implémentables. |
| Le mode est global : « page » désigne toutes les vues Markdown ouvertes, tandis que « workspace » désigne le chrome activable séparément. | Le comportement courant est cohérent entre fenêtres et blocs ; cibler uniquement l'onglet actif exigerait un état par feuille qui ne figure pas dans les rapports. |
| Handbook 2.7.0 est la première version hôte du nouveau contrat visuel Adrenaline 0.2.0. | Les nouveaux tokens ont des fallbacks, mais annoncer la paire compatible évite qu'un ancien Handbook charge un package qu'il ne sait pas composer fidèlement. |
