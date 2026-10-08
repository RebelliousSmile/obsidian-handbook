# Superviseur de trains de correction

**Français** · [English](supervisor.en.md)

`pnpm supervise` coordonne une correction qui traverse les cinq dépôts : Handbook, Lantern et les trois dépôts de schémas (`schema-pbta`, `schema-adrenaline`, `schema-in-the-mist`). Un ensemble de changements publiés ensemble s'appelle un **train**.

Le superviseur observe, consigne et dit qui fait quoi ensuite. Il ne rédige aucun changement : `commit` pose tel quel ce qu'une personne a préparé, et rien n'est publié sans une présentation verte, liée aux commits qu'elle a validés. Lancer `ship`, c'est valider le changement : le superviseur fait alors seul tout le traitement du train, sans attendre personne. Il pose le changement préparé, le présente, écrit les fichiers du train (pins, lockfiles, manifestes, records), les commite et les pousse, publie les fournisseurs puis les consommateurs, et ferme le train. Il n'avance un checkout qu'en fast-forward sur `origin/main`, et s'arrête sur un checkout sale ou divergent.

## Prérequis

- Les cinq dépôts clonés côte à côte, sous les noms de la topologie (`supervisor/topology.json`, champ `path`) : `obsidian-handbook`, `lantern`, `schema-pbta`, `schema-adrenaline`, `schema-in-the-mist`. `--root <dir>` désigne leur dossier parent (par défaut, le parent de Handbook).
- `git` et `gh` authentifié sur `RebelliousSmile`.
- Node 20 ou plus récent, sous Linux, macOS ou Windows natif. Aucun shell POSIX ni WSL n'est exigé.
- Seul `link --create` sans `--yes` demande un vrai terminal (le préfixe `!` de Claude Code n'en est pas un). Aucune autre commande ne lit de saisie.
- La version et le `CHANGELOG` d'un consommateur (Lantern, Handbook) se préparent avec le changement. Le superviseur n'écrit ni l'une ni l'autre : il publie la version que `package.json` porte sur `origin/main`.
- Sur GitHub, l'environnement `release` de `schema-adrenaline` n'a aucun relecteur requis. Un run retenu par des relecteurs arrête le train.

## Le dossier de train

Chaque train vit dans `supervisor/trains/<id>.json`, dans Handbook. Il porte les issues liées et leurs dépendances, la présentation, les publications, les runs, la convergence, les releases des consommateurs et la date de clôture. Sa forme est décrite par `supervisor/train.schema.json`.

L'**issue de coordination**, ouverte dans Handbook, en est une projection : seul le bloc entre `<!-- supervisor:begin -->` et `<!-- supervisor:end -->` appartient au superviseur. Ce qui est écrit autour survit à chaque `sync`.

## Le cycle, commande par commande

Les commandes s'enchaînent dans cet ordre :

`status` → `open` / `link` → `next` → `ship`

`ship` enchaîne à lui seul `commit` → `present` → `publish` → `converge` → `release` → `close`. Chacun de ces maillons reste une commande, utile pour regarder un pas ou reprendre à la main.

Options communes : `--root <dir>`, `--topology <fichier>`, `--train <id>` (par défaut, le seul train ouvert).

### 1. `status` : l'état des cinq dépôts

```bash
pnpm supervise status [--json] [--strict] [--no-fetch]
```

Liste chaque dépôt, sa branche, son retard sur `origin/main`, les pins de chaque consommateur sur chaque fournisseur (URL et SRI du lockfile) et le train actif. Un pin sur une release candidate est signalé avec son URL ; deux pins qui divergent sont nommés avec leurs deux URL. `--strict` sort en échec au premier écart. Ne modifie rien.

### 2. `open` et `link` : démarrer le train

```bash
pnpm supervise open <id> --title "<titre>"
pnpm supervise link <dépôt>#<n> [--depends-on a,b] [--evidence e]...
pnpm supervise link <dépôt> --create --title "<titre>" [--yes]
pnpm supervise sync
```

`open` écrit le dossier et crée l'issue de coordination. `link` rattache une issue existante, ou en crée une avec `--create`. Une création demande confirmation au terminal ; sans terminal, il faut `--yes`. Tout refus arrive avant la première écriture, locale ou sur GitHub : un dépôt déjà engagé dans un autre train ouvert, une arête vers un dépôt que la topologie ne déclare pas, un cycle de dépendances. `sync` réécrit le bloc du superviseur dans l'issue de coordination.

### 3. `next` : qui peut avancer

```bash
pnpm supervise next [--json]
```

Classe chaque élément en `done`, `ready` ou `blocked`, recalculé depuis GitHub à chaque appel. Un élément est `done` quand son issue est fermée **et** que son commit de fermeture est atteignable depuis `origin/main`. Une issue fermée sans ce commit apparaît `closed, not proven`. Un fournisseur fusionné débloque ses consommateurs.

**Humain** : les corrections elles-mêmes, dans chaque dépôt, dans l'ordre que `next` indique.

**Poser le travail** : `present` et `preview` n'acceptent que des dépôts propres, sur `origin/main`. Pour un fournisseur et ses consommateurs :

```bash
pnpm supervise commit schema-adrenaline
```

Le message de chaque dépôt est préparé dans son `.git/SUPERVISOR_COMMIT_MSG` (hors du checkout, il ne le salit pas). Tout est vérifié avant la première écriture : chaque dépôt sur `main`, aucun en retard sur `origin/main`, un message pour chaque dépôt modifié et rien à commiter sans message. La commande affiche le plan, commite les trois dépôts, puis les pousse. Elle ne demande aucune saisie : un refus survient avant le premier commit. Les dossiers de train de Handbook n'en font jamais partie, et aucune release n'est publiée.

Pour un dépôt seul, quel que soit son rôle :

```bash
pnpm supervise commit lantern --only --message "feat(adrenaline-pj): print the Malus column"
```

`--only` applique les mêmes vérifications à ce seul dépôt et laisse les autres tels qu'ils sont, modifiés ou non. `--message` remplace le fichier préparé ; les deux à la fois sont refusés.

**Faire tourner un train à côté d'un autre travail** : chaque commande veut des checkouts propres, donc un travail en cours (un autre plan, par exemple) bloque le train. Les worktrees lèvent ce blocage :

```bash
pnpm supervise worktree ../train [--repos a,b] [--no-install]
pnpm supervise commit schema-pbta --root ../train
```

`worktree <dir>` crée un worktree lié par dépôt sous `<dir>/<path>`, détaché sur `origin/main` (git ne garde `main` que dans un seul checkout), puis lance l'installation gelée de chacun, nécessaire aux validations (`--no-install` la saute). Tout refus arrive avant la première création : un dépôt absent, un `fetch` en échec, un dossier cible déjà là. Ensuite, toute commande prend `--root <dir>` et travaille là, sans toucher aux checkouts habituels ni à leur travail non commité. Le travail du train se prépare dans ces worktrees. Dans un worktree lié, `commit` et les écritures du superviseur acceptent une branche autre que `main` ou une tête détachée, et poussent `HEAD:main` ; ils exigent toujours d'être au niveau de `origin/main`. Le superviseur ne supprime jamais un worktree : `git worktree remove <dir>` reste un geste humain.

**Le superviseur ne se modifie pas lui-même.** Toute commande sauf `status` refuse de tourner si son propre code diffère de `origin/main` : `tools/supervise.mjs`, `tools/supervisor/`, ses harnais (`tools/assert-supervisor.mjs`, `tools/supervisor*.harness.mts`, `tools/fixtures/supervisor/`), `supervisor/` hors dossiers de train, et le script `supervise` de `package.json`. Un changement du superviseur se répare comme tout autre code, se prouve par `pnpm assert:supervisor`, puis est commité et poussé sur `origin/main` avant que le superviseur n'agisse de nouveau : le superviseur ne le pose jamais lui-même, ni par `commit` ni par `ship`.

### 4. `ship` : valider, et tout publier

```bash
pnpm supervise ship --message "<message de commit>"         # montre tout le cycle, sans rien écrire
pnpm supervise ship --message "<message de commit>" --run   # du commit à la clôture du train
```

Lancer `ship --run`, c'est la validation : il n'y en a pas d'autre. La commande enchaîne les maillons décrits plus bas, dans l'ordre, et ne lit aucune saisie :

1. `commit` de chaque dépôt concerné par le train (ses éléments et leurs consommateurs). Un dépôt modifié reçoit le message préparé dans son `.git/SUPERVISOR_COMMIT_MSG`, ou à défaut celui de `--message` ; un dépôt sans changement est laissé tel quel ;
2. `present` ;
3. `publish --run`, puis `converge --run`, `release --run` et `close --run`.

Chaque maillon garde ses propres refus. Le premier qui échoue arrête la chaîne, avec son message et un code de sortie non nul : un arrêt est toujours un échec nommé, jamais une attente. Une présentation rouge laisse donc les commits posés et ne publie rien.

Avant le premier commit, `ship` refuse un train clos, un dépôt engagé par un autre train ouvert, un dépôt modifié sans message, un dépôt en retard sur `origin/main`, et un code de superviseur qui diffère de `origin/main`.

`ship --run` se relance après un arrêt : il reprend là où le dossier de train en est. Rien à commiter saute le commit, une présentation qui tient toujours n'est pas rejouée, et les maillons suivants ne refont pas ce qui est déjà publié. `--message` devient alors inutile.

Sans `--run`, `ship` affiche le plan de commit et la suite des étapes, et n'écrit rien : ni commit, ni dossier de train, ni dispatch.

Avec `--run`, chaque étape qui tourne annonce son heure de départ (`ship: publish started at 14:03:27`) puis sa durée (`ship: publish took 3 min 12 s`, ou `ship: present stopped (exit 1) after 41.0 s`), et le cycle se termine par sa durée totale, vert ou rouge. Une étape sautée à la reprise n'annonce rien. Ces mesures rejoignent le résumé des durées du train (voir [Lire un échec](#lire-un-échec-journaux-et-durées)).

### 5. `present` : les preuves, sans rien publier

```bash
pnpm supervise present
```

Exige des checkouts propres sur `origin/main`, un train dont tous les éléments sont `done`, et aucun dépôt engagé ailleurs. Pour chaque dépôt concerné, il rapporte le SHA, les commits depuis la base, le diff résumé, puis lance ses validations (`validations` de la topologie) **derrière le garde de publication** : une validation qui tenterait `gh release create`, un dispatch de workflow, un `git push` ou un `git tag` échoue. La présentation se termine par la liste des publications qu'elle lie.

Une présentation verte lie chaque dépôt au commit sur lequel ses validations ont tourné. Après elle, un dépôt ne peut recevoir que les commits dont le train a besoin : ils ne touchent que ses `trainFiles`, et chaque URL de release ou SRI qu'ils introduisent appartient à une archive observée par le train. Les commits que le superviseur pose lui-même (adoption, manifestes, records) gardent donc la présentation valide ; tout autre changement la dépasse et renvoie à `present`. Ce lien est revérifié avant chaque pas de `publish`, `converge`, `release` et `close`. L'empreinte de la présentation protège d'une modification accidentelle du dossier de train, pas d'une modification délibérée.

Le garde a une seule table de règles (`tools/supervisor/guard/rules.cjs`) et deux voies d'interception, parce qu'aucune ne suffit seule :

- des **shims `PATH`** `gh` / `git` (en `sh`) et `gh.cmd` / `git.cmd` (pour `cmd.exe`), placés en tête du `PATH` de la validation : ils arrêtent tout appel passé par un shell ;
- un **hook `NODE_OPTIONS=--require`** (`hook.cjs`), hérité par chaque processus Node : il arrête un outil Node qui lance `gh` ou `git` sans shell, ce qui sous Windows trouve directement `gh.exe` et saute les shims.

Le garde échoue fermé : un appel refusé sort en 97, un binaire réel introuvable en 127, et aucun des deux n'atteint le binaire.

Chaque validation est rapportée avec sa durée. Une validation rouge garde ses dernières lignes dans le rapport et nomme le fichier qui porte sa sortie entière (`Whole output: …`). Trois états ne se confondent pas :

- **`passed`** / **`failed (exit N)`** : la commande a tourné ;
- **`not run`** : la commande n'a pas été lancée, et la raison suit. C'est le cas des validations d'un consommateur quand le `build` ou l'empaquetage d'un fournisseur du train est rouge (`the build of <fournisseur> failed`, `the packaging of <fournisseur> failed`) : mesurer le consommateur sur un fournisseur qui ne se construit pas, ou dont le paquet ne se liste pas, ne dirait rien. Une validation non lancée rend le train non présentable, au même titre qu'une rouge ;
- **`skipped`** (dans la sortie de `pnpm check`) : une porte écartée par son nom (`HANDBOOK_CHECK_SKIP`) ou dont le contenu a déjà passé. Ce n'est pas un échec.

Sous `present`, `pnpm check` tourne en **mode collecte** : au lieu de s'arrêter à la première porte rouge, il les lance toutes et termine par un récapitulatif (`check: 3 gate(s) failed: …`), de sorte qu'un seul passage nomme tout ce qui est à corriger. Le harnais du superviseur, le plus long, passe alors en dernier et n'est pas lancé si une porte avant lui est rouge (`not run`). Le superviseur pose `SUPERVISOR_PRESENT=1` pour cela ; à la main, `HANDBOOK_CHECK_COLLECT=1 pnpm check` fait de même. Sans ces variables, `pnpm check` garde son arrêt au premier rouge.

**Un checkout laissé modifié.** Chaque dépôt est propre quand les validations commencent ; `present` vérifie qu'il l'est encore quand elles finissent, empaquetage compris. Un fichier suivi réécrit, ou un fichier nouveau non ignoré, rend le train non présentable et le rapport nomme les fichiers : c'est le signe d'un générateur qui écrase une sortie commitée (une retouche à la main du fichier généré est effacée, la validation reste verte, et le commit ne contient plus ce que le paquet publie). La correction est de modifier la source du générateur, puis de commiter ce qu'il produit. Le contrôle compare le contenu (`git diff HEAD`), pas `git status` : avec `autocrlf`, un fichier réécrit à l'identique dans l'autre fin de ligne n'est pas un changement.

**Une preuve qui tient n'est pas refaite.** Une nouvelle présentation ne relance pas les validations d'un dépôt dont la précédente était **entièrement verte** sur la même *clé de preuve* : l'arbre de fichiers de son commit (le coordinateur ne compte pas `supervisor/trains/`, que le superviseur écrit lui-même), les fichiers que publient les fournisseurs auxquels il est lié (l'empreinte de leur paquet), les commandes de validation et la version de Node. Elle ne contient ni l'heure, ni le commit, ni le train : deux commits au même arbre, ou deux trains, prouvent la même chose. Seul le dépôt dont un de ces éléments a changé est rejoué ; un fournisseur dont un fichier *non publié* change est rejoué, ses consommateurs sont repris. Un rouge, une validation non lancée ou un fournisseur sans empreinte ne sont jamais repris. Le rapport écrit **`reused`** à la place de `passed`, avec la date de la preuve d'origine ; la clé et cette date sont consignées dans le dossier de train (`evidence`, `reused`). Un enregistrement d'avant la clé se lit et rejoue tout. **`present --fresh`** et **`ship --fresh`** rejouent tout, sans égard à la preuve : à utiliser quand l'environnement a changé sans que rien de ce qui précède ne le dise.

