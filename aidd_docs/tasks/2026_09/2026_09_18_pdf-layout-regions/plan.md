---
objective: "L’export PDF d’une note conserve ses régions `handbook-layout` : mêmes colonnes et mêmes rangées qu’en lecture, repli étroit seulement si la largeur imprimable l’exige."
status: implemented
---

# Plan: Régions de colonnes dans l’export PDF

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Faire produire `.handbook-layout-region` par le DOM d’impression d’Obsidian, qui n’expose ni marqueurs, ni `getSectionInfo`, ni `.markdown-preview-section`. |
| **Source** | Issue GitHub [#33](https://github.com/RebelliousSmile/obsidian-handbook/issues/33) (Obsidian 1.13.7, Handbook 2.15.3, livret Monsterhearts). |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Sonder le DOM d’impression réel | [`phase-1.md`](./phase-1.md) |
| 2 | Regrouper les sections du DOM d’impression | [`phase-2.md`](./phase-2.md) |
| 3 | Styliser, prouver et documenter l’export | [`phase-3.md`](./phase-3.md) |

## Resources

| Source | Verified |
| --- | --- |
| `obsidian-1.13.7.asar` (`printToPdf` / `print`, lu dans `%APPDATA%/obsidian/`) | L’export ouvre une fenêtre `about:blank` masquée et y rend `body > .print > .markdown-preview-view.markdown-rendered` ; chaque bloc de premier niveau y est enveloppé dans un `div` nu (les `hr` restent directs) ; seuls les enfants `Element` du fragment sont gardés, donc les commentaires HTML disparaissent ; `postProcess` reçoit `el = containerEl` = ce conteneur, `getSectionInfo` renvoie `null`. |
| Même fichier, clic du bouton d’export et processus principal | `printToPdf` reçoit `{ includeName, pageSize, landscape, marginsType, scaleFactor, scale, open, filepath }` ; le processus principal appelle `webContents.printToPDF` puis écrit `filepath` : un PDF réel se produit sans dialogue natif. |
| Même fichier, `postProcess` | Un post-processeur qui renvoie une promesse est attendu (`d.then && promises.push(d)` puis `Promise.all`) avant la génération du PDF. |
| https://docs.obsidian.md/Reference/TypeScript%20API/CachedMetadata | `sections[]` publie type et lignes de début/fin de chaque bloc : c’est la table source → bloc que `getSectionInfo` fournit en lecture. |

## Decisions

| Decision | Why |
| --- | --- |
| La correspondance se fait par rang : sections de `metadataCache` (commentaires exclus) ↔ enfants de premier niveau du DOM d’impression. | Le DOM d’impression n’a ni lignes source ni marqueurs ; le rang est la seule jointure sans rendre le Markdown une seconde fois. |
| Toute correspondance non vérifiée laisse le DOM intact et journalise une fois par session. | Même contrat non destructif que la lecture : un export sans colonnes vaut mieux qu’un export dont des sections manquent. |
| Le regroupement réutilise `wrapBlocksInRegion` et `.handbook-layout-region` ; aucun second chemin de rendu. | Une seule définition de colonne, de grille et de repli ; l’export ne peut pas diverger de la lecture. |
| Le regroupement s’appuie sur le DOM d’impression d’Obsidian, non documenté ; la version mesurée est consignée et le parcours e2e sur PDF réel sert de garde-fou. | Une mise à jour d’Obsidian peut changer ce DOM sans préavis ; la garde dégrade sans mutation et le e2e signale la dérive au lieu de la laisser passer en silence. |
