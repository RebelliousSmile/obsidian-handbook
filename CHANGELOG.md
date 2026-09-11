# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.8.1] - 2026-09-11

### Changed

- Make the three Adrenaline code blocks automatically available with the installed game instead of exposing redundant feature switches.
- Simplify the settings screen by removing the illustration diagnostics and obsolete Style Settings migration notice.
- Rename the schema refresh action to `Reload installed schemas` and make it fetch, validate and reinstall every registered Git reference before rebuilding the game registry.

### Fixed

- Keep level-one headings above the two-column reading layout in Adrenaline, Urban Shadows and Monsterhearts.

## [2.8.0] - 2026-09-11

### Added

- Add manifest-driven PbtA playbook and move blocks, a playbook handout, four portable callouts and shared PbtA styling without coupling Handbook to game identifiers.
- Display installed handouts, blocks and callouts from `installation.requires`, including for a previously unknown compatible game.

### Changed

- Consume the canonical `schema-pbta` v1 contract from its immutable GitHub Release asset and preserve the resolved integrity in the lockfile.

## [2.7.3] - 2026-09-11

### Added

- Add responsive two-column reading layouts for Urban Shadows and Monsterhearts, with a per-note `pbta-one-column` opt-out.
- Add Drowned Lake-specific title outlining backed by tokens from the installed game pack.

## [2.7.1] - 2026-09-10

### Added

- Replace the three per-game Mist starter choices with a Mist Engine kit and a multi-source test kit that installs the Adrenaline and PbtA schema repositories together.

### Fixed

- Read downloaded schema files from Obsidian's `requestUrl` response properties, restoring starter-kit and schema-source installation in the desktop application.

## [2.7.0] - 2026-09-10

### Added

- Install and manually update public GitHub schema sources that follow a release, tag or branch, including repositories that publish several game packs.
- Open a three-choice starter-kit modal when Handbook starts without a game; the catalogue is compiled into `main.js`, so Community plugins and BRAT installations expose the same first-run experience.

### Changed

- Move City of Mist, Legend in the Mist and :Otherscape design data and assets to `schema-in-the-mist`; Handbook now starts in a neutral state and retains only host renderers and structural styles.
- Make the core build and CI independent from a local `schema-adrenaline` checkout while keeping its dedicated compatibility assertion available.

## [2.6.0] - 2026-09-10

### Added

- Load versioned Handbook game plugins from `packs/<id>/pack.json`, with host-version and capability checks, deterministic collision handling, and assets confined to each plugin directory; legacy `packs/*.json` files remain supported.

### Changed

- Make Adrenaline System optional: its canonical declarative pack now lives in the shared `schema-adrenaline/handbook/adrenaline` directory and appears in Handbook only when that directory is installed.
- Preserve Adrenaline parser preferences and safe game-scoped callouts across uninstall and reinstall while hiding its mode and settings whenever the game plugin is absent.

### Fixed

- Reject unsafe CSS custom-property names at the pack and override boundary, read styles from overrides wrapped under `pack`, and restore readable City of Mist callout body and icon colours.

## [2.5.0] - 2026-09-10

### Added

- Load personal game packs dropped in `<plugin folder>/packs/*.json` into the registry at startup, merged with the declared games; a faulty pack (invalid id, id collision with a declared or another custom pack, unreadable field) is dropped alone and logged once per session, named by its own filename.
- Resolve a saved `mode` pointing at a vault-dropped pack on the very first render: custom-pack loading now runs in `onload()` ahead of `loadSettings()`, and `gamePackClasses()`/`gameVariantClasses()` no longer freeze their class lists at import time.
- Add `pnpm assert:custom-packs`, a durable harness covering the missing-packs-folder case, a valid/invalid/colliding trio, a two-custom-packs id collision, and the full lifecycle order.

## [2.4.0] - 2026-09-09

### Added

- Replace the two hardcoded per-game callout-alias blocks with a single, extensible `settings.callouts` list scoped to a single game or to all four, editable through a closed-vocabulary constructor in the settings screen (name, aliases, scope, template, icon, font and colour).
- Migrate the 7 historical callout styles (City of Mist's `clue`, `red-clue`, `move`, `description`, `note`; Legend in the Mist's `note`, `read-aloud`) into locked native entries automatically, preserving their existing render.
- Apply user-defined callout styling live through the plugin's own `<style>` element, without reloading, via a new `styleWriter`.
- Register a dynamic Obsidian command per callout entry (added, removed or renamed on every settings save, cleared on unload), so a shortcut can be bound from Settings → Hotkeys; scoped entries carry the game name to disambiguate and stay hidden from the palette when another game is active.
- Give :Otherscape and Adrenaline System their own `_callouts.scss`, so a common-scope callout and native Obsidian callouts (`> [!info]`) render tinted on all four games, not just City of Mist and Legend in the Mist.

### Fixed

