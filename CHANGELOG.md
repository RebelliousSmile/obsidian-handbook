# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Render an inline `{name-2}` status as the same tag pill an isolated field gets, wherever it is written inside a description, a consequence, a trigger, an effect or an outcome, across every block (367eef3).
- Surface malformed `litm-journey` input in a muted footer instead of dropping it silently: an unrecognised line, a `benefits:` on a non-`Undertaking` journey, a vignette missing its trigger, or a consequence written before any `CONSEQUENCES` heading (367eef3).

### Fixed

- Accept the `GENERAL CONSEQUENCES` heading in `litm-journey`, the wording most official profiles actually print, alongside the existing `CONSEQUENCES` (367eef3).
- Unwrap `{multi word tags}` in `litm-journey`'s `tags:` list instead of keeping the braces as part of the tag name, matching `litm-challenge` (367eef3).
- Repair the embedded PragRoman font: several accented uppercase and lowercase Latin letters (acute, grave, tilde, ring, cedilla) were mapped in the font's own character table to a glyph identical to their unaccented base letter, so the browser never fell back to the next font in the stack and the accent was lost, most visibly on uppercased journey and vignette titles (fc68f7b).

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
