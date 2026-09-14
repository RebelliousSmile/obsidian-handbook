---
objective: "L’issue #23 est fermée avec des preuves reproductibles que les installations de starter kit et de source lisent les réponses texte et binaires selon le contrat Obsidian déjà livré en 2.7.1."
status: in-progress
---

# Plan: Clôture du correctif requestUrl

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Vérifier le correctif déjà intégré et livré sur les parcours automatisés et dans Obsidian, puis fermer l’issue #23 sans nouvelle modification du produit ni nouvelle release. |
| **Source** | Issue GitHub [RebelliousSmile/obsidian-handbook#23](https://github.com/RebelliousSmile/obsidian-handbook/issues/23). |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Vérification de livraison et clôture | [phase-1.md](./phase-1.md) |

## Resources

| Source | Verified |
| --- | --- |
| https://github.com/RebelliousSmile/obsidian-handbook/issues/23 | Le ticket signale que le client appelle à tort les champs texte et binaire de `RequestUrlResponse` comme des méthodes Fetch ; il est toujours ouvert. |
| https://github.com/RebelliousSmile/obsidian-handbook/releases/tag/2.7.1 | La release 2.7.1 est publique, demande Obsidian 1.12.7 au minimum et annonce explicitement la restauration de l’installation des starter kits et sources via les propriétés de `requestUrl`. |
| https://github.com/RebelliousSmile/schema-in-the-mist/blob/v1.0.0/handbook/city-of-mist/pack.json | Le pack immuable City of Mist v1.0.0 accepte Handbook 2.7.0 et déclare des assets binaires, ce qui en fait une fixture réseau compatible pour « Save and check ». |
