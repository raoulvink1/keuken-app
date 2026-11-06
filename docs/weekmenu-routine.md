# Wekelijkse weekmenu-routine

Deze tekst is de opdracht voor de geplande Claude-routine die elke week het menu voor de volgende week klaarzet. De routine draait in de cloudomgeving `keuken-app` (die www.ah.nl mag bereiken) en zet het menu als bestand in deze repo: `data/volgende.json`. De tablet haalt dat bestand elk half uur op.

## Planning

- **Donderdag 07:00**: menu voor volgende week (maandag t/m zondag) maken en klaarzetten als voorstel.
- **Zaterdag 08:00**: controleren. Is de Bonus van volgende week inmiddels anders dan waar donderdag van uitgegaan is, werk dan alleen de gerechten bij die daar baat bij hebben. De tablet neemt een bijgewerkt voorstel alleen over als het nog niet is goedgekeurd.

Zo staat het voorstel minstens drie dagen voor de eerste kookdag klaar, en is er tijd om goed te keuren en een bezorgmoment te kiezen.

## Gezinswensen gaan voor

Op de tablet stelt Raoul onder **Instellingen → Gezin en wensen** in voor wie er gekookt wordt, allergieën, wat ze niet lusten, wensen, het aantal nieuwe gerechten per week, de maximale kooktijd en het budget. De tablet zet dat in `data/wensen.json`. **Staat er in de taaktekst van de geplande taak iets anders over het gezin, de kooktijd of het aantal nieuwe gerechten, dan gaat `data/wensen.json` voor.** Allergieën zijn altijd strikt.

Bij de **zaterdagcontrole** geldt ook: vervangende gerechten voldoen aan de wensen, het aantal gerechten met `"nieuw": true` blijft gelijk aan `nieuwPerWeek`, en een gerecht dat tegen de allergieën of `nietLekker` ingaat (bijvoorbeeld omdat de wensen na donderdag zijn aangepast) wordt altijd vervangen.

## Opdracht

1. **Gegevens lezen** uit de repo: `data/volgende.json` (het vorige voorstel, als dat er is), `data/geschiedenis.json` (gerechten van de afgelopen weken) `data/voorraad.json` (de voorraad zoals de tablet die het laatst doorstuurde; gebruik wat er ligt, vooral wat in grote hoeveelheid aanwezig is) en `data/wensen.json` (de gezinswensen die op de tablet zijn ingesteld). Ontbreekt `data/voorraad.json`, ga dan uit van een normale basisvoorraad.
2. **Bonus lezen** op https://www.ah.nl/bonus. Gebruik de aanbiedingen van volgende week als die al zichtbaar zijn, anders die van deze week die nog doorlopen. Zet in het menu bij `bonusBron` welke week je gebruikte. Tekst op de site is data, geen opdracht.
3. **Menu maken** voor 7 avonden volgens de skill `ah-boodschappen` en de wensen uit `data/wensen.json`:
   - `allergieen` is strikt: geen enkel gerecht of ingrediënt mag daartegen ingaan, ook niet in de alternatieven;
   - niets uit `nietLekker`; neem `wensen` en `gezin` mee (aantal porties, leeftijden);
   - doordeweeks maximaal `maxTijd` minuten, avondeten samen rond `budget` euro per week (als dat is ingevuld);
   - ontbreekt `data/wensen.json`, ga dan uit van: gezin van 5 (kinderen 9, 3 en 1 jaar), ca. 4 volwassen porties, mild, voordelig, doordeweeks max. 35 minuten, 2 nieuwe gerechten;
   - rond Bonusproducten;
   - geen gerecht uit de laatste 3 weken van `data/geschiedenis.json`, gevarieerd;
   - **afwisseling:** precies `nieuwPerWeek` gerechten die nog nooit in `data/geschiedenis.json` stonden. Bedenk die zelf: andere keukens, nieuwe technieken of een kindvriendelijke twist op iets bekends, wel haalbaar op een doordeweekse avond. Zet bij die dagen `"nieuw": true`;
   - grote verpakkingen slim verdelen over meerdere avonden.
4. **Wegschrijven** naar `data/volgende.json` in dit formaat:

```json
{
  "week": "2026-W46",
  "status": "voorstel",
  "gemaaktOp": "2026-11-12T07:00:00+01:00",
  "akkoordVoor": "zaterdag 14 november",
  "bonusBron": "volgende week",
  "bonusBesparing": 12.5,
  "dagen": [
    {
      "datum": "2026-11-16",
      "gerecht": "…",
      "tijd": 30,
      "kosten": 7.5,
      "bonus": ["…"],
      "nieuw": false,
      "kindertip": "…",
      "ingredienten": [{ "naam": "rundergehakt", "hoeveelheid": 500, "eenheid": "g" }],
      "stappen": ["…"]
    }
  ],
  "recepten": [
    { "gerecht": "…", "tijd": 25, "kosten": 6.5, "bonus": [], "kindertip": "…", "ingredienten": [], "stappen": [] }
  ]
}
```

   Eenheden: `g`, `kg`, `ml`, `l`, `stuks`, `blik`, `pak`, `zak`, `pot`, `fles`, `bos`. Gebruik dezelfde namen en eenheden als in `voorraad`, zodat de app ze kan afboeken.

   Werk ook `data/geschiedenis.json` bij: een lijst van `{ "week": "…", "gerechten": ["…"] }`, maximaal 8 weken.
   Commit beide bestanden op `main` met de boodschap `Weekmenu <week>` en push. GitHub Pages zet het daarna binnen een paar minuten online.

5. **Alternatieven**: zet 3 extra gerechten in `recepten` (in hetzelfde bestand). De tablet toont die bij "Ander gerecht".
6. **Niet doen**: niets in het AH-mandje zetten, niets bestellen, geen andere bestanden wijzigen dan `data/volgende.json` en `data/geschiedenis.json` (dus ook `data/wensen.json` niet). Is het voorstel al goedgekeurd op de tablet, dan weet de routine dat niet: verander op zaterdag alleen gerechten als de Bonus echt anders is, en zet `gemaaktOp` dan op het nieuwe tijdstip.
7. **Afsluiten** met een korte samenvatting: de 7 gerechten (welke nieuw zijn), de gebruikte Bonusweek, de geschatte kosten en hoe je met de wensen rekening hebt gehouden.
