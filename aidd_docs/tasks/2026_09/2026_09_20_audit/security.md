---
name: audit
description: Codebase audit report - security pillar, handbook
argument-hint: N/A
---

# Codebase Audit: handbook / security

Aucun secret, aucun `eval`, aucun `innerHTML`. Toute la surface d'attaque est l'installateur de packs, qui analyse et tamponne des octets contrôlés par un tiers avant de les vérifier.

- **Date**: 2026-09-20
- **Scope**: handbook / security
- **Health**: good
- **Findings**: 0 critical, 2 warning, 1 minor

## Findings

| Sev | Category | Location                           | Issue                                                                                                                                                                                                                             | Suggested fix                                                                                        | Effort |
| --- | -------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------ |
| 🟡  | security | `src/games/assets.ts:333`          | `postcss.parse(source)` tourne sur du CSS téléchargé d'un pack tiers, sans `from` et sans borne de taille : une feuille hostile atteint un analyseur CSS complet, et ses erreurs ne portent aucune identité de source                 | Borner la longueur du CSS avant l'analyse et passer `{ from: <chemin relatif au pack> }`              | M      |
| 🟡  | security | `src/games/sourceInstaller.ts:114` | Le budget de 20 Mo (`MAX_ASSET_BYTES`, `:15`) est mesuré **après** que `readBinary` a tamponné l'asset entier : un asset de 2 Go épuise la mémoire avant que le garde-fou ne s'exécute                                                | Vérifier la taille déclarée, ou diffuser en flux avec un compteur courant, avant de tamponner          | S      |
| 🟢  | security | `src/games/githubSources.ts:41`    | `path` est interpolé directement dans l'URL `raw.githubusercontent.com` ; le garde-fou anti-traversée vit dans l'appelant (`sourceInstaller.ts:21`), pas au point d'interpolation                                                    | Réaffirmer `safeRelativePath` dans `read()` pour que le module réseau soit sûr par lui-même            | S      |

Vérifié sain : aucun identifiant ni jeton en dur dans `src/` ; aucun `eval`, `new Function` ou `innerHTML` ; `repository` est validé par `/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/` (`src/games/repositoryManifest.ts:77`) avant toute requête ; le nombre de packs et d'assets est borné (`sourceInstaller.ts:13-14`).

## Top actions

1. Borner et identifier le CSS remis à postcss (`src/games/assets.ts:333`) — c'est le chemin d'entrée non fiable le plus profond du plugin, et sa dépendance porte aussi des avis ouverts (voir `dependencies.md`).
2. Déplacer le budget d'octets avant le tamponnage à `src/games/sourceInstaller.ts:114`.
3. Dupliquer le garde-fou de chemin dans `githubSources.ts` pour que le module cesse de dépendre de son appelant.

## Coverage

- **Scanned**: security (chemins d'entrée non fiables, traversée de chemin, secrets, évaluation dynamique, injection DOM, bornes de ressources)
- **Skipped**: none. Les CVE des paquets tiers sont rapportées dans `dependencies.md`, conformément à la frontière du pilier
