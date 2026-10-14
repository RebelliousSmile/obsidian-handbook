---
objective: "Une retouche faite dans schema-in-the-mist, schema-pbta ou schema-adrenaline se voit dans un coffre Obsidian de test par une seule commande, sans release, tag ni changement de pin Handbook."
status: in-progress
---

# Plan: boucle locale commune `dev:schema`

## Overview

| Field      | Value                                                                                                                                  |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Goal**   | Remplacer `dev:schema-pbta` (copie directe, sans validation) par `pnpm dev:schema --source <dépôt> --vault <coffre>` sur l'installateur réel. |
| **Source** | Issue `RebelliousSmile/obsidian-handbook#65`                                                                                           |

## Phases

| #   | Phase                                                          | File                         |
| --- | -------------------------------------------------------------- | ---------------------------- |
| 1   | Installateur local branché sur le code réel de Handbook        | [`phase-1.md`](./phase-1.md) |
| 2   | Commande `dev:schema` et surveillance des trois fournisseurs   | [`phase-2.md`](./phase-2.md) |
| 3   | Action de rechargement explicite dans Handbook                 | [`phase-3.md`](./phase-3.md) |
| 4   | Guide FR/EN et preuve de rendu dans les coffres témoins        | [`phase-4.md`](./phase-4.md) |

## Resources

| Source                                                | Verified                                                                                                                                                              |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/games/sourceInstaller.ts`, `src/games/storage.ts` | `installResolvedSchemaSource` ne dépend que d'un `ResolvedGithubSource` (`readText`, `inspectBinary`, `readBinary`) et d'un `DataAdapter` : il valide tout avant `replaceSchemaSource`, qui remplace le dossier d'un bloc et le restaure en cas d'échec. |
| `tools/sourceInstaller.harness.mts`                   | Le contrat de l'installateur est déjà prouvé avec un adaptateur factice ; un adaptateur sur disque est donc possible sans toucher à `src/`.                          |
| `tools/dev-schema-source.mjs`                         | Copie directe : ni validation du catalogue, ni remplacement atomique, ni retrait des assets supprimés ; suit seulement les chemins contenant `assets`.                |
| `tools/supervisor/preview.mjs` (`installSources`)     | Duplique la même copie sans validation pour `supervise preview` : hors périmètre ici, noté en décision.                                                              |
| `src/BrumesPlugin.ts` (`refreshGameRegistry`)         | Relit les sources installées, mais aucune commande ni aucun bouton ne l'expose ; le bouton « Reload installed sources » cité par `obsidian-theme-development.md` n'existe pas dans `src/`. |

## Decisions

| Decision                                                                                          | Why                                                                                                                                              |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| La boucle locale réutilise `installResolvedSchemaSource` plutôt qu'une seconde copie de ses règles | Validation, limites, remplacement atomique et suppression des assets viennent alors du code livré : la boucle ne peut pas dériver de l'installeur. |
| `supervise preview` n'est pas migré dans ce plan                                                  | L'issue demande la boucle locale ; migrer le superviseur est un second changement, à ouvrir à part une fois la boucle établie.                  |
| Les erreurs s'affichent dans le terminal du watcher, pas dans Obsidian                            | Le dernier pack valide reste en place (remplacement atomique) ; une notification dans Obsidian exigerait un canal de plus dans le plugin.        |
| Handbook gagne une commande « Reload installed schema sources »                                    | Hot Reload n'est pas toujours installé, et le critère d'acceptation demande une action explicite documentée : elle n'existe pas encore.          |
| La boucle enregistre la source sous la référence fixe `{ kind: "branch", value: "local" }` et ne lit ni n'écrit `data.json` | Reprendre la référence du coffre (un tag) ferait afficher le nom d'un tag pour un contenu modifié ; la référence `local` affiche `revision <sha7>`, et `data.json` reste hors de portée. |
| La boucle refuse un coffre sans le plugin Handbook installé                                        | L'issue demande de limiter les écritures au coffre de test : une faute de frappe dans `--vault` ne doit rien créer ailleurs.                     |
| `rename` et `rmdir` de l'adaptateur disque reprennent sur `EPERM`/`EBUSY`                          | Sous Windows, Obsidian ou un antivirus peuvent tenir un dossier un instant ; sans reprise, chaque enregistrement coïncidant serait une fausse erreur. |
| La version est préparée en phase 4 par `pnpm version`, pas à la main                               | `assert:release-version` lit le manifeste ; une section de CHANGELOG en avance le met en échec.                                                   |
