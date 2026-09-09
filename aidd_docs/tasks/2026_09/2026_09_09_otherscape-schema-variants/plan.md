---
objective: "Handbook rend les six schémas :Otherscape en TOML et applique à tout le coffre une identité Metro, Cairo ou Tokyo fidèle à ses sources."
status: in-progress
---

# Plan: :Otherscape — six schémas et trois univers visuels

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Ajouter les six blocs :Otherscape publiés, un sélecteur global Metro/Cairo/Tokyo et des rendus sombres ou clairs uniquement lorsqu'ils sont attestés par les maquettes. |
| **Source** | Brief validé dans la conversation du 2026-09-09 ; schémas et exemples du dépôt frère `schema-in-the-mist` ; PDF Metro, Cairo et Tokyo sous `/home/tnn/Documents/Perso/RPG/otherscape/_sources/Design/`. |

## Phases

| # | Phase | File |
| - | ----- | ---- |
| 1 | Sources visuelles et contrat générique de variante | [`phase-1.md`](./phase-1.md) |
| 2 | Socle TOML partagé des formats :Otherscape | [`phase-2.md`](./phase-2.md) |
| 3 | Theme et Theme Kit | [`phase-3.md`](./phase-3.md) |
| 4 | Challenge et Power Set | [`phase-4.md`](./phase-4.md) |
| 5 | Character Trope et Loadout Item | [`phase-5.md`](./phase-5.md) |
| 6 | Cohérence visuelle, validation croisée et livraison | [`phase-6.md`](./phase-6.md) |

## Resources

| Source | Verified |
| ------ | -------- |
| [Mist HUD :Otherscape stylesheet](https://github.com/mordachai/mist-hud/blob/main/styles/mh-otherscape.css) | Le dépôt fournit une anatomie de HUD Metro exploitable : types Self/Mythos/Noise/Crew, tags brûlés et pistes à trois cases ; il ne contient pas de variante Cairo ou Tokyo. |
| [Mist HUD license](https://github.com/mordachai/mist-hud/blob/main/LICENSE) | Le code est sous MIT ; Handbook garde l'attribution et ne redistribue pas les images de pages ou les assets du HUD. |
| [RebelliousSmile/schema-in-the-mist v0.4.0](https://github.com/RebelliousSmile/schema-in-the-mist/releases/tag/v0.4.0) | Le dépôt frère réellement utilisé, au commit `5ef5a4f`, publie les six cibles `challenge`, `power-set`, `theme-kit`, `theme`, `character-trope` et `loadout-item`, chacune avec source Zod, JSON Schema et exemples JSON/TOML. Il ne publie pas de schéma d'apparence. |

## Decisions

| Decision | Why |
| -------- | --- |
| :Otherscape reste un seul jeu, avec une variante globale Metro, Cairo ou Tokyo mémorisée pour le coffre. | Les règles et les schémas sont communs ; dupliquer le jeu dupliquerait les blocs, les réglages et les migrations pour une différence d'apparence. |
| Les variantes deviennent une capacité générique de l'enregistrement interne d'un jeu, autour d'un `GamePack` laissé inchangé ; elles ne sont pas ajoutées à `schema-in-the-mist`. | `GamePack` reste exactement la forme sérialisable décrite par `fromSchema.ts`, sans cas spécial :Otherscape ni faux champ publié. |
| La priorité de rendu est `pack → variante → overrides utilisateur`. | L'univers doit modifier le jeu sans empêcher l'utilisateur de garder le dernier mot dans `overrides.json`. |
| Le TOML conforme à `schema-in-the-mist` est l'unique syntaxe des six nouveaux blocs. | La seule note existante est un banc de test : aucune compatibilité utilisateur ne justifie six grammaires parallèles. |
| Les interfaces locales et le corpus ciblent explicitement `schema-in-the-mist v0.4.0` (`5ef5a4f`). | Un schéma frère évolutif ne peut rester une source de vérité si la version réellement projetée n'est jamais nommée. |
| Les identifiants sont `os-theme`, `os-theme-kit`, `os-challenge`, `os-power-set`, `os-character-trope` et `os-loadout-item`. | Ils suivent exactement les noms des cibles publiées et évitent de créer un alias historique pour un format jamais livré. |
| Chaque univers reçoit un registre sombre ; un registre clair n'est livré que si l'audit du PDF le prouve pour les six familles de contenu. | La polarité décrit les livres, elle ne doit pas être dérivée pour satisfaire le thème Obsidian. |
| Mist HUD inspire le socle commun et Metro, mais aucun sélecteur Foundry ni asset graphique n'est copié. | Son CSS est utile comme vocabulaire d'interface ; ses interactions et chemins d'images ne correspondent ni au DOM ni au modèle de distribution de Handbook. |
| Le rendu utilise CSS, fontes redistribuables et motifs originaux ; aucune page ni décoration extraite des PDF n'est embarquée. | Cela garde le plugin léger, adaptable et conforme à la frontière actuelle entre jetons de pack et géométrie SCSS. |
| Les noms de champs TOML restent ceux des schémas anglais ; les nouveaux libellés visibles et messages de Handbook sont français d'abord. | Le document doit rester interopérable tandis que l'interface suit la convention linguistique du projet. |
