# État au 2026-09-07 (soir)

## Où on en est

**City of Mist est complet côté code** : `com-theme-card` et `com-danger` sont écrits, compilés, prouvés et installés dans le vault. Reste à les regarder à l'œil, sur la page de test.

⚠ Au premier essai, les blocs s'affichaient en code brut : les artefacts du vault étaient bien les bons (`cmp` identique, `com-theme-card` présent dans `main.js`, `.brumes--city-of-mist .brumes-com-theme-card` présent dans `styles.css`). **Écraser `main.js` pendant qu'Obsidian tourne ne recharge rien** — il faut désactiver/réactiver Brumes, ou recharger l'app.

Fichiers neufs : `src/features/blocks/comThemebooks.ts`, `src/features/comThemeCards/{parser,renderer,block}.ts`, `src/features/comDangers/{parser,renderer,block}.ts`, `src/styles/city-of-mist/_theme-cards.scss` et `_dangers.scss`. Câblage : `registry.ts`, `settings/types.ts` (`comThemeCardParser`, `comDangerParser`), `settings/index.ts`, `_tags.scss` (mixin `burnt`), `city-of-mist/index.scss`. Ajout transversal : option `burnt` dans `renderTagSpan`, qui pose `.brumes-burnt`.

Preuve : deux harnais jetables, **26 assertions** pour la carte de thème et **26** pour le profil de Danger, toutes vertes — supprimés après coup. `pnpm build` passe, `eslint` sort 0 erreur.

### Grammaire de `com-danger`

Relevée dans le MC Toolkit (l. 2210-2300), plus riche que celle arrêtée dans `sources.md` :

- Un spectrum s'écrit `hurt:3` comme dans les livres — `hurt 3` reste toléré. Il se rend par le tag de limite existant, donc le thème visuel CoM ne bouge pas.
- **Immunité** : un spectrum sans maximum (`hurt:∞`, ou `~` / `-` en saisie) ; les statuts qu'on y pose sont ignorés. Rendu `:∞`.
- **Countdown spectrums** : section `COUNTDOWN` à part. Le livre les distingue des spectrums de défaite (« STEP 2: CHOOSE SPECTRUMS » les sépare) et un countdown déclenche un move quand il sature.
- Moves `soft:`, `hard:`, `custom: Nom > effet`. La custom est marquée à part : c'est une intrusion de MC.

La grille `.brumes-challenge` laissait des vides ; `_dangers.scss` tranche en **multicol** (`columns: 2 12rem` + `break-inside: avoid`) sur la liste de spectrums. À reporter sur `litm-challenge` et `os-challenge` si le rendu convainc.

Branche : **`feat/com-theme-card`**, partie du `master` local. Rien n'est commité.

## Trois écarts à valider

1. **Base de branche.** `upstream/master` n'a pas `src/features/blocks/` — tout le registre est dans la PR #29, encore ouverte. Impossible de brancher depuis l'amont comme le veut la règle du projet. À rebaser sur `upstream/master` une fois #29 mergée.
2. **Clé `attention:` ajoutée à la grammaire.** Le livre joueur (l. 1104) décrit une **Attention track** en face de carte, absente de la grammaire arrêtée dans `sources.md` : une piste de croissance du thème, remise à zéro quand elle est pleine, contre une improvement Le parser la lit, le rendu l'affiche en pied à côté de la piste d'érosion.
3. **`motivation:` n'est pas le mot du jeu.** Un thème Crew porte « a Mystery or an Identity » (l. 3614, 3630-3638, 5632) ; « Motivation » est le vocabulaire :Otherscape. `motivation:` reste **accepté comme alias neutre**, rendu sous le libellé « Mystery or identity », et jamais signalé comme incohérent. Les incohérences ne sont signalées que sur Mythos et Logos.

## Bancs de test dans le vault

Deux notes neuves dans le dossier `RPG/` du vault, sur le modèle de `Brumes - Test blocs LITM` :

- **`Brumes - Test blocs City of Mist`** — 10 cas de carte de thème (Mythos, Logos, sans lettres de question, Extra, Crew, tags brûlés, améliorations, clé incohérente, themebook maison, piste abrégée), 5 cas de profil de Danger (complet, deux écritures de spectrum, immunité, sections optionnelles, erreurs), les cas d'erreur de la carte, un témoin de non-régression du thème (tags inline, 5 callouts), et les bascules de réglages.
- **`Brumes - Test blocs Otherscape`** — constat honnête : aucun bloc, aucun alias de callout, aucun style ; seule la syntaxe de tags inline marche, sans habillage. Les sections `os-theme-card` et `os-challenge` portent déjà leurs exemples et doivent afficher du code brut aujourd'hui.

