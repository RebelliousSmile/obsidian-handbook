# Codebase Audit: code-quality (DRY first) — callouts and options

The callout model is sound and the validation is strict at the load boundary. The cost sits in repetition: the visibility filter is rebuilt five times, the settings tab copies its toggles by hand, and two user inputs reach the CSS and command ids without the checks that are applied elsewhere.

- **Date**: 2026_10_06
- **Scope**: `src/features/callouts/*`, `src/settings/*`, callout and settings wiring in `src/BrumesPlugin.ts`
- **Health**: fair
- **Findings**: 0 critical, 4 warning, 15 minor

Health: `good` = no critical findings; `fair` = critical findings exist but are isolated and addressable; `poor` = systemic or widespread critical findings.
Rated `fair` rather than `good`: there is no critical finding, but two warnings are unchecked user inputs. They are reachable from `data.json` or the settings UI.

## Findings

| Sev | Category     | Location | Issue | Suggested fix | Effort |
| --- | ------------ | -------- | ----- | ------------- | ------ |
| 🟡 | code-quality | `src/features/callouts/migrateAliases.ts:170` | A user callout id read from `data.json` is accepted when it is any non-empty string. It is then copied to `styleKey` and interpolated raw into a CSS attribute selector (`styleWriter.ts:38`) and into command ids (`commands.ts`). A `"` or `]` in the id breaks the game `<style>` (CSS injection boundary, cf. `readPackTokens`). | Validate the id with the same `[a-z0-9-]` rule as `generateCalloutId`, and regenerate the id when it is invalid. | S |
| 🟡 | code-quality | `src/settings/index.ts:841` | Editing the aliases of a native callout writes them without the collision check that `calloutsModal.ts:204-214` applies to user callouts. A collision then only surfaces as a warn-once at runtime (`aliasSupport.ts:115-123`). | Extract the collision check from the modal into `features/callouts`, then call it from both places. | S |
| 🟡 | code-quality | `src/features/callouts/aliasSupport.ts:107` | The visibility filter "required capabilities + `isCalloutAvailable`" is rebuilt in 5 places: here, `commands.ts:98-99`, `contextMenu.ts:24-26`, `settings/index.ts:767-769` and `settings/themeContentsModal.ts:26-32`. A private twin already exists in `features/blocks/registry.ts:54`. | Expose one `visibleCallouts(settings, registration?)`, or a shared `requiredCapabilities(settings)`, and remove the copies. | S |
| 🟡 | code-quality | `src/settings/index.ts:349` | About 10 `Setting` + `addToggle` + `runTask` blocks are copied with the same body (349-370, 379-393, 404-422, 464-483, 493-510, 550-569, 579-596, 606-623, 633-650). The OS section already has the right helper, `addOtherscapeToggle` (690-714). | Generalize `addOtherscapeToggle` into `addFeatureToggle(section, label, block, featureKey, isActive)` and drive the CoM and LitM sections from a table. | M |
| 🟢 | code-quality | `src/settings/index.ts:513` | The two Advanced Canvas snippet buttons (513-537 and 653-677) are copies of each other. | Use a single `addCanvasSnippetButton(section, snippet)`. | S |
| 🟢 | code-quality | `src/settings/index.ts:455` | `isActive` is computed at 455, 541 and 681, while the section of an inactive game is not displayed at all. It therefore always evaluates to `true`, and every `setDisabled(!isActive)` is dead code. | Remove `isActive` and the `setDisabled` calls, or render the inactive sections on purpose. | S |
| 🟢 | code-quality | `src/settings/index.ts:965` | The `inactive` parameter of `createSection` is never passed by any caller, so the `is-inactive` branch (970-971) is dead code. | Remove the parameter. | S |
| 🟢 | code-quality | `src/settings/index.ts:982` | `runTask` translates `t(noticeMessage)` at runtime, so a dynamic key escapes static extraction of the strings to translate. | Have callers pass an already translated string. | S |
| 🟢 | code-quality | `src/settings/index.ts:917` | Trivial description wrappers (917-923) only rename a `t()` call. | Inline them. | S |
| 🟢 | code-quality | `src/settings/index.ts:45` | An orphan comment does not describe the code that follows it. | Remove it or move it next to the code it describes. | S |
| 🟢 | code-quality | `src/settings/calloutsModal.ts:16` | The constants at 16-17 duplicate the ones in `settings/index.ts:33-34`. | Export them from a single module. | S |
| 🟢 | code-quality | `src/settings/calloutsModal.ts:25` | `scopesOverlap` exists here, and the same logic is written inline at `migrateAliases.ts:91`. | Move it to `features/callouts/types.ts`. | S |
| 🟢 | code-quality | `src/settings/calloutsModal.ts:69` | The magic colour `#e2c6c5` is the default for a new callout. | Use a named constant, next to `sanitizeHex`. | S |
| 🟢 | code-quality | `src/settings/calloutsModal.ts:243` | `persist` mutates `plugin.settings.callouts` before `saveSettings`. If the save fails, memory and disk diverge. | Build a copy, save it, then assign it. | S |
| 🟢 | code-quality | `src/features/callouts/contextMenu.ts:64` | The two branches of `insertCallout` (64-93) differ only by their placeholder. | Factor them as one branch plus a variable placeholder. | S |
| 🟢 | code-quality | `src/features/callouts/commands.ts:5` | The same module is imported on three lines (5-7). The pack label lookup (19-26) repeats the one in `settings/index.ts:859` (`calloutScopeLabel`). | Merge the imports and share a `scopeLabel(scope)`. | S |
| 🟢 | code-quality | `src/features/callouts/styleWriter.ts:38` | The selector hardcodes `data-brumes-callout-style`, while the constant `BRUMES_CALLOUT_STYLE_ATTR` exists in `aliasSupport.ts:7`. | Import the constant. | S |
| 🟢 | code-quality | `src/features/callouts/migrateAliases.ts:122` | The native-entry branch (122-136) does not register its id in `takenIds`, so a user id can later collide with a native id. Separately, the schema ids are listed again at 81-83. | Add native ids to `takenIds`, and derive the list from `NATIVE_CALLOUTS`. | S |
| 🟢 | code-quality | `src/features/callouts/nativeCallouts.ts:81` | A stale French comment (81-87, "7 historical styles… futur écrivain de style") describes a style writer that now exists. | Update or remove the comment. | S |

