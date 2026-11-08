---
status: in-progress
---

# Instruction: Train — rendu dans le coffre puis livraison

## Architecture projection

> Tree of the final files. ✅ create · ✏️ modify · ❌ delete

```txt
obsidian-handbook/
├── package.json                  ✏️ épingle schema-in-the-mist v<N+1>
├── CHANGELOG.md                  ✏️ section de la version v<M+1>
├── manifest.json, versions.json  ✏️ mis à jour par `pnpm version`
├── src/styles/otherscape/_themes.scss, _cards.scss ✏️ retire les règles Cairo remplacées par la carte du schéma (Tokyo garde les siennes)
└── supervisor/trains/otherscape-variantes-design.json ✅ topologie du train schema-in-the-mist → Handbook
```

## User Journey

```mermaid
flowchart TD
  A[present : validations des deux dépôts] --> B[Déploiement dans le coffre Otherscape]
  B --> C{Verdict de rendu de l'utilisateur}
  C -->|validé| D[ship : publish, converge, release, close]
  C -->|refusé| E[correction, deux cycles au plus]
  E --> B
```

## Test Scope

```mermaid
---
title: Test scope
---
journey
  section Setup
    pnpm supervise present => validations des deux dépôts au vert: 5: cli
    L'utilisateur met à jour la source du pack dans le coffre => pack Otherscape v<N+1> chargé: 5: system
  section Happy path
    Ouvrir les notes de test en Cairo clair puis sombre => les trois points de contrôle correspondent aux maquettes: 5: browser
  section Edge case - rendu refusé
    Écart sur un point de contrôle => corriger puis rendre de nouveau, deux cycles au plus: 1: browser
```

## Tasks to do

### `1)` Présenter et déployer

> Tout se contrôle avant le départ du train.

1. Dans Handbook, retirer les règles Cairo de `_themes.scss` et `_cards.scss`, remplacées par la carte du schéma. Les règles Tokyo restent.
2. Écrire `supervisor/trains/otherscape-variantes-design.json` (schema-in-the-mist → Handbook) et lancer `pnpm supervise present`.
3. Déployer `dist/` dans le coffre Otherscape, sans jamais écraser `data.json`. La mise à jour de la source du pack est un geste de l'utilisateur.

### `2)` Verdict de rendu

> On ne demande à l'utilisateur que le verdict de rendu.

1. Comparer le rendu aux trois points de contrôle fixés en phase 4, et présenter les captures.

### `3)` Livrer et suivre

> Après le verdict, le train s'exécute sans autre validation.

1. Lancer `pnpm supervise ship --run` ; le commit du train se termine par les `Closes #` concernés.
2. Ouvrir le ticket Tokyo : même chemin que Cairo, à partir des maquettes `tokyo-*.jpg`.

## Test acceptance criteria

| Task | Acceptance criteria |
| ---- | ------------------- |
| 1 | Une carte de thème en Cairo ne porte plus que la présentation du schéma. `present` est au vert sur les deux dépôts avant tout déploiement. |
| 2 | L'utilisateur valide Cairo, en clair et en sombre, sur les trois points de contrôle. |
| 3 | schema-in-the-mist v<N+1> et Handbook v<M+1> sont publiés, et un ticket Tokyo existe. |

## Constats et dérives