**Valider contre le train** : `present` ne mesure pas un consommateur sur son épingle quand le train change le fournisseur, et il ne le mesure pas non plus sur le checkout du fournisseur : il le mesure sur **ce que le paquet publie**. Chaque fournisseur que le train change est empaqueté à blanc, une seule fois quel que soit le nombre de ses consommateurs, par `npm pack --dry-run --json` derrière la garde de publication : la commande exécute `prepack` comme le vrai empaquetage, liste les fichiers de l'archive, n'écrit aucune archive et ne publie rien. Un fournisseur dont `prepack` ne lance pas déjà son `build` est construit juste avant. Le temps des validations d'un consommateur, son lien `node_modules/<paquet>` est remplacé par une copie de ces seuls fichiers, puis remis quoi qu'il arrive, et `node_modules/.train-providers` est supprimé. Un contrat cassant passe donc le typage et les harnais du consommateur avant `publish`, et un consommateur qui lit un fichier que le fournisseur laisse hors de son paquet est rouge dès `present`, avant tout candidat, avec le chemin du fichier dans la sortie. Seul un lien est remplacé (disposition pnpm) : un dossier réel est refusé, pas déplacé. Rien de suivi n'est écrit.

L'**empreinte** d'un paquet est un `sha256` sur la liste triée de ses fichiers, chacun avec le `sha256` de ses octets. Le rapport l'affiche sous le fournisseur (`Package: <n> file(s), fingerprint …`) et sous chaque consommateur lié (`Validated against the package of <fournisseur>, fingerprint …`) ; l'enregistrement du train la porte dans l'entrée de présentation du fournisseur (`packed`), et celle du consommateur nomme ses fournisseurs liés (`linkedProviders`). Les deux champs sont facultatifs : un enregistrement écrit avant eux se lit toujours. Même contenu publié, même empreinte ; un octet d'un fichier publié la change, un fichier hors paquet ne la change pas. Elle est locale à la machine (elle suit les fins de ligne du checkout) : elle se compare entre deux présentations, jamais au `sha256` d'une archive.

