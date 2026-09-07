# CLAUDE.md — obsidian-handbook

Dépôt autonome depuis le **2026-09-07**. Objectif : développer le plugin comme on l'entend, les trois déclinaisons de jeu complètes. **Plus aucune PR vers l'amont.**

## Identité du projet

- Plugin Obsidian **Handbook** (`id: obsidian-handbook`), thème + outils pour les JDR de Son of Oak : City of Mist, Legend in the Mist, :Otherscape.
- Fork de **Brumes** (`4rtamis/obsidian-brumes`), MIT, détaché le 2026-09-07. Le copyright d'origine reste dans `LICENSE`, l'origine est créditée dans le README.
- Version : `2.0.0-beta` héritée de l'amont — le versionnement est désormais notre affaire, un renumérotage propre reste à faire. `minAppVersion: 1.12.7`.
- Stack : TypeScript + SCSS, bundle esbuild (`esbuild.config.mjs`), lint ESLint (dont `eslint-plugin-obsidianmd`).
- Gestionnaire de paquets : **pnpm** (`pnpm-lock.yaml` fait foi ; `package-lock.json` traîne encore et devrait disparaître).

### Nommage : ce qui a changé et ce qui n'a pas bougé

Renommé : `manifest.json` (`id`, `name`, `author`, `authorUrl`), `package.json` (`name`, `author`), le README, et les seules chaînes **visibles par l'utilisateur** dans `src/` (sous-menu contextuel, Notices, préfixe de log).

**Pas renommé, et à ne pas renommer** :

- le préfixe CSS `brumes-*` et la classe de body `brumes--<mode>` — des centaines d'occurrences, aucun gain, et les presets `themes/*.settings.json` déjà importés chez l'utilisateur s'y appuient ;
- les identifiants TypeScript (`BrumesPlugin`, `BrumesSettings`, `BrumesBlock`…) ;
- **les clés de `features.*`** — elles sont écrites dans le `data.json` de l'utilisateur (`storyThemeParser` désigne toujours `theme-card`).

### Structure

| Chemin | Rôle |
| --- | --- |
| `src/main.ts`, `src/BrumesPlugin.ts` | entrée et classe du plugin |
| `src/features/` | `blocks` (registre), `callouts`, `comDangers`, `comThemeCards`, `modes`, `storyThemes`, `tags` |
| `src/views/` | `LanternView.ts`, `lanternLogo.ts` |
| `src/settings/` | onglet de réglages, `borderPresets.ts`, types |
| `src/styles/` | SCSS par jeu (`city-of-mist/`, `legend-in-the-mist/`, `otherscape/`) + `styles.scss`, `settings.scss`, `lantern.scss` |
| `src/contextMenu/`, `src/utils/` | menus contextuels, `logger.ts` |
| `themes/` | presets `*.settings.json` |
| `dist/` | artefacts de build : `main.js`, `styles.css`, `manifest.json` |

### Commandes

```bash
pnpm install
pnpm build   # tsc -noEmit -skipLibCheck && esbuild production
pnpm dev     # esbuild --watch
pnpm lint
```

## Topologie git

| Remote | URL | Rôle |
| --- | --- | --- |
| `origin` | `git@github.com:RebelliousSmile/obsidian-handbook.git` | le dépôt, seul à recevoir des push |
| `upstream` | `https://github.com/4rtamis/obsidian-brumes.git` | lecture seule, pour piocher les correctifs de 4rtamis |
| `fork-brumes` | `https://github.com/RebelliousSmile/obsidian-brumes` | l'ancien fork, lecture seule, à supprimer quand il n'a plus d'usage |

`upstream` et `fork-brumes` ont leur push-url à `no_push` : un `git push` dessus échoue exprès. `gh repo set-default` → **`RebelliousSmile/obsidian-handbook`**.

Récupérer un correctif amont reste possible et sans engagement :

```bash
git fetch upstream
git log --oneline master..upstream/master
git cherry-pick <sha>
```

### Cycle de travail

```bash
git switch -c feat/<sujet> master
# modifier src/
rtk proxy pnpm build
# tester dans le vault (voir plus bas)
git add src/ && git commit -m "..."
git push -u origin feat/<sujet>
```

- Une branche = un sujet. Merge dans `master` quand c'est testé ; pas de PR à faire valider par un tiers.
- Messages de commit en anglais (le code et le README le sont).
- **Ne pas commiter `dist/`** : il est dans `.gitignore`, c'est du build local.
- `CLAUDE.md` et `aidd_docs/` ne sont plus masqués : `.git/info/exclude` a été vidé de ses règles de fork le 2026-09-07. Les commiter ou non est un choix ouvert, plus une interdiction.

### Tester sans BRAT

