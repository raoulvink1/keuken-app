# AH-mandje vullen vanaf de tablet

Als je op de tablet **Lijst klaarzetten** tikt, zet de tablet de bestelling in `data/bestelling.json` en de voorraad in `data/voorraad.json`. Claude vult daarna je AH-mandje in de Claude desktop-app, met de skill `ah-boodschappen` en de ingebouwde browser waarin je bij AH bent ingelogd.

## Eenmalig: GitHub-sleutel voor de tablet

1. Ga naar https://github.com/settings/personal-access-tokens/new (fine-grained token).
2. Naam: `keukentablet`. Vervaldatum: bijvoorbeeld 1 jaar.
3. Repository access: **Only select repositories**, kies `keuken-app`.
4. Permissions → Repository permissions → **Contents: Read and write**. Verder niets.
5. Klik **Generate token** en kopieer de sleutel (begint met `github_pat_`).
6. Op de tablet: **Instellingen** → **App** → plak de sleutel → **Sleutel opslaan**.

De sleutel blijft op de tablet en kan alleen deze repo wijzigen. Intrekken kan altijd op dezelfde GitHub-pagina.

## Opdracht voor Claude (desktop-app)

Een geplande taak in de desktop-app kan niet starten op een GitHub-gebeurtenis, alleen op een tijdstip. Zet hem daarom op **elk uur** (bijvoorbeeld van 08:00 tot 22:00). Is er niets nieuws, dan stopt de taak meteen. Zo staat je mandje uiterlijk een uur na **Lijst klaarzetten** vol. De desktop-app moet daarvoor aan staan.

Tekst voor de taak:

> Gebruik de skill ah-boodschappen. Lees https://raw.githubusercontent.com/raoulvink1/keuken-app/main/data/bestelling.json, https://raw.githubusercontent.com/raoulvink1/keuken-app/main/data/mandje.json en https://raw.githubusercontent.com/raoulvink1/keuken-app/main/data/bezorging.json (de laatste twee mogen ontbreken).
> Stop direct met één zin "Niets te doen" als `status` in bestelling.json niet "klaar" is, of als `klaarOp` ouder is dan 7 dagen.
> **Controle op de bestelling:** is `klaarOp` in mandje.json gelijk aan `klaarOp` in bestelling.json (het mandje is dus al gevuld), vul dan niets. Kijk alleen op https://www.ah.nl/mijn/bestellingen (alleen lezen, niets wijzigen of annuleren) of er sinds `gevuldOp` uit mandje.json een bestelling is geplaatst. Zo ja, en staat bezorging.json voor deze `klaarOp` nog niet op "besteld" met hetzelfde bezorgmoment, of is de bestelling inmiddels bezorgd terwijl bezorging.json nog "besteld" zegt, schrijf dan `data/bezorging.json` op `main` (commit "Bezorging bijgewerkt"):
> `{ "klaarOp": <klaarOp uit bestelling.json>, "status": "besteld" of "bezorgd", "bestelnummer": "…", "bezorgmoment": { "van": <ISO met tijdzone>, "tot": <ISO met tijdzone> }, "totaal": <bedrag in euro>, "items": [{ "naam": <naam uit bestelling.json>, "hoeveelheid": <wat er echt besteld is, in de eenheid uit bestelling.json>, "eenheid": "…", "groep": <groep uit bestelling.json> }], "nietGeleverd": ["…"] }`
> Vul `items` met de hoeveelheden die echt besteld zijn (een pak van 500 g als er 300 g nodig was, wordt 500 g). Zet in `nietGeleverd` wat AH na bezorging als niet geleverd meldt. Is er nog geen bestelling, of is er niets veranderd, sluit dan af met één zin en schrijf niets.
> **Mandje vullen:** is het mandje nog niet gevuld voor deze `klaarOp`: zet alle `items` in mijn AH-mandje (stap 4 van de skill: huidig mandje eerst lezen, geen dubbelingen, Bonusvariant waar het past, aantallen omrekenen naar verpakkingen). Gebruik het weekmenu uit hetzelfde bestand alleen als context, maak geen nieuw menu. Reken niet af en kies geen bezorgmoment.
> Schrijf daarna `data/mandje.json` op branch `main` van github.com/raoulvink1/keuken-app (commit "Mandje gevuld"), in dit formaat:
> `{ "klaarOp": <klaarOp uit bestelling.json>, "status": "gevuld", "gevuldOp": <nu, ISO>, "artikelen": <aantal>, "totaal": <bedrag in euro>, "besparing": <Bonuskorting in euro>, "vervangingen": [{ "van": "…", "naar": "…" }], "nietGevonden": ["…"] }`
> Sluit af met de samenvatting uit de skill.

Zodra `data/mandje.json` er staat, ziet de tablet binnen een paar minuten **Je AH-mandje is gevuld**, met de knop **Bestelling afronden bij AH**. Die opent je AH-mandje; daar kies je een bezorgmoment en reken je zelf af. Claude rekent nooit af.

## Controle: is het besteld, en staat het in de voorraad?

- Na het afrekenen ziet de taak bij de volgende ronde je bestelling bij AH en schrijft `data/bezorging.json`. De tablet toont dan **Besteld bij AH** met het bezorgmoment.
- Is het mandje gevuld maar is er de dag vóór de eerste kookdag nog geen bestelling gezien, dan toont de tablet op Vandaag en bij Boodschappen **Nog niet besteld**.
- Na het bezorgmoment vraagt de tablet **Zijn de boodschappen binnen?**. Met **Ja, alles in de voorraad** komen de echt bestelde hoeveelheden in de voorraad, en worden huishoudproducten als gekocht afgevinkt. Met **Er ontbrak iets** haal je eerst het vinkje weg bij wat niet kwam. Wat AH als niet geleverd meldt, staat al uitgevinkt. Ongedaan maken kan direct via de melding.
- Zonder `data/bezorging.json` (bijvoorbeeld als de taak niet naar GitHub kan schrijven) blijft de tablet bij "mandje gevuld". Tik dan na de bezorging op **Al binnen? In de voorraad**.

Kan de desktop-app niet naar GitHub schrijven, dan wordt je mandje nog steeds gevuld; de tablet laat het dan alleen niet zien. Gebruik in dat geval de knop **Open AH**.