Les validations d'un consommateur lié reçoivent `SUPERVISOR_LINKED_PROVIDERS=<fournisseur>@<empreinte>,…`. `pnpm check` mêle cette valeur à son tampon de contenu : le fournisseur lié vit sous `node_modules`, hors du contenu haché, et sans elle un vert prouvé sur l'épingle aurait valu pour un fournisseur jamais rencontré.

**Essayer avant de valider** : `pnpm supervise preview --vault <coffre>` fait tourner le code du train dans Obsidian et dans chaque consommateur. La commande exige d'abord ce que `present` exige : chaque dépôt concerné doit être sur `origin/main` et propre. Le changement est donc posé par `commit` avant `preview` ; `ship` n'a alors plus rien à commiter. Elle signale aussi un SHA qui a bougé depuis la présentation. Ensuite :

- elle construit les fournisseurs du train qui ont un script `build` ;
- elle construit Handbook contre leurs checkouts : chaque paquet déclaré est redirigé vers son dossier, en suivant sa carte `exports` ; le bundle passe par des alias, la vérification de types par un `tsconfig` temporaire hors du checkout (`paths` tirés des conditions `types`), de sorte qu'un contrat plus récent que le tarball épinglé passe le typage. Le script `build:bundle` de Handbook (le `build` sans `tsc`) porte l'étape de bundle ;
- elle installe dans le coffre les packs que chaque fournisseur publie par son `handbook.json`. L'arborescence est celle de l'installeur (`.obsidian/handbook/sources/<id>/`), et `source.json` porte le HEAD du checkout ;
- elle déploie `dist/` à côté du `data.json`, qu'elle lit sans jamais l'écrire, puis ouvre le coffre ;
- elle lance le serveur vite de chaque consommateur sur ces mêmes checkouts, avec sa propre configuration et des alias ajoutés par-dessus. Son `package.json` et ses lockfiles ne sont pas touchés.

