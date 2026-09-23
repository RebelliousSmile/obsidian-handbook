---
objective: "Handbook proves a committed schema-in-the-mist candidate adoption from a detached checkout through the shared release-train command without mutating that checkout."
status: implemented
---

# Plan: Prouver l’adoption release-train de schema-in-the-mist

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Étendre l’interface release-train commune pour vérifier un candidat Mist épinglé et son rendu Handbook. |
| **Source** | GitHub issue [#53](https://github.com/RebelliousSmile/obsidian-handbook/issues/53) |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Généraliser le contrat de manifeste | [phase-1.md](./phase-1.md) |
| 2 | Prouver l’adoption Mist sans mutation | [phase-2.md](./phase-2.md) |

## Resources

| Source | Verified |
| --- | --- |
| [Handbook #53](https://github.com/RebelliousSmile/obsidian-handbook/issues/53) | Exigences de pin, preuve, evidence et sûreté du checkout détaché. |
| [schema-in-the-mist #23](https://github.com/RebelliousSmile/schema-in-the-mist/issues/23) | Le fournisseur conserve manifestes, schémas et packs ; les consommateurs produisent leurs preuves. |

## Decisions

| Decision | Why |
| --- | --- |
| Conserver un seul script `release-train:assert` et dispatcher sur une identité fournisseur strictement validée. | Le runner central garde une interface fixe sans permettre des commandes ou refs arbitraires. |
| Installer avec `pnpm install --frozen-lockfile` dans la preuve externe, jamais depuis le script Handbook. | Le train matérialise l’adoption commitée ; Handbook vérifie un graphe déjà gelé sans le modifier. |