The enum normalizers in `settings/types.ts:165-182` follow the same pattern four times. This is tolerable and is not counted as a finding.
`settings/types.ts:117` shares the `NATIVE_CALLOUTS` array by reference in `DEFAULT_SETTINGS`. No mutation was found on this path. This is a point to watch, not a finding.

## Top actions

1. **Close the two unchecked inputs**: validate the callout id at load time (`migrateAliases.ts:170`) and apply the collision check to native aliases (`index.ts:841`). Rows 1-2. Hand-off: refactor.
2. **One visibility filter**: a single helper for capabilities + `isCalloutAvailable`, used at all 5 sites plus `blocks/registry.ts`. Row 3, and it also fixes a future drift between menus, commands and the settings tab. Hand-off: refactor.
3. **Table-driven settings tab**: `addFeatureToggle` + `addCanvasSnippetButton`, then removal of `isActive` and `inactive`. Rows 4-7. The tab shrinks by about 250 lines. Hand-off: refactor.
4. Group the 🟢 callout-domain nits (constants, `scopesOverlap`, `scopeLabel`, attribute constant, `takenIds`) into one cleanup pass. Rows 11-18. Hand-off: refactor.

## Coverage

- **Scanned**: code-quality (DRY, dead code, naming, error handling, file size) on the 9 files in `features/callouts/`, the 9 files in `settings/`, and `BrumesPlugin.ts:115, 281-296, 366-367`.
- **Skipped**:
  - `src/styles/**/_callouts.scss` was only partly examined (Adrenaline anatomy) and is out of the TS scope requested.
  - The legacy flags `tagsSyntax` and `adrenaline*Parser` have no reader, but they are kept on purpose (frozen `data.json` format, `game-packs.md:21`), so they are not findings.
  - Performance is out of pillar: `buildAliasMap` is rebuilt on every mutation (`aliasSupport.ts:14-52`). This is worth a `performance` audit if long notes slow down.
