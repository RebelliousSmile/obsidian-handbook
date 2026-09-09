# Adrenaline — extraction de placement

Statut : brouillon local, non figé. Cette matière complète le game pack
existant ; elle ne crée pas un second contrat de design global.

## Provenance

- PJ : `Zombiology_Feuille_de_personnage_pretires_v1.pdf`, pages PDF 1 à 6.
- PNJ et animaux : `Z1L05_Livret PNJ et animaux.pdf`, pages PDF 4 à 18.
- Extraction visuelle : 2026-09-09.
- Consommateurs détectés : `src/games/adrenaline.ts` pour les couleurs et
  `src/styles/adrenaline/` pour la géométrie des trois fiches.

## Foundations

| Élément | Décision malléable | Évidence |
| ------- | ------------------- | -------- |
| Palette | bordeaux profond, ivoire chaud, sous-bandeau taupe | commun aux feuilles PJ et aux cartes PNJ |
| Type | `Fira Sans Extra Condensed` pour les titres, `Roboto` pour le corps | capitales condensées et texte sans serif compact |
| Icônes | aucune dans les fiches ; Lucide outline si un contrôle générique l'exige | les pictogrammes visibles sont propres à Zombiology |
| Angles | francs, bordure fine, aucune ombre | cadres imprimés sans élévation |

## Responsive strategy

- PJ large : deux colonnes pour formations/compétences, régions structurelles
  pleine largeur et santé physique/mentale côte à côte.
- PJ étroit : une colonne ; chaque groupe de santé se replie sans débordement.
- PNJ et monstre : carte verticale de `34rem` maximum, centrée ; chaque section
  reste pleine largeur à toutes les tailles.
- Rupture conservée à `520px`, prouvée par le composant Handbook existant et
  vérifiée dans le harnais ; les PDF imprimés ne définissent aucun breakpoint.

## Component inventory candidat

| Composant candidat | Anatomie | Fonds | Avant-plans |
| ------------------ | -------- | ----- | ----------- |
| Fiche PJ | bandeau identité, formations/compétences, caractéristiques, équipement, santé | `background-primary`, `adrenaline-panel`, `adrenaline-section-band`, `adrenaline-band` | `text-normal`, `adrenaline-section-band-ink`, `adrenaline-band-ink` |
| Carte PNJ | bandeau nom/danger, présentation, caractéristiques, santé, compétences, équipement | mêmes fonds | mêmes avant-plans |
| Carte monstre | bandeau nom/danger, confrontation, caractéristiques, santé, capacités | mêmes fonds | mêmes avant-plans |

Cet inventaire est candidat et malléable ; il ne constitue pas un manifeste
figé.

## Open questions

- Les dés de stress, malus et blessures encaissées sont volontairement exclus
  du schéma publié : ils représentent un état de partie, pas le document de
  personnage. Aucune issue de schéma n'est nécessaire pour ce point.
- Les illustrations, logos, textures et pictogrammes des PDF restent exclus des
  actifs Handbook.
- Le profil mobile-first/a11y/no-emoji optionnel n'est pas injecté sans demande
  explicite ; le rendu conserve néanmoins ses contrôles responsive et AA.
