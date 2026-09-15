# Adrenaline visual QA — phase 5

Verdict: **pass** on 2026-09-15. The eight captures below are the canonical
evidence for the same fictional note, at scroll anchor `0`, zoom `100%`, with
its external control link focused through keyboard modality.

## Reproducible environment

- Obsidian: `1.13.7`, default host theme (`theme-light`); Adrenaline light/dark
  is selected independently by Handbook.
- Handbook: `2.8.6`, branch `feat/adrenaline-separation-hardening-finish`,
  parent commit `3a38c84a1c0c31a36f37c51574de1e49b1463a60`; the phase 5 delta is
  committed together with this evidence.
- schema-adrenaline: commit
  `c23282be98a61511822fc292aba3b94f0f016742`, catalog pack `adrenaline@0.3.0`,
  installed through the Schema sources catalog in a disposable vault.
- Fixture: [`tools/fixtures/adrenaline-visual.md`](../../../../../tools/fixtures/adrenaline-visual.md).
- Viewports: exact Chromium content viewports `1440×1000` and `500×900`.

## Capture matrix

| Colour | Viewport | Workspace | Evidence | Result |
| --- | --- | --- | --- | --- |
| light | `1440×1000` | off | [`light-desktop-workspace-off.png`](light-desktop-workspace-off.png) | pass |
| light | `1440×1000` | on | [`light-desktop-workspace-on.png`](light-desktop-workspace-on.png) | pass |
| dark | `1440×1000` | off | [`dark-desktop-workspace-off.png`](dark-desktop-workspace-off.png) | pass |
| dark | `1440×1000` | on | [`dark-desktop-workspace-on.png`](dark-desktop-workspace-on.png) | pass |
| light | `500×900` | off | [`light-narrow-workspace-off.png`](light-narrow-workspace-off.png) | pass |
| light | `500×900` | on | [`light-narrow-workspace-on.png`](light-narrow-workspace-on.png) | pass |
| dark | `500×900` | off | [`dark-narrow-workspace-off.png`](dark-narrow-workspace-off.png) | pass |
| dark | `500×900` | on | [`dark-narrow-workspace-on.png`](dark-narrow-workspace-on.png) | pass |

## Traversal checklist

- [x] The complete note was traversed at six scroll positions. All seven
  callout families (`info`, `success`, `question`, `warning`, `danger`,
  `example`, `quote`) and all three blocks (`adrenaline-pj`,
  `adrenaline-pnj`, `adrenaline-monstre`) rendered; Mara Veld, Jonas Kerl and
  Écho de maintenance were all observed.
- [x] Desktop composition uses two readable columns; the `500×900` viewport
  collapses to one column without horizontal clipping.
- [x] The page texture remains behind note content, ignores pointer events and
  has computed opacity `0.32` in light mode and `0.20` in dark mode.
- [x] With workspace styling off, `brumes--workspace-theme` is absent and the
  chrome remains neutral. The note texture never reaches the workspace.
- [x] With workspace styling on, the body opt-in class is present. A keyboard-
  focused chrome control receives the same 2 px accent outline; with the opt-in
  off, that Adrenaline outline is absent.
- [x] In every matrix state, the focused note link matches `:focus-visible` and
  has a computed 2 px solid accent outline.
- [x] Text, tables, inline/code blocks, tags and callouts remain legible on the
  textured surface in both colour schemes.
- [x] `npm run check` remains independent from schema-adrenaline. The dedicated
  cross-repository assertions pass against the source revision above, and the
  schema validator's low-contrast negative fixture is rejected.
- [x] The fixture is original, fictional test material. No image, text or page
  from a published Adrenaline PDF is redistributed.

The vault and browser profile used for this run are temporary and are removed
after validation; no user vault is opened or modified.
