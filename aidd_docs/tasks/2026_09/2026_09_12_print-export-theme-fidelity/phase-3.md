---
status: pending
---

<!-- Fill or omit these sections; never add, rename, or reorder one. -->

# Instruction: Mise en page à l'impression (colonnes et texture)

## Architecture projection

> Tree of the final files. ✅ create · ✏️ modify · ❌ delete

```txt
obsidian-handbook/
└── src/styles/
    ├── adrenaline/_page.scss           ✏️ @media print : une colonne, pas de texture
    └── styles.scss                     ✏️ print-color-adjust transversal (html/body)
```

## User Journey

```mermaid
flowchart TD
  A[Note Adrenaline, mise en page écran deux colonnes + texture] --> B[Impression / export PDF]
  B --> C[@media print : column-count repasse à 1]
  C --> D[@media print : background-image de texture retiré]
  D --> E[background-color du pack, polarité light, reste affiché]
  E --> F[Callouts et blocs de jeu inchangés, déjà fidèles via la phase 2]
```

## Tasks to do

### `1)` Neutraliser les colonnes et la texture d'Adrenaline à l'impression

> Seul le mixin `page` d'Adrenaline déclare colonnes et texture (`src/styles/adrenaline/_page.scss`).

1. Ajouter dans `_page.scss`, à l'intérieur du mixin `page`, une règle `@media print { .markdown-reading-view:not(.adrenaline-one-column) .markdown-preview-sizer { column-count: 1; } }` — sélecteur identique à celui de la règle écran (L.77-81), donc même spécificité ; la victoire vient uniquement de l'ordre de source (cette règle est ajoutée après, à la fin du mixin), pas d'un `!important`, et s'applique même si la largeur de la page imprimée dépasse 900px (paysage, grand format).
2. Ajouter dans le même bloc `@media print`, sur le sélecteur `.markdown-source-view, .markdown-reading-view` (identique à celui de la ligne 5), `background-image: none` — `background-color: var(--background-primary)` (ligne 4) reste hérité tel quel, sans le réécrire.
3. Vérifier que les exceptions `column-span: all` existantes (`.mod-header`, titres, blocs Adrenaline) n'ont plus d'effet indésirable une fois à une seule colonne — elles doivent rester sans effet visible, pas se dupliquer visuellement.

### `2)` Confirmer l'absence de besoin pour les trois autres jeux

> City of Mist, Legend in the Mist et Otherscape n'ont pas de mixin de page.

1. Relire `src/styles/city-of-mist/index.scss`, `src/styles/legend-in-the-mist/index.scss`, `src/styles/otherscape/index.scss` : confirmer qu'aucun ne déclare de `column-count` ni de `background-image` de texture.
2. Si confirmé, ne rien ajouter pour ces trois jeux dans cette phase : leur fond hérite déjà de `--background-primary` posé par la phase 2, sans texture à retirer.

### `3)` Poser `print-color-adjust: exact` de façon transversale

> Une seule règle, pas une par jeu, pour que Chromium n'efface pas les fonds/couleurs par défaut à l'impression.

1. Ajouter dans `src/styles/styles.scss` (ou un petit partial dédié suivant la doctrine "où vit une valeur" du fichier) une règle `@media print { html, body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }`.
2. Documenter en tête de ce partial, si nouveau, qu'il s'agit d'une valeur locale (vocabulaire Chromium/impression, pas un jeton de pack).

## Test acceptance criteria

| Task | Acceptance criteria |
| ---- | -------------------- |
| 1 | En émulant `@media print`, une note Adrenaline avec plus de 900px de largeur simulée s'affiche en une seule colonne, sans image de texture, avec un fond uni de la couleur du pack en polarité light. |
| 2 | Aucune modification SCSS n'a été faite pour City of Mist, Legend in the Mist ou Otherscape, et leur rendu simulé en `@media print` reste fidèle à leur thème (fond uni hérité, pas de colonne à retirer puisqu'il n'y en avait pas). |
| 3 | Un fond de couleur (pas seulement du texte) survit à un export PDF réel, confirmant que `print-color-adjust: exact` a bien un effet mesurable. |
