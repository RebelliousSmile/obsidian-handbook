# Regrouper l'export PDF par rang, sur un DOM d'impression mesuré

- Date: 2026-09-18
- Status: Accepted

## Context

L'export PDF natif d'Obsidian (1.13.7) ne rend pas le DOM de la lecture :
un `div` nu par bloc, aucun commentaire HTML, aucun `el-hN`, et
`getSectionInfo` renvoie `null`. Les marqueurs `handbook-layout` et les lignes
sources, dont le regroupement de la vue lecture dépend, n'y existent plus
(issue #33). Ce DOM n'est pas documenté : il ne se lit qu'en le capturant.

## Decision

Le regroupement d'impression joint les sections de `metadataCache` (privées des
sections `html` réduites à des commentaires) aux enfants de premier niveau du
conteneur `.print > .markdown-preview-view` (privés d'un `h1` direct de tête),
par rang. Il n'agit que si tous les blocs jusqu'à la fin de la dernière région
concordent de type ; à la première divergence, le DOM reste intact et un
`warnOnce` le signale.

Révision du 2026-10-04 : les blocs ne sont plus déplacés ni enveloppés. Ceux
d'une région à plus d'une colonne reçoivent `handbook-layout-flow`, le conteneur
`handbook-layout-flowing` et `--handbook-layout-columns` ; le texte coule en
colonnes CSS (`columns`), de haut en bas puis colonne suivante, et tout bloc hors
région s'étend sur toute la largeur (`column-span: all`). La jointure par rang
et sa garde de types sont inchangées. La lecture fait de même ; comme Obsidian
n'y dessine que les sections proches de la fenêtre et les place d'après une pile
unique, une note qui coule garde toutes ses sections dessinées
(`renderWindow.ts`, sur un interne vérifié avant usage : s'il manque, la note
reste sur une colonne). Une note n'a qu'un nombre de colonnes : la première
région multicolonne le fixe.

## Alternatives

Réparer la lecture d'un marqueur dans le DOM imprimé est impossible : les
commentaires n'y sont pas. Deviner le regroupement par le seul texte des titres
casse dès qu'une note répète un titre. Un plugin d'export tiers construit un
autre DOM : hors périmètre. Regrouper sans garde de types produirait des
colonnes fausses sans le dire ; le repli sur l'export natif est préférable.

## Consequences

Le regroupement dépend d'un DOM privé d'Obsidian : une version future peut le
changer, la garde le détecte alors et rend l'export natif, sans colonnes.
Toute évolution du DOM se mesure avec `pnpm e2e:layout-regions -PrintOnly`
(DOM et PDF lus par `pypdf`), jamais à l'œil ; les mesures de référence sont
dans `aidd_docs/tasks/2026_09/2026_09_18_pdf-layout-regions/evidence/print-dom.md`.
La section `yaml` correspond à `div.mod-frontmatter` quand les propriétés sont
affichées, sinon elle est retirée de la jointure. Un encadré, une table ou un
bloc de code n'est pas coupé entre deux colonnes (`break-inside: avoid`).
