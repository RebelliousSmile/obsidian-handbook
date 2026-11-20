---
objective: "Une fiche de personnage Otherscape (thèmes complets, upgrades, tag combos, loadout) s'écrit dans Lantern, se copie en TOML et se rend dans Handbook comme le bas de la fiche prétirée du kit de démo."
status: implemented
---

# Plan: Otherscape — fiche de personnage

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Nouvelle cible `otherscape/character` publiée par schema-in-the-mist, éditée par Lantern et rendue par Handbook (bloc `os-character`), avec Theme Special et description sur la carte de thème. |
| **Source** | `RebelliousSmile/obsidian-handbook#125` |

## Phases

| #   | Phase | File |
| --- | ----- | ---- |
| 1   | Contrat : thème enrichi et cible `otherscape/character` (schema-in-the-mist, version candidate) | [`phase-1.md`](./phase-1.md) |
| 2   | Éditeur Lantern de la fiche, sur le modèle LitM | [`phase-2.md`](./phase-2.md) |
| 3   | Bloc Handbook `os-character` | [`phase-3.md`](./phase-3.md) |
| 4   | Rendu dans le coffre, verdict, puis train | [`phase-4.md`](./phase-4.md) |

## Resources

Référence de rendu (exigée par le ticket et par la règle « le plan nomme sa référence de rendu ») :

| Source | Verified |
| ------ | -------- |
| `C:/Users/fxgui/Documents/Perso/RPG/otherscape/_sources/Design/sheet1.jpg` | **Référence principale.** Bas de la fiche prétirée d'Aegis : bandeau Upgrades (règle et deux cases), Tag combos (4 colonnes : intitulé, tags joints par `+`, POWER N, effet), Loadout (2 colonnes : objets chargés, objets non chargés estompés), puis 4 cartes de thème avec quête en citation, description et Theme Special. |
| `otherscape/_sources/…/CHARACTERS - Otherscape RPG Demo Game (+ Printer Friendly).pdf`, p. 1 (Genji) et p. 5 et 9 | La fiche entière : en-tête avec le nom, puis Upgrades / Tag combos / Loadout, puis les cartes. Les pages 5 et 9 montrent quatre cartes par personnage, chacune avec une description et un Theme Special : ce n'est pas propre à Aegis. |
| `AME_SoO_Otherscape_Kit-d'intro-FR_5PJ.pdf`, p. 22-31 (fiches des PJ en français) | VF officielle des zones de la fiche : « Mise à niveau » (Upgrades) et son texte de règle, « Combos de traits », « Matos » (Loadout). Le kit dit « trait d'atout / de contrainte » là où le glossaire validé dit « tag de pouvoir / de faiblesse ». |
| `Otherscape - Fillable Character Sheets [FINAL].pdf` | La fiche vierge officielle (Character Card : Essence, Crew relationships, Evolution, Specials). C'est une autre maquette, **hors du périmètre** (voir Decisions). |
| `1. Metro-Otherscape_Core_Book.pdf`, p. 89 « Tag combos » | Anatomie d'un tag combo : tags combinés, Power obtenu, effet visé. |
| `1. Metro-Otherscape_Core_Book.pdf`, p. 114-117 « Loadout » (texte : `_sources/Fiches/Metro-Otherscape_Core_Book.txt`) | Le loadout est un cinquième thème. Ses tags sont brûlés par défaut et deviennent utilisables quand on les charge. Un objet peut être un jeu de tags et porter un tag de faiblesse. |

Trois points de contrôle sont fixés d'avance pour la phase de rendu :

1. le bandeau Tag combos ;
2. le Loadout, avec des objets chargés et des objets non chargés ;
3. une carte de thème qui porte une description et un Theme Special.

## Decisions

