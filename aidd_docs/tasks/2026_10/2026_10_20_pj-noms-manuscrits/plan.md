---
objective: "Sur la fiche PJ Adrenaline (mode values-handwritten), le nom des compétences et le nom de formation saisis par le joueur s'écrivent en manuscrit, dans Handbook comme dans Lantern ; le tableau des armes sociales reste imprimé."
status: pending
---

# Plan: Noms de compétences et de formation en manuscrit (#118)

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Toute saisie du joueur dans les blocs Formation et Compétences passe en manuscrit ; ce qui est fixe reste imprimé : type de formation, parenthèses, seuils, armes sociales. |
| **Source** | Ticket RebelliousSmile/obsidian-handbook#118, avec sa décision du 2026-10-20 (commentaire), complétée le même jour : le nom de formation passe aussi en manuscrit. |

## Phases

| #   | Phase                                     | File                         |
| --- | ----------------------------------------- | ---------------------------- |
| 1   | Handbook : noms saisis en `__value`       | [`phase-1.md`](./phase-1.md) |
| 2   | Lantern : retrait de l'exception imprimée | [`phase-2.md`](./phase-2.md) |
| 3   | Train : rendu puis livraison              | [`phase-3.md`](./phase-3.md) |

## Resources

| Source | Verified |
| ------ | -------- |
| `C:\Users\fxgui\Documents\Perso\RPG\zombiology\_sources\aides-de-jeu\Z1A01_Feuille de PJ pretires.pdf` (feuille PJ à jour) | Référence de rendu : la colonne « Compétences » et le nom de formation sont des lignes à remplir, le tableau des armes sociales est préimprimé. À ouvrir avant le verdict de rendu. `_sources/Design/pj.jpg` est périmée. |
| `schema-adrenaline` `dist/presentation.d.ts`, type `AdrenalinePresentationAppearance` | La surface `paper-sheet` publie `values: { font: "handwritten" }` pour les valeurs saisies. Un nom saisi est une valeur : aucun changement de schéma. |
| Lantern `src/templates/adrenaline/shared/preview/presentationSheet.css:228-235` | Lantern pose déjà les noms en `<Value>` (`PresentationBlocks.tsx` ~l. 320 et ~356), mais une règle les remet exprès en police imprimée pour s'aligner sur Handbook. Il suffit de la retirer. |
| Handbook `src/features/adrenalinePj/renderer.ts:100,131,153-168` | `metric()` sert aussi aux libellés fixes (seuils, en-tête de formation) : le changement reste propre aux compétences et au nom de formation, sans toucher `metric()` en général. |

## Decisions

| Decision | Why |
| -------- | --- |
| Le nom de compétence s'écrit en entier en manuscrit (nom et spécialité). Dans la ligne de formation, seul le nom entre parenthèses est manuscrit ; le type et les parenthèses restent imprimés. | Tout ce que le joueur saisit est manuscrit, ce qui est imprimé sur la feuille reste imprimé (décision de l'utilisateur du 2026-10-20). |
| Le tableau des armes sociales reste en police imprimée, rature comprise. | Aide de jeu préimprimée (décision de l'utilisateur du 2026-10-20, consignée sur #118). |
| Pas de train de schéma : seuls Handbook et Lantern changent. | Le contrat publie déjà la police manuscrite des valeurs ; c'est une affaire de classes chez les consommateurs. |
| Le train part après la clôture de `static-pack-fonts` (#116). | Un seul train à la fois sur Handbook et Lantern. |
