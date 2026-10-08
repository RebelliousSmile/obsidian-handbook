# CLAUDE.md — obsidian-handbook

Plugin Obsidian **Handbook** (`id: obsidian-handbook`) : thèmes et blocs pour City of Mist, Legend in the Mist, :Otherscape et Adrenaline System (plus les packs PbtA). Fork de **Brumes** (`4rtamis/obsidian-brumes`, MIT) détaché le 2026-09-07 : dépôt autonome, **plus aucune PR vers l'amont**.

## Mémoire détaillée

Ce fichier ne garde que les règles d'action. Le raisonnement, l'historique et les pièges détaillés vivent dans `aidd_docs/` — à lire quand on touche au sujet :

| Sujet | Fichier |
| --- | --- |
| Packs de jeu, polarités, `overrides.json`, illustrations, format d'apparence | `aidd_docs/memory/internal/game-packs.md` |
| Couverture PbtA (projetée / alias / `unresolved`), métadonnées `schema-pbta` | `aidd_docs/memory/internal/pbta-coverage.md` |
| CI, épingles de producteur, version de release, historique des tags | `aidd_docs/memory/internal/ci-and-release.md` |
| Superviseur sous Windows | `aidd_docs/memory/internal/supervisor-windows.md` + `doc/supervisor.fr.md` |
| Harnais d'assertion (motif de bundling, pièges) | `aidd_docs/memory/internal/assertion-harnesses.md` |
| Ajouter ou modifier un format de bloc | `aidd_docs/guidelines/schema-design.md` |
| Décisions d'architecture (ADR) | `aidd_docs/memory/internal/decisions/` |

## Stack et structure

- TypeScript + SCSS, bundle esbuild (`esbuild.config.mjs`), ESLint (dont `eslint-plugin-obsidianmd`). `minAppVersion: 1.12.7`.
- **pnpm seul** (`packageManager: pnpm@10.5.2`). `pnpm-lock.yaml` est le seul lockfile suivi ; aucun outil ne lit `package-lock.json`.

| Chemin | Rôle |
| --- | --- |
| `src/main.ts`, `src/BrumesPlugin.ts` | entrée et classe du plugin |
| `src/features/` | `blocks` (registre `BRUMES_BLOCKS`), familles de blocs, `osThemes`/`osChallenges`/`osCharacterCreation`, `adrenaline*`, `pbta` |
| `src/games/` | un jeu = un pack de données : `registry.ts`, `types.ts`, `tokens.ts`, `assets.ts`, `overrides.ts`, `fromSchema.ts`, `customPacks.ts` + un fichier par jeu |
| `src/settings/` | `index.ts`, `canvasSnippets.ts`, `types.ts` — rien d'autre |
| `src/styles/` | SCSS par jeu + transversal |
| `src/views/`, `src/contextMenu/`, `src/utils/` | vue Lantern, menus, `logger.ts` |
| `assets/` | illustrations à déposer dans le coffre, un dossier par jeu |
| `corpus/` | `temoins/` (doivent passer), `refus/` (doivent être rejetés) — les deux moitiés sont nécessaires |
| `tools/` | harnais `assert:*` et superviseur — linté par `pnpm lint` |
| `schemas/appearance/` | contrat `GamePack`, propriété de Handbook |

## Commandes

```bash
pnpm install
rtk proxy pnpm build   # tsc -noEmit sur TOUT le dépôt + esbuild
pnpm lint              # eslint . (inclut tools/)
./node_modules/.bin/eslint src --ext .ts
pnpm check             # la porte complète, dont tous les assert:*
pnpm assert:<nom>      # un harnais seul (voir package.json)
pnpm dump:dom          # DOM des corpus canoniques, à comparer d'une phase à l'autre
pnpm supervise         # superviseur multi-dépôts (doc/supervisor.fr.md)
pnpm supervise worktree ../train   # worktrees pour un train à côté d'un autre travail, puis --root ../train
```

Pas de vitest/jest et pas question d'en ajouter : les preuves sont des harnais `tools/<nom>.mjs` + `tools/<nom>.harness.mts`, bundlés par esbuild. Aucune dépendance neuve (`tsx` inclus).

## Règles de travail

