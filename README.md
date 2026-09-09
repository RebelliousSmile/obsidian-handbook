# Handbook

Handbook is an Obsidian plugin for running **City of Mist**, **Legend in the Mist** and **:Otherscape** vaults with game-specific styling, custom inline syntax, themed callouts, theme cards, challenge and danger profiles, and optional canvas helpers.

It started as a fork of [Brumes](https://github.com/4rtamis/obsidian-brumes) by [4rtamis](https://github.com/4rtamis), and now follows its own road. Everything Brumes did, Handbook still does; the settings key names are unchanged, so a vault moving over keeps its configuration.

**:Otherscape** fournit trois univers visuels globaux — Metro, Cairo et Tokyo —
chacun dans les registres clair et sombre attestés par ses maquettes. Les notes
restent portables : l'univers est un réglage du coffre, jamais une donnée ajoutée
à leur TOML.

Les six formats publiés par `schema-in-the-mist` v0.4.0 sont pris en charge :
`os-theme`, `os-theme-kit`, `os-challenge`, `os-power-set`,
`os-character-trope` et `os-loadout-item`. Exemple minimal :

````markdown
```os-theme
title_tag = "The Debt I Never Paid"
theme_type = "self"
power_tags = [ "they still take my call" ]
weakness_tags = [ "cannot refuse when they ask" ]
quest = "Settle the debt on my own terms."
upgrade = 2
decay = 1
```
````

Le vocabulaire de cartes Metro s'inspire de
[Mist HUD](https://github.com/mordachai/mist-hud), distribué sous licence MIT.
Handbook ne redistribue aucun de ses assets ni aucune image extraite des livres.

## Installation

### 1. Prepare a vault

Handbook is easiest to test in a dedicated vault.

| Install                                                                       | Why                                                          |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [BRAT](https://github.com/TfTHacker/obsidian42-brat)                          | Required to install Handbook from GitHub                     |
| [Advanced Canvas](https://github.com/Developer-Mike/obsidian-advanced-canvas) | Optional, only needed for Iceberg and Mountain card snippets |

Handbook writes its own colors and fonts into a style element it owns, scoped
by game mode, in light and in dark. No theme and no other plugin is required
for the visual base. Earlier versions shipped a `Style Settings` preset for the
`Border` theme; that channel is gone. If you imported one of those presets,
open `Style Settings` and reset the sections it created — the leftover keys
still override what Handbook writes.

The fine-grained knobs that preset offered come back as a file you write. Put
an `overrides.json` in Handbook's own folder in the vault
(`.obsidian/plugins/obsidian-handbook/overrides.json`) and it wins over the
active game for the custom properties it declares, and for nothing else:

```json
{
	"base": { "note": { "--h1-size": "2.4em" } },
	"dark": { "note": { "--background-primary": "#1B1B1F" } }
}
```

`base` applies whichever theme is on, `light` and `dark` only under theirs; the
`workspace` slot next to `note` holds what the workspace theme toggle writes.
A value the file leaves out keeps the game's; removing the file restores the
game whole. The file is read at startup and on the *Reload personal overrides*
command, or on the *Reload* button in the settings tab. A malformed value is
dropped and reported in the console, and the rest of the file still applies.

Suggested vault setup:

1. Create a fresh Obsidian vault for testing or play.
2. Enable Community plugins.
3. Install `BRAT`, and optionally `Advanced Canvas`.

### 2. Install Handbook with BRAT

1. Open `Settings -> BRAT`.
2. Choose `Add Beta plugin`.
3. Enter `RebelliousSmile/obsidian-handbook`.
4. Install the plugin, then enable `Handbook`.

### 3. Configure Handbook

1. Open `Settings -> Handbook`.
2. Pick your `Game mode`. The rendering follows immediately, with no reload
   and no preset to import.
   Avec :Otherscape, choisissez ensuite l'`Univers` Metro, Cairo ou Tokyo ; ce
   choix repeint toutes les notes ouvertes.
3. Leave `Colour scheme` on `Follow Obsidian`, or force Handbook's light or
   dark scheme independently of the vault theme.

### 4. Add the illustrations

Handbook no longer carries its art inside its stylesheet: a game names the
files it draws with, and the plugin looks for them in the vault. They live in
Handbook's own folder, one subfolder per game:

```txt
.obsidian/plugins/obsidian-handbook/assets/
├── city-of-mist/
│   ├── callout-edge.svg
│   └── iceberg-*.svg
└── legend-in-the-mist/
    ├── theme-card*.png
    ├── fonts/pragroman.ttf
    └── ...
```

The `Illustrations` setting names the folder of the active game, counts the
files it reads, and lists the ones it did not find; `Check files` looks again
after a drop, with no reload.

**Until the files are there, the game renders degraded, never broken.** A card
without its frame keeps its text on a flat ground and a border, a badge without
its icon goes away instead of leaving an empty box, a drawn checkbox mark
becomes a typed one, and a missing typeface falls through to the next family in
its stack. Nothing errors and nothing renders as a broken image.

One file is asked for rather than shipped by choice: `pragroman.ttf`, the
display face of the Legend in the Mist headings. Its license allows giving it
away but not including it in a product, so it is downloaded by whoever wants
it and dropped in like an illustration.

### 5. Optional canvas setup

If you use `Advanced Canvas`, Handbook can generate mode-specific node-style snippets:

- `City of Mist` mode: copy the `Iceberg canvas snippet`
- `Legend in the Mist` mode: copy the `Mountain canvas snippet`

Then:

1. Go to `Settings -> Appearance -> CSS snippets`.
2. Create `iceberg.css` or `mountain.css` inside `.obsidian/snippets/`.
3. Paste the copied snippet content into the matching file.
4. Enable the snippet in Obsidian.

## Core Concepts

### 1. Custom inline syntax

Handbook parses brace-based syntax in the editor and in reading view:

```md
{power-tag}
{!weakness-tag}
{status-3}
{attention:5}
{countdown:~}
```

- `{power-tag}` creates a normal tag
- `{!weakness-tag}` creates a weakness tag
- `{status-3}` creates a status with a rating
- `{limit:5}` creates a limit

The plugin also adds a Handbook editor context-menu entry so you can insert starter tags, callouts, and Story Theme templates without memorizing the syntax.

### 2. Callouts

Handbook builds on standard Obsidian callouts, but gives them mode-specific styling and aliases.

City of Mist examples:

```md
> [!MOVE] Hit the Streets
> Describe the move here.

> [!DESCRIPTION]
> Text to read aloud.

> [!CLUE]
> The matchbook is still warm.
```

Default City of Mist aliases include:

- `note`, `aside`
- `move`
- `description`, `read-aloud`
- `clue`
- `red-clue`

Legend in the Mist examples:

```md
> [!NOTE] Village Rumor
> The ferryman never crosses after dusk.

> [!READ-ALOUD]
> The mist swallows the road behind you.
```

Default Legend in the Mist aliases include:

- `note`
- `read-aloud`

Aliases are editable in Handbook settings, and the first alias in each list is what the context menu inserts.

### 3. Theme cards for Legend in the Mist

In `Legend in the Mist` mode, Handbook renders a `theme-card` code block into a styled card. A hero theme names its might level and its themebook:

````md
```theme-card
origin
circumstance
{Born in the marsh}
{Track by moonlight}
{Know every hidden trail}
{!Trust strangers too easily}
```
````

A story theme has neither, so it drops the level badge and the themebook line and keeps the plain frame:

````md
```theme-card
{Magic Lantern}
{Reveals the dead}
{Dispel illusion}
{!Difficult to light}
```
````

How it works:

- First line can be `origin`, `adventure`, or `greatness`
- Second line can be a category or themebook label
- First normal tag becomes the title tag
- Later normal tags become power tags
- `{!weakness}` lines become weakness tags

If you omit the level, Handbook falls back to a standard card style, without a level badge and without a category line.

The former `story-theme` id still renders the same card, so older notes keep working, but it is deprecated: prefer `theme-card` in new notes.

### 4. Challenges for Legend in the Mist

In `Legend in the Mist` mode, Handbook can render a `litm-challenge` code block into a challenge profile card:

````md
```litm-challenge
Crafty Rumormonger
roles: Watcher, Sapper, Countdown
: A gossip who turns whispers into weapons.
LIMITS
Convince 2
Scare 2
Undermine Community 4 > Everyone in the community becomes distrustful-2 of one another.
MIGHT
Numbers (caught in a lie)
TAGS
{latest juiciest scandal} chatty confident-2
FEATURES
Petty Grudge > When slighted, the rumormonger gains vengeful-2.
THREATS
Listen : They lean in a little too close.
> Your words spread further than intended (Exposure)
Whisper : A name of yours is passed along in the dark.
> A friend starts avoiding you (shunned-2)
Twist : The story comes back wearing a new shape.
> What you said becomes what you meant (Blocked)
SECRETS
Origin: A curse cast by a Thaumaturge.
```
````

How it works:

- First line is the challenge name, and an optional `roles:` line lists its roles
- Lines starting with `:` are the description
- `LIMITS`, `MIGHT`, `TAGS`, `FEATURES`, `THREATS` and `SECRETS` open a section, and every one but `LIMITS` is optional
- A limit is a name followed by its rating; a progress limit adds its consequence after ` > `
- A threat names its trigger after ` : `, then owns every `>` line below it
- Tags are written `{multi word tag}` or as single words, and statuses keep their tier
- Write `{name-2}` anywhere in a description, a consequence, a trigger or an effect to render that status as a tag, the same braces used to group a multi-word tag

### 5. Journeys for Legend in the Mist

In `Legend in the Mist` mode, Handbook can render a `litm-journey` code block into a journey sheet:

````md
```litm-journey
Journey - Occasion
Blood & Water Feud
: Two families have feuded for as long as anyone can remember. It is all too easy to get drawn into their rivalry, and aggressions often escalate.
: This-side and that-side are polar statuses representing the hero's perceived faction allegiances.
tags: hot tempers, map of claimed territories, list of grievances
CONSEQUENCES
> Someone thinks you are working with the rivals (that-side-2, watched-2, or suspected-2).
> One of the feuding family members blames you for something you did not do (that-side-2).
> You draw the wrong kind of attention (New Challenge: Crafty Rumormonger).
> Someone begins to follow you around (New Challenge: Lone Tracker).
VIGNETTE Tavern Slur Slinging : A tense night at the tavern grows sour, as drunken-2 members of the two families begin slinging insults at each other.
> Some choice words are thrown at you (insulted-2 or angry-2).
> Someone starts a fight and wants you to pick a side (New Challenge: Commoner Rabble-Rouser).
> The tavern owner throws you out along with the other rabble-rousers (Blocked).
VIGNETTE Mysterious Fire : A building you are near suddenly roars in a blazing inferno, and members of one of the rival families might be inside.
> You get scorched by the fire (burned-3).
> Someone inside comes to harm from the fire or a collapsing wall (Ill Tidings).
> You can find no clear signs of how the fire started or by whom (Blocked).
VIGNETTE Sabotaged Cart : A farmer's cart throws a wheel (broken-3) and she suspects foul play.
> Catching the culprit earns you a reputation of supporting this-side-2, letting them go earns you the opposite (that-side-2).
> Helping her allows supplies to reach her side of the feud (they gain well-supplied-2).
> This endeavor costs you time (time-passes-2) and resources (short-on-supplies-2).
VIGNETTE Star-Crossed Lovers : You stumble upon a secret tryst of two lovers from opposing sides of the feud, who offer you coin to hide their secret.
> You are marked by both sides (reset this-side or that-side and gain marked-3).
> An angry-2 mob forms to search for the couple (New Challenge: Commoner Militia).
> One of them curses you for your part in this (loveless-3).
VIGNETTE Road Brawl : Two groups of angry-2 Dalesfolk argue out on the road, accusing each other of old transgressions.
> A violent scuffle ensues in the mud and you get hurt (bruised-2 and filthy-2).
> Someone is gravely wounded (Ill Tidings, and that side gets vengeful-2).
> Someone draws a hidden weapon or calls a few armed friends (New Challenge: Commoner Militia).
VIGNETTE Blood Curse : A person wronged by the feud stands in a bloody ritual circle, about to sacrifice someone from the other side.
> A calamity is unleashed on the village (New Challenge: Local Disaster).
> The community is forever torn (Ill Tidings and hateful-6).
> You take the brunt of the curse (cursed-6).
```
````

How it works:

- First line is the journey type, `Landscape`, `Occasion` or `Undertaking`, written on its own or prefixed by `Journey - `
- Second line is the journey name
- Lines starting with `:` are the description, and `tags:` lists the journey tags — written as single words, or `{multi word tag}` braced the same way `litm-challenge` does
- `benefits:` describes what a successful step earns, and only `Undertaking` journeys use it
- `CONSEQUENCES` (or `GENERAL CONSEQUENCES`, the wording most official profiles print) opens the shared consequence list, where every `>` line before the first vignette lands
- `VIGNETTE ` starts a vignette, its trigger following ` : `, and it owns every `>` line below it
- Write `{name-2}` anywhere in a description, a consequence or a trigger to render that status as a tag
- A line the parser cannot make sense of, a `benefits:` on a Landscape or an Occasion, a vignette missing its ` : ` trigger, or a consequence written before any `CONSEQUENCES` heading, is never dropped silently: it is still rendered where possible, and listed in a muted footer under the card

### 6. Theme kits for Legend in the Mist

In `Legend in the Mist` mode, Handbook can render a `litm-theme-kit` code block into a ready-made theme card:

````md
```litm-theme-kit
Devotion
Trial of the Vulture
{scavenging} {desperation motivates me} {vulture skull necklace}
{find a safe spot} {fleeing danger} {hardy}
{side with the winner} {make do with scraps} {mask my scent}
{!unsympathetic} {!always in survival mode}
{!disheveled appearance} {!barren landscapes}
quest: Prove that there is a vulture inside of me.
improvement: Vulture's Endurance > Once per scene, when you roll to resist hunger or the elements, you first gain desperate-2, which helps the roll.
```
````

How it works:

- First line is the themebook the kit belongs to, matched against the Legend in the Mist themebooks, and it can be left out
- The first plain line after it is the kit name
- `{tag}` entries are power tags and `{!tag}` entries are weakness tags, several per line
- `quest:` holds the kit quest, and `improvement:` names a special improvement, its effect following ` > `

### 7. Iceberg and Mountain card snippets

Handbook includes copyable snippet templates for `Advanced Canvas`.

- `Iceberg Card` is the City of Mist helper
- `Mountain Card` is the Legend in the Mist helper

Available Iceberg variants:

- `location`
- `character`
- `group`
- `sticky-note`

Available Mountain variants:

- `origin`
- `adventure`
- `greatness`
- `standard`

### 8. Mode switching

The selected game mode changes more than colors. It also switches which callouts, block formats, context-menu actions, and special renderers are active in the vault. Switching rewrites the whole style block, so nothing of the previous game survives the change.

### 9. Lantern in the Mist integration

Handbook can add a ribbon button that opens an embedded `Lantern in the Mist` view inside Obsidian. The target URL is configurable from plugin settings.

## License

- Plugin code: [MIT](LICENSE), originally (c) 4rtamis as Brumes, modifications (c) François-Xavier Guillois
- Font files: each bundled font keeps its own upstream license, and every one of them is redistributable; a face that is not is asked for from the vault instead
- Illustrations: read from the vault, not carried in the stylesheet
- Assets: status is still under discussion with Son of Oak

### Font License Files

- [Averia](licenses/fonts/Averia.LICENSE.txt)
- [Bebas Neue](licenses/fonts/BebasNeue.LICENSE.txt)
- [Caveat](licenses/fonts/Caveat.LICENSE.txt)
- [Courier Prime](licenses/fonts/CourierPrime.LICENSE.txt)
- [Fira Sans Extra Condensed](licenses/fonts/Fira.LICENSE.txt)
- [IM Fell English](licenses/fonts/IMFellEnglish.LICENSE.txt)
- [IM Fell Great Primer](licenses/fonts/IMFellGreatPrimer.LICENSE.txt)
- [Labrada](licenses/fonts/Labrada.LICENSE.txt)
- [PT Serif / ParaType](licenses/fonts/ParaType.LICENSE.txt)
- [PragRoman](licenses/fonts/PragRoman.LICENSE.txt) (not bundled, supplied by the user)
- [Roboto](licenses/fonts/Roboto.LICENSE.txt)

### Asset Status

Use of bundled Son of Oak-derived assets under discussion.
