---
objective: Let an author force light or dark on a section of a note with `<!-- handbook-mode: dark -->` … `<!-- /handbook-mode -->`, whatever the game, with a context-menu item under "Multi-column region".
status: implemented
---

# Forced-mode section

## Overview

Source: brainstorm of this session. Decisions already taken by the user:

- Syntax: a dedicated pair `<!-- handbook-mode: alternate|dark|light -->` … `<!-- /handbook-mode -->`, each marker alone on its line, independent of `handbook-layout` and nestable with it both ways.
- Scope: the whole rendering of the section (paper, ink, headings, callouts, tables, Handbook blocks).
- Print: the section is honoured only when `printerFriendly` is off; on, everything prints light.
- A game that cannot offer the requested polarity: marker ignored, one warning; the menu item stays offered.
- Menu: item inserted right under "Multi-column region".

### Cross-schema verification (done before planning)

The feature must hold for every pack, so the code was read for what each pack declares:

| Pack | Polarities (read in `node_modules/schema-*`) | Result |
| --- | --- | --- |
| City of Mist | `light` + `dark` | works: both layers exist, the section re-emits the other one |
| Otherscape | per variant (`cairo` and `tokyo` declare both; each variant is read on its own) | works, but polarities are **per active variant** (`variants.ts:79`), never per pack |
| Adrenaline | `light` + `dark` | works |
| Legend in the Mist | `light` only | marker ignored + warning (the pack never wrote a dark layer) |
| PbtA (installed `schema-pbta`) | none declared | no section rule, marker ignored + warning |
| Custom `packs/<id>/pack.json` | whatever they declare | same rule: a forced polarity needs the pack's own layer |

Findings from the code that shape the plan, all schema-independent:

1. **Layers are bound to the body.** `buildGameStyle` writes `values.dark` under `body.brumes--<g>.theme-dark …`; a section sitting under `theme-light` receives nothing of the dark layer. The section needs its own selector, `body.brumes--<g> .handbook-mode-<polarity>`, fed by the same `values[polarity]`, so no pack has to change.
2. **Custom properties set on a descendant always beat inherited ones**, so the section selector wins over the note selectors regardless of specificity.
3. **The block scope fights back.** Handbook blocks carry `.brumes-block-scope.brumes--<g>` and `noteSelector` writes `body.theme-<p> .brumes-block-scope…` on them: inside a section they would re-apply the *body* polarity. The section selector must also be emitted for `.handbook-mode-<p> .brumes-block-scope.brumes--<g>`.
4. **Obsidian's own derived tokens** resolve once on `body` (see `forcedInkTokens`). The section re-derives them; adding Obsidian's `theme-<p>` class on the section block is the lead to also get the theme variables the pack does not redefine (assumption, spiked in phase 2).
5. **Static SCSS gated on the body class** exists in City of Mist only (`_dangers.scss:36`, `_workspace.scss:97/159`). `_workspace` targets the workspace chrome (not a section), `_dangers` re-skins `.brumes-com-danger` under `.theme-dark`/`.brumes--colour-dark` as a body ancestor: it must be mirrored as `.handbook-mode-dark .brumes-com-danger` (and the light twin) via a `@mixin`, never by copying values.
6. **Background image (user remark).** Three mechanisms exist and behave differently:
   - the pack's page texture is painted on the **view** (`.markdown-reading-view::before`, Adrenaline `_page.scss`) from `--adrenaline-page-texture`, a token whose value differs by polarity (`paper-grain` vs `dark-organic`) and whose name is Adrenaline's;
   - a note's own `background-image` frontmatter (`_note-background.scss`) is painted on the view too, and `brumes-note-background` removes the pack texture;
   - role illustrations (`--brumes-image-<role>`) are on components, polarity-neutral.

   A section is a block inside the view, so it can neither inherit nor repaint the view's layer. Decision below (D3).

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Marker grammar and parser | `phase-1.md` |
| 2 | Scoped style emission, per-pack and per-variant | `phase-2.md` |
| 3 | Application in reading view (and the Live Preview call) | `phase-3.md` |
| 4 | Print | `phase-4.md` |
| 5 | Context-menu item and i18n | `phase-5.md` |
| 6 | Cross-pack matrix, docs, corpus | `phase-6.md` |

## Resources

- `src/features/layoutRegions/` (parser, sectionMapper, postProcessor, warnOnce, printMapper) — precedent to mirror.
- `src/features/modes/styleElement.ts`, `domModeClass.ts`, `src/games/variants.ts`.
- `src/styles/_note-background.scss`, `src/styles/adrenaline/_page.scss`, `src/styles/_print.scss`.
- ADR `aidd_docs/memory/internal/decisions/print-export-joins-blocks-by-rank.md`; `aidd_docs/guidelines/schema-design.md`.

## Decisions

| # | Decision | Why |
| --- | --- | --- |
| D1 | New module `src/features/modeSections/` mirroring `layoutRegions/`, not an extension of its parser | independent markers, independent diagnostics; shared helpers only if a third use appears |
| D2 | Polarity availability is read from the **active variant's** polarities, via the same resolution as `buildGameStyle` callers | Otherscape variants differ; reading `pack.polarities` would be wrong |
| D3 | Background image: the section paints an opaque `background-color: var(--background-primary)` and, **if the pack declares it**, a texture through a generic token `--brumes-section-texture` (+ `-size`) that the pack sets per polarity. Without it the section is flat. A note's own `background-image` is covered by the section (documented). | cross-repo rule: no local semantic fallback and no knowledge of `--adrenaline-*` in Handbook. Needs the token declared in `schema-*` first (extend, publish, then adopt); until then sections are flat, which is a valid degraded state, not a bug |
| D4 | No new `features.*` setting | feature is author-driven by the marker; nothing to toggle |
| D5 | Live Preview: v1 is reading view and print only; the editor keeps the note's mode. Revisit after seeing reading view | Live Preview has no per-section DOM to scope without a CodeMirror decoration layer — a separate piece of work |
| D9 | The menu offers one item, "Alternate section": the section takes the polarity opposite to the body's current one (`alternate`). `dark` and `light` stay valid by hand. Rules are written per body polarity (`.theme-<p>` or `.brumes--colour-<p>` when the scheme is forced); a pack with fewer than two polarities ignores it | the author thinks in "other than the note", not in a fixed mode |
| D6 | Class names `handbook-mode-dark` / `handbook-mode-light` on the rendered blocks; CSS prefix stays `brumes-*` only for existing identifiers (new feature follows `handbook-*` like `handbook-layout-*`) | same convention as layout regions |
| D8 | The polarities used are the **effective** ones computed at `BrumesPlugin.ts:355` (`overrides.json` claim, else the variant's). The plugin keeps them readable (one accessor) for the post-processor and the print mapper, so style emission and DOM marking can never disagree | a user `overrides.json` can change the polarities; reading the pack in two places would drift |
| D7 | A section may not declare a polarity equal to the one already shown: it still applies (harmless, and robust to the vault's theme changing) | avoids a theme-dependent behaviour |
