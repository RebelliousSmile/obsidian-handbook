---
objective: "Handbook installe, valide et applique une feuille CSS de pack isolée après ses tokens, sans fuite entre jeux ni fenêtres, puis laisse City of Mist posséder ses règles structurelles publiées."
status: blocked
---

# Plan: Ressources de feuilles de style des packs

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Consommer `assets.stylesheets` depuis le dépôt de packs `schema-in-the-mist@v1.1.0`, dans une couche CSS distincte et sûre. |
| **Source** | Issue GitHub [RebelliousSmile/obsidian-handbook#32](https://github.com/RebelliousSmile/obsidian-handbook/issues/32). |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Installer les feuilles déclarées | [phase-1.md](./phase-1.md) |
| 2 | Valider et appliquer la couche CSS de pack | [phase-2.md](./phase-2.md) |
| 3 | Migrer City of Mist sans dérive visuelle | [phase-3.md](./phase-3.md) |

## Resources

| Source | Verified |
| --- | --- |
| https://github.com/RebelliousSmile/schema-in-the-mist/releases/tag/v1.1.0 | Tag immuable qui expose le schéma et les manifests Handbook. |
| https://github.com/RebelliousSmile/schema-in-the-mist/blob/v1.1.0/schemas/appearance/game-pack.schema.json | `stylesheets` est une liste ordonnée de chemins normalisés, relatifs à `assets.root`. |
| https://github.com/RebelliousSmile/schema-in-the-mist/issues/11 | Précise l’élément CSS après tokens, le parseur CSS et la réécriture d’URLs déclarées. |

## Decisions

| Decision | Why |
| --- | --- |
| Installer le dépôt GitHub épinglé `v1.1.0`, non le tarball npm de codecs. | Les manifests et ressources Handbook ne sont distribués que dans le tag GitHub. |
| Employer un élément pack-CSS dédié, après l’élément de tokens, par document. | Préserve l’ordre de cascade et le nettoyage atomique des fenêtres détachées. |
| Valider avec un parseur CSS et réécrire seulement les URLs d’assets déclarés. | Une regex ne gère pas les règles imbriquées et une feuille inline n’a pas de base locale sûre. |
