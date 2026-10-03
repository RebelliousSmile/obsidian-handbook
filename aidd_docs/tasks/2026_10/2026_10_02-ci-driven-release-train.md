# Train de release porté par GitHub Actions

Statut : in-progress (proposé le 2026-10-02, mise en œuvre commencée le 2026-10-03). Remplace à terme le superviseur local (`tools/supervisor/`).

## Constat

- Le superviseur est né le 2026-09-29. Il compte 16 commits et environ 5 600 lignes : 3 806 de code, 1 131 de harnais et 660 de doublures.
- Après 4 jours sur son premier train, aucune release consommatrice n'est sortie.
- Il refait en local ce que GitHub sait faire, avec deux conséquences :
  - **lenteur** : `present` prend 18 min, dont 17 pour le `pnpm check` local de Handbook, et le moindre commit hors `trainFiles` relance un cycle `present`/`approve` ;
  - **coercition** : le superviseur doit pouvoir pousser, tagger et dispatcher sur 3 dépôts, puis se faire brider par l'accord lié aux SHA et par le garde local.
- La raison d'être de la CI manuelle de Handbook (« ne pas consommer de minutes Actions ») ne tient plus. Les 5 dépôts sont **publics**, et les runners standard y sont gratuits.
- Les workflows des `schema-*` font déjà la preuve inter-dépôts. `release-train.yml` et `final-convergence.yml` récupèrent Lantern et Handbook et y lancent les contrôles.

## Principe

GitHub valide et traite. En local, on ne garde que l'écriture du changement. Les validations humaines deviennent des gestes GitHub : la revue d'une PR, l'approbation d'un *Environment*. Plus de TTY, plus d'empreinte de SHA.

| Besoin d'origine | Aujourd'hui (superviseur) | Cible (GitHub) |
| --- | --- | --- |
| Ne pas perdre de dépendance | `present` + validations locales | CI `push`/`pull_request` sur chaque dépôt |
| Pas d'erreurs de version en chaîne | adoption locale de la candidate, matrice posée par `converge` | PR de bump ouverte par le workflow du fournisseur dans chaque consommateur, et gardes de pins dans la CI de cette PR |
| Validation humaine | `approve` dans un terminal séparé, accord lié aux SHA | relecture de la PR (design et fonctionnel) et *Environment* `release` sur la promotion du fournisseur |
| Publication | `publish --run` local avec des droits étendus | workflows déclenchés par tag ou par dispatch, droits limités à chaque dépôt |
| Suivi | `status`, `followRun` | `gh pr checks`, onglet Actions ; au mieux, un `status` en lecture seule |

## Déroulé cible d'un changement cassant (exemple : schema-adrenaline 3.0.0)

1. **Fournisseur.** On commite sur `main`, puis la CI du fournisseur valide.
2. **Candidate.** Le tag `vX.Y.Z-rc.N` déclenche `publish-candidate.yml`. Celui-ci publie l'archive, puis envoie un `repository_dispatch` à chaque consommateur avec l'URL et le SRI.
3. **Consommateurs.** Un workflow `bump-schema.yml` met à jour la pin et le lockfile, puis ouvre (ou met à jour) une PR. La CI de la PR fait la preuve : gardes de pins, matrice Lantern, e2e Handbook.
4. **Validation humaine.** Tu relis les PR. La promotion du fournisseur, `release.yml`, attend l'approbation de l'*Environment* `release`, que tu donnes d'un clic.
5. **Finale.** La promotion tague la finale et redispatche aux consommateurs. Les PR passent à la finale, avec la matrice Lantern mise à jour par le workflow de bump, puis fusionnent automatiquement au vert.
6. **Releases des consommateurs.** Un tag sur `main`, puis `release.yml`. La version reste ta décision.

Pour un changement non cassant, on saute les étapes 2 à 4 : tag final, puis PR de bump fusionnée automatiquement au vert.

## Droits résiduels

- Le dispatch inter-dépôts exige un jeton autre que `GITHUB_TOKEN`, qui est limité à son dépôt. Il faut un PAT *fine-grained* limité aux 5 dépôts (`contents` et `pull-requests` en écriture, `actions` en écriture), stocké en secret Actions du fournisseur, ou mieux une GitHub App.
- C'est le seul droit étendu qui reste. Il vit dans GitHub, plus sur le poste.

## Étapes

1. **CI Handbook sur `push`/`pull_request`.**
   - Garder les jobs e2e lourds en `workflow_dispatch`, ou sur PR seulement, si leur durée gêne.
   - Sortir `assert:supervisor` du `pnpm check`.
