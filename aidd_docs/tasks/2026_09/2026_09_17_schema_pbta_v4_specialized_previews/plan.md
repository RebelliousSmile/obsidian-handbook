---
objective: "Les cinq aperçus PbtA de Handbook sont issus des TOML spécialisés de schema-pbta v4 et rendent toutes leurs régions éditoriales et mécaniques sans faire du playbook générique une seconde fiche canonique."
status: in-progress
---

# Plan: Aperçus PbtA spécialisés de schema-pbta v4

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Consommer l'asset immuable `schema-pbta` v4.0.0 et projeter ses cinq contrats de playbook spécialisés dans les aperçus Handbook existants, sans changer la composition des packs ni traiter le format générique comme une fiche concurrente. |
| **Source** | GitHub issue [#34](https://github.com/RebelliousSmile/obsidian-handbook/issues/34), dont le commentaire du 2026-09-17 lève le blocage avec `schema-pbta` v4.0.0. |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Verrouiller v4 et étendre le corpus de projection | [`phase-1.md`](./phase-1.md) |
| 2 | Résoudre et rendre les playbooks spécialisés | [`phase-2.md`](./phase-2.md) |
| 3 | Prouver les aperçus et préserver le contrat portable | [`phase-3.md`](./phase-3.md) |

## Resources

| Source | Verified |
| --- | --- |
| [schema-pbta v4.0.0](https://github.com/RebelliousSmile/schema-pbta/releases/tag/v4.0.0) | L'asset `schema-pbta-4.0.0.tgz` et son SHA-256 publiés sont immuables ; il contient les cinq cibles spécialisées et leur corpus contractuel. |
| [README schema-pbta à v4.0.0](https://github.com/RebelliousSmile/schema-pbta/blob/v4.0.0/README.md) | Le format `playbook` reste un format d'interchange, tandis que chaque jeu publie une unique fiche canonique spécialisée ; Handbook possède la projection et le style. |

## Decisions

| Decision | Why |
| --- | --- |
| Conserver un seul bloc et une seule surface de style PbtA, mais faire porter au résultat de parsing la cible spécialisée résolue. | Les capacités des packs restent portables (`block:pbta-playbook`) et la présentation existante est conservée ; seule la projection sait quel codec v4 a validé le TOML. |
| Fonder les aperçus sur le manifeste de corpus distribué par v4 plutôt que sur une liste de fixtures Handbook. | Le package est l'autorité des cibles et de leurs témoins ; cela évite de dupliquer ou de canoniser une fixture générique dans Handbook. |
