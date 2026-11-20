# Mesures de la phase 1 (2026-11-20)

## Impression native (tâche 2)

Dans Lantern en local (Vite, port 5199), pilotée par Playwright : la fiche est clonée dans un `<div id="print-root">` posé sous `body`, tout le reste de `body` est masqué sous `@media print`, et chaque page porte `page: <nom>` avec `@page <nom> { size: <L>px <H>px; margin: 0 }`.

| Cas | Résultat |
| --- | -------- |
| Isoler l'application en place (`visibility`, positionnement absolu) | Échec : pages blanches, barre latérale qui fuit, décalages |
| Racine d'impression au niveau de `body`, `@page` nommées | Page à la taille exacte du nœud (Adrenaline PJ : 632 × 1277 px = 474 × 958 pt, 1 page), 2 273 caractères de texte sélectionnable, polices et fonds conservés avec `print-color-adjust: exact` |
| Faces Masques | Une page par face, à la taille de la face |

Réserves : l'utilisateur doit cocher « Graphiques d'arrière-plan » dans le dialogue du navigateur si le navigateur ne l'applique pas seul ; la section « Identité » repliée n'est pas imprimée (à déplier ou à ouvrir avant l'impression, à traiter en phase 4) ; aucune page blanche n'est un critère d'acceptation.

## Archive sans dépendance (tâche 3)

Archive « stored » écrite à la main (table CRC32, en-tête local, répertoire central, fin de répertoire, drapeau UTF-8 `0x0800`). Relue sans erreur par Python `zipfile` et par `Expand-Archive` de PowerShell ; sommes md5 des fichiers extraits égales aux sources. Aucune bibliothèque nécessaire.

## Capacité d'une page de notes (tâche 4)

Méthode : un bloc `white-space: pre-wrap`, `overflow: hidden`, marge de 24 px, interligne 1,4 ; recherche dichotomique du plus grand texte dont la hauteur ne déborde pas. « Paragraphes » = phrases françaises ordinaires ; « lignes courtes » = un caractère par ligne (pire cas de hauteur).

Police réelle d'Adrenaline (`Adrenaline Body`, 12 px) :

| Page | Paragraphes (caractères) | Lignes courtes |
| ---- | ------------------------ | -------------- |
| 632 × 1123 (largeur de la fiche PJ, hauteur A4) | 8 527 | 64 |
| 794 × 1123 (A4) | 10 673 | 64 |

Serif générique (Georgia) pour les deux autres paquets, dont les polices sont publiées par leurs packs :

| Taille | A4 794 × 1123 | Letter 816 × 1056 | Face 904 × 903 |
| ------ | ------------- | ----------------- | -------------- |
| 12 px | 9 236 / 64 | 8 875 / 60 | 8 328 / 50 |
| 14 px | 6 591 / 54 | 6 364 / 51 | 5 972 / 43 |
| 16 px | 5 049 / 48 | 4 995 / 45 | 4 642 / 38 |

(paragraphes / lignes courtes)

Valeurs retenues pour le `maxLength` du contrat (page la plus étroite du paquet, corps 14 px, marge de sécurité) :

| Paquet | `maxLength` | Lignes courtes tenant sur la page |
| ------ | ----------- | --------------------------------- |
| `schema-adrenaline` (`notesDePartie`) | 6 000 | 51 |
| `schema-in-the-mist` (`sessionNotes`, Otherscape Letter) | 6 000 | 51 |
| `schema-pbta` (`sessionNotes`, livrets Letter / A4) | 6 000 | 51 |

Le plafond de caractères ne suffit pas (une page tient 6 000 caractères de prose, mais seulement 51 lignes courtes : 51 caractères suffisent à la remplir) : le refus de saisie se fait aussi sur la **hauteur rendue** (décision du plan). La phase 3 reconfirme la valeur avec la police publiée de chaque pack ; elle ne la recopie que dans le contrat.
