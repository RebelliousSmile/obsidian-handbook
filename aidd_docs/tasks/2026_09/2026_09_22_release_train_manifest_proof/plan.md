---
objective: "Handbook accepts the central schema-pbta release-train manifest, proves its pinned adoption, and writes only validated provenance evidence."
status: in-progress
---

# Plan: Exposer la preuve canonique par manifeste du release-train

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Adapter la preuve schema-pbta existante au contrat de manifeste et d’evidence du release-train central. |
| **Source** | GitHub issue [#52](https://github.com/RebelliousSmile/obsidian-handbook/issues/52) |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Lire et valider le manifeste candidat | [phase-1.md](./phase-1.md) |
| 2 | Écrire l’evidence et verrouiller le contrat | [phase-2.md](./phase-2.md) |

## Resources

| Source | Verified |
| --- | --- |
| [Handbook #52](https://github.com/RebelliousSmile/obsidian-handbook/issues/52) | Champs du manifeste, identité consommateur, evidence et cas négatifs exigés. |
| [schema-pbta #23](https://github.com/RebelliousSmile/schema-pbta/issues/23) | Le train central matérialise des refs immuables et attend les preuves d’adoption propres aux consommateurs. |
| [Lantern #20](https://github.com/RebelliousSmile/lantern/issues/20) | Chaque consommateur vérifie son lockfile actif, sans dupliquer les sémantiques du fournisseur. |

## Decisions

| Decision | Why |
| --- | --- |
| Extraire la preuve #49 en fonction recevant un candidat typé, puis appeler cette fonction depuis le wrapper de manifeste. | Le wrapper n’utilise aucune coordonnée ambiante et conserve une seule vérification d’adoption Handbook. |
| Ne créer l’evidence qu’après toutes les validations et assertions existantes. | Une exécution rejetée ne peut pas laisser une provenance qui semblerait validée au release-train. |
