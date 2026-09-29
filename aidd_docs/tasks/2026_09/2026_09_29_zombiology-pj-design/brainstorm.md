# Réaligner la fiche PJ Zombiology sur sa maquette, via le superviseur

Cadrage issu de la discussion du 29 septembre 2026. Ce document décrit l'intention retenue ; il ne constitue pas un plan d'implémentation.

Le rendu de la fiche PJ Zombiology dans Handbook reprend la structure de la maquette, mais pas son design. Une version HTML jugée satisfaisante avait été produite dans `schema-adrenaline`. Elle servait d'intermédiaire, parce que le LLM ne reprenait pas correctement les éléments depuis les images. Ce travail n'a pas été reporté entièrement dans ce que publie le schéma, et il est aujourd'hui dispersé entre des stashs, `tmp/` et une branche. Il faut le récupérer, le remettre en ordre dans le schéma, publier, puis le faire adopter par Handbook et par Lantern. Le superviseur pilote l'ensemble jusqu'à la présentation et au feu vert de l'utilisateur.

Le même train corrige un défaut : deux colonnes sont appliquées par défaut à toutes les notes du mode Adrenaline, alors qu'une balise existe déjà pour ouvrir et fermer une zone multi-colonnes.

## Ce qui est clair

- **Ce qui fait foi** : `C:/Users/fxgui/Documents/Perso/RPG/zombiology/_sources/Design/pj.jpg`, puis `pnj.jpg` et `monstre.jpg`. Les autres images du dossier servent de référence pour les éléments partagés.
- **La version HTML était visuellement satisfaisante.** C'est la base à récupérer et à transposer.
- **Le design passe par le schéma** : blocs, régions, jetons, assets et sémantique de présentation sont publiés par `schema-adrenaline`, puis adoptés par les consommateurs. Aucun repli local.
- **Premier périmètre : la fiche PJ seule**, rendue fidèlement dans Handbook **et** dans Lantern. PNJ et monstre viennent ensuite, en réutilisant les éléments visuels communs.
- **Une seule colonne par défaut**, corrigée dans ce même train. Le multi-colonnes ne s'applique qu'à l'intérieur d'une zone balisée.
- **Critère de fin** : la fiche PJ est fidèle à l'œil à `pj.jpg` dans les deux outils. Elle est montrée côte à côte lors de la présentation du superviseur, avant l'accord explicite de publication.
- **Nettoyage final, après validation explicite** : une fois le travail intégré, publié et adopté, on supprime les traces intermédiaires Zombiology de `schema-adrenaline` (stashs Zombiology, `tmp/zombiology-preview-backup-2026-09-25/`, branches fusionnées). La liste est présentée avant suppression.

## Ce qui reste ouvert

- `stash@{3}` (audit issue-21), `tmp/obsidian-handbook/`, `tmp/schema-adrenaline-2.6.0.tgz` et les branches distantes sont signalés, et ne sont pas supprimés sans avis.
- L'hypothèse « Handbook n'appelait pas la bonne version » est à confirmer ou à écarter.

## Prochaine étape

Faire l'inventaire des écarts entre le HTML récupéré et ce que publie v2.6.0, puis ouvrir le train du superviseur.
