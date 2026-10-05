# Review: callout menus, French translation, print page breaks

- **Verdict**: approved with reservations (corrections applied, `pnpm check` green; schema-adrenaline publication pending)
- **Diff**: `99b7b9a...working tree` (tracked + untracked `src/`, `tools/`, `package.json`; `supervisor/trains/*.json` excluded, state files)
- **Axes run**: code, functional (criteria = the user's requests of the session, no `plan.md`), relevancy
- **Date**: 2026_10_05
- **Findings**: 0 critical, 6 warning, 7 minor

## Phases

### Phase 1 — PDF fonts match the screen

- [x] Body font of the export reads the pack's `--font-text-theme` — `src/styles/adrenaline/_page.scss:36-39`
- [x] Headings (h3…) styled in the export like on screen — `src/styles/adrenaline/_content.scss:9`

### Phase 2 — Page breaks around tall blocks

- [x] A block ≥ 40 % of the page takes a whole page — `src/features/printPageBreaks/index.ts:162-164`, `src/styles/_print.scss:41-44`
- [x] A shorter block is not split — `src/features/printPageBreaks/index.ts:166`, `src/styles/_print.scss:26-28`
- [x] Headings before a full-page block go with it — `src/features/printPageBreaks/index.ts:107-125`, `src/styles/_print.scss:32-39`
- [x] A block too tall for the page is shrunk — `src/features/printPageBreaks/index.ts:118-119`
- [x] A tall `![[image]]` takes a whole page — holder is now `p, figure` or the image itself with `display:block` (to confirm on the next PDF)

### Phase 3 — Zombiology booklet headings

- [x] h1 minimum height and right padding — `src/styles/adrenaline/_page.scss:98-102`
- [ ] h2 without a rule — the pinned `schema-adrenaline` pack still declares `--adrenaline-h2-rule: #211A18` (`node_modules/schema-adrenaline/handbook/adrenaline/pack.json:182`); the fix lives in an unpublished schema change and a hand-patched vault `pack.json`
- [ ] h3 rule in garnet — same: schema-side only, unpublished

### Phase 4 — Callout context menu

- [x] Only the callouts the pack declares are offered — `src/features/callouts/contextMenu.ts:18-44`
- [x] "Insert callout" submenu — `src/features/callouts/contextMenu.ts:56`
- [x] "Change callout type" submenu, inside a callout — `src/features/callouts/contextMenu.ts:118-142`
- [x] Clean up undeclared callouts, from the menu and the command palette — `src/features/callouts/contextMenu.ts:173-187`, `src/BrumesPlugin.ts:124-130`

### Phase 5 — French translation of Handbook's texts

- [x] Translation layer with English fallback — `src/utils/i18n.ts:16-24`
- [x] Volunteers can add a language — `src/locales/index.ts:4-10`
- [x] Every `t("…")` literal has a French entry — checked against `src/locales/fr.ts`
- [x] Every text Handbook adds is translated — settings, modals and rollers wrapped in `t()`; labels are English keys with French values in `fr.ts` (Adrenaline labels intentionally kept in French)

## Findings

| Sev | Kind | Phase | Location | Issue | Fix |
| --- | ---- | ----- | -------- | ----- | --- |
| ✅ | code | 2 | `src/features/printPageBreaks/index.ts:172` | `image.closest(".internal-embed, p, div")` resolves a wiki embed to its `span.internal-embed`, which is inline: `break-before: page` does not apply to inline boxes (to be checked on the next PDF). A bare `div` fallback can also catch a layout column or the whole section and `zoom` it | Pick the nearest block-level holder (`p, figure` first, `.internal-embed` only when it is a block), stop at `container`'s children, or set `display: block` on `.handbook-print-full-page` |
| ⏳ | functional | 3 | `src/styles/adrenaline/_page.scss:115` | h2 without rule / h3 garnet depend on the unpublished `schema-adrenaline` change: with the pinned pack, the h2 rule reappears after the vault `pack.json` is reinstalled | Publish `schema-adrenaline` with `--adrenaline-h2-rule` removed and the h3 rule `#9D2416`, adopt it in Handbook (cross-repo flow), then restore the vault `pack.json` |
| ✅ | conform | 3 | `src/styles/adrenaline/_page.scss:115` | The h2 fallback changes from `var(--adrenaline-rule)` to `transparent` in the consumer: a presentation choice made locally, for every Adrenaline pack that does not declare `--adrenaline-h2-rule` (rule `0-cross-repo-contract-flow`: no local semantic fallback) | Keep the old fallback and let the pack declare `--adrenaline-h2-rule: transparent`, or record the default change in the schema contract first |
| ✅ | functional | 5 | `src/settings/index.ts` | "All Handbook texts in French": the settings tab (53 `setName`/`setDesc`) and the modals (`calloutsModal`, `sourceModal`, `starterKitModal`, `packIntegrationModal`, `pbtaCoverageModal`, `themeContentsModal`) and `rollers/contextMenu.ts` are not wrapped in `t` | Wrap those strings in `t()` and add their `fr.ts` entries, or state the reduced scope (menus + notices) |
| ✅ | code | 5 | `src/features/osChallenges/block.ts:7-8` | `t(block.label)` for "Challenge :Otherscape" and "Power Set :Otherscape" finds no `fr.ts` entry; other labels are French in the source ("Fiche PJ Adrenaline", "Thème :Otherscape", "Trope de personnage :Otherscape") so English users see French | English keys in every `BrumesBlock.label`, their French values in `fr.ts` |
| ✅ | conform | - | `CHANGELOG.md` | Menus, translation and page breaks are user-visible but have no `CHANGELOG` entry (CLAUDE.md: "La version et le CHANGELOG se préparent avec le changement") | Add the entry with the change |
| ✅ | code | 4 | `src/features/callouts/contextMenu.ts:155` | `editor.setValue` rewrites the whole note for a few changed lines: scroll position and folds are reset | Apply one change per retargeted line with `editor.transaction({ changes })` |
| ✅ | code | 4 | `src/features/callouts/contextMenu.ts:124` | Every right-click splits the whole note (`getValue().split("\n")`) to find the opening line, and recomputes the available callouts 4 times (`index.ts:31`, `:46`, `contextMenu.ts:52`, `:126`) | Walk upward with `editor.getLine(i)`; compute the callout list once in `registerBrumesContextMenu` and pass it down |
| ✅ | code | 4 | `src/features/callouts/retarget.ts:22` | `FENCE` toggles on any fence line: a ```` ``` ```` inside a `~~~` block (or a longer fence) flips the state; fences inside a callout (`> ```) are not seen | Remember the opening marker and its length, close only on a matching one; allow a `>` prefix |
| ✅ | rot | 4 | `src/features/callouts/contextMenu.ts:102-115` | `getDeclaredCalloutAliases` repeats the filter loop of `getAvailableCalloutInsertions` (`required`, `isCalloutAvailable`, `aliases[0]`) | One shared iterator of available entries used by both |
| ✅ | rot | 5 | `src/utils/i18n.ts:11` | `isFrench` is exported but never used | Remove it |
| ✅ | rot | 2 | `src/features/printPageBreaks/index.ts:64-68` | The comment says "A4" while the export measured during the session is Letter; the height is an estimate either way | Say "printable height of a page (A4 or Letter)" |
| ✅ | rot | - | `tools/assert-callouts.mjs:13`, `tools/assert-layout-regions.mjs:17` | The `obsidian` stub is copied a third time (also in `assert-contextual-toml-export.mjs`) | A shared `tools/obsidianStub.mjs` helper writing the stub |

> ✅ fixed · ⏳ pending: the h2 `transparent` and h3 `#9D2416` are declared in the unpublished `schema-adrenaline`; the vault `pack.json` is hand-patched until it is published and adopted.

## Verification

| Metric        | Value |
| ------------- | ----- |
| Verified      | 78% (14/18) |
| Files checked | `src/BrumesPlugin.ts`, `src/contextMenu/index.ts`, `src/features/blocks/{copyAsToml,pasteToml,registry}.ts`, `src/features/callouts/{contextMenu,retarget}.ts`, `src/features/layoutRegions/{insertion,postProcessor}.ts`, `src/features/printPageBreaks/index.ts`, `src/features/tags/contextMenu.ts`, `src/locales/{index,types,fr}.ts`, `src/utils/{i18n,contextSubMenu}.ts`, `src/styles/{_print,adrenaline/_page,adrenaline/_content}.scss`, `tools/assert-{callouts,layout-regions,callout-retarget,print-page-breaks}.mjs`, `tools/{calloutRetarget,printPageBreaks}.harness.mts`, `package.json` |
| Unchecked     | wiki-embed image full page — fix; h2 without rule — fix; h3 garnet — fix (same schema publication); all texts translated — fix |
| Unplanned     | `supervisor/trains/zombiology-pj-design.json` (+503 lines) and the untracked empty train `zombiology-booklet-styles.json`: supervisor state, to be closed or deleted before commit |
