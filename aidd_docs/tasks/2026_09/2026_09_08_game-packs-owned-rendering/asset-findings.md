---
phase: 4
---

# Ce que la sortie des assets a mesuré et tranché

## 1. Le poids, mesuré à chaque étape

`dist/styles.css`, produit par `rtk proxy pnpm build`, tailles en Mio :

| Étape | Poids | Écart |
| ----- | ----- | ----- |
| Avant la phase | 6,21 | — |
| Après la sortie des 23 illustrations | 3,67 | −2,54 |
| Après la sortie des deux fontes non redistribuables | **3,47** | −0,20 |

La cible que le plan avait posée était ~3,7 Mio, « le reste étant les polices,
conservées par décision ». Elle est tenue, et légèrement dépassée par la sortie
des deux fontes — laquelle relève de la licence, pas du poids. `dist/styles.css`
ne contient plus aucune `data:image`.

Le chargement différé des fontes par jeu (tâche 3.3) **n'est pas fait** : à
3,47 Mio pour trois jeux, la mesure ne le justifie pas. Onze fontes libres
restent embarquées et servent les trois packs indifféremment.

## 2. La licence de chaque fonte embarquée — *une vérification qui a mordu*

Treize faces étaient embarquées. Onze sont redistribuables sans réserve :

| Fonte | Licence |
| ----- | ------- |
| Averia, Caveat, Caveat Brush, Courier Prime, Labrada | SIL OFL |
| Bebas Neue | Dharma Type, redistribution libre |
| Fira Sans Extra Condensed | Mozilla / Telefónica, OFL |
| IM Fell English, IM Fell Great Primer | Igino Marini, usage libre |
| PT Serif | ParaType |
| Roboto | Apache 2.0 |

Deux ne l'étaient pas, et sont sorties :

- **Frederick Text** (1001Fonts FFC) — « may not be modified », « may not be
  sold or published without written permission ». Aucun fichier de `src/` ne la
  référençait : 92 ko de fonte morte, **supprimée** avec son fichier de licence.
- **PragRoman** (Manfred Klein) — libre d'usage et libre de diffusion, mais
  « cannot be included in any compilation CDs, disks or products ». Une release
  de plugin est un produit. Elle **sort vers le coffre** par le mécanisme
  d'assets, déclarée dans le pack Legend in the Mist comme une illustration
  (`fonts: { PragRoman: { file: "fonts/pragroman.ttf", weight: "500" } }`), et
  `assets/legend-in-the-mist/fonts/pragroman.ttf` est dans `.gitignore`.
  Absente, chaque jeton qui la nomme retombe sur la famille suivante de sa pile.

Cela a exigé du format un champ que la phase 2 n'avait pas prévu : une fonte ne
peut pas être une propriété personnalisée, parce que `@font-face` est global au
document et que son `src:` veut une vraie URL. Le plugin écrit donc les règles
`@font-face` en tête du bloc de jetons, dans l'élément `<style>` qu'il possède ;
elles partent avec lui au changement de jeu.

Reste ouvert, et non tranché ici : `licenses/assets/SonOfOak.LICENSE.txt` porte
un `FIXME` sur les illustrations dérivées des ouvrages Son of Oak — exactement
les fichiers que cette phase a extraits. L'extraction ne change pas leur statut
de distribution, mais elle rend possible de publier sans eux.

## 3. Les gabarits paramétrés par le pack — *déjà vrai, une lacune corrigée*

La tâche 5 demandait de « faire lire aux renderers de blocs les valeurs du pack
actif plutôt que des constantes de mode ». Relevé sur `src/features/` et
`src/views/` : **aucune couleur hexadécimale, aucune `data:image`, aucun `url(`
dans un fichier `.ts`**. Les renderers n'émettent que des noms de classes
(`brumes-story-theme--might-<niveau>`), et le pack les atteint par les variables
CSS. La seule constante de jeu qui subsiste est le champ `mode:` des
descripteurs de blocs, qui déclare à quel jeu un bloc appartient — une
appartenance, pas un visuel codé en dur. Le contrat `BrumesBlock<T>` et
`BRUMES_BLOCKS` sont donc inchangés, comme la tâche 5.2 l'exigeait.

Une lacune réelle est apparue sur la tâche 5.3, « un jeu qui ne déclare pas
d'illustration pour un bloc obtient le rendu dégradé, pas une erreur ». La
classe `brumes-missing--<rôle>` n'était posée que pour un rôle **déclaré et
introuvable**. Un pack qui omet un rôle qu'un partial dessine laissait donc
l'ornement en place avec rien derrière : une boîte réservée pour une image qui
ne vient jamais — la « zone vide » que le critère 4 interdit. Corrigé :

- `styledAssetRoles()` construit le catalogue comme l'union des rôles déclarés
  par tous les packs, plutôt qu'une liste tenue à la main ;
- `missingAssetRoles()` pose la classe pour tout rôle du catalogue sans fichier
  derrière, qu'il ait été déclaré ou non ;
- `_fallbacks.scss` est scopé comme les règles qu'il dégrade : un ornement de
  note porte la classe de son jeu, un nœud de canvas n'en porte aucune, comme
  son partial. Sans ce scope, poser tout le catalogue aurait ajouté des
  ornements là où aucun n'existait.
