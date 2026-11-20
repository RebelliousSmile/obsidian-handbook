# Inventaire des pages papier (phase 1, tâche 1)

Relevé le 2026-11-20 sur les PDF de référence nommés au plan (nombre de pages et formats lus avec `pypdf`, contenu lu sur des rendus `pdftoppm`) et sur les aperçus de Lantern.

## Constat qui change la phase 2

Le plan dit « maximum A4 par page ». Les feuilles publiées n'ont **pas toutes le même format de page** :

| Feuille | Format de page |
| ------- | -------------- |
| Adrenaline PJ (AS02, AS03, Z1A03) | 601 × 780 pt (portrait, plus étroit que A4) |
| Otherscape (3 PDF) | Letter paysage 792 × 612 pt (une démo contient aussi du Letter portrait 792 × 1224) |
| Masques, The Sprawl (livrets) | A4 paysage |
| Urban Shadows (livrets) | Letter portrait |
| Monsterhearts | A4 paysage (antisèche) ; aucune feuille de livret à plusieurs pages |

Conséquence : l'export PDF ne peut pas poser un seul `@page` A4. Il faut une **taille de page par fiche** (`@page` nommées, une par format) lue de la présentation publiée, jamais un format en dur dans Lantern. « A4 au plus » reste la règle de découpage (aucune zone ne dépasse la feuille papier), pas le format du PDF.

## Une ligne par fiche

| Fiche (cible Lantern) | Référence papier | Pages | Recto / verso | Zones par page | Aperçu actuel |
| --------------------- | ---------------- | ----- | ------------- | -------------- | ------------- |
| Adrenaline `pj` | `AS03` / `Z1A03` (2 pages) ; `AS02` en est la variante à 1 page | 2 | page 1 = recto, page 2 = verso | Page 1 : compétences, caractéristiques et stress, équipement, santé, malus. Page 2 : nom du PJ, paramètres du jeu, PX, identité (carte d'identité, contraintes), historique, personnalité, portraits, et une case « Notes » papier | Une seule mise en page continue (`PjPreview`) : à **découper** en deux pages |
| Otherscape `character` | `Otherscape - Fillable Character Sheets [FINAL].pdf` (4 pages Letter paysage) | 2 proposées | — | Page 1 : nom, Upgrades, Tag combos, Loadout. Page 2 : grille des cartes de thème (4 cartes par feuille papier) | Une seule carte `os-character` : à **découper** ; la feuille papier est un autre document (Essence, Evolution) que le contrat de Lantern, donc le découpage suit le contrat |
| Masques `masks-playbook` | `Masques-Livrets (1).pdf` (20 pages A4 paysage = 10 livrets × 2) | 2 | recto, verso | Déclarées par `schema-pbta` (`faces` : `recto`, `verso`) | Déjà deux faces (`data-face`) : cas d'épreuve |
| The Sprawl `the-sprawl-playbook` | `The Sprawl VF - Livrets personnages v1.1.pdf` (20 pages A4 paysage = 10 × 2) | 2 | recto, verso | Faces déclarées par `schema-pbta` | Déjà deux faces (`data-face`) |
| Monster of the Week `monster-of-the-week-playbook` | **aucune** (pas de dossier `monster-of-the-week` côté RPG) | 2 | recto, verso | Faces déclarées par `schema-pbta` | Déjà deux faces (`data-face`) : le livret suit les faces du pack |
| Urban Shadows `urban-shadows-playbook` | `US-Playbooks-PrinterFriendly-20250325.pdf` (24 pages Letter portrait = 12 × 2) | 2 | recto, verso | Groupes `recto` / `verso` déclarés par `schema-pbta` ; le verso papier porte déjà un cadre « Gear & notes » | Déjà deux faces (`data-face`) |
| Monsterhearts `monsterhearts-playbook` | Aucune feuille de personnage à pages : `monsterhearts_antiseche_joueurs_10.pdf` (1 page A4 paysage, aide de jeu, à la racine de `_sources/`) et `fiches-de-ref.pdf` (3 pages A4 portrait) | 1 | — | Le contrat publie des groupes `identity` / `playbook` / `relationships` / `state` / `editorial`, pas de `recto` / `verso` | Un seul bloc continu, qui tient sur une page : pas de découpage, page de notes seule ajoutée |
| `playbook` générique (`pbta`) | aucune | 1 | — | Aucune face déclarée | Un seul bloc ; page de notes seule ajoutée |
| Salvage Run | alias du générique | hérite | hérite | hérite | hérite du `playbook` |

## Décisions de cette tâche

- **Adrenaline PJ : la référence est la feuille à deux pages (`AS03` / `Z1A03`).** Le contrat `pj` place déjà la section « Identité » (carte d'identité, contraintes, historique, personnalité) en dernier et repliable : elle correspond à la page 2 de la feuille, tandis que l'en-tête et les sections compétence à santé correspondent à la page 1. `AS02` (1 page) est la variante sans identité : une fiche dont l'identité est vide s'exporte en une page avant les notes.
- **La case « Notes » du papier (page 2) n'est pas la page de notes de partie** : la page de notes est une page à part, toujours la dernière (décision du plan), donc la 3e page d'Adrenaline PJ.
- **Pages déclarées par le schéma, pas par Lantern** : pour les livrets PbtA qui déclarent déjà des faces, la liste de pages est celle des faces ; pour Adrenaline PJ et Otherscape, la phase 3 les ajoute aux métadonnées de présentation.
- **Monster of the Week** : aucune référence papier ; il suit les faces que `schema-pbta` déclare.

## À faire dans les phases suivantes

- Phase 2 : `@page` nommées par fiche (format lu de la présentation), au lieu d'un `@page` A4 unique.
- Phase 3 : le contrat de pages doit porter, par page, son identifiant, son libellé et son format de feuille.
- Phases 4 et 5 : découpage d'Adrenaline PJ (deux pages) et d'Otherscape (deux pages) ; Monsterhearts et le `playbook` générique restent à une page avant la page de notes.
