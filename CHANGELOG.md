# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
