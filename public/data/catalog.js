window.CATALOG = {
  "shop": {
    "name": "Bricks",
    "claim": "Klemmbausteine & Pokémon TCG",
    "street": "Marktstraße 5",
    "city": "12345 Musterstadt",
    "phone": "01234 567890",
    "email": "hallo@bricks-laden.de",
    "whatsapp": "491511234567",
    "shipping": { "carrier": "DHL", "cost": 4.99, "freeFrom": 50, "days": "1–3 Werktage", "country": "Deutschland" }
  },

  "hours": { "1": ["10:00", "19:00"], "2": ["10:00", "19:00"], "3": ["10:00", "19:00"], "4": ["10:00", "19:00"], "5": ["10:00", "19:00"], "6": ["10:00", "18:00"], "0": null },

  "brands": [
    { "id": "lego", "name": "LEGO®", "desc": "Der Klassiker – alle aktuellen Neuheiten, von Stadt bis Technik.", "color": "#d92b2b" },
    { "id": "cada", "name": "CaDA", "desc": "Technik-Modelle und ferngesteuerte Fahrzeuge mit Motoren.", "color": "#2d2d2d" },
    { "id": "lumibricks", "name": "Lumibricks", "desc": "Detailreiche Modelle für Sammler und Vitrinen.", "color": "#c9a227" },
    { "id": "cobi", "name": "COBI", "desc": "Historische Fahrzeuge, Schiffe und Flugzeuge.", "color": "#3d5a3a" },
    { "id": "mouldking", "name": "Mould King", "desc": "Große Technik- und RC-Modelle zum Selbstbauen.", "color": "#ff8a1f" },
    { "id": "pokemon", "name": "Pokémon TCG", "desc": "Booster, Displays, Top-Trainer-Boxen & Zubehör.", "color": "#ffcb05" }
  ],

  "themes": [
    { "id": "city", "label": "Stadt & Rettung", "colors": ["#d92b2b", "#2b6fd9", "#f2f2f2"] },
    { "id": "technic", "label": "Technik & RC", "colors": ["#2d2d2d", "#ff8a1f", "#9aa3ad"] },
    { "id": "friends", "label": "Freundschaft & Abenteuer", "colors": ["#e26bb3", "#4cc9c0", "#ffd166"] },
    { "id": "botanic", "label": "Blumen & Pflanzen", "colors": ["#1fae7a", "#f25c78", "#ffc93c"] },
    { "id": "adults", "label": "Für Erwachsene & Sammler", "colors": ["#1f2a44", "#c9a227", "#8a5a44"] },
    { "id": "speed", "label": "Rennwagen", "colors": ["#ffc93c", "#151515", "#d92b2b"] },
    { "id": "space", "label": "Weltraum", "colors": ["#3a2f8f", "#9ad0ff", "#f2f2f2"] },
    { "id": "junior", "label": "Kleinkinder", "colors": ["#ffc93c", "#2b6fd9", "#1fae7a"] },
    { "id": "history", "label": "Geschichte & Klassiker", "colors": ["#3d5a3a", "#8a5a44", "#c9b89a"] }
  ],

  "tcgTypes": [
    { "id": "booster", "label": "Booster & Bundles" },
    { "id": "display", "label": "Displays" },
    { "id": "etb", "label": "Top-Trainer-Boxen" },
    { "id": "collection", "label": "Kollektionen & Decks" },
    { "id": "accessories", "label": "Zubehör" }
  ],

  "products": [
    { "id": "p01", "cat": "bricks", "brand": "lego", "theme": "city", "name": "Feuerwache mit Drehleiter", "age": 6, "pieces": 843, "price": 89.99, "status": "neu", "released": "2026-09-01", "stock": 7, "desc": "Große Wache mit ausfahrbarer Drehleiter, Garage und Einsatzzentrale – ideal zum Nachspielen echter Einsätze." },
    { "id": "p02", "cat": "bricks", "brand": "lego", "theme": "city", "name": "Polizeistation mit Hubschrauber", "age": 6, "pieces": 668, "price": 69.99, "status": "bestseller", "released": "2026-08-01", "stock": 12, "desc": "Mit Zellentrakt, Landeplatz und Streifenwagen." },
    { "id": "p03", "cat": "bricks", "brand": "lego", "theme": "technic", "name": "Supersportwagen 1:8", "age": 18, "pieces": 3620, "price": 449.99, "status": "neu", "released": "2026-09-15", "stock": 2, "desc": "Funktionierendes Getriebe, Lenkung und V8-Motor mit beweglichen Kolben – ein Projekt für viele Abende." },
    { "id": "p05", "cat": "bricks", "brand": "lego", "theme": "friends", "name": "Baumhaus-Café am See", "age": 8, "pieces": 912, "price": 79.99, "status": "neu", "released": "2026-09-10", "stock": 9, "desc": "Zwei Etagen, Bootssteg und Hängebrücke – zum Bauen und Weiterspielen." },
    { "id": "p06", "cat": "bricks", "brand": "lego", "theme": "friends", "name": "Tierrettungsstation", "age": 7, "pieces": 512, "price": 49.99, "status": "bestseller", "released": "2026-07-15", "stock": 15, "desc": "Mit Tierarztpraxis, Gehege und Rettungsfahrzeug." },
    { "id": "p07", "cat": "bricks", "brand": "lego", "theme": "botanic", "name": "Wildblumenstrauß", "age": 18, "pieces": 939, "price": 59.99, "status": "neu", "released": "2026-09-01", "stock": 11, "desc": "Blumen, die nie verwelken – Mohn, Lupinen und Gräser zum Arrangieren." },
    { "id": "p09", "cat": "bricks", "brand": "lego", "theme": "adults", "name": "Historisches Rathaus", "age": 18, "pieces": 4217, "price": 299.99, "status": "bald", "released": "2026-11-01", "stock": 10, "desc": "Detailreiche Fassade, drei Etagen mit Innenleben – modular mit anderen Gebäuden kombinierbar." },
    { "id": "p11", "cat": "bricks", "brand": "lego", "theme": "speed", "name": "Rennwagen-Duo", "age": 9, "pieces": 628, "price": 39.99, "status": "neu", "released": "2026-09-01", "stock": 14, "desc": "Zwei Rennwagen im Doppelpack – perfekt für Wettrennen auf dem Küchentisch." },
    { "id": "p13", "cat": "bricks", "brand": "lego", "theme": "space", "name": "Raumstation mit Andockmodul", "age": 9, "pieces": 1178, "price": 109.99, "status": "bald", "released": "2026-10-15", "stock": 8, "desc": "Modulare Station, Andockschleuse und Rover – bereit für die Mission." },
    { "id": "p15", "cat": "bricks", "brand": "lego", "theme": "junior", "name": "Bauernhof mit Tieren", "age": 2, "pieces": 88, "price": 44.99, "status": "bestseller", "released": "2026-02-01", "stock": 6, "desc": "Große Steine für kleine Hände – mit Traktor, Scheune und vielen Tieren." },
    { "id": "p17", "cat": "bricks", "brand": "cada", "theme": "technic", "name": "Ferngesteuerter Offroad-Truck", "age": 10, "pieces": 1450, "price": 99.99, "status": "neu", "released": "2026-09-05", "stock": 5, "desc": "Allradantrieb, Federung und App-Steuerung – baut sich wie ein Technik-Modell, fährt wie ein RC-Auto." },
    { "id": "p18", "cat": "bricks", "brand": "cada", "theme": "speed", "name": "Rallye-Sportwagen mit Fernsteuerung", "age": 8, "pieces": 540, "price": 49.99, "status": "bestseller", "released": "2026-06-01", "stock": 9, "desc": "Kompakter Flitzer mit Motor und Fernbedienung." },
    { "id": "p19", "cat": "bricks", "brand": "lumibricks", "theme": "adults", "name": "Modulares Eckhaus", "age": 14, "pieces": 2100, "price": 129.99, "status": "neu", "released": "2026-09-12", "stock": 4, "desc": "Detailreiches Stadthaus mit Laden im Erdgeschoss – ein Blickfang für jede Vitrine." },
    { "id": "p20", "cat": "bricks", "brand": "lumibricks", "theme": "adults", "name": "Bibliothek mit Innenleben", "age": 14, "pieces": 2480, "price": 139.99, "status": "bald", "released": "2026-10-20", "stock": 6, "desc": "Drei Etagen voller Bücherregale, Leseecken und Details." },
    { "id": "p21", "cat": "bricks", "brand": "cobi", "theme": "history", "name": "Oldtimer-Cabrio 1:12", "age": 14, "pieces": 1210, "price": 89.99, "status": "neu", "released": "2026-08-25", "stock": 3, "desc": "Klassischer Roadster mit Chromdetails und aufklappbarer Motorhaube." },
    { "id": "p22", "cat": "bricks", "brand": "cobi", "theme": "history", "name": "Historisches Segelschiff", "age": 14, "pieces": 1850, "price": 119.99, "status": "bestseller", "released": "2026-04-01", "stock": 5, "desc": "Dreimaster mit Takelage und Beibooten – ein Modell für Geduldige." },
    { "id": "p23", "cat": "bricks", "brand": "mouldking", "theme": "technic", "name": "Ferngesteuerter Bagger", "age": 10, "pieces": 1830, "price": 149.99, "status": "neu", "released": "2026-09-08", "stock": 3, "desc": "Vier Motoren für Kette, Arm, Schaufel und Drehkranz – echtes Baustellen-Feeling." },
    { "id": "p24", "cat": "bricks", "brand": "mouldking", "theme": "technic", "name": "Mobilkran mit Motoren", "age": 12, "pieces": 2600, "price": 179.99, "status": "wenige", "released": "2026-05-01", "stock": 1, "desc": "Ausfahrbarer Ausleger, Stützen und Seilwinde – motorisiert und fernsteuerbar." },

    { "id": "t01", "cat": "tcg", "brand": "pokemon", "type": "booster", "name": "Booster – aktuelle Hauptserie", "price": 5.49, "status": "bestseller", "released": "2026-08-08", "stock": 180, "limit": 36, "desc": "Ein Booster mit 10 Karten der aktuellen Hauptserie." },
    { "id": "t02", "cat": "tcg", "brand": "pokemon", "type": "booster", "name": "Booster-Bundle (6 Packs)", "price": 32.99, "status": "neu", "released": "2026-08-08", "stock": 20, "limit": 4, "desc": "Sechs Booster der aktuellen Hauptserie im Bundle." },
    { "id": "t03", "cat": "tcg", "brand": "pokemon", "type": "display", "name": "Booster-Display (36 Packs) – aktuelle Hauptserie", "price": 169.99, "status": "bestseller", "released": "2026-08-08", "stock": 8, "limit": 2, "desc": "Das komplette Display mit 36 Boostern – für Sammler und alle, die richtig öffnen wollen." },
    { "id": "t04", "cat": "tcg", "brand": "pokemon", "type": "etb", "name": "Top-Trainer-Box – aktuelle Hauptserie", "price": 54.99, "status": "neu", "released": "2026-08-08", "stock": 14, "limit": 3, "desc": "Mit Boostern, Promokarte, Kartenhüllen, Energiekarten, Würfeln und Aufbewahrungsbox." },
    { "id": "t05", "cat": "tcg", "brand": "pokemon", "type": "collection", "name": "Premium-Kollektion mit Promokarten", "price": 49.99, "status": "neu", "released": "2026-09-19", "stock": 6, "limit": 3, "desc": "Mehrere Booster, exklusive Promokarten und eine Sammelfigur." },
    { "id": "t06", "cat": "tcg", "brand": "pokemon", "type": "collection", "name": "Starter-Deck für Einsteiger", "price": 14.99, "status": "bestseller", "released": "2026-03-01", "stock": 25, "desc": "Sofort spielbereites Deck mit Anleitung – der perfekte Einstieg ins Spiel." },
    { "id": "t07", "cat": "tcg", "brand": "pokemon", "type": "display", "name": "Vorbestellung: Display – nächste Erweiterung", "price": 179.99, "status": "bald", "released": "2026-11-14", "stock": 30, "limit": 2, "desc": "Sichere dir ein Display der nächsten Erweiterung – garantiert zum Release-Tag." },
    { "id": "t08", "cat": "tcg", "brand": "pokemon", "type": "etb", "name": "Vorbestellung: Top-Trainer-Box – nächste Erweiterung", "price": 57.99, "status": "bald", "released": "2026-11-14", "stock": 40, "limit": 2, "desc": "Die Top-Trainer-Box der nächsten Erweiterung – reserviert zum Release." },
    { "id": "t09", "cat": "tcg", "brand": "pokemon", "type": "accessories", "name": "Kartenhüllen (65 Stück)", "price": 7.99, "status": "bestseller", "released": "2026-01-01", "stock": 60, "desc": "Passgenaue Hüllen zum Schutz deiner Karten." },
    { "id": "t10", "cat": "tcg", "brand": "pokemon", "type": "accessories", "name": "Sammelordner mit 9er-Taschen", "price": 24.99, "status": "neu", "released": "2026-09-01", "stock": 15, "desc": "Platz für 360 Karten, seitlich einlegbar." },
    { "id": "t11", "cat": "tcg", "brand": "pokemon", "type": "accessories", "name": "Deckbox", "price": 5.99, "status": "bestseller", "released": "2026-01-01", "stock": 40, "desc": "Stabile Box für bis zu 80 Karten in Hüllen." },
    { "id": "t12", "cat": "tcg", "brand": "pokemon", "type": "accessories", "name": "Toploader-Set (25 Stück)", "price": 6.49, "status": "neu", "released": "2026-07-01", "stock": 30, "desc": "Feste Schutzhüllen für deine wertvollsten Karten." }
  ],

  "tcgReleases": [
    { "name": "Nächste Hauptserien-Erweiterung", "date": "2026-11-14", "products": ["t07", "t08"], "note": "Vorbestellungen liegen am Release-Tag zur Abholung bereit bzw. gehen am Vortag in den Versand." },
    { "name": "Spezial-Set zum Jahresbeginn", "date": "2027-01-23", "products": [], "note": "Vorbestellung startet ca. 6 Wochen vorher." }
  ],

  "showrooms": [
    { "id": "burg", "title": "Ritterburg & Marktplatz", "start": "2026-05-25", "weeks": 7, "colors": ["#8a5a44", "#9aa3ad", "#1fae7a"], "teaser": "Mittelalterliches Treiben auf 4 Quadratmetern.", "desc": "Eine Burg mit Zugbrücke, ein belebter Marktplatz und versteckte Geheimgänge.", "bricks": 38000, "hours": 260, "highlights": ["Zugbrücke zum Selbstbedienen", "Suchspiel: 12 versteckte Drachen", "Bau-Station „Deine eigene Burgmauer“"] },
    { "id": "zukunft", "title": "Stadt der Zukunft", "start": "2026-07-13", "weeks": 8, "colors": ["#2b6fd9", "#4cc9c0", "#f2f2f2"], "teaser": "Schwebebahnen, Solardächer und grüne Hochhäuser.", "desc": "Wie wohnen wir 2080? Eine Stadt mit Magnetbahn, vertikalen Gärten und Drohnen-Post.", "bricks": 45000, "hours": 310, "highlights": ["Fahrende Magnetbahn", "Besucher-Hochhaus: jeder baut ein Stockwerk", "Nachtmodus mit LED-Beleuchtung"] },
    { "id": "meer", "title": "Unterwasserwelt", "start": "2026-09-07", "weeks": 9, "colors": ["#1b4f8a", "#4cc9c0", "#ffc93c"], "teaser": "Ein 3 Meter langes Riff aus über 40.000 Steinen.", "desc": "Tauch ab: Korallenriff, versunkenes Schiff und eine Forschungsstation am Meeresgrund – mit vielen Details zum Entdecken.", "bricks": 42000, "hours": 290, "highlights": ["3 m langes Korallenriff", "Suchspiel: Finde die 20 Seepferdchen", "Mitmach-Riff: Bau deinen eigenen Fisch & setz ihn ins Riff"] },
    { "id": "winterdorf", "title": "Winterdorf", "start": "2026-11-09", "weeks": 7, "colors": ["#f2f2f2", "#d92b2b", "#1fae7a"], "teaser": "Lichterglanz, Eisbahn und eine fahrende Dampflok.", "desc": "Verschneite Häuser, ein Weihnachtsmarkt und eine Lok, die ihre Runden dreht – unser Beitrag zur Adventszeit.", "bricks": 36000, "hours": 240, "highlights": ["Fahrende Dampflok", "Adventskalender-Suche: jeden Tag ein neues Detail", "Wunschzettel-Wand für Kinder"] },
    { "id": "dino", "title": "Dino-Expedition", "start": "2026-12-28", "weeks": 10, "colors": ["#1fae7a", "#8a5a44", "#ff8a1f"], "teaser": "Urzeit-Dschungel mit lebensgroßem Dino-Kopf.", "desc": "Ein Forschungscamp mitten im Dschungel – und ein Dinokopf in Originalgröße, mit dem man Fotos machen kann.", "bricks": 51000, "hours": 360, "highlights": ["Dino-Kopf in Lebensgröße", "Fossilien-Suche für Kinder", "Forscher-Ausweis zum Mitnehmen"] },
    { "id": "garten", "title": "Frühlingsgarten", "start": "2027-03-08", "weeks": 6, "colors": ["#f25c78", "#1fae7a", "#ffc93c"], "teaser": "Ein Garten, der niemals verblüht.", "desc": "Hunderte Steck-Blumen, ein Gewächshaus und ein Schmetterlingspavillon.", "bricks": 30000, "hours": 200, "highlights": ["Blumenwand zum Mitgestalten", "Tausch-Ecke für Pflanzen-Sets", "Fotospot im Gewächshaus"] }
  ],

  "events": [
    { "id": "e01", "title": "Kinder-Baunachmittag", "audience": "kinder", "date": "2026-10-03", "time": "14:00", "end": "16:00", "age": "6–10 Jahre", "price": 0, "spots": 12, "taken": 9, "desc": "Gemeinsam bauen wir zum Thema des aktuellen Showrooms – diesmal: Meeresbewohner. Alle Steine sind vorhanden.", "bring": "Nur gute Laune" },
    { "id": "e02", "title": "Neuheiten-Abend", "audience": "alle", "date": "2026-10-09", "time": "18:00", "end": "20:00", "age": "für alle", "price": 0, "spots": 40, "taken": 17, "desc": "Wir packen die Herbst-Neuheiten aller Marken aus, bauen live und verlosen ein Set unter allen Gästen.", "bring": "–" },
    { "id": "e11", "title": "Pokémon TCG: Spieltreff für Einsteiger", "audience": "tcg", "date": "2026-10-10", "time": "15:00", "end": "18:00", "age": "ab 8 Jahren", "price": 0, "spots": 20, "taken": 6, "desc": "Wir erklären die Regeln und spielen gemeinsam – Leih-Decks sind vorhanden. Eltern sind herzlich willkommen.", "bring": "Eigenes Deck (optional)" },
    { "id": "e03", "title": "Speed-Build-Challenge", "audience": "familie", "date": "2026-10-17", "time": "15:00", "end": "17:00", "age": "ab 8 Jahren, Teams bis 3", "price": 5, "spots": 10, "taken": 10, "desc": "Wer baut das Set am schnellsten? Teams treten gegeneinander an – mit Siegerehrung und kleinen Preisen.", "bring": "Teamname" },
    { "id": "e04", "title": "Herbstferien-Workshop: Roboter bauen", "audience": "kinder", "date": "2026-10-20", "time": "10:00", "end": "13:00", "age": "9–13 Jahre", "price": 49, "spots": 8, "taken": 5, "days": 3, "desc": "An drei Vormittagen bauen und programmieren wir kleine Roboter mit Motoren und Sensoren.", "bring": "Trinkflasche & Snack" },
    { "id": "e05", "title": "Feierabend-Bauen", "audience": "erwachsene", "date": "2026-10-23", "time": "19:00", "end": "22:00", "age": "ab 18 Jahren", "price": 12, "spots": 16, "taken": 11, "desc": "Bauen, fachsimpeln, Kaltgetränk: der Treffpunkt für erwachsene Fans aller Marken. Bring dein aktuelles Projekt mit.", "bring": "Eigenes Projekt (optional)" },
    { "id": "e12", "title": "Pokémon TCG: Tauschabend", "audience": "tcg", "date": "2026-10-24", "time": "17:00", "end": "20:00", "age": "für alle", "price": 0, "spots": 30, "taken": 12, "desc": "Karten tauschen, Sammlungen zeigen, Fragen stellen – mit Tauschtischen und Hüllen gegen Knicke.", "bring": "Tauschkarten in Hüllen" },
    { "id": "e06", "title": "Steine-Tauschbörse", "audience": "alle", "date": "2026-11-07", "time": "11:00", "end": "15:00", "age": "für alle", "price": 0, "spots": 60, "taken": 22, "desc": "Tausche, verkaufe oder finde fehlende Teile – mit Sortiertischen und Teile-Waage.", "bring": "Steine zum Tauschen" },
    { "id": "e07", "title": "Showroom-Eröffnung: Winterdorf", "audience": "alle", "date": "2026-11-09", "time": "17:00", "end": "19:00", "age": "für alle", "price": 0, "spots": 50, "taken": 14, "desc": "Der neue Showroom öffnet! Mit Führung durch die Baumeister, Punsch und der ersten Fahrt der Dampflok.", "bring": "–" },
    { "id": "e13", "title": "Pokémon TCG: Release-Abend", "audience": "tcg", "date": "2026-11-13", "time": "18:00", "end": "21:00", "age": "für alle", "price": 0, "spots": 40, "taken": 18, "desc": "Am Abend vor dem Release: Vorbestellungen abholen, gemeinsam öffnen und die besten Pulls feiern.", "bring": "Abholbestätigung" },
    { "id": "e08", "title": "Kinder-Baunachmittag", "audience": "kinder", "date": "2026-11-14", "time": "14:00", "end": "16:00", "age": "6–10 Jahre", "price": 0, "spots": 12, "taken": 3, "desc": "Diesmal bauen wir Häuser für das Winterdorf – die schönsten ziehen in den Showroom ein.", "bring": "Nur gute Laune" },
    { "id": "e14", "title": "Pokémon TCG: Kleines Turnier", "audience": "tcg", "date": "2026-11-21", "time": "14:00", "end": "18:00", "age": "ab 10 Jahren", "price": 5, "spots": 24, "taken": 7, "desc": "Freundliches Turnier im Schweizer System – mit Booster-Preisen für alle Teilnehmenden.", "bring": "Spielbereites Deck (60 Karten)" },
    { "id": "e10", "title": "Feierabend-Bauen", "audience": "erwachsene", "date": "2026-11-27", "time": "19:00", "end": "22:00", "age": "ab 18 Jahren", "price": 12, "spots": 16, "taken": 4, "desc": "Der monatliche Bauabend für Erwachsene – diesmal mit Mini-Wettbewerb „Bestes Wintermotiv“.", "bring": "Eigenes Projekt (optional)" },
    { "id": "e09", "title": "Familien-Adventsbauen", "audience": "familie", "date": "2026-12-05", "time": "14:00", "end": "17:00", "age": "für Familien", "price": 8, "spots": 20, "taken": 6, "desc": "Wir bauen gemeinsam Weihnachtsdeko – Sterne, Tannen und kleine Geschenke zum Mitnehmen.", "bring": "–" }
  ],

  "bookable": [
    { "id": "birthday", "title": "Kindergeburtstag bei Bricks", "price": "ab 15 € pro Kind", "info": "2 Stunden Bauen im Showroom, Bau-Challenge, kleines Geschenk für jedes Kind. Für 6–12 Kinder, Sa & So." },
    { "id": "team", "title": "Team-Event für Firmen", "price": "auf Anfrage", "info": "Kreativ-Workshop mit Steinen für Teams bis 20 Personen – bei uns oder bei euch." }
  ]
};
