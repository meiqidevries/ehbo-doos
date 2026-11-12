# Overdracht: de EHBO-doos hosten en beheren

Voor de organisatie die de app overneemt van Busje Oranje. De app draait nu als pilot op
https://meiqidevries.github.io/ehbo-doos/.

## In het kort

- De app is een map met statische bestanden: HTML, CSS en JavaScript. Er is geen database, geen
  server-side code, geen build-stap en geen pakketbeheer.
- Hosten kan op elke webserver of elk CMS dat statische bestanden via **HTTPS** serveert. HTTPS is
  nodig voor het beginscherm-icoon, het offline werken en de versleuteling van live sessies.
- Er zijn geen cookies, geen statistieken en geen verzoeken naar derden. Lettertypen en de
  QR-bibliotheek zijn meegeleverd.
- Eén onderdeel gebruikt een externe dienst: de **live sessies** lopen via een doorgeefserver.
  Zie hieronder.

## Drie manieren om het over te nemen

1. **De map plaatsen op een eigen webserver.** Zet de inhoud van deze map (zonder `.git` en
   `.github`) in een map op de server, bijvoorbeeld `https://www.voorbeeld.nl/ehbo-doos/`.
   Alle verwijzingen zijn relatief, dus een submap werkt zonder aanpassingen.
2. **De GitHub-repository overdragen.** In GitHub: Settings → Transfer ownership, naar een
   organisatie-account. De geschiedenis en de automatische publicatie (`.github/workflows/pages.yml`)
   gaan mee. Daarna kan onder Settings → Pages een eigen domein worden ingesteld.
3. **Alleen een eigen (sub)domein koppelen.** Een CNAME-record naar `meiqidevries.github.io` en
   het domein invullen onder Settings → Pages. Snel, maar het beheer blijft dan bij een
   privé-account. Geschikt als tussenstap, niet als eindsituatie.

## Vóór de eerste publicatie op het definitieve adres

- **Leg het adres vast voordat er iets gedrukt wordt.** De QR-code op de doos verwijst naar één adres.
  De QR-codes in de app zelf (delen, uitnodigen voor een sessie) worden gemaakt van het adres waarop
  de app op dat moment draait en hoeven dus niet te worden aangepast.
- **Laat het oude adres doorverwijzen.** Wie de pilot op het beginscherm heeft gezet, opent het oude
  adres. Vervang daar `index.html` door een pagina die doorverwijst naar het nieuwe adres. Gegevens
  op het toestel (het signaleringsplan, bewaarde complimenten) horen bij het adres en gaan niet mee.
- **Stel de doorgeefserver in** (zie hieronder).
- Controleer toegankelijkheid, huisstijl en de privacytekst volgens de eigen eisen.

## Live sessies en de doorgeefserver

Een begeleider start een live sessie; deelnemers doen mee met een code of QR-code. Elk bericht wordt
op het toestel versleuteld (AES-GCM, sleutel afgeleid uit de sessiecode) en via een doorgeefserver
naar de andere deelnemers gestuurd. De server ziet alleen een kanaalnaam en onleesbare tekst en
bewaart niets.

De pilot gebruikt de openbare server van [ntfy](https://ntfy.sh). Die is gratis, zonder garanties,
en kent limieten per netwerkadres (onder meer 250 berichten per dag). Op een kantoornetwerk delen
alle collega's één adres, dus bij meerdere teams tegelijk loopt dat vol.

Voor definitief gebruik:

1. Draai een eigen ntfy-server (open source, één programma of één container; zie
   https://docs.ntfy.sh/install/) achter HTTPS.
2. Zet het adres in `config.js`:
   ```js
   window.EHBO_CONFIG = { relay: 'https://sessies.voorbeeld.nl' };
   ```
3. Verhoog `VERSIE` in `sw.js` en publiceer.

Wat de app van de server vraagt: `POST /<kanaal>` om te versturen en `GET /<kanaal>/sse` om te
ontvangen, vanaf het adres van de app (CORS). Berichten worden verstuurd met de verzoeken om ze niet
op te slaan en niet door te sturen naar pushdiensten. Stel de limieten per bezoeker ruimer in dan de
standaard: een sessie van twintig minuten met tien deelnemers verstuurt ongeveer honderd tot
tweehonderd berichten vanaf één netwerkadres.

Zonder doorgeefserver blijft alles werken behalve het meedoen op de eigen telefoon: de begeleider
deelt dan het scherm.

## Waar staat wat

| Bestand | Inhoud |
|---|---|
| `index.html` | Opbouw van de schermen en alle vormgeving |
| `app.js` | Teksten van de schermen en sessies (bovenaan), en de werking |
| `kaarten.js` | De teksten van de kaarten: Pleister, Zalf, Verband, Spiegel |
| `tekeningen.js` | De tekeningen en pictogrammen (SVG) |
| `en.js`, `i18n.js` | De Engelse versie: `en.js` bevat per Nederlandse tekst de vertaling |
| `live.js`, `config.js` | Live sessies en het adres van de doorgeefserver |
| `sw.js`, `manifest.webmanifest`, `icons/` | Beginscherm en offline werken |
| `fonts/`, `qr.js` | Lettertypen (SIL Open Font License) en QR-bibliotheek (MIT) |
| `team/` | Stuurt een oud adres uit de pilot door naar de app |

## Een wijziging publiceren

1. Pas de tekst aan in `app.js` of `kaarten.js`.
2. Voeg bij een nieuwe of gewijzigde Nederlandse tekst de vertaling toe in `en.js`. De sleutel is de
   Nederlandse tekst, letterlijk. Ontbreekt de vertaling, dan blijft die tekst in de Engelse versie
   Nederlands staan.
3. Verhoog `VERSIE` in `sw.js`. Zonder die stap blijven telefoons de oude versie tonen.
4. Publiceer de bestanden.

## Gegevens en privacy

- Wat iemand invult (waar sta ik nu, het signaleringsplan, de check, het terugkijken, bewaarde
  complimenten) staat alleen in de browser van dat toestel. Er is geen account en er wordt niets
  verstuurd.
- In een live sessie gaat inbreng versleuteld en zonder naam naar de andere deelnemers. De stand van
  de sessie bestaat alleen op de toestellen, zolang de sessie loopt.
- De vragen uit Spiegel zijn bedoeld voor het gesprek. De app biedt bewust geen mogelijkheid om de
  antwoorden vast te leggen.

## Herkomst en eigendom

De tekeningen zijn voor deze app gemaakt en het signaleringsplan is een eigen uitwerking. Over het eigendom en het gebruiksrecht van het product als geheel maken
Busje Oranje en de overnemende organisatie een afspraak bij de overdracht.
