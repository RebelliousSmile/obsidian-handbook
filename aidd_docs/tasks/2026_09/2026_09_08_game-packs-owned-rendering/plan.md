---
objective: "Le plugin possède son socle visuel et un jeu devient une donnée : changer de jeu réécrit un seul élément de style, sans Style Settings ni résidu."
status: implemented
---

# Plan: Packs de jeu — le plugin reprend la propriété de son rendu

## Overview

| Field      | Value                   |
| ---------- | ----------------------- |
| **Goal**   | Sortir l'apparence d'un jeu du canal Style Settings/Border pour en faire une donnée que le plugin écrit lui-même, scopée par mode, clair et sombre, extensible à N jeux sans résidu croisé. |
| **Source** | Brief de cadrage produit en conversation le 2026-09-08 (brainstorm), plus les mesures faites sur le dépôt : `themes/*.settings.json` (125 clés), `dist/styles.css` (6,21 Mo, dont 3,50 Mo de polices et 2,48 Mo d'illustrations), `theme/CoM_dark.json` au commit `4f2258e`. |

## Phases

| #   | Phase        | File                         |
| --- | ------------ | ---------------------------- |
| 1   | Socle autonome : le plugin écrit ses variables | [`phase-1.md`](./phase-1.md) |
| 2   | Le jeu devient une donnée : format de pack et registre | [`phase-2.md`](./phase-2.md) |
| 3   | :Otherscape, premier jeu né comme pack | [`phase-3.md`](./phase-3.md) |
| 4   | Assets dans le coffre et gabarits paramétrés | [`phase-4.md`](./phase-4.md) |
| 5   | Schéma graphique frère dans schema-in-the-mist | [`phase-5.md`](./phase-5.md) |

## Resources

| Source | Verified          |
| ------ | ----------------- |
| `themes/city-of-mist.settings.json` + `themes/legend-in-the-mist.settings.json` | 125 clés au total : 93 se ramènent à une variable CSS que le plugin peut écrire, 32 sont des bascules ou sélecteurs propres au thème Border. |
| Commit `4f2258e`, fichiers `theme/CoM_general.json`, `theme/CoM_light.json`, `theme/CoM_dark.json` | Le mode sombre de City of Mist existait en v1 (12 lignes, fond `#2a273f`, texte `#E0DEF4`) et a été perdu au commit `36d81a5`. Les valeurs sont récupérables. |
| `src/styles/city-of-mist/index.scss:32` et `src/styles/legend-in-the-mist/index.scss:31` | Le plugin définit déjà `--font-header-theme` scopé par mode, valeur que les presets dupliquent en `Editor@@h1-font`. Le mécanisme visé existe déjà, à moitié. |
| Relevé des `var(--…)` de `src/styles/` | Le SCSS ne consomme que des variables Obsidian de base et nos `--brumes-*`. Aucune variable propre à Border : rien ne retient techniquement le changement de canal. |

## Decisions

| Decision   | Why   |
| ---------- | ----- |
| Le plugin écrit les variables dans un unique élément `<style>` qu'il possède, au lieu de déléguer à Style Settings. | Un seul point d'écriture rend le nettoyage structurel au lieu d'être une fonctionnalité à maintenir par jeu. C'est la cause racine du résidu croisé actuel. |
| Les presets Style Settings et le thème Border cessent d'être des dépendances de fonctionnement. | Aucune variable Border n'est consommée par le SCSS, et 74 % des clés sont directement portables. Les 26 % restantes neutralisaient Border : elles perdent leur objet avec la dépendance. |
| `BrumesMode` passe d'une union fermée à un identifiant de pack. | Sans cela un jeu reste une branche codée en dur et l'objectif « N jeux » est hors d'atteinte. Rupture de compatibilité à absorber dans `normalizeMode`, les valeurs existantes vivant dans le `data.json` des utilisateurs. |
| Les illustrations vivent dans le coffre et le pack les référence par chemin. | `dist/styles.css` pèse 6,21 Mo pour deux jeux, dont 2,48 Mo pour `_theme-cards.scss` seul. Le modèle embarqué ne passe pas l'échelle, et faire porter à l'utilisateur l'habillage d'un jeu publié règle taille et redistribution du même geste. |
| Les polices libres restent embarquées, seules les illustrations sortent vers le coffre. | L'argument de redistribution vise l'habillage d'un jeu publié, pas des fontes sous licence libre. Elles pèsent 3,50 Mo des 6,21 Mo mesurés : le bundle vise donc ~3,7 Mo, pas moins. Chargement différé par jeu si le poids devient gênant à cinq jeux. |
| Le réglage fin par l'utilisateur passe par un pack de surcharge, pas par des curseurs. | Style Settings offrait des curseurs que le plugin ne réimplémente pas. Un pack personnel qui prend le dessus sur le pack du jeu rend le même service avec le mécanisme déjà construit, au lieu d'un second système de réglages à maintenir. |
| Les gabarits de blocs restent du code, paramétré par le pack. | Décrire les zones d'un bloc en donnée reviendrait à écrire un moteur de mise en page et à spécifier un langage. Hors budget, et l'extensibilité visée s'arrête aux formes déjà implémentées. |
| Un seul jeu actif à l'échelle du coffre. | La bascule par note ou par dossier imposerait de scoper les variables sur le conteneur de note plutôt que sur `body`, ce qui casse la peinture du workspace. Écarté sciemment. |
