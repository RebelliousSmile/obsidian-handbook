# CLAUDE.md — obsidian-handbook

Dépôt autonome depuis le **2026-09-07**. Objectif : développer le plugin comme on l'entend, les trois déclinaisons de jeu complètes. **Plus aucune PR vers l'amont.**

## Identité du projet

- Plugin Obsidian **Handbook** (`id: obsidian-handbook`), thème + outils pour les JDR de Son of Oak : City of Mist, Legend in the Mist, :Otherscape.
- Fork de **Brumes** (`4rtamis/obsidian-brumes`), MIT, détaché le 2026-09-07. Le copyright d'origine reste dans `LICENSE`, l'origine est créditée dans le README.
- Version : `package.json` et `manifest.json` portent **`2.1.1`**. `minAppVersion: 1.12.7`.
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
| `src/features/` | `blocks` (registre), `callouts`, `challenges`, `comDangers`, `comThemeCards`, `journeys`, `modes`, `tags`, `themeCards`, `themeKits` |
| `src/games/` | un jeu = un pack de données : `registry.ts`, `types.ts`, `tokens.ts`, `assets.ts`, `overrides.ts`, `fromSchema.ts` + un fichier par jeu |
| `src/views/` | `LanternView.ts`, `lanternLogo.ts` |
| `src/settings/` | `index.ts` (onglet de réglages), `canvasSnippets.ts` (snippets Advanced Canvas), `types.ts` — et rien d'autre |
| `src/styles/` | SCSS par jeu (`city-of-mist/`, `legend-in-the-mist/`, `otherscape/`) + `styles.scss`, `_neutralize.scss`, `_fallbacks.scss`, `settings.scss`, `lantern.scss` |
| `src/contextMenu/`, `src/utils/` | menus contextuels, `logger.ts` |
| `assets/` | illustrations source à déposer dans le coffre, un dossier par jeu |
| `corpus/` | les documents qui prouvent : `temoins/` (doivent passer), `refus/` (doivent être rejetés) |
| `tools/` | les harnais durables et leurs lanceurs — **linté par `pnpm lint`**, voir plus bas |
| `dist/` | artefacts de build : `main.js`, `styles.css`, `manifest.json` |

### Commandes

```bash
pnpm install
pnpm build            # tsc -noEmit -skipLibCheck && esbuild production
pnpm dev              # esbuild --watch
pnpm lint             # eslint . — pas seulement src/
pnpm assert:corpus    # chaque bloc lit un témoin, dégrade un refus, et a sa commande de copie
pnpm assert:override  # overrides.json : surcharger une zone, la retirer, retrouver le rendu d'origine
pnpm dump:dom         # le DOM rendu des six blocs, à comparer d'une phase à l'autre
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
git log --oneline main..upstream/master
git cherry-pick <sha>
```

⚠ **`origin` est sur `main`, `upstream` sur `master`.** Les deux noms cohabitent
et ce fichier a longtemps écrit `master` des deux côtés : une branche partie de
`master` part de rien.

### Cycle de travail

```bash
git switch -c feat/<sujet> main
# modifier src/
rtk proxy pnpm build
# tester dans le vault (voir plus bas)
git add src/ && git commit -m "..."
git push -u origin feat/<sujet>
```

- Une branche = un sujet. Merge dans `main` quand c'est testé ; pas de PR à faire valider par un tiers.
- Messages de commit en anglais (le code et le README le sont).
- **Ne pas commiter `dist/`** : il est dans `.gitignore`, c'est du build local.
- `CLAUDE.md` et `aidd_docs/` ne sont plus masqués : `.git/info/exclude` a été vidé de ses règles de fork le 2026-09-07. Les commiter ou non est un choix ouvert, plus une interdiction.

### Tester sans BRAT

**Un coffre par jeu depuis le 2026-09-07** — le coffre unique `Documents/Perso` ne fait plus foi :

