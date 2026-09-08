---
phase: 3
---

# Ce que le format n'a pas pu porter

Écrire `:Otherscape` sans une ligne de SCSS était le test du format, pas l'ajout
d'un jeu. Voici ce qui a résisté, et pour chaque entrée le verdict : **lacune du
format**, corrigée tout de suite pour les trois packs, ou **frontière assumée**,
qui relève légitimement du code.

## 1. Un pack ne pouvait pas apporter sa fonte — *lacune du format, corrigée*

Le pack nomme ses familles dans `--font-text-theme`, `--font-header-theme`,
`--font-monospace-theme`. Rien ne les chargeait. Les `@font-face` vivaient dans
`src/styles/city-of-mist/fonts/` et `legend-in-the-mist/fonts/`, importés par
l'`index.scss` de leur jeu. Or `@font-face` est global au document : `:Otherscape`
« marchait » uniquement parce que City of Mist avait déjà émis les faces. Le jeu
empruntait sans le dire, et le premier jeu qui aurait demandé une fonte absente
serait tombé en fonte système sans erreur.

Deux corrections, aux deux niveaux :

- **Structure** — `src/styles/fonts.scss` rassemble les treize faces, chargé une
  fois par `styles.scss`. Les deux `index.scss` de jeu n'importent plus de fonte.
  Aucun jeu ne dépend plus des imports d'un autre. Vérifié : 34 `@font-face` dans
  `dist/styles.css`, 30 `font-family` distinctes, inchangé avant/après.
- **Format** — `GameAssets.fonts` déclare, par nom de famille tel que les jetons
  l'écrivent, le fichier qui porte la face. Rien ne le résout encore : la phase 4
  le lit avec les images. Le champ est posé maintenant parce que c'est là qu'on a
  constaté le manque, et que la phase 4 s'appuiera sur le format tel qu'il est.

## 2. Le bloc surligné acide derrière un titre noir — *frontière assumée*

La signature typographique du livre : capitales condensées noires posées sur un
pavé jaune-vert. Un pavé n'est pas une couleur : il demande un fond, une
respiration horizontale et un `display` sur l'élément de titre. Ça ne peut pas
être un jeton, et donner au format un moyen de décrire « une boîte autour d'un
titre » revient à réinventer le CSS dans du JSON.

Verdict : hors format. L'acide est donc mappé là où il est déjà une surface —
`--text-highlight-bg` et `--tag-background` — et aucun SCSS n'a été ajouté. Le
jour où un jeu voudra vraiment ce pavé, c'est un gabarit de bloc, pas un jeton.

## 3. La trame de fond des pages — *frontière assumée*

Les pages du livre portent une grille fine et un grain. C'est une image, pas une
couleur, et la déclarer aurait exigé de résoudre un chemin de coffre — précisément
ce que la phase 4 met en place. Rien n'a été fait ici : `assets.images` reste vide
et documenté comme tel dans le pack.

## 4. La triade Self / Mythos / Noise — *aucun manque*

Le livre donne les trois types de thème par leur couleur (rouge, violet, bleu).
Le format les portait déjà sans rien changer : `--brumes-theme-self`,
`--brumes-theme-mythos`, `--brumes-theme-noise`, déclarés dans les deux schémas.
Aucun gabarit ne les lit encore — la phase 4 paramètre la carte de thème avec, au
lieu de coder un jeu en dur dans un partial.

## Conclusion

Une seule vraie lacune, et elle touchait les trois jeux, pas seulement le
nouveau. Les deux autres manques sont des formes, pas des valeurs : le format ne
doit pas apprendre à les décrire. `src/styles/otherscape/index.scss` ne contenait
qu'un `// TODO` ; il est supprimé, et le dépôt ne garde aucun partial pour ce jeu.
