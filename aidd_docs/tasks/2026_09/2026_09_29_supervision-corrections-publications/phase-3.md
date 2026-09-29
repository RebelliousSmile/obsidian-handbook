---
status: pending
---

<!-- Fill or omit these sections; never add, rename, or reorder one. -->

# Instruction: Présentation et feu vert lié aux commits

## Architecture projection

> Tree of the final files. ✅ create · ✏️ modify · ❌ delete

```txt
obsidian-handbook/
├── supervisor/
│   ├── topology.json                    ✏️ commandes de validation locales par dépôt
│   └── train.schema.json                ✏️ bloc approval
└── tools/
    ├── supervise.mjs                    ✏️ sous-commandes present, approve
    └── supervisor/
        ├── present.mjs                  ✅ rapport de présentation (Markdown)
        ├── digest.mjs                   ✅ empreinte des SHA, des trainFiles admis et des publications annoncées
        ├── approval.mjs                 ✅ enregistrement et vérification de l'accord
        └── guard/
            ├── gh                       ✅ refuse release, workflow run, pr merge ; délègue le reste
            └── git                      ✅ refuse push et tag ; délègue le reste
```

## User Journey

```mermaid
flowchart TD
  A[Tous les éléments faits] --> B[supervise present]
  B --> C[Validations locales sans publication dans chaque dépôt concerné]
  C --> D[Rapport : commits, changements, validations, aperçu local #65, publications annoncées]
  D --> E{Utilisateur}
  E -->|refuse ou se tait| F[Aucun accord enregistré : publish refusé]
  E -->|supervise approve| G[Saisie de l'identifiant du train + empreinte affichée]
  G --> H[approval lié aux SHA et empreintes dans le dossier]
  H --> I[Tout changement ultérieur hors trainFiles ou vers une archive inconnue invalide l'accord]
```

## Test Scope

```mermaid
---
title: Test scope
---
journey
  section Setup
    Train de test dont tous les éléments sont faits, validations factices qui réussissent => prêt: 5: system
  section Happy path
    supervise present => rapport listant commits, validations réussies et publications annoncées par fournisseur: 5: cli
    supervise approve avec l'identifiant du train saisi => approval enregistré avec SHA, empreinte, date et publications couvertes: 5: cli
  section Edge case - accord sans saisie
    supervise approve sans terminal interactif => aucun accord enregistré, sortie non nulle: 1: cli
  section Edge case - résultat modifié après accord
    Nouveau commit hors trainFiles sur un dépôt du train => supervise approve --verify => accord invalide, dépôt, SHA et fichier nommés: 1: cli
  section Edge case - commit d'adoption prévu
    Commit Lantern qui ne change que les pins vers l'URL et l'SRI du candidat observé => supervise approve --verify => accord toujours valide: 5: cli
  section Edge case - validation en échec
    Validation locale d'un fournisseur en échec => supervise present => rapport marqué non présentable, approve refusé: 1: cli
  section Edge case - publication pendant present
    Commande de validation qui tenterait gh release create => supervise present => refusée par le garde-fou avant exécution: 1: cli
  section Teardown
    Supprimer la racine de test => baseline: 5: system
```

## Tasks to do

### `1)` Validations locales sans publication

> Réutiliser les validations de chaque dépôt, sans rien publier.

1. Dans `topology.json`, par dépôt, la liste des commandes de validation locale (`pnpm check`, `npm run check`, `pnpm build`, etc.).
2. Garde-fou réel : `present` préfixe le `PATH` des validations par `tools/supervisor/guard/`, où `gh` refuse `release`, `workflow run` et `pr merge`, et `git` refuse `push` et `tag`, puis délèguent le reste aux vrais binaires. Le harnais prouve le même garde-fou, pas un faux `gh`.
3. Pré-condition en lecture seule : chaque dépôt concerné a un arbre propre et `HEAD == origin/main` ; sinon `present` s'arrête en nommant le dépôt et la commande à lancer à la main (`git switch main && git pull`). Les SHA enregistrés sont ces `HEAD`.

### `2)` Rapport de présentation

> Montrer la preuve adaptée au changement.

1. Commits et diffstat par dépôt depuis le `baseSha` de son élément.
2. Résultat de chaque validation.
3. Rappel de l'aperçu local de #65 (`pnpm dev:schema-pbta`) quand schema-pbta change ; pour les autres fournisseurs, le rapport indique qu'aucun aperçu local n'existe encore.
4. Liste des publications que l'accord couvrira : RC, promotion, releases des consommateurs.

### `3)` Accord explicite

> Seul un geste interactif de l'utilisateur vaut accord.

1. `digest.mjs` : empreinte stable des SHA de chaque dépôt, des `trainFiles` admis et de la liste des publications annoncées.
2. `approve` affiche l'empreinte et exige que l'utilisateur tape l'identifiant du train ; pas de `--yes`.
3. `approval.mjs --verify` : pour chaque dépôt, les commits postérieurs au SHA approuvé ne doivent toucher que ses `trainFiles`, et toute URL/SRI introduite doit correspondre à une archive observée du train (candidat ou finale) ; sinon l'accord est invalide et renvoie à `present`, en nommant le dépôt, le commit et le fichier.

## Test acceptance criteria

| Task | Acceptance criteria |
| ---- | ------------------- |
| 1 | Pendant `present`, aucune release, aucun push et aucun déclenchement de workflow n'a lieu par `gh` ou `git`, même si une commande configurée le tente. |
| 2 | Le rapport cite chaque dépôt concerné avec ses SHA et le résultat de ses validations. |
| 3 | Sans saisie interactive, aucun `approval` n'est écrit ; un commit hors `trainFiles`, ou qui introduit une URL/SRI inconnue, rend `approve --verify` non nul et nomme le dépôt ; un commit d'adoption du candidat observé le laisse valide. |
