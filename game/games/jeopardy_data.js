/**
 * Jeopardy Fragen-Datenbank
 * Strukturiert nach Themen – jedes Thema hat einen Pool an Kategorien.
 * Pro Spiel werden zufällig 5 Kategorien aus dem gewählten Thema gezogen.
 */
const jeopardyThemes = {
  // ===== ALLGEMEIN (alle Kategorien gemischt) =====
  allgemein: {
    label: "🌍 Allgemeinwissen",
    categories: [
      {
        name: "Tech & Web",
        questions: {
          100: { q: "Das 'S' in HTTPS steht für...", a: "Secure", options: ["System", "Server", "Secure", "Socket"] },
          200: {
            q: "Programmiersprache, die auch eine Schlange ist.",
            a: "Python",
          },
          300: { q: "Erfinder des World Wide Web.", a: "Tim Berners-Lee", options: ["Steve Jobs", "Tim Berners-Lee", "Bill Gates", "Linus Torvalds"] },
          400: {
            q: "Kleines textbasiertes Datenstück, das Websites auf deinem PC speichern.",
            a: "Cookie",
          },
          500: {
            q: "Jahr, in dem das erste iPhone vorgestellt wurde.",
            a: "2007",
          },
        },
      },
      {
        name: "Welt & Reise",
        questions: {
          100: { q: "Hauptstadt von Frankreich.", a: "Paris", options: ["London", "Rom", "Berlin", "Paris"] },
          200: { q: "Höchster Berg der Welt.", a: "Mount Everest" },
          300: { q: "Längster Fluss in Südamerika.", a: "Amazonas" },
          400: {
            q: "Land mit den meisten Einwohnern (Stand 2023).",
            a: "Indien",
          },
          500: { q: "Währung in Japan.", a: "Yen" },
        },
      },
      {
        name: "Film & Serie",
        questions: {
          100: { q: "Der Vater von Luke Skywalker.", a: "Darth Vader" },
          200: {
            q: "Serie über eine Gruppe Freunde in New York (Café Central Perk).",
            a: "Friends",
          },
          300: { q: "Schauspieler von Iron Man.", a: "Robert Downey Jr." },
          400: {
            q: "Name von Simbas bösem Onkel in König der Löwen.",
            a: "Scar",
          },
          500: {
            q: "Regisseur von Inception und The Dark Knight.",
            a: "Christopher Nolan",
          },
        },
      },
      {
        name: "Unnützes Wissen",
        questions: {
          100: { q: "Farbe der Blackbox in Flugzeugen.", a: "Orange" },
          200: { q: "Einzige Stadt auf zwei Kontinenten.", a: "Istanbul" },
          300: { q: "Tier mit dem größten Gehirn.", a: "Pottwal" },
          400: { q: "Wie viele Herzen hat ein Oktopus?", a: "Drei" },
          500: {
            q: "Land, in dem es verboten ist, Kaugummi zu kauen (außer medizinisch).",
            a: "Singapur",
          },
        },
      },
      {
        name: "Sport & Spiel",
        questions: {
          100: { q: "Sportgerät beim Badminton.", a: "Federball" },
          200: {
            q: "Anzahl der Spieler in einer Fußballmannschaft auf dem Feld.",
            a: "11",
          },
          300: {
            q: "Höchste Punktzahl beim Bowling (Perfect Game).",
            a: "300",
          },
          400: {
            q: "Farbe des Trikots des Führenden bei der Tour de France.",
            a: "Gelb",
          },
          500: { q: "Stadt der Olympischen Sommerspiele 2024.", a: "Paris" },
        },
      },
      {
        name: "Musik",
        questions: {
          100: {
            q: "Sängerin von 'Bad Guy' und 'Happier Than Ever'.",
            a: "Billie Eilish",
          },
          200: { q: "Band, die 'Bohemian Rhapsody' gesungen hat.", a: "Queen" },
          300: { q: "Wie viele Saiten hat eine Standard-Gitarre?", a: "6" },
          400: {
            q: "Deutscher Rapper, bekannt für 'Bombe' und 'Moonlight'.",
            a: "Capital Bra / Apache 207",
          },
          500: {
            q: "Welches Instrument spielt Beethoven hauptsächlich?",
            a: "Klavier",
          },
        },
      },
      {
        name: "Geschichte",
        questions: {
          100: { q: "In welchem Jahr fiel die Berliner Mauer?", a: "1989" },
          200: {
            q: "Wer war der erste Mensch auf dem Mond?",
            a: "Neil Armstrong",
          },
          300: { q: "Welches Schiff sank 1912 im Atlantik?", a: "Titanic" },
          400: {
            q: "Wie hieß der letzte ägyptische Pharao (weiblich)?",
            a: "Kleopatra",
          },
          500: { q: "In welchem Jahr endete der Zweite Weltkrieg?", a: "1945" },
        },
      },
      {
        name: "Essen & Trinken",
        questions: {
          100: { q: "Aus welchem Land kommt Pizza?", a: "Italien" },
          200: {
            q: "Welche Frucht ist die Hauptzutat in Guacamole?",
            a: "Avocado",
          },
          300: { q: "Wie heißt der japanische Reiswein?", a: "Sake" },
          400: {
            q: "Welches Land produziert am meisten Kaffee?",
            a: "Brasilien",
          },
          500: {
            q: "Was ist Scoville? (Einheit für...)",
            a: "Schärfe von Chilis",
          },
        },
      },
    ],
  },

  // ===== GAMING =====
  gaming: {
    label: "🎮 Gaming & LoL",
    categories: [
      {
        name: "LoL Champions",
        questions: {
          100: {
            q: "Welcher Champion hatte ursprünglich eine Ability namens 'Surge', die komplett aus dem Spiel entfernt wurde, bevor er released wurde, und wurde dann 2024 komplett reworked?",
            a: "Skarner",
          },
          200: {
            q: "Welcher Champion hat die einzige Ability im Spiel, die einen gegnerischen Turm temporär deaktivieren kann?",
            a: "Ohmwrecker war ein Item – kein Champion. Trick-Frage! (Wurde entfernt)",
          },
          300: {
            q: "Welcher Champion hatte bei Release die niedrigste Winrate aller Zeiten in der Geschichte von LoL (unter 30%)?",
            a: "Bel'Veth / Yuumi (je nach Patch-Interpretation)",
          },
          400: {
            q: "Welcher Champion kann mit seiner Passive theoretisch unendlich viel AD oder AP stacken, hat aber kein Cap?",
            a: "Veigar (AP), Senna (AD/Range), Kindred (Range), Nasus (Q-Stacks)",
          },
          500: {
            q: "Welcher Champion wurde intern bei Riot unter dem Codenamen 'CeeCee' entwickelt und hatte 3 komplette Reworks bevor er released wurde?",
            a: "Zeri",
          },
        },
      },
      {
        name: "LoL Items & Mechaniken",
        questions: {
          100: {
            q: "Welches entfernte Item konnte man aktivieren, um einen feindlichen Turm für ein paar Sekunden zu deaktivieren?",
            a: "Ohmwrecker",
          },
          200: {
            q: "Was war 'Sword of the Occult' und warum wurde es entfernt?",
            a: "Ein Stacking-AD-Item (wie Mejai's für AD) – entfernt wegen Balancing-Problemen",
          },
          300: {
            q: "Wie heißt der Mechanismus, bei dem man Auto-Attacks zwischen Abilities einwebt, um DPS zu maximieren?",
            a: "Animation Cancelling / Weaving",
          },
          400: {
            q: "Welches Item hatte den Passiv-Effekt 'Spellblade' und wurde 2023 in der Item-Rework komplett überarbeitet? (Hinweis: Trinity Force Variante)",
            a: "Sheen / Lich Bane / Essence Reaver (alle haben Spellblade)",
          },
          500: {
            q: "Was ist der 'Cull Breakpoint' und bei wie viel Gold ist Cull effizienter als Doran's Blade?",
            a: "Nach 100 Minion-Kills ist Cull gold-effizient (450g Payoff)",
          },
        },
      },
      {
        name: "LoL Lore Deep Dive",
        questions: {
          100: {
            q: "Welche zwei Champions sind Aspekte desselben Celestials und bekämpfen sich deshalb?",
            a: "Pantheon und Aatrox (Atreus vs. den Darkin)",
          },
          200: {
            q: "Wie heißt die Void-Kreatur, die Kai'Sa als Symbionten-Rüstung trägt?",
            a: "Ein Void-Parasit (hat keinen offiziellen Namen, wird 'Second Skin' genannt)",
          },
          300: {
            q: "Wer sind die fünf bekannten Darkin und welche Waffen bewohnen sie?",
            a: "Aatrox (Schwert), Varus (Bogen), Rhaast (Sense), Xolaani, Naafiri (Dolche)",
          },
          400: {
            q: "In der Lore: Wer hat Isolde getötet und dadurch die Ruination ausgelöst, die die Shadow Isles erschuf?",
            a: "Isolde wurde durch einen Attentäter vergiftet. Viego's Versuch sie zu retten löste die Ruination aus",
          },
          500: {
            q: "Welcher Champion war ursprünglich ein Mensch namens 'Sahn-Uzal' bevor er zum Eisenkönig wurde?",
            a: "Mordekaiser",
          },
        },
      },
      {
        name: "LoL Competitive",
        questions: {
          100: {
            q: "Welches Team hat als einziges dreimal hintereinander Worlds gewonnen?",
            a: "T1 (SKT T1) – 2013, 2015, 2016",
          },
          200: {
            q: "Welcher Pro-Spieler ist bekannt für seinen Singed-Proxy-Farming-Stil und wurde für 'inting' gemeldet obwohl er gewann?",
            a: "Various (berühmt: Lehends, aber bekannter ist der Solo-Queue Legend 'Druiddroid/SirhcEz')",
          },
          300: {
            q: "Bei welchem Worlds-Finale passierte der berühmte 'xPeke Backdoor'?",
            a: "IEM Katowice 2013 – Fnatic vs. SK Gaming (technisch kein Worlds, aber DAS Backdoor-Moment)",
          },
          400: {
            q: "Welcher Champion wurde in der Geschichte von Worlds am häufigsten gebannt, ohne jemals gepickt zu werden, in einem einzigen Turnier?",
            a: "Kassadin (Season 3/4 – nahezu 100% Banrate)",
          },
          500: {
            q: "Wie viele einzigartige Champions hat Faker in offiziellen Competitive-Spielen gespielt (ungefähr)?",
            a: "Über 75 verschiedene Champions",
          },
        },
      },
      {
        name: "LoL Obscure Mechanics",
        questions: {
          100: {
            q: "Was ist 'Spaghetti Code' im LoL-Kontext und welcher Champion-Bug wurde berühmt, weil Jayce's Hammer Minions heilen konnte?",
            a: "Jayce hatte einen Bug bei dem W im Hammer-Form Minions heilte statt Schaden zu machen",
          },
          200: {
            q: "Was ist der 'Level 1 Cheese' mit dem man durch Invade + First Blood theoretisch Level 2 vor dem ersten Wave erreichen kann?",
            a: "Duo-Lane Invade: FB (400g) + Assist XP = genug für Level 2 vor Minions spawnen",
          },
          300: {
            q: "Was war die 'Funneling' Strategie und in welcher Season wurde sie durch Gold-Nerfs auf Jungle-Items gekillt?",
            a: "Mid+Jungle teilen Jungle-Camps, Mid-Laner bekommt alles. Gepatcht in Season 8/9",
          },
          400: {
            q: "Wie funktioniert 'Ability Queueing' und warum kann man Flash während Shen's Ult für einen Überraschungs-Taunt nutzen?",
            a: "Man buffert die Taunt-Ability während des Ult-Kanals, Flash verschiebt den Startpunkt",
          },
          500: {
            q: "Was ist der 'Phantom Dancer Bug' der dafür sorgte, dass man durch Minions laufen konnte, und wie wurde diese Mechanik später offiziell ins Spiel integriert?",
            a: "PD gab Unit-Collision-Ignore, wurde später als separate Passive/Boots implementiert",
          },
        },
      },
      {
        name: "Gaming Klassiker",
        questions: {
          100: {
            q: "In welchem Spiel sammelt ein gelber Kreis Punkte und flieht vor Geistern?",
            a: "Pac-Man",
          },
          200: { q: "Wer ist Marios Bruder?", a: "Luigi" },
          300: {
            q: "Wie heißt der Held in 'The Legend of Zelda'?",
            a: "Link",
          },
          400: {
            q: "Welches Spiel hat den Spruch 'The cake is a lie' berühmt gemacht?",
            a: "Portal",
          },
          500: {
            q: "In welchem Jahr erschien das erste Super Mario Bros.?",
            a: "1985",
          },
        },
      },
      {
        name: "Battle Royale",
        questions: {
          100: {
            q: "Wie heißt der berühmte Tanz in Fortnite, den jeder kennt?",
            a: "Floss",
          },
          200: {
            q: "Welches Battle Royale spielt auf einer Map namens 'Erangel'?",
            a: "PUBG",
          },
          300: {
            q: "Wie viele Spieler starten in einer Runde Fortnite?",
            a: "100",
          },
          400: {
            q: "Welches Apex Legends Character hat eine Drone namens D.O.C.?",
            a: "Lifeline",
          },
          500: {
            q: "Welches Spiel von Respawn Entertainment wurde 2019 als Battle Royale überraschend released?",
            a: "Apex Legends",
          },
        },
      },
      {
        name: "Minecraft",
        questions: {
          100: { q: "Wie heißt der Endboss in Minecraft?", a: "Ender Dragon" },
          200: {
            q: "Welches Material braucht man für ein Nether-Portal?",
            a: "Obsidian",
          },
          300: {
            q: "Wie heißt die feindliche Kreatur, die explodiert, wenn sie nah an dich kommt?",
            a: "Creeper",
          },
          400: {
            q: "Welchen besonderen Block braucht man, um in den End zu gelangen?",
            a: "End Portal Frame (mit Enderaugen)",
          },
          500: {
            q: "Wer hat Minecraft entwickelt (Originalentwickler)?",
            a: "Markus 'Notch' Persson",
          },
        },
      },
      {
        name: "FPS Legenden",
        questions: {
          100: {
            q: "Welche kompetitive FPS-Serie von Valve hat Dust2 als ikonische Map?",
            a: "Counter-Strike",
          },
          200: {
            q: "Wie heißt der taktische Shooter von Riot Games?",
            a: "Valorant",
          },
          300: {
            q: "Welche Waffe ist als 'One-Shot-Kill' in CS2 am bekanntesten?",
            a: "AWP",
          },
          400: {
            q: "Wie heißt der legendäre Halo-Protagonist?",
            a: "Master Chief",
          },
          500: { q: "Welches Spiel hat den 'BFG 9000' als Waffe?", a: "DOOM" },
        },
      },
      {
        name: "Gaming Rekorde",
        questions: {
          100: {
            q: "Meistverkauftes Videospiel aller Zeiten (Stand 2024)?",
            a: "Minecraft",
          },
          200: {
            q: "Welches Mobile Game wurde 2016 zum weltweiten Phänomen mit AR?",
            a: "Pokémon GO",
          },
          300: {
            q: "Welches Spiel hatte den höchsten Esports-Prizepool aller Zeiten?",
            a: "Dota 2 (The International)",
          },
          400: {
            q: "Welche Konsole von Nintendo war die meistverkaufte Handheld-Konsole?",
            a: "Nintendo DS",
          },
          500: {
            q: "Welches Spiel hält den Rekord für die meisten gleichzeitigen Spieler auf Steam?",
            a: "PUBG / CS2",
          },
        },
      },
      {
        name: "RPG & Open World",
        questions: {
          100: {
            q: "In welchem Spiel ist 'Fus Ro Dah' ein berühmter Drachenschrei?",
            a: "The Elder Scrolls V: Skyrim",
          },
          200: {
            q: "Wie heißt die Spielwelt von The Witcher 3?",
            a: "Der Kontinent / The Continent",
          },
          300: {
            q: "Welches japanische RPG hat Chocobos und Moogles?",
            a: "Final Fantasy",
          },
          400: {
            q: "Welches Open-World-Spiel von Rockstar spielt in einer Parodie von Los Angeles?",
            a: "GTA V (Los Santos)",
          },
          500: {
            q: "Wie heißt das notorisch schwere Action-RPG von FromSoftware mit dem Spruch 'You Died'?",
            a: "Dark Souls",
          },
        },
      },
      {
        name: "Gaming Memes",
        questions: {
          100: {
            q: "'It's dangerous to go alone! Take this.' – Aus welchem Spiel?",
            a: "The Legend of Zelda",
          },
          200: {
            q: "Welcher Konami-Code gibt in vielen Spielen Extras? (Richtungen)",
            a: "↑↑↓↓←→←→BA",
          },
          300: { q: "'Do a barrel roll!' – Welches Spiel?", a: "Star Fox 64" },
          400: {
            q: "Wie heißt der LoL-Streamer, der für Rage und 'Tyler1' bekannt ist?",
            a: "Tyler1",
          },
          500: {
            q: "'But can it run...' – Welches Spiel ist gemeint?",
            a: "Crysis",
          },
        },
      },
      {
        name: "Nintendo Universum",
        questions: {
          100: {
            q: "Wie heißt die Prinzessin, die Mario immer rettet?",
            a: "Peach (Prinzessin Peach)",
          },
          200: {
            q: "In welchem Spiel kämpfen Nintendo-Charaktere gegeneinander?",
            a: "Super Smash Bros.",
          },
          300: {
            q: "Welches Pokémon ist #1 im Pokédex?",
            a: "Bisasam (Bulbasaur)",
          },
          400: {
            q: "Wie heißt die Insel in Animal Crossing: New Horizons standardmäßig?",
            a: "Man benennt sie selbst",
          },
          500: {
            q: "In welchem Jahr erschien die Nintendo Switch?",
            a: "2017",
          },
        },
      },
      {
        name: "Esports & Streaming",
        questions: {
          100: {
            q: "Auf welcher Plattform wird hauptsächlich Gaming gestreamt?",
            a: "Twitch",
          },
          200: {
            q: "Wie nennt man die Zuschauer-Emotes auf Twitch mit dem Gesicht?",
            a: "Kappa / PogChamp",
          },
          300: {
            q: "Welches Kartenspiel von Blizzard hat eine große Esports-Szene?",
            a: "Hearthstone",
          },
          400: { q: "Was bedeutet 'GG' im Gaming?", a: "Good Game" },
          500: {
            q: "Welcher Streamer hatte die meisten Subscriber auf Twitch gleichzeitig (2021)?",
            a: "Ludwig",
          },
        },
      },
      {
        name: "Indie Games",
        questions: {
          100: {
            q: "Welches Indie-Spiel hat Pixel-Art und ein Skelett namens Sans?",
            a: "Undertale",
          },
          200: {
            q: "Welches Farming-Simulation Indie-Game ist die Alternative zu Harvest Moon?",
            a: "Stardew Valley",
          },
          300: {
            q: "In welchem Rogue-like kämpft man sich durch die griechische Unterwelt?",
            a: "Hades",
          },
          400: {
            q: "Welches Indie-Horror-Spiel hat sprechende Animatronics in einer Pizzeria?",
            a: "Five Nights at Freddy's",
          },
          500: {
            q: "Welches Indie-Spiel ist ein Metroidvania mit Käfern?",
            a: "Hollow Knight",
          },
        },
      },
    ],
  },

  // ===== FILM & SERIEN =====
  filme: {
    label: "🎬 Film & Serien",
    categories: [
      {
        name: "Marvel",
        questions: {
          100: { q: "Wie heißt der Hammer von Thor?", a: "Mjölnir" },
          200: {
            q: "Welcher Stein gibt Thanos die Kontrolle über die Zeit?",
            a: "Zeitstein (Time Stone)",
          },
          300: {
            q: "In welchem Film taucht Spider-Man zum ersten Mal im MCU auf?",
            a: "Captain America: Civil War",
          },
          400: {
            q: "Wie heißt Tony Starks KI-Assistent? (Vor Friday)",
            a: "J.A.R.V.I.S.",
          },
          500: {
            q: "Wer hat den Infinity Gauntlet geschmiedet?",
            a: "Eitri (auf Nidavellir)",
          },
        },
      },
      {
        name: "Disney & Pixar",
        questions: {
          100: {
            q: "Wer lebt in einer Ananas ganz tief im Meer?",
            a: "SpongeBob",
          },
          200: {
            q: "Wie heißt der Clownfisch in 'Findet Nemo'?",
            a: "Nemo / Marlin",
          },
          300: {
            q: "Welcher Disney-Film spielt in Kolumbien mit einer magischen Familie?",
            a: "Encanto",
          },
          400: { q: "Name des Cowboys in Toy Story.", a: "Woody" },
          500: {
            q: "Welcher Pixar-Film spielt in der Welt der Emotionen im Kopf eines Mädchens?",
            a: "Alles steht Kopf (Inside Out)",
          },
        },
      },
      {
        name: "Anime & Manga",
        questions: {
          100: {
            q: "Wie heißt der Protagonist von Dragon Ball?",
            a: "Son Goku",
          },
          200: {
            q: "Welcher Anime hat Titanen, die Menschen fressen?",
            a: "Attack on Titan",
          },
          300: {
            q: "Wie heißt der Pirat, der den One Piece Schatz sucht?",
            a: "Monkey D. Luffy",
          },
          400: {
            q: "In welchem Anime kämpft ein Junge mit einem Todesnotiz-Buch gegen die Polizei?",
            a: "Death Note",
          },
          500: {
            q: "Welches Studio hat 'Chihiros Reise ins Zauberland' produziert?",
            a: "Studio Ghibli",
          },
        },
      },
      {
        name: "Netflix Hits",
        questions: {
          100: {
            q: "Welche Serie spielt in der Kleinstadt Hawkins mit einer 'Upside Down' Welt?",
            a: "Stranger Things",
          },
          200: {
            q: "Koreanische Serie, in der Spieler um ihr Leben in Kinderspielen kämpfen.",
            a: "Squid Game",
          },
          300: {
            q: "Welche Serie handelt von einer Schach-Wunderkind-Waise?",
            a: "Das Damengambit (The Queen's Gambit)",
          },
          400: {
            q: "In welcher Doku-Serie geht es um einen Großkatzen-Zoobesitzer in Oklahoma?",
            a: "Tiger King",
          },
          500: {
            q: "Wie heißt die dystopische Serie basierend auf einem Buch von Margaret Atwood?",
            a: "The Handmaid's Tale",
          },
        },
      },
      {
        name: "Filmzitate",
        questions: {
          100: {
            q: "'Ich bin dein Vater.' – Welcher Film?",
            a: "Star Wars: Das Imperium schlägt zurück",
          },
          200: {
            q: "'Hasta la vista, baby.' – Welcher Film?",
            a: "Terminator 2",
          },
          300: {
            q: "'You shall not pass!' – Welcher Charakter?",
            a: "Gandalf (Herr der Ringe)",
          },
          400: {
            q: "'Here's looking at you, kid.' – Welcher Film?",
            a: "Casablanca",
          },
          500: {
            q: "'I see dead people.' – Welcher Film?",
            a: "The Sixth Sense",
          },
        },
      },
      {
        name: "Horror & Thriller",
        questions: {
          100: {
            q: "Wie heißt der Clown aus Stephen Kings 'Es'?",
            a: "Pennywise",
          },
          200: {
            q: "In welchem Film wird eine Familie von ihren eigenen Doppelgängern gejagt?",
            a: "Us (Wir)",
          },
          300: {
            q: "Welcher Horrorfilm hat die Puppe 'Annabelle'?",
            a: "The Conjuring / Annabelle",
          },
          400: {
            q: "In welchem Film muss man leise sein, um zu überleben?",
            a: "A Quiet Place",
          },
          500: {
            q: "Wer ist der Regisseur von 'Get Out' und 'Nope'?",
            a: "Jordan Peele",
          },
        },
      },
      {
        name: "Klassiker & Oscars",
        questions: {
          100: {
            q: "Welcher Film erzählt die Geschichte von Forrest, der durch die Geschichte Amerikas läuft?",
            a: "Forrest Gump",
          },
          200: {
            q: "Film über einen Gefängnisausbruch: 'Die Verurteilten' – englischer Titel?",
            a: "The Shawshank Redemption",
          },
          300: {
            q: "Welcher Film gewann den Oscar für den besten Film 2024?",
            a: "Oppenheimer",
          },
          400: {
            q: "In welchem Musical-Film singt und tanzt Ryan Gosling mit Emma Stone in LA?",
            a: "La La Land",
          },
          500: {
            q: "Welcher Film hat die höchsten Einspielergebnisse aller Zeiten?",
            a: "Avatar",
          },
        },
      },
    ],
  },

  // ===== WISSENSCHAFT & NATUR =====
  wissenschaft: {
    label: "🔬 Wissenschaft & Natur",
    categories: [
      {
        name: "Weltraum",
        questions: {
          100: { q: "Welcher Planet ist der Erde am nächsten?", a: "Venus" },
          200: { q: "Wie heißt der rote Planet?", a: "Mars" },
          300: { q: "Wie viele Planeten hat unser Sonnensystem?", a: "8" },
          400: {
            q: "Was ist ein Schwarzes Loch?",
            a: "Ein Objekt mit so starker Gravitation, dass nichts entkommt",
          },
          500: {
            q: "Wie heißt das Teleskop, das 2021 gestartet wurde (Nachfolger von Hubble)?",
            a: "James Webb Space Telescope",
          },
        },
      },
      {
        name: "Menschlicher Körper",
        questions: {
          100: { q: "Wie viele Knochen hat ein erwachsener Mensch?", a: "206" },
          200: { q: "Welches Organ pumpt Blut durch den Körper?", a: "Herz" },
          300: {
            q: "Wie heißt der längste Knochen im menschlichen Körper?",
            a: "Oberschenkelknochen (Femur)",
          },
          400: {
            q: "Welches Organ ist für die Entgiftung des Blutes zuständig?",
            a: "Leber",
          },
          500: {
            q: "Wie viele Liter Blut hat ein durchschnittlicher Erwachsener?",
            a: "ca. 5 Liter",
          },
        },
      },
      {
        name: "Tiere",
        questions: {
          100: { q: "Schnellstes Landtier der Welt.", a: "Gepard" },
          200: { q: "Welches Tier kann seine Farbe ändern?", a: "Chamäleon" },
          300: { q: "Größtes Tier, das jemals gelebt hat.", a: "Blauwal" },
          400: {
            q: "Welches Insekt kann das 50-fache seines Körpergewichts tragen?",
            a: "Ameise",
          },
          500: { q: "Welches Tier hat den höchsten Blutdruck?", a: "Giraffe" },
        },
      },
      {
        name: "Chemie & Physik",
        questions: {
          100: { q: "Chemisches Symbol für Gold.", a: "Au" },
          200: {
            q: "Wie schnell ist Lichtgeschwindigkeit (ca. in km/s)?",
            a: "ca. 300.000 km/s",
          },
          300: { q: "Welches Gas atmen wir ein?", a: "Sauerstoff (O₂)" },
          400: { q: "Was ist die Formel für Wasser?", a: "H₂O" },
          500: {
            q: "Wer hat die Relativitätstheorie aufgestellt?",
            a: "Albert Einstein",
          },
        },
      },
      {
        name: "Erfindungen",
        questions: {
          100: {
            q: "Wer hat die Glühbirne (praktisch) erfunden?",
            a: "Thomas Edison",
          },
          200: {
            q: "In welchem Jahr wurde das Internet (ARPANET) erfunden?",
            a: "1969",
          },
          300: {
            q: "Wer hat das Telefon erfunden?",
            a: "Alexander Graham Bell",
          },
          400: {
            q: "Welches Unternehmen hat den ersten kommerziellen Mikroprozessor hergestellt?",
            a: "Intel (Intel 4004)",
          },
          500: {
            q: "Wer gilt als Erfinder des Buchdrucks in Europa?",
            a: "Johannes Gutenberg",
          },
        },
      },
    ],
  },
};

module.exports = jeopardyThemes;
