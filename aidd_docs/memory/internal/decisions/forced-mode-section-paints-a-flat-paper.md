# Une section au mode forcé peint un papier uni, la texture vient du pack

- Date: 2026-10-06
- Status: Accepted

## Context

`<!-- handbook-mode: alternate|dark|light -->` … `<!-- /handbook-mode -->` force la polarité
d'une section de note. Les couches d'un jeu sont liées à la classe de thème de
`body` : une section qui en contredit le thème ne reçoit aucune des variables de
l'autre couche. Reste le fond. La texture de page d'un pack est peinte sur la vue
entière (`.markdown-reading-view::before`) à partir d'un jeton propre à chaque
polarité (`--adrenaline-page-texture`), et le `background-image` du frontmatter
est peint sur la vue aussi : aucune des deux ne suit une section.

## Decision

Une section écrit la couche de sa polarité sur elle-même (`modeSectionBlock`,
`styleElement.ts`) et peint un **papier uni** : `background-color:
var(--background-primary)`. Une texture n'est dessinée que si le pack déclare
`--brumes-section-texture` (et `-size`) pour cette polarité ; Handbook ne nomme
jamais un jeton `--adrenaline-*`. Les illustrations par rôle sont neutres vis-à-vis
de la polarité et restent sur leurs composants. Le jeton de section se demande au
schéma, qui le publie avant que Handbook l'adopte.

## Alternatives

Déplacer la texture de la vue vers la section ferait dépendre le rendu d'un pseudo-
élément que le thème de la vue possède. Copier la texture du pack dans Handbook
romprait le flux inter-dépôts. Ne rien peindre laisserait le fond de la note
traverser la section.

## Consequences

Tant que le schéma ne publie pas le jeton, les sections sont unies : c'est un
dégradé voulu, pas un défaut. Les blocs Handbook d'une section portent la même
spécificité que la couche du corps sur `.brumes-block-scope` : seul l'ordre des
sources les départage, et `assert:style-scope` vérifie que les règles de section
viennent après. Hors `@media screen`, une couche sombre n'existe pas quand
`printerFriendly` est actif : la section n'a alors aucun effet à l'impression.