2. **`bump-schema.yml` dans Handbook et Lantern** (`repository_dispatch` et `workflow_dispatch`).
   - Il bumpe la pin, le lockfile et (Lantern) `release-train.matrix.json`.
   - Il ouvre ou met à jour la PR `schema/<package>`.
   - Il active l'auto-merge.
3. **Côté schéma d'abord**, en commençant par schema-adrenaline :
   - `publish-candidate.yml` et `release.yml` dispatchent vers les consommateurs ;
   - `release.yml` passe derrière l'*Environment* `release` avec relecteur obligatoire.

   Puis on fait de même pour schema-pbta et schema-in-the-mist.
4. **Protection de `main`** sur les consommateurs : checks requis, et auto-merge autorisé.
   - Cela contredit la règle « tout sur `main`, pas de branche » pour **ces PR-là seulement**. Ce sont des branches de robot, et le travail humain reste sur `main`.
5. **Releases par release-please** (Handbook, Lantern, puis les `schema-*`).
   - Il tient une PR « chore(release): x.y.z » ouverte, déduite des commits conventionnels. La fusionner tague et crée la GitHub Release. C'est l'équivalent du flux GitLab `semantic-release`.
   - Handbook :
     - `manifest.json` passe par `extra-files` (jsonpath `$.version`) ;
     - `versions.json` demande un pas de workflow, car c'est une clé à ajouter ;
     - `assert:release-version` doit accepter le format de titre de release-please.
   - Le choix de la version reste humain : on relit la PR, ou on force la version avec `Release-As:`.
6. **Retrait du superviseur** : `approval`, garde de publication, `present`, `publish`, `converge`, doublures et harnais.
   - On le réduit au plus à un `status` en lecture seule, ou on le supprime.
   - Suppression soumise à ton accord.

## Ouvert

- Est-ce qu'on supprime la matrice Lantern (`release-train.matrix.json`) ? Il faut vérifier qu'elle reste nécessaire une fois que les PR de bump prouvent la compatibilité.
- Les candidates sont-elles encore utiles ? On peut s'en passer si la PR de bump peut viser l'archive d'un commit du fournisseur plutôt qu'un tag rc. À trancher après l'étape 3 sur schema-adrenaline.

## Suivi de mise en œuvre

| Étape | État | Notes |
| --- | --- | --- |
| 1. CI sur `push` / `pull_request` | done, sauf un point | Déclencheurs posés et gardés par `assert:ci-install`. Sortir `assert:supervisor` du `pnpm check` reste à faire à la main : la modification de `tools/check.mjs` a été refusée à l'agent. |
| 2. `bump-schema.yml` | done en local, jamais exécuté sur GitHub | Handbook : `tools/bump-schema.mjs`. Lantern : idem, avec les deux lockfiles et la matrice pour une finale. Une candidate n'active pas l'auto-merge. Pour une finale, Lantern attend que le `main` de Handbook porte la pin, puisque la matrice nomme ce commit. Les lockfiles sont réécrits en texte (URL et SRI calculé sur l'archive publiée) : laisser pnpm résoudre y inscrit l'URL signée de redirection, sans SRI, ce que refusent les gardes de pins. Le script échoue si l'archive change ses dépendances, cas à résoudre à la main. Essai local : aller-retour `v3.0.0` ↔ `v3.0.0-rc.1` exact sur les deux dépôts. |
| 3. Schéma | done pour schema-adrenaline, bloqué sur le secret | Job `notify-consumers` dans `publish-candidate.yml` et `release.yml`, *Environment* `release` sur la promotion. Le secret `TRAIN_DISPATCH_TOKEN` est à créer par un humain. |
| 4. Protection de `main` | pending | |
| 5. release-please | pending | |
| 6. Retrait du superviseur | pending, sous accord | |

## Replan needed

- `release.yml` de schema-adrenaline exige `release-train/schema-adrenaline-v<x.y.z>.json` (candidate, SHA256, commits des consommateurs) et un run vert de `release-train.yml`. Ce manifeste était écrit par le superviseur (`present` / `converge`). Le plan ne dit pas qui l'écrit ensuite. À trancher avant l'étape 6 et avant la première finale sans superviseur : soit un workflow du fournisseur l'écrit une fois les deux PR de candidate au vert, soit la preuve portée par les PR de bump le remplace (et la question « Ouvert » sur la matrice Lantern se règle du même coup).