- **Tout se fait sur `main`** (`.codex/rules/00-architecture/0-main-only-execution.md`) : pas de branche, pas de worktree à la main.
- **Seule exception : les worktrees du superviseur.** Un autre travail en cours (un autre plan) bloque un train, qui veut des checkouts propres. `pnpm supervise worktree <dir>` crée un worktree détaché par dépôt ; on prépare alors le travail du train dedans et on lance chaque commande avec `--root <dir>` (détail : `doc/supervisor.fr.md`). Ils se poussent toujours sur `main` (`HEAD:main`). Ne jamais les créer par `git worktree add` direct, ni créer de branche ; ne jamais en supprimer sans demande (`git worktree remove` est un geste de l'utilisateur).
- Quand on travaille dans un tel worktree, les chemins relatifs, `pnpm build` et `pnpm check` s'y exécutent ; le coffre de test et `dist/` se déploient depuis lui, pas depuis le checkout habituel.
- Ne pas commiter ni pousser sans demande explicite. Messages de commit en anglais. Ne jamais commiter `dist/`.
- Avant tout commit : `rtk proxy pnpm build` vert **et** les deux portées de lint à zéro erreur (`eslint src --ext .ts` et `pnpm lint` — aucune ne fait foi seule).
- **Flux inter-dépôts** (`.codex/rules/00-architecture/0-cross-repo-contract-flow.md`) : contrat et sémantique de présentation vivent dans les paquets `schema-*` ; étendre le schéma **avant** le travail consommateur et le **publier avant** de l'adopter ; menus pilotés par les métadonnées publiées ; aucun repli sémantique local.
- **Tolérance asymétrique** envers l'amont : un ajout amont non encore branché est un constat (build vert) ; une régression de ce que Handbook *déclare*, ou une incohérence interne d'un tarball épinglé, est un échec dur. Les compteurs sur les déclarations de Handbook restent des égalités, ceux sur les corpus amont des planchers.
- Une exigence qui porte sur un checkout propre (CI) s'affirme par un `assert:*` : les workflows ne tournent jamais en local.
- **Une garde affirme un rôle, jamais un chiffre** : une validation lit la version, l'épingle ou le tag dans la source qui les déclare ; `pnpm assert:guards-by-role` refuse le littéral (`doc/supervisor.fr.md`, « Ce qu'une garde peut attendre d'un train »).
- **Une preuve verte n'est pas refaite** : `present`/`ship` reprennent (`reused`) les validations d'un dépôt dont l'arbre, les paquets de ses fournisseurs, les commandes et Node n'ont pas changé ; `--fresh` rejoue tout (`doc/supervisor.fr.md`).
- **Un échec du superviseur se lit dans le journal complet** que nomme la ligne `Whole output:` (`<git-dir>/supervisor-logs/<train>/`), jamais dans la fin de sortie reprise par le rapport.
- Vérifier une phase terminée, c'est croiser son fichier **et** le tableau Decisions du `plan.md`.

## Nommage : ne pas renommer

Renommés : `manifest.json`, `package.json`, README, chaînes visibles de `src/`. **Restent tels quels** : préfixe CSS `brumes-*` et classe de body `brumes--<mode>`, identifiants TS (`BrumesPlugin`, `BrumesBlock`…), et **les clés de `features.*`** (écrites dans le `data.json` utilisateur ; `storyThemeParser` désigne toujours `theme-card`).

## Packs de jeu (résumé — détail dans `game-packs.md`)

- Le plugin écrit ses variables dans **un seul `<style id="brumes-game-style">`** (`src/features/modes/styleElement.ts`). Style Settings et le thème Border ne sont plus des prérequis.
- Jeu embarqué : `src/games/<jeu>.ts` exportant un `GamePack` + une entrée dans `DECLARED_GAMES`. Rien d'autre.
- Jeu optionnel : `packs/<id>/pack.json` déclaratif (aucun JS/CSS externe), lu au démarrage avant `loadSettings()`. Nom du dossier = id du pack. Collision avec un jeu déclaré → le déclaré gagne.
- Id de pack : minuscules, chiffres, traits d'union (`isValidGamePackId`) — c'est un suffixe CSS et une clé du `data.json`.
- **Un pack déclare ses polarités** ; une couche non déclarée n'est pas écrite. Variantes en sélecteur composé `.brumes--<jeu>.theme-dark`, jamais `.theme-dark` seul.
- Noms de jetons validés à la lecture (`/^--[a-zA-Z0-9-]+$/`, `readPackTokens`) : c'est une frontière d'injection CSS, ne pas l'assouplir.
- Illustrations nommées **par rôle**, résolues dans `<plugin>/assets/<id>/` ; un rôle absent dégrade, ce n'est pas un bug.
- Les polices **ne sont plus embarquées** : chaque pack `schema-in-the-mist/handbook/<id>` publie ses WOFF2 et son `styles/fonts.css`. `assert:mist-font-packs` impose `dist/styles.css` < 160 000 octets et sans `@font-face`.
- Réglage fin : `<plugin>/overrides.json` (valeurs et `shapes` zone par zone). Aucune dépendance réseau à l'exécution. Format gelé : jamais renommer ni supprimer un champ sans chemin de lecture de l'ancienne forme.
- Un thème de jeu doit fixer `--code-normal` / `--code-background`.
- **Impression (export PDF) : le papier est blanc et clair par défaut** (réglage `printerFriendly`, défaut `true`, classe de body `brumes--printer-friendly` ; à `false` rien n'est forcé : fond de la note et mode sombre conservés). `_print.scss` force le fond de page à `#fff` ; `buildGameStyle` écrit toute couche `dark` sous `@media screen` et réécrit la couche `light` sous `@media print` ; `setBrumesColourSchemeClass` remplace `brumes--colour-dark` par `brumes--colour-light` tant qu'un `.print` est dans le `body`. Une règle sombre statique en SCSS doit rester derrière `.theme-dark` ou `.brumes--colour-dark`, jamais sur le sélecteur nu. Preuve : `pnpm assert:style-scope`.

## Release

- Version unique sur `package.json`, `manifest.json`, `versions.json` et la dernière section de `CHANGELOG.md`, tenue par `pnpm assert:release-version`.
- Bumper par **`pnpm version <x.y.z>`**, jamais à la main. Ne pas rétro-remplir `versions.json`.
- La release passe par le superviseur : `pnpm supervise release --run` (enchaîné par `ship`) pousse le tag `v<x.y.z>` puis lance `release.yml` sur ce **tag**, pas sur `main` — pousser un tag seul ne publie rien. La version et le `CHANGELOG` se préparent avec le changement.
- Workflows : `pnpm install --frozen-lockfile` uniquement (gardé par `assert:ci-install`). Les versions des `schema-*` se lisent dans `package.json`, jamais recopiées en littéral.

## Git

| Remote | Rôle |
| --- | --- |
| `origin` (`RebelliousSmile/obsidian-handbook`, branche **`main`**) | seul à recevoir des push ; `gh repo set-default` pointe ici |
| `upstream` (`4rtamis/obsidian-brumes`, branche **`master`**) | lecture seule (`no_push`), pour `git cherry-pick` des correctifs |
| `fork-brumes` | ancien fork, lecture seule, à supprimer |

## Tester dans Obsidian

Coffres : `C:/Users/fxgui/Documents/Perso/RPG/city-of-mist` et `.../legend-in-the-mist`. **Ne jamais écraser `data.json`.**

```bash
for v in "C:/Users/fxgui/Documents/Perso/RPG/city-of-mist" "C:/Users/fxgui/Documents/Perso/RPG/legend-in-the-mist"; do
  p="$v/.obsidian/plugins/obsidian-handbook"
  cp dist/main.js dist/styles.css dist/manifest.json "$p/"
  mkdir -p "$p/assets" && cp -r assets/city-of-mist assets/legend-in-the-mist "$p/assets/"
done
```

Puis recharger le plugin. Bancs de test à la racine des coffres : `Handbook - Test blocs *.md`, `Handbook - Test canvas *.canvas`.

**Advanced Canvas** : Iceberg (CoM) et Montagne (LitM) n'apparaissent que si `<coffre>/.obsidian/snippets/iceberg.css` / `mountain.css` existent (contenu = `ADVANCED_CANVAS_*_SNIPPET` de `src/settings/canvasSnippets.ts`) **et** sont activés à la main dans *Appearance → CSS snippets*. Dans un `.canvas` écrit à la main, la clé est en camelCase (`"icebergCard"`).

## Pièges du code

- **Cible ES basse** : ni `Object.values` ni `Array.prototype.flat` — `reduce`, `indexOf`, `for…of`.
- **`tsc` couvre `**/*.ts`** : c'est l'extension qui protège un harnais, pas son dossier. Harnais jetables `src/__assert_*.ts` : les supprimer avant de builder.
- `log.warn` est muet par défaut (`logger.ts` démarre à `"error"`) : `log.setLevel("warn")` dans un harnais qui l'affirme.
- Lint : une garde `x is string` réduit `x` à `never` dans la branche négative → capturer `String(value)` avant pour l'interpoler. `obsidianmd` impose la sentence case et traite `id` comme un sigle : reformuler plutôt que désactiver la règle.
- Partager une géométrie SCSS par `@mixin`, jamais par copie de valeurs ni d'image.
- Dépôt déplacé → jonctions pnpm mortes : `rtk proxy pnpm install --config.confirmModulesPurge=false`.

## rtk

- `rtk pnpm build` part sur `next build` → **`rtk proxy pnpm <script>`**.
- `rtk git commit` n'accepte ni `-q` ni `-F` stdin → écrire le message dans un fichier et `rtk proxy git commit -F <fichier>`.
