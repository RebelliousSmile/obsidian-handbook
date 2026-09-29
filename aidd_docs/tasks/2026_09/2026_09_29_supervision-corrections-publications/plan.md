---
objective: "Un outil déterministe lancé depuis le parent coordonne une correction entre Handbook, Lantern et les trois dépôts de schémas, bloque toute publication sans accord explicite lié aux commits présentés, garantit que la finale publie les octets du candidat, puis pilote le train existant jusqu'à une convergence vérifiée."
status: in-progress
---

<!-- Fill or omit these sections; never add, rename, or reorder one. -->

# Plan: Superviseur des corrections multi-dépôts et des publications

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Remplacer le suivi mental d'un train (qui fait quoi, ce qui bloque, ce qui est prouvé, ce qui reste à publier) par un outil `pnpm supervise` sans LLM, qui coordonne sans exécuter le travail de correction à la place des agents. |
| **Source** | [RebelliousSmile/obsidian-handbook#66](https://github.com/RebelliousSmile/obsidian-handbook/issues/66), forme retenue d'après la piste « orchestrer la publication » de [#65](https://github.com/RebelliousSmile/obsidian-handbook/issues/65) |

## Phases

| #   | Phase | File |
| --- | ----- | ---- |
| 1   | Topologie et état des cinq dépôts (`supervise status`) | [`phase-1.md`](./phase-1.md) |
| 2   | Dossier de train, issues et prochaine étape (`open`, `link`, `next`, `sync`) | [`phase-2.md`](./phase-2.md) |
| 3   | Présentation et feu vert lié aux commits (`present`, `approve`) | [`phase-3.md`](./phase-3.md) |
| 4   | Pilotage de la publication par fournisseur (`publish`) | [`phase-4.md`](./phase-4.md) |
| 5   | Convergence finale et clôture (`converge`, `close`) et guide FR/EN | [`phase-5.md`](./phase-5.md) |

## Resources

| Source | Verified |
| ------ | -------- |
| Issue #66 | Rôles : Handbook porte la coordination, les schémas gardent contrats et validations, Lantern fournit ses preuves ; arrêt obligatoire avant publication ; aucune archive candidate publiée avant accord ; clôture sur preuves vérifiables. |
| Issue #65, « Autre piste » | Forme : outil déterministe sans LLM qui prépare manifests et pins, calcule SHA-256/SRI, déclenche les workflows, collecte les preuves, reprend après échec, promotion explicite des mêmes octets. |
| Réponse utilisateur (2026-09-29) | Pas d'`aidd-orchestrator` : les corrections ne sont pas automatisées, seulement coordonnées entre les cinq projets (Handbook, Lantern, schema-pbta, schema-adrenaline, schema-in-the-mist ; `obsidian-notebook` hors périmètre). |
| `schema-pbta/.github/workflows/{publish-candidate,release-train,release}.yml` | Candidat par `publish-candidate` (hors manifeste, non retenu) ou `release.yml mode=stage` (retenu, `RELEASE_TOKEN`) ; preuves par `release-train.yml` ; `digest` et promotion par `release.yml mode=digest|promote` (inputs `provider_commit`, `config`). `digest` n'existe que sur `origin/main`. |
| `schema-adrenaline/.github/workflows/{publish-candidate,release-train,release,final-convergence}.yml` | Candidat (input `tag`, depuis `main`) ; preuves (input `manifest`) ; publication finale conditionnée à un run `release-train` réussi ; convergence finale protocole 2 (`release-train/*-final.json`). |
| `schema-in-the-mist/release-trains/README.md` et `package.json` | Seul le candidat passe par un workflow (`release-candidate.yml`) ; `release-train:stage|assert|promote|converge|validate-completed` sont des commandes locales ; manifeste `release-trains/vX.json` sans champ `protocol`, avec `status` et `final`. |
| `lantern/package.json`, `lantern/release-train.matrix.json`, `lantern/docs/releasing.md` | `assert:consumer-schema-pins`, `assert:release-inputs`, `assert:release-train-matrix` ; tag Lantern seulement sur `main` avec des URL finales canoniques. |
| `obsidian-handbook/package.json` (origin/main) | `release-train:assert` accepte les trois fournisseurs et le protocole 2 ; `assert:consumer-schema-pins --final` vérifie l'SRI contre l'archive téléchargée. |

## Decisions

| Decision | Why |
| -------- | --- |
| Outil Node déterministe dans Handbook (`tools/supervisor/`, `pnpm supervise`), pas un plugin Claude Code ni un orchestrateur d'agents. | #65 demande un outil sans LLM ; #66 fait porter la coordination par Handbook ; l'utilisateur veut coordonner, pas automatiser les corrections. N'étant pas un plugin, il n'a pas sa place dans `my-marketplace`. |
| Racine de travail = le répertoire parent (`--root`, défaut `..` depuis Handbook) ; la topologie des cinq dépôts est un fichier versionné `supervisor/topology.json`. | Le parent n'est pas un dépôt git : il donne la vue commune sans pouvoir conserver d'état. Handbook versionne la description, sans s'approprier les contrats des fournisseurs. |
| L'état d'un train est un dossier versionné `supervisor/trains/<id>.json` ; l'issue de coordination GitHub en est une projection régénérée entre marqueurs. | Reprise entre sessions et relecture en revue de code ; l'issue reste lisible sans devenir une seconde source de vérité. |
| Chaque étape est dérivée de l'état observé (git, releases, runs, fichiers de preuve), jamais d'un compteur « étape n ». | Reprise après échec partiel idempotente : relancer `next` ou `publish` recalcule où en est réellement le train. |
| Le feu vert est un enregistrement lié aux SHA présentés et à la liste des publications annoncées, saisi de façon interactive. Après l'accord, seuls les commits prévus par le train sont admis : ils ne touchent que les fichiers déclarés par la topologie (pins, lockfiles, fichiers de version et changelog des consommateurs, manifeste et enregistrement final du fournisseur, matrice Lantern) et les URL/SRI qu'ils introduisent sont celles des archives observées. Tout autre changement l'invalide. Les octets du candidat sont enregistrés à sa publication et la finale doit leur être identique. | #66 : le silence, le temps ou des tests verts ne valent pas accord, et un résultat modifié revient devant l'utilisateur ; les commits d'adoption imposés par le train ne sont pas un résultat modifié. |
| Un adaptateur par fournisseur appelle ses outils existants tels quels et ne duplique aucune validation. | Les trois dépôts de schémas divergent (protocole 1, protocole 2, format Mist sans protocole ; CI ou local) et gardent l'autorité sur leurs validations. |
| Avant accord, seules les validations sans publication sont autorisées ; publier une archive candidate compte comme une publication. `present` lance les validations derrière un `PATH` dont `gh` et `git` refusent `release`, `workflow run` et `push`. | Exception explicitement non autorisée par le cadrage #66 ; un garde-fou limité au harnais ne protège rien en réel. |
| L'avancement d'un élément se lit sur GitHub (issue fermée, commit de fermeture atteignable depuis `origin/main`), jamais sur le checkout local. | L'outil ne fait ni pull ni checkout : un dépôt local en retard ne doit pas bloquer un élément réellement fusionné. |
| Les schémas JSON (`topology`, `train`, sortie `status --json`) sont validés par `ajv` 6.12.6, déjà en devDependencies (draft-07). | Aucune dépendance neuve. |
