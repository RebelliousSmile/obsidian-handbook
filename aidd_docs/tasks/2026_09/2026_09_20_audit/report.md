---
name: audit
description: Codebase audit report - full run, handbook
argument-hint: N/A
---

# Codebase Audit: handbook

23 findings sur les sept piliers : quatre critiques isolés et adressables un par un — une perte tout-ou-rien des feuilles de style, une épingle adrenaline à la mauvaise majeure, `postcss` vulnérable sur le chemin d'exécution, et 96,6 % de la feuille livrée en polices base64.

- **Date**: 2026-09-20
- **Scope**: handbook (les sept piliers)
- **Health**: fair
- **Findings**: 4 critical, 13 warning, 6 minor

## Findings

| Sev | Category     | Location                           | Issue                                                                                                                                                         | Suggested fix                                                                              | Effort |
| --- | ------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------ |
| 🔴  | code-quality | `src/games/assets.ts:315`          | `return state` tout-ou-rien dans la boucle des feuilles (aussi `:323`) : une feuille fautive jette toutes les feuilles du pack, contre la règle documentée      | Remplacer les deux `return state` par `continue`                                            | S      |
| 🔴  | architecture | `package.json:66`                  | `schema-adrenaline` épinglé en v1.0.0 alors que la source est en 2.x et lantern en v2.0.0 : deux consommateurs sur des majeures différentes                      | Trancher une majeure pour le projet et réaligner les deux consommateurs                     | M      |
| 🔴  | dependencies | `package.json:64`                  | `postcss` 8.5.6 en dépendance d'exécution, 4 avis dont traversée de chemin et lecture de fichier arbitraire, utilisé sur du CSS de pack tiers                    | Monter à ≥8.5.23                                                                            | S      |
| 🔴  | performance  | `src/styles/fonts.scss:16`         | Les 11 `@use` de polices (`:16-26`) embarquent 3 568 437 octets de base64 chargés inconditionnellement, soit 96,6 % de `dist/styles.css`                         | Charger des `.woff2` depuis le dossier du plugin et ne déclarer que les faces du jeu actif   | L      |
| 🟡  | code-quality | `src/settings/index.ts:1`          | 843 lignes mêlant onglets, sources, surcharges de pack et plomberie de tâches                                                                                  | Découper par section de réglages                                                             | M      |
| 🟡  | architecture | `src/games/fromSchema.ts:25`       | `games` importe du code d'exécution de `features/blocks/shape` alors que `features` importe `games` 22 fois : dépendance bidirectionnelle                        | Déplacer `shape` vers une couche commune                                                     | M      |
| 🟡  | architecture | `package.json:67`                  | `schema-in-the-mist` épinglé en v1.3.0 alors que source et lantern sont en 1.3.3                                                                                | Monter l'épingle à 1.3.3                                                                     | S      |
| 🟡  | security     | `src/games/assets.ts:333`          | `postcss.parse` sur du CSS tiers sans `from` ni borne de taille                                                                                                 | Borner l'entrée et passer `{ from }`                                                         | M      |
| 🟡  | security     | `src/games/sourceInstaller.ts:114` | Budget de 20 Mo vérifié après tamponnage complet de l'asset                                                                                                    | Vérifier la taille avant de tamponner                                                        | S      |
| 🟡  | dependencies | `package.json:65`                  | `postcss-selector-parser` 7.1.0 : déni de service (≥7.1.0 <7.1.3)                                                                                              | Monter à ≥7.1.3                                                                              | S      |
| 🟡  | performance  | `src/BrumesPlugin.ts:219`          | Réinstallation des sources strictement sérialisée, UI bloquée pendant N allers-retours                                                                          | Paralléliser avec une file bornée et agréger les échecs                                      | M      |
| 🟡  | performance  | `src/games/assets.ts:333`          | Analyse CSS complète sans borne ni cache, à chaque rechargement de source                                                                                       | Mémoriser le résultat par révision de pack                                                   | M      |
| 🟡  | tests        | `package.json:24`                  | Les trois `e2e:*` (`:24-26`) ne tournent ni dans `check` ni dans `ci.yml:39`                                                                                    | Ajouter un job CI qui les lance                                                              | M      |
| 🟡  | tests        | `tools/check.mjs:12`               | `assert:adrenaline-theme` et `assert:adrenaline-zombiology-style` exclus de tout enchaînement automatisé                                                        | Job CI dédié, ou rattachement documenté au dépôt de schémas                                  | M      |
| 🟡  | tests        | `.github/workflows/ci.yml:39`      | `pnpm check` est la seule vérification : la couverture CI dépend de ce que `check` découvre par nommage                                                         | Expliciter la liste des suites attendues en CI                                               | S      |
| 🟡  | ui           | `src/settings/index.ts:773`        | Aucun `aria-*`, `role` ni `alt` dans `src/` sur 22 `createEl` et 8 `createDiv`/`createSpan`                                                                     | `role="status"` sur les zones mises à jour, nommer les contrôles non textuels                | M      |
| 🟡  | ui           | `src/settings/index.ts:125`        | Le bouton réseau n'a ni état de chargement ni retour de réussite (`runTask` `:833` ne rapporte que les échecs)                                                  | Désactiver pendant la tâche, afficher le chargement, notifier la réussite                    | S      |
| 🟢  | code-quality | `tools/check.mjs:11`               | Exclusion morte : `assert:adrenaline-source` n'existe plus                                                                                                      | Supprimer l'entrée                                                                            | S      |
| 🟢  | code-quality | `src/settings/index.ts:114`        | `no-deprecated` désactivé pour `this.display()` d'avant 1.13                                                                                                    | Migrer vers l'API post-1.13                                                                   | S      |
| 🟢  | architecture | `.github/workflows/ci.yml:14`      | `path: handbook` vestigial, force les surcharges en aval (`:31`)                                                                                                | Retirer `path:` et ses surcharges                                                             | S      |
| 🟢  | security     | `src/games/githubSources.ts:41`    | `path` interpolé dans l'URL ; le garde-fou vit dans l'appelant (`sourceInstaller.ts:21`)                                                                        | Réaffirmer `safeRelativePath` dans `read()`                                                   | S      |
| 🟢  | dependencies | `package.json:77`                  | `ajv` 6.12.6 (dev) : ReDoS, corrigé en 6.14.0                                                                                                                  | Monter à ≥6.14.0                                                                              | S      |
| 🟢  | ui           | `src/settings/calloutsModal.ts:68` | Couleur `#e2c6c5` en dur, hors palette et hors thème du coffre                                                                                                  | Remplacer par une variable CSS Obsidian                                                       | S      |

