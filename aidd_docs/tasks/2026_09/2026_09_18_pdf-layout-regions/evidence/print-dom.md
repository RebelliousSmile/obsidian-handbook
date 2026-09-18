# DOM d’impression observé

Mesuré le 2026-09-18 sur **Obsidian 1.13.7** (`ipcRenderer.sendSync('version')`), fenêtre Electron isolée, coffre jetable, plugin Handbook chargé. Instance de la boîte d’export capturée par `Modal.prototype.open` ; `print()` appelé sur un `div.print` détaché, `printToPdf()` appelé avec `filepath` et `open: false` : aucun dialogue natif, aucun fichier dans un coffre. Note : `tools/e2e/fixtures/layout-regions-print-probe.md`. Commande : `pnpm e2e:layout-regions -OutputDir <dossier> -PrintOnly`.

Le plugin ne traite pas encore l’export à ce stade : c’est le DOM natif d’Obsidian, non modifié.

## Verdicts

| Hypothèse | Verdict | Preuve |
| --- | --- | --- |
| Chaque bloc de premier niveau est enveloppé dans un `div` nu | **tenue** | `<div><h2 data-heading="Alpha" dir="auto">Alpha</h2></div><div><p dir="auto">Texte de la colonne alpha.</p></div>` ; `classes: ''`, un seul enfant. |
| `hr` reste direct | **tenue** | enfant 15 : `{tag: 'HR', childCount: 0}`. |
| Les commentaires HTML sont absents | **tenue** | 3 sections `html` (lignes 8, 34, 36) dans le cache ; aucun enfant correspondant. |
| Titre `h1` direct avec `includeName` | **tenue** | enfant 0 : `<h1 dir="auto">layout-regions-print-probe</h1>` (nom de fichier), avant tout `div` ; absent avec `includeName: false`. |
| Même ordre que `metadataCache.sections` | **tenue, avec deux corrections** | voir ci-dessous. |
| Section `yaml` | **réfutée comme exclusion** | présente : `<div class="mod-frontmatter mod-ui"><pre class="frontmatter language-yaml" style="display: none;">`, premier enfant (rang 0). Le plan la croyait à écarter. |
| Note à pied de page | **tenue** | une section `footnoteDefinition` ↔ un enfant `div > section.footnotes`, en fin. Le cache ajoute après elle deux entrées parasites (`text`, `element`, ligne 43) sans enfant : elles suivent la région, donc sans effet sur un préfixe. |
| Sans région, DOM inchangé | non mesuré ici (phase 3) | |
| Titre : `getSectionInfo` nul, conteneur `.print > .markdown-preview-view` | **tenue** | `hostClasses: "print"`, `viewClasses: "markdown-preview-view markdown-rendered show-properties"`. |

## Alignement mesuré (sans titre imprimé)

| Rang DOM | DOM | Section du cache |
| --- | --- | --- |
| 0 | `div.mod-frontmatter` | `yaml` 0-2 |
| 1 | `div > h1` | `heading` 4 |
| 2 | `div > p` | `paragraph` 6 |
| — | (rien) | `html` 8 (marqueur d’ouverture) |
| 3…14 | `div > h2` / `div > p` × 6 | `heading`/`paragraph` 10…32 |
| — | (rien) | `html` 34, `html` 36 |
| 15 | `hr` | `thematicBreak` 38 |
| 16 | `div > p` | `paragraph` 40 |
| 17 | `div > section.footnotes` | `footnoteDefinition` 42 |

## PDF réel de référence (sans changement du plugin)

`pypdf` sur `layout-regions-print-probe.pdf` (1 page A4) : les six titres `Alpha`…`Foxtrot` sont **tous à x = 32,0**, y de 154 à 564. C’est le défaut de l’issue #33, reproduit et mesuré. Cible de la phase 3 : trois abscisses, deux ordonnées.

## Règle de jointure (phase 2)

Les sections du cache, **privées des sections `html` réduites à des commentaires**, sont jointes par le rang aux enfants de premier niveau de `.print > .markdown-preview-view` **privés d’un `h1` direct de tête** ; une section `yaml` correspond à `div.mod-frontmatter` s’il ouvre la liste, sinon elle est retirée ; la garde exige la concordance de type (`heading`↔`H1-H6`, `thematicBreak`↔`HR`, `yaml`↔`mod-frontmatter`, sinon enveloppe `div`) sur tout le préfixe jusqu’à la fin de la dernière région, et laisse le DOM intact à la première divergence. Le plan tient : seul l’énoncé « exclure `yaml` » est corrigé.
