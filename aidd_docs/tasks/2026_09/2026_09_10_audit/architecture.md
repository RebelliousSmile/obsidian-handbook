---
name: audit
description: Post-implementation architecture audit of the Handbook / schema-adrenaline boundary
---

# Codebase Audit: Handbook / schema-adrenaline separation

The implemented boundary is sound in principle: `schema-adrenaline` owns declarative game values and assets, while Handbook owns trusted behavior, selectors, and structural layout. The main defect is operational: the currently documented install location is inside the replaceable Obsidian plugin directory, so an update can erase the optional pack and its local overrides. The visual contract is also too narrow to reproduce the two editorial families in the supplied reference PDF.

- **Date**: 2026-09-10
- **Scope**: `obsidian-handbook`, sibling `schema-adrenaline`, and `Z1L04_Livret Police.pdf`
- **Pillar**: architecture
- **Health**: fair
- **Findings**: 1 critical, 5 warnings, 0 minor

## Findings

| Sev | Category | Location | Issue | Suggested fix | Effort |
| --- | --- | --- | --- | --- | --- |
| 🔴 | architecture / data durability | `src/games/customPacks.ts:25`, `src/games/overrides.ts:161` | Packs and `overrides.json` are stored below `plugin.manifest.dir`. A BRAT/plugin update replaces that directory; this has already removed the installed Adrenaline pack. User-installed packages and overrides are therefore treated as disposable application files. | Move user material to a vault-stable directory outside `.obsidian/plugins/<plugin-id>` (for example `.obsidian/handbook/packs` and `.obsidian/handbook/overrides.json`). Read the legacy location during a migration window, with explicit precedence and a one-time copy/migration. | M |
| 🟡 | architecture / capability contract | `src/games/pluginManifest.ts:194`, `src/games/capabilities.ts:8`, `src/styles/adrenaline/index.scss:6` | `requires` validates only that capability strings exist globally. It does not prove that a differently named pack activates those renderers/styles. Adrenaline blocks and CSS are keyed to the literal mode `adrenaline`, so a manifest can pass validation while its declared capability remains unusable. | Key support declarations by game/pack id (`GameSupport`) or, for contract v1, enforce that game-specific capabilities match the pack id. Add an integration test that activates the pack and renders a declared block/style instead of testing registry presence only. | M |
| 🟡 | architecture / CSS ownership | `src/styles/adrenaline/_callouts.scss:1`, `tools/assertAdrenalineTheme.harness.mts:80` | Callouts retain their own fixed pastel palette, black ink, and font. They bypass the external light/dark tokens and are excluded from the hard-coded-color assertion, so dark Adrenaline still receives light callout surfaces. | Put callout color/font values in the external pack, separated by polarity; retain callout anatomy/selectors in Handbook. Extend the theme assertion to `_callouts.scss`. | S |
| 🟡 | architecture / visual contract | `../schema-adrenaline/handbook/adrenaline/pack.json:157`, `src/styles/adrenaline/index.scss:6` | The pack declares no assets, and Handbook has no structural consumers for paper grain, dark organic texture, warning-band motifs, editorial cartouches, or page composition. Flat tokens alone cannot approximate the supplied Police booklet. | Store licensed textures, motifs, and font files in the external package and expose them as sanitized asset variables. Implement their restrained structural use in Handbook under mode + polarity selectors, with solid-color fallbacks. | M |
| 🟡 | architecture / workspace theming | `../schema-adrenaline/handbook/adrenaline/pack.json:94` | Each workspace polarity overrides only three secondary-background variables. Primary surfaces, text, borders, accents, and interaction states still come from the host theme, so the chrome can diverge visibly from the current page. | Define a small, explicit workspace token inventory for primary/secondary surfaces, text, borders, accents, and interactions. Keep page typography and block variables in `note`, not `workspace`. | S |
| 🟡 | architecture / cross-repository contract | `../schema-adrenaline/package.json:12`, `.github/workflows/release.yml:21` | Neither repository has a CI gate that validates the external pack against the Handbook manifest/style contract. Handbook release CI builds only Handbook, while schema checks do not exercise `handbook/*/pack.json`. Either side can ship a breaking change independently. | Add schema-side manifest validation plus a pinned cross-repository compatibility job. Version the pack contract and test Handbook against the supported schema-adrenaline fixture before release. | M |

## Boundary assessment

The ownership split should remain:

- **`schema-adrenaline`**: `pack.json`, light/dark values, workspace values, fonts, textures, motifs, and other game-owned static assets.
- **Handbook**: trusted TypeScript behavior, block renderers, sanitization, CSS selectors, responsive layout, semantic page anatomy, and generic pack loading.

This avoids a second executable repository per game while keeping untrusted external material declarative. It also permits Handbook and Lantern to consume the same game package without duplicating visual assets.

`src/features/modes/styleElement.ts` already expresses the right conceptual split between `note` and `workspace`, and `src/styles/adrenaline/index.scss` correctly scopes structural rules to the Adrenaline mode. One semantic nuance should be documented: “page courante” currently means all Markdown reading/source surfaces in a document, not only Obsidian's active leaf.

## Top actions

1. Relocate packs and overrides to a vault-stable user-data directory and migrate the current location.
2. Make capability declarations game-aware, then add a real activation/render compatibility gate across both repositories.
3. Define the two-polarity visual contract from the PDF: external textures/fonts/tokens, internal structural consumers, and complete callout tokenization.

## Coverage

- **Scanned**: pack discovery and validation, capability registry, runtime style generation, document/mode scoping, Adrenaline blocks and SCSS, overrides, release checks, sibling schema package, and all 20 pages of the supplied visual reference.
- **Validated**: projected foreground/background pairs with the design contrast adapter; 13/13 leaves were paired. All principal body/title pairs pass WCAG AA. The light yellow accent is only 3.87:1 on paper and must not carry normal-size text without adjustment.
- **Skipped**: interactive Obsidian screenshots because no running UI session was required for this read-only architecture audit; non-architecture quality pillars.