| Jeu | Coffre |
| --- | --- |
| City of Mist | `C:/Users/fxgui/Documents/Perso/RPG/city-of-mist` |
| Legend in the Mist | `C:/Users/fxgui/Documents/Perso/RPG/legend-in-the-mist` |

Les deux sont **imbriqués** dans l'ancien coffre `Documents/Perso`, qui existe toujours et voit les mêmes notes. Déployer dans les deux coffres de jeu, puis recharger le plugin (Ctrl+P → *Reload app without saving*, ou toggle off/on dans Community plugins) :

```bash
for v in "C:/Users/fxgui/Documents/Perso/RPG/city-of-mist"          "C:/Users/fxgui/Documents/Perso/RPG/legend-in-the-mist"; do
  cp dist/main.js dist/styles.css dist/manifest.json      "$v/.obsidian/plugins/obsidian-handbook/"
done
```

Chaque coffre a son propre `data.json` (réglages utilisateur) dans ce dossier : **ne jamais l'écraser** lors de la copie.

Depuis la phase 4, **déployer aussi les illustrations** — sinon les blocs se rendent en dégradé, ce qui n'est pas un bug :

```bash
mkdir -p "$v/.obsidian/plugins/obsidian-handbook/assets"
cp -r assets/city-of-mist assets/legend-in-the-mist    "$v/.obsidian/plugins/obsidian-handbook/assets/"
```

Bancs de test, à la racine de chaque coffre : `Handbook - Test blocs *.md` pour les blocs fencés, `Handbook - Test canvas *.canvas` pour les styles de nœud Advanced Canvas.

### Advanced Canvas : le snippet est un prérequis, pas un détail

Iceberg (CoM) et Montagne (LitM) ne s'affichent **que** si le snippet correspondant est présent **et activé** dans le coffre. Sans lui, Advanced Canvas ne connaît pas le style, ne pose aucun `data-iceberg-card` / `data-mountain-card`, et tout le SCSS est mort — un rendu « rien ne se passe » qui n'a rien à voir avec le CSS.

