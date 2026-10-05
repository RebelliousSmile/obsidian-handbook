# Train de release porté par GitHub Actions

Statut : **remplacé le 2026-10-04** par l'ADR `aidd_docs/memory/internal/decisions/supervisor-orchestrates-github-builds.md`. Le superviseur reste l'orchestrateur ; GitHub ne garde que la fabrication des archives et les preuves.

Ce qui reste vrai de ce plan :

- l'étape 1 (CI sur `push` / `pull_request`), dont le point ouvert : sortir `assert:supervisor` du `pnpm check` ;
- l'*Environment* `release` sur la promotion du fournisseur, désormais seule porte humaine d'une finale ;
- la réécriture en texte des lockfiles (`tools/bump-schema.mjs`) et le `check:candidate` de Lantern ;
- `tools/write-release-train.ts` côté schema-adrenaline, que le superviseur doit appeler au lieu de composer les manifestes.

Ce qui est abandonné : les étapes 2 (`bump-schema.yml`), 3 bis (`promote.yml`, job `converge`), 4 (protection de `main` et auto-merge) et 6 (retrait du superviseur), ainsi que le secret `TRAIN_DISPATCH_TOKEN`. Les workflows déjà posés servent encore au train 3.1.0 et se retirent après sa finale.

L'étape 5 (release-please, non commencée) n'est pas tranchée par l'ADR.

Le texte ci-dessous est conservé comme historique (proposé le 2026-10-02, mise en œuvre commencée le 2026-10-03).

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

Révisé le 2026-10-03 (voir « Replan du 2026-10-03 »).

1. **Fournisseur.** On commite sur `main`, puis la CI du fournisseur valide.
2. **Candidate.** Le tag `vX.Y.Z-rc.N` déclenche `publish-candidate.yml`. Celui-ci publie l'archive, puis envoie un `repository_dispatch` à chaque consommateur avec le paquet et le tag.
3. **Consommateurs.** Un workflow `bump-schema.yml` met à jour la pin et le lockfile, puis ouvre (ou met à jour) une PR. La CI de la PR fait la preuve : gardes de pins, e2e Handbook.
4. **Validation humaine.** Tu relis les deux PR de candidate et tu les **fusionnes** : c'est ton accord sur le design et le fonctionnel. `main` porte alors la pin de la candidate, comme avant (`65653b7`). Une candidate refusée ne se fusionne pas : une `rc.N+1` met la même PR à jour.
5. **Promotion.** Tu lances `promote.yml` sur le fournisseur avec le tag de la candidate. Le workflow :
   - vérifie que le `main` des deux consommateurs épingle cette candidate, et relève leurs SHA ;
   - écrit le manifeste protocole 1 `release-train/<paquet>-vX.Y.Z.json`, le commite sur `main` et pose le tag final sur ce commit ;
   - lance `release-train.yml` sur ce manifeste et attend son succès ;
   - lance `release.yml`, qui attend l'approbation de l'*Environment* `release`.
6. **Finale.** `release.yml` publie la finale et redispatche aux consommateurs. Leurs PR de finale fusionnent automatiquement au vert ; celle de Lantern inscrit le manifeste dans sa matrice.
7. **Convergence.** Un dernier job de `release.yml` attend que les deux `main` épinglent la finale, écrit l'enregistrement protocole 2 `…-final.json`, le commite et lance `final-convergence.yml`.
8. **Releases des consommateurs.** Un tag sur `main`, puis `release.yml`. La version reste ta décision.

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

   3 bis. **Manifestes écrits par le fournisseur** (ajouté au replan), sur schema-adrenaline d'abord :
   - `promote.yml` (`workflow_dispatch`, entrée : tag de candidate) écrit le manifeste protocole 1, tague la finale, lance `release-train.yml` puis `release.yml` ;
   - job `converge` de `release.yml` : écrit l'enregistrement protocole 2 et lance `final-convergence.yml` ;
   - l'écriture des deux fichiers vit dans un outil `tools/` du schéma, couvert par son auto-test comme les validateurs existants ;
   - les portes de `release.yml`, `release-train.yml` et `final-convergence.yml` restent telles quelles.
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

- Matrice Lantern (`release-train.matrix.json`) : **gardée** pour l'instant, puisque le bump de finale l'alimente sans geste humain. Sa suppression se rediscute après le premier train complet sans superviseur.
- Candidates : **gardées**. La PR de candidate est l'objet que tu relis ; c'est elle qui porte le contrôle visuel.
- `main` du fournisseur ne peut pas être protégée tant que `promote.yml` y commite avec `GITHUB_TOKEN`. La protection de l'étape 4 ne vise que les consommateurs.

## Suivi de mise en œuvre

