# CI, épingles de producteur et version de release

> Extrait de `CLAUDE.md` le 2026-09-30, contenu inchangé.

## CI : un seul installeur, un seul lockfile (corrigé le 2026-09-20)

**Les CI échouaient à chaque push, et pas à cause des comparaisons de version.** `ci.yml` et `release.yml` lançaient `npm ci` alors que `package-lock.json` n'est **pas suivi par git** — `npm error code EUSAGE … can only install with an existing package-lock.json`. Le job mourait avant d'atteindre la moindre assertion : n'importe quel commit, même vide, donnait le même rouge. Aggravant : `tools/assert-mist-contract.mjs` et `tools/assert-adrenaline-contract.mjs` *lisaient* ce même fichier non suivi, donc `pnpm check` n'était vert en local que grâce à un artefact présent sur cette machine et introuvable dans un checkout propre.

Ce qui a changé :

- les deux workflows installent par `pnpm/action-setup@v4` + `pnpm install --frozen-lockfile`, avec `cache: pnpm` et `cache-dependency-path: handbook/pnpm-lock.yaml` ; `npm run check` devient `pnpm check` ;
- `package.json` déclare `packageManager: "pnpm@10.5.2"` — c'est de ce champ que `pnpm/action-setup` tire la version, sans quoi l'action échoue ;
- les deux lanceurs ne vérifient plus que `pnpm-lock.yaml` : l'URL publique, le SRI de la résolution épinglée, et l'absence de redirection signée `release-assets.githubusercontent.com` ;
- `pnpm assert:ci-install` ferme la porte : un `npm ci|install|run` dans un workflow, un `pnpm install` sans `--frozen-lockfile`, un outil qui relit `package-lock.json`, un `packageManager` disparu — quatre régressions, quatre échecs, vérifiés par mutation.

**Les workflows sont la seule partie du build qui ne tourne jamais en local** : c'est pourquoi ils ont pu rester cassés sans que rien ne le remarque. Toute exigence portant sur un checkout propre doit donc être affirmée par un `assert:*`, pas par l'habitude.

## Les épingles de producteur se lisent, elles ne se recopient pas

`assert:mist-contract` et `assert:adrenaline-contract` déduisaient leur version attendue d'un littéral : chaque release amont cassait le build sans que rien ne soit cassé. Désormais l'URL de release est **lue dans `package.json`**, sa forme est validée (`https://github.com/…/<schema>/releases/download/v…tgz`), la version en est extraite, et c'est *cette* valeur qui est confrontée au lockfile et au paquet installé. Un bump reste une édition d'une ligne, dans un seul fichier.

Même principe pour le contrat Adrenaline : `assertAdrenalineContractVersion` figeait `"1.0.0"` ; elle exige maintenant un **major de contrat** (`/^1\.\d+\.\d+$/`). Un minor ou un patch amont est adopté sans toucher au code, `2.0.0` est refusé — c'est là que se situe la vraie rupture. Les versions d'**enveloppe** (`manifestVersion`, `tomlVersion`) restent des égalités : elles décrivent le format du fichier lu, pas la cadence du producteur.

## La version se tient à une seule valeur, et le tag la prouve (corrigé le 2026-09-20)

`manifest.json`, `package.json` et `versions.json` sont restés à **2.15.3** pendant que les tags allaient jusqu'à `v2.19.1`. Obsidian lit le **manifeste**, pas le tag : chacune de ces releases annonçait donc `2.15.3` à un coffre déjà installé, aucune mise à jour n'a jamais été proposée. Rien ne pouvait le remarquer — les trois fichiers étaient d'accord **entre eux**, et ne divergeaient que du tag et du changelog.

