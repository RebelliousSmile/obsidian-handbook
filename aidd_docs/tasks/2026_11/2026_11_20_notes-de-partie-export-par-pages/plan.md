---
objective: "Toute fiche de personnage de Lantern a une page « Notes de partie » de taille fixe, présente dans le TOML, et s'exporte par pages (PNG d'une page ou archive, PDF natif, TOML) depuis un seul contrôle « Exporter »."
status: in-progress
---

# Plan: Notes de partie et export par pages

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Ajouter aux fiches de personnage une page de notes de partie (texte libre, une page, taille fixe, exclue à volonté d'un export), découper les fiches en pages selon leur feuille papier publiée, et unifier l'export de Lantern en un bouton « Exporter » à bascule PNG / PDF / TOML. |
| **Source** | Brainstorm de la session du 2026-11-20 (texte : « dans les fiches de personnage, dans lantern on a un volet repliable pour les textes à consigner sur la fiche… pour prendre des notes pendant la partie »). Aucun ticket. |

## Phases

| #   | Phase | File |
| --- | ----- | ---- |
| 1   | Inventaire des pages papier et tentatives de faisabilité (impression native, archive, taille de la page de notes) | [`phase-1.md`](./phase-1.md) |
| 2   | Lantern : export par pages et contrôle « Exporter » global, éprouvés sur Masques (recto / verso) | [`phase-2.md`](./phase-2.md) |
| 3   | Contrat : champ de notes (`notesDePartie`, `sessionNotes`) et pages publiés par les trois paquets `schema-*` (versions candidates) | [`phase-3.md`](./phase-3.md) |
| 4   | Lantern : page « Notes de partie » sur la fiche Adrenaline PJ, puis rendu | [`phase-4.md`](./phase-4.md) |
| 5   | Lantern : page « Notes de partie » sur Otherscape et sur les fiches PbtA | [`phase-5.md`](./phase-5.md) |
| 6   | Handbook : adoption du contrat, verdict de rendu, puis train | [`phase-6.md`](./phase-6.md) |

## Resources

Références de rendu (règle « le plan nomme sa référence de rendu »). Chaque feuille papier fixe le découpage en pages de son jeu : **maximum A4 par page, parfois un verso**.

| Source | Verified |
| ------ | -------- |
| `C:/Users/fxgui/Documents/Perso/RPG/zombiology/_sources/aides-de-jeu/AS03_Feuille de PJ_one-shot portrait 2 pages_2026-07-13_v1a.pdf` et `Z1A03_Feuille de PJ_one-shot portrait 2 pages_2026-07-13_v1a.pdf` | **Référence de la fiche Adrenaline PJ**, en deux pages ; `AS02_Feuille de PJ_one-shot portrait 1 page_2026-07-13_v1a.pdf` en est la variante à une page. La phase 1 tranche laquelle fait foi (la mémoire du projet note que la fiche papier à jour a été fournie le 2026-10-10 : on compare au contrat `pj` avant tout travail). |
| `C:/Users/fxgui/Documents/Perso/RPG/otherscape/_sources/Design/sheet1.jpg` et `CHARACTERS - Otherscape RPG Demo Game (+ Printer Friendly).pdf` | Référence de la fiche Otherscape déjà retenue par le plan de la fiche (bas de la fiche prétirée : Upgrades, Tag combos, Loadout, quatre cartes de thème). Le découpage en pages se lit sur le PDF. |
| `C:/Users/fxgui/Documents/Perso/RPG/masks/_sources/Masques-Livrets (1).pdf` et `masks/_sources/Design/livret1.png`, `livret2.png` | Livret Masques : recto et verso, deux faces déjà déclarées (`faces`, `recto` / `verso`) par `schema-pbta`. Sert de **cas d'épreuve** du découpage en pages. |
| `C:/Users/fxgui/Documents/Perso/RPG/urban-shadows/_sources/Design/livret1.png`, `livret2.png` et `Playbooks/US-Playbooks-PrinterFriendly-20250325.pdf` | Livret Urban Shadows. |
| `C:/Users/fxgui/Documents/Perso/RPG/the-sprawl/_sources/design/livret1.png`, `livret2.png` et `vf/The Sprawl VF - Livrets personnages v1.1.pdf` | Livret The Sprawl (VF). |
| `C:/Users/fxgui/Documents/Perso/RPG/monsterhearts/_sources/design/` et `monsterhearts_antiseche_joueurs_10.pdf` | Livret Monsterhearts. Le pack ne publie que le livret. |
| Livret Monster of the Week | Aucune référence papier dans `monster-of-the-week/_sources` : la phase 1 la repère ou, à défaut, le livret suit le découpage des faces que le pack déclare. |

Trois points de contrôle sont fixés d'avance pour la phase de rendu (phase 4, dans le navigateur de Lantern) :

1. la page « Notes de partie » pleine, avec le signal « plein » et le refus de saisie ;
2. un export PNG d'une page précise, puis l'archive d'une page par PNG, avec et sans la page de notes ;
3. l'export PDF natif, toutes pages, en A4, texte sélectionnable.

La phase 5 étend le même contrôle aux autres jeux sans nouveau verdict de conception ; la phase 6 ne demande à l'utilisateur que la question de l'affichage des notes dans les blocs de Handbook.

## Decisions

| Decision | Why |
| -------- | --- |
| **Périmètre : les cibles « fiche de personnage » de Lantern** : Adrenaline `pj`, Otherscape `character`, et les livrets PbtA (cibles `*-playbook` : Masques, Monster of the Week, Monsterhearts, The Sprawl, Urban Shadows, Salvage Run, et le `playbook` générique). Ne sont **pas** concernés : les PNJ, monstres, menaces, équipes, matrices, missions et cartes, ni City of Mist et Legend in the Mist (aucun gabarit de fiche dans Lantern). | Le brief disait « tous les jeux » : l'exploration montre que ces deux jeux n'ont aucune fiche, et que `pbta/specialized` fabrique aussi des cartes de MJ qui ne sont pas des fiches. Leur donner une fiche est un autre chantier. |
| **Un nom de champ distinct de `notes`** : `notesDePartie` dans `schema-adrenaline` (clés françaises), `sessionNotes` dans `schema-in-the-mist` et `schema-pbta`. Le champ est posé sur le schéma de base du livret PbtA (`playbookSchema`), dont héritent les cibles spécialisées et l'alias Salvage Run. | `monster-of-the-week-playbook` porte déjà `notes` (liste de lignes « laissées pour des notes sur le jeu »), et `pj` porte `notes` dans plusieurs sous-objets (`etatDePartie`, équipement) : réemployer le nom ferait une collision de contrat. |
| La page de notes est **une seule page, de taille fixe**, en texte libre. Quand elle est pleine, l'éditeur le **signale et refuse** la saisie supplémentaire. | Choix de l'utilisateur (« B pour les deux »). Le signal et le refus évitent un débordement silencieux au rendu. |
| La capacité de la page est **bornée par le schéma** (`maxLength` du champ de notes, une valeur par paquet, mesurée à la phase 1 sur la page la plus étroite des jeux du paquet) et **refusée au rendu** par l'éditeur dès que le texte déborde la page fixe (mesure de la hauteur rendue, car les sauts de ligne consomment de la place sans compter dans les caractères). Aucune garde ne recopie la valeur. | Une garde affirme un rôle, jamais un chiffre ; le contrat vit dans les paquets `schema-*`. Un plafond de caractères seul laisserait déborder une page faite de lignes courtes. |
| Le **découpage en pages suit la feuille papier publiée** du jeu : A4 au plus par page, un verso quand la feuille en a un. Les fiches existantes sont découpées de la même façon (choix B du périmètre). Les pages sont **déclarées par le schéma** (métadonnées de présentation), pas devinées par Lantern. | Choix de l'utilisateur (« mon choix suit cette logique »). Le contrat de présentation porte déjà les faces recto / verso des livrets PbtA : on les généralise au lieu d'inventer une seconde notion. |
| La page de notes est **toujours la dernière page** de la fiche et peut être **exclue de chaque export**, TOML compris (case « Inclure la page de notes » pour le PNG et le PDF, « Inclure les notes » pour le TOML). Le TOML les inclut par défaut, car c'est le format de sauvegarde. | Les notes de table sont privées : le joueur doit pouvoir partager sa fiche, en image comme en TOML, sans elles. |
| Le contrôle d'export est **un seul bouton « Exporter »** avec une **bascule PNG / PDF / TOML** ; choisir le format affiche ses options. PNG : une page choisie ou toutes, en archive d'un PNG par page. PDF : toutes les pages. TOML : copier ou exporter. | Choix de l'utilisateur (« B »). `TemplateExportPanel` a déjà l'onglet par format et le bouton : on garde cette ossature et on y ajoute le PDF. |
| **PDF = impression native du navigateur** (`window.print()`, `@page` A4, `@media print`), texte sélectionnable. Pas de génération de PDF par une bibliothèque. | Choix B de l'utilisateur. Aucune dépendance de plus ; le coût est le dialogue d'impression du navigateur, accepté. La phase 1 vérifie que la fidélité visuelle est assez proche du PNG. |
| **L'archive PNG se fait sans dépendance neuve si c'est possible** (écriture d'une archive non compressée à la main, les PNG étant déjà compressés). Si la phase 1 montre que ce n'est pas tenable, la bibliothèque retenue est décidée et notée là, avant la phase 2. | Lantern n'a pas de bibliothèque d'archive ; les règles du projet n'admettent pas une dépendance sans raison tenue. |
| Le champ est additif et optionnel : une version **mineure** par paquet, publiée avant adoption. Le libellé de la zone et de la page vient des métadonnées publiées ; Lantern ne porte dans ses locales que ses propres chaînes d'interface (compteur, signal « plein »). | Aucun repli sémantique local ; un champ optionnel ne casse aucun document existant. |
| Le **découpage des fiches existantes en pages** (aperçu à l'échelle d'une page A4 et zones réparties selon la feuille papier) est un chantier de présentation à part entière, pas un simple ajout de page de notes : il est chiffré dans les phases 4 et 5. | L'aperçu actuel d'Adrenaline PJ est une seule mise en page continue ; le choix B de l'utilisateur impose de la découper. |
| **Verdict phase 1 — impression native : retenue avec réserves.** Elle passe par une racine d'impression au niveau de `body` (clone des pages) et des `@page` nommées, une par page, à la taille de la page ; texte sélectionnable, couleurs conservées. Isoler l'application en place est refusé (pages blanches, fuites). Réserves : « Graphiques d'arrière-plan » à cocher selon le navigateur ; aucune page blanche en critère d'acceptation. Mesures : `mesures-phase-1.md`. | Spike sur Adrenaline PJ et Masques, relu en PDF (`pypdf`, `pdftoppm`). |
| **Verdict phase 1 — archive : retenue, sans dépendance.** Archive « stored » écrite à la main (CRC32, UTF-8), relue par Python `zipfile` et `Expand-Archive`, md5 égaux. Noms de fichiers en ASCII de préférence. | Spike relu par deux extracteurs indépendants. |
| **Verdict phase 1 — formats de feuille variables.** Les feuilles publiées n'ont pas toutes le même format (Adrenaline PJ 601 × 780 pt, Otherscape Letter paysage, Masques et Sprawl A4 paysage, Urban Shadows Letter portrait). L'export PDF pose donc **une `@page` nommée par page, à la taille de la page** lue de la présentation publiée, jamais un A4 unique ni un format en dur dans Lantern ; « A4 au plus » reste la règle de découpage. Le contrat de la phase 3 porte, par page, identifiant, libellé et format. Voir `inventaire-pages.md`. | Constat de la phase 1 ; ajuste le texte des phases 2 et 3 sans en changer l'objet. |
| **Verdict phase 1 — capacité de la page de notes** : 6 000 caractères (`maxLength`) pour chacun des trois paquets, 51 lignes courtes tenant sur la page ; le refus de saisie se fait aussi sur la hauteur rendue. Valeur recopiée seulement dans le contrat, reconfirmée en phase 3 avec la police publiée de chaque pack. | Mesure du plus grand texte tenant dans une page Letter / A4 à 14 px (`mesures-phase-1.md`). |
| **Hypothèse non tranchée par l'utilisateur** : Handbook n'affiche pas les notes dans ses blocs. Il adopte le contrat, tolère le champ et ne le rend pas. | Les notes sont de la table, pas du récit ; l'utilisateur n'a pas demandé qu'elles apparaissent dans le coffre. À confirmer au verdict de la phase 6. |
| **Phase 3 — nommage dans `schema-in-the-mist`** : le champ de notes y est `session_notes` (snake_case), pas `sessionNotes`. | Tous les champs de la cible Otherscape `character` sont en snake_case ; un seul champ en camelCase aurait rompu la convention du paquet. Les deux autres paquets gardent `notesDePartie` (Adrenaline) et `sessionNotes` (PbtA), conformes aux leurs. Écart assumé à la décision « Un nom de champ distinct de `notes` » ci-dessus ; les consommateurs lisent le nom depuis la page publiée (`notes_field`), jamais en dur. |
| **Phase 3 — pages publiées à côté des régions.** `schema-adrenaline` : `pages[]` de la présentation ; `schema-in-the-mist` : `OTHERSCAPE_CHARACTER_PAGES` ; `schema-pbta` : `PBTA_PLAYBOOK_PAGES`, déclarées dans un fichier à part, clé par cible. Dans chaque paquet, la page de notes est unique, dernière, et ne porte aucune région. | Une page est une unité d'export, une région une unité de mise en page : les séparer évite de toucher aux effectifs et aux énumérations strictes des régions déjà publiées (aucune régression de ce que les paquets déclarent). Chaque paquet valide ses pages contre ses groupes de régions, son schéma et la capacité publiée. |
| **Phase 3 — rôle des versions** : chaque paquet reçoit une **mineure additive**, version candidate v<N+1> puis finale v<N+1> promue par le train de la phase 6. Dans `schema-pbta`, la majeure en cours (candidate, ni taguée ni publiée) absorbe le champ et les pages : pas de mineure de plus. | Le champ est additif et optionnel ; ouvrir une mineure sur une majeure jamais publiée n'aurait aucun consommateur. Les numéros restent dans les CHANGELOG et les `package.json` des paquets, jamais recopiés ici. |
| **Phase 3 — Monster of the Week et Salvage Run n'existent plus** dans `schema-pbta` (retirés par la majeure en cours) : le périmètre PbtA du plan se réduit à Masques, The Sprawl, Urban Shadows, Monsterhearts et au livret générique `playbook`. | Constaté en phase 3 ; la tâche « l'alias Salvage Run l'hérite » du `phase-3.md` est donc sans objet. |
| **Phase 3 — publication des candidates : geste en attente.** Le code des trois paquets est écrit et leur vérification complète est verte, en local, sans commit ni tag. La publication (commit, tag, release des candidates) exige une demande explicite de l'utilisateur et reste à faire. En attendant, Lantern et Handbook adoptent les paquets par la boucle locale (`dev:schema` / tarballs locaux) pour les phases 4 à 6 ; l'épingle publiée remplace la boucle locale avant le train. | CLAUDE.md : ni commit ni push sans demande explicite ; la preuve des phases suivantes ne dépend pourtant que du contenu des paquets, pas de leur publication. |
| **Phase 3 — capacité à reconfirmer** : les 6 000 caractères mesurés en phase 1 sont reconfirmés avec la police publiée de chaque pack lors du rendu (phases 4 et 5) ; si la page se remplit avant la capacité, c'est la hauteur rendue qui refuse (déjà prévu), et la capacité du schéma est abaissée dans une mineure suivante, jamais relevée. | Le schéma borne le texte, la page borne le rendu ; les deux doivent rester cohérents. |
