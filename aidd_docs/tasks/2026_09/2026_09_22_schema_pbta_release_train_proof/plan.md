---
objective: "Handbook proves that an exact schema-pbta candidate archive is locked, installable, and renderable before the central release train promotes it."
status: implemented
---

# Plan: Preuve d’adoption d’un candidat schema-pbta

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Produire une commande machine-readable que le release-train peut lancer sur un ref Handbook et un candidat schema-pbta explicites. |
| **Source** | GitHub issue [#49](https://github.com/RebelliousSmile/obsidian-handbook/issues/49) |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Construire la preuve candidate | [phase-1.md](./phase-1.md) |
| 2 | L’exposer au release-train | [phase-2.md](./phase-2.md) |

## Decisions

| Decision | Why |
| --- | --- |
| La preuve compare les coordonnées reçues au lockfile actif du ref Handbook matérialisé par l’orchestrateur. | Le train central possède la sélection et les checkouts ; Handbook prouve son adoption réelle sans réécrire son lockfile. |