`pnpm assert:release-version` tient maintenant la version à une valeur unique sur ses quatre lieux d'écriture : les trois fichiers plus la section la plus récente de `CHANGELOG.md`. Le workflow de release la relance **avec le tag** (`RELEASE_TAG: ${{ github.ref_name }}`, étape posée entre `Check plugin` et `Create release`). ⚠ **Pousser un tag ne publie rien** depuis le 2026-09-23 (`dafdab3`) : `release.yml` ne se déclenche que par `workflow_dispatch`. Publier, c'est `gh workflow run release.yml --ref v<x.y.z>` — lancé sur le tag, pour que `github.ref_name` soit ce tag ; lancé sur `main`, `RELEASE_TAG` vaut `main` et l'assertion échoue avant `Create release` : c'est le seul endroit où le tag est connu et le seul où l'écart embarque vraiment. Vérifié par mutation : un `RELEASE_TAG` décalé sort en 1 en nommant ce que le manifeste embarquerait.

Deux corollaires :

- **Passer par `pnpm version <x.y.z>`**, jamais par une édition à la main de `manifest.json` : le script de cycle de vie `version` appelle `version-bump.mjs`, qui réécrit `manifest.json` et `versions.json` puis les stage. Ce script préserve désormais le saut de ligne final des deux fichiers — sans quoi chaque bump traînait un `\ No newline at end of file` dans son propre diff de release.
- **Les versions sautées ne sont pas rétro-remplies dans `versions.json`** : aucun build publié ne les a jamais déclarées, et inventer une entrée affirmerait une compatibilité que personne n'a mesurée.

Cinq tags n'avaient aucune release, pour cinq pannes distinctes : `v2.10.0` (`ENOENT … corpus/refus`), `v2.12.0` (`Dynamic require of "path" is not supported`), `v2.16.0` (lint `obsidianmd/prefer-active-doc`), `v2.18.0` (`npm ci` sans lockfile suivi), `v2.19.0` (`No pnpm version is specified`). Chacune n'a été corrigée que sur `main`, et **rejouer un run rejoue le workflow tel qu'il était à ce commit** — `release.yml` n'avait alors aucun `workflow_dispatch` (ajouté le 2026-09-23, voir plus haut). Ces cinq tags ont donc reçu une release **sans artefact**, notes tirées du changelog et `--latest=false`, la raison écrite en tête des notes. Un build fait à ces tags aurait de toute façon déclaré `2.15.3`.


## Ce que le superviseur répète en local, ce qui reste en CI (plan « supervisor-faster-flexible-checks », 2026-10)

Un rouge découvert en CI coûte un cycle `ship` entier. Trois preuves ont donc été ramenées avant le premier dispatch ; le détail est dans `doc/supervisor.fr.md`, ne pas le redire ici.

- **Le paquet, pas le checkout.** `present` empaquette à blanc chaque fournisseur du train (`npm pack --dry-run --json`, derrière la garde de publication) et valide chaque consommateur contre ces seuls fichiers. Un fichier lu par un consommateur mais laissé hors du paquet est rouge dès `present`, plus après la candidate.
- **Le manifeste de train.** Un fournisseur qui déclare une `rehearsal` dans la topologie (aujourd'hui `schema-pbta` seul) voit ses preuves statiques jouées avant de poser le manifeste et avant de dispatcher `release-train.yml`.
- **Les gardes par rôle.** `pnpm assert:guards-by-role` refuse un numéro de version, un tag ou une URL d'archive écrits en chiffres dans une garde que le train déplace : c'est ce littéral qui faisait rougir une CI au commit d'adoption.

**Reste en CI**, et ne se rejoue pas en local : ce qu'un hôte prouve (chargement du plugin dans Obsidian sous `xvfb` par `release-train.yml`), l'empaquetage réel et la publication des candidates et des finales, les releases des consommateurs. Les workflows restent hors de portée du superviseur et de la skill `ship-train`.

Un commit d'outillage posé dans un fournisseur après sa candidate ne relance plus de run quand il publie les mêmes fichiers (empreinte du paquet identique, commit descendant de celui de la candidate).