- Theme City of Mist's `--code-normal`/`--code-background` so inline code (for example a backtick-wrapped block id in a heading) follows the game palette instead of Obsidian's default colour.

## [2.3.3] - 2026-09-09

### Fixed

- Keep ordinary text readable in :Otherscape theme, challenge, power-set and character-creation cards when their forced light or dark colour scheme differs from Obsidian's surrounding theme.

## [2.3.2] - 2026-09-09

### Fixed

- Restore Handbook block rendering and game styles immediately after reloading the plugin, without requiring users to edit or save already-open notes.

## [2.3.1] - 2026-09-09

### Fixed

- Align the Adrenaline PJ sheet and PNJ/monster cards with their published layouts: denser section bands, explicit physical and mental health labels, and source-specific placement order.
- Preserve `[meta]` for Lantern and TOML exports without printing Lantern provenance as a Handbook card footer.
- Realign package, manifest and compatibility metadata after the `2.3.0` tag.

## [2.3.0] - 2026-09-09

### Added

- Add Adrenaline System as a fourth game pack, with sourced light and dark visual tokens and no runtime dependency on the source repository (f3c7b0c).
- Add tolerant local TOML document primitives and validate emitted PJ, PNJ and monster documents against the sibling `schema-adrenaline` Zod targets (eefb043).
- Render complete Adrenaline player-character sheets with identity, characteristics, health, protections, formations, competences, equipment and provenance (1559dba).
- Render compact Adrenaline non-player-character sheets that preserve both minimal and fully detailed profiles (ec65663).
- Render Adrenaline monster sheets with confrontation-first information, alternate states, contagion and responsive light/dark layouts (5dfafbe).

## [2.2.1] - 2026-09-09

### Fixed

- Restore opening Markdown notes containing Handbook's brace-tag syntax by returning a detached CodeMirror widget node instead of appending it to the document (d3ca064).

## [2.2.0] - 2026-09-09

### Added

- Add a vault-wide Metro, Cairo or Tokyo universe selector for :Otherscape, with sourced light and dark palettes, live repainting and per-game persistence.
- Add the shared tolerant TOML primitives for the six canonical :Otherscape schemas.
- Render `os-theme` and `os-theme-kit`, including Self, Mythos, Noise and Crew identity, burnt tags, quests and played-theme tracks.
- Render `os-challenge` and `os-power-set`, preserving Limits, Specials, standalone Threats and local or general Consequences.
- Render `os-character-trope` and `os-loadout-item`, preserving paired Theme Kit references, free-form loadout suggestions and the catalog's single optional weakness tag.
- Credit Mist HUD's MIT-licensed Metro visual vocabulary without redistributing its artwork or Foundry-specific assets.

## [2.1.4] - 2026-09-09

### Added

- Render an inline `{name-2}` status as the same tag pill an isolated field gets, wherever it is written inside a description, a consequence, a trigger, an effect or an outcome, across every block (367eef3).
- Surface malformed `litm-journey` input in a muted footer instead of dropping it silently: an unrecognised line, a `benefits:` on a non-`Undertaking` journey, a vignette missing its trigger, or a consequence written before any `CONSEQUENCES` heading (367eef3).

### Fixed

- Complete the forced City of Mist dark workspace palette so settings, controls and text no longer retain light-theme colours, and remove workspace colour overrides that contradicted the v1 theme (d4d77e5).
- Accept the `GENERAL CONSEQUENCES` heading in `litm-journey`, the wording most official profiles actually print, alongside the existing `CONSEQUENCES` (367eef3).
- Unwrap `{multi word tags}` in `litm-journey`'s `tags:` list instead of keeping the braces as part of the tag name, matching `litm-challenge` (367eef3).

## [2.1.3] - 2026-09-09

### Added

- Let readers follow Obsidian's colour scheme or force Handbook to light or dark independently, including the general City of Mist v1 workspace themes (190df21).

## [2.1.2] - 2026-09-09

### Fixed

- Restore game styling on rendered blocks and keep note colours out of the surrounding interface when `Workspace theme` is disabled (b533580).

## [2.1.1] - 2026-09-09

### Fixed

- Render rich setting descriptions as DOM content instead of displaying `[object DocumentFragment]` (c85e959).

## [2.0.1] - 2026-09-09

### Fixed

- Realign the plugin manifest and release tag with the current 2.x release line so BRAT can detect and install updates.

## [1.2.0-beta] - 2026-09-08

### Added

