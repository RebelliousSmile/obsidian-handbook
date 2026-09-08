---
objective: "Une règle écrite dit ce qu'un bloc et un pack doivent au schéma, un harnais la fait respecter, les six blocs s'y conforment, et la forme comme la polarité deviennent des données plutôt que du SCSS."
status: in-progress
---

# Plan: Le schéma dépositaire du design

## Overview

| Field      | Value                                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| **Goal**   | Fermer l'écart mesuré entre les blocs et faire du schéma le dépositaire de la forme, pas seulement des valeurs     |
| **Source** | [`brainstorm.md`](./brainstorm.md) — idée affinée approuvée le 2026-09-08                                          |

## Phases

| #   | Phase                             | File                         |
| --- | --------------------------------- | ---------------------------- |
| 1   | La règle écrite et ses issues     | [`phase-1.md`](./phase-1.md) |
| 2   | Le corpus et son harnais          | [`phase-2.md`](./phase-2.md) |
| 3   | Parité schéma sur les six blocs   | [`phase-3.md`](./phase-3.md) |
| 4   | Vocabulaire de zones nommées      | [`phase-4.md`](./phase-4.md) |
| 5   | Surcharge de forme par le pack    | [`phase-5.md`](./phase-5.md) |
| 6   | Polarités déclarées et skin       | [`phase-6.md`](./phase-6.md) |

## Resources

| Source                                                    | Verified                                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `schema-in-the-mist` — `appearance/game-pack.schema.json` | Propriétés `id`, `label`, `style`, `assets` ; ne décrit aucune forme, seulement des valeurs |
| `schema-adrenaline` — `tools/audit-schemas.ts`            | Cinq contrôles bloquants par schéma, puis refus (28) et témoins (8)                    |
| `schema-pbta` — `game-definition.schema.json`             | Décrit la mécanique, pas l'apparence : collision de nom seulement avec `game-pack`     |

## Decisions

| Decision                                                            | Why                                                                                                                                       |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Le plan n'écrit que dans `handbook`                                 | Toute intervention sur `schema-in-the-mist`, `schema-adrenaline`, `schema-pbta`, `lantern` et le futur dépôt d'apparence passe par une issue à ouvrir, jamais par une édition |
| L'usage précède la publication du schéma                            | `fromSchema.ts` ignore un champ inconnu avec un avertissement unique : zones et polarités se lisent avant d'être décrites, donc aucune phase n'attend un dépôt tiers |
| La règle est vérifiée par le harnais, pas seulement écrite           | Une guideline que rien ne contrôle reproduit d'un cran plus haut la défaillance qu'elle corrige : le harnais affirme que chaque bloc a lecture TOML et commande de copie |
| La forme est un vocabulaire de zones nommées, pas du CSS sérialisé    | Un consommateur qui n'est pas Handbook doit pouvoir dessiner ; sérialiser du CSS rendrait le schéma dépendant d'un moteur de rendu           |
| Forme par défaut sur le bloc, surcharge zone par zone par le pack     | Reprend le motif éprouvé d'`overrides.json` : retirer la surcharge redonne exactement le rendu d'origine                                     |
| Un pack déclare ses polarités, il n'en dérive aucune                 | La variante manquante ne peut pas dégrader vers `base` sans casser un coffre en thème sombre dont le `base` est fortement clair              |
| Zéro exemption de bloc                                              | La dispense accordée aux formats sans amont est exactement ce qui a produit l'écart que l'assert a mesuré                                    |
| Le schéma d'apparence quitte `schema-in-the-mist`                    | Il ne partage aucun champ avec les schémas de contenu et sert désormais des jeux qui ne sont pas de Son of Oak                               |
| `BrumesBlock.mode` reste mono-jeu, hors scope assumé                 | `isBlockEnabled` exige `settings.mode === block.mode` : partager un bloc entre gammes demande un refactor que ce plan ne porte pas, mais qu'Adrenaline et PbtA rendront nécessaire |
