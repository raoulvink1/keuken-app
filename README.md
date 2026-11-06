# Keukenbord

Web-app voor een Android-tablet aan de keukenmuur: weekmenu op basis van de AH Bonus, recept van de dag, voorraad, vaste huishoudproducten, schoolspullen en een boodschappenlijst die klaarstaat voor het AH-mandje. Na 3 minuten niets doen verschijnt een klok als screensaver.

## Wat er nu in zit (stap 1)

- **Vandaag**: het gerecht van de dag met ingrediënten en stappen. "Ik ga dit koken" haalt de ingrediënten automatisch uit de voorraad (met ongedaan maken).
- **Weekmenu**: voorstel voor 7 dagen, gerechten wisselen of schrappen, akkoord geven.
- **Boodschappen**: menu + school + vaste producten + eigen artikelen, min wat er in huis is. "Lijst klaarzetten" maakt de bestelling klaar voor het AH-mandje.
- **Voorraad**, **Huishouden** (producten met een interval, zoals vaatwastabletten) en **School** (per kind per dag).
- **Klok-screensaver** die langzaam verschuift (tegen inbranden) en 's nachts dimt.

Gegevens (voorraad, akkoord, lijst) staan lokaal op de tablet. De voorbeeldweek staat in `data/voorbeeld.json`.

## Weekmenu van Claude

Elke donderdag om 07:00 zet een geplande Claude-routine het menu voor volgende week in `data/volgende.json` (zaterdag 08:00 volgt een controle). De tablet kijkt elk half uur of er een nieuw menu is, toont dan een melding en een tab "Volgende week", en schuift het menu op maandag door. De opdracht voor de routine staat in `docs/weekmenu-routine.md`.

## Op de tablet zetten

1. Zet GitHub Pages aan voor deze repo (Settings → Pages → branch `main`, map `/`).
2. Open de Pages-link in Chrome op de tablet en kies **Toevoegen aan startscherm**. De app opent dan op volledig scherm.
3. Tip: zet in Android de schermtime-out op "nooit" tijdens opladen, of gebruik schermvastzetten.

## Lokaal draaien

```
python3 -m http.server 8000
```
en open http://localhost:8000.

## Volgende stappen

- Stap 3: goedgekeurde lijst automatisch in het AH-mandje; afrekenen in de AH-app.
