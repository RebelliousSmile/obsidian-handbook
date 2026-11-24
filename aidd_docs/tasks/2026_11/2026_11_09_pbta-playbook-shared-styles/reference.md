# Référence de rendu — playbooks Monsterhearts et Urban Shadows

Le PDF d'origine fait foi (décision (a) du brainstorm). Les images sont dans `reference/`. Elles sont ignorées par git, parce que les PDF achetés portent le filigrane de commande :

- `mh-selkie-{1,2}.png` : La Selkie, VF, `Perso/RPG/monsterhearts/_sources/mues/Monsterhearts_mues_Selkie.pdf` ;
- `us-aware-{web,print}-{01,02}.png` : The Aware, `US-Playbooks-web20241126.pdf` et `US-Playbooks-PrinterFriendly-20250325.pdf` ;
- `regions/<jeu>-<région>.png` : un recadrage par région ;
- `handbook-<jeu>-1400.png` et `handbook-<jeu>.html` : rendu actuel du bloc dans Obsidian. Handbook v2.48.1 et le pack schema-pbta installé, avec l'exemple `schema-pbta/examples/<jeu>/…`, capturés en 1400 px de fenêtre.

Les exemples du paquet sont réduits (2 actions pour La Selkie, en « tu »). Le relevé porte donc sur la forme, pas sur le texte.

## Monsterhearts — La Selkie

Page entière (PDF) :

- format paysage, deux pages en 3 colonnes, papier blanc, sans filet de colonne ;
- page 1 : texte à gauche, portrait au centre, « Jouer » à droite ;
- page 2 : actions, identité et caractéristiques, actions (suite) et progressions ;
- grand coquillage gris clair en filigrane derrière la page 2 (illustration, hors CSS) ;
- polices : titres en capitales fines décoratives (El Messiri ou Yellow Magician du pack), corps en serif (Averia Serif Libre ou Alice), ouverture en italique calligraphique (IM Fell Double Pica), nom de la mue en script.

Handbook actuel : une seule grille en deux rangées de 3 colonnes. Chaque section porte un filet supérieur, que le PDF n'a pas.