## Correction à porter dans CLAUDE.md

La section « Lint : la baseline est rouge » est **périmée** : `./node_modules/.bin/eslint src --ext .ts` sort **exit 0, 0 erreur sur 42 fichiers**, et aucune règle n'est désactivée dans `eslint.config.mjs`. Les trois erreurs documentées ont été corrigées entre-temps. Le critère redevient « lint vert ».

## Suite

La déclinaison :Otherscape : palette, fontes OFL inlinées, `os-theme-card`, `os-challenge`. C'est le seul des trois jeux encore vide — `src/styles/otherscape/index.scss` ne contient qu'un `// TODO`.

Bug préexistant repéré en passant, bon candidat à une PR séparée : le réglage **Border preset** affiche `[object DocumentFragment]` en description. Présent en amont (`src/settings/index.ts:91` sur `upstream/master`), pas de notre fait.

## Dépôt

`origin/feat/litm-block-formats` doit rester en place tant que la PR #29 est ouverte. Deux branches locales à supprimer à la main, le classificateur de permissions ayant bloqué la commande : `git branch -d feat/copy-theme-card-as-toml` et `git branch -D feat/story-theme-toml-export`.

## Pièges à ne pas réapprendre

`tsconfig.json` vise une lib antérieure à ES2017 : ni `Object.values`, ni `Array.prototype.flat`, ni `Object.entries`.

Pas de runner de tests. Harnais jetable `src/__assert_*.ts` bundlé par esbuild, lancé par node, **supprimé avant `pnpm build`** qui passe `tsc -noEmit` sur tout `src/`.

`rtk pnpm build` part sur `next build` ; utiliser `rtk proxy pnpm <script>`.

## 2026-09-07 — la couche d'ambiance retrouvée dans la v1

L'historique git est **continu** : `git tag` donne `1.0.0`, `2.0.0-beta`, `2.1.0-beta`, 89 commits, et le commit `f79ebc2 refactor: initialize the refactoring from theme to plugin` marque le passage.

La v1 (`1.0.0`) était un **thème Obsidian**, pas un plugin : `src/scss/index.scss` posait sur `body` l'accent magenta `#e6007e`, tous les rayons à `0px`, les couleurs de cases à cocher et de tags, et `.theme-dark { --background-primary: #2d2040 }` / `.theme-light { --background-primary: #f2f2f0 }`. S'y ajoutaient `window/_ribbon.scss` (ruban `#382859`), `editor/_heading.scss` (titres en majuscules, magenta en sombre) et `editor/_link.scss` (liens neutres, survol magenta).

Le refactor v2 a gardé la typo, les tags et les callouts et **a jeté cette couche entière** — ni `city-of-mist/index.scss` ni `legend-in-the-mist/index.scss` ne repeignent le workspace. C'est une régression amont, pas un choix documenté.

Restaurée dans `src/styles/city-of-mist/_workspace.scss`, derrière la classe `brumes--workspace-theme` posée par `setBrumesWorkspaceThemeClass` et le flag `features.workspaceTheme` (défaut `true`, réglage « Workspace theme » dans la section General). La classe est distincte du mode parce que repeindre toute la fenêtre est un choix séparé de styler les notes.

⚠ Le mixin est inclus **dans** `.brumes--city-of-mist { }` : écrire `&.theme-dark`, jamais `.theme-dark`, les deux classes étant sur `body`. Vérifié dans `dist/styles.css` : `.brumes--city-of-mist.brumes--workspace-theme.theme-dark`.

## 2026-09-07 — cartes et Dangers réalignés sur le langage visuel du dépôt

Constat de l'utilisateur : « ça s'affiche, mais ça ne respecte pas trop l'affichage de City of Mist ». Mesuré dans `_callouts.scss` et la v1, l'idiome CoM est :