Copier les 3 artefacts dans le vault, puis recharger le plugin (Ctrl+P → *Reload app without saving*, ou toggle off/on dans Community plugins) :

```bash
cp dist/main.js dist/styles.css dist/manifest.json \
   "C:/Users/fxgui/Documents/Perso/.obsidian/plugins/obsidian-handbook/"
```

Le dossier de vault est **`obsidian-handbook/`** depuis le renommage du 2026-09-07. L'ancien `brumes/` y subsiste encore avec son propre `data.json` : tant que les deux plugins sont activés en même temps, ils enregistrent les mêmes processeurs de blocs et posent la même classe de body — désactiver « Brumes » dans Community plugins avant d'activer « Handbook ».

Le vault contient aussi `data.json` (réglages utilisateur) : **ne jamais l'écraser** lors de la copie.

## Conventions de travail

- Ne pas commiter ni pousser sans demande explicite.
- `rtk proxy pnpm build` doit passer et `./node_modules/.bin/eslint src --ext .ts` rester à zéro erreur avant tout merge dans `master`.
- Le versionnement, `versions.json` et les releases nous appartiennent désormais — ce n'est plus « la prérogative de l'amont ».

## Contraintes du code (constatées le 2026-09-06)

### Lint

`./node_modules/.bin/eslint src --ext .ts` sort **à zéro erreur sur 42 fichiers** (mesuré le 2026-09-07). Les trois erreurs préexistantes que documentait ce fichier ont disparu : le critère est bien « lint vert », pas « pas de régression ».

Trois pièges :

- `@typescript-eslint/parser` est importé par `eslint.config.mjs` mais **absent de `package.json`** ; si eslint casse sur `Cannot find module '@typescript-eslint/scope-manager'`, la résolution locale est à réparer dans `node_modules`, pas dans un fichier suivi.
- `pnpm lint` via le runner échoue parfois : appeler `./node_modules/.bin/eslint src --ext .ts` directement.
- `eslint-plugin-obsidianmd` impose la **sentence case** sur les chaînes d'UI, considère `id` comme un sigle (« The older story-theme ID keeps working. ») et **veut abaisser les noms propres** : écrire une description de réglage sans y mettre « City of Mist » plutôt que de désactiver la règle.

### Cible ES basse

`tsconfig.json` vise une lib ES antérieure à ES2017 : **`Object.values` et `Array.prototype.flat` ne compilent pas**. Utiliser `reduce`, `indexOf`, boucles `for…of`.

### Pas de runner de tests

Le dépôt n'a ni vitest ni jest. Pour prouver un parser/renderer : harnais jetable `src/__assert_*.ts` (classe `El` bouchon + faux `Document` avec `createElement`), bundlé par `esbuild.buildSync({platform:'node', format:'cjs', external:['obsidian','fs']})`, exécuté par `node`.

⚠ `pnpm build` lance `tsc -noEmit` sur **tout `src/`** : `rm -f src/__assert_*.ts __assert_*.cjs` **avant** de builder, sinon le build casse sur le harnais.

### SCSS : les partials pèsent des mégaoctets

`src/styles/legend-in-the-mist/_theme-cards.scss` fait ~2,5 Mo (illustrations de cartes en `data:` URI) et `dist/styles.css` ~6,5 Mo. **Ne jamais `cat` ces fichiers** : les lire par `grep -n … -A n` ou `sed -n`. Pour partager la géométrie d'une carte entre partials, extraire un `@mixin` (`theme-cards.frame`) et l'`@include` — jamais recopier les valeurs, jamais dupliquer l'image.

### Registre de blocs

Depuis 2026-09, tout bloc fencé passe par `BrumesBlock<T>` (`src/features/blocks/`) : un format = **une entrée dans `BRUMES_BLOCKS`** + un booléen dans `BrumesFeatureSettings` + un `Setting` dans l'onglet + un partial SCSS. Blocs existants : `theme-card` (alias déprécié `story-theme`), `litm-challenge`, `litm-journey`, `litm-theme-kit`.

Deux règles de compatibilité :

- Renommer un bloc = garder l'ancien id dans `aliases` (le registre logue une dépréciation **une fois par session**, pas par rendu).
- **Ne jamais renommer une clé de `features.*`** : elle est écrite dans le `data.json` de l'utilisateur. `theme-card` garde donc `flag: "storyThemeParser"`.

### rtk

- `rtk pnpm build` part sur `next build` → utiliser **`rtk proxy pnpm <script>`**.
- `rtk git commit` n'accepte ni `-q` ni `-F`, et `rtk proxy git commit -F -` ne reçoit pas stdin → écrire le message dans un fichier et faire `rtk proxy git commit -F <fichier>`.
