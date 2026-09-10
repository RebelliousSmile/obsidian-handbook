# Visual QA checkpoint

The visual recipe was stopped at the user's request on 2026-09-10. These are
development evidence, not release approval.

- `light-workspace-off.png`: first successful light rendering after fixing the
  startup layout race; it predates the last heading and block-flow refinements.
- `dark-workspace-off.png`: dark rendering after restoring content contrast,
  removing the duplicated heading markers and widening the code foreground.

The same fictional fixture is stored at
`tools/fixtures/adrenaline-visual.md`. Workspace-on and narrow viewport captures
remain outstanding; phase 5 intentionally remains `in-progress`.

The run also exposed an Obsidian startup state where `workspace.rootSplit` is
still null. Handbook now waits for `onLayoutReady` and defensively ignores
missing root/leaf documents. The temporary QA note, stable pack and Handbook
2.7 build were removed from the user's vault, whose 2.6 plugin files were
restored from backup.