- **Premier verdict de rendu refusé** (2026-11-04) : les titres portaient le filet de couleur à gauche que Border dessine ; il est neutralisé pour Otherscape (`_headings.scss`). La capture « pas Cairo » montrait en fait Tokyo, l'univers sélectionné dans les réglages.
- **Une polarité par variante**, décision de l'utilisateur (2026-11-04) : Cairo en clair, Metro et Tokyo en sombre. Le pack déclare `polarities` par variante et ne porte que cette couche ; la projection ne nomme qu'un mode par variante, et le validateur l'impose. Handbook savait déjà tenir une polarité par variante (`effectiveColourScheme`) : aucun code consommateur ne change, le réglage « Jeu de couleurs » disparaît pour ces variantes. Le point de contrôle 2 (`cairo-dark.jpg`) ne vaut plus que pour la section `alternate`.
- **Deuxième verdict refusé** (2026-11-04) : titres trop gros et sans bandeau visible, d'après `cairo-light.jpg` — la capture montrait encore Tokyo, l'univers resté sélectionné. Cairo prend des tailles de titre propres (H1 2.4em, H2 1.35em, H3 1.05em, jetons `font.size.cairo.*`) ; le sombre de Cairo (`cairo-dark.jpg`, `cairo-tropes.jpg`) devient la section `alternate` (`style.section.note` + variables de feuille sous `.handbook-mode-alternate`, écran seulement). La copie figée du contrat `GamePack` dans schema-in-the-mist ignorait `style.section` : resynchronisée sur celle de Handbook.
- **Retours sur le rendu de Cairo** (2026-11-04) : la texture à croix est retirée (papier uni) ; les bandeaux de titre ont des coins légèrement arrondis (`radius.band`), et le H1 est biseauté en haut à droite (`radius.band-bevel`), en lecture comme en Live Preview. Dans la section `alternate`, le gras et l'italique restaient foncés, hérités de la couche claire de base du pack : Cairo déclare désormais `--bold-color` et `--italic-color` dans chaque polarité.
- **Filet et citation** (2026-11-04) : un filet du papier de la note apparaissait entre deux blocs d'une section forcée (hauteurs fractionnaires) ; le bandeau de section déborde d'un pixel vers le bas (`_mode-sections.scss`). Dans la section `alternate`, la bordure de citation, les liens externes, le texte pâle, le code et les en-têtes de tableau héritaient encore de la couche claire de base : Cairo les déclare dans chaque polarité, la citation prenant l'accent (bleu canard en clair, vert en sombre).
- **Variante par note** (2026-11-04, demande de l'utilisateur) : la propriété `handbook-variant` de la note active choisit la variante, sans toucher au réglage. La feuille du pack est portée par le `body` : tous les panneaux ouverts et l'export PDF suivent la note active.
- **Tokyo et Metro dans ce train** (2026-11-04, décision de l'utilisateur) : Tokyo passe en clair avec une section `alternate` sombre (`tokyo-light.jpg`, `tokyo-dark.jpg`) ; Metro reste sombre, avec une section `alternate` claire (`page.jpg`, `light-chapo.jpg`), et reçoit ses bandeaux et son encre complète. La valeur de propriété illisible venait de `--text-faint`, hérité de la couche claire de base. La feuille des bandeaux devient un générateur commun aux trois variantes (`bandCss`) ; les règles Tokyo de Handbook (`_themes.scss`, `_challenges.scss`, `_character-creation.scss`) sont retirées. Le ticket Tokyo prévu à la tâche 3 devient sans objet.
- **Propriétés invisibles en Metro** (2026-11-04) : la cause n'était pas `--text-faint`. Obsidian déclare `--metadata-input-text-color: var(--text-normal)` et `--metadata-label-text-color: var(--text-muted)` sur le `body`, où elles se résolvent avec l'encre du thème Obsidian (claire), jamais avec celle de la note. Handbook les redéclare sur les propriétés de la note (`_note-ink.scss`).
- **La page de scénario Metro rejoint ce verdict** (2026-11-06, plan `2026_11_06_otherscape-design-reste`, phase 1) : chapô qui traverse le marqueur de colonnes, callouts natifs plats, puces, renvoi d'une ligne et callout `[!chapter]` (tête de chapitre, rôle d'image `metro-emblem`) voyagent dans v<N+1> et v<M+1>. Le verdict de rendu de ce train couvre aussi ses trois points de contrôle (en-tête de l'acte 0 et chapô ; renvoi, read-aloud et puces ; tête de chapitre).
