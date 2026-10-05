# Le superviseur orchestre, GitHub fabrique et prouve

- Date: 2026-10-04
- Status: Accepted
- Supersedes: le plan `aidd_docs/tasks/2026_10/2026_10_02-ci-driven-release-train.md` (étapes 2, 3 bis, 4 et 6 ; l'étape 5, release-please, reste ouverte)

## Context

Deux mécanismes faisaient avancer le même train. Le superviseur local adopte
la candidate, écrit les manifestes, tague la finale et pose l'enregistrement
de convergence. La chaîne GitHub posée les 2 et 3 octobre fait la même chose
par `bump-schema.yml`, `notify-provider.yml`, `promote.yml` et le job
`converge` de `release.yml`. Aucun document ne disait qui possède chaque
écriture, et le plan en vigueur prévoyait de retirer le superviseur.

La chaîne GitHub demande, à chaque train, des relectures et des fusions de PR,
un jeton inter-dépôts et des réglages de dépôt. Elle déplace les gestes vers
GitHub sans en supprimer.

## Decision

**Une écriture a un seul propriétaire.**

| Écriture | Propriétaire |
| --- | --- |
| Le changement lui-même, dans chaque dépôt | une personne ; `supervise commit` le pose tel quel |
| Adoption d'une archive par un consommateur (pin, lockfile, matrice) | superviseur, sur `main` |
| Manifeste de train et enregistrement de convergence | superviseur, par l'outil du fournisseur |
| Tag de candidate et tag final | superviseur |
| Tag de version d'un consommateur | superviseur (`supervise release`), sur la version que `package.json` porte sur `origin/main` |
| Release des consommateurs (Lantern, puis Handbook) | superviseur, qui déclenche le `release.yml` du consommateur et suit son run |
| Version et `CHANGELOG` d'un consommateur | une personne, avec le changement |
| Archive, somme et GitHub Release | GitHub (`publish-candidate.yml`, `release.yml`) |
| Preuve inter-dépôts sur un checkout propre | GitHub (`release-train.yml`, `final-convergence.yml`, CI de chaque dépôt) |
| Code du superviseur | une personne, commit et push à la main (`self.mjs`) |

GitHub ne garde que ce qu'un poste ne peut pas garantir : des archives
immuables et des preuves sur un checkout propre. Le superviseur déclenche ces
workflows et suit leurs runs ; ils ne se déclenchent pas entre eux d'un dépôt
à l'autre.

**Zéro arrêt après la validation** (décision du 2026-10-04). La validation
d'un changement, c'est lancer `supervise ship` : la commande enchaîne `commit`,
`present`, `publish`, `converge`, `release` et `close`, et ne s'arrête que sur
un échec nommé. Aucune porte humaine ne subsiste entre la validation et la
clôture du train : l'utilisateur retire les relecteurs requis de
l'*Environment* `release` du fournisseur, et un run que cet environnement
retient encore est un échec que le superviseur nomme, pas une attente qu'il
tient.

**`approve` est supprimé.** Le lien aux commits est porté par `present` : une
présentation verte lie chaque dépôt au commit validé, et chaque maillon
suivant revérifie ce lien avant chaque pas. Après elle, un dépôt ne reçoit que
des commits touchant ses `trainFiles`, sur des archives que le train a
observées.

**Une validation par changement d'entrée.** Les validations d'un dépôt ne sont
rejouées que si son code ou son épingle a changé depuis la dernière passe
verte.

## Alternatives

Tout porter par GitHub (le plan du 2 octobre) : chaque train coûte deux PR à
relire et fusionner, un lancement de `promote.yml`, un jeton à portée large
stocké chez le fournisseur, et le droit pour Actions de créer et fusionner des
PR. Garder les deux chaînes : dès que le jeton existe, elles écrivent en
concurrence les mêmes fichiers et le même tag. Garder `approve` et
l'environnement : deux gestes pour la même décision, et un superviseur bloqué
sans échéance derrière le second. Garder l'environnement seul comme porte
humaine : le cycle s'arrête encore après la validation, ce que la décision du
2026-10-04 exclut. Laisser les releases des consommateurs à la main : le
train reste ouvert tant que personne ne tague, alors que la version est déjà
écrite dans le changement validé.

## Consequences

- À retirer après la finale 3.1.0, par une personne : `bump-schema.yml` et
  `notify-provider.yml` (Handbook, Lantern), les jobs `notify-consumers`,
  `promote.yml` et le job `converge` de `release.yml` (schema-adrenaline). Le
  secret `TRAIN_DISPATCH_TOKEN` ne se crée pas.
- Les branches de robot `schema/<package>` disparaissent : la règle « tout sur
  `main` » redevient sans exception.
- Les relecteurs requis de l'environnement `release` de `schema-adrenaline`
  sont retirés par l'utilisateur, dans les réglages du dépôt.
- Un train publie Lantern ou Handbook dès qu'il les a modifiés : leur version
  et leur `CHANGELOG` se préparent avec le changement, avant `ship`.
- Les adaptateurs cessent de composer le JSON des manifestes et appellent
  l'outil du fournisseur (`tools/write-release-train.ts`).
- `assert:supervisor` sort de `pnpm check` et ne tourne plus que dans le job
  `supervisor-windows`.
- Constats détaillés : `aidd_docs/tasks/2026_10/2026_10_04_audit/architecture.md`.
