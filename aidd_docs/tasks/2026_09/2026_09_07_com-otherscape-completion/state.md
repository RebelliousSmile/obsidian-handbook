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