| Région | PDF | Handbook actuel |
| --- | --- | --- |
| game-identity | Aucune : pas de marque de jeu sur la mue | Absente de l'exemple. On garde le rendu actuel. |
| monsterhearts-opening | Italique calligraphique, ≈ 1,1 × corps, aligné à gauche, sans encadré | Italique calligraphique à ≈ 0,85 × corps, trop petit. |
| monsterhearts-darkest-self | Titre « DÉMON INTÉRIEUR » en capitales fines ≈ 1,4 × corps ; corps serif ; **aucun encadré** | Titre conforme (il porte le nom de l'action). Corps conforme. Sans encadré : conforme. |
| monsterhearts-sex-move | Même forme : titre « ACTION SEXUELLE », corps serif, sans encadré | Conforme (le titre porte le texte de l'action). |
| playbook-portrait | Illustration pleine colonne ; nom « La Selkie » en script calligraphique ≈ 3 × corps, centré en bas | Cadre pointillé gris. Nom en capitales espacées sans script : **écart** de police (script attendu). |
| monsterhearts-play | Titre « JOUER LA SELKIE » centré, ornement coquillage dessous, corps serif justifié ≈ 0,9 × corps | Titre centré conforme. Pas d'ornement (illustration, rôle absent toléré). Corps aligné à gauche au lieu de justifié. |
| playbook-moves | Puce coquillage (pleine = cochée d'office, vide = au choix) ; nom en **sans-serif gras** ≈ 1,05 × corps ; corps serif sans retrait ; options en puce ✶ en retrait ; ni carte, ni filet | Case à cocher carrée. Nom en serif gras. Corps en retrait de ≈ 1,6 em. Filet entre les actions. **Trois écarts** : puce, police du nom, retrait et filet. |
| character-identity | Titre « IDENTITÉ » ; libellés NOM, APPARENCE, REGARD, ORIGINE en capitales grasses suivis des choix, sur 2 colonnes | Libellés en petites capitales, suivis d'une ligne à remplir, sur 1 colonne. Écart de casse et de graisse. La ligne à remplir est gardée : c'est une fiche, et les choix ne sont pas dans le contrat. |
| stat-profiles | Petites capitales à la taille du corps ; 2 profils côte à côte ; valeurs alignées à droite | Petites capitales à ≈ 0,7 × corps, trop petites. Libellés anglais (HOT, COLD…), qui viennent des données et non du CSS. Un seul profil. |
| harm-tracker | « DÉGÂTS » suivi de 4 cases carrées en ligne, au corps du titre | Absent de l'exemple. Cible : 4 cases en ligne après le titre. |
| monsterhearts-progression | « PROGRESSIONS » suivi de 5 cases en ligne ; liste à petites cases ≈ 0,7 × corps, sans retrait | Titre « Avancées » en serif gras. Grandes cases ≈ 1,2 em en retrait de 3 em. Les 5 cases d'XP manquent. **Écart.** |
| ascendants-and-conditions | Titre centré ; **encadré** à trait fin noir ≈ 1 px ; zone vide d'écriture | Ni encadré ni zone : texte « 1 au départ · 5 maximum ». **Écart.** |
| gear | Aucune sur la mue | Absente de l'exemple. On garde le rendu actuel. |
| (titres de section) | Capitales fines décoratives, ≈ 1,4 × corps, **sans filet** | Capitales fines conformes, mais un filet supérieur noir de 1 px sur chaque section : **écart**. |

Lantern (lantern#76, constaté au verdict précédent) : pas de typographie d'affichage, titres en capitales système, ni cartes, ni cases de caractéristiques, ni liste d'apparence.

Une correction au passage : lantern#76 prend pour référence l'aperçu statique du pack (encart du démon intérieur, cartes d'action bordées, nom latéral). **Le PDF n'a aucun de ces trois éléments.** La cible ci-dessous suit le PDF, pas l'aperçu.

### Points de contrôle Monsterhearts

1. **Actions** : puce coquillage pleine ou vide (repli : ● ou ○), nom en sans-serif gras, corps sans retrait, aucun filet ni carte.
2. **Caractéristiques, dégâts, progressions** : profils en petites capitales à la taille du corps, sur 2 colonnes ; « DÉGÂTS » et « PROGRESSIONS » suivis de leurs cases en ligne ; liste de progression à petites cases.
3. **Habillage des sections** : titres en capitales fines sans filet, encadré fin d'« Ascendants & conditions », nom de la mue en script sous le portrait.

## Urban Shadows — The Aware

Page entière (PDF) :

- format portrait, deux faces, colonnes sans filet ;
- version web : bandeau violet et photo en haut ; version imprimable : sans bandeau ni photo, même géométrie. conformément au plan, **l'écran suit la version web** (bandes violettes au pinceau rendues par un aplat violet derrière stats, cercles et blessures ; boîte d'intimité violette ; bande sombre de corruption ; ni photo ni bandeau, qui sont des illustrations) et **l'impression suit la version imprimable** (mêmes formes sans aplat). Violet mesuré sur « AWARE MOVES » : `#682866` ;
- polices : titres d'affichage condensés gras en capitales (BLOOD, MORTALIS…), titres de section script au pinceau (Stats, Circles, Harm), corps sans-serif condensé ≈ 9 pt, mots-clés en gras violet (HEART).

Handbook actuel : 3 colonnes à filets violets supérieurs, titres condensés (Oswald-like), corps sans-serif non condensé.

| Région | PDF | Handbook actuel |
| --- | --- | --- |
| game-identity | Titre « THE AWARE » en image ; accroche en italique à droite ; marque URBAN SHADOWS | Titre condensé gras ≈ 2,2 × corps avec filet violet, puis accroche. Conforme dans l'esprit : le titre-image n'est pas reproductible. |
| urban-shadows-opening | Accroche italique, ≈ 0,9 × corps, en haut à droite | Italique à gauche, dans la première colonne. Conforme (placement imposé par la grille). |
| character-identity | NAME/PRONOUNS dans une **boîte** à trait violet ; DEMEANOR et LOOK en capitales grasses sur une ligne | Trois libellés en petites capitales sur une ligne grise, sans boîte. **Écart** : boîte NAME/PRONOUNS. |
| urban-shadows-stats | Titre script ; aplat violet (web) derrière 4 **losanges** blancs à trait noir ≈ 2,5 em ; libellés en capitales condensées grasses dessous | Losanges ≈ 1,6 em, valeur dedans, libellés en petites capitales fines. Écart de taille et de graisse des libellés. Ligne « Blood 0, Heart 1… » en trop (elle vient des données). |
| urban-shadows-circles | Aplat violet (web) derrière 4 **cercles** blancs ≈ 2,5 em ; libellés condensés gras ; 3 pips liés « STATUS » sous chacun | Cercles ≈ 1,6 em et pips présents. Libellés en petites capitales. Le mot « STATUS » manque. Écart de taille. |
| playbook-moves | Titre de section en capitales violet ≈ 1,6 × corps ; chaque action : case ☐ **en ligne** devant le nom en capitales grasses ; corps condensé sans retrait ; mots-clés gras | Case à gauche, nom condensé, corps en retrait de 1,6 em, taille ≈ 0,85 × corps. **Écart** : retrait, casse et graisse du nom. |
| urban-shadows-advancement | « ADVANCEMENT » violet centré ; croix des 4 cercles en cases ; 2 listes à cases alignées (gauche alignée à droite, case après le texte) | Cases des cercles en 2 × 2 et liste unique, case avant le texte. Écart de disposition, toléré (la croix est une illustration). |
| harm-tracker | Titre script « Harm » ; ARMOR et sa case à droite ; FAINT (1 case), SERIOUS (2), CRITICAL (2) en capitales fines sur des **lignes** | Conforme : cases 1/2/2, filets, PROTECTION à droite. |
| urban-shadows-scars | « SCARS » condensé gras ; 4 cicatrices à case, sur 2 colonnes | 1 case par cicatrice, en une colonne (l'exemple n'en a qu'une). Conforme. |
| urban-shadows-let-it-out | Titre script « Let it out » ; liste à puces sur 2 colonnes **dans une boîte** à trait noir | Liste à losanges sur 1 colonne, sans boîte. **Écart** : boîte. |
| urban-shadows-end-move | « END MOVE » violet en capitales ; corps condensé | Titre condensé noir. Écart de couleur. |
| urban-shadows-creation | Colonne gauche sur **fond grisé** ; titres en capitales violettes ; listes compactes | Absente de l'exemple. Cible : fond gris clair, titres violets. |
| urban-shadows-debts | Pas de région « dettes » sur la fiche (Starting Debts en création) | Lignes vides. On garde le rendu actuel. |
| urban-shadows-mortal-relationships | « YOUR MORTAL RELATIONSHIPS » violet ≈ 1,8 × corps ; liste à **cases** ☐ | Liste à losanges violets, nom en gras. Écart : case au lieu de losange. |
| urban-shadows-extras | « YOUR KIT » violet ; texte | Encadrés à trait noir. Écart léger (le PDF n'encadre pas le kit). |
| urban-shadows-intimacy | **Boîte violette pleine**, texte blanc | Texte simple sous filet. **Écart.** |
| gear | « GEAR & NOTES » : **boîte** à trait violet, zone vide | Absente de l'exemple. Cible : boîte à trait violet. |
| urban-shadows-corruption | **Bande sombre**, titre script, 5 cases blanches, TRIGGER en gras ; actions de corruption en colonnes | Titre condensé, 5 cases, déclencheur, listes. Pas de bande sombre. Écart : bande. À l'impression, garder un fond clair, avec un trait seul. |
| urban-shadows-play | Aucune sur la fiche | Texte simple. On garde le rendu actuel. |

Lantern : la copie `urbanShadowsPlaybookTheme.css` reprend le rendu Handbook. Aucun écart propre n'est connu.

### Points de contrôle Urban Shadows

1. **En-tête de face** : boîte NAME/PRONOUNS, DEMEANOR et LOOK sur ligne, titre d'affichage.
2. **Stats et cercles** : losanges et cercles blancs agrandis (≈ 2,5 em) sur aplat violet à l'écran, sans aplat à l'impression, libellés en capitales condensées grasses, pips « STATUS ».
3. **Actions** : case en ligne devant le nom en capitales grasses, corps sans retrait, mots-clés en gras violet ; plus la boîte « Let it out ».

## Verdict

**Non rendu.** Le 2026-11-09, l'utilisateur a lancé le train sans verdict sur les six points de contrôle : « on est obligé de lancer le train avant de faire les dernières corrections ». Livré : schema-pbta v14.0.0, Lantern v0.32.0, Handbook v2.49.0.

Retours de rendu traités pendant la phase 5 :
- Monsterhearts : caractéristiques nommées dans la langue de l'interface (Lantern).
- Urban Shadows : cases des cercles sur une ligne ; cercles cochés par `markedCircles` (contrat v14) sans être retirés de la piste, dans Lantern (éditeur et aperçu) et dans Handbook (lecture seule).
Restent à faire dans un train suivant : les dernières corrections de rendu annoncées par l'utilisateur, le verdict par jeu et par outil, et l'export PDF de La Selkie sur papier blanc (non joué).

## Écarts relevés au verdict du train `pbta-playbook-render-fixes` (2026-11-24)

Plan : `aidd_docs/tasks/2026_11/2026_11_24_pbta-playbook-render-fixes/`. Captures du rendu courant dans `reference/current/` (Handbook, Lantern). Liste ouverte : elle se complète au fil du verdict de l'utilisateur.

| # | Jeu | Région | Écart | Origine |
| --- | --- | --- | --- | --- |
| 1 | Monsterhearts | playbook-portrait | Le nom de la mue est collé au cadre du portrait (`margin-top: 0.2rem` dans `.handbook-monsterhearts-portrait-name`). | Utilisateur |
| 2 | Monsterhearts | playbook-portrait | Police du nom : `IM Fell Double Pica` en italique, et non le script décoratif du PDF. À trancher : choix de police. | Constat (déjà noté en phase 1 du train précédent) |
| 3 | outillage | `tools/e2e/playbook-capture-cdp.py` | La capture d'Urban Shadows échoue par intermittence (« Cannot take screenshot with 0 width ») : la boîte est mesurée avant la mise en page. | Constat |
| 4 | Urban Shadows | toutes | Fiche tantôt en français, tantôt en anglais (dans Lantern, les textes anglais viennent du modèle et de l'exemple codés en dur : `src/templates/urban-shadows/playbook/model.ts` « Introduce this playbook. », « Playing the playbook », « Choose your place in the city. », « Grow through the city. » ; `sample.ts` « Add 1 to one of them. », « Your route ») : les libellés viennent des locales et du contrat (français), le contenu d'exemple `the-aware.toml` est en anglais. À trancher : tout en français, ou affichage selon la langue de l'interface. | Utilisateur |
| 5 | Monsterhearts, Urban Shadows | verso | Un verso de la feuille portant les notes de partie, comme le verso de la fiche Adrenaline PJ (section d'identité du verso, plus de page de notes séparée, pages recto / verso seulement). | Utilisateur |
| 6 | Lantern (Urban Shadows, Monsterhearts, Sprawl) | éditeur de listes | Les fabriques de descripteurs `scalar` / `object` / `list` / `strings` / `records` sont recopiées dans `UrbanShadowsPlaybookEditorPanel.tsx`, `MonsterheartsPlaybookEditorPanel.tsx` (identiques) et `SprawlPlaybookEditorPanel.tsx` (variante) ; le libellé d'item est le générique « Élément ». À factoriser dans `src/templates/pbta/specialized/` ; libellé d'item à nommer par liste. | Utilisateur (question « DRY ? ») |
| 7 | Urban Shadows | libellés de région | Handbook et Lantern n'ont pas les mêmes libellés français pour la même région : Handbook « Blessures / Séquelles / Lâcher la Bête / Ultime action / Actions d'archétype » (locale `fr.ts`), Lantern « Dégâts / Cicatrices / Laisse sortir / Mouvement final / Mouvements d'archétype » (contrat schema-pbta). Les exemples mêlent aussi français et anglais dans une même fiche. Une seule source : le contrat porte `{ fr, en }`, comme les pages d'Adrenaline. | Constat (captures du 2026-11-24) |
| 8 | Urban Shadows (et Monsterhearts pour les lignes de l'identité) | en-tête, `character-identity` | « Nom (pronoms) », « Attitude » (demeanor) et « Apparence » (look) sont des lignes à remplir (`<Fill />` dans `UrbanShadowsPlaybookPreview.tsx`) : le contrat n'a aucun champ pour elles, l'éditeur de Lantern ne peut donc pas les modifier ni les exporter en TOML. Précédent : The Sprawl publie `characterName` (« Name written on the sheet by the player »). À ajouter au schéma (champs facultatifs, ajout compatible), puis à lire dans Lantern et Handbook. | Utilisateur (2026-11-24) |
| 9 | Urban Shadows | `stat-spread`, `circle-status` (titres et étiquettes) | Police jugée incorrecte par l'utilisateur (2026-11-24, sur la capture Obsidian). Mesure face au PDF : (a) les titres « Caractéristiques » / « Cercles » sont en Caveat Brush, minuscules droites et rondes, alors que le PDF a un pinceau irrégulier, penché, à pointes (« STATS », « CIRCLES ») ; (b) les étiquettes des valeurs (SANG, CŒUR, ESPRIT, ÂME ; MORTELS, NOCTURNES…) sont en League Gothic maigre, alors que le PDF a un sans-serif **gras** et large (BLOOD, MORTALIS) ; (c) la bande d'accent est un aplat violet, alors que le PDF a un coup de pinceau texturé. À trancher : aucune police officielle n'est publiée, seules des alternatives libres (OFL) peuvent entrer dans le pack. | Utilisateur |

| 10 | Urban Shadows | `character-identity` (Handbook) | Le deux-points de « APPARENCE : » passe à la ligne sous le libellé quand la valeur est longue (capture Handbook 1400 px, colonne de droite). | Constat (capture du 2026-11-24) |
| 11 | Urban Shadows | `urban-shadows-stats` (Handbook) | La ligne « Blood 0, Heart 1, Mind -1, Spirit 1. » reste en anglais sous le titre français : elle vient de `statsDetail` (donnée de l'exemple), pas du CSS. À suivre avec l'écart 4. | Constat (capture du 2026-11-24) |

### Constats de la phase 1 (2026-11-24)

- Outillage (écart 3) : la capture échouait parce que `MEASURE` attendait, sans borne, `document.fonts.ready` et deux `requestAnimationFrame` ; une fenêtre non peinte ne déclenche pas de frame, et le `recv` du socket expirait (« Connection timed out », pas « 0 width »). Les attentes sont bornées dans la page (5 s et 2 s), le délai du socket passe à 30 s, et une boîte nulle ré-applique la taille de fenêtre et le défilement avant de relire ; l'échec dit désormais l'état du bloc. Preuve : 3 captures d'Urban Shadows de suite, 3 de Monsterhearts (dont une avait échoué en boîte nulle avant la ré-application), puis 6 en alternance, sans échec.
- Captures courantes dans `reference/current/` : `handbook-<jeu>-1400.png` (Handbook, build courant, paquet local) et `lantern-<jeu>-p1.png` / `-p2.png` (Lantern local, verso déplié, langue française). Candidates de polices rendues côte à côte : `reference/current/font-candidates.png`.
- Urban Shadows : le bloc « Création du personnage » n'est plus dessiné sur la fiche (Lantern), il s'ouvre depuis le panneau ; le verso de Lantern est replié par défaut sur toutes les fiches de personnage.
- Export PDF de La Selkie sur papier blanc : non constaté dans cette passe (il demande un export Obsidian réel) ; à jouer en phase 3, après la phase 4.

### Verdict de l'utilisateur sur les six points de contrôle

- **Monsterhearts (La Selkie)** : verdict de l'utilisateur le 2026-11-24, « on est bons » sur les trois points. Reste l'écart 2 (police du nom) si l'utilisateur le maintient.
- **Urban Shadows (The Aware)** : la police secondaire (corps de texte) ne correspond pas au PDF (capture jointe : « Lâcher la Bête », puces en serif). Les autres points d'Urban Shadows restent à trancher.

### Écart 12 : police du corps de texte d'Urban Shadows

- Constat : le PDF (`US-Playbooks-web20241126.pdf`, vérifié avec `pdffonts`) compose le corps en **Proxima Nova Extra Condensed** (Light, Regular, Bold, Medium Italic), les titres de mouvement en capitales grasses de la même famille ; le pack applique **Source Serif 4** (empattement), sans rapport avec l'original. Proxima Nova est commerciale : on ne l'embarque pas.
- Candidates libres (OFL) rendues sur le paragraphe « I know a guy » : `reference/current/font-candidates-us-body.png`. Fira Sans Extra Condensed est la plus proche (graisse, chasse, retour à la ligne comme le PDF) ; Barlow Semi Condensed est plus large, Barlow Condensed et Saira Extra Condensed trop étroites.
- Retour de l'utilisateur (2026-11-24) : Fira Sans Extra Condensed « ne semble pas si proche ». Nouvelle comparaison à largeur de ligne égale (chaque candidate réglée pour que la première ligne du PDF fasse 403 px) : `reference/current/font-candidates-us-body-fitted.png`. À cette échelle Fira tombe à 12,6 px, donc plus petite et plus large que l'original ; Barlow Condensed (14,1 px) et Sofia Sans Condensed (14,3 px) retombent à la taille et à la densité du PDF. Recommandation révisée : **Sofia Sans Condensed** (formes les plus proches de Proxima Nova), Barlow Condensed en second.
- Décision : en attente de l'utilisateur ; instances statiques 400, 700, italique 400 (pas de police variable, cf. README des polices du pack).

### Écart 9 : précision du 2026-11-24 (titres au pinceau)

- L'utilisateur parle bien de la police des titres « STATS », « CIRCLES », « HARM » et « LET IT OUT » (Outback dans le PDF : pinceau penché, trait fin à moyen), pas seulement du corps de texte (écart 12, distinct). Caveat Brush, droite et trapue, n'y ressemble pas.
- Candidates rendues contre les extraits du PDF : `reference/current/font-candidates-us-titles.png`. La plus proche : **Kaushan Script** (OFL, penchée, trait de pinceau) ; Knewave en second (trop grasse) ; Permanent Marker et Sedgwick Ave Display trop lourdes ; Rock Salt, Mansalva, Just Another Hand, Nanum Brush Script et Gochi Hand à écarter.
- Retour de l'utilisateur : **Kaushan Script refusée** (calligraphique et large ; le PDF a des capitales étroites, penchées, au pinceau sec). Deuxième comparaison, familles de capitales brossées, droites puis penchées : `reference/current/font-candidates-us-titles-2.png`. La plus proche : **Protest Revolution** (OFL, trait de pinceau rugueux, penchée par le navigateur) ; Protest Guerrilla et Caesar Dressing trop massives, Sue Ellen Francisco et Amatic SC trop fines.
- Précision de l'utilisateur : la police de titres **principale** (League Gothic : « THE AWARE », « IDENTITÉ », « ACTIONS D'ARCHÉTYPE »…) lui convient et ne change pas ; la police **secondaire** à trouver est le pinceau (Caveat Brush aujourd'hui : « Caractéristiques », « Cercles », « Blessures », « Lâcher la Bête », « Corruption »). Le corps de texte (écart 12) n'a pas été demandé comme tel : à ne traiter que si l'utilisateur le confirme.
- **Décision (2026-11-24) : Protest Revolution retenue** (« ok pour protest revolution »), League Gothic inchangée pour les titres principaux. Les titres au pinceau passent **tout en capitales** (`text-transform: uppercase`, comme le PDF) : « ou tout mettre en maj ? ». Appliqué à `stat-spread`, `circle-status`, `condition-harm-tracker` (le titre vit dans `.handbook-urban-shadows-harm-head`, sélecteur ajouté), `box-track` et « Lâcher la Bête ». Les titres de la section de nuit et des encadrés (`section.css`, `callouts.css`) changent de police sans passer en capitales. Fichiers : `protest-revolution-latin-400-normal.woff2` (Fontsource 5.3.0, statique, latin) et `OFL-ProtestRevolution.txt` dans `handbook/` et `packs/`, déclaration dans `pack.json`, `appearance-contract.json`, `urban-shadows-appearance.ts`, corpus et `theme-tokens.css`, README et `LICENSES/HANDBOOK-ASSETS.md` ; Caveat Brush retirée du pack.
- Ajustements demandés ensuite : titres pinceau en **violet** (`--us-ink`, comme « CIRCLES » et « HARM » du PDF) et lettres **légèrement penchées** (`font-style: italic`, la police n'a pas d'italique : le navigateur l'incline ; aussi sur le titre de « Corruption »). À prouver à l'export PDF (phase 3) : une italique synthétique doit y rester du texte, pas du Type3.
- Vérifié : Handbook (`reference/current/handbook-urban-shadows-1400.png`) et Lantern (`reference/current/lantern-urban-shadows-brush.png`, après repaquetage du tarball local, redémarrage de Vite et suivi de l'import `UrbanShadowsPlaybookPreview.tsx`). `npm run validate:presentation`, `pnpm typecheck` et `pnpm lint` de Lantern verts.

### Écart 13 : boîte « Lâcher la Bête » d'Urban Shadows

- Puces : losanges creux (◇) → puces rondes pleines (•), comme le PDF. Colonnes : `columns: 2 11rem` n'en tenait qu'une dans la colonne de la fiche → `columns: 2` (toujours deux colonnes, comme imprimé). Source : `playbook.css` d'Urban Shadows, les deux copies identiques (`handbook/` et `packs/`).
- Vérifié dans Handbook (capture du 2026-11-24, `reference/current/handbook-urban-shadows-1400.png`) ; Lantern vérifié après réinstallation du paquet local (puces rondes, deux colonnes). La classe `handbook-urban-shadows-lozenges` garde son nom (consommée par Handbook et Lantern), son marqueur n'est plus un losange.

## Validation de la cible

Cible et six points de contrôle validés par l’utilisateur le 2026-11-09.