| Decision | Why |
| -------- | --- |
| Le périmètre suit le ticket et `sheet1.jpg` : nom, Upgrades, Tag combos, Loadout et quatre thèmes. L'Essence, Crew relationships et Evolution de la fiche vierge officielle n'y sont pas. | Le ticket nomme `sheet1.jpg` et les trois zones manquantes. La Character Card officielle est une autre maquette : elle fera l'objet de son propre ticket si on la veut. |
| `otherscape/theme` gagne `description` et `special`, tous deux optionnels. `special` est `ThemeKitSpecialSchema` lui-même (`{ name, description }`). C'est une version mineure du schéma. | Les quatre cartes du kit de démo portent les deux champs, et la carte de thème autonome en profite aussi. Les champs sont additifs, donc aucun document existant ne casse. Kit et thème ont la même forme : le Special se copie de l'un à l'autre sans table de correspondance. |
| La fiche **compose** le thème au niveau Zod (`themes: OtherscapeThemeSchema[]`, de 0 à 4, `crew` refusé). Elle ne le référence pas par `$ref`. | Le dépôt n'a aucune `$ref` entre fichiers (relevé de l'exploration). Une seule source pour la carte : Handbook réutilise `renderOsTheme`. Zéro thème laisse écrire une fiche en cours de création. Le thème d'équipe n'est pas un des quatre thèmes du personnage. |
| Le Loadout de la fiche est le **thème de loadout** du livre (p. 114-117) : une liste d'objets, chacun avec `name` (le tag), `feature_tags`, `weakness_tag` et `loaded`, booléen à `false` par défaut. Les champs de l'objet sont ceux de `otherscape/loadout-item`, repris au niveau Zod. | Les tags de loadout sont brûlés par défaut et redeviennent utilisables quand on les charge (*Load Up*). `sheet1.jpg` montre des objets chargés et des objets estompés. `loadout-item` modélise déjà l'objet (tag, jeu de tags, faiblesse) : une seconde forme ferait doublon. `loaded` porte sur l'objet entier : le chargement tag par tag d'un jeu de tags n'est pas modélisé, car `sheet1.jpg` n'en montre pas. La piste d'upgrade et les Specials du thème de loadout restent hors périmètre, faute de référence de rendu. |
| L'apparence de la fiche (couleurs, polices, bandeaux) vit dans le CSS du pack, généré depuis `components.json`. Le SCSS de Handbook ne porte que la géométrie (grille des bandeaux et des colonnes). | C'est déjà le partage d'`os-theme` : le pack publie `brumes-os-theme--*` et Handbook pose la grille. |
| Le Theme Special et la description du thème réemploient l'existant : `DescriptionForm` et `SpecialForm` du kit dans Lantern, les zones `description` et `special` d'`osThemes` dans Handbook. | Ces pièces rendent déjà la même forme pour le kit. |
| Un tag combo vaut `{ label, tags[], power, effect }`. `effect` est en Markdown en ligne (`**Attack** *slashed*`). | La fiche imprime l'effet comme une phrase avec un mot d'action et un statut en italique. Une énumération d'actions figerait un vocabulaire que les livres de cadre étendent. |
| Le texte de règle du bandeau Upgrades n'est pas une donnée. C'est un libellé publié par le schéma (`OTHERSCAPE_ZONE_LABELS.character` dans `presentation.ts`, FR et EN), et le document ne porte rien pour cette zone. | La règle est la même pour tout personnage. |
| VF des zones neuves : le texte du kit d'intro FR, ramené au glossaire déjà validé. Upgrades → « Mise à niveau » ; Tag combos → « Combos de tags » ; Loadout reste « Loadout » ; « trait d'atout / de contrainte » → « tag de pouvoir / de faiblesse » ; « Avantage » → « Spécial ». | La traduction validée gagne et ne se modifie pas : `presentation.ts` publie déjà « Tags de pouvoir », « Tags de faiblesse », « Spécial » et garde « Loadout » en anglais. Le kit d'intro fournit le reste. Le texte ramené au glossaire est montré à l'utilisateur à la phase 4. |
| Les nombres de cibles écrits en dur (14 dans `validate-examples.ts`, `validate-package.ts`, `assertMistContract`) sont dérivés de `TARGETS` / `MIST_ENGINE_CODECS`, plutôt que portés à 15. | Une garde affirme un rôle, jamais un chiffre. |
| Zones d'édition courtes dans Lantern : en-tête, Upgrades (lecture seule), un tag combo, le loadout, un thème. Un clic n'ouvre que la zone touchée. | Éditeur LitM pris pour modèle, panneaux d'édition courts (consignes de l'utilisateur). |