| trait | valeur du dépôt |
| --- | --- |
| cadre | `3px solid`, radius `5px` (callout `note`) |
| ombre | `#00000050 0px 0px 8px 1px` (partout) |
| titre imprimé | Fira Sans Extra Condensed 800/900, majuscules |
| texte écrit | Averia Serif Libre (clue, move) |
| lecture à voix haute | Courier Prime (callout `description`) |
| papier | `#e0d9c1`, `#f2e7ae`, `#fdf1aa` |
| accents | `#852d3a`, `#514a49`, `#e6007e` |

Mes cartes utilisaient un vocabulaire étranger (bordure 1px, radius 2px, ombre plate, titres en serif). Corrigé :

- **`com-theme-card`** prend le cadre du callout `note` : bordure 3px, radius 5px, ombre du dépôt. Le **themebook** est imprimé sur la carte → Fira Sans Extra Condensed 900 1.6em majuscules ; le **titre** est écrit par le joueur → Averia Serif Libre. Les weaknesses sont séparées des powers par un filet pointillé, via la nouvelle classe `--tag-power` / `--tag-weakness` posée par le renderer (sélecteur `.--tag-power + .--tag-weakness`, `:first-of-type` ne marche pas, tous les items étant des `li`).
- **`com-danger`** n'est pas une carte : la v1 en faisait un `div.danger`, panneau pastel `hsl(42, 38%, 91%)` posé sur la page par la même ombre, sans bordure, nom souligné 3px en majuscules, sections en Rift/Bebas Kai 1.6em. Repris tel quel, **Bebas Neue** (déjà chargée en CoM, utilisée seulement par `_hashtags.scss`) remplaçant Rift. Variante sombre par variables `hsl` : `--l: 14%`, `--s: 45%`.

## le dépôt s'est détaché (2026-09-07)

Le fork ne remonte plus rien en amont. `RebelliousSmile/obsidian-handbook` a été créé
en dépôt neuf — pas un renommage du fork, pour sortir du réseau de forks sans passer
par le support GitHub — et `master` y a été poussé avec ses 89 commits d'historique.

- `origin` pointe désormais le nouveau dépôt ; `upstream` (4rtamis) et `fork-brumes`
  (l'ancien fork) restent en **lecture seule**, push-url à `no_push`. Garder `upstream`
  ne coûte rien et laisse cherry-picker un correctif amont.
- PR #29 (blocs LitM) fermée avec un mot expliquant la séparation.
- `id: brumes` → `id: obsidian-handbook`, `name` → `Handbook`. Le dossier de vault
  change donc : `data.json` a été recopié dans `plugins/obsidian-handbook/`, l'ancien
  `plugins/brumes/` est intact. **Les deux plugins ne doivent pas être actifs ensemble.**
- MIT oblige : le copyright de 4rtamis reste dans `LICENSE`, une seconde ligne y a été
  ajoutée pour les modifications, et le README crédite l'origine.
- Non renommés délibérément : le préfixe CSS `brumes-*`, la classe de body `brumes--*`,
  les identifiants TypeScript, et surtout **les clés de `features.*`** écrites dans le
  `data.json` de l'utilisateur.
- `.git/info/exclude` vidé de ses règles de fork : `CLAUDE.md` et `aidd_docs/` ne sont
  plus masqués, `pnpm-lock.yaml` non plus.

Ce qui devient notre responsabilité et ne l'était pas : le versionnement, `versions.json`,
les releases et BRAT. La version `2.0.0-beta` est encore celle héritée de l'amont.

## 2026-09-07 (nuit) — audit fichier par fichier de la v1 vers la v2

La note précédente disait « la couche d'ambiance retrouvée dans la v1 ». Elle
était incomplète : `_workspace.scss` reprenait `index.scss`, `_ribbon.scss`,
`_heading.scss` et `_link.scss`, mais personne n'avait comparé les treize
partials de `1.0.0` un à un. Fait maintenant.

### Ce qui était déjà repris

`--font-text: "PT Serif"` et `--h1..h3-font: "Fira Sans Extra Condensed"` ne
manquaient pas malgré les apparences : `index.scss` pose
`--font-text-theme` / `--font-header-theme`, et Obsidian résout
`--font-text: var(--font-text-override), var(--font-text-theme), var(--font-default)`.
La classe de mode étant sur `body` (`setBrumesMode`), la chaîne fonctionne.
Ne pas « réparer » cela.

Repris aussi : rayons à zéro, accent magenta, cases à cocher, ruban, fonds
clair/sombre, titres en majuscules et leurs tailles, magenta des titres en
sombre, `.inline-title` souligné 5px, `svg` à bouts carrés, paddings de menu,
onglet actif sans ergots, les trois callouts (`clue`, `description`, `move`),
et les trois couleurs de marqueur en thème clair.

### Trois régressions corrigées

1. **Marqueurs illisibles en thème sombre.** La v1 avait deux jeux de couleurs
   (`mark.tag` `#fff2ab` le jour / `#7b4a83` la nuit, idem status et spectrum) ;
   la v2 n'avait gardé que le jeu clair. Un tag ne pose pas de `color`, il hérite
   `--text-normal` : en sombre, encre claire sur papier clair. Bloc `&.theme-dark`
   ajouté à `city-of-mist/_tags.scss` avec les trois valeurs de la v1, plus
   `#8d5e35` pour la weakness, qui n'existait pas en v1 (dérivée dans la même
   clé : hsl(28, 45%, 38%)).
