---
objective: "Les callouts alias ne sont plus figés par jeu : une liste extensible porte des entrées communes aux 4 jeux ou spécifiques à l'un d'eux, éditables via un constructeur limité en réglages, sans faire grossir la page de réglages au-delà de ce qui est réellement utilisé."
status: implemented
---

<!-- Fill or omit these sections; never add, rename, or reorder one. -->

# Plan: Callouts génériques et constructeur limité

## Overview

| Field      | Value                   |
| ---------- | ----------------------- |
| **Goal**   | Remplacer les deux blocs d'alias figés (`CityOfMistCalloutAliases`, `LegendInTheMistCalloutAliases`) par une liste unique de callouts, chacun scopé à un jeu ou à tous, avec un constructeur au vocabulaire fermé pour en créer de nouveaux et un raccourci clavier optionnel par entrée. |
| **Source** | Brainstorm validé dans la conversation du 2026-09-09 (`aidd-refine:01-brainstorm`), exploration et wireframe de `aidd-dev:01-plan` dans la même conversation. |

## Phases

| #   | Phase                                    | File                          |
| --- | ----------------------------------------- | ----------------------------- |
| 1   | Modèle de données et migration            | [`phase-1.md`](./phase-1.md)  |
| 2   | Écran de réglages — liste et constructeur | [`phase-2.md`](./phase-2.md)  |
| 3   | Rendu et alias au moment de l'édition     | [`phase-3.md`](./phase-3.md)  |
| 4   | Raccourcis clavier et couverture des 4 jeux | [`phase-4.md`](./phase-4.md) |

## Decisions

<!-- Architecture-magnitude only, one you'd regret reversing. Omit if none qualify. -->

| Decision | Why |
| -------- | --- |
| La couleur d'un callout créé par l'utilisateur est soit fixe (identité de « post-it », posée une fois à la création, jamais reconfigurable), soit liée au thème (suit clair/sombre automatiquement et n'est alors pas modifiable). Jamais un choix libre dans une palette de jetons du pack actif. | Un post-it réel a une couleur qui lui appartient ; un callout lié au thème doit rester cohérent avec la page sans dériver au choix de l'utilisateur. Une palette de jetons du pack aurait remis en cause cette distinction (corrigé explicitement pendant le brainstorm). |
| La police d'un callout créé par l'utilisateur est un choix fermé entre les deux rôles déjà déclarés par le pack actif : `--font-header-theme` (titre) et `--font-text-theme` (texte). Jamais de sélecteur de police libre, jamais de police nouvelle embarquée pour le constructeur. | Chaque pack de jeu déclare déjà exactement ces deux rôles (`src/games/city-of-mist.ts`, `src/games/legend-in-the-mist.ts`). Un choix libre romprait la cohérence typographique du jeu et ajouterait du poids à `dist/styles.css` (chaque police embarquée pèse de 18 Ko à 670 Ko). |
| Les 7 styles historiques (`clue`, `red-clue`, `move`, `description`, `note` City of Mist, `note` et `read-aloud` Legend in the Mist) deviennent des entrées **natives verrouillées** : nom, couleur, police et scope non éditables, migrées automatiquement depuis l'ancien `calloutAliases`. Seuls leurs alias restent modifiables, comme aujourd'hui. | Ces styles sont plus riches visuellement (arrière-plan de note, ruban, images de bordure) que ce que le vocabulaire fermé du constructeur peut produire. Les reconstruire via le constructeur générique les appauvrirait ; les migrer en verrouillé préserve le rendu existant à l'identique. |
| Le scope « commun à tous les jeux » couvre les 4 jeux déclarés (`city-of-mist`, `legend-in-the-mist`, `otherscape`, `adrenaline`), y compris les deux derniers qui n'ont aujourd'hui aucune couche de callout. | Décidé explicitement pendant le brainstorm : un callout commun doit fonctionner partout, pas seulement là où un système de callout existe déjà. |
| Le raccourci clavier d'une entrée s'enregistre comme une commande Obsidian dynamique (`Plugin.addCommand`/`removeCommand`, un id stable par entrée), jamais comme un capteur de touche interne à l'onglet Handbook. | L'API Obsidian ne permet pas à un plugin de capturer une combinaison de touches dans sa propre UI de réglages ; l'assignation reste dans le panneau natif Réglages → Raccourcis clavier, par nom de commande. Confirmé dans `node_modules/obsidian/obsidian.d.ts`. |
| `calloutAliases` disparaît entièrement de `BrumesSettings`, remplacé par une seule liste `callouts`. La migration lit l'ancienne forme une fois au chargement et ne la conserve pas en parallèle. | Le dépôt n'introduit pas de compatibilité ascendante superflue ; la clé `calloutAliases` n'est pas listée parmi les clés de `features.*` protégées de renommage par `CLAUDE.md`, rien n'impose de la garder. |
