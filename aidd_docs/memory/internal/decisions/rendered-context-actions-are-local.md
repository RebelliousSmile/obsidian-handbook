# Attacher une action contextuelle au nœud rendu cliqué

- Date: 2026-09-22
- Status: Accepted

## Context

Une action Roller déclenchée depuis `editor-menu` réutilisait la dernière table
rendue mémorisée globalement. Après l'affichage de plusieurs tables, le menu ne
pouvait donc pas prouver quelle table fournissait le résultat. Ce risque est
particulièrement coûteux pour les oracles : un résultat valable, mais issu de
la mauvaise table, paraît correct à l'utilisateur.

## Decision

Une action contextuelle qui opère sur du Markdown rendu reçoit directement le
nœud et les données parsées du nœud cliqué. Le menu est ouvert depuis son
événement `contextmenu`; il ne dépend pas d'un contexte global mémorisé par le
renderer ou par le menu de l'éditeur.

## Alternatives

Conserver une référence globale à la dernière table rendue reste ambigu dès
que plusieurs tables sont visibles. Ajouter une durée de validité réduit le
hasard sans établir le lien avec le clic. Réutiliser `editor-menu` convient aux
opérations qui dépendent du curseur de l'éditeur, pas à une table de lecture.

## Consequences

Les renderers qui ajoutent une action de contenu doivent attacher l'événement
au nœud rendu et conserver la donnée parsée dans cette fermeture. Les harnesses
doivent couvrir au moins deux nœuds distincts, et un parcours Obsidian réel
doit vérifier que chaque résultat copié appartient au nœud cliqué.
