---
objective: "Chaque bloc déclaré par un pack PbtA (Sprawl, Monster of the Week, Masks) a son modèle Lantern, listé sous le pack dans la barre latérale."
status: pending
---

# Plan: Modèles de bloc PbtA dans Lantern (lantern#58)

## Overview

| Field | Value |
| ----- | ----- |
| **Goal** | Aujourd'hui Masks, Monster of the Week et The Sprawl n'exposent que « Livret ». Ajouter les modèles des blocs que leurs schémas de données déclarent (le rendu vient des contrats de présentation). |
| **Source** | `RebelliousSmile/lantern#58` ; schémas de données `schema-pbta/schemas/v<N>/<pack>/<pack>-<bloc>.schema.json` (le format), contrats `schema-pbta/packs/<pack>/*-presentation-contract.json` (le rendu) ; `lantern/src/core/templates/registry.tsx` (liste plate de modèles regroupés par jeu) ; `lantern/src/templates/pbta/specialized/` (usine de modèles PbtA) et `city-of-mist/danger/` (modèle de bloc). |
| **Blocs à couvrir** | The Sprawl : mission, menace, ressource, corporation, matrice. Monster of the Week : monstre, menace, équipe. Masks : PNJ. |
| **Constat d'exploration** | Le registre accepte déjà plusieurs modèles par jeu (City of Mist en a 4) : aucun nouveau mécanisme de barre latérale n'est nécessaire. Le schéma publié porte aussi d'autres documents que les blocs (fronts, moves, définition de jeu) : l'inventaire les tranche. |
| **Mode** | Travail dans `lantern` seul si les schémas publiés suffisent ; sinon étendre `schema-pbta` d'abord, puis un train du superviseur (Lantern est dans `supervisor/topology.json`). Versions désignées par rôle. |
| **Hors périmètre** | Urban Shadows, Monsterhearts, Salvage Run : leurs blocs sont à constater en phase 1 avant toute décision. |

## Phases

| # | Phase | File |
| - | ----- | ---- |
| 1 | Inventaire : blocs déclarés par pack vs modèles Lantern, format de chaque bloc | [`phase-1.md`](./phase-1.md) |
| 2 | Usine de modèle de bloc PbtA : étendre `definitionFactory` du playbook au bloc, une entrée de registre par bloc | [`phase-2.md`](./phase-2.md) |
| 3 | Un modèle par bloc, exemples, export TOML validé, livraison par train | [`phase-3.md`](./phase-3.md) |

## Decisions

| Decision | Why |
| -------- | --- |
| Inventaire avant code | Le tableau de l'issue vient des noms de schémas ; les champs réels n'ont pas été lus. |
| Réutiliser `definitionFactory` / `collectionAdapters` et le registre existant | Ils portent déjà les modèles PbtA et le regroupement par jeu ; ne pas écrire un cinquième mécanisme. |
| Le format vient du schéma de données, le rendu du contrat de présentation | Les deux existent dans `schema-pbta` et sont exportés par son paquet (`schemas/v<N>/*`, `packs/*`) ; Lantern ne définit aucun champ et, si un champ manque, le schéma s'étend d'abord (règle inter-dépôts). |
