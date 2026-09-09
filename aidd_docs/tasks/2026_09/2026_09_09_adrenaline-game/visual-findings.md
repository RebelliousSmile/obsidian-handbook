# Adrenaline System — relevé visuel

Source : `Z1L01_Zombiology__1_Contamination_Ldb.pdf`, 254 pages. Les numéros
ci-dessous sont les index PDF, afin que les constats restent reproductibles même
quand le folio imprimé diffère.

## Pages vérifiées

| Pages PDF | Élément observé | Registre retenu |
| --------- | ---------------- | --------------- |
| 10, 20, 40, 70, 90 | Pages courantes, encadrés et tableaux sur papier clair | light |
| 110, 190, 250 | Ouvertures et pages complètes rouge-noir à texte clair | dark |
| 253 | Page de fin mêlant panneau sombre, papier et encadrés | articulation des deux registres |
| 254 | Feuille de PJ : grille, bandeaux, cadres et densité fonctionnelle | anatomie des fiches |

## Vocabulaire Adrenaline retenu

- Papier clair chaud et peu saturé, encre presque noire, rouge brun pour les
  bandeaux et rouge-orange pour l'accent.
- Fond sombre brun-noir, panneaux bordeaux et texte ivoire ; l'orange devient
  l'accent de lecture, jamais une grande surface lumineuse.
- Titres condensés, gras et capitalisés ; texte courant sans serif compact ;
  valeurs techniques alignées et plus denses que la prose.
- Angles francs, filets fins, bandeaux pleins et alternance de panneaux. Les
  irrégularités de papier sont reproduites par de légers dégradés CSS, pas par
  une page extraite.
- Substituts déjà redistribués par Handbook : `Fira Sans Extra Condensed` pour
  l'affichage, `Roboto` pour le texte et `Courier Prime` pour les notes
  techniques.

## Éléments Zombiology exclus

- Logos Zombiology et Contamination, silhouettes d'infectés, photographies,
  portraits, taches organiques et pictogrammes propres à l'infection.
- Pages, textures bitmap et fontes incorporées au PDF.
- Jaune de signalétique et symboles biologiques lorsqu'ils portent un sens
  propre à la contamination plutôt qu'une fonction générique de hiérarchie.

## Tokens mesurés et ajustés

Les valeurs sont des équivalents numériques échantillonnés puis ajustés pour le
contraste à l'écran ; elles ne prétendent pas être les encres d'impression.

| Rôle | Light | Dark |
| ---- | ----- | ---- |
| fond principal | `#F0EAE1` | `#160D0B` |
| fond secondaire | `#E2D7CB` | `#2B1210` |
| encre | `#211A18` | `#F4E9DF` |
| encre atténuée | `#655A55` | `#C9B8AD` |
| accent | `#9D2416` | `#F05A32` |
| bandeau | `#71170F` | `#71170F` |

## Vérification finale

Les témoins rendus ont été réunis sur une planche HTML utilisant les classes DOM
et les règles CSS du plugin, puis capturés avec Chromium à 984 px et 234 px. Les
captures temporaires n'embarquent aucun actif extrait du livre.

| Témoin | Largeur | Polarité | Résultat observable | Correction |
| ------ | ------- | -------- | ------------------- | ---------- |
| PJ | desktop | light | Les cinq régions restent hiérarchisées, la grille de caractéristiques tient sur une ligne. | aucune |
| PJ | desktop | dark | Bandeau et panneaux restent contrastés sans modifier la géométrie. | aucune |
| PJ | étroite | light | Les régions passent en une colonne et les huit caractéristiques restent lisibles sur deux colonnes. | aucune |
| PJ | étroite | dark | Aucun texte ni filet ne déborde du cadre à 234 px. | aucune |
| PNJ | desktop | light | Présentation, statistiques, santé, compétences et équipement gardent leur ordre de lecture. | aucune |
| PNJ | desktop | dark | Le rôle et le danger restent visibles dans le bandeau, les panneaux conservent leur contraste. | aucune |
| PNJ | étroite | light | La grille se replie en une colonne sans zone vide ni chevauchement. | aucune |
| PNJ | étroite | dark | Les libellés restent lisibles sans défilement horizontal. | aucune |
| Monstre | desktop | light | Détection et comportement précèdent statistiques, santé et capacités comme prévu au wireframe. | aucune |
| Monstre | desktop | dark | Le niveau de danger et les informations de confrontation restent immédiatement repérables. | aucune |
| Monstre | étroite | light | Les deux colonnes deviennent une pile continue, sans rupture de bordure ni débordement. | aucune |
| Monstre | étroite | dark | Toutes les régions visibles gardent contraste et rythme à 234 px. | aucune |

## Correction de fidélité — fiches publiées

Références ajoutées le 2026-09-09 :

- `Zombiology_Feuille_de_personnage_pretires_v1.pdf`, six feuilles PJ ;
- `Z1L05_Livret PNJ et animaux.pdf`, vingt pages de profils PNJ et animaux.

Ces références imposent plus que la palette initiale. La fiche PJ suit l'ordre
compétences, identité/caractéristiques, équipement, santé, avec des sections
pleine largeur et une densité tabulaire. Les PNJ et monstres suivent une carte
verticale étroite, sans gouttières entre sections, ouverte par le nom et le
niveau de danger. Le bloc `[meta]` appartient au transport Lantern : il reste
lu et copié, mais son contenu n'est plus imprimé par Handbook.

Les couples de couleurs retenus dépassent WCAG AA : ivoire sur bordeaux
(`10.89:1`), encre sur panneau clair (`15.75:1`), encre brune sur bandeau taupe
(`8.73:1`), ivoire sur bandeau taupe sombre (`10.72:1`) et ivoire sur panneau
sombre (`14.68:1`).
