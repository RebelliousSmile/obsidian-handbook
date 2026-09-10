---
objective: "Handbook installe, met à jour manuellement et distribue des packs de jeu déclaratifs depuis des dépôts de schémas, avec des starter kits autonomes."
status: blocked
---

# Plan: Dépôts de schémas et starter kits Handbook

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Remplacer la copie manuelle de packs et le catalogue de jeux intégré par des dépôts de schémas versionnés, multi-packs et installés de façon transactionnelle. |
| **Source** | Brainstorm validé dans cette conversation le 10 septembre 2026. |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Contrat de dépôt et catalogue | [phase-1.md](./phase-1.md) |
| 2 | Installation et mise à jour transactionnelles | [phase-2.md](./phase-2.md) |
| 3 | Réglages et cycle de vie des sources | [phase-3.md](./phase-3.md) |
| 4 | Jeux externalisés et bootstrap de starter kit | [phase-4.md](./phase-4.md) |
| 5 | Variantes GitHub, documentation et preuve | [phase-5.md](./phase-5.md) |

## Resources

| Source | Verified |
| --- | --- |
| https://docs.obsidian.md/Reference/TypeScript%20API/requestUrl | `requestUrl` permet les requêtes HTTP(S) sans restriction CORS, donc convient aux dépôts publics sur desktop et mobile. |
| https://docs.obsidian.md/oo/plugin | Les plugins mobiles doivent employer `requestUrl`, `Vault.configDir` et l’API adapter pour les données cachées du coffre. |
| https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows | Une action peut construire des assets lors de la publication d’une release, mais elle s’exécute uniquement sur GitHub. |
| https://docs.github.com/en/rest/releases/assets | Une release peut porter plusieurs archives nommées et téléchargeables, ce qui rend possible une archive par starter kit. |

## Decisions

| Decision | Why |
| --- | --- |
| Le contrat racine est `handbook.json`, versionné et explicite ; il liste les packs au lieu de demander à Handbook de déduire l’arborescence. | Un même dépôt peut distribuer plusieurs packs de façon déterministe, et une version future du contrat peut être refusée clairement. |
| Une source publique GitHub suit `latest release`, un tag immuable ou une branche ; les contrôles réseau ne partent que d’une action explicite de l’utilisateur. | Cela reprend le choix de référence de BRAT sans surprise au démarrage ni couplage à sa configuration privée. |
| Une installation remplace atomiquement le répertoire entièrement géré de la source ; les overrides personnels restent à part. | Les assets de design doivent suivre leur version de schéma sans fusion ambiguë ni conservation de fichiers supprimés. |
| Handbook ne télécharge ni n’exécute JavaScript, TypeScript ou CSS de dépôt. | Les dépôts ne transportent que des manifestes, documents de pack, images et polices vérifiés par Handbook. |
| Le client GitHub matérialise les fichiers déclarés via l’arbre et les contenus bruts de GitHub, avec des limites de taille et de nombre de fichiers ; il ne décompresse pas une archive distante dans Obsidian. | Le chemin reste compatible mobile sans bibliothèque ZIP, et une source malveillante ne peut pas épuiser le stockage ou contourner la validation de chemins. |
| Les starter kits sont des instantanés de sources livrés dans des archives GitHub distinctes, puis importés une seule fois dans le stockage durable. | Un utilisateur voit un résultat dès l’installation tout en gardant le dépôt de schéma comme source de vérité et de mise à jour. |
| Une source installe tous les packs de son catalogue dans la première version ; les variantes visuelles de pack restent des données du manifeste de pack. | Cela rend l’installation multi-pack déterministe sans ajouter une sélection qui cacherait des capacités nécessaires. |
| Les sources privées et jetons GitHub sont différés. | Ils demandent une gestion des secrets qui n’est pas nécessaire pour démontrer la distribution publique multi-pack. |
