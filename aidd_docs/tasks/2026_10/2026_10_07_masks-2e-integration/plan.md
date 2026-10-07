---
objective: "A Masks vault renders its playbook booklet, NPC card, headings, fonts and callouts like the Masks 2E quickstart, from a contract and an appearance published by schema-pbta."
status: pending
---

# Plan: Masks 2E — livret de PJ, carte de PNJ, polices, titres et callouts

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Étendre `masks-playbook`, créer `masks-npc`, publier polices, jetons, libellés et callouts du pack Masks, puis les rendre dans Handbook d'après les captures du quickstart |
| **Source** | Issue [#87](https://github.com/RebelliousSmile/obsidian-handbook/issues/87) ; captures `Perso/RPG/masks/_sources/Design` (`livret1`, `livret2`, `pnj`, `page1`, `page2`, `moves`, `tables`, `callouts`, `chapter`, `team`) |
| **Mode**   | Train du superviseur `masks-2e` : `schema-pbta` → `obsidian-handbook` + `lantern` (`doc/supervisor.fr.md`), ouvert **après** la livraison de #86 |

## Phases

| #   | Phase                                                    | File                         |
| --- | -------------------------------------------------------- | ---------------------------- |
| 1   | Ouvrir le train                                          | [`phase-1.md`](./phase-1.md) |
| 2   | schema-pbta : contrat v10, `masks-playbook` et `masks-npc` | [`phase-2.md`](./phase-2.md) |
| 3   | schema-pbta : présentation et apparence du pack          | [`phase-3.md`](./phase-3.md) |
| 4   | Handbook : appartenance des cibles et bloc PNJ           | [`phase-4.md`](./phase-4.md) |
| 5   | Handbook : layout du livret Masks                        | [`phase-5.md`](./phase-5.md) |
| 6   | Handbook : callouts et style de page Masks               | [`phase-6.md`](./phase-6.md) |
| 7   | Lantern : adoption de l'épingle                          | [`phase-7.md`](./phase-7.md) |
| 8   | Valider et livrer                                        | [`phase-8.md`](./phase-8.md) |

## Resources

| Source | Verified |
| ------ | -------- |
| https://raw.githubusercontent.com/google/fonts/main/ofl/staatliches/OFL.txt | Staatliches : SIL OFL 1.1, sans Reserved Font Name, Regular 400 seul (vérifié le 2026-10-07) |
| https://raw.githubusercontent.com/google/fonts/main/ofl/bebasneue/OFL.txt | Bebas Neue : SIL OFL 1.1, sans Reserved Font Name, Regular 400 seul |
| https://raw.githubusercontent.com/google/fonts/main/ofl/josefinsans/OFL.txt | Josefin Sans : SIL OFL 1.1 **avec Reserved Font Name** ; variable 100–700 |
| https://raw.githubusercontent.com/google/fonts/main/ofl/crimsonpro/OFL.txt | Crimson Pro : SIL OFL 1.1, variable 200–900 |
| https://raw.githubusercontent.com/google/fonts/main/ofl/comicneue/OFL.txt | Comic Neue : SIL OFL 1.1, statiques 300/400/700 |
| https://openfontlicense.org/ofl-faq/ | Compression WOFF2 pure permise sous un nom réservé ; sous-ensemblage ou instanciation = version modifiée, à renommer |

## Decisions

| Decision | Why |
| -------- | --- |
| Masks passe après #86 et son contrat est une **v10.0.0** de `schema-pbta` | Un dépôt engagé par un train ouvert est refusé, et `schema-pbta` porte 73 fichiers non commités de #86. Une fois `v9.0.0` tagué, `validate-version-compat` refuse tout changement de `schemas/v9`, liste de fichiers comprise : champ ajouté ou cible neuve = majeur |
| Une cible spécialisée vaut `<pack.id>-<type>` ; son pack se lit dans `pack-contract.json` (`documents[].target`), plus en retirant un suffixe | `schema-pbta` applique déjà le préfixe ; seul Handbook exige `-playbook`. Inverser un nom devient ambigu dès qu'il y a deux suffixes |
| Nouveau bloc `pbta-npc` (capacité `block:pbta-npc`) : layout dédié pour `masks-npc`, rendu sobre pour le `npc` générique, dont le schéma n'est pas enrichi | Un bloc nommé `pbta-npc` qui rendrait `null` sur un `npc` valide serait un piège ; le précédent est `block:adrenaline-pnj` |
| `masks-npc` porte au moins un champ requis qui lui est propre (piste Self) | Sans cela il accepte les témoins du `npc` générique et devient un alias qu'aucune mesure ne détecte |
| Le fournisseur publie `block:pbta-npc` dans la candidate, Handbook le déclare en l'adoptant ; le pack visuel `handbook/masks` n'ajoute pas cette capacité à `requires` | `handbook/` est lu sur `main` de GitHub, hors tarball : une exigence posée avant la release de Handbook refuserait l'installation du pack chez tous les utilisateurs. La recette amont « hôte d'abord » vaut pour ce `requires`, pas pour le tarball |
| Polices déclarées dans `pack.json` (`assets.fonts`), Handbook génère les `@font-face` ; pas de `styles/fonts.css` | Voie nominale des packs PbtA (urban-shadows, monsterhearts). L'issue #87 cite `fonts.css` par analogie avec les packs Mist : c'est une erreur de l'issue |
| Josefin Sans est publiée en WOFF2 compressé sans sous-ensemblage ni instanciation ; chaque famille est livrée avec son `OFL.txt` | Reserved Font Name ; obligations de l'OFL 1.1 |
| Régions, ordre et libellés français du livret et de la carte viennent d'un contrat de présentation Masks publié ; le vocabulaire mécanique (Labels, conditions) vient des documents | Aucun repli sémantique local ; `labelDictionary` ne porte qu'une chaîne par clé et la localisation n'est pas tranchée en amont |
| La plage des Labels (−2…+3) est publiée par l'API de plages de stats, pas par un champ de document | C'est un fait du jeu, pas une donnée du personnage ; l'assertion amont qui l'interdit aujourd'hui est levée |
| « Cochable » signifie « état lu dans le TOML » | Aucun bloc PbtA n'écrit dans la note ; le rendu est statique |
| Les pages de scénario sont des callouts `masks-*` publiés par le pack ; portrait et cartouche sont des images, jamais dessinées en CSS | Décision de l'issue ; `style:pbta` suffit, aucune capacité neuve |
| Lantern n'adopte que l'épingle ; pas de gabarit PNJ, pas d'édition des nouveaux champs | Ses registres de cibles sont ouverts ; les champs neufs passent l'aller-retour. Contrainte reportée sur la phase 2 : `PBTA_COLLECTION_ITEM_EDITORS` ne gagne pas de valeur et `requirements.lantern` reste `edit:pbta` |
| Staatliches par défaut pour les titres, Bebas Neue gardée en repli jusqu'à la validation visuelle | Question ouverte de l'issue ; se tranche sur le rendu côte à côte de la phase 8, sans bloquer le contrat |
