---
objective: "La fiche PJ Zombiology se rend fidèlement à pj.jpg dans Handbook et dans Lantern, à partir d'un schema-adrenaline publié, sans colonnes imposées aux notes, et les traces intermédiaires sont supprimées après validation."
status: in-progress
---

# Plan: Fiche PJ Zombiology fidèle à sa maquette, via le superviseur

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Récupérer le design HTML validé, compléter les jetons de `schema-adrenaline` (la sémantique v2.6.0 suffit), le rendre dans Handbook et Lantern, publier par le superviseur, puis nettoyer. |
| **Source** | [`brainstorm.md`](./brainstorm.md), cadrage du 2026-09-29. Maquette qui fait foi : `C:/Users/fxgui/Documents/Perso/RPG/zombiology/_sources/Design/pj.jpg` |

## Phases

| #   | Phase | File |
| --- | ----- | ---- |
| 1   | Récupérer la maquette HTML, inventorier les écarts, ouvrir le train | [`phase-1.md`](./phase-1.md) |
| 2   | Compléter les jetons de `schema-adrenaline`, fusionnés sans publication | [`phase-2.md`](./phase-2.md) |
| 3   | Handbook : rendre la fiche PJ depuis la présentation v2.6.0, une colonne par défaut | [`phase-3.md`](./phase-3.md) |
| 4   | Lantern : rendre la fiche PJ depuis la présentation v2.6.0 | [`phase-4.md`](./phase-4.md) |
| 5   | Présenter, obtenir le feu vert, publier le candidat puis le final, converger | [`phase-5.md`](./phase-5.md) |
| 6   | Supprimer les traces intermédiaires après validation | [`phase-6.md`](./phase-6.md) |

## Decisions

| Decision | Why |
| -------- | --- |
| Le schéma publie la **sémantique et les jetons** (formes, disposition, `appearance`, couleurs, polices, assets) ; chaque consommateur possède le **rendu de chaque forme** (SCSS dans Handbook, composants et CSS dans Lantern). Aucun CSS n'est publié par le pack. | Handbook n'exécute aucun CSS externe (`CLAUDE.md`, packs déclaratifs) ; `src/presentation.ts` exclut déjà les classes CSS par construction ; la règle inter-dépôts garde les adaptateurs d'exécution chez les consommateurs. Le HTML ne peut donc pas être « copié dans le schéma ». |
| `preview.html` est **restauré et commité** dans `schema-adrenaline` comme référence de conception, à son chemin d'origine `aidd_docs/tasks/2026_09/2026_09_24_contrat-presentation-fiches/preview.html`. | Il n'existe aujourd'hui que dans des stashs non commités (`stash@{0..2}^3`). Le commiter est la condition pour supprimer les stashs en phase 6 sans perdre la référence. |
| Le rendu Handbook et Lantern est piloté par `form`, `layout` et `appearance` publiés, et non plus par un `switch(block.id)` ou des libellés codés en dur. | Aujourd'hui Handbook ignore `appearance`/`form`, et Lantern ignore totalement `PJ_PRESENTATION` : c'est la cause réelle de l'écart de design, pas une mauvaise version épinglée (v2.6.0 est bien le dernier tag, adopté partout). Sans cette bascule, PNJ et monstre recommenceraient la même dérive. |
| Couleurs du HTML non couvertes par le pack : ajoutées comme **jetons du pack** (couches `light` et `dark`) quand aucun jeton existant ne convient (voir la réutilisation plus bas), jamais en hexadécimal dans le SCSS. | `assertAdrenalineZombiologyStyle` interdit l'hexadécimal dans le SCSS ; un pack ou une variante déclare ses polarités, il n'en dérive aucune. |
| En cas de désaccord entre `preview.html` et `pj.jpg`, **`pj.jpg` l'emporte**. Cas connu : encre manuscrite sarcelle `#2d6c78` dans le HTML contre bleu `#285C94` dans le pack ; la maquette est en bleu, on garde donc le bleu du pack. | La maquette fait foi (cadrage) ; le HTML n'est qu'un intermédiaire. |
| Une seule colonne par défaut en mode Adrenaline ; le multi-colonnes passe uniquement par les régions `<!-- handbook-layout: columns=N -->` … `<!-- /handbook-layout -->`. | Décision du cadrage. La règle vit dans Handbook (`src/styles/adrenaline/_page.scss:148-180`), pas dans le pack. L'échappatoire `adrenaline-one-column` ne fonctionnait de toute façon pas (elle cible `.markdown-reading-view`, alors qu'Obsidian pose les cssclasses sur `.markdown-preview-view`). |
| Le superviseur pilote l'état du train (`open`/`link`/`next`/`present`/`approve`/`publish`/`converge`/`close`). Les corrections, elles, sont faites par des agents lancés depuis la session, dépôt par dépôt. `present` et `converge` réels tournent **sous WSL**. | Le CLI ne lance aucun agent (le skill `handbook-supervise` n'existe pas). Le garde de publication n'intercepte rien sous Windows natif. |
| **L'ordre suit le superviseur** : corrections fusionnées sur `main` → `present` → `approve` → candidat publié → adoption du candidat par Handbook et Lantern → final → `converge`. Aucune release ni dispatch avant l'accord. | `doc/supervisor.fr.md` : « jamais avant accord : toute release, tout dispatch de workflow » ; après l'accord, un dépôt ne reçoit que des commits limités à ses `trainFiles`. Le code de rendu doit donc être fusionné **avant** `present`, contre l'épingle v2.6.0. |
| **Aucun nouveau type dans `presentation.ts` pendant ce train.** La v2.6.0 publie déjà les seize formes du PJ ; l'écart est dans le rendu des consommateurs et dans les jetons. Si l'inventaire révèle un type manquant, on s'arrête et on demande. | Le code consommateur fusionné avant la release compile contre les types v2.6.0 : une forme nouvelle le casserait. Les jetons, eux, sont lus à l'exécution (CSS) et par les harnais depuis `../schema-adrenaline`, sans dépendre de l'épingle. |
| Aperçu avant release : Handbook lit le pack depuis la source installée du coffre (qui suit `main` de `schema-adrenaline`) ; Lantern passe par un lien local **non commité** vers le checkout du schéma, retiré avant tout commit. | C'est le seul moyen de montrer un rendu fidèle à `present` sans publier. `present` exige des checkouts propres : le lien ne doit rien laisser. |
| Un jeton existant est réutilisé quand l'écart de couleur ne se voit pas (ex. `#a72b20` du HTML contre `--adrenaline-rule` `#9D2416`). | La fidélité à l'œil suffit (cadrage) ; moins de jetons, moins de surface de contrat. |
| Chaque commit, merge ou push est fait à la demande de l'utilisateur, jamais d'office. | `CLAUDE.md` : ne pas commiter ni pousser sans demande explicite. |
| L'exécution sous WSL de `present` (validations `pnpm check`, `npm run check`, `npm.cmd`) est testée à blanc dès la phase 1. | Les `node_modules` installés sous Windows embarquent des binaires win32 (esbuild) ; un échec découvert en phase 5 bloquerait la publication. |
