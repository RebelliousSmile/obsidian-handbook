---
objective: "Adrenaline n'apparaît dans Handbook que lorsque le répertoire `handbook/adrenaline` publié par `schema-adrenaline` est copié dans le dossier `packs` du plugin."
status: in-progress
---

<!-- Fill or omit these sections; never add, rename, or reorder one. -->

# Plan: Plugin de jeu Adrenaline optionnel

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Faire d'Adrenaline un plugin de jeu déclaratif pour Handbook, installable par copie d'un répertoire, sans créer un second dépôt par jeu. |
| **Source** | Brainstorm utilisateur du 2026-09-10 : `schema-adrenaline` est le dépôt partagé réservé à Handbook et Lantern ; l'installation Handbook consiste uniquement à copier le répertoire Adrenaline à l'endroit prévu. |

## Phases

| #   | Phase | File |
| --- | ----- | ---- |
| 1   | Plugins de jeu installables par répertoire | [`phase-1.md`](./phase-1.md) |
| 2   | Source Adrenaline déplacée dans `schema-adrenaline` | [`phase-2.md`](./phase-2.md) |
| 3   | Optionalité complète dans Handbook et documentation | [`phase-3.md`](./phase-3.md) |

## Decisions

| Decision | Why |
| -------- | --- |
| Le paquet distribuable vit dans `schema-adrenaline/handbook/adrenaline/`, sans dépôt d'intégration séparé. | Handbook et Lantern sont les deux seuls consommateurs prévus ; séparer le pack multiplierait artificiellement versions, releases et tickets. |
| L'installation cible est `<dossier du plugin>/packs/<id>/pack.json` ; le format historique `packs/*.json` reste lisible. | Un répertoire autonome peut transporter ses assets et se copier d'un bloc, tandis que les packs personnels existants ne cassent pas. |
| Le répertoire installé ne contient que `pack.json` et des assets ; aucun TypeScript, JavaScript ou CSS externe n'est exécuté. | La frontière de confiance actuelle reste déclarative. Handbook conserve les gabarits, parseurs, renderers et styles structurels. |
| L'abstraction est nommée « plugin de jeu Handbook » ; le `pack.json` d'un répertoire enveloppe le `GamePack` avec une version de plugin, une version minimale de Handbook et les capacités internes requises. | Le mécanisme possède découverte, identité, compatibilité, activation et ressources propres : un `GamePack` nu ne peut pas empêcher l'activation d'un jeu que la version installée de Handbook ne sait pas rendre. |
| Les parseurs PJ, PNJ et monstre ainsi que le SCSS Adrenaline restent compilés dans Handbook mais sont inactifs sans pack enregistré. | Une extraction exécutable demanderait un second plugin et un protocole d'extension bien plus large ; ce n'est pas nécessaire pour rendre le jeu optionnel dans l'interface et le rendu. |
| Les assets d'un plugin se résolvent depuis un chemin relatif à son propre répertoire, `assets/` par défaut, au moyen d'une provenance d'installation interne distincte du document `GamePack`. | Le répertoire reste portable et confiné sans ajouter un chemin propre à Obsidian dans le contrat partagé du jeu. |
| Une installation incompatible est refusée entièrement avec un diagnostic actionnable ; elle n'entre jamais partiellement dans le registre. | Un plugin visible mais privé d'un renderer, d'un style structurel ou d'une version d'hôte suffisante donnerait une fausse réussite d'installation. |
| Ce plan ne modifie pas Lantern ; il réserve seulement sa place comme second consommateur du même dépôt. | Aucun besoin Lantern plus précis n'a été formulé et son application ne consomme pas encore Adrenaline. |