Rien n'y est propre à un jeu ou à un schéma : ce qui est monté, c'est ce que chaque fournisseur du train publie et ce que chaque consommateur déclare. `--no-serve` s'en tient au coffre, `--no-open` n'ouvre rien, `--port` fixe le port du serveur de dev, et `Ctrl+C` arrête les serveurs. Pour suivre `schema-pbta` en continu, `pnpm dev:schema-pbta -- <coffre>` (#65) recopie ses packs à chaque modification.

### 6. `publish` : du premier dispatch à la convergence

```bash
pnpm supervise publish         # montre le prochain pas et sa commande exacte
pnpm supervise publish --run   # enchaîne tous les pas, jusqu'à la convergence
```

Sans `--run`, rien ne s'exécute, et deux appels successifs disent la même chose. Avec `--run`, `publish` exécute un pas, observe à nouveau, puis exécute le suivant. Il suit chaque run jusqu'à sa fin, en interrogeant son statut toutes les 15 secondes et en n'écrivant qu'une ligne par changement, et ne s'arrête que sur un échec ou sur une étape humaine. La présentation est revérifiée **avant chaque pas**. Les fournisseurs passent l'un après l'autre, dans l'ordre des dépendances du train : le second démarre quand la finale du premier est publiée. Une fois toutes les finales publiées, `publish --run` enchaîne `converge --run`. Chaque pas se recalcule depuis ce que montrent GitHub et les dépôts : un run échoué est relancé, une candidate déjà publiée ne l'est jamais une seconde fois. Avant tout dispatch, `publish` s'arrête et nomme ce qui manque : un secret (par exemple `RELEASE_TOKEN` sur `schema-pbta`) ou une entrée que le workflow ne déclare pas. Une finale dont les octets diffèrent de la candidate l'arrête aussi, avec les deux empreintes.

Un pas est de l'un de ces types :

- **automatisé** : exécuté par `--run`. C'est un `gh workflow run`, une commande locale, l'adoption de la candidate par les consommateurs, un manifeste de train à poser sur `main`, ou le tag final à pousser ;
- **humain** : un état que le superviseur ne répare pas seul, par exemple un run réussi qui n'a pas produit sa release ; il faut l'inspecter avant toute nouvelle publication ;
- **attente** : un run en cours, que `--run` suit jusqu'à sa fin.

L'adoption de la candidate par Handbook et Lantern est automatique. Le superviseur réécrit `package.json` et chaque lockfile vers l'URL de la candidate et son SRI, puis lance l'installation gelée (`pnpm install --frozen-lockfile`, ou `npm ci`) et les validations du consommateur, derrière le garde. Il commite ensuite (`chore(deps): adopt <pkg> <tag>`) et pousse. Un consommateur qui échoue est nommé avec la commande en cause : ses pins sont restaurés, et rien de lui n'est commité.

**Répétition locale du manifeste de train.** Un fournisseur peut déclarer dans la topologie une `rehearsal` : les preuves statiques de son workflow de train, sous forme de commandes où `{manifest}` désigne le chemin du manifeste. Aujourd'hui seul `schema-pbta` en déclare une (`npm run validate:release-train -- {manifest}`), celle que `release-train.yml` lance à son étape « Validate immutable release-train input ». Avec `--run`, `publish` la joue derrière le garde, dans le checkout du fournisseur, à deux moments : **avant de poser le manifeste de train** et **avant de dispatcher `release-train.yml`**. Il vérifie aussi, comme le workflow, qu'`origin/main` descend du commit passé en `provider_commit`. Avant le premier de ces deux pas le manifeste n'est pas encore commité : il est écrit dans le checkout le temps des commandes puis retiré, quoi qu'elles aient fait, et le pas le réécrit lui-même. Une répétition rouge, ou verte mais qui laisse le checkout modifié, arrête `publish` : rien n'est posé ni dispatché, et le message nomme la commande, son code de sortie et le fichier de sa sortie entière. Sans `--run`, rien n'est répété : le pas affiche seulement la commande qui le précédera (`rehearsed first: $ …`). La répétition a besoin des dépendances installées du fournisseur (`node_modules`), comme ses validations de `present`. **Reste en CI** ce qu'un hôte prouve : `release-train.yml` charge ensuite le plugin dans Obsidian sous `xvfb`, ce qui ne se rejoue pas en local. Un fournisseur sans `rehearsal` est publié comme avant.

### 7. `converge` : chaque consommateur sur chaque finale

```bash
pnpm supervise converge         # vérifie, sans rien écrire
pnpm supervise converge --run   # adopte les finales et pose les fichiers de convergence
```

Exige que chaque fournisseur du train ait sa finale publiée, une présentation qui tient et des checkouts propres sur `origin/main`. Sans `--run`, chaque consommateur encore sur une candidate est nommé, avec l'URL qu'il pinne et celle de la finale. Avec `--run`, il adopte la finale : ce sont les mêmes octets que la candidate déjà validée, donc seule l'installation gelée tourne avant le commit. Puis il met à jour le registre de fournisseurs d'un consommateur qui en tient un (champ `matrix` de la topologie, `release-train.matrix.json` de Lantern) : `handbook.ref` passe à l'`origin/main` de Handbook, qui pinne les finales, et chaque fournisseur du train à son `origin/main`, avec son manifeste de train ajouté (même commit en `validatorRef`). Pas au commit du tag final : celui de `schema-pbta` désigne le commit fournisseur, antérieur au manifeste. Le registre est un fichier de train, donc ce commit garde la présentation valide. Sans `--run`, un registre périmé est nommé et fait échouer la convergence. Ensuite, derrière le garde :

- les commandes `convergence` des consommateurs (topologie) : Handbook `assert:consumer-schema-pins --final`, Lantern `assert:consumer-schema-pins`, `assert:release-inputs`, `assert:release-train-matrix` et `assert:presentation-coverage` ;
- l'étape de convergence de chaque fournisseur (voir plus bas).

Le résultat est consigné dans le bloc `convergence` du dossier (statut, date, SHA de chaque dépôt, vérifications, notes). Une vérification qui échoue, ou un consommateur sans commande de convergence, fait échouer la convergence en le nommant.

### 8. `release` : les releases des consommateurs

```bash
pnpm supervise release         # montre le prochain pas et sa commande exacte
pnpm supervise release --run   # tague et publie chaque consommateur, Handbook en dernier
```

Exige une convergence `passed`, une présentation qui tient et des consommateurs toujours sur chaque finale, revérifiés avant chaque pas. Pour Lantern puis Handbook, le superviseur lit la version de `package.json` sur `origin/main`, pousse le tag `v<version>` (`git push origin origin/main:refs/tags/v<version>`), puis fait partir la release comme la topologie le déclare (`release.trigger`) : le workflow de Lantern démarre à la poussée du tag, celui de Handbook est lancé sur le tag (`gh workflow run release.yml --ref v<version>`). Il suit le run jusqu'à sa fin et consigne la release dans `consumerReleases`.

Une release qui existe n'est jamais republiée, et un tag n'est jamais poussé deux fois ni supprimé : la commande se relance à tout moment. Un run rouge arrête avant le consommateur suivant. Un tag sans release ni run, ou un tag hors de `main`, est nommé et laissé à une personne.

### 9. `close` : fermer sur preuves

```bash
pnpm supervise close           # montre ce qui serait fermé
pnpm supervise close --run     # ferme
```

Exige une convergence `passed`, une présentation qui tient, des `origin/main` qui **descendent** des SHA de la convergence (les commits de release des consommateurs arrivent après elle), aucun écart de pins, et les releases de Lantern et de Handbook décrites ci-dessus. Tout manque est nommé, et rien n'est fermé. Avec `--run`, `close` consigne `consumerReleases`, commente ou ferme chaque issue, ferme l'issue de coordination **en dernier**, puis passe le train à `closed`. Il supprime aussi les journaux du train ; le résumé des durées reste.

## Lire un échec : journaux et durées

Toute commande que le superviseur lance derrière le garde (builds et validations de `present`, répétition d'un manifeste de train, installation et validations d'une adoption, vérifications de `converge`) laisse **sa sortie entière** dans un fichier, et sa durée dans un résumé. Les deux vivent dans le répertoire git du coordinateur (`git rev-parse --absolute-git-dir` dans Handbook : `.git/`, ou `.git/worktrees/<nom>/` depuis un worktree du superviseur), donc hors du checkout et jamais commités :

- `supervisor-logs/<train>/<dépôt>-<rang>-<étape>.log` : la sortie d'une commande. `<rang>` est son rang dans l'étape pour ce dépôt, à partir de 1 ; `<étape>` vaut `present`, `build` ou `pack` (construction et empaquetage à blanc, rangés sous le fournisseur), `rehearse` (répétition du manifeste de train, rangée sous le fournisseur), `converge`, ou `publish-<fournisseur>` / `converge-<fournisseur>` pour une adoption. Une relance réécrit le fichier ;
- `supervisor-logs/<train>.durations.jsonl` : une ligne JSON par commande (`kind: "command"`, dépôt, étape, commande, code de sortie, `durationMs`), par étape de `ship` (`kind: "step"`) et par cycle `ship` (`kind: "cycle"`), chacune datée.

Devant un rouge, le rapport ou le message d'erreur nomme le fichier : c'est lui qu'on ouvre, pas la fin de sortie reprise dans le rapport. Le rapport de `present` rappelle le dossier en dernière ligne. `close --run` supprime les journaux et garde le résumé des durées, qui dit après coup où le temps d'un train est passé.

Le dossier de train, lui, ne porte aucun de ces chemins : il est commité, et ils sont locaux. Il garde pour chaque validation sa durée (`durationMs`) et, le cas échéant, la raison pour laquelle elle n'a pas été lancée (`notRun`).

## Automatique, humain, jamais dans une validation

| | Ce qui est concerné |
| --- | --- |
| **Automatique** | observation des dépôts et des pins (`status`, `next`) ; validations et vérifications derrière le garde (`present`, `converge`) ; une fois `ship --run` lancé, tout le traitement du train : commit et push du changement préparé, présentation, dispatchs, promotions locales, adoption de la candidate puis de la finale par Handbook et Lantern, manifestes et records de train, tag final de `schema-adrenaline`, registre de fournisseurs de Lantern, fichier de convergence de `schema-in-the-mist`, convergence ; tag et release de Lantern puis de Handbook ; commentaires et fermeture des issues |
| **Humain** | les corrections, avec la version et le `CHANGELOG` des consommateurs ; la validation, qui consiste à lancer `ship` ; toute suppression (branches, tags, fichiers) |
| **Hors du superviseur** | son propre code : corrigé, prouvé par `pnpm assert:supervisor`, commité et poussé sur `origin/main` avant qu'il ne tourne de nouveau |
| **Jamais dans une validation** | toute release, tout dispatch de workflow, tout `git push` et tout `git tag`, toute écriture via `gh api`. Les validations de `present` et les vérifications de `converge` passent sous le garde, et chaque maillon revérifie la présentation avant chaque pas |

Un arrêt de la chaîne n'est pas un geste prévu : c'est un échec nommé (checkout sale ou divergent, run rouge, run réussi sans résultat), à corriger avant de relancer `ship --run`.

## Ce que juge la validation : le design et le fonctionnel

La validation porte sur **le rendu et le comportement** : la fiche ou la fonctionnalité est-elle celle qui était voulue ? Elle se juge avant `ship`, dans le coffre et dans chaque consommateur (`preview`). Elle ne porte pas sur la mécanique de contrôle.

Tout ce qui est technique avance sans demander : cohérence des packs et des versions, épingles et SRI, protocoles de release-train, validations de `pnpm check` / `npm run check`, CI des fournisseurs. Une validation rouge se corrige dans le code. Elle se corrige dans la validation elle-même dans un seul cas : elle compare à un chiffre une valeur que le train déplace, et ce chiffre est remplacé par la lecture de la source qui la déclare (voir [Ce qu'une garde peut attendre d'un train](#ce-quune-garde-peut-attendre-dun-train)). Puis `ship --run` se relance. Une validation ne se contourne jamais : pas de validation désactivée, pas d'affirmation retirée, pas de comparateur ni de seuil changé, pas de garde écarté. Un défaut du superviseur se corrige de même, preuve à l'appui (`pnpm assert:supervisor`), et son code est poussé avant la relance. Le compte rendu vient après coup, dans le rapport de `present`.

Restent à l'humain : les corrections, la validation elle-même, et toute suppression (branches, traces, fichiers). La garde de publication et les workflows ne se modifient pas pour faire passer un train.

## Ce qu'une garde peut attendre d'un train

Un train déplace la version d'un fournisseur, l'épingle de chaque consommateur et les tags qui vont avec. Une validation ou une vérification de convergence ne compare donc jamais l'une de ces valeurs à un chiffre écrit dans son script : elle lit la source qui la déclare (`package.json`, le lockfile, le manifeste ou l'enregistrement du train) et affirme que le rôle est tenu — l'épingle est une release finale du fournisseur, la version installée est celle de l'épingle, les octets publiés sont ceux que le lockfile enregistre. Ce qu'une garde ne peut pas lire lui arrive par un argument de sa commande dans la topologie, comme `--final` ; aucune ne devine l'étape du cycle par l'environnement.

Dans Handbook, `pnpm assert:guards-by-role` (dans `pnpm check`) refuse un numéro de version, un tag ou une URL d'archive écrits en chiffres dans une garde de cette famille. Une donnée de test fermée garde son littéral et porte `guard-fixture: <raison>` sur sa ligne.

## Couverture du contrat de présentation

Un schéma publie pour chaque pack un contrat de présentation (`packs/<id>/presentation-contract.json` : régions, champs de chaque région). Un consommateur qui dessine ce pack doit en tenir compte en entier. Lantern le déclare dans la topologie : `assert:presentation-coverage` figure dans ses `validations` et dans sa `convergence`. Pour chaque pack dont Lantern a un modèle, la commande lit le contrat installé et exige que chaque région soit dessinée par l'aperçu et que chaque champ soit modifiable dans l'éditeur ; un manque rend `present` ou `converge` rouge en nommant le pack, la région et le champ.

Le contrôle lit les sources du modèle : il prouve qu'un champ y est nommé, pas que son rendu est juste. Le rendu reste jugé à la validation. Un consommateur déclare ce contrôle par une commande de sa propre entrée dans la topologie ; le superviseur n'en connaît pas le détail.

## Les trois fournisseurs

| | `schema-pbta` | `schema-adrenaline` | `schema-in-the-mist` |
| --- | --- | --- | --- |
| Candidate | `release.yml` en `mode=digest` (empaquette et calcule l'empreinte, sans release), puis `mode=stage` (publie la candidate nommée par le manifeste) | `publish-candidate.yml` | `release-candidate.yml` |
| Manifeste de train | `release-train/candidates/<pkg>-<tag>.json` puis `release-train/<pkg>-<tag>.json`, posés par le superviseur | `release-train/<pkg>-<tag>.json`, posé par le superviseur | `release-trains/<tag>.json`, statut `pending`, posé par le superviseur |
| Preuve | répétition locale de la validation statique (`rehearsal` de la topologie), puis `release-train.yml` | `release-train.yml` | `npm run release-train:assert` en local, qui écrit un fichier de provenance |
| Finale | `release.yml` en `mode=promote`, mêmes octets que la candidate | tag final poussé par le superviseur (`git push origin origin/main:refs/tags/<tag>`), qui déclenche `release.yml` | `npm run release-train:promote` en local, dans le checkout du fournisseur, propre et sur `origin/main` |
| Convergence | aucun outil propre : les pins finaux des deux consommateurs font foi, et le rapport le signale | `release-train/<pkg>-vX-final.json` posé par le superviseur, puis `npm run release-train:verify-final` | manifeste passé à `completed` avec son bloc `final` et fichier de convergence de `release-train:converge`, tous deux posés par le superviseur, puis `release-train:validate -- --require-complete <tag>` |

### Candidat reconnu après une nouvelle présentation

Une candidate est empaquetée depuis un commit, et ses manifestes, son reçu et ses runs nomment ce commit. Le train l'enregistre avec la candidate, ainsi que l'empreinte des fichiers publiés à ce commit (`publication.<fournisseur>.candidate.commit` et `.packed`).

Si le fournisseur reçoit ensuite un commit et que le train est présenté à nouveau, `publish` garde la candidate quand le commit présenté **descend** de celui de la candidate **et** publie les mêmes fichiers (même empreinte). Pour `schema-pbta`, les dispatches, les manifestes et le reçu continuent alors de nommer le commit de la candidate : aucun run vert n'est relancé, aucun manifeste n'est posé une seconde fois. Un commit d'outillage hors paquet ne coûte donc plus un cycle.

Si l'empreinte a changé, ou si le commit présenté ne descend pas de celui de la candidate, rien ne change par rapport à avant : les étapes sont recalculées sur le commit présenté, et la description de l'étape dit pourquoi, en nommant les deux commits ou les deux empreintes. Une candidate enregistrée avant ces deux champs est tenue au commit présenté. Des octets de finale différents de ceux de la candidate arrêtent toujours la publication.

## En cas de problème

- **« the repositories are not ready »** : un checkout n'est pas propre ou pas sur `origin/main`. La commande à lancer est affichée.
- **« the supervisor's own code differs from origin/main »** : le code du superviseur a un changement non commité, ou un commit non poussé. Passer `pnpm assert:supervisor`, commiter, pousser, puis relancer.
- **Validation `not run`** : elle n'a pas été lancée, et la raison nomme l'échec en amont (construction ou empaquetage d'un fournisseur). C'est lui qui se corrige.
- **Un rouge dont le rapport ne montre que la fin** : ouvrir le fichier de la ligne `Whole output:` (voir [Lire un échec](#lire-un-échec-journaux-et-durées)).
- **« supervisor guard: … is refused »** : une validation tente de publier. C'est la validation qu'il faut corriger, pas le garde.
- **Présentation dépassée** (« presentation of train … does not hold ») : un commit hors `trainFiles`, ou une URL de release inconnue du train, est arrivé sur un dépôt. Relancer `ship --run`, qui présente à nouveau.
- **Run retenu par des relecteurs** (« run … is waiting ») : l'environnement `release` du dépôt a encore des relecteurs requis. Les retirer dans les réglages GitHub du dépôt, puis relancer `ship --run`.
- **Checkout Windows** : `.gitattributes` force LF sur les shims `sh` de `tools/supervisor/guard/` et CRLF sur leurs jumeaux `.cmd`. Un shim `sh` en CRLF casse son shebang, un `.cmd` en LF est mal lu par `cmd.exe` : ne pas retirer ces deux règles.
