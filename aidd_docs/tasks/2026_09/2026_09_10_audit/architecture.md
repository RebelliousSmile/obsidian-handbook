---
name: audit
description: Architecture audit of the optional Adrenaline package boundary
---

# Codebase Audit: optional Adrenaline package boundary

The appearance pack can become optional, but the current external-pack boundary does not carry Adrenaline's renderers, settings, or structural styles.

- **Date**: 2026-09-10
- **Scope**: `obsidian-handbook` Adrenaline integration and sibling `schema-adrenaline`
- **Health**: good
- **Findings**: 0 critical, 2 warning, 1 minor

## Findings

| Sev | Category | Location | Issue | Suggested fix | Effort |
| --- | --- | --- | --- | --- | --- |
| 🟡 | architecture | `src/games/customPacks.ts:28` | External packs are single JSON files directly under `packs/`; installing one self-contained directory with colocated assets is not supported. | Accept `packs/<id>/pack.json`, retain flat JSON compatibility, and resolve undeclared asset roots relative to the package directory. | M |
| 🟡 | architecture | `src/features/blocks/registry.ts:18` | Removing `adrenalinePack` from the built-in registry does not extract the Adrenaline feature: its three blocks, parsers, renderers, export commands, settings, and SCSS remain statically compiled into Handbook. Conversely, the current data-only pack contract cannot load those executable features. | Define the intended boundary explicitly: make only game discovery/appearance optional now, while keeping trusted rendering support in core; design a separate trusted extension API only if code-size or third-party renderers must later become optional. | S |
| 🟢 | architecture | `src/settings/index.ts:99` | The settings UI still names Adrenaline explicitly instead of deriving a capability section from the installed pack. The hidden section is harmless when the pack is absent, but preserves a game-specific core dependency. | Gate the section on `findGamePack("adrenaline")`, or move feature controls to a core capability registry independent of pack presence. | S |

## Top actions

1. Adopt a directory package layout and contextual asset resolution (first finding).
2. Freeze the first extraction boundary as “optional declaration and appearance, trusted rendering remains in Handbook” (second finding).
3. Hide or capability-drive Adrenaline-specific settings when the pack is not installed (third finding).

## Coverage

- **Scanned**: architecture — dynamic game registry, custom-pack loader, asset resolution, block registry, settings, callout scope, SCSS entry point, and the purpose/layout of `schema-adrenaline`
- **Skipped**: runtime behavior, security and tests; they are outside this architecture-only audit

