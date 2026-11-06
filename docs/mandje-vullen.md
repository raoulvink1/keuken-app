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

> Gebruik de skill ah-boodschappen. Lees https://raw.githubusercontent.com/raoulvink1/keuken-app/main/data/bestelling.json en https://raw.githubusercontent.com/raoulvink1/keuken-app/main/data/mandje.json (die laatste mag ontbreken).
> Stop direct met één zin "Geen nieuwe bestelling" als `status` in bestelling.json niet "klaar" is, als `klaarOp` ouder is dan 7 dagen, of als `klaarOp` gelijk is aan `klaarOp` in mandje.json (dan is deze lijst al gedaan).
> Anders: zet alle `items` in mijn AH-mandje (stap 4 van de skill: huidig mandje eerst lezen, geen dubbelingen, Bonusvariant waar het past, aantallen omrekenen naar verpakkingen). Gebruik het weekmenu uit hetzelfde bestand alleen als context, maak geen nieuw menu. Reken niet af en kies geen bezorgmoment.
> Schrijf daarna `data/mandje.json` op branch `main` van github.com/raoulvink1/keuken-app (commit "Mandje gevuld"), in dit formaat:
> `{ "klaarOp": <klaarOp uit bestelling.json>, "status": "gevuld", "gevuldOp": <nu, ISO>, "artikelen": <aantal>, "totaal": <bedrag in euro>, "besparing": <Bonuskorting in euro>, "vervangingen": [{ "van": "…", "naar": "…" }], "nietGevonden": ["…"] }`
> Sluit af met de samenvatting uit de skill.

Zodra `data/mandje.json` er staat, ziet de tablet binnen een paar minuten **Je AH-mandje is gevuld**, met de knop **Bestelling afronden bij AH**. Die opent je AH-mandje; daar kies je een bezorgmoment en reken je zelf af. Claude rekent nooit af.

Kan de desktop-app niet naar GitHub schrijven, dan wordt je mandje nog steeds gevuld; de tablet laat het dan alleen niet zien. Gebruik in dat geval de knop **Open AH**.
