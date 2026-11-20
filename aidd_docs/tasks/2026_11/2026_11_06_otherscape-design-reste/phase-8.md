---
status: done
---

# Instruction: Otherscape — typographie du livre, texte justifié et saut de colonne

> Demande du 2026-11-07 : « la typographie n'est pas identique » (Cyber Entities p. 33 face à la page de test Metro), puis « comment faire cette présentation ? » (Life in the Megacity p. 24). Elle se joue **avant** le train (phase 7), qui embarque son résultat.

## Référence de rendu

Polices embarquées, relevées avec PyMuPDF dans `1. Metro-Otherscape_Core_Book.pdf` (p. 24 et 33), `2. Neuro_Otherscape_Setting_Book.pdf` et `Cairo/Cairo_Otherscape_Setting_Book.pdf`. Les trois livres partagent la même typographie :

| Rôle | Police du livre | Corps | Licence | Ce que publie le pack |
| ---- | --------------- | ----- | ------- | --------------------- |
| Texte courant | Isotonic Rg / RgIt / Bd | 10,5 pt | commerciale | `local()` d'abord, puis un sosie OFL |
| Intertitre (H2 en étiquette) | Isotonic Bd | 14 pt | commerciale | idem |
| Tag en ligne | Isotonic MdIt | 9,5 pt | commerciale | idem |
| Chapeau | PP Fraktion Sans Medium | 15,5 pt | commerciale | `local()` d'abord, puis un sosie OFL |
| Read-aloud | PP Fraktion Mono Regular | 9 pt | commerciale | `local()` d'abord, puis un sosie OFL |
| Titre H1 | NeoTokyo Regular | 33 pt | commerciale | `local()` d'abord, puis Fira Sans Extra Condensed 800 (déjà publiée) |
| Encart, renvoi | IBM Plex Sans Condensed | 10 pt | OFL | la police elle-même |
| Liste numérotée | Barlow Condensed Light | 10 pt | OFL | la police elle-même |

Mise en page : texte courant et read-aloud justifiés avec césure. Points de contrôle : (1) p. 33 « Cyber Entities » ; (2) p. 24 « Life in the Megacity », H1 et chapeau à gauche, texte à droite ; (3) une page de renvoi en IBM Plex Sans Condensed.

## Architecture projection

```txt
schema-in-the-mist/
├── handbook/otherscape/assets/styles/fonts/*.woff2      ✅ sosies OFL et faces OFL du livre (latin)
├── handbook/otherscape/assets/styles/fonts.css          ✏️ @font-face des nouvelles faces
├── handbook/LICENSES/*.LICENSE.txt                      ✅ notices OFL des faces ajoutées
├── handbook/README.md                                   ✏️ Otherscape sort du contrat à deux faces
├── schemas/otherscape/design/tokens.json                ✏️ piles `local` + sosie par rôle, tailles du livre
├── tools/build-otherscape-handbook-design.ts            ✏️ justification, césure, tailles relatives
├── tools/validate-package.ts                            ✏️ liste des faces Otherscape publiées
└── handbook/otherscape/pack.json, assets/styles/otherscape.css  ✏️ régénérés
obsidian-handbook/
├── src/features/layoutRegions/parser.ts, postProcessor.ts, printProcessor.ts, sectionMapper.ts  ✏️ marqueur `<!-- handbook-layout: break -->`
├── src/styles/_layout-regions.scss                      ✏️ `break-before: column`
├── tools/<harnais layout>                               ✏️ le saut de colonne en rendu et à l'impression
└── coffre Otherscape/Handbook - Test page Metro.md      ✏️ section « Life in the Megacity »
```

## Tasks to do

### `1)` Choisir les sosies

1. Planche comparative : le même paragraphe du livre (capture PDF) face à chaque candidat OFL, pour Isotonic, PP Fraktion Sans et PP Fraktion Mono.
2. **Verdict de l'utilisateur** sur la planche ; rien n'est publié avant.

### `2)` Pack

1. WOFF2 latin des faces retenues, et notices OFL.
2. Piles par rôle : nom local du livre, sosie, générique. Encarts en IBM Plex Sans Condensed, listes en Barlow Condensed Light.
3. Justification et césure du texte courant et du read-aloud ; tailles relatives au corps de 10,5 pt (intertitre 1,33em, chapeau 1,48em, H1 3,14em, read-aloud 0,86em).
4. Lever le contrat à deux faces pour Otherscape dans `validate-package.ts` et dans le README.

