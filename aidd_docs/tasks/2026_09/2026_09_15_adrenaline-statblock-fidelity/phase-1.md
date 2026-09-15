---
status: done
---

# Instruction: Hiérarchiser les données du monstre

## Architecture projection

> Tree of the final files. ✅ create · ✏️ modify · ❌ delete

```txt
.
└── src
    └── features
        └── adrenalineMonstre
            └── renderer.ts ✏️
```

## User Journey

```mermaid
flowchart TD
  A[Note monstre complète] --> B[Bloc monstre]
  B --> C[En-tête et sections prioritaires]
  C --> D[Capacités regroupées par nature]
  D --> E[Fiche immédiatement parcourable]
```

## Test Scope

```mermaid
---
title: Test scope
---
journey
  section Setup
    system: charger le témoin monstre complet => données de toutes les familles disponibles: 5: cli
  section Happy path
    cli: rendre le bloc monstre => les traits, l'état alternatif, les compétences, l'équipement, la contagion et le narratif apparaissent dans des groupes identifiables: 5: cli
  section Edge case - contenu minimal
    cli: rendre un monstre avec seul nom et caractéristiques => seules les zones non vides sont présentes: 5: cli
```

## Wireframe

```txt
┌────────────────────────────────────┐
│ (1) Identité et niveau              │
├────────────────────────────────────┤
│ (2) Détection et mouvement          │
├────────────────────────────────────┤
│ (3) Actions et comportement         │
├────────────────────────────────────┤
│ (4) Données physiques               │
├────────────────────────────────────┤
│ (5) Santé et protections            │
├────────────────────────────────────┤
│ (6) Capacités                       │
│     (6a) traits · état              │
│     (6b) compétences · équipement   │
│     (6c) contagion · narration      │
└────────────────────────────────────┘
```

1. Identité : repère de la créature et de son danger.
2. Mobilité : informations qui déterminent l'approche.
3. Comportement : informations qui déterminent le tour de jeu.
4. Données physiques : valeurs de référence immédiates.
5. Santé : résistance et protections.
6. Capacités : sous-groupes homogènes, parcourables sans confusion.

## Tasks to do

### `1)` Structurer la zone des capacités

> Restituer les familles de données du monstre sans les réduire à une liste de phrases indifférenciées.

1. Remplacer l'agrégat linéaire des capacités par des groupes DOM nommés correspondant aux traits, état alternatif, compétences, équipement, contagion et informations narratives effectivement présents.
2. Conserver les libellés, calculs de totaux, ordre des informations de la source et l'absence de groupe vide.
3. Garder l'en-tête et les cinq autres zones dans leur ordre contractuel actuel.

## Test acceptance criteria

| Task | Acceptance criteria |
| --- | --- |
| 1 | Un monstre riche permet d'identifier visuellement chaque famille de capacités sans perdre une donnée fournie par son document. |
| 1 | Un monstre minimal n'affiche ni panneau ni sous-groupe vide. |
| 1 | Les six zones publiques et leur ordre restent inchangés. |
