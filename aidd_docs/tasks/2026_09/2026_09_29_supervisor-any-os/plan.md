---
objective: "`supervise present`, `converge` et `publish` tournent sous Windows natif comme sous POSIX, derrière un garde de publication qui refuse les mêmes appels sur les deux plateformes, et `pnpm assert:supervisor` le prouve sur les deux."
status: pending
---

# Plan: le superviseur tourne sur tout OS

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Un garde de publication écrit une seule fois en Node, deux voies d'interception (shims `PATH` et hook `NODE_OPTIONS`), un lancement de commande portable, et un harnais qui tourne sans `sh` ni `script`. |
| **Source** | [obsidian-handbook#70](https://github.com/RebelliousSmile/obsidian-handbook/issues/70). Hors train `zombiology-pj-design`, à traiter avant sa phase 5. |

## Phases

| #   | Phase | File |
| --- | ----- | ---- |
| 1   | Règles du garde en Node, deux voies d'interception | [`phase-1.md`](./phase-1.md) |
| 2   | Lancement portable de `runGuarded` et `publish` | [`phase-2.md`](./phase-2.md) |
| 3   | Harnais sans `sh` ni `script` | [`phase-3.md`](./phase-3.md) |
| 4   | CI Windows, doc et mémoire | [`phase-4.md`](./phase-4.md) |

## Resources

| Source | Verified |
| ------ | -------- |
| [Node.js security release, avril 2024 (CVE-2024-27980)](https://nodejs.org/en/blog/vulnerability/april-2024-security-releases-2) | Depuis Node 18.20.2 / 20.12.2, `spawn` d'un `.bat`/`.cmd` sans `shell` lève `EINVAL`. Résoudre `npm.cmd` ne suffit donc pas : il faut passer par `cmd.exe /d /s /c`. Ce poste tourne en Node 23.4.0, la CI en Node 20. |
| [Node.js `child_process`, spawn sous Windows](https://nodejs.org/api/child_process.html#spawning-bat-and-cmd-files-on-windows) | Sans shell, seul un `.exe` est trouvé sur le `PATH`. C'est pour cela qu'un shim `.cmd` est contourné par un outil Node qui lance `gh`/`git` lui-même, et qu'il faut le hook. |
| [Node.js CLI, `NODE_OPTIONS`](https://nodejs.org/api/cli.html#node_optionsoptions) | `--require` est admis dans `NODE_OPTIONS`. Un chemin contenant des espaces doit être entre guillemets doubles. La variable est héritée par tout processus Node enfant : pnpm, npm, et les outils qu'ils lancent. |

## Decisions

| Decision | Why |
| -------- | --- |
| Les règles de refus sont une fonction pure `guardRefusal(tool, args)`, dans un module Node unique. Shims et hook ne font que l'appeler. | Deux copies des règles (sh, et Node ou `.cmd`) divergeraient en silence. Une table d'arguments suffit à les prouver, sans monde git. |
| Deux voies d'interception, aucune seule : les shims `PATH` (sh sans extension, `.cmd`) et un hook `NODE_OPTIONS=--require` qui enveloppe `child_process`. | Un shell trouve le shim. Un outil Node sous Windows ne trouve que `gh.exe` et saute le shim. Chaque voie couvre l'angle mort de l'autre. Retirer les identifiants ne suffit pas non plus : plusieurs validations lisent GitHub. |
| Le garde échoue fermé. Pas de `node` pour lancer le shim, un `gh` réel introuvable, une erreur du hook : l'appel est refusé, jamais laissé passer. | Le défaut mesuré dans #70 est précisément un garde qui laisse tout passer sans rien dire. |
| La simulation de terminal passe par un préchargement de test (`tools/fixtures/supervisor/fake-tty.cjs`, qui pose `process.stdin.isTTY = true`). Le code de production garde son test `process.stdin.isTTY` tel quel. | Aucune dépendance neuve (pas de `node-pty`), et l'invariant « pas d'accord sans terminal » n'est pas affaibli par une variable d'environnement. Le préchargement ne vit que dans `fixtures/`. |
| `git.mjs` accepte `SUPERVISOR_GIT`, sur le modèle de `SUPERVISOR_GH`. | Sous Windows, `spawnSync("git")` trouve `git.exe` et saute le faux `git` journalisant du monde de test. Or le harnais prouve quelles commandes git ont tourné. |
