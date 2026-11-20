---
objective: "Toutes les maquettes de `_sources/Design` d'Otherscape sont rendues dans le coffre, sauf la fiche de personnage (ticket à part) : page de scénario Metro finie, cartes de kit et de power set, tropes et tables d'objets, chacune aux couleurs de son type de thème (self, noise, mythos)."
status: implemented
---

# Plan: Otherscape — intégrer le reste des maquettes de design

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Finir la page de scénario Metro, puis projeter les maquettes qu'aucun train n'a encore traitées : kits de thème, power sets, tropes et objets d'équipement. Chaque carte prend la couleur de son type de thème. |
| **Source** | Demande du 2026-11-06 (« ce qui reste à intégrer », « l'intégration n'est pas encore finalisée », capture de la page Metro en deux colonnes) et dossier de référence `C:/Users/fxgui/Documents/Perso/RPG/otherscape/_sources/Design/` (24 maquettes). Suite du plan `2026_11_04_otherscape-variantes-design`, dont la phase 5 (train #121) est en cours. Versions par rôle : v<N+1> (schema-in-the-mist) et v<M+1> (Handbook) sont celles du train #121 ; v<N+2>, v<M+2> et v<L+1> (Lantern) sont celles du train de ce plan. |

### Inventaire : maquette → état → phase

| Maquette | Ce qu'elle montre | État le 2026-11-06 | Phase |
| -------- | ----------------- | ------------------ | ----- |
| `act-0-crew.png`, `page.jpg`, `light-chapo.jpg`, `dark.jpg`, `dark-chapo.jpg` | Page de scénario Metro : kicker, H1 à bandeau, chapô, renvoi, read-aloud, puces, deux colonnes | Partiel : le chapô disparaît derrière le marqueur de colonnes ; les callouts natifs prennent le cadre biseauté cyan, absent de la maquette | 1 |
| `description.jpg` | Metro : H2 en étiquette lime, encart en machine à écrire bordé à gauche | Partiel : l'étiquette existe, l'encart est le read-aloud | 1 |
| `chapter-title.jpg` | Tête de chapitre Metro : emblème, titre centré géant, chapô sur deux colonnes | Absent : le composant `chapter-header` est déclaré dans `components.json`, mais rien ne le dessine ni ne l'écrit en Markdown | 1 |
| `tokyo-self-theme-kits.jpg`, `tokyo-noise-theme-kits.jpg`, `tokyo-theme-mythos-set.jpg` | Kits de thème : bandeau de titre à la couleur du type, icône en cartouche, « EXPERTISE SELF », description, grand bandeau de power tag, tags en pastilles inclinées (faiblesses en olive), intertitres à filet, Special à case | Absent : le contrat `theme-kit` n'a ni `description` ni `special` | 2 à 5 |
| `tokyo-dark-power-set.jpg`, `tokyo-dark-noise-set.jpg`, `tokyo-dark-mythos-set.jpg` | Power sets : étiquette « SELF POWER SET », titre italique à icône, marques de limite `+⊕(⊕)`, tags & statuts, menaces / conséquences | Absent : `power-set` n'a ni `tags_and_statuses` ni marque de limite ; le rendu est générique | 2 à 5 |
| `sheet1.jpg` | Cartes de thème de la fiche (Artifact, Exposure, Personality, Cutting Edge) aux couleurs du type | Partiel : `theme-card` a les variantes `self`, `mythos` et `noise`, sans le dessin de la maquette | 5 |
| `tokyo-theme-set.jpg`, `cairo-tropes.jpg` | Tropes : étiquette de famille, liste « THEME KITS » avec renvoi de page, « Choose One » à cases, Loadout surligné | Partiel : la carte Cairo est projetée ; les cases, le surlignage et la carte Tokyo manquent | 6 |
| `tokyo-list-items.jpg`, `cairo-list-items.jpg` | Objets d'équipement en table : nom en cartouche, description, feature tags surlignés, faiblesse en flèche | Absent : chaque `loadout-item` est rendu en article isolé | 6 |
| `cairo-light.jpg`, `cairo-dark.jpg`, `cairo-list.jpg`, `cairo-subtags.jpg`, `tokyo-light.jpg`, `tokyo-dark.jpg`, `bgds/*` | Pages Cairo et Tokyo | Fait (plan du 2026-11-04) ; les fonds `bgds/*` restent écartés pour le plafond d'archive | — |
| `sheet1.jpg` (la fiche entière) | Fiche de personnage : upgrades, tag combos, loadout | Hors périmètre : un ticket à ouvrir en phase 7 | 7 |

## Phases

| #   | Phase | File |
| --- | ----- | ---- |
| 1   | Metro : finir la page de scénario et la tête de chapitre (dans le train #121 ouvert) | [`phase-1.md`](./phase-1.md) |
| 2   | schema-in-the-mist : contrat des kits et des power sets | [`phase-2.md`](./phase-2.md) |
| 3   | Handbook : consommer le contrat et poser les points d'accroche | [`phase-3.md`](./phase-3.md) |
| 4   | Lantern : saisir les nouveaux champs | [`phase-4.md`](./phase-4.md) |
| 5   | schema-in-the-mist : cartes de kit et de power set, couleur par type | [`phase-5.md`](./phase-5.md) |
| 6   | schema-in-the-mist : tropes et tables d'objets | [`phase-6.md`](./phase-6.md) |
| 7   | Train : rendu dans le coffre puis livraison (après la phase 8) | [`phase-7.md`](./phase-7.md) |
| 8   | Typographie du livre, texte justifié et saut de colonne (ajoutée le 2026-11-07, avant le train) | [`phase-8.md`](./phase-8.md) |

## Resources

| Source | Verified |
| ------ | -------- |
| `C:/Users/fxgui/Documents/Perso/RPG/otherscape/_sources/1. Metro-Otherscape_Core_Book.pdf` | Livre de base : la référence de règle pour la marque de limite des power sets (phase 2). |
| `lantern/src/templates/otherscape/theme-kit/`, `power-set/` | Lantern édite déjà ces deux blocs (modèle, TOML, éditeur, aperçu, libellés `fr` et `en`) : c'est un consommateur du contrat. |
| `schema-in-the-mist/schemas/otherscape/design/release.json` | Porte la version et le `sourceHash` de `tokens.json` et de `components.json`. |
| `obsidian-handbook/tools/prove-schema-in-the-mist-candidate.mjs` | Construit un consommateur contre le tarball candidat du schéma, avant sa publication. |
| `C:/Users/fxgui/Documents/Perso/RPG/otherscape/_sources/Design/` | 24 maquettes, lues une à une le 2026-11-06 ; l'inventaire ci-dessus en dérive. C'est la référence de rendu de chaque phase. |
| `schema-in-the-mist/schemas/otherscape/*.schema.json` | `theme-kit` : `title_tag`, `theme_type`, `category`, `power_tags`, `weakness_tags`, `quest`, `meta`. `power-set` : `name`, `type`, `description`, `specials`, `threats`, `general_consequences`, `meta`. `challenge` a déjà `tags_and_statuses` et `limits`. |
| `schema-in-the-mist/schemas/otherscape/design/tokens.json` | Couleurs de type déjà publiées : self #B4233E, mythos #7B4FB0, noise #075F8B, et leurs versions sombres (#E05A6E, #A98BD0, #5D9BD4). |
| `obsidian-handbook/src/games/assets.ts` (`rewritePackUrls`) | Une URL à schéma (dont `data:`) est refusée dans le CSS d'un pack ; une image passe par un rôle déclaré dans `pack.assets.images`, exposé en `--brumes-image-<rôle>`. |

## Decisions

| Decision | Why |
| -------- | --- |
| Les champs manquants (`description` et `special` du kit, `tags_and_statuses` et marque de limite du power set, `page` des kits cités par une trope) s'ajoutent au schéma et sont publiés **avant** que Handbook les lise. | Règle du flux inter-dépôts : le contrat vit dans `schema-*`, sans repli sémantique local. |
| Les icônes de type (cœur pour self, puce pour noise, œil pour mythos) sont des SVG du pack, déclarés par rôle (`theme-self`, `theme-noise`, `theme-mythos`) et posés en masque teinté par `currentColor`. | Le garde `unsafe URL` interdit les data URI. Un masque reprend la couleur du type sans dupliquer l'image. Même chemin que `metro-crosshair`. |
| Chaque variante dessine ses cartes d'après sa propre maquette : Tokyo d'après `tokyo-*-theme-kits` et `tokyo-dark-*-set`, Metro d'après les cartes de `sheet1.jpg`, Cairo d'après le cadre de `cairo-tropes.jpg`, teint de la couleur du type. | Aucune maquette ne montre de kit en Metro ni en Cairo. Les cartes de la fiche sont le dessin du livre de base (Metro), et le cadre Cairo est déjà projeté. |
| La fiche de personnage complète (`sheet1.jpg`) sort de ce plan : un ticket est ouvert en phase 7. | Aucun bloc ne porte d'upgrades, de tag combos ou de loadout de fiche. Ce serait un format neuf, plus gros que tout le reste réuni. |
| Les fonds `bgds/*.jpg` restent écartés. | Décision du plan du 2026-11-04 (plafond d'archive), toujours valable. |
| La phase 1 voyage dans le train #121 encore ouvert (schema-in-the-mist v<N+1>, Handbook v<M+1>). Les phases 2 à 7 forment un seul train neuf (schema-in-the-mist v<N+2>, Lantern v<L+1>, Handbook v<M+2>). | Le travail Metro de cette session est déjà dans les changements non commités du train #121, dont le verdict de rendu attend justement ces écarts. Ensuite, un seul train : une version de schéma, une épingle par consommateur. |
| Avant le train, Handbook et Lantern se construisent contre le tarball candidat du schéma. Le train publie le schéma, puis fait converger les consommateurs sur la version publiée. | « Publier avant d'adopter » : aucun consommateur ne pousse une épingle vers une version non publiée ; le candidat ne sert qu'aux preuves locales de `present`. |
| Lantern entre dans le train : chaque champ ajouté au contrat est saisissable dans son éditeur. | Lantern édite déjà `theme-kit` et `power-set` ; un champ déclaré que l'éditeur ne montre pas serait un champ masqué par un consommateur. |
| La tête de chapitre s'écrit en callout `[!chapter]` (titre = titre du chapitre, corps = chapô), choix soumis au verdict de rendu de la phase 1. | Les callouts visuels du pack ont déjà cette forme (corps seul). L'écriture Markdown est une décision de fonctionnement : c'est l'utilisateur qui la valide. |
| Une modification de `tokens.json` ou de `components.json` ne touche `release.json` que si elle change le contrat de ces fichiers (version) ; `sourceHash` n'est pas recalculé à la main. | Constat du 2026-11-06 : aucun outil de schema-in-the-mist ne lit `sourceHash`, et ses valeurs ne correspondent déjà à aucun fichier. `npm run check` ne le vérifie pas. La phase 1 ne touche ni `components.json` ni `release.json`. |
| Ajout de périmètre (2026-11-07, demandé par l'utilisateur) : la carte de kit de l'aperçu Lantern est redessinée d'après `tokyo-self-theme-kits.jpg` (bandeau du type avec cartouche d'icône, ligne « thème TYPE », étiquettes à filet, bannière du titre, tags en pastilles biaisées qui s'enchaînent, faiblesses olive, sans cercles de brûlure ni légende). Les cartes Lantern du power set (`tokyo-dark-power-set.jpg`), des tropes et du loadout (catalogue de rue Tokyo) suivent ensuite, avec des pièces partagées : `TypeGlyph`, `bareTag`, `SectionHeader align="end"`. | L'aperçu suivait une référence plus ancienne (carte étroite du Core Book, un tag par ligne) qu'aucune phase ne couvrait : la phase 4 ne portait que les champs de saisie. |
| Références de rendu des cartes Lantern, révisées le 2026-11-08 : la trope suit `cairo-tropes.jpg` (accent turquoise du livre, et non l'accent crew), le loadout suit `tokyo-list-items.jpg`. Le power set est validé, avec ses puces à la couleur du type. | Verdict de l'utilisateur sur le power set (« oui c'est bon »), puis sa demande que les puces prennent « la couleur du type de thème ». Les maquettes du dossier `Design/` sont les références nommées de ces cartes. |
| Lantern choisit la variante Otherscape par onglet, dans l'« Apparence générale ». Chaque carte prend le dessin de la variante choisie quand une maquette existe, et garde sinon sa référence. La liste et le défaut viennent du pack Handbook publié. Le sélecteur n'est posé que sur la trope (Tokyo) et le loadout (Cairo). | Réponses de l'utilisateur, 2026-11-08 : « Dessin par variante » et « Par onglet ». Flux inter-dépôts : un menu se pilote par les métadonnées publiées. Un sélecteur sans effet sur les autres cartes recréerait les boutons inopérants qu'il a signalés. |
| Metro est le dessin de base de chaque carte Lantern. Cairo et Tokyo en sont des variantes peu différentes, surtout par la couleur. Référence du défi : livre de base, pp. 302-303 (Tokyo p. 99, Cairo p. 108). La trope et le loadout, dessinés d'après Cairo et Tokyo, doivent recevoir un dessin Metro. | Utilisateur, 2026-11-08 : « pour Metro, c'est le design de base, il faut qu'il y soit. du reste les variantes ne sont pas très nombreuses, si on regarde bien. » |
| Les six types de carte d'Otherscape gardent leur nom anglais dans la locale française de Lantern : Challenge, Character Trope, Loadout Item, Power Set, Theme, Theme Kit, et « Loadout » pour la section de la trope (une entrée de trope est une « entrée de loadout »). Les sous-termes restent en français, comme « type de thème » et « thème du Soi ». LitM et CoM ne changent pas. Le glossaire `lantern/src/i18n/glossary/otherscape.md` est mis à jour. Report vers Handbook à faire avec le reste. | Utilisateur, 2026-11-08 : « pour l'instant la traduction officielle française établie par Barbus Inc et Antre Monde n'a pas encore été publié on ne sait pas, mais je pense pour les éléments technique principaux, il vaut mieux garder les termes originaux pour le moment, sinon on va cliquer sur un élément en pensant en avoir un autre. » |
| Pas d'outil « Job » dans Lantern. La gamme n'en publie pas de figure comme l'iceberg (CoM) ou la montagne (LitM) : le livre de base ne donne que la méthode « Designing a Job » (pp. 287-293), en texte. On n'invente pas d'outil absent de la gamme. | Utilisateur, 2026-11-08 : « si ca n'existe pas dans la gamme, on passe. » |
| Loadout Item : Lantern garde la mise en page étroite (fiche : nom et description côte à côte, tags et faiblesse dessous) ; Handbook prend la mise en page large, la rangée du Street Catalog à quatre colonnes avec ses intitulés (ITEM NAME / DESCRIPTION / FEATURE TAGS / WEAKNESS), comme pp. 252-254. Dans les deux, les boîtes du nom et de la faiblesse débordent de la bande. Lantern n'a rien à changer : son aperçu va de 280 à 560 px et la bascule vers la rangée large se fait au-delà de 34rem de contenu, jamais atteint. Report vers Handbook : bloc `os-loadout-item` (`src/features/osCharacterCreation/`, `src/styles/otherscape/_character-creation.scss`). | Utilisateur, 2026-11-08 : « li over narrow me semble plus intéressant pour lantern, mais wide plus intéressant sur handbook » |
| Challenge : l'onglet porte les ⊕ de difficulté, comme le livre (p. 301, onglets pp. 302-303), et l'échelle passe dans le texte (« with Scale 1 »). Schéma d'abord : `otherscape/challenge` gagne `rating` (1 à 5, facultatif, sans défaut), avec un cas refusé à six étoiles ; `scale` reste, et sa description dit qu'il s'imprime dans la prose. Le retirer aurait cassé le contrat v1. Lantern : marque ⊕ partagée avec le Power Set, ligne « Scale N » en tête de la description, cote au formulaire. Un setting personnel (Dormance) peut ainsi écrire son Might dans le texte sans variante. Handbook (`osChallenges/renderer.ts`, en-tête « CHALLENGE · SCALE N ») suivra au report. | Utilisateur, 2026-11-08 : « dans le texte. comme ca, pour Dormance (mon setting personnel qui utilise aussi parfois le Might) je peux également ajouter le Might sans créer de nouvelle variante. » puis « les deux serviront » |
| Le train part sans verdict de rendu : `ship --run` lancé le 2026-11-08 sans l'aperçu dans le coffre. Livrés : schema-in-the-mist v1.5.0, Lantern v0.30.0, Handbook v2.47.0. #123, #124, lantern#73 et mist#27 sont clos, et la fiche de personnage est suivie par #125. Le rendu reste à vérifier dans le coffre, après coup. | Utilisateur, 2026-11-08 : « il faut terminer le train ». |
