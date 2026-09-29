# Note de reprise — plan #66, phase 5

Écrite le 2026-09-29 pour reprendre l'implémentation sur un autre poste. À supprimer quand le plan passe à `implemented`.

## Où on en est

| Fichier | Statut |
| --- | --- |
| `plan.md` | `in-progress` |
| `phase-1.md` à `phase-4.md` | `done`, un commit par phase sur `feat/supervisor` |
| `phase-5.md` | `pending` : le code est fait et commité en WIP, la doc reste |

Branche : `feat/supervisor`, dans `obsidian-handbook`. Ne pas toucher `fix/handbook-host-artifact-gate`.

## Phase 5 : fait

- `tools/supervisor/converge.mjs` : `supervise converge`.
  - Refuse un fournisseur sans finale publiée ou une approbation qui ne tient plus. Exige des checkouts propres sur `origin/main`.
  - Nomme chaque consommateur encore sur la RC, avec l'URL qu'il pinne et celle de la finale.
  - Lance les commandes `convergence` des consommateurs (`supervisor/topology.json`) derrière le garde de publication, puis l'étape de convergence de chaque fournisseur. Pour mist, une garde évite de relancer en boucle une étape automatique déjà faite.
  - Consigne le bloc `convergence {status, at, repos[{repo, sha}], checks, notes}` dans le dossier du train.
- `tools/supervisor/close.mjs` : `supervise close [--run]`.
  - Exige une convergence `passed`, une approbation qui tient, des `origin/main` qui descendent des SHA de la convergence et aucun écart de pins.
  - Exige les releases consommateurs, Lantern puis Handbook : une version différente de celle de l'approbation, une release GitHub `v<version>`, un tag sur main qui pinne chaque finale.
  - Sans `--run`, montre ce qui serait fermé. Avec `--run`, consigne `consumerReleases`, commente ou ferme chaque issue, ferme l'issue de coordination en dernier, puis passe le train à `closed` avec `closedAt`.
- Adaptateurs : `observeConvergence(ctx)` et `convergence(o)`.
  - pbta : une note seulement, il n'a pas d'outil propre.
  - adrenaline : étape humaine qui affiche le JSON exact de `release-train/<pkg>-vX-final.json`, puis `npm run release-train:verify-final`.
  - mist : étape humaine qui passe le manifeste à `completed` avec son bloc `final`, puis `release-train:converge`, puis une étape humaine pour commiter le fichier de convergence, puis `release-train:validate -- --require-complete vX`.
- Correction de phase 4 (mist). L'instruction de manifeste utilisait `status: "candidate"`, des consommateurs sans `role`/`path`/`proof`, et un `version` dans le candidat. Le validateur mist refuse ces trois choses.
- Schémas : `train.schema.json` gagne `convergence`, `consumerReleases` et `closedAt`. `topology.schema.json` gagne `definitions.commands` et `convergence`. `topology.json` porte les commandes de convergence de Handbook et Lantern.
- `present.mjs` exporte `checkCheckouts` et `runGuarded`, partagés avec `converge`.
- Commandes branchées dans `tools/supervisor/publishCommands.mjs`.
- Harnais : 36 scénarios verts avec `pnpm assert:supervisor`, dont 7 nouveaux pour la phase 5. Nouvel effet `write` dans `fake-npm`.

## Phase 5 : reste à faire

1. `doc/supervisor.fr.md` et `doc/supervisor.en.md`, avec les mêmes commandes dans le même ordre :
   `status` → `open` / `link` → `next` → `present` → `approve` → `publish` → `converge` → releases consommateurs → `close`.
   Y dire :
   - ce qui est automatique, ce qui reste humain, et ce qui ne se publie jamais avant accord ;
   - l'aperçu local de #65, `pnpm dev:schema-pbta` ;
   - les différences entre les trois fournisseurs :
     - pbta : `release.yml` digest, stage, promote, et `release-train.yml` ;
     - adrenaline : `publish-candidate.yml`, `release-train.yml`, tag final poussé par une personne, puis `release.yml` ;
     - mist : `release-candidate.yml`, puis `release-train:assert` et `release-train:promote` en local.
2. Une section Superviseur / Supervisor dans `README.md` (FR et EN) qui renvoie aux deux guides.
3. Vérifications : `pnpm lint`, `./node_modules/.bin/eslint src --ext .ts`, `pnpm assert:supervisor`, `pnpm check`, `rtk proxy pnpm build`.
4. Passer `phase-5.md` à `status: done` et commiter. Passer `plan.md` à `status: implemented`, commiter, puis supprimer cette note.

## Écarts au plan à reporter dans le rapport final

- `close` exige que `origin/main` **descende** des SHA de la convergence, pas qu'il leur soit égal : les commits de release des consommateurs arrivent après la convergence.
- `release-train:validate -- --require-complete` remplace `validate-completed`, qui n'existe pas dans mist.
- adrenaline : `release-train:verify-final` en local plutôt que le workflow `final-convergence.yml`.
- mist : le fichier de convergence est commité par une personne. mist n'utilise pas `release-train:stage`.
- Le tag final d'adrenaline est une étape humaine.
- `check.mjs` n'a pas été modifié.
- Champs ajoutés au dossier de train : `presentation`, la forme d'`approval` et de `publication`, `runs`, `convergence`, `consumerReleases`, `closedAt`.
- Fichiers hors plan :
  - `trainCommands.mjs`, `approvalCommands.mjs`, `publishCommands.mjs` ;
  - `adapters/common.mjs` ;
  - `fixtures/supervisor/fake-npm.mjs` ;
  - le champ `convergence` de la topologie ;
  - les exports de `present.mjs`.
- Le garde gh ne bloque que les commandes de publication. `present` ignore `supervisor/trains/`. Les validations ont été ajoutées à la topologie, et `topology.json` a été reformaté.
- Travail sur la branche `feat/supervisor`, contre la règle Codex `0-main-only-execution`.
- Constats :
  - le checkout local de pbta n'était pas sur main ;
  - `mode=digest` n'existe que sur l'`origin/main` de pbta ;
  - `gh secret list` ne voit que les secrets du dépôt ;
  - Mist #25 serait fermée sans preuve (`closed-unproven`).
- Choix de publication :
  - la vérification des secrets porte sur tout le fichier de workflow ;
  - le candidat pbta est consigné dès la fin du digest ;
  - un nouveau run se reconnaît en comparant les identifiants de run ;
  - `run(step)` vit dans `publish.mjs`.

## Reprendre sur l'autre poste

```bash
cd obsidian-handbook
git fetch origin && git switch feat/supervisor
pnpm install
pnpm assert:supervisor   # doit rester vert
```

Les cinq dépôts doivent être clonés côte à côte : `obsidian-handbook`, `lantern`, `schema-pbta`, `schema-adrenaline`, `schema-in-the-mist`. Rien n'est poussé sans demande explicite, sauf cette branche pour la reprise.
