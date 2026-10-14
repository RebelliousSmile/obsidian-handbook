---
objective: "Les restes de #101 qui se ferment dans Handbook sans toucher au contrat de schema-adrenaline sont soldés ou rendus reproductibles, et ceux qui attendent une décision de l'utilisateur sont listés avec leur propriétaire."
status: implemented
---

<!-- Fill or omit these sections; never add, rename, or reorder one. -->

# Plan: Restes d'Adrenaline (#101) fermables côté Handbook

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Solder, dans ce dépôt et sans changer le contrat publié, ce qui reste de #101 après la livraison de la fiche PJ : validations de la topologie, marge du plafond CSS, libellés recopiés, preuves de rendu manquantes, seuils vides, et rapprocher le corps de l'issue de l'état réel du code. |
| **Source** | RebelliousSmile/obsidian-handbook#101 (corps et commentaire de livraison de la fiche PJ) |

## Phases

| #   | Phase                                                       | File                         |
| --- | ----------------------------------------------------------- | ---------------------------- |
| 1   | Validations de la topologie : deux gardes de Lantern        | [`phase-1.md`](./phase-1.md) |
| 2   | Marge du plafond de `dist/styles.css`                       | [`phase-2.md`](./phase-2.md) |
| 3   | Libellés recopiés et preuves de rendu manquantes            | [`phase-3.md`](./phase-3.md) |
| 4   | Seuils PNJ et créature vides                                | [`phase-4.md`](./phase-4.md) |
| 5   | Rapprocher le corps de #101 de l'état livré                 | [`phase-5.md`](./phase-5.md) |

## Decisions

| Decision | Why |
| -------- | --- |
| Le plafond de `assert:mist-font-packs` ne bouge pas : la marge se gagne en réduisant le CSS. | La garde borne le poids de `dist/styles.css` par rôle ; la relever pour faire passer l'ajout suivant ôterait sa raison d'être. Relever un plafond est une décision de l'utilisateur, pas un geste d'exécution. |
| Les cinq décisions de contrat restent hors plan : libellé du choc (« rounds » / « ROUND »), étiquettes « Première/Seconde colonne », libellé « malus », anciens `.toml` portant `armesMentales`, et la garde de version « majeur installé ≥ majeur déclaré ». | Le contrat vit dans `schema-adrenaline` : le schéma s'étend et se publie avant tout travail consommateur, sans repli sémantique local. La garde de version est déjà livrée et attend le jugement de l'utilisateur ; la changer ici serait trancher à sa place. |
| Ce plan ne touche ni Lantern, ni `schema-adrenaline`, ni le coffre Zombiology. | Ces restes (mineurs Lantern, captures de `docs/images/`, passage sur les blocs du coffre) appartiennent à d'autres dépôts ou à des gestes au cas par cas ; ils sont rappelés en phase 5 pour que l'issue reste complète. |
| La phase 4 reproduit d'abord, corrige ensuite : un seuil « en triplets vides » n'est corrigé que si le témoin rougit. | L'issue nomme le symptôme sans entrée qui le provoque ; corriger sans reproduire ajouterait une règle locale sans preuve. |
