# Superviseur de trains de correction

**Français** · [English](supervisor.en.md)

`pnpm supervise` coordonne une correction qui traverse les cinq dépôts : Handbook, Lantern et les trois dépôts de schémas (`schema-pbta`, `schema-adrenaline`, `schema-in-the-mist`). Un ensemble de changements publiés ensemble s'appelle un **train**.

Le superviseur observe, consigne et dit qui fait quoi ensuite. Il n'écrit jamais de code dans un dépôt, ne fait jamais de `pull` ni de `checkout`, et ne publie rien sans un accord lié aux commits qu'il a présentés.

## Prérequis

- Les cinq dépôts clonés côte à côte, sous les noms de la topologie (`supervisor/topology.json`, champ `path`) : `obsidian-handbook`, `lantern`, `schema-pbta`, `schema-adrenaline`, `schema-in-the-mist`. `--root <dir>` désigne leur dossier parent (par défaut, le parent de Handbook).
- `git` et `gh` authentifié sur `RebelliousSmile`.
- Un shell POSIX (Linux, macOS ou WSL). Le garde de publication est un préfixe de `PATH` fait de scripts `sh` ; sous Windows natif, il ne s'interpose pas.
- `approve` et `link --create` sans `--yes` demandent un vrai terminal.

## Le dossier de train

Chaque train vit dans `supervisor/trains/<id>.json`, dans Handbook. Il porte les issues liées et leurs dépendances, la présentation, l'accord, les publications, les runs, la convergence, les releases des consommateurs et la date de clôture. Sa forme est décrite par `supervisor/train.schema.json`.

L'**issue de coordination**, ouverte dans Handbook, en est une projection : seul le bloc entre `<!-- supervisor:begin -->` et `<!-- supervisor:end -->` appartient au superviseur. Ce qui est écrit autour survit à chaque `sync`.

## Le cycle, commande par commande

Les commandes s'enchaînent dans cet ordre :

`status` → `open` / `link` → `next` → `present` → `approve` → `publish` → `converge` → releases consommateurs → `close`

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

### 4. `present` : les preuves, sans rien publier

```bash
pnpm supervise present
```

Exige des checkouts propres sur `origin/main`, un train dont tous les éléments sont `done`, et aucun dépôt engagé ailleurs. Pour chaque dépôt concerné, il rapporte le SHA, les commits depuis la base, le diff résumé, puis lance ses validations (`validations` de la topologie) **derrière le garde de publication** : une validation qui tenterait `gh release create`, un dispatch de workflow, un `git push` ou un `git tag` échoue. La présentation se termine par la liste des publications qu'un accord couvrira.

