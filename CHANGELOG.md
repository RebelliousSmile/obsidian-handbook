# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
