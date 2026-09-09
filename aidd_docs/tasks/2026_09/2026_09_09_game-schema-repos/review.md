# Review: Registre de packs dynamique

- **Verdict**: approve
- **Diff**: `main...HEAD` (`7ed38ea`, `eacc286`, `bea4426` — 12 fichiers, +650 / -10 — puis correctifs de revue non commités)
- **Axes run**: code, functional, relevancy
- **Date**: 2026_09_09
- **Findings**: 0 critical, 0 warning, 0 minor (4 trouvées, 4 corrigées — voir `Findings`)

## Phases

### Phase 1 — Lecture et fusion des packs personnalisés

- [x] Dossier absent → `[]` sans avertissement ; dossier mêlant valide et invalide → le fautif seul est écarté et journalisé une fois par nom de fichier — `src/games/customPacks.ts:41` (`exists` → `[]`), `src/games/customPacks.ts:14` (`reportFileOnce`), `tools/customPacks.harness.mts:76`, `tools/customPacks.harness.mts:110`
- [x] Avant tout `initGameRegistry`, `GAME_PACKS`/`GAME_REGISTRATIONS` valent exactement ce qu'ils valaient — `src/games/registry.ts:100` (`acceptRegistrations(DECLARED_GAMES)` à l'import), `tools/customPacks.harness.mts:78`
- [x] Après `initGameRegistry([pack])` avec un id neuf, `findGamePack` le retrouve — `src/games/registry.ts:110` (`initGameRegistry`), `tools/customPacks.harness.mts:127`
- [x] Collision avec un id déclaré : le déclaré gagne, journalisé une fois — `src/games/registry.ts:69` (`reportConflictOnce`), `tools/customPacks.harness.mts:135`, `tools/customPacks.harness.mts:139`
- [x] Identité de tableau `===` de `GAME_PACKS` préservée avant/après — `src/games/registry.ts:113` (`.length = 0` puis `.push`), `tools/customPacks.harness.mts:115`, `tools/customPacks.harness.mts:126`
- [x] Deux packs personnalisés partageant un id : le premier par nom de fichier gagne, l'autre journalisé une fois, par nom de fichier — `src/games/customPacks.ts:87` (détection de la collision dans `loadCustomGamePacks`, qui connaît le nom de fichier, avant que `acceptRegistrations` ne voie les packs), `tools/customPacks.harness.mts:181` (`b-second.json` journalisé une fois, `a-first.json` jamais, réplique sans nouveau journal)

### Phase 2 — Branchement au cycle de vie et harnais

- [x] Un `mode` sauvegardé pointant vers un id présent uniquement dans `packs/` se résout dès le premier `applySettings()` — `src/BrumesPlugin.ts:onload` (`loadCustomGamePacks` puis `initGameRegistry` avant `loadSettings()`), `tools/customPacks.harness.mts:192`
- [x] `gamePackClasses()`/`gameVariantClasses()` contiennent la classe du pack personnalisé après `onload()` — `src/features/modes/domModeClass.ts:26`, `src/features/modes/domModeClass.ts:36`, `tools/customPacks.harness.mts:131`
- [x] `pnpm assert:custom-packs` sort vert sur les trois cas et l'ordre de résolution du mode — exécuté ce jour, sortie `custom packs: green` ; `package.json:13`
- [x] `CLAUDE.md` ne décrit plus le registre comme statique ; la commande figure au tableau — `CLAUDE.md` (puce « Le registre accueille aussi des packs personnels, lus au démarrage. »), `CLAUDE.md` (bloc Commandes, `pnpm assert:custom-packs`)

## Findings

<!-- Les quatre écarts trouvés lors de la première passe ont tous été corrigés ; conservés ici avec leur correctif effectif. -->

| Sev | Kind | Phase | Location | Issue | Fix |
| --- | ---- | ----- | -------- | ----- | --- |
| 🟡 | functional | 1 | `src/games/customPacks.ts:87` (était `src/games/registry.ts:69`) | La tâche 2.4 exige que le perdant d'une collision entre deux packs personnalisés soit journalisé **par nom de fichier** ; le message venait de `acceptRegistrations`, qui ne reçoit que des `GamePack` sans nom de fichier. | **Corrigé** : `loadCustomGamePacks` détecte désormais la collision d'id entre packs personnalisés au fil de la lecture (elle connaît le nom de fichier) et journalise le perdant via `reportFileOnce`, avant que `acceptRegistrations` ne voie les packs. Section 3 du harnais étendue pour affirmer que `b-second.json` est nommé une fois, `a-first.json` jamais, et qu'une réplique ne journalise rien de plus. |
| 🟡 | rot | 1 | `src/games/customPacks.ts:99`, `src/games/registry.ts:108` | `resetCustomPackReports()` et `resetGameRegistryReports()` exportés, documentés « exposed for the throwaway harness », sans appelant dans le dépôt. | **Corrigé** : les deux fonctions et leurs commentaires ont été supprimés. |
| 🟡 | code | 1 | `src/games/customPacks.ts:53` | L'échec de lecture du dossier utilisait `log.warn`, muet par défaut, alors que chaque échec par fichier utilise `log.error` — la panne la plus large était la seule silencieuse. | **Corrigé** : la ligne passe à `log.error`, alignée sur `reportFileOnce`. |
| 🟢 | code | 2 | `tools/customPacks.harness.mts:101` | Le libellé `"the valid file yields exactly one pack"` contredisait l'assertion `packs.length === 2`. | **Corrigé** : reformulé en `"two files parse, the broken one is dropped"`. |

## Verification

| Metric        | Value                                             |
| ------------- | ------------------------------------------------- |
| Verified      | 100 % (10/10)                                     |
| Files checked | `src/games/customPacks.ts`, `src/games/registry.ts`, `src/BrumesPlugin.ts`, `src/features/modes/domModeClass.ts`, `tools/customPacks.harness.mts`, `tools/assert-custom-packs.mjs`, `package.json`, `CLAUDE.md` |
| Unchecked     | none                                               |
| Unplanned     | none — les 12 fichiers du diff correspondent tous à une tâche des deux phases ; les quatre décisions du `plan.md` sont honorées (dossier `packs/` et non dépôt distant, chargement avant `loadSettings()`, fin du figeage à l'import, pack fautif écarté seul). Les correctifs de cette passe (déplacement de la détection de collision dans `loadCustomGamePacks`, suppression des deux exports morts, niveau de log, libellé du harnais) restent dans le périmètre des deux phases — aucun n'introduit de comportement non prévu par le plan. |
