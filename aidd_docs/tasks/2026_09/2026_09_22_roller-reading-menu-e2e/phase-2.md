---
status: in-progress
---

# Instruction: Make Windows Roller rendering assertions visibility-scoped

## Architecture projection

> Tree of the final files. ✅ create · ✏️ modify · ❌ delete

```txt
tools/e2e/roller-cdp.py                          ✏️ enter a fresh reading view, select visible Roller tables, and emit actionable timeout evidence
tools/assertRoller.harness.mts                   ✏️ guard the fresh reading-view transition in the focused assertion suite
```

## User Journey

```mermaid
flowchart TD
  A[Windows E2E opens roller.md] --> B[CDP forces source then reading mode]
  B --> C[CDP collects the two visible Roller tables under the active Markdown view]
  C --> D[Each table opens the scoped menu and copies only an allowed result]
  C --> E[If collection fails, screenshot and DOM/plugin state are written]
```

## Test Scope

```mermaid
---
title: Test scope
---
journey
  section Setup
    system: create the disposable vault with Handbook, Dice Roller, and two authored tables => plugins and fixture are loaded: 5: Windows CDP
  section Happy path
    system: enter a fresh reading view and target visible Roller tables under the active Markdown view => exactly two authored tables are right-clicked and each copies one of its own results: 5: Windows CDP
  section Edge case - retained duplicate nodes
    system: retain non-visible duplicate Roller DOM nodes => the visible-table selector still targets the two authored tables: 5: Windows CDP
  section Edge case - render timeout
    system: fail to obtain two visible tables => screenshot plus plugin, active-file, preview, and table-count diagnostics are reported: 5: Windows CDP
  section Teardown
    system: unload Dice Roller and remove the disposable vault/profile => clipboard and source note remain unchanged: 5: Windows CDP
```

## Tasks to do

### `1)` Scope CDP selection to active visible tables

> Replace the invalid global `.brumes-roller--table` equality assertion with a helper that returns tables visible under the active reading view.

1. Force a source-to-reading transition after closing first-run modals.
2. Derive the active Markdown view root from the current leaf, then use one shared non-zero-rectangle table selector below that root for readiness and right-click coordinates.
3. Require two scoped visible tables, while retaining global, scoped, and visible counts in timeout diagnostics.

### `2)` Preserve focused regression coverage

> Keep the lightweight Roller assertion aware of the required fresh reading-view transition.

1. Assert the CDP journey performs the source-to-reading transition.
2. Run the focused assertion, full repository checks, and the Windows Roller journey against the built plugin.

## Test acceptance criteria

| Task | Acceptance criteria |
| --- | --- |
| 1 | On Obsidian 1.13.7, four total matching nodes with two visible authored tables under the active Markdown view no longer cause a timeout. |
| 1 | A failed render reports a screenshot and enough state to distinguish missing plugins, wrong active file, hidden tables, and a modal. |
| 2 | The focused Roller assertion, full check suite, and disposable Windows Roller journey all pass. |