2. **Double soulignement des liens internes.** `_workspace.scss` ramenait le
   `border-bottom: solid rgb(72,67,141) 2px` de la v1 alors que `_links.scss`
   souligne déjà en `text-decoration`. Les deux s'additionnaient. Remplacé par
   une variable `--brumes-internal-link-line` qui recolore le trait existant,
   plus le magenta au survol, interne et externe.
3. **Coupure typographique des titres perdue.** La v1 imprimait h1–h3 en Fira
   Sans Extra Condensed et h4–h6 en PT Serif ; `--font-header-theme` mettant
   les six en condensé, `--h4/h5/h6-font` sont rétablis dans `index.scss`.
   Effet de bord voulu : les cases à cocher à lettres suivent `var(--h6-font)`
   et rejoignent la lettre imprimée, déjà en PT Serif.

Build vert, eslint à zéro, artefacts recopiés dans le vault.

### Deux écarts laissés ouverts, ils demandent une décision

- **Les huit teintes de papier du profil de Danger.** La v1 offrait
  `div.danger.bg0` à `.bg7`, huit fonds `hsl` — le MC Toolkit n'imprime pas tous
  ses Dangers sur le même papier. La v2 fige les valeurs de `bg1`
  (`hsl(42, 38%, 91%)`). Les rétablir veut dire une clé `tint:` dans la
  grammaire de `com-danger`, donc une **quatrième extension** hors
  `schema-in-the-mist` (après `secrets`, `is_countdown`, `on_max`), et une
  décision sur ce que l'export TOML en fait.
- **L'inclinaison des cartes d'iceberg.** La v1 posait `rot1`…`rot-5`, cinq
  degrés dans chaque sens, plus le nettoyage du chrome de canvas
  (`.canvas-group-label { display: none }`, `--shadow-stationary: none`,
  bordures à zéro) et un fond de `.media-embed` propre au thème sombre. La v2 a
  **réécrit** l'iceberg pour le plugin Advanced Canvas (`data-iceberg-card`) au
  lieu de canvas-css-class, et n'a pas reporté l'inclinaison. Ce n'est pas un
  oubli mécanique : il faudrait un second attribut de nœud, donc une entrée de
  plus dans le snippet `@advanced-canvas-node-style`.

## 2026-09-07 (nuit) — cartes d'iceberg réparées, et la montagne existait déjà

### Ce que la réécriture Advanced Canvas avait perdu

La v1 stylait un canvas entier (classe `.iceberg` posée par le plugin *canvas-css-class*) ;
la v2 style un nœud à la fois (attribut `data-iceberg-card` posé par Advanced Canvas).
Le changement de portée explique la plupart des pertes. Restauré dans
`src/styles/city-of-mist/_iceberg.scss` :

- **l'inclinaison.** La v1 la choisissait à la main (`rot1`…`rot-5`, dix classes).
  Advanced Canvas ne pose qu'un attribut par nœud, donc l'angle est tiré du rang du
  nœud parmi ses frères : `:nth-child(7n+1)` … `7n+7`, sept angles entre −2,4° et +2,1°.
  Stable pour un canvas donné, rien à régler.
  ⚠ **à vérifier au test** : si les cartes changent d'angle quand on en sélectionne une,
  c'est qu'Obsidian réordonne le DOM à la sélection — il faudra alors une seconde clé
  `@advanced-canvas-node-style` (`key: iceberg-tilt`) plutôt qu'un `nth-child`.
