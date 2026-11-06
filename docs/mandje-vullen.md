# AH-mandje vullen vanaf de tablet

Als je op de tablet **Lijst klaarzetten** tikt, zet de tablet de bestelling in `data/bestelling.json` en de voorraad in `data/voorraad.json`. Claude vult daarna je AH-mandje in de Claude desktop-app, met de skill `ah-boodschappen` en de ingebouwde browser waarin je bij AH bent ingelogd.

## Eenmalig: GitHub-sleutel voor de tablet

1. Ga naar https://github.com/settings/personal-access-tokens/new (fine-grained token).
2. Naam: `keukentablet`. Vervaldatum: bijvoorbeeld 1 jaar.
3. Repository access: **Only select repositories**, kies `keuken-app`.
4. Permissions → Repository permissions → **Contents: Read and write**. Verder niets.
5. Klik **Generate token** en kopieer de sleutel (begint met `github_pat_`).
6. Op de tablet: **Bijwerken** → plak de sleutel → **Sleutel opslaan**.

De sleutel blijft op de tablet en kan alleen deze repo wijzigen. Intrekken kan altijd op dezelfde GitHub-pagina.

## Opdracht voor Claude (desktop-app)

Gebruik deze tekst als losse vraag, of als geplande taak in de desktop-app (bijvoorbeeld zaterdag 10:00):

> Gebruik de skill ah-boodschappen. Lees https://raw.githubusercontent.com/raoulvink1/keuken-app/main/data/bestelling.json. Als `status` "klaar" is en `klaarOp` van de afgelopen 7 dagen is: zet alle `items` in mijn AH-mandje (stap 4 van de skill: huidig mandje eerst lezen, geen dubbelingen, Bonusvariant waar het past, aantallen omrekenen naar verpakkingen). Gebruik het weekmenu uit hetzelfde bestand alleen als context, maak geen nieuw menu. Reken niet af en kies geen bezorgmoment. Sluit af met de samenvatting uit de skill. Is er geen nieuwe bestelling, zeg dat dan in één zin.

Afrekenen en een bezorgmoment kiezen doe je daarna zelf in de AH-app of op ah.nl.
