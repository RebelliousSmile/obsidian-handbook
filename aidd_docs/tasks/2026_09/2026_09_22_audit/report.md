# Codebase Audit: Handbook (full)

La base est globalement saine : compilation, lint et assertions contractuelles sont structurés et le contrôle de dépendances ne remonte aucune vulnérabilité de production. Quatre risques concrets restent à traiter, dont un défaut d’accès à la fonctionnalité Roller.

- **Date**: 2026-09-22
- **Scope**: whole repository on `main` (`v2.23.0`)
- **Health**: good
- **Findings**: 0 critical, 4 warning, 2 minor

## Findings

| Sev | Category | Location | Issue | Suggested fix | Effort |
| --- | --- | --- | --- | --- | --- |
| 🟡 | ui | `src/settings/index.ts:77`, `src/settings/index.ts:560` | `roller` is a generic block, but its only enable/disable control is rendered exclusively inside the Legend in the Mist section. Users of every other pack cannot enable it from Settings. | Move the Roller setting to the general section and keep only Dice Roller availability as its gate. | S |
| 🟡 | ui | `src/settings/packIntegrationModal.ts:35` | The asynchronous integration refresh has no rejection handler. A vault-adapter failure leaves the modal on “Checking every registered pack…” and risks an unhandled promise rejection. | Catch the error, log it, and render a retryable visible error state. | S |
| 🟡 | security | `src/games/sourceInstaller.ts:120` | The 20 MiB source limit is checked only after `readBinary` has buffered each remote asset. A declared oversized asset can allocate arbitrarily before rejection. | Enforce content length before buffering where available, or stream with a hard byte cap. | M |
| 🟡 | tests | `package.json:25`, `tools/assertRoller.harness.mts:1` | The Dice Roller flow has mocked unit coverage only; CI runs no real-Obsidian journey with the optional dependency, despite the feature’s external API and clipboard boundary. | Add a disposable Dice Roller E2E journey covering ordinary and lookup tables plus the unavailable-plugin path. | M |
| 🟢 | code-quality | `src/settings/index.ts:30` | The settings tab is a 912-line class that combines global settings, game-specific controls, schema-source management, presentation helpers, and async task handling. | Extract independent settings sections/controllers, retaining the tab as composition root. | M |
| 🟢 | performance | `src/features/packs/integration.ts:105` | Opening the integration modal resolves assets for every registered pack concurrently. It is user-triggered and bounded by installed packs, but one slow adapter can delay the entire report. | Add per-pack progress/failure isolation; consider bounded concurrency if pack counts grow. | M |

## Top actions

1. Make the generic Roller setting reachable from every game mode (`ui` row 1; use `aidd-dev:02-implement`).
2. Give Pack integration check a visible failure/retry state (`ui` row 2; use `aidd-dev:02-implement`).
3. Cap remote asset bytes before full allocation and add a hostile-size fixture (`security` row 3; use `aidd-dev:08-debug` or `02-implement`).
4. Cover Dice Roller through real Obsidian in CI (`tests` row 4; use `aidd-dev:11-browser-qa`).

## Coverage

- **Scanned**: code-quality, architecture, security, dependencies, performance, tests, ui
- **Skipped**: runtime profiler and bundle analyser unavailable; performance uses static inspection. No live Obsidian URL was supplied, so UI accessibility uses static inspection only.
