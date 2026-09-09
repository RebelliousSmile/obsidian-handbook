# Handbook - Test blocs Otherscape

Univers à parcourir dans les réglages Handbook : Metro, Cairo, Tokyo ; puis Clair, Sombre et Suivre Obsidian.

## Theme

```os-theme
title_tag = "The Debt I Never Paid"
theme_type = "self"
category = "AFFILIATION"
power_tags = [ "they still take my call", "~{knows what the favour was worth}" ]
weakness_tags = [ "cannot refuse when they ask" ]
quest = "Settle the debt on my own terms."
upgrade = 2
decay = 1
```

## Theme Kit

```os-theme-kit
title_tag = "Back-Alley Ripperdoc"
theme_type = "self"
category = "STREET TRADE"
power_tags = [ "steady hands", "knows what the chrome costs" ]
weakness_tags = [ "owes the wrong people" ]
quest = "Keep the clinic open."
```

## Challenge

```os-challenge
name = "Chrome Vulture Runner"
description = "A courier on borrowed legs."
scale = 1
tags_and_statuses = [ "{wall-running legs}", "{alert-2}" ]
general_consequences = [ "Give {made-2} to whoever spoke last." ]
[[limits]]
name = "catch/outrun"
level = 3
is_polar = true
is_progress = false
[[specials]]
name = "Chrome Reflexes"
description = "Remove one tier from {tracked-2}."
[[threats]]
name = "Call it in"
description = "Thumbs a panic stud."
```

## Power Set

```os-power-set
name = "Source-Touched Berserk"
type = "mythos"
description = "Something older got a grip."
[[specials]]
name = "Feels No Wound"
description = "It ignores the first tier."
[[threats]]
name = "Go through it"
description = "Takes the shortest line."
consequences = [ "Give {thrown-2}." ]
```

## Character Trope

```os-character-trope
name = "Neon Exorcist"
category = "MYSTICS & MEDIUMS"
description = "The rites still work."
loadout = [ "salt-line projector", "prayer deck" ]
[[theme_kits]]
title_tag = "Rites Of The Cold Signal"
category = "RITUAL"
[[choices]]
title_tag = "Seminary Dropout"
category = "PERSONALITY"
```

## Loadout Item

```os-loadout-item
name = "Kestrel Whisperlink"
category = "Weapons"
description = "A throat-mounted relay."
feature_tags = [ "Kestrel Whisperlink", "hard to jam" ]
weakness_tag = "factory handshake"
```