| Étape | État | Notes |
| --- | --- | --- |
| 1. CI sur `push` / `pull_request` | done, sauf un point | Déclencheurs posés et gardés par `assert:ci-install`. Sortir `assert:supervisor` du `pnpm check` reste à faire à la main : la modification de `tools/check.mjs` a été refusée à l'agent. |
| 2. `bump-schema.yml` | done en local, jamais exécuté sur GitHub | Handbook : `tools/bump-schema.mjs`. Lantern : idem, avec les deux lockfiles et la matrice pour une finale. Une candidate n'active pas l'auto-merge. Pour une finale, Lantern attend que le `main` de Handbook porte la pin, puisque la matrice nomme ce commit. Les lockfiles sont réécrits en texte (URL et SRI calculé sur l'archive publiée) : laisser pnpm résoudre y inscrit l'URL signée de redirection, sans SRI, ce que refusent les gardes de pins. Le script échoue si l'archive change ses dépendances, cas à résoudre à la main. Essai local : aller-retour `v3.0.0` ↔ `v3.0.0-rc.1` exact sur les deux dépôts. |
| 3. Schéma | done pour schema-adrenaline, bloqué sur le secret | Job `notify-consumers` dans `publish-candidate.yml` et `release.yml`, *Environment* `release` sur la promotion. Le secret `TRAIN_DISPATCH_TOKEN` est à créer par un humain. |
| 3 bis. Manifestes écrits par le fournisseur | done pour schema-adrenaline (`d7b957c`), jamais exécuté sur GitHub | `tools/write-release-train.ts` (modes `candidate` et `final`), `promote.yml`, job `converge` de `release.yml`. L'outil refuse d'écraser un enregistrement commité par d'autres faits ; son auto-test, appelé par `release-train:self-test`, recompose chaque `…-final.json` commité. Essai local sur la 3.0.0 : les deux modes refusent, comme attendu (le `main` des consommateurs a bougé depuis). Le pré-contrôle de `promote.yml` lance `release:verify-provider` sans `SCHEMA_ADRENALINE_PENDING_RELEASE`, qui exige un tag final existant. |
| 4. Protection de `main` | pending | |
| 5. release-please | pending | |
| 6. Retrait du superviseur | pending, sous accord | |

## Replan du 2026-10-03

**Lacune.** `release.yml` de schema-adrenaline exige `release-train/schema-adrenaline-v<x.y.z>.json` (candidate, SHA256, commits des consommateurs) et un run vert de `release-train.yml`. Après la finale, `final-convergence.yml` attend un enregistrement `…-final.json`. Les deux fichiers étaient écrits par le superviseur (`present` / `converge`) ; le plan ne disait pas qui les écrit ensuite.

**Décision : le fournisseur écrit ses manifestes, les portes ne bougent pas.** L'autre option, remplacer le manifeste par la preuve des PR de bump, revenait à retirer des portes de `release.yml` : écartée, puisque la consigne est de ne pas assouplir la CI.

Ce que la décision change par rapport au plan d'origine :

- **La PR de candidate se fusionne.** Le manifeste n'admet que des SHA complets, et `release-train.yml` extrait ces commits. Une branche de robot forcée à chaque bump rendrait ces commits orphelins ; un commit de `main` reste. La fusion par toi devient le geste de validation.
- **La promotion se lance à la main** (`promote.yml`). Le fournisseur ne peut pas savoir seul que les deux PR sont fusionnées, sauf à poser un second jeton dans chaque consommateur ou à scruter par cron. Un lancement explicite coûte un geste et reste cohérent avec « la version est ta décision ».
- **L'*Environment* `release` reste**, comme garde contre un tag final poussé par erreur, bien qu'il double le lancement manuel.
- **La convergence finale n'a pas de geste humain** : les PR de finale fusionnent seules, donc un job peut attendre (au plus 90 min, Lantern attendant déjà Handbook) puis écrire l'enregistrement.

Gestes humains d'un train cassant, au total : pousser et taguer la candidate, fusionner deux PR, lancer la promotion, approuver l'environnement.

**Conséquence sur le test du nouveau train.** La candidate `v3.1.0-rc.1` peut être testée dès que les étapes 1 à 3 sont poussées (étapes 2 à 4 du déroulé). La finale 3.1.0 exige l'étape 3 bis.

**Non vérifié.** Que `GITHUB_TOKEN` puisse lancer `release-train.yml` et `release.yml` par `gh workflow run` depuis `promote.yml` (attendu avec `actions: write`, à prouver au premier essai). Que le job `converge` puisse pousser sur `main` et que ses permissions de job (`contents: write`, `actions: write`) passent le réglage `default_workflow_permissions: read` du dépôt.

**Vérifié après écriture.** `validate:candidate-workflow`, l'auto-test de `validate-versioning.ts`, `validate:final-convergence`, `release-train:self-test`, `tsc --noEmit` et prettier acceptent le nouveau workflow et le job ajouté, sans modification des validateurs.

## Premier passage sur GitHub : train schema-adrenaline 3.1.0 (2026-10-03)

| Étape du déroulé | Résultat |
| --- | --- |
| Commit fournisseur (`c436eff`) | CI verte. |
| `publish-candidate.yml` | `v3.1.0-rc.1` publiée (prerelease, archive et `.sha256`). Job `notify-consumers` en échec, attendu : `TRAIN_DISPATCH_TOKEN` n'existe pas. |
| `bump-schema.yml` (lancé à la main) | Bump, commit et push de `schema/schema-adrenaline` réussis dans les deux consommateurs : la réécriture textuelle des lockfiles tient sur GitHub. `gh pr create` échoue : Actions n'a pas le droit de créer des PR. |
| PR de candidate | Ouvertes à la main : Handbook #72, Lantern #49. Vertes toutes les deux. |

**Trou du plan, corrigé.** Le `npm run check` de Lantern se terminait par la porte de release (`assert:release-inputs`, archives finales exigées) : une PR de candidate ne pouvait pas y être verte, et l'adoption de `v3.0.0-rc.1` était déjà rouge sur `main`. Lantern `0d1a44c` : le workflow `Check` lance `check:candidate` sur un arbre épinglé sur une rc (mêmes contrôles de projet, puis épingles, lockfiles et octets publiés) ; `check` est inchangé et reste ce que lance `release.yml`.

**Reste bloqué sur des réglages de dépôt** (à faire à la main) : droit pour Actions de créer des PR et auto-merge sur Handbook et Lantern, environnement `release` sur schema-adrenaline, secret `TRAIN_DISPATCH_TOKEN`. Sans eux, les PR de finale ne s'ouvrent pas seules et `converge` attendra en vain.

**Toujours non exécuté** : `promote.yml`, la finale et `converge`.