- **le retour de sélection.** `border: none` sur `.canvas-node-container` privait la carte
  sélectionnée de tout signe : `.is-focused` reprend un liseré de 2px à l'accent.
- **les barres de défilement**, que la v1 masquait et qui traversent sinon l'illustration.
- **la plaque d'illustration en thème sombre** : `var(--background-secondary)` au lieu du
  gris `#515151`, comme en v1.

Pas restauré, et c'est délibéré : `.canvas-group-label { display: none }`,
`.canvas-node-group .canvas-node-content { background-color: transparent }` et
`--shadow-stationary: none` sur `.canvas-wrapper` étaient des règles **de canvas entier**.
Sans classe de canvas en v2, les reprendre restylerait tous les canvas du coffre.
L'ombre, elle, est déjà remplacée par `--shadow-stationary` posé sur le nœud iceberg.

### La montagne : question déjà résolue avant d'être posée

`src/styles/legend-in-the-mist/_mountain.scss` **utilise déjà Advanced Canvas**, exactement
comme l'iceberg : bloc `@advanced-canvas-node-style` avec `key: mountain-card`, quatre
options (*greatness*, *adventure*, *origin*, *standard*), un fond et une icône de puissance
par option, `ADVANCED_CANVAS_MOUNTAIN_SNIPPET` dans `src/settings/borderPresets.ts` et un
réglage « Mountain canvas snippet » avec bouton de copie (`src/settings/index.ts:516`).
Rien à construire.

Un seul défaut corrigé : le sélecteur `.canvas-node-iframe-body[data-iceberg-card] .cm-scroller`
traînait dans le mixin de la montagne — copier-coller depuis l'iceberg, la règle
`scrollbar-gutter` ne s'appliquait donc jamais aux nœuds montagne.

La montagne perd le même retour de sélection que l'iceberg (`border: none`), **non corrigé** :
son conteneur porte un `mask: radial-gradient(...)` qui rognerait tout liseré ou ombre ajoutés.
À trancher en regardant le rendu.

## 2026-09-07 (nuit, suite) — retour de sélection sur les cartes de canvas

Vérifié dans `C:/Program Files/Obsidian/resources/obsidian.asar` plutôt que supposé : Obsidian
signale un nœud choisi par **une seule règle**, portée par le conteneur —

```css
.canvas-node.is-selected .canvas-node-container,
.canvas-node.is-focused .canvas-node-container {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-stationary), var(--shadow-border-accent);
}
```

Deux enseignements :

- **`is-selected` et `is-focused` sont deux états distincts.** Un simple clic ne pose que le
  premier. La règle d'iceberg écrite plus tôt ne couvrait que `is-focused` : elle ne se
  déclenchait donc quasiment jamais. Corrigé, les deux sélecteurs sont là.
- **Un `border: none` sur le conteneur suffit à tuer le signal**, puisque la règle d'Obsidian ne
  fait que *colorer* une bordure existante.

Pour la montagne, un liseré sur le conteneur ne suffisait pas : `mask: radial-gradient(…)` est
posé sur ce même élément, et un masque rogne tout ce que l'élément peint — bordure et ombre
comprises. L'anneau est donc peint par `.canvas-node[data-mountain-card].is-selected::after`,
sur le **nœud**, que le masque (un niveau plus bas) ne peut pas atteindre. `.canvas-node` est
`position: absolute` avec largeur et hauteur posées en style inline par Obsidian, donc
`inset: 0` épouse exactement la carte.

L'iceberg garde son liseré sur le conteneur, et c'est voulu : sa carte est inclinée par
`transform: rotate()` sur ce conteneur, un anneau posé sur le nœud non pivoté encadrerait de
travers une carte penchée.

Corrigé au passage : l'icône de puissance de la montagne passe de `vertical-align: top` à
`-0.4em`. La ligne est en capitales, son centre optique est la hauteur de capitale (≈ 0,7em),
pas la boîte de ligne ; centrer une icône de 1,5em dessus place son pied à 0,4em sous la
ligne de base.

`rtk proxy pnpm build` vert, `eslint src --ext .ts` à zéro, déployé dans les deux coffres.
Reste à l'œil de l'utilisateur : l'anneau ne doit ni décaler ni redimensionner la carte.
