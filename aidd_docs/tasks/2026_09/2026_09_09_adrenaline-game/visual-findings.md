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

À compléter en phase 5 avec les douze combinaisons PJ/PNJ/monstre ×
desktop/étroit × light/dark. Une ligne doit nommer le témoin, la largeur, la
polarité, le résultat visible et la correction éventuelle.
