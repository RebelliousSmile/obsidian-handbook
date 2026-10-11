```adrenaline-monstre
nom = "Rôdeur accordé"
typeDeCorps = "Moyen"
typeInfecte = "Zy-2:04"
description = "L'infecté ordinaire d'Akihabara. Il y en a des milliers."
niveauDeDanger = 6
zoneDeDetection = "2 m"
deplacement = "4 m"
actionsParRound = 2
traitsSpeciaux = [
  "État Insensible.",
  "Figé : quatre minutes après la fin de la diffusion, 0 action par round. Au silence prolongé, il redevient un Zy ordinaire.",
  "Au froid : sous zéro, hors accord, déplacement 3 m. 1 malus à ses tests. La nuit, il ne voit pas au-delà de dix mètres.",
]

[caracteristiques]
for = { minimum = 0, current = 30, maximum = 30 }
con = { minimum = 0, current = 40, maximum = 40 }
dex = { minimum = 0, current = 30, maximum = 30 }
rap = { minimum = 0, current = 30, maximum = 30 }
per = { minimum = 0, current = 30, maximum = 30 }

[sante.physique]
superficiel.base = { minimum = 0, current = 6, maximum = 6 }
leger.base = { minimum = 0, current = 13, maximum = 13 }
grave.base = { minimum = 0, current = 18, maximum = 18 }
profond.base = { minimum = 0, current = 23, maximum = 23 }

[defense]
active = false
bonus = 4

[[actions]]
nom = "Dégoût zombie"
effets = [ "DM 1d10 (2d10 au contact)", "Étourdissante", "Localisée (Peur)", "Fatale 9+" ]
notes = "Attaque gratuite, la première fois."

[actions.test]
nom = "Arme psychologique"
specialite = "Dégoût zombie"
pourcentage = { minimum = 0, current = 50, maximum = 50 }

[[actions]]
nom = "Morsure"
desDeDegats = 1
effets = [ "Contamination par le sang" ]

[actions.test]
nom = "Art martial"
specialite = "Zombie"
pourcentage = { minimum = 0, current = 10, maximum = 10 }
caracteristique = "for"
total = { minimum = 0, current = 40, maximum = 40 }

[[competences]]
nom = "Observation"
specialite = "Proie"
pourcentage = { minimum = 0, current = 10, maximum = 10 }
caracteristique = "per"
total = { minimum = 0, current = 40, maximum = 40 }

[etatDeBase]
nom = "Non stimulé"

[[etats]]
id = "stimule"
nom = "Stimulé"
declencheurs = [ "Une diffusion en cours, ou qui vient de s'achever." ]

[etats.delta]
deplacement = "4 m par round, en ligne droite vers le point annoncé"
comportement = [ "Ne dérive pas.", "Ignore tout ce qui n'est pas sur son chemin.", "Ne s'arrête pas au contact d'une proie tant qu'il n'a pas atteint le point." ]
```
