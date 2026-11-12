# EHBO-doos — voor als het spannend wordt

De digitale versie van de EHBO-doos: een doos met zes vakken voor het omgaan met spanning tijdens de busy season. Beroepsproduct van Busje Oranje voor het NBA Werkprogramma Ethiek, Cultuur & Gedrag.

Live: https://meiqidevries.github.io/ehbo-doos/

## Wat het is

Eén web-app voor op je telefoon. Geen account, geen installatie via een app-winkel, geen cookies en geen statistieken. Je kunt hem op je beginscherm zetten; daarna werkt hij ook zonder internet.

| Tabblad | Vak uit de doos | Wat je er doet |
|---|---|---|
| *(begin)* | Over de doos | Twee ingangen: voor medewerkers en voor wie leiding geeft |
| **Nu** | Thermometer, Pleister | Waar sta je nu, en een time-out van 60 seconden of 10 minuten |
| **Plan** | Thermometer | Je signaleringsplan in vier kleuren, met het werkraam |
| **Check** | LMRA | Vijf vragen voordat je ergens aan begint |
| **Team** | Zalf, Verband, Spiegel, Bijsluiter | Vier kant-en-klare sessies, de 72 kaarten, en de handleiding voor wie leiding geeft |
| **Terug** | Bijsluiter | Terugkijken voor jezelf |

## Live sessies

Een begeleider start bij een sessie een *live sessie*. De app maakt een code en een QR-code. Wie die scant of de code invult, komt in dezelfde sessie: ieders telefoon volgt de stap van de begeleider, en stemmen en antwoorden komen binnen zonder naam. De begeleider bepaalt wanneer ze zichtbaar worden.

Hoe dat technisch werkt:

1. De code is het geheim. Uit de code leidt de app een sleutel en een kanaalnaam af.
2. Elk bericht wordt op het toestel versleuteld (AES-GCM) en naar een doorgeefserver gestuurd.
3. De doorgeefserver ziet alleen de kanaalnaam en onleesbare tekst, en geeft die door aan de andere deelnemers.
4. Er is geen database. De stand van de sessie bestaat alleen op de toestellen van de deelnemers, zolang de sessie loopt.

**Doorgeefserver.** De pilot gebruikt de openbare server van [ntfy](https://ntfy.sh) (open source). Dat is een gratis dienst zonder garanties en met limieten per netwerkadres. Voor een definitieve versie hoort hier een eigen server te staan; ntfy is daarvoor zelf te hosten. Het adres staat op één plek: `config.js`. Zie `OVERDRACHT.md`.

Zonder live sessie werkt alles ook: de begeleider zegt dan het stapnummer, of deelt het scherm.

## Bestanden

- `OVERDRACHT.md` — voor wie de app gaat hosten en beheren
- `config.js` — instellingen voor de beheerder (adres van de doorgeefserver)
- `index.html` — opmaak en vormgeving
- `app.js` — de app
- `tekeningen.js` — de tekeningen en pictogrammen (eigen werk)
- `en.js`, `i18n.js` — de Engelse versie
- `kaarten.js` — de kaartteksten, automatisch overgenomen uit de doos (niet met de hand wijzigen)
- `live.js` — live sessies
- `sw.js`, `manifest.webmanifest`, `icons/` — op het beginscherm zetten en offline werken
- `fonts/` — Fraunces en IBM Plex (SIL Open Font License), lokaal meegeleverd zodat er geen verzoeken naar derden gaan
- `qr.js` — QR Code Generator van Kazuhiko Arase (MIT-licentie)
- `team/` — stuurt oude links door naar de app

## Aanpassen

Teksten van de kaarten komen uit de doos. Overige teksten staan bovenaan `app.js` onder ‘inhoud’. Verhoog na een wijziging de regel `VERSIE` in `sw.js`, zodat telefoons de nieuwe versie ophalen.

## Interactief in een live sessie

- **Zalf**: iedereen geeft een collega een kaart vanaf de eigen telefoon, met erbij wat je zag. De begeleider laat alle kaarten tegelijk zien.
- **Verband**: iedereen kiest zonder naam één zin; daarna zie je welke zinnen het vaakst gekozen zijn.
- **Spiegel**: de begeleider kiest één vraag, die op ieders scherm verschijnt. Deze stappen zijn optioneel.

## Engels

Rechtsboven staat een knop EN/NL. De Engelse teksten staan in `en.js`; `i18n.js` vervangt de teksten op het scherm.
Deelnemers in één live sessie kunnen elk hun eigen taal gebruiken.

