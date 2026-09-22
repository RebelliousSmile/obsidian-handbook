# Codebase Audit: ui

Static inspection found concise empty states in the new Pack integration modal, but one generic feature is inaccessible in most game modes and the same modal has no failure state for its asynchronous load.

- **Date**: 2026-09-22
- **Scope**: `src/settings/`, `src/features/`
- **Health**: good
- **Findings**: 0 critical, 2 warning, 0 minor

## Findings

| Sev | Category | Location | Issue | Suggested fix | Effort |
| --- | --- | --- | --- | --- | --- |
| 🟡 | ui | `src/settings/index.ts:77`, `src/settings/index.ts:560` | The generic Roller control appears only while Legend in the Mist is active, although `roller` has no game-mode restriction. | Render it in the general settings section; keep Dice Roller detection as the only disable condition. | S |
| 🟡 | ui | `src/settings/packIntegrationModal.ts:35` | A rejected `currentPackIntegration` promise is neither shown nor recoverable; the initial loading text remains indefinitely. | Catch failures, report an accessible error message, and offer Retry. | S |

## Top actions

1. Relocate the generic Roller toggle (row 1; `aidd-dev:02-implement`).
2. Add error and retry state to Pack integration check (row 2; `aidd-dev:02-implement`).

## Coverage

- **Scanned**: ui
- **Skipped**: no live Obsidian URL supplied; runtime accessibility audit and responsive visual inspection were not run.
