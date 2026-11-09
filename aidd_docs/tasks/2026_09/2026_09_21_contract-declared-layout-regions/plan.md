---
objective: "Chaque présentation PbtA publie sa disposition sous une seule forme obligatoire, et Handbook comme Lantern la lisent sans champ mort, sans moteur générique inutilisé ni repli local."
status: implemented
---

# Plan: Régions de mise en page déclarées par contrat — résidus

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Solder ce qui reste du plan du 2026-09-21. Sa capacité est livrée : chaque présentation de `schema-pbta` publie `canonicalOrder` et sa grille (`rows` ou `faces[].columns`), et Handbook (`src/features/pbta/*Layout.ts`) comme Lantern (`*PlaybookPreview.tsx`) la projettent. Il reste trois résidus : (1) `columns` Monsterhearts, que rien ne publie ni ne lit ; (2) `rows` optionnel pour Monsterhearts et Urban Shadows, d'où le repli local de Lantern ; (3) `applyContractLayout` de Handbook, appelé seulement par son harnais. |
| **Source** | Relevé du 2026-11-09 : `schema-pbta/src/presentation/monsterhearts-playbook.ts` (l. 37-38), `urban-shadows-playbook.ts` (l. 46), `lantern/src/templates/monsterhearts/playbook/preview/MonsterheartsPlaybookPreview.tsx` (l. 75), `obsidian-handbook/src/features/pbta/monsterheartsLayout.ts` (l. 261), `obsidian-handbook/src/features/layoutRegions/contractLayout.ts` et `tools/layoutRegions.harness.mts` (l. 150-167). |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Resserrer le contrat de disposition dans schema-pbta | [`phase-1.md`](./phase-1.md) |
| 2 | Retirer de Handbook le moteur générique et le repli | [`phase-2.md`](./phase-2.md) |
| 3 | Retirer de Lantern le repli local | [`phase-3.md`](./phase-3.md) |

## Resources

| Source | Verified |
| ------ | -------- |
| [Contrat inter-dépôts](../../../../.codex/rules/00-architecture/0-cross-repo-contract-flow.md) | Le schéma s'étend et se publie avant le travail des consommateurs ; aucun repli sémantique local. |
| [Superviseur](../../../../doc/supervisor.fr.md) | La phase 1 est le fournisseur d'un train ; les phases 2 et 3 en sont les consommateurs, adoptés par `ship --run`. |

## Decisions

| Decision | Why |
| --- | --- |
| Monsterhearts perd `columns` et garde `rows` (trois colonnes par ligne) comme seule forme de grille. | `columns` n'est publié par aucun pack et lu par aucun consommateur. Garder deux formes permettrait deux lectures du même contrat. Le schéma peut retirer un champ mal intégré. |
| `rows` devient obligatoire pour Monsterhearts et Urban Shadows. | Les deux packs le publient. Optionnel, il forçait Lantern à inventer une grille de secours que le contrat ne déclare pas. Les régions non placées restent couvertes par `fallbacks.unplaced: canonical-order`. |
| Le retrait est une majeure de schema-pbta (v<N+1>), bien que les JSON publiés ne changent pas. | Le schéma Zod et les types exportés refusent désormais un objet de présentation qui porte `columns` ou omet `rows`. |
| Handbook retire `applyContractLayout`, mais garde `wrapBlocksInColumns` et les marqueurs `handbook-layout` des notes. | La projection contractuelle vit dans chaque `*Layout.ts` de jeu. Le moteur générique n'a aucun appelant de production. Les marqueurs de note restent une fonction utilisateur distincte. |
| À l'implémentation, le retrait est publié en mineure de schema-pbta (v<N>.<M+1>), non en majeure. | Une majeure de schema-pbta impose un nouveau répertoire `schemas/v<N+1>` et `PBTA_CONTRACT_VERSION` (`validate-version-compat.ts`), alors que les JSON publiés ne changent pas. Précédent : le retrait de la variante `drowned-lake` est passé en mineure. Les consommateurs ne lisent que les JSON, inchangés. |
