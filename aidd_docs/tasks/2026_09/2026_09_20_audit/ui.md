---
name: audit
description: Codebase audit report - ui pillar, handbook
argument-hint: N/A
---

# Codebase Audit: handbook / ui

Zéro attribut d'accessibilité sur les 30 constructions de DOM du plugin, et le seul bouton qui fait du réseau ne signale ni son travail ni sa réussite.

- **Date**: 2026-09-20
- **Scope**: handbook / ui
- **Health**: fair
- **Findings**: 0 critical, 2 warning, 1 minor

## Findings

| Sev | Category | Location                          | Issue                                                                                                                                                                                                                                       | Suggested fix                                                                                                        | Effort |
| --- | -------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------ |
| 🟡  | ui       | `src/settings/index.ts:773`       | Aucun `aria-*`, `role` ni `alt` dans tout `src/` : 22 `createEl` et 8 `createDiv`/`createSpan` construisent l'UI sans un seul attribut d'accessibilité, y compris les zones de statut qui changent après une action                             | Poser `role="status"` (ou `aria-live`) sur les zones mises à jour après action, et nommer les contrôles non textuels    | M      |
| 🟡  | ui       | `src/settings/index.ts:125`       | Le bouton « Reload installed schemas » déclenche N allers-retours GitHub via `runTask` (`:833`), qui ne rapporte **que** les échecs : pendant l'opération le bouton reste actif et rien n'indique le travail en cours, et une réussite est muette | Désactiver le bouton pendant la tâche, afficher un état de chargement, et notifier la réussite autant que l'échec       | S      |
| 🟢  | ui       | `src/settings/calloutsModal.ts:68` | Couleur `#e2c6c5` en dur, alors que la palette des jeux et celle du journal (`src/utils/logger.ts:17-20`) sont déclarées ailleurs : dérive par rapport au système de couleurs et ignore le thème du coffre                                       | Remplacer par une variable CSS Obsidian (ou la palette du jeu concerné)                                                | S      |

Vérifié : 4 `Notice` couvrent les retours d'erreur des réglages ; aucun état vide n'est laissé sans message dans les listes de sources et de packs.

## Top actions

1. Rendre annonçables les zones de statut des réglages (`src/settings/index.ts:773` et alentours) — c'est un ajout d'attributs, sans refonte.
2. Donner au bouton réseau un état de chargement et un retour de réussite (`src/settings/index.ts:125`, `runTask` `:833`) ; à combiner avec la parallélisation signalée dans `performance.md`.
3. Remplacer la couleur en dur de `calloutsModal.ts:68`.

## Coverage

- **Scanned**: ui (états de chargement / erreur / vide, hiérarchie visuelle, dérive du système de couleurs, attributs d'accessibilité, retours utilisateur)
- **Skipped**: aucun pilier écarté, mais no url provided, runtime a11y pass skipped, static inspection only — le plugin ne s'exécute que dans Obsidian, aucune URL n'a été fournie, l'examen est donc statique : pas de mesure de contraste, de parcours clavier ni de passe lecteur d'écran