## Top actions

1. **Corriger la perte tout-ou-rien des feuilles de style** (`src/games/assets.ts:315,323`) et ajouter le harnais qui manque — un bug de correction contre un contrat documenté, effort `S`. Résout la ligne critique `code-quality` et la troisième action de `tests.md`. → `refactor` puis `test`.
2. **Monter `postcss` et `postcss-selector-parser`** (`package.json:64-65`), puis borner et identifier le CSS remis à l'analyseur (`src/games/assets.ts:333`). Résout le critique `dependencies`, le warning `dependencies`, les deux warnings `security`/`performance` sur le même appel. → `impeccable`.
3. **Sortir les polices du base64** (`src/styles/fonts.scss:16-26`) — un seul chantier supprime 96,6 % de la feuille livrée. Effort `L`, à planifier. → `plan`.
4. **Trancher les épingles inter-dépôts** (`package.json:66-67`) : adrenaline à deux majeures entre handbook et lantern, mist en retard d'un patch. Résout les deux findings `architecture` de tête.
5. **Brancher les tests orphelins sur la CI** (`package.json:24-26`, `tools/check.mjs:12-13`) : cinq harnais existants ne protègent aujourd'hui rien.

## Coverage

- **Scanned**: code-quality, architecture, security, dependencies, performance, tests, ui — les sept piliers ont été examinés, chacun avec son fichier dans ce dossier.
- **Skipped**: none. Trois piliers ont tourné en mode dégradé, faute d'outillage d'exécution : `ui` — no url provided, runtime a11y pass skipped, static inspection only ; `tests` — no coverage tool, static inspection only ; `performance` — no profiler, static heuristics only.