- Fichiers : `<coffre>/.obsidian/snippets/iceberg.css` et `mountain.css`, noms imposés par le texte des réglages. Contenu = `ADVANCED_CANVAS_*_SNIPPET` de `src/settings/canvasSnippets.ts` (`borderPresets.ts` n'existe plus).
- L'activation se fait à la main dans `Settings → Appearance → CSS snippets` : Obsidian garde `appearance.json` en mémoire et réécrirait toute édition faite pendant qu'il tourne.
- Si le dossier `snippets/` vient d'être créé, Obsidian ne le surveille pas encore : rafraîchir la liste ou recharger l'application.
- Advanced Canvas passe la clé du snippet par `toCamelCase` : `key: iceberg-card` est stocké `"icebergCard"` dans le `.canvas` et ressort en `data-iceberg-card` dans le DOM. Un canvas écrit à la main doit utiliser la forme **camelCase**.

## Packs de jeu : le plugin possède son rendu (depuis le 2026-09-08)

**Style Settings et le thème Border ne sont plus des prérequis.** `themes/*.settings.json` a été supprimé, l'onglet de réglages n'offre plus de bouton de copie de preset. Le plugin écrit lui-même ses variables CSS dans **un unique élément `<style>` qu'il possède** (`src/features/modes/styleElement.ts`, `id: brumes-game-style`) : un seul point d'écriture, donc un seul point de nettoyage, et changer de jeu ne laisse aucun résidu de l'ancien.

### Un jeu est une donnée

Un pack (`src/games/<jeu>.ts`) déclare une identité, des jetons de note et d'interface, en variantes `base` / `light` / `dark`, ses assets, ses `polarities` et, s'il le veut, des `shapes`. **Aucun SCSS n'est écrit pour un jeu neuf** — :Otherscape est né comme ça, sans partial ni classe à lui.

**Un pack déclare ses polarités, il n'en dérive aucune** (`GamePolarity`, `src/games/types.ts`). Une couche non déclarée n'est **pas écrite**, plutôt qu'écrite en copie de `base` — un pack dont le `base` est fortement clair casserait un coffre en thème sombre. Une polarité unique s'écrit sur le sélecteur de mode nu, après `base`, donc elle gagne à spécificité égale quel que soit le réglage du thème ; deux polarités s'écrivent en sélecteurs composés. État au 2026-09-08 : City of Mist et :Otherscape déclarent `["light", "dark"]`, Legend in the Mist `["light"]` — le jeu n'imprime que du parchemin, et le schéma sombre qui existait avait été inventé.

Ajouter un jeu :

1. un fichier `src/games/<jeu>.ts` exportant un `GamePack` ;
2. une ligne dans `DECLARED_PACKS` de `src/games/registry.ts` ;
3. rien d'autre. La liste déroulante des réglages, la classe de body et le style suivent.

Trois règles qui mordent :

- **Les variantes s'écrivent en sélecteur composé** : `.brumes--<jeu>.theme-dark`, jamais `.theme-dark` seul. Les deux classes sont sur le même `body` — à spécificité égale seul l'ordre des feuilles trancherait, et rien ne garantit que la nôtre passe après celle du thème actif.
- **L'identifiant d'un pack est un suffixe de classe CSS et une clé du `data.json` de l'utilisateur** : minuscules, chiffres, traits d'union simples (`isValidGamePackId`). Un pack qui échoue au contrôle est écarté seul, les autres chargent.
- **Le registre est statique par choix.** `domModeClass.ts` calcule `MODE_CLASSES = gamePackClasses()` au chargement du module, et l'onglet de réglages comme `settings/types.ts` consultent le registre chacun de leur côté. Charger des packs depuis le coffre suppose de rendre ces trois points dynamiques — c'est un refactor, pas un ajout. Motif consigné dans `aidd_docs/tasks/2026_09/2026_09_08_game-packs-owned-rendering/schema-boundary.md`.

### Le réglage fin passe par un fichier, pas par des curseurs

`<dossier du plugin>/overrides.json` : un pack amputé de tout sauf des valeurs à changer, qui prend le dessus sur le pack du jeu pour celles-là seulement. Retirer le fichier redonne exactement le rendu du jeu. Une valeur fautive se perd elle-même, journalisée une fois, le reste s'applique.

Il ne porte pas que des valeurs : la clé `shapes` surcharge **la forme d'un bloc, zone par zone** — renommer le libellé imprimé d'une zone (`heading`), en cacher une (`hidden`). Une zone qu'aucune forme ne connaît est signalée une fois par session et le reste charge ; un fichier ne nommant qu'un bloc laisse les cinq autres où ils étaient.

```json
{
	"shapes": {
		"litm-challenge": {
			"threats": { "heading": "Menaces et conséquences" },
			"secrets": { "hidden": true }
		}
	}
}
```

L'aller-retour est **mesuré**, pas constaté à l'œil : `pnpm assert:override` rend un témoin sans fichier, avec, puis sans, et compare caractère par caractère. Un œil ne distingue pas « identique » de « presque identique ». La commande « Reload illustrations and personal overrides » relit le fichier sans recharger le greffon.

### Les illustrations vivent dans le coffre

Le pack les nomme **par rôle**, jamais par image : `assets.images["iceberg-group"] = "iceberg-group.svg"`, et le SCSS lit `var(--brumes-image-iceberg-group)`. Résolution dans `<dossier du plugin>/assets/<id du pack>/` sauf si le pack déclare un `root`. Un rôle absent **dégrade** — le gabarit se rend à plat, il ne réserve pas une boîte pour une image qui ne vient pas (`missingAssetClass`, `_fallbacks.scss`). L'onglet de réglages liste les fichiers manquants du jeu actif.

Les **polices restent embarquées** (libres, redistribuables) ; seules les illustrations sortent. `dist/styles.css` est passé de 6,21 Mo à **3,64 Mo**, dont l'essentiel est désormais les fontes.

### Le format est publié, mais rien ne le télécharge

Le schéma vit dans le dépôt frère `schema-in-the-mist`, en `appearance/game-pack.schema.json`, à côté des schémas de contenu et **sans partager un seul champ** avec eux (`meta` volontairement absent). `src/games/fromSchema.ts` lit un document de cette forme et écrit un pack.

**Aucune dépendance à l'exécution** : ni fetch, ni import du dépôt distant. Le contrat est honoré par la forme de la donnée. Un pack charge réseau coupé.

Le format est **gelé** : un champ ne se renomme et ne se supprime jamais sans un chemin de lecture de l'ancienne forme. Un champ inconnu laisse un avertissement **une fois par session**, pas un par rendu.

## Conventions de travail

- Ne pas commiter ni pousser sans demande explicite.
- `rtk proxy pnpm build` doit passer et **les deux portées de lint** rester à zéro erreur avant tout merge : `./node_modules/.bin/eslint src --ext .ts` **et** `pnpm lint`.
- Le versionnement, `versions.json` et les releases nous appartiennent désormais — ce n'est plus « la prérogative de l'amont ».

## Contraintes du code (constatées le 2026-09-06)

### Lint

**Le lint a deux portées, et elles ne couvrent pas la même chose** (vérifié le 2026-09-08) :

- `./node_modules/.bin/eslint src --ext .ts` — le seul `src/` ;
- `pnpm lint` vaut **`eslint .`** : `eslint.config.mjs` porte `files: ["**/*.ts"]` et n'ignore que `node_modules`, `dist` et `demo`. Un outil posé dans `tools/` est donc linté.

**Les deux doivent être vertes.** Aucune ne fait foi seule : la première ne voit pas `tools/`, la seconde ne prouve pas que `src/` est propre si un `ignores` change. Les deux sortent à zéro erreur.

Trois pièges :

- `@typescript-eslint/parser` est importé par `eslint.config.mjs` mais **absent de `package.json`** ; si eslint casse sur `Cannot find module '@typescript-eslint/scope-manager'`, la résolution locale est à réparer dans `node_modules`, pas dans un fichier suivi.
- `pnpm lint` via le runner échoue parfois : appeler `./node_modules/.bin/eslint src --ext .ts` directement.
- `@typescript-eslint/restrict-template-expressions` : **une garde de type `x is string` réduit `x` à `never` dans la branche négative**, et `never` ne s'interpole pas. Capturer la valeur brute avant la garde (`const declared = String(value);`) pour pouvoir la nommer dans le message d'erreur.
- `eslint-plugin-obsidianmd` impose la **sentence case** sur les chaînes d'UI, considère `id` comme un sigle (« The older story-theme ID keeps working. ») et **veut abaisser les noms propres** : écrire une description de réglage sans y mettre « City of Mist » plutôt que de désactiver la règle.

### Cible ES basse

`tsconfig.json` vise une lib ES antérieure à ES2017 : **`Object.values` et `Array.prototype.flat` ne compilent pas**. Utiliser `reduce`, `indexOf`, boucles `for…of`.

### Pas de runner de tests, mais des assertions durables

Le dépôt n'a toujours ni vitest ni jest, et n'en prendra pas : la convention a été formalisée en outils plutôt que réinventée par bloc.

| Script | Ce qu'il affirme |
| --- | --- |
| `pnpm assert:corpus` | chaque bloc de `BRUMES_BLOCKS` lit un témoin entièrement, dégrade un refus sans exception ni bloc vide, et possède sa commande de copie |
| `pnpm assert:override` | `overrides.json` surcharge une zone, la retirer restaure le rendu au caractère près, une zone inconnue avertit une fois |
| `pnpm dump:dom` | rend le DOM des six blocs — à comparer d'une phase à l'autre : une phase qui ne touche pas au balisage doit le laisser identique |

Le motif : un lanceur `tools/<nom>.mjs` bundle son harnais `tools/<nom>.harness.mts` par `esbuild.buildSync({platform:'node', format:'cjs', external:['obsidian','fs']})`, puis `node` l'exécute. **Aucune dépendance neuve** — `tsx` n'est pas installé et n'a pas à l'être.

Le corpus est partagé par les deux camps : `corpus/temoins/` (le schéma les accepte, le plugin les rend) et `corpus/refus/` (le schéma les rejette, le plugin les dégrade), un fichier par faute, nommé par la faute. **Les deux moitiés sont nécessaires** — sans le témoin, une série de refus ne prouve rien, un schéma qui rejette tout les passerait tous.

Pour le ponctuel, le harnais jetable reste : `src/__assert_*.ts` (classe `El` bouchon + faux `Document` avec `createElement`), même motif de bundling.

⚠ `pnpm build` lance `tsc -noEmit` sur **tout le dépôt**, pas sur `src/` : `tsconfig.json` porte `"include": ["**/*.ts"]`. C'est donc **l'extension d'un fichier qui le protège, pas son dossier** — un harnais en `.mts` échappe à `tsc`, un `.ts` posé n'importe où y passe. `rm -f src/__assert_*.ts __assert_*.cjs` **avant** de builder, sinon le build casse sur le harnais.

Deux pièges qui coûtent un aller-retour chacun (constatés le 2026-09-08) :

- **Le script de bundling du harnais doit vivre à la racine du dépôt**, pas dans un dossier temporaire : écrit ailleurs, `node` ne résout pas `esbuild` et sort `ERR_MODULE_NOT_FOUND: Cannot find package 'esbuild'`.
- **`log.warn` est muet par défaut.** `src/utils/logger.ts` démarre à `currentLogLevel = "error"` et `shouldLog` compare `LEVEL_ORDER[currentLogLevel] <= LEVEL_ORDER[level]` : un harnais qui affirme un avertissement doit appeler `log.setLevel("warn")` d'abord, sinon il mesure un silence et le prend pour un échec.

### SCSS : les partials pèsent des mégaoctets

Depuis le 2026-09-08 les illustrations sont sorties du bundle : `_theme-cards.scss` a maigri et `dist/styles.css` est à **3,64 Mo**. Le poids restant est celui des **polices**, embarquées par décision — `fonts/caveat.scss` 670 Ko, `fonts/im-fell-great-primer.scss` 596 Ko, `fonts/im-fell-english.scss` 508 Ko. **Ne jamais `cat` ces fichiers ni `dist/styles.css`** : les lire par `grep -n … -A n` ou `sed -n`. Pour partager la géométrie d'une carte entre partials, extraire un `@mixin` (`theme-cards.frame`) et l'`@include` — jamais recopier les valeurs, jamais dupliquer l'image.

### Registre de blocs

Depuis 2026-09, tout bloc fencé passe par `BrumesBlock<T>` (`src/features/blocks/`) et une ligne dans `BRUMES_BLOCKS`. Blocs existants : `theme-card` (alias déprécié `story-theme`), `litm-challenge`, `litm-journey`, `litm-theme-kit`, `com-theme-card`, `com-danger`.

**Ce qu'un format doit au schéma est écrit une seule fois** : [`aidd_docs/guidelines/schema-design.md`](aidd_docs/guidelines/schema-design.md). Checklist d'ajout, règle de zéro exemption, frontière valeurs / forme / pixels, polarités, langue, échappatoire SCSS, et les deux règles de compatibilité (`aliases`, clés de `features.*` jamais renommées). Ne pas redire ici ce qu'elle dit — y renvoyer.

### rtk

- `rtk pnpm build` part sur `next build` → utiliser **`rtk proxy pnpm <script>`**.
- `rtk git commit` n'accepte ni `-q` ni `-F`, et `rtk proxy git commit -F -` ne reçoit pas stdin → écrire le message dans un fichier et faire `rtk proxy git commit -F <fichier>`.