### `3)` Saut de colonne (Handbook)

1. `<!-- handbook-layout: break -->` dans une région : le bloc suivant ouvre la colonne suivante, à l'écran et à l'export PDF ; hors région, le marqueur est ignoré.
2. Harnais, puis section « Life in the Megacity » dans la page de test.

## Test acceptance criteria

| Task | Acceptance criteria |
| ---- | ------------------- |
| 1 | L'utilisateur a retenu un sosie par police commerciale. |
| 2 | Avec les polices du livre installées, le rendu les prend ; sans elles, il prend les sosies publiés. Texte et read-aloud justifiés. `npm run check` du schéma est vert. |
| 3 | Life in the Megacity : H1 et chapeau à gauche, texte à droite, à l'écran et en PDF. `rtk proxy pnpm build`, les deux lints et `pnpm check` sont verts. |

## Decisions

| Decision | Why |
| -------- | --- |
| Piles « police locale du livre, puis sosie OFL publié » (choix de l'utilisateur, 2026-11-07). | Le pack est public : il ne peut pas redistribuer Isotonic, PP Fraktion ni NeoTokyo. |
| Otherscape sort du contrat « deux faces OFL » du README et de `validate-package.ts`. | Le livre utilise sept familles ; deux faces ne peuvent pas le rendre. Les faces publiées restent toutes sous OFL. |
| Ajouter le saut de colonne, le texte justifié et les proportions du livre (choix de l'utilisateur, 2026-11-07). | La mise en page de la p. 24 ne s'obtient pas avec des colonnes qui s'équilibrent seules. |
| Sosies retenus : Sofia Sans Semi Condensed (Isotonic), Familjen Grotesk (PP Fraktion Sans), Space Mono (PP Fraktion Mono) (verdict de l'utilisateur, 2026-11-08). | Planches comparatives de la tâche 1. |
| IBM Plex Sans Condensed est publiée entière, sans sous-ensemble. | « Plex » est un Reserved Font Name : un sous-ensemble est une version modifiée, qui devrait changer de nom. |
| Le plafond de l'archive du schéma augmente exactement de la taille des faces ajoutées, lue sur les fichiers (`validate-package.ts`). | Le WOFF2 ne se compresse plus ; le reste du paquet garde le plafond audité. |
| Le H1 est en `font-synthesis-weight: none`. | NeoTokyo n'a qu'une face Regular : sans cela, le H1 en 900 serait un faux gras. |
| Le Cairo garde l'échelle de titres qu'il a mesurée ; Metro et Tokyo prennent celle du livre de base (`font.size.book`). | Les tailles du livre viennent du livre de base. |
| Le saut de colonne est un marqueur `<!-- handbook-layout: break -->` commun à tous les jeux, pas une règle Otherscape. | Les régions de mise en page sont transversales : Zombiology et les autres jeux l'ont aussi (question de l'utilisateur, 2026-11-07). |
| Un saut sans contenu d'un côté, ou hors région, est ignoré et signalé (`empty-break`, `orphan-break`) ; des sauts répétés comptent pour un. | Il ouvrirait une colonne vide. |

## Constats

- Tâche 3 faite dans `os-reste/obsidian-handbook` :
  - le parseur porte `breaks` par région ;
  - la classe `handbook-layout-break` (`break-before: column`) est posée à l'écran par les numéros de ligne, et dans le PDF par le rang ;
  - `assert:layout-regions` couvre le saut ;
  - build et lints sont verts ;
  - la section « Life in the Megacity » est ajoutée à la page de test, et le build est déployé dans le coffre Otherscape.
- Tâche 1 faite : verdict de l'utilisateur le 2026-11-08.
- Tâche 2 faite dans `os-reste/schema-in-the-mist` :
  - dix faces WOFF2 et cinq notices OFL ;
  - piles par rôle dans `tokens.json` ;
  - H1, intertitre, chapeau, read-aloud, encarts et listes branchés dans le générateur ;
  - texte justifié avec césure ;
  - `validate-handbook-packs.ts`, `validate-package.ts` et le README tiennent l'exception ;
  - `npm run check` et `validate:package` sont verts.
