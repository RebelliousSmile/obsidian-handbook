# Relevés de sources — City of Mist et :Otherscape

Tout ce qui suit a été vérifié dans les livres, pas reconstitué de mémoire. Les extractions texte des PDF sont dans le scratchpad de session (`com-players.txt`, 6943 l. ; `com-mc.txt`, 5518 l.) et sont refaisables avec `pdftotext` depuis le dossier `RPG/` du vault. Le core book :Otherscape a déjà un `.txt` fourni (14 625 l.).

## City of Mist

**14 themebooks de personnage**, 7 par catégorie :

- **Mythos** : Adaptation, Bastion, Divination, Expression, Mobility, Relic, Subversion
- **Logos** : Defining Event, Defining Relationship, Mission, Personality, Possessions, Routine, Training

S'y ajoutent 3 themebooks Extra (Ally, Base of Operations, Ride) et le Crew themebook.

**Carte de thème** : type de thème en tête, TITRE, 3 power tags accompagnés chacun de la lettre de la question du themebook à laquelle ils répondent, 1 weakness tag, puis une **Mystery** pour un thème Mythos ou une **Identity** pour un thème Logos. La piste d'érosion est **Fade** pour Mythos et **Crack** pour Logos ; pleine, le thème est remplacé. Un power tag supplémentaire coûte un weakness tag supplémentaire dans le même thème.

Exemple relevé (Adaptation, `com-players.txt` l. 1876) : le livre donne un titre, une Mystery, trois power tags précédés chacun de la lettre de leur question, et un weakness tag lui aussi lettré — la carte ne porte rien d'autre.

**Danger profile** (`com-mc.txt` l. 2203) : une brève description, des status spectrums qui définissent les manières de le vaincre, et des Danger moves. Un spectrum est un tag descriptif assorti d'un maximum de 1 à 6 ; un Danger peut en avoir plusieurs, et un spectrum au maximum signifie le Danger vaincu ou transformé. Les moves sont soft, hard, ou custom — les custom sont des règles spéciales, le plus souvent des intrusions, révélées aux joueurs au premier déclenchement.

**Écarté** : les Moves du jeu sont déjà rendus par le callout `move` (`callouts.move` dans `city-of-mist/index.scss`), les story tags et statuses par le parser de tags inline. Rien à dupliquer.

**Non-régression vérifiée** : `src/styles/city-of-mist/*.scss` ne définit que des classes de tags et de callouts (`brumes-tag`, `brumes-power`, `brumes-weakness`, `brumes-status`, `brumes-limit`, `brumes-callout-style`). Aucune classe de bloc — pas de collision possible avec les nouvelles.

## :Otherscape

**14 themebooks**, 3 catégories :

- **Self (6)** : Affiliation, Assets, Expertise, Horizon, Personality, Troubled Past
- **Mythos (4)** : Artifact, Companion, Esoterica, Exposure
- **Noise (4)** : Augmentation, Cutting Edge, Cyberspace, Drones

La catégorie type la motivation : **Identity** pour Self, **Ritual** pour Mythos, **Itch** pour Noise.

**Deux pistes par thème** : **Decay**, 3 cases, cochée quand on agit contre sa motivation — pleine, le thème est remplacé ; **Upgrade**, cochée quand une weakness est invoquée — pleine, elle donne un nouveau tag ou un Special.

**8 Essences**, déterminées par l'équilibre Self / Mythos / Noise : Nexus, Spiritualist, Cyborg, Transhuman, Real, Avatar, Conduit, Singularity. Chacune a son Essence Special.

**Loadout** : les tags ajoutés par loot arrivent brûlés et doivent être Loaded Up ou Restored avant usage. **Crew theme** : ses power tags brûlent à l'usage, tout le monde partage sa motivation et sa weakness.

**Challenge profile** (core book l. 2397-2431) : Limits — dont des Progress Limits munies d'un Special qui se déclenche au maximum —, Base Tags, Specials, et Threats / Consequences en lignes `>`. Structurellement le parent du `litm-challenge` déjà écrit.

## Grammaires arrêtées

Conventions communes reprises de l'existant : `{tag}` power, `{!tag}` weakness, `~{tag}` brûlé (notation nouvelle), `>` conséquence, `:` description.

### `com-theme-card`

```
Divination
The Cartomancer
mystery: Who keeps redealing the same hand?
A {read the cards} D {borrowed eyes} E {glimpse the next hour}
D {!answers only in riddles}
fade: 2/3
```

Ligne 1 le themebook, ligne 2 le titre. `mystery:` pour Mythos, `identity:` pour Logos, `motivation:` quand la ligne 1 vaut `Crew` ; le rendu signale une incohérence entre le themebook et la clé employée. La lettre de question devant un tag est optionnelle et se rend en marge. `fade:` ou `crack:` selon la catégorie.

### `com-danger`

```
Nitro Gang Member
: A street thug juiced on Rift dust.
SPECTRUMS
Intimidated 3
Beaten Down 4
MOVES
soft: They flash a weapon and demand you back off.
hard: They open fire, inflicting hurt-3.
custom: Dust Rush > When their last spectrum maxes out, they gain frenzied-4.
```

Même charpente que `litm-challenge`, avec `SPECTRUMS` et `MOVES` à la place de `LIMITS`, `TAGS` et `THREATS`.

### `os-theme-card`

```
Augmentation
Chrome Reflexes
itch: Push the meat further than it was built to go.
{subdermal armor} {wired reflexes} {threat assessment HUD}
{!runs hot under stress}
decay: 1/3
upgrade: 2/3
special: Overclock > Once per scene, burn a tag to act before anyone else.
```

`identity:`, `ritual:` ou `itch:` selon la catégorie du themebook. Ligne 1 à `Crew` pour la carte d'équipage, à `Loadout` pour le loadout, dont les tags s'écrivent `~{}` par défaut.

### `os-challenge`

```
Nitro Gang Member
: Chrome-jawed runners hopped on combat stims.
LIMITS
Scatter 2
Overwhelm 4 > The alley closes in around you (Surrounded-3)
TAGS
{cheap chrome} {numbers} reckless-2
SPECIALS
Stim Rush > When a Limit maxes out, the rest gain frenzied-3.
THREATS
Swarm : They close from three directions at once.
> You lose your footing (Exposed-2)
```

`SPECIALS` remplace `FEATURES`. Le reste est identique à `litm-challenge`.

## Points de câblage, par bloc

Une entrée dans `BRUMES_BLOCKS` (`src/features/blocks/registry.ts`), un booléen neuf dans `BrumesFeatureSettings`, un `Setting` dans l'onglet de réglages, un partial SCSS et son `@use` dans l'`index.scss` du jeu. Ne jamais renommer une clé `features.*` existante : elle est écrite dans le `data.json` des utilisateurs.

## État des styles au moment du relevé

| Jeu | Partials | Fontes inlinées |
| --- | --- | --- |
| City of Mist | 8 (callouts, hashtags, headings, iceberg, links, lists, tables, tags) | 6, 880 Ko |
| Legend in the Mist | 11, dont 4 de blocs | 7, 2,8 Mo |
| :Otherscape | aucun — `index.scss` ne contient qu'un `// TODO` | aucune |