- Every fenced block now reads and writes a schema document, and every one has a "copy as TOML" command. `com-theme-card`, `litm-journey` and `litm-theme-kit` had neither; a format without an upstream shape is not exempt from publishing one, it is the reason to publish one (42820df, 4ebb954).
- A block describes itself as an ordered list of named zones — what it holds and in what order — while the stylesheet keeps saying where each zone sits and how big it is. The schema never serialises CSS, and the stylesheet never reads the schema (c11023b).
- A game pack can override a block's shape zone by zone through the `shapes` key of `overrides.json`: rename the printed heading of a zone, hide one. A zone no shape knows is reported once per session and the rest loads; a file naming one block leaves the other five untouched (f520b9c).
- A pack declares which polarities the game actually sources, and derives none. City of Mist and :Otherscape declare `light` and `dark`, Legend in the Mist declares `light` alone. An undeclared layer is not written rather than written as a copy of the base one, which would break a dark vault for a game printed on white (a8b2e46).
- `pnpm assert:corpus`, `pnpm assert:override` and `pnpm dump:dom`: three durable assertions and no new dependency. The first checks that every block in the registry reads a witness in full, degrades a rejection without throwing, and owns its copy command; the second renders a witness without `overrides.json`, with it, then without, and compares character by character; the third dumps the rendered DOM of the six blocks so a phase that should not touch the markup can be shown not to have (1f3ca93).
- A shared corpus behind those assertions: `corpus/temoins/` holds one document per block that must render, `corpus/refus/` holds twenty documents that must be rejected, one per fault and named by the fault. Both halves are needed — without the witnesses, a run of rejections proves nothing, since a schema that rejects everything would pass them all (1f3ca93).
- `aidd_docs/guidelines/schema-design.md`: what a fenced format owes the schema, written once. The four obligations, zero exemption, the values / shape / pixels boundary, polarity, the strict-schema and tolerant-consumer split, and the line that decides whether a colour belongs to the pack or to the stylesheet (41ce927, a0ae1f8).

### Changed

- Values that dress the page — paper, ink, links, a highlighter mark, tables, checkboxes — moved from the partials into the packs, where a reader can reach them through `overrides.json`. Values belonging to one block's anatomy stayed in the stylesheet, because a pack already reaches a block through `shapes` and two doors would be two truths. Three families keep their own colours and now say why at the top of the file: a vocabulary Obsidian owns and a pack cannot enumerate, a texture tuned against the ground behind it, and a canvas card, whose note opens in an iframe the pack's custom properties never reach (a8b2e46).
- Two hand-written values that missed an already-declared token by a hair now read the token, and the Legend in the Mist tables, written blind, no longer render a beige header with black ink in a dark vault (a8b2e46).

### Removed

- The Legend in the Mist dark scheme. The game prints parchment and nothing else, so the dark layer was invented rather than sourced; the game now renders its parchment whatever the vault's theme is set to (a8b2e46).

## [1.1.0-beta] - 2026-09-08

### Added

- A game is now a declarative pack: `src/games/` holds one file per game, each naming its identifier, its label, the custom properties it writes by theme variant, and the illustrations it draws with. Adding a game is one file plus one line in the registry, with no stylesheet to write (142a6df).
- `:Otherscape` ships as the first game written as a pack and nothing else, with colours sampled from the core book and no partial of its own (e44e1c4).
- Illustrations and typefaces are read from the vault, under the plugin's own `assets/<game>` folder and addressed by the role they play rather than by filename. A role a game leaves out degrades to a plain rendering instead of reserving an empty box (de64daa).
- Fine tuning goes through an `overrides.json` file in the plugin folder: a pack that declares only the values it changes, merged over the game's own. Removing the file returns the rendering to the game untouched (142a6df).
- A pack can be read as a document of the format published beside the content schemas, with no fetch and no import of the schema repository. An unknown field is reported once per session and the rest of the pack loads (1f5ce47).
- A settings action writes the Advanced Canvas snippets, which stayed a prerequisite for the iceberg and mountain node styles (0904137).

### Changed

- The plugin owns its visual base. Every token it sets is written into a single `<style>` element it created, scoped by the active game and the active theme variant, so switching games repaints in place and leaves nothing behind. One write point means one clean-up point (0904137).

### Removed

- The Style Settings presets, `themes/city-of-mist.settings.json` and `themes/legend-in-the-mist.settings.json`, and the border presets that fed them. Style Settings is no longer needed to see a game's rendering (0904137).

## [2.1.0-beta] - 2026-09-06

### Added

- Render `litm-challenge` blocks as challenge profile cards, with roles, limits, might, tags and statuses, special features, threats and consequences, and secrets (c137ed7).
- Render `litm-journey` blocks as journey sheets for landscapes, occasions and undertakings, with tags, benefits, general consequences and a vignette grid (7779fb8).
- Render `litm-theme-kit` blocks as ready-made theme cards, with themebook category, power and weakness tags, quest and named special improvement (2a02987).

### Changed

- Extract a `BrumesBlock` registry from the story theme feature, so a new fenced block is one registry entry instead of five wiring points (af26eaf).
- Rename the `story-theme` block to `theme-card`, the name matching what it draws. A card without a might level now drops the level badge and the themebook line (6124927).

### Deprecated

- The `story-theme` block id. It still renders the same card and logs a single deprecation warning per session; use `theme-card` in new notes. The `features.storyThemeParser` setting key is unchanged, so saved vaults keep their toggle (6124927).