**Aperçu local (#65)** : quand `schema-pbta` fait partie du train, le rapport rappelle `pnpm dev:schema-pbta -- <coffre>`. Cette commande copie les packs installables du checkout local de `schema-pbta` (`handbook.json`, `pack.json` et assets) dans les données Handbook du coffre, demande à Handbook de se recharger, puis recommence à chaque modification. `--once` synchronise une seule fois. Handbook doit déjà être installé dans le coffre. Pour les deux autres fournisseurs, aucun aperçu local n'existe encore et le rapport le dit.

### 5. `approve` : l'accord

```bash
pnpm supervise approve
pnpm supervise approve --verify
```

L'accord se donne en tapant l'identifiant du train au terminal. Aucune option ne le remplace, et sans terminal rien n'est consigné. `approve` refuse une présentation non présentable, une présentation modifiée à la main (son empreinte ne correspond plus) et des dépôts qui ont bougé depuis `present`.

Après l'accord, un dépôt ne peut recevoir que les commits dont le train a besoin : ils ne touchent que ses `trainFiles`, et chaque URL de release ou SRI qu'ils introduisent appartient à une archive observée par le train. Adopter la candidate observée garde donc l'accord valide ; tout autre changement l'annule et renvoie à `present`. `--verify` vérifie que l'accord tient toujours.

### 6. `publish` : un pas à la fois

```bash
pnpm supervise publish         # montre le prochain pas et sa commande exacte
pnpm supervise publish --run   # l'exécute, puis observe à nouveau
```

Sans `--run`, rien ne s'exécute, et deux appels successifs disent la même chose. Avec `--run`, l'accord est revérifié **avant chaque pas**. Un seul fournisseur avance à la fois, dans l'ordre des dépendances du train. Chaque pas se recalcule depuis ce que montrent GitHub et les dépôts : un run échoué est relancé, une candidate déjà publiée ne l'est jamais une seconde fois. Avant tout dispatch, `publish` s'arrête et nomme ce qui manque : un secret (par exemple `RELEASE_TOKEN` sur `schema-pbta`) ou une entrée que le workflow ne déclare pas. Une finale dont les octets diffèrent de la candidate l'arrête aussi, avec les deux empreintes.

Un pas est de l'un de ces types :

- **automatisé** : un `gh workflow run` ou une commande locale, lancés par `--run` ;
- **humain** : une instruction exacte (JSON à commiter, tag à pousser, pins à adopter), que `--run` n'exécute pas ;
- **attente** : un run en cours ; relancer `publish` quand il se termine.

L'adoption de la candidate par Handbook et Lantern est une étape humaine : `package.json` et chaque lockfile pinnent l'URL de la candidate avec son SRI, puis l'installation gelée et les vérifications du consommateur passent avant le commit.

### 7. `converge` : chaque consommateur sur chaque finale

```bash
pnpm supervise converge
```

Exige que chaque fournisseur du train ait sa finale publiée, un accord qui tient et des checkouts propres sur `origin/main`. Chaque consommateur encore sur une candidate est nommé, avec l'URL qu'il pinne et celle de la finale : l'adoption de la finale est une étape humaine. Ensuite, derrière le garde :

- les commandes `convergence` des consommateurs (topologie) : Handbook `assert:consumer-schema-pins --final`, Lantern `assert:consumer-schema-pins`, `assert:release-inputs` et `assert:release-train-matrix` ;
- l'étape de convergence de chaque fournisseur (voir plus bas).

Le résultat est consigné dans le bloc `convergence` du dossier (statut, date, SHA de chaque dépôt, vérifications, notes). Une vérification qui échoue, ou un consommateur sans commande de convergence, fait échouer la convergence en le nommant.

### 8. Releases des consommateurs (humain)

Lantern puis Handbook publient chacun une release : une version différente de celle de l'accord, une release GitHub `v<version>` et un tag sur `main` qui pinne chaque finale. Ce sont des gestes humains ; le superviseur ne fait que les observer.

### 9. `close` : fermer sur preuves

```bash
pnpm supervise close           # montre ce qui serait fermé
pnpm supervise close --run     # ferme
```

Exige une convergence `passed`, un accord qui tient, des `origin/main` qui **descendent** des SHA de la convergence (les commits de release des consommateurs arrivent après elle), aucun écart de pins, et les releases de Lantern et de Handbook décrites ci-dessus. Tout manque est nommé, et rien n'est fermé. Avec `--run`, `close` consigne `consumerReleases`, commente ou ferme chaque issue, ferme l'issue de coordination **en dernier**, puis passe le train à `closed`.

## Automatique, humain, jamais avant accord

| | Ce qui est concerné |
| --- | --- |
| **Automatique** | observation des dépôts et des pins (`status`, `next`) ; validations et vérifications derrière le garde (`present`, `converge`) ; dispatch des workflows de publication et commandes locales de promotion (`publish --run`) ; commentaires et fermeture des issues (`close --run`) |
| **Humain** | les corrections ; l'accord tapé au terminal ; les manifestes de train à commiter ; l'adoption de la candidate puis de la finale par Handbook et Lantern ; le tag final d'`schema-adrenaline` ; le fichier de convergence de `schema-in-the-mist` ; les releases des consommateurs ; un checkout à ramener sur `origin/main` |
| **Jamais avant accord** | toute release, tout dispatch de workflow, tout `git push` et tout `git tag`, toute écriture via `gh api`. `present` et `converge` passent sous le garde, et `publish --run` revérifie l'accord avant chaque pas |

## Ce que l'accord juge : le design et le fonctionnel

L'accord tapé à `approve` porte sur **le rendu et le comportement** : la fiche ou la fonctionnalité présentée est-elle celle qui était voulue ? Il ne porte pas sur la mécanique de contrôle.

Tout ce qui est technique avance sans demander : cohérence des packs et des versions, épingles et SRI, protocoles de release-train, validations de `pnpm check` / `npm run check`, CI des fournisseurs. Une validation rouge se corrige, dans le code ou dans la validation elle-même quand c'est elle qui est fausse, puis se commite et se pousse sur `main` avant `present`, sans passer par l'accord. Elle ne se contourne jamais : pas de validation désactivée, pas de garde écarté. Le compte rendu vient après coup, dans le rapport de `present`.

Deux choses restent à l'humain : l'accord lui-même, et toute suppression (branches, traces, fichiers).

## Les trois fournisseurs

| | `schema-pbta` | `schema-adrenaline` | `schema-in-the-mist` |
| --- | --- | --- | --- |
| Candidate | `release.yml` en `mode=digest` (empaquette et calcule l'empreinte, sans release), puis `mode=stage` (publie la candidate nommée par le manifeste) | `publish-candidate.yml` | `release-candidate.yml` |
| Manifeste de train | `release-train/candidates/<pkg>-<tag>.json` puis `release-train/<pkg>-<tag>.json`, commités par une personne | `release-train/<pkg>-<tag>.json`, commité par une personne | `release-trains/<tag>.json`, statut `pending`, commité par une personne |
| Preuve | `release-train.yml` | `release-train.yml` | `npm run release-train:assert` en local, qui écrit un fichier de provenance |
| Finale | `release.yml` en `mode=promote`, mêmes octets que la candidate | tag final **poussé par une personne**, qui déclenche `release.yml` | `npm run release-train:promote` en local, dans le checkout du fournisseur, propre et sur `origin/main` |
| Convergence | aucun outil propre : les pins finaux des deux consommateurs font foi, et le rapport le signale | le JSON exact de `release-train/<pkg>-vX-final.json` à commiter, puis `npm run release-train:verify-final` | manifeste passé à `completed` avec son bloc `final`, puis `release-train:converge`, commit du fichier de convergence, puis `release-train:validate -- --require-complete <tag>` |

## En cas de problème

- **« the repositories are not ready »** : un checkout n'est pas propre ou pas sur `origin/main`. La commande à lancer est affichée.
- **« supervisor guard: … is refused »** : une validation tente de publier. C'est la validation qu'il faut corriger, pas le garde.
- **Accord annulé** : un commit hors `trainFiles`, ou une URL de release inconnue du train, est arrivé sur un dépôt. Relancer `present` puis `approve`.
- **Checkout Windows** : `.gitattributes` force des fins de ligne LF sur `tools/supervisor/guard/`. Un script du garde en CRLF casse son shebang, et le garde laisse alors tout passer.
