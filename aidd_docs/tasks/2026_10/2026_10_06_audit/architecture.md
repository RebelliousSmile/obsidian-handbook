# Codebase Audit: architecture — callouts and options

The callout domain is well isolated in `features/callouts/`. The settings layer, however, imports the callout domain's internals, which in turn import the settings types. On top of that, the settings tab contradicts the "a game = a data pack" principle by naming the games by hand.

- **Date**: 2026_10_06
- **Scope**: `src/features/callouts/*`, `src/settings/*`, `src/BrumesPlugin.ts` (settings ↔ callouts wiring)
- **Health**: good
- **Findings**: 0 critical, 3 warning, 3 minor

Health: `good` = no critical findings; `fair` = critical findings exist but are isolated and addressable; `poor` = systemic or widespread critical findings.

## Findings

| Sev | Category     | Location | Issue | Suggested fix | Effort |
| --- | ------------ | -------- | ----- | ------------- | ------ |
| 🟡 | architecture | `src/settings/types.ts:1` | There is a circular dependency. `settings/types` imports `features/callouts/{types,nativeCallouts,migrateAliases}` (1-7) and re-exports from it (17), while `features/callouts/*` imports `settings/types`. The normalization of the `data.json` (a settings concern) therefore depends on the callout migration. | Move `CalloutDefinition` and the normalization contract into `features/callouts/types.ts` (a leaf with no import from `settings`). `settings/types` would then only import that leaf, and callouts would receive `BrumesSettings` through an interface they declare themselves. | M |
| 🟡 | architecture | `src/settings/gameSettings.ts:15` | `city-of-mist`, `legend-in-the-mist` and `otherscape` are hardcoded (12-29), and so are the per-game sections of `index.ts:455/541/681`. This contradicts the CLAUDE.md rule "a built-in game = `src/games/<game>.ts` + an entry in `DECLARED_GAMES`, nothing else": adding a game also requires editing the settings tab. | Have each `GamePack` (or its block registry) declare its settings section, and generate the sections from `DECLARED_GAMES`. | L |
| 🟡 | architecture | `src/settings/index.ts:1` | The 992-line settings tab is a god-class: it builds every section (general, games, callouts, sources, release), edits native aliases and orchestrates saving. The domain modules `calloutSettings.ts`, `generalSettings.ts` and `schemaSourceSettings.ts` exist but are only pass-through wrappers. | Let each domain module render its own section (`renderCalloutSection(container, plugin)`…). `index.ts` then only assembles the sections. | M |
| 🟢 | architecture | `src/features/callouts/migrateAliases.ts:81` | The migration imports the schema packages again to list their ids (81-83), while `nativeCallouts.ts` already builds them from the same sources. That makes two sources of truth for one list. | Derive the list from `NATIVE_CALLOUTS`. | S |
| 🟢 | architecture | `src/settings/types.ts:17` | `settings/types` re-exports a callout symbol (`sanitizeAlias`): the public surface of the settings exposes a callout-domain detail. | Have consumers import it from `features/callouts/sanitizeAlias`. | S |
| 🟢 | architecture | `src/features/callouts/commands.ts:33` | The command registry is a module-level `Map` (`registered`). It outlives the plugin instance and makes its lifetime depend on `onunload` being called correctly. | Attach it to the plugin instance, or to the object returned by `loadCalloutCommandFeature`. | S |

## Top actions

1. **Break the settings ↔ callouts cycle** by making `features/callouts/types.ts` a leaf (row 1, which also absorbs row 5). Hand-off: refactor.
2. **Split `index.ts` by domain**: each `*Settings.ts` renders its section (row 3). This is the natural prerequisite for the table-driven toggles of the code-quality report. Hand-off: refactor.
3. **Settings sections declared by the game packs** (row 2). This is the most expensive change, to schedule when a fifth built-in game arrives, not before. Hand-off: refactor.

## Coverage

- **Scanned**: architecture (dependencies between `settings/` and `features/callouts/`, layering, conformance with CLAUDE.md and `aidd_docs/memory/internal/game-packs.md`).
- **Skipped**: conformance with ADRs is not applicable. `aidd_docs/memory/internal/decisions/` holds 7 ADRs, none of which covers callouts or settings. No C4 diagram exists for this scope.
