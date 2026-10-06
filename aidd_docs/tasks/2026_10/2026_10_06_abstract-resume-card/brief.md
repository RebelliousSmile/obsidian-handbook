---
status: pending
---

# Abstract callout as the printed "Résumé" card (Adrenaline)

Decided 2026-10-06: in dark mode the `abstract` callout matches the book's
"Résumé" card; in light mode only the colours flip, normally.

## Target (dark)

Dotted yellow border, rounded corners, a tab label "RÉSUMÉ" on the top edge,
large display title, yellow bold labels. The yellow of labels, list markers and
italics is wanted by the pack (confirmed by the user): nothing to change there.

## Flow (cross-repo contract)

1. `schema-adrenaline`: publish the card tokens (border style/colour/radius, tab
   label colours, label ink) in `pack.style.{light,dark}.note`, next release.
2. Handbook: adopt the release, write only the structure in
   `src/styles/adrenaline/_callouts.scss` (no local `--adrenaline-*` colours).
3. Not in scope: turning the Action/Exploration ratings into stars (content).

## Blocker

`schema-adrenaline` has an uncommitted edit in `handbook/adrenaline/pack.json`
(`--adrenaline-note-surface` dark `#2B1A16` → `#3D3636`). Not mine: needs the
user's word before it is folded into the next commit.
