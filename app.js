/* EHBO-doos · de app
 * Eén pagina met vijf tabbladen: Nu, Plan, Check, Team en Terug.
 * De kaartteksten staan in kaarten.js en komen letterlijk uit de doos.
 */
(function () {
'use strict';
var K = window.EHBO_KAARTEN, Live = window.EHBOLive, T = window.EHBO_TEKENINGEN || {};
var VERSIE = 'Versie november 2026';

/* ================= gereedschap ================= */
function $(id) { return document.getElementById(id); }
function el(tag, cls, tekst) { var e = document.createElement(tag); if (cls) e.className = cls; if (tekst != null) e.textContent = tekst; return e; }
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function bewaar(k, v) { try { localStorage.setItem('ehbo.' + k, v); } catch (e) {} }
function lees(k) { try { return localStorage.getItem('ehbo.' + k) || ''; } catch (e) { return ''; } }
function alle(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }

var toastTimer = null;
function toast(tekst) {
  var t = $('toast'); t.textContent = tekst; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
}
function kopieer(tekst, gelukt) {
  function terugval() {
    var ta = el('textarea'); ta.value = tekst; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    toast(ok ? (gelukt || 'Gekopieerd') : 'Kopiëren lukt hier niet. Selecteer de tekst en kopieer hem zelf.');
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(tekst).then(function () { toast(gelukt || 'Gekopieerd'); }, terugval);
  } else terugval();
}
function qrSvg(tekst) {
  try {
    var q = window.qrcode(0, 'M'); q.addData(tekst); q.make();
    var n = q.getModuleCount(), d = '';
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (q.isDark(y, x)) d += 'M' + x + ' ' + y + 'h1v1h-1z';
    return '<svg viewBox="-2 -2 ' + (n + 4) + ' ' + (n + 4) + '" role="img" aria-label="QR-code" shape-rendering="crispEdges"><rect x="-2" y="-2" width="' + (n + 4) + '" height="' + (n + 4) + '" fill="#fff"/><path d="' + d + '" fill="#1C1B19"/></svg>';
  } catch (e) { return ''; }
}
function basisUrl() { return location.origin + location.pathname; }
/* drie tekeningen naast elkaar, elk met een onderschrift */
function strip(naam, onderschriften) {
  var t = T[naam]; if (!t) return '';
  var h = '<div class="strip">';
  onderschriften.forEach(function (o, i) { h += '<figure>' + (t[i] || '') + '<figcaption>' + esc(o) + '</figcaption></figure>'; });
  return h + '</div>';
}
function ijsberg(laag) {
  if (!T.ijsberg) return '';
  var svg = laag < 0 ? T.ijsberg.replace('tek ijsberg', 'tek ijsberg alle') : T.ijsberg.replace('data-laag="' + laag + '"', 'data-laag="' + laag + '" class="aan"');
  var h = '<div class="ijs">' + svg + '<ol>';
  BIJSLUITER.forEach(function (b, i) { h += '<li' + (i === laag ? ' class="aan"' : '') + '>' + esc(b[0].replace(/^\d+\s*·\s*/, '')) + '</li>'; });
  return h + '</ol></div>';
}

/* ================= inhoud ================= */
var ZONES = [
 { id: 'groen', naam: 'Groen', kleur: 'var(--groen)', onder: 'Ik heb overzicht', quote: 'Dit red ik.',
   merk: 'Je denkt helder, je vraagt door en er zit ruimte in je dag.',
   nodig: 'Zo doorgaan. Dit is ook het moment om je signaleringsplan in te vullen, juist nu het rustig is.',
   pm: 'Ik denk helder, ik vraag door en er zit ruimte in mijn dag.',
   pn: 'Zo doorgaan. En dit plan invullen, juist nu het rustig is.',
   pa: 'Niets extra’s. Je kunt me vragen om mee te denken; ik heb nu ruimte.' },
 { id: 'geel', naam: 'Geel', kleur: 'var(--geel)', onder: 'Ik moet opletten', quote: 'Even doorbijten tot vrijdag.',
   merk: 'Je slaat pauzes over, geeft kortere antwoorden en ligt ’s nachts lijstjes te maken.',
   nodig: 'Een pleisterkaart, op tijd naar huis en één ding helemaal afmaken.',
   pm: 'Ik sla pauzes over, geef kortere antwoorden en lig ’s nachts lijstjes te maken.',
   pn: 'Een pleisterkaart (vak 2), op tijd naar huis en één ding helemaal afmaken.',
   pa: 'Vraag hoe het met mij gaat, niet of het werk af is.' },
 { id: 'oranje', naam: 'Oranje', kleur: 'var(--oranje)', onder: 'Het wordt te veel', quote: 'Niemand moet me nu iets vragen.',
   merk: 'Je slaapt slecht, doet werk dubbel, zet je camera uit en bent prikkelbaar.',
   nodig: 'Een pleister helpt even. Wat je echt nodig hebt, is één gesprek over de planning, om samen te prioriteren wat er van je lijst af kan.',
   zin: 9,
   pm: 'Ik slaap slecht, doe werk dubbel, zet mijn camera uit en ben prikkelbaar.',
   pn: 'Eén gesprek over de planning, om samen te prioriteren wat er van mijn lijst af kan.',
   pa: 'Help me prioriteren. Geef me nu geen extra werk en bewaar feedback voor later.' },
 { id: 'rood', naam: 'Rood', kleur: 'var(--rood)', onder: 'Ik zit erdoorheen', quote: 'Zeg maar ja, dan is het klaar.',
   merk: 'Je ontploft, of je klapt juist dicht. Je zegt overal ja op om ervan af te zijn.',
   nodig: 'Teken vandaag geen werk meer af en beoordeel niets meer. Meld het vandaag nog bij iemand die je vertrouwt.',
   zin: 10,
   pm: 'Ik ontplof, of ik klap juist dicht. Ik zeg overal ja op om ervan af te zijn.',
   pn: 'Vandaag geen werk meer aftekenen of beoordelen. En het vandaag nog melden bij iemand die ik vertrouw.',
   pa: 'Begin zelf het gesprek en wacht niet tot ik erom vraag. Help me prioriteren en schakel zo nodig de planning of de manager in.' }
];
var KLEURNAAM = { groen: 'Groen', geel: 'Geel', oranje: 'Oranje', rood: 'Rood' };
var BANDEN = [
 ['Boven je werkraam · vechten of vluchten', 'var(--rood)', 'Je lijf staat strak van de spanning; nadenken en een gesprek voeren lukt slecht. In de controlepraktijk zie je dat als snauwen in de review, of juist als het blijven ontwijken van dat ene dossier.'],
 ['Binnen je werkraam · hier wil je werken', 'var(--groen)', 'Je kunt nadenken, plannen en een gesprek aangaan, ook als dat gesprek spannend is.'],
 ['Onder je werkraam · bevriezen of meebewegen', 'var(--blauw)', 'Je hoofd schakelt uit. Voor accountants is meebewegen het gevaarlijkst, omdat het eruitziet als meewerken: je knikt mee met de klant en ziet pas later wat je hebt laten passeren.']
];
var HULP = ['Naar buiten', 'Bellen met iemand', 'Eén ding afmaken', 'Eten en drinken', 'Een uur eerder stoppen', 'Iemand laten meekijken', 'Muziek op', 'Lijstje leegschrijven'];
var LMRA = [
 ['Weet ik wat ik nu ga doen?', 'Kun je in één zin zeggen wat er straks af moet zijn? Lukt dat niet, dan is dát je eerste taak, niet het werk zelf.', 'Niet: ik ga aan de omzet werken. Wel: ik stel vast dat de omzet van november in de juiste periode valt.'],
 ['Wat kan hier misgaan?', 'Noem één ding concreet. Vaag blijven is hetzelfde als niets noemen.', 'Niet: er kan van alles fout gaan. Wel: de aansluiting met de subadministratie heb ik nog niet gezien.'],
 ['Heb ik alles wat ik nodig heb?', 'Gegevens, documentatie, toegang en tijd. Ontbreekt er één, dan begin je niet, maar vraag je er eerst om.', 'De klassieke valkuil: toch maar beginnen met wat je hebt, en om 22:00 vastlopen op wat je mist.'],
 ['Wie kijkt mee als ik twijfel?', 'Weet je nu al wie je belt? Regel dat vooraf, niet op het moment dat je het nodig hebt.', 'Bij een lastig klantgesprek: spreek vooraf af wie je daarna belt om het na te bespreken.'],
 ['Kan ik dit nú goed doen?', 'Kijk op je signaleringsplan. Sta je in oranje of rood, dan is dit het moment om iets te verzetten, niet om door te zetten.', '']
];
var TERUG = [
 ['Het moment', 'Kies het moment dat je is bijgebleven. Beschrijf eerst alleen wat een camera zou zien.',
  [['t1', 'Wat gebeurde er?'], ['t2', 'Wat deed ik?'], ['t3', 'Wat deed ik níét, terwijl ik het wel dacht?']]],
 ['De oorzaak, bij mij', 'Vraag drie keer door: en waardóór kwam dat?',
  [['t4', 'Welke gewoonte van mij speelde hier mee?'], ['t5', 'Wat wilde ik vermijden?']]],
 ['De oorzaak, in de opdracht', 'Niet wat jij fout deed, maar wat de kans hierop groter maakte.',
  [['t6', 'Wat in de planning of bezetting speelde mee?'], ['t7', 'Wat wist ik te laat, en waardoor?']]],
 ['De oorzaak, in de omgeving', 'Het deel waar je zelf niet over gaat, en dat toch meetelt.',
  [['t8', 'Wat maakte het lastig om iets te zeggen?'], ['t9', 'Wie had dit kunnen opmerken, en wat hield diegene tegen?']]],
 ['De les', 'Eén les is genoeg. Wie er drie kiest, voert er meestal geen uit.',
  [['t10', 'Wat doe ik de volgende keer anders?'], ['t11', 'Wat vraag ik eerder?'], ['t17', 'Waar vraag ik hulp bij?']]],
 ['Wat ik nodig had, en van wie', 'De vraag die het verschil maakt tussen een les en een verwijt aan jezelf.',
  [['t12', 'Wat had ik nodig?'], ['t13', 'Van wie had ik dat kunnen krijgen?'], ['t14', 'Heb ik erom gevraagd? Zo nee, waardoor niet?']]],
 ['Delen of niet', 'Je kiest zelf wat je deelt.',
  [['t15', 'Dit deel ik met het team'], ['t16', 'Dit hou ik voor mezelf']]]
];
var BIJSLUITER = [
 ['1 · De gebeurtenis', 'Boven water', ['Wat ging er goed, en waaraan lag dat precies?', 'Waar liep het vast, en wanneer merkten we dat voor het eerst?', 'Hoeveel tijd zat er tussen dat eerste signaal en het moment dat we iets deden?']],
 ['2 · Het patroon', 'Eén laag dieper', ['Is dit de eerste keer, of de derde?', 'Bij welke andere opdracht zagen we ditzelfde gebeuren?', 'Wat gebeurt er volgend jaar opnieuw als wij niets veranderen?']],
 ['3 · De structuur', 'Waar het ontstaat', ['Wat in onze planning, bezetting of afspraken maakte dit mogelijk?', 'Welke afspraak hadden we gemaakt die in de praktijk niet werkte?', 'Wie moest iets oplossen wat eigenlijk niet bij die persoon hoorde?', 'Waar hebben we hard gewerkt om iets te compenseren in plaats van het op te lossen?']],
 ['4 · De aannames', 'Het diepst', ['Wat vinden wij hier inmiddels normaal dat een buitenstaander raar zou vinden?', 'Welke onuitgesproken regel gold er in dit team?', 'Wat dachten we dat niet kon, zonder het ooit te vragen?']]
];
var LEIDING = [
 ['1. Thermometer', 'Jij vertelt als eerste waar je staat, en dat is niet altijd groen.', 'Zolang jij altijd groen staat, durft niemand oranje te staan.'],
 ['2. Pleister', 'Jij neemt zichtbaar een time-out en zet het bureaukaartje neer.', 'Een pauze die de leidinggevende nooit neemt, bestaat voor het team niet.'],
 ['3. Zalf', 'Jij geeft de eerste kaart, met het verhaal erbij. En je neemt zelf een compliment aan zonder het weg te wuiven.', 'Complimenten naar beneden gaan vanzelf. Naar boven komen ze alleen als jij laat zien dat het mag.'],
 ['4. Verband', 'Jij pakt als eerste een kaart uit de groep “Als je feedback krijgt”.', 'Veiligheid ontstaat niet doordat junioren moediger worden, maar doordat jij laat zien dat het kan.'],
 ['5. Spiegel', 'Jij leest de kaart voor, laat de stilte vallen, en geeft als eerste een antwoord dat voor jou zelf ongemakkelijk is.', 'Wie als eerste praat, bepaalt wat de rest nog durft te zeggen.'],
 ['6. Bijsluiter', 'Jij houdt laag 3 en 4 open: de structuur en de aannames.', 'Zodra jij een schuldige aanwijst (“het liep uit omdat zij te laat aanleverden”), is het gesprek over de oorzaken voorbij.']
];
var SLOOP = [
 ['Je maakt het verplicht.', 'Een verplichte complimentenronde voelt al snel als een agendapunt.'],
 ['Je legt antwoorden vast.', 'Komt een antwoord terug in een dossier of beoordeling, dan worden mensen daarna voorzichtiger met wat ze zeggen.'],
 ['Je vraagt wel, maar doet er niets mee.', 'Wie merkt dat er niets met de inbreng gebeurt, zegt de volgende keer niets meer.'],
 ['Je pakt de doos alleen als het misgaat.', 'Dan wordt hij een alarmbel in plaats van een hulpmiddel.']
];
var RITME = [
 ['Elk teamoverleg · 2 minuten', 'Eén kaart uit Zalf of Verband.'],
 ['Bij de start van elke fase', 'Eén Spiegelkaart: voorlezen, twee minuten stilte, dan pas praten. De themakaarten pak je wanneer het speelt.'],
 ['Wekelijks in de busy season', 'De thermometer, anoniem. Kijk naar de verdeling, niet naar personen.'],
 ['Na afloop · 30 minuten', 'De bijsluiter met het team. Altijd, ook als het goed ging.']
];
var VAKKEN = [
 ['Merken', 'var(--rood)', '1. Thermometer', 'Je signaleringsplan in vier kleuren, met het werkraam erboven. Plus de LMRA: een check van zestig seconden voordat je ergens aan begint.', 'nu'],
 ['Opvangen', 'var(--blauw)', '2. Pleister', 'Time-outs van zestig seconden of tien minuten, plus het bureaukaartje dat een pauze bespreekbaar maakt.', 'nu'],
 ['Samen', 'var(--oranje)', '3. Zalf', 'Complimenten in zeven soorten, van vakwerk tot prijzen om uit te reiken. Een kaart zonder toelichting telt niet.', 'kaarten-zalf'],
 ['Opvangen', 'var(--rood)', '4. Verband', 'Openingszinnen voor binnen het team, en vragen waarmee je sámen een lastig klantgesprek voorbereidt.', 'kaarten-verband'],
 ['Samen', 'var(--paars)', '5. Spiegel', 'Ethiekvragen bij vijf fasen van de opdracht en drie thema’s die altijd spelen, te stellen op het moment dat het antwoord nog iets kan veranderen.', 'kaarten-spiegel'],
 ['Terugkijken', 'var(--groen)', '6. Bijsluiter', 'Nabespreken met het team langs vier lagen, van gebeurtenis tot aanname. En een vel voor jezelf.', 'terug']
];

var ANONIEM = 'Liever schrijven dan zeggen? Deel je antwoord zonder naam.';
function laag(i) { return { k: BIJSLUITER[i][0], b: BIJSLUITER[i][1], ijs: i, vragen: BIJSLUITER[i][2], inb: ['tekst', 'Wat wil jij hierover kwijt? Zonder naam.'] }; }
function klantvraag(n, nr) { return { k: 'Vraag ' + n + ' van 6', kaart: ['verband', nr], inb: ['tekst', 'Jullie antwoord, of een voorstel.'] }; }
var SESSIES = [
{ id: 'start', naam: 'Start van de opdracht', duur: '20 min', kleur: 'var(--blauw)',
  intro: 'Voordat het dossier er is. Nu kan het antwoord nog iets veranderen.',
  stappen: [
   { k: 'Voordat je begint', b: 'Eén iemand begeleidt en leest voor. Doen jullie dit live, dan volgt ieders telefoon vanzelf de stap van de begeleider.', tip: 'Antwoorden leg je niet vast. Deze vragen zijn geen controlemiddel: belandt een antwoord in een dossier of beoordeling, dan worden de antwoorden daarna voorzichtiger.' },
   { k: 'Waarom nu, en niet achteraf', lees: ['Ethische grenzen worden zelden in één besluit overschreden. Ze schuiven op, vraag voor vraag, tot niemand meer kan aanwijzen waar het misging.', 'Lees voor'], b: 'Daarom stel je deze vragen aan het begin van de opdracht, wanneer het antwoord nog iets kan veranderen.' },
   { k: 'Spiegel: één vraag bij de acceptatie', b: 'De begeleider kiest één vraag en leest die voor. Laat daarna twee minuten stilte vallen; pas dan praten jullie.', spiegel: 'Opdrachtacceptatie', sec: 120, inb: ['tekst', ANONIEM] },
   { k: 'Spiegel: nog één vraag', opt: 1, b: 'Als er tijd is. Voorlezen, twee minuten stilte, en niemand hoeft een antwoord af te maken.', spiegel: 'Risicoanalyse', sec: 120, inb: ['tekst', ANONIEM] },
   { k: 'De zin die de rest makkelijker maakt', lees: ['Ik wil iets zeggen waar ik een beetje bang voor ben.', 'Uit Verband'], b: 'Spreek af dat deze zin in dit team altijd mag. Wie hem hoort, bedankt eerst, vraagt door, en komt er binnen een week op terug met wat ermee is gedaan.' },
   { k: 'Verband: welke zin wil jij hier kunnen zeggen?', opt: 1, b: 'Iedereen kiest één zin die in dit team makkelijker gezegd zou moeten kunnen worden. Bespreek daarna de zin die het vaakst is gekozen.', inb: ['zin', 'Kies één zin. Er gaat geen naam mee.', ''] },
   { k: 'De leidinggevende begint', b: 'Een team wordt veiliger wanneer degene met de meeste invloed als eerste iets ongemakkelijks vraagt. De begeleider geeft daarom als eerste een antwoord dat ook voor de begeleider zelf ongemakkelijk is.', tip: 'Veiligheid ontstaat niet doordat junioren moediger worden, maar doordat de leidinggevende laat zien dat het kan.' },
   { k: 'Zalf: begin met een compliment', opt: 1, b: 'Iedereen kan een collega een kaart geven, met erbij wat je zag. Denk aan de vorige opdracht, of aan de voorbereiding van deze.', inb: ['geef', 'Kies een kaart en geef die aan een collega.'], tip: 'Eén prijs per teamoverleg is genoeg, anders verliezen ze hun waarde.' },
   { k: 'Afsluiten', b: 'Eén afspraak uit dit gesprek. Wie bewaakt die afspraak, en wanneer kijken jullie of die heeft gewerkt?', inb: ['tekst', 'Welke afspraak neem jij mee?'] }
  ] },
{ id: 'week', naam: 'Weekafsluiting in de busy season', duur: '15 min', kleur: 'var(--oranje)',
  intro: 'Een kwartier aan het eind van een overleg dat al gepland staat.',
  stappen: [
   { k: 'Voordat je begint', b: 'Een kwartier, aan het eind van een overleg dat al gepland staat. Eén iemand begeleidt.', tip: 'Kijk straks naar de verdeling, niet naar personen.' },
   { k: 'Het rondje', b: 'Iedereen geeft aan welke kleur deze week had: groen, geel, oranje of rood. Zonder toelichting.', sec: 60, inb: ['kleur', 'Welke kleur had jouw week?'], tip: 'Live gaat dit anoniem: iedereen kiest op de eigen telefoon en de begeleider laat daarna de verdeling zien. Zonder live sessie noemt ieder hardop een kleur.' },
   { k: 'Kijk naar de verdeling', b: 'Niet wíé er in oranje of rood staat, maar hoeveel. Staat iemand drie keer in één week in oranje of rood, dan is het geen pleisterprobleem meer, maar een planningsprobleem.', uitslag: 1 },
   { k: 'Verband: welke zin had jij kunnen gebruiken?', b: 'Iedereen kiest één zin die deze week van pas was gekomen. Bespreek daarna de zin die het vaakst is gekozen: wat hield ons tegen om dit te zeggen?', inb: ['zin', 'Kies één zin. Er gaat geen naam mee.', 'Het gaat over de druk'] },
   { k: 'Zalf: geef een kaart', b: 'Geef een collega een compliment, met erbij wat je zag. Een kaart zonder toelichting is een sticker.', inb: ['geef', 'Kies een kaart en geef die aan een collega.'], tip: 'Eén prijs per teamoverleg is genoeg, anders verliezen ze hun waarde.' },
   { k: 'Spiegel: één vraag', opt: 1, b: 'Als er tijd is: de begeleider kiest één vraag die past bij de fase waarin de opdracht zit. Voorlezen, twee minuten stilte, en dan pas praten.', spiegel: 'Teamdynamiek', sec: 120, inb: ['tekst', ANONIEM] },
   { k: 'Afsluiten', b: 'Wat gaat er volgende week van de lijst af? Een afsluiting die alleen dingen toevoegt, maakt de week drukker.', inb: ['tekst', 'Wat kan er wat jou betreft af?'] }
  ] },
{ id: 'klant', naam: 'Een lastig klantgesprek voorbereiden', duur: '20 min', kleur: 'var(--rood)',
  intro: 'Zes vragen die je mét je team beantwoordt, vóór het gesprek.',
  stappen: [
   { k: 'Voordat je begint', b: 'Niemand hoeft alleen een lastig klantgesprek in. Deze zes vragen beantwoord je mét je team, vóór het gesprek.', tip: 'De vragen horen bij elkaar; sla er geen over.' },
   klantvraag(1, 19), klantvraag(2, 20), klantvraag(3, 21), klantvraag(4, 22), klantvraag(5, 23), klantvraag(6, 24),
   { k: 'Spiegel: één vraag over het klantcontact', opt: 1, b: 'Als er tijd is: de begeleider kiest één vraag. Voorlezen, twee minuten stilte, en dan pas praten.', spiegel: 'Klantcontact', sec: 120, inb: ['tekst', ANONIEM] },
   { k: 'Afsluiten', b: 'Herhaal hardop: de boodschap in één zin, de ondergrens, wie het woord voert, en wie wie spreekt na afloop.' }
  ] },
{ id: 'terug', naam: 'Na afloop: de opdracht nabespreken', duur: '30 min', kleur: 'var(--groen)',
  intro: 'Langs vier lagen, van gebeurtenis tot aanname. Ook als het goed ging.',
  stappen: [
   { k: 'Eén afspraak vooraf', ijs: -1, b: 'Je werkt van boven naar beneden: wat er gebeurde is het makkelijkste deel, wat het veroorzaakte zit eronder. Doe dit ook als het goed ging.', tip: 'Laag 3 en 4 gaan over hoe wij het hebben georganiseerd, niet over wie wat te laat aanleverde.' },
   laag(0), laag(1), laag(2), laag(3),
   { k: 'En dan: één ingreep', b: 'Wat is de kleinste verandering met het grootste effect? Wie regelt die, en wanneer kijken we of het werkte?', inb: ['tekst', 'Welke ingreep stel jij voor?'] },
   { k: 'Wat we níét meer doen', b: 'Een evaluatie die alleen dingen toevoegt, maakt het volgend jaar drukker. Spreek daarom ook af waarmee jullie stoppen.', inb: ['tekst', 'Waarmee kunnen we stoppen?'] },
   { k: 'Spiegel: één vraag achteraf', opt: 1, b: 'Als er tijd is: de begeleider kiest één vraag. Voorlezen, twee minuten stilte, en dan pas praten.', spiegel: 'Professionele moed', sec: 120, inb: ['tekst', ANONIEM] },
   { k: 'Zalf: sluit af met een compliment', opt: 1, b: 'Iedereen kan een collega een kaart geven, met erbij wat je zag in deze opdracht.', inb: ['geef', 'Kies een kaart en geef die aan een collega.'] }
  ] }
];
function sessie(id) { for (var i = 0; i < SESSIES.length; i++) if (SESSIES[i].id === id) return SESSIES[i]; return null; }

var SETS = { zalf: K.ZALF, verband: K.VERBAND, spiegel: K.SPIEGEL };
var SETINFO = {
 zalf: { kleur: 'var(--oranje)', uit: 'Vierentwintig kaarten in zeven soorten: gewone kaarten, prijzen om uit te reiken, en blanco kaarten om zelf in te vullen.', kort: ['Je kiest een kaart die bij iemand past', 'En je vertelt erbij wat je zag', 'Sommige kaarten reik je uit'], regels: K.ZALF_REGELS },
 verband: { kleur: 'var(--rood)', uit: 'Vierentwintig kaarten die helpen om iets bespreekbaar te maken: achttien openingszinnen voor binnen het team, en zes vragen waarmee je sámen een lastig klantgesprek voorbereidt. Een kaart geeft je de eerste zin, niet je mening. Onder aan elke kaart staat wat er kan gebeuren als het ongezegd blijft.', kort: ['De zin die in je hoofd blijft hangen', 'Eén openingszin maakt de rest makkelijker', 'Een lastig klantgesprek bereid je samen voor'], regels: K.VERBAND_REGELS },
 spiegel: { kleur: 'var(--paars)', uit: 'Vierentwintig ethiekkaarten: drie bij elk van de vijf fasen van de opdracht, en drie bij elk van de drie thema’s die in iedere opdracht spelen. Vragen die je liever niet stelt, op het moment dat het antwoord nog iets kan veranderen.', kort: ['Elke vraag gaat over onszelf, niet over de klant', 'Eén afwijkend antwoord is genoeg om het gesprek te openen', 'Voorlezen, twee minuten stilte, en dan pas praten'], regels: K.SPIEGEL_REGELS }
};

function kaartHTML(set, i, zonderLabel) {
  var c = SETS[set][i], h = '';
  if (set === 'zalf') {
    if (!zonderLabel || c[3]) h += '<span class="lab">' + (zonderLabel ? '' : esc(c[0])) + (c[3] ? (zonderLabel ? '' : ' &middot; ') + 'prijs' : '') + '</span>';
    h += '<h3>' + esc(c[1]) + '</h3><p>' + esc(c[2]) + '</p>';
  } else if (set === 'verband') {
    if (!zonderLabel) h += '<span class="lab">' + esc(c[0]) + '</span>';
    h += '<h3>' + (c[2] ? '&ldquo;' + esc(c[1]) + '&rdquo;' : esc(c[1])) + '</h3>';
    h += '<div class="gevolg"><b>' + esc(c[3]) + '</b><span>' + esc(c[4]) + '</span></div>';
  } else {
    if (!zonderLabel) h += '<span class="lab">' + esc(c[0]) + '</span>';
    h += '<h3>' + esc(c[1]) + '</h3>';
  }
  return h + '<span class="nr">' + (i + 1) + ' / ' + SETS[set].length + '</span>';
}

/* ================= NU: thermometer ================= */
var zoneBox = $('zones'), advies = $('advies');
ZONES.forEach(function (z) {
  var b = el('button', 'zone'); b.type = 'button'; b.setAttribute('aria-pressed', 'false'); b.style.setProperty('--z', z.kleur);
  b.innerHTML = '<i></i>' + ((T.zone && T.zone[z.id]) || '') + '<span>' + esc(z.naam) + '</span>';
  b.addEventListener('click', function () { kiesZone(z, b); });
  zoneBox.appendChild(b);
});
function kiesZone(z, knop) {
  Array.prototype.forEach.call(zoneBox.children, function (c) { c.setAttribute('aria-pressed', String(c === knop)); });
  advies.hidden = false; advies.innerHTML = ''; advies.style.setProperty('--z', z.kleur);
  advies.appendChild(el('span', 'lab', z.naam + ' · ' + z.onder));
  var sp = el('div', 'spreek'); sp.innerHTML = (T.zone && T.zone[z.id]) || ''; sp.appendChild(el('q', null, z.quote)); advies.appendChild(sp);
  var r1 = el('div', 'rij'); r1.appendChild(el('b', null, 'Dit merk je misschien')); r1.appendChild(el('span', null, z.merk));
  var r2 = el('div', 'rij'); r2.appendChild(el('b', null, 'Wat je nu nodig hebt')); r2.appendChild(el('span', null, z.nodig));
  advies.appendChild(r1); advies.appendChild(r2);
  if (z.zin != null) {
    var kaart = K.VERBAND[z.zin], blok = el('div', 'zin');
    blok.appendChild(el('span', 'lab', 'Een zin om mee te beginnen'));
    blok.appendChild(el('q', null, kaart[1]));
    var rij = el('div', 'rijtje');
    var kop = el('button', 'btn klein', 'Kopieer deze zin'); kop.type = 'button';
    kop.addEventListener('click', function () { kopieer(kaart[1], 'Zin gekopieerd'); });
    var meer = el('button', 'btn klein', 'Meer openingszinnen'); meer.type = 'button';
    meer.addEventListener('click', function () { ga('kaarten-verband-3'); });
    rij.appendChild(kop); rij.appendChild(meer); blok.appendChild(rij);
    advies.appendChild(blok);
  } else if (z.id === 'groen') {
    var p = el('button', 'btn breed', 'Naar mijn signaleringsplan'); p.type = 'button';
    p.addEventListener('click', function () { ga('plan'); }); advies.appendChild(p);
  } else {
    var t = el('button', 'btn breed', 'Naar de pleisterkaarten'); t.type = 'button';
    t.addEventListener('click', function () { trek(); $('kaart').scrollIntoView({ block: 'center' }); }); advies.appendChild(t);
  }
}

/* ================= NU: pleister ================= */
var tijd = '60 sec', kaartBox = $('kaart'), laatste = -1;
var PLEISTERS = K.PLEISTER.filter(function (k) { return k.t !== 'Grens'; });
var GRENS = K.PLEISTER.filter(function (k) { return k.t === 'Grens'; })[0];
alle('[data-tijd]', function (b) {
  b.addEventListener('click', function () {
    tijd = b.getAttribute('data-tijd');
    alle('[data-tijd]', function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    trek();
  });
});
function trek() {
  var pool = PLEISTERS.filter(function (k) { return k.t === tijd; }), k, p = 0;
  do { k = pool[Math.floor(Math.random() * pool.length)]; p++; } while (k.n === laatste && p < 8);
  laatste = k.n;
  kaartBox.style.setProperty('--k', 'var(--blauw)');
  kaartBox.innerHTML = '<span class="lab">' + esc(k.t === '60 sec' ? '60 seconden' : '10 minuten') + '</span><h3>' + esc(k.k) + '</h3><p>' + esc(k.u) + '</p><span class="nr">' + k.n + ' / 12</span>';
  $('ademblok').hidden = (k.n !== 1);
  stopAdem();
}
$('nogeen').addEventListener('click', trek);
$('grens').innerHTML = '<b style="font-weight:500">' + esc(GRENS.k) + '.</b> ' + esc(GRENS.u);
$('bureau-uitleg').textContent = 'Zonder bureaukaartje wordt een time-out iets wat je stiekem doet. Tik erop en zet je telefoon op je bureau.';

var bol = $('bol'), tel = $('tel'), fase = $('fase'), ademknop = $('ademknop'), ademloop = null, ademstap = 0, ademsec = 4,
    FASEN = [['Adem in', .95], ['Vasthouden', .95], ['Adem uit', .6], ['Vasthouden', .6]];
function stopAdem() { if (ademloop) { clearInterval(ademloop); ademloop = null; } ademstap = 0; ademsec = 4; bol.style.transform = 'scale(.6)'; tel.textContent = '4'; fase.textContent = 'Adem in'; ademknop.textContent = 'Start vier rondjes'; }
function zetFase() { var f = FASEN[ademstap % 4]; fase.textContent = f[0] + ' · rondje ' + (Math.floor(ademstap / 4) + 1); bol.style.transform = 'scale(' + f[1] + ')'; tel.textContent = '4'; }
ademknop.addEventListener('click', function () {
  if (ademloop) { stopAdem(); return; }
  ademknop.textContent = 'Stoppen'; ademstap = 0; ademsec = 4; zetFase();
  ademloop = setInterval(function () {
    ademsec--;
    if (ademsec <= 0) { ademstap++; if (ademstap >= 16) { stopAdem(); fase.textContent = 'Klaar'; return; } ademsec = 4; zetFase(); }
    tel.textContent = String(ademsec);
  }, 1000);
});

/* bureaukaartje: je telefoon als kaartje op je bureau */
var wakker = null;
function houdWakker(aan) {
  try {
    if (aan && navigator.wakeLock && !wakker) navigator.wakeLock.request('screen').then(function (w) { wakker = w; w.addEventListener('release', function () { wakker = null; }); }, function () {});
    if (!aan && wakker) { wakker.release(); wakker = null; }
  } catch (e) {}
}
$('bureauknop').addEventListener('click', function () {
  var t = new Date(Date.now() + 10 * 60000), u = t.getHours(), m = t.getMinutes();
  $('bureau-tekst').textContent = K.BUREAU.tekst;
  $('bureau-tijd').textContent = 'Terug om ' + u + ':' + (m < 10 ? '0' : '') + m;
  $('bureau').hidden = false; houdWakker(true);
});
$('bureau-dicht').addEventListener('click', function () { $('bureau').hidden = true; houdWakker(false); });

/* ================= PLAN ================= */
BANDEN.forEach(function (b) {
  var d = el('div', 'band'); d.style.setProperty('--z', b[1]);
  var tk = el('div', 'bandtek'); tk.innerHTML = (T.raam && T.raam[BANDEN.indexOf(b)]) || ''; d.appendChild(tk);
  var tx = el('div', 'bandtxt'); tx.appendChild(el('b', null, b[0])); tx.appendChild(el('span', null, b[2])); d.appendChild(tx); $('banden').appendChild(d);
});
var PLANVELDEN = [['m', 'Wat merk ik', 'pm'], ['n', 'Wat heb ik nodig', 'pn'], ['a', 'Wat kun jij doen', 'pa']];
ZONES.forEach(function (z) {
  var d = el('details', 'kl'); d.style.setProperty('--z', z.kleur);
  var s = el('summary'); s.appendChild(el('i'));
  var w = el('span'); w.appendChild(document.createTextNode(z.naam + ' ')); w.appendChild(el('em', null, z.onder));
  s.appendChild(w); d.appendChild(s);
  var body = el('div', 'body');
  PLANVELDEN.forEach(function (v) {
    var id = 'p-' + z.id + '-' + v[0], veld = el('div', 'veld');
    var lb = el('label', null, v[1]); lb.setAttribute('for', id);
    var vb = el('span', 'vb'); vb.innerHTML = '<b>Voorbeeld:</b> ' + esc(z[v[2]]);
    var t = el('textarea'); t.id = id; t.placeholder = 'Zo is het bij mij'; t.value = lees(id);
    t.addEventListener('input', function () { bewaar(id, t.value); deelTekst(); });
    veld.appendChild(lb); veld.appendChild(vb); veld.appendChild(t); body.appendChild(veld);
  });
  d.appendChild(body); $('kleuren').appendChild(d);
});
HULP.forEach(function (h, i) {
  var b = el('button', 'chip', h); b.type = 'button';
  var id = 'h' + i; b.setAttribute('aria-pressed', String(lees(id) === '1'));
  b.addEventListener('click', function () { var nu = b.getAttribute('aria-pressed') === 'true'; b.setAttribute('aria-pressed', String(!nu)); bewaar(id, !nu ? '1' : ''); });
  $('chips').appendChild(b);
});
var eh = $('eigenhulp'); eh.value = lees('eigenhulp'); eh.addEventListener('input', function () { bewaar('eigenhulp', eh.value); });
function deelTekst() {
  var regels = [];
  ZONES.forEach(function (z) {
    var n = lees('p-' + z.id + '-n').trim(), a = lees('p-' + z.id + '-a').trim();
    if (!n && !a) return;
    regels.push(z.naam + ' (' + z.onder.toLowerCase() + ')');
    if (n) regels.push('  Wat ik nodig heb: ' + n);
    if (a) regels.push('  Wat jij kunt doen: ' + a);
  });
  var leeg = !regels.length;
  $('deeltekst').textContent = leeg ? 'Hier verschijnt wat je bij “Wat heb ik nodig” en “Wat kun jij doen” hebt ingevuld. Wat je merkt, blijft van jou.' : 'Mijn signaleringsplan\n' + regels.join('\n');
  $('deelknop').disabled = leeg;
}
$('deelknop').addEventListener('click', function () { kopieer($('deeltekst').textContent, 'Gekopieerd. Plak de tekst in een bericht aan je team.'); });
deelTekst();

/* ================= CHECK: LMRA ================= */
var lmraAntw = [];
LMRA.forEach(function (v, i) {
  var d = el('div', 'vraag');
  var kop = el('div', 'kop'); kop.appendChild(el('b', null, String(i + 1))); kop.appendChild(el('h3', null, v[0])); d.appendChild(kop);
  d.appendChild(el('p', 'zacht', v[1]));
  if (v[2]) d.appendChild(el('p', 'vb', v[2]));
  if (i === 4) { var l = el('button', 'btn klein', 'Bekijk waar ik nu sta'); l.type = 'button'; l.style.alignSelf = 'flex-start'; l.addEventListener('click', function () { ga('nu'); }); d.appendChild(l); }
  var jn = el('div', 'janee');
  [['ja', 'Ja'], ['nee', 'Nee, nog niet']].forEach(function (a) {
    var b = el('button', 'btn', a[1]); b.type = 'button'; b.setAttribute('data-a', a[0]); b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', function () {
      lmraAntw[i] = a[0];
      Array.prototype.forEach.call(jn.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      lmraUitkomst();
    });
    jn.appendChild(b);
  });
  d.appendChild(jn); $('lmra').appendChild(d);
});
var LMRA_ACTIE = [
 'Schrijf in één zin op wat er straks af moet zijn. Lukt dat niet, vraag het dan eerst na bij degene die je de opdracht gaf.',
 'Benoem één concreet risico voordat je begint. Weet je er geen, vraag dan een collega wat hier meestal misgaat.',
 'Vraag eerst op wat ontbreekt: gegevens, documentatie, toegang of tijd. Begin niet met de helft.',
 'Spreek nu af wie je belt als je twijfelt, en wanneer die persoon bereikbaar is.',
 'Je staat in oranje of rood. Verzet of verdeel dit werk, of neem eerst een time-out, en zeg het tegen je teamleider.'
];
var lmraKlaar = false;
function lmraTekst() {
  var nee = [], r = 'LMRA · ';
  LMRA.forEach(function (v, i) { if (lmraAntw[i] === 'nee') nee.push(i); });
  if (!nee.length) return r + 'vijf keer ja. Ik kan beginnen.';
  r += (LMRA.length - nee.length) + ' keer ja, ' + nee.length + ' keer nee. Eerst regelen:\n';
  nee.forEach(function (i) { r += '- ' + LMRA[i][0] + ' ' + LMRA_ACTIE[i] + '\n'; });
  return r;
}
function lmraUitkomst() {
  var u = $('lmra-uitkomst'), vg = $('lmra-voortgang'), nee = [], klaar = 0, i, h;
  for (i = 0; i < LMRA.length; i++) { if (lmraAntw[i]) klaar++; if (lmraAntw[i] === 'nee') nee.push(i); }
  vg.hidden = !klaar || klaar === LMRA.length;
  vg.textContent = klaar + ' van ' + LMRA.length + ' beantwoord. Na de vijfde vraag volgt je conclusie.';
  if (klaar < LMRA.length) { u.hidden = true; lmraKlaar = false; return; }
  var ja = LMRA.length - nee.length;
  if (!nee.length) {
    u.style.setProperty('--z', 'var(--groen)');
    h = '<span class="lab">Conclusie · 5 keer ja</span><h3>Je kunt beginnen</h3><p>Je weet wat je gaat doen, wat er mis kan gaan, wat je nodig hebt en wie er meekijkt. Ga je onderweg toch twijfelen, doe de check dan opnieuw.</p>';
  } else {
    var zwaar = nee.length >= 3;
    u.style.setProperty('--z', zwaar ? 'var(--rood)' : 'var(--oranje)');
    h = '<span class="lab">Conclusie · ' + ja + ' keer ja, ' + nee.length + ' keer nee</span><h3>' + (zwaar ? 'Begin hier nu niet aan' : 'Nog niet beginnen') + '</h3>';
    h += '<p>' + (zwaar ? 'Drie of meer keer nee: dit werk kan nu niet goed gedaan worden. Bespreek het eerst met je senior of manager, en regel daarna:' : 'Eén keer nee betekent niet automatisch stoppen. Regel wel eerst wat ontbreekt:') + '</p><div class="lijst">';
    nee.forEach(function (n) { h += '<div class="rij"><b>' + (n + 1) + '. ' + esc(LMRA[n][0]) + '</b><span>' + esc(LMRA_ACTIE[n]) + '</span></div>'; });
    h += '</div><p class="zacht">Zeg het hardop tegen je team. Daar draait een LMRA om: iedereen weet waar het risico zit vóórdat het werk begint.</p>';
  }
  h += '<div class="rijtje">';
  if (nee.indexOf(4) >= 0) h += '<button class="btn" type="button" data-ga="nu">Neem een time-out</button><button class="btn" type="button" data-ga="kaarten-verband-3">Een zin om het te zeggen</button>';
  h += '<button class="btn" type="button" id="lmra-kopieer">Kopieer de conclusie</button></div>';
  u.innerHTML = h; u.hidden = false;
  if (!lmraKlaar && u.scrollIntoView) setTimeout(function () { u.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 60);
  lmraKlaar = true;
}
$('lmra-uitkomst').addEventListener('click', function (e) { if (e.target.closest('#lmra-kopieer')) kopieer(lmraTekst(), 'Conclusie gekopieerd'); });
$('reset').addEventListener('click', function () {
  lmraAntw = []; alle('#lmra .janee .btn', function (b) { b.setAttribute('aria-pressed', 'false'); }); lmraUitkomst(); window.scrollTo(0, 0);
});

/* ================= TERUG: reflectie voor jezelf ================= */
TERUG.forEach(function (blok, i) {
  var d = el('details', 'kl'); if (i === 0) d.open = true;
  var s = el('summary'); s.appendChild(el('span', null, blok[0])); d.appendChild(s);
  var body = el('div', 'body'); body.appendChild(el('p', 'zacht', blok[1]));
  blok[2].forEach(function (v) {
    var veld = el('div', 'veld'), lb = el('label', null, v[1]); lb.setAttribute('for', v[0]);
    var t = el('textarea'); t.id = v[0]; t.value = lees(v[0]);
    t.addEventListener('input', function () { bewaar(v[0], t.value); });
    veld.appendChild(lb); veld.appendChild(t); body.appendChild(veld);
  });
  d.appendChild(body); $('terugblokken').appendChild(d);
});
$('kopieer').addEventListener('click', function () {
  var uit = [];
  TERUG.forEach(function (blok) {
    var r = [];
    blok[2].forEach(function (v) { var w = lees(v[0]).trim(); if (w) r.push(v[1] + '\n' + w); });
    if (r.length) uit.push(blok[0].toUpperCase() + '\n' + r.join('\n\n'));
  });
  if (!uit.length) { toast('Je hebt nog niets ingevuld.'); return; }
  kopieer(uit.join('\n\n'), 'Je aantekeningen zijn gekopieerd.');
});
var wisStap = 0, wisTimer = null;
$('wis').addEventListener('click', function () {
  var b = $('wis');
  if (!wisStap) { wisStap = 1; b.textContent = 'Zeker weten? Tik nog een keer om alles te wissen'; clearTimeout(wisTimer); wisTimer = setTimeout(function () { wisStap = 0; b.textContent = 'Wis mijn aantekeningen'; }, 5000); return; }
  clearTimeout(wisTimer); wisStap = 0; b.textContent = 'Wis mijn aantekeningen';
  TERUG.forEach(function (blok) { blok[2].forEach(function (v) { bewaar(v[0], ''); $(v[0]).value = ''; }); });
  toast('Je aantekeningen zijn gewist.');
});

/* ================= TEAM: startpunt, leiding, over ================= */
(function () {
  var h = '';
  SESSIES.forEach(function (s) {
    h += '<button class="moment" type="button" data-ga="sessie-' + s.id + '-1" style="--k:' + s.kleur + '"><em>' + esc(s.duur) + '</em><b>' + esc(s.naam) + '</b><span>' + esc(s.intro) + '</span></button>';
  });
  $('hub').innerHTML = h;
  h = '';
  LEIDING.forEach(function (r) { h += '<div class="regel"><b>' + esc(r[0]) + '</b><span>' + esc(r[1]) + '</span><i>' + esc(r[2]) + '</i></div>'; });
  $('l-rijen').innerHTML = h;
  h = '';
  SLOOP.forEach(function (r, i) { h += '<div class="sloop"><b>' + (i + 1) + '</b><span><b style="font-weight:500;font-family:var(--body);color:var(--ink)">' + esc(r[0]) + '</b> ' + esc(r[1]) + '</span></div>'; });
  $('l-sloop').innerHTML = h;
  h = '';
  RITME.forEach(function (r) { h += '<div class="regel"><b>' + esc(r[0]) + '</b><span>' + esc(r[1]) + '</span></div>'; });
  $('l-ritme').innerHTML = h;
  h = '';
  VAKKEN.forEach(function (v) { h += '<button class="vak" type="button" data-ga="' + v[4] + '" style="--k:' + v[1] + '"><em>' + esc(v[0]) + '</em><span><b>' + esc(v[2]) + '</b>' + esc(v[3]) + '</span></button>'; });
  $('o-vakken').innerHTML = h;
  $('o-qr').innerHTML = qrSvg(basisUrl());
  $('o-url').textContent = basisUrl();
  $('o-versie').textContent = VERSIE;
})();

/* ================= KAARTEN ================= */
var KSET = 'zalf', KFILT = '', KIX = 0;
function kSoorten() { var r = []; SETS[KSET].forEach(function (c) { if (r.indexOf(c[0]) < 0) r.push(c[0]); }); return r; }
function kLijst() { var r = []; SETS[KSET].forEach(function (c, i) { if (!KFILT || c[0] === KFILT) r.push(i); }); return r; }
function tekenKaarten() {
  alle('#k-sets [data-set]', function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-set') === KSET)); });
  $('k-uitleg').textContent = SETINFO[KSET].uit;
  $('k-strip').innerHTML = strip(KSET, SETINFO[KSET].kort);
  var h = '<button class="chip" type="button" data-f="" aria-pressed="' + (KFILT === '' ? 'true' : 'false') + '">Alle</button>';
  kSoorten().forEach(function (s) { h += '<button class="chip" type="button" data-f="' + esc(s) + '" aria-pressed="' + (KFILT === s ? 'true' : 'false') + '">' + esc(s) + '</button>'; });
  $('k-filters').innerHTML = h;
  var l = kLijst(); if (KIX >= l.length) KIX = 0; if (KIX < 0) KIX = l.length - 1;
  var box = $('k-kaart'); box.style.setProperty('--k', SETINFO[KSET].kleur); box.innerHTML = kaartHTML(KSET, l[KIX]);
  var c = SETS[KSET][l[KIX]];
  $('k-kopieer').hidden = !(KSET === 'verband' && c[2]);
  h = '';
  SETINFO[KSET].regels.forEach(function (r) { h += '<div class="rij"><b>' + esc(r[0]) + '</b><span>' + esc(r[1]) + '</span></div>'; });
  $('k-regeltekst').innerHTML = h;
}
$('k-volgende').addEventListener('click', function () { KIX++; tekenKaarten(); });
$('k-vorige').addEventListener('click', function () { KIX--; tekenKaarten(); });
$('k-kopieer').addEventListener('click', function () { var l = kLijst(); kopieer(SETS[KSET][l[KIX]][1], 'Zin gekopieerd'); });
$('k-filters').addEventListener('click', function (e) { var b = e.target.closest('[data-f]'); if (!b) return; KFILT = b.getAttribute('data-f'); KIX = 0; tekenKaarten(); });
alle('#k-sets [data-set]', function (b) { b.addEventListener('click', function () { ga('kaarten-' + b.getAttribute('data-set')); }); });

/* ================= SESSIE ================= */
var SES = null, IX = 0, klok = null, zelfBladeren = false, uitnodigingOpen = false, inbrengDelen = null;

function fmt(s) { var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
function stopKlok() { if (klok) { clearInterval(klok); klok = null; } }
function liveHier() { var L = Live.sessie(); return (L && SES && L.sid === SES.id) ? L : null; }

function tekenStap() {
  var s = SES.stappen[IX], h = '', i;
  $('v-sessie').style.setProperty('--k', SES.kleur);
  $('s-naam').textContent = SES.naam;
  $('s-tel').textContent = 'stap ' + (IX + 1) + ' van ' + SES.stappen.length;
  $('s-balk').style.width = Math.round((IX + 1) / SES.stappen.length * 100) + '%';
  if (s.opt) h += '<span class="lab opt">Optioneel · overslaan kan met Volgende</span>';
  h += '<h2>' + esc(s.k) + '</h2>';
  if (s.b) h += '<p>' + esc(s.b) + '</p>';
  if (s.ijs != null) h += ijsberg(s.ijs);
  if (s.lees) h += '<div class="lees"><span class="lab">' + esc(s.lees[1]) + '</span><q>' + esc(s.lees[0]) + '</q></div>';
  if (s.vragen) { h += '<div class="vragen">'; for (i = 0; i < s.vragen.length; i++) h += '<div><b>' + (i + 1) + '</b><span>' + esc(s.vragen[i]) + '</span></div>'; h += '</div>'; }
  if (s.kaart) h += '<div class="kaart" style="--k:' + SETINFO[s.kaart[0]].kleur + '">' + kaartHTML(s.kaart[0], s.kaart[1] - 1) + '</div>';
  if (s.set) {
    var set = s.set[0], filt = s.set[1], lijst = [];
    SETS[set].forEach(function (c, n) { if (!filt || c[0] === filt) lijst.push(n); });
    if (!filt) {
      h += '<div class="kaart" style="--k:' + SETINFO[set].kleur + '">' + kaartHTML(set, lijst[Math.floor(Math.random() * lijst.length)]) + '</div>';
      h += '<button class="btn breed" type="button" id="s-andere">Andere kaart</button>';
    } else lijst.forEach(function (n) { h += '<div class="kaart compact" style="--k:' + SETINFO[set].kleur + '">' + kaartHTML(set, n, 1) + '</div>'; });
  }
  if (s.spiegel) h += '<div id="s-spiegel" class="lijst"></div>';
  if (s.sec) h += '<div class="klok"><button class="btn" type="button" id="s-klok">Start ' + (s.sec >= 60 ? (s.sec / 60) + ' min' : s.sec + ' sec') + '</button><output id="s-tijd">' + fmt(s.sec) + '</output></div>';
  h += '<div id="s-inbreng"></div>';
  if (s.tip) h += '<p class="tip">' + esc(s.tip) + '</p>';
  $('s-stap').innerHTML = h;
  stopKlok();
  if ($('s-klok')) $('s-klok').addEventListener('click', function () { loopKlok(s.sec); });
  if ($('s-andere')) $('s-andere').addEventListener('click', tekenStap);
  inbrengDelen = null; kaartDelen = null; spiegelDelen = null; bouwSpiegel(); bouwInbreng();
  tekenLive(); tekenVoet();
  var doel = '#sessie-' + SES.id + '-' + (IX + 1);
  if (location.hash !== doel) { try { history.replaceState(null, '', doel); } catch (e) {} }
  window.scrollTo(0, 0);
}
function loopKlok(sec) {
  stopKlok();
  var rest = sec, out = $('s-tijd'), knop = $('s-klok'); if (!out) return;
  knop.textContent = 'Stop'; out.textContent = fmt(rest);
  klok = setInterval(function () {
    rest--;
    if (rest <= 0) { stopKlok(); out.textContent = 'klaar'; knop.textContent = 'Opnieuw'; knop.onclick = function () { loopKlok(sec); }; return; }
    out.textContent = fmt(rest);
  }, 1000);
  knop.onclick = function () { stopKlok(); out.textContent = fmt(sec); knop.textContent = 'Start opnieuw'; knop.onclick = function () { loopKlok(sec); }; };
}

/* --- inbreng: stemmen en antwoorden, alleen in een live sessie --- */
function bouwInbreng() {
  var box = $('s-inbreng'); if (!box) return;
  box.innerHTML = ''; inbrengDelen = null;
  var s = SES.stappen[IX], L = liveHier();
  var soort = s.inb ? s.inb[0] : (s.uitslag != null ? 'uitslag' : null);
  kaartDelen = null;
  if (soort === 'zin') { bouwZin(box, s); return; }
  if (soort === 'geef') { bouwGeef(box, s); return; }
  if (!L) return;
  if (!soort) return;
  var w = el('div', 'inbreng'), d = { soort: soort, stap: s.uitslag != null ? s.uitslag : IX };
  if (soort === 'kleur') {
    w.appendChild(el('span', 'lab', s.inb[1]));
    d.keuze = el('div', 'kleurkeuze');
    ZONES.forEach(function (z) {
      var b = el('button', 'zone'); b.type = 'button'; b.style.setProperty('--z', z.kleur); b.setAttribute('data-kleur', z.id); b.setAttribute('aria-pressed', 'false');
      b.appendChild(el('i')); b.appendChild(el('span', null, z.naam));
      b.addEventListener('click', function () { Live.stem(IX, z.id); });
      d.keuze.appendChild(b);
    });
    w.appendChild(d.keuze);
  } else if (soort === 'tekst') {
    w.appendChild(el('span', 'lab', s.inb[1]));
    d.veld = el('textarea'); d.veld.maxLength = Live.MAX_TEKST; d.veld.placeholder = 'Typ hier. Er gaat geen naam mee.'; d.veld.setAttribute('aria-label', s.inb[1]);
    d.knop = el('button', 'btn', 'Stuur zonder naam'); d.knop.type = 'button';
    d.knop.addEventListener('click', function () {
      if (!d.veld.value.trim()) return;
      if (Live.antwoord(IX, d.veld.value)) { d.veld.value = ''; toast('Verstuurd, zonder naam.'); }
      else toast('Je kunt per stap maximaal ' + Live.MAX_PER_STAP + ' antwoorden sturen.');
    });
    w.appendChild(d.veld); w.appendChild(d.knop);
    d.eigen = el('div', 'lijst'); w.appendChild(d.eigen);
  } else w.appendChild(el('span', 'lab', 'De verdeling van het rondje'));
  d.teller = el('p', 'teller'); w.appendChild(d.teller);
  d.uit = el('div', 'lijst'); w.appendChild(d.uit);
  d.toon = el('button', 'btn vol breed'); d.toon.type = 'button';
  d.toon.addEventListener('click', function () { Live.laatZien(d.stap); });
  w.appendChild(d.toon);
  w.appendChild(el('p', 'tip', 'Zonder naam. In een klein team kan een antwoord toch herkenbaar zijn.'));
  box.appendChild(w); inbrengDelen = d; ververInbreng();
}
function ververInbreng() {
  ververSpiegel(); ververKaart();
  var d = inbrengDelen, L = liveHier(); if (!d || !L) return;
  var zichtbaar = Live.zichtbaar(d.stap), h = '';
  if (d.soort === 'kleur' || d.soort === 'uitslag') {
    var stemmen = Live.inbreng(d.stap, 'kleur'), mijn = Live.mijn(d.stap, 'kleur')[0];
    if (d.keuze) Array.prototype.forEach.call(d.keuze.children, function (b) { b.setAttribute('aria-pressed', String(!!mijn && mijn.v === b.getAttribute('data-kleur'))); });
    d.teller.textContent = stemmen.length + (stemmen.length === 1 ? ' stem' : ' stemmen') + ' binnen · ' + Live.aantal() + ' in de sessie';
    if (zichtbaar) {
      var max = 1, tel = {}; stemmen.forEach(function (x) { tel[x.v] = (tel[x.v] || 0) + 1; if (tel[x.v] > max) max = tel[x.v]; });
      ZONES.forEach(function (z) { var n = tel[z.id] || 0; h += '<div class="staaf" style="--z:' + z.kleur + '"><span>' + z.naam + '</span><i style="width:' + Math.round(n / max * 100) + '%"></i><b>' + n + '</b></div>'; });
    } else if (!L.host) h = '<p class="tip">De begeleider laat de verdeling zien zodra iedereen heeft gekozen.</p>';
    d.uit.innerHTML = h;
    d.toon.textContent = 'Laat de verdeling zien';
    d.toon.hidden = !L.host || zichtbaar;
    d.toon.disabled = stemmen.length === 0;
  } else {
    var antw = Live.inbreng(d.stap, 'tekst'), eigen = Live.mijn(d.stap, 'tekst');
    d.teller.textContent = antw.length + (antw.length === 1 ? ' antwoord' : ' antwoorden') + ' binnen · ' + Live.aantal() + ' in de sessie';
    if (zichtbaar) {
      antw.forEach(function (x) { h += '<div class="antw"><span>' + esc(x.v) + '</span>' + (x.eigen ? '<button type="button" data-weg="' + esc(x.id) + '">trek terug</button>' : '') + '</div>'; });
      d.uit.innerHTML = h; d.eigen.innerHTML = '';
    } else {
      d.uit.innerHTML = L.host ? '' : '<p class="tip">De antwoorden verschijnen voor iedereen tegelijk, zodra de begeleider ze laat zien.</p>';
      eigen.forEach(function (x) { h += '<div class="antw"><span>' + esc(x.v) + '</span><button type="button" data-weg="' + esc(x.id) + '">trek terug</button></div>'; });
      d.eigen.innerHTML = eigen.length ? '<span class="lab">Jouw inbreng, nog niet zichtbaar voor anderen</span>' + h : '';
    }
    d.toon.textContent = 'Laat de antwoorden zien';
    d.toon.hidden = !L.host || zichtbaar;
    d.toon.disabled = antw.length === 0;
  }
}
$('s-stap').addEventListener('click', function (e) {
  var b = e.target.closest('[data-weg]'); if (b) { Live.trekIn(b.getAttribute('data-weg')); return; }
  b = e.target.closest('[data-haal]'); if (b) { Live.haalWeg(b.getAttribute('data-haal')); return; }
  b = e.target.closest('[data-bewaar]'); if (b) bewaarKaart(b.getAttribute('data-bewaar'));
});

/* --- kaarten in een sessie ---
 * Spiegel: de begeleider kiest één vraag, die op ieders scherm komt.
 * Verband: iedereen kiest zelf één zin, zonder naam; daarna zie je welke zinnen het vaakst gekozen zijn.
 * Zalf:    iedereen geeft een collega een kaart, met erbij wat je zag. */
var kaartDelen = null, spiegelDelen = null, geefVan = '';
function soortenVan(set, zonder) { var r = []; SETS[set].forEach(function (c) { if (r.indexOf(c[0]) < 0 && c[0] !== zonder) r.push(c[0]); }); return r; }
function chipRij(waarden, huidig, metAlle, op) {
  var rij = el('div', 'chips');
  (metAlle ? [''] : []).concat(waarden).forEach(function (w) {
    var b = el('button', 'chip', w || 'Alle'); b.type = 'button'; b.setAttribute('aria-pressed', String(w === huidig));
    b.addEventListener('click', function () { Array.prototype.forEach.call(rij.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); }); op(w); });
    rij.appendChild(b);
  });
  return rij;
}

function bouwSpiegel() {
  var box = $('s-spiegel'), s = SES.stappen[IX]; spiegelDelen = null;
  if (!box || !s.spiegel) return;
  var d = { thema: s.spiegel, lokaal: 0 };
  d.gekozen = el('div', 'lijst'); box.appendChild(d.gekozen);
  d.kiezer = el('div', 'kiezer');
  d.kiezer.appendChild(el('span', 'lab', 'Kies een fase of thema, en daarna één vraag'));
  d.kiezer.appendChild(chipRij(soortenVan('spiegel'), d.thema, false, function (t) { d.thema = t; ververSpiegel(); }));
  d.lijst = el('div', 'keuzelijst'); d.kiezer.appendChild(d.lijst);
  d.lijst.addEventListener('click', function (e) {
    var b = e.target.closest('[data-nr]'); if (!b) return;
    var nr = +b.getAttribute('data-nr'), L = liveHier();
    if (L && L.host) Live.kies(IX, nr); else { d.lokaal = nr; ververSpiegel(); }
  });
  box.appendChild(d.kiezer);
  spiegelDelen = d; ververSpiegel();
}
function ververSpiegel() {
  var d = spiegelDelen; if (!d || !$('s-spiegel')) return;
  var L = liveHier(), nr = L ? Live.gekozen(IX) : d.lokaal, magKiezen = !L || L.host, h = '';
  if (nr && SETS.spiegel[nr - 1]) {
    h = '<div class="kaart groot" style="--k:' + SETINFO.spiegel.kleur + '">' + kaartHTML('spiegel', nr - 1) + '</div>';
    if (L) h += '<p class="tip">' + (L.host ? 'Deze vraag staat nu op ieders scherm. Lees hem voor en start de stilte.' : 'De begeleider heeft deze vraag gekozen.') + '</p>';
  } else if (!magKiezen) h = '<p class="melding">De begeleider kiest een vraag. Die verschijnt hier vanzelf.</p>';
  d.gekozen.innerHTML = h;
  d.kiezer.hidden = !magKiezen;
  h = '';
  SETS.spiegel.forEach(function (c, n) {
    if (c[0] === d.thema) h += '<button type="button" class="kies" data-nr="' + (n + 1) + '" aria-pressed="' + (nr === n + 1) + '"><span>' + esc(c[1]) + '</span></button>';
  });
  d.lijst.innerHTML = h;
}

function bouwZin(box, s) {
  var w = el('div', 'inbreng'), d = { soort: 'zin', stap: IX, filt: s.inb[2] || '', lokaal: 0 };
  w.appendChild(el('span', 'lab', s.inb[1]));
  d.kiesdeel = el('div', 'kiesdeel'); w.appendChild(d.kiesdeel);
  d.kiesdeel.appendChild(chipRij(soortenVan('verband', 'Samen voorbereiden'), d.filt, true, function (f) { d.filt = f; ververKaart(); }));
  d.lijst = el('div', 'keuzelijst'); d.kiesdeel.appendChild(d.lijst);
  d.meer = el('button', 'btn breed', 'Kies opnieuw'); d.meer.type = 'button'; d.meer.addEventListener('click', function () { d.open = true; ververKaart(); }); w.appendChild(d.meer);
  d.lijst.addEventListener('click', function (e) {
    var b = e.target.closest('[data-nr]'); if (!b) return;
    var nr = +b.getAttribute('data-nr');
    if (liveHier()) Live.kiesZin(IX, nr); else { d.lokaal = nr; ververKaart(); }
  });
  d.detail = el('div'); w.appendChild(d.detail);
  d.teller = el('p', 'teller'); w.appendChild(d.teller);
  d.uit = el('div', 'lijst'); w.appendChild(d.uit);
  d.toon = el('button', 'btn vol breed', 'Laat de keuzes zien'); d.toon.type = 'button';
  d.toon.addEventListener('click', function () { Live.laatZien(d.stap); });
  w.appendChild(d.toon);
  d.voet = el('p', 'tip'); w.appendChild(d.voet);
  box.appendChild(w); kaartDelen = d; ververKaart();
}
function parseGeef(x) {
  try { var a = JSON.parse(x.v); return { id: x.id, eigen: x.eigen, nr: a[0] | 0, voor: String(a[1] || ''), verhaal: String(a[2] || ''), van: String(a[3] || '') }; } catch (e) { return null; }
}
function bouwGeef(box, s) {
  var L = liveHier(), w = el('div', 'inbreng'), d = { soort: 'geef', stap: IX, filt: '', nr: 0, namen: '' };
  w.appendChild(el('span', 'lab', s.inb[1]));
  if (L && L.host) {
    var nr = el('div', 'namen');
    nr.appendChild(el('span', 'veldlab', 'Namen van het team (mag leeg blijven)'));
    var rij = el('div', 'rijtje');
    d.namenVeld = el('input'); d.namenVeld.type = 'text'; d.namenVeld.maxLength = 300; d.namenVeld.placeholder = 'Sanne, Tim, Noor'; d.namenVeld.setAttribute('aria-label', 'Namen van het team');
    d.namenVeld.value = Live.namen(IX).join(', ');
    var zet = el('button', 'btn', 'Zet klaar'); zet.type = 'button';
    zet.addEventListener('click', function () { if (!d.namenVeld.value.trim()) return; Live.zetNamen(IX, d.namenVeld.value); toast('De namen staan klaar op ieders telefoon.'); });
    rij.appendChild(d.namenVeld); rij.appendChild(zet); nr.appendChild(rij);
    nr.appendChild(el('p', 'tip', 'Dan kan iedereen een naam aantikken in plaats van typen.'));
    w.appendChild(nr);
  }
  d.kiesdeel = el('div', 'kiesdeel'); w.appendChild(d.kiesdeel);
  d.meer = el('button', 'btn breed', 'Nog een kaart geven'); d.meer.type = 'button'; d.meer.addEventListener('click', function () { d.open = true; ververKaart(); }); w.appendChild(d.meer);
  d.kiesdeel.appendChild(chipRij(soortenVan('zalf'), '', true, function (f) { d.filt = f; ververKaart(); }));
  d.lijst = el('div', 'keuzelijst'); d.kiesdeel.appendChild(d.lijst);
  d.lijst.addEventListener('click', function (e) {
    var b = e.target.closest('[data-nr]'); if (!b) return;
    d.nr = +b.getAttribute('data-nr'); ververKaart();
    if (d.gekozen.scrollIntoView) d.gekozen.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  d.gekozen = el('div'); d.kiesdeel.appendChild(d.gekozen);
  d.form = el('div', 'geefform');
  d.form.appendChild(el('span', 'veldlab', 'Voor wie?'));
  d.voorChips = el('div', 'chips'); d.form.appendChild(d.voorChips);
  d.voorChips.addEventListener('click', function (e) { var b = e.target.closest('[data-naam]'); if (b) { d.voor.value = b.getAttribute('data-naam'); ververKaart(); } });
  d.voor = el('input'); d.voor.type = 'text'; d.voor.maxLength = 40; d.voor.placeholder = 'Voornaam'; d.voor.setAttribute('aria-label', 'Voor wie is deze kaart'); d.voor.autocomplete = 'off';
  d.form.appendChild(d.voor);
  d.form.appendChild(el('span', 'veldlab', 'Wat zag je? Een kaart zonder toelichting is een sticker.'));
  d.verhaal = el('textarea'); d.verhaal.maxLength = 220; d.verhaal.placeholder = 'Bijvoorbeeld: dinsdag bleef je doorvragen bij de voorraad, terwijl de klant er al klaar mee was.'; d.verhaal.setAttribute('aria-label', 'Wat zag je');
  d.form.appendChild(d.verhaal);
  d.form.appendChild(el('span', 'veldlab', 'Van (mag leeg blijven)'));
  d.van = el('input'); d.van.type = 'text'; d.van.maxLength = 30; d.van.placeholder = 'Je voornaam, of laat leeg'; d.van.value = geefVan; d.van.setAttribute('aria-label', 'Van wie'); d.van.autocomplete = 'off';
  d.form.appendChild(d.van);
  var geef = el('button', 'btn vol breed', 'Geef deze kaart'); geef.type = 'button';
  geef.addEventListener('click', function () {
    var voor = d.voor.value.trim(), verhaal = d.verhaal.value.trim();
    if (!d.nr) { toast('Kies eerst een kaart.'); return; }
    if (!voor) { toast('Voor wie is deze kaart?'); d.voor.focus(); return; }
    if (!verhaal) { toast('Vertel erbij wat je zag.'); d.verhaal.focus(); return; }
    geefVan = d.van.value.trim();
    if (Live.geef(IX, d.nr, voor, verhaal, geefVan)) { d.nr = 0; d.voor.value = ''; d.verhaal.value = ''; d.open = false; toast('Kaart gegeven.'); ververKaart(); }
    else toast('Je kunt per ronde maximaal ' + Live.MAX_KAARTEN + ' kaarten geven.');
  });
  d.form.appendChild(geef);
  d.kiesdeel.appendChild(d.form);
  d.eigen = el('div', 'lijst'); w.appendChild(d.eigen);
  d.teller = el('p', 'teller'); w.appendChild(d.teller);
  d.uit = el('div', 'lijst'); w.appendChild(d.uit);
  d.toon = el('button', 'btn vol breed', 'Laat de kaarten zien'); d.toon.type = 'button';
  d.toon.addEventListener('click', function () { Live.laatZien(d.stap); });
  w.appendChild(d.toon);
  d.voet = el('p', 'tip'); w.appendChild(d.voet);
  box.appendChild(w); kaartDelen = d; ververKaart();
}
function gegevenHTML(k, L, zichtbaar) {
  var c = SETS.zalf[k.nr - 1]; if (!c) return '';
  return '<div class="gegeven"><b>' + esc(c[1]) + '</b><span>' + esc(k.verhaal) + '</span>' + (k.van ? '<i>van ' + esc(k.van) + '</i>' : '') +
    '<div class="acties">' + (zichtbaar ? '<button type="button" data-bewaar="' + esc(k.id) + '">bewaar</button>' : '') +
    (k.eigen ? '<button type="button" data-weg="' + esc(k.id) + '">trek terug</button>' : (L && L.host ? '<button type="button" data-haal="' + esc(k.id) + '">haal weg</button>' : '')) + '</div></div>';
}
function ververKaart() {
  var d = kaartDelen; if (!d || !$('s-inbreng')) return;
  var L = liveHier(), h = '', zichtbaar = L ? Live.zichtbaar(d.stap) : false, dicht = zichtbaar && !d.open;
  d.kiesdeel.hidden = dicht; d.meer.hidden = !dicht;
  if (d.soort === 'zin') {
    var eigen = L ? Live.mijn(d.stap, 'zin')[0] : null, mijnNr = L ? (eigen ? +eigen.v : 0) : d.lokaal;
    SETS.verband.forEach(function (c, n) {
      if (c[0] === 'Samen voorbereiden' || (d.filt && c[0] !== d.filt)) return;
      h += '<button type="button" class="kies" data-nr="' + (n + 1) + '" aria-pressed="' + (mijnNr === n + 1) + '"><span>&ldquo;' + esc(c[1]) + '&rdquo;</span></button>';
    });
    d.lijst.innerHTML = h;
    var mc = SETS.verband[mijnNr - 1];
    d.detail.innerHTML = mc ? '<div class="gevolg los"><b>' + esc(mc[3]) + '</b><span>' + esc(mc[4]) + '</span></div>' : '';
    if (!L) {
      d.teller.hidden = true; d.toon.hidden = true; d.uit.innerHTML = '';
      d.voet.textContent = 'In een live sessie kiest iedereen zonder naam op de eigen telefoon, en zie je daarna welke zinnen het vaakst gekozen zijn.';
      return;
    }
    var keuzes = Live.inbreng(d.stap, 'zin');
    d.teller.hidden = false;
    d.teller.textContent = keuzes.length + ' van ' + Live.aantal() + ' hebben gekozen';
    h = '';
    if (zichtbaar) {
      var tel = {}, volg = [];
      keuzes.forEach(function (x) { var n = +x.v; if (!SETS.verband[n - 1]) return; if (!tel[n]) { tel[n] = 0; volg.push(n); } tel[n]++; });
      volg.sort(function (a, b) { return tel[b] - tel[a] || a - b; });
      volg.forEach(function (n, i) {
        var c = SETS.verband[n - 1];
        h += '<div class="tel' + (i === 0 ? ' top' : '') + '"><b>' + tel[n] + '×</b><div><span>&ldquo;' + esc(c[1]) + '&rdquo;</span><i>' + esc(c[3]) + ': ' + esc(c[4]) + '</i></div></div>';
      });
      if (volg.length) h = '<span class="lab">Het vaakst gekozen staat bovenaan</span>' + h;
    } else if (!L.host) h = '<p class="tip">De begeleider laat zien welke zinnen het vaakst gekozen zijn.</p>';
    d.uit.innerHTML = h;
    d.toon.hidden = !L.host || zichtbaar; d.toon.disabled = keuzes.length === 0;
    d.voet.textContent = 'Zonder naam. Je kiest een zin voor jezelf; je stuurt hem niet naar iemand.';
    return;
  }
  // Zalf
  SETS.zalf.forEach(function (c, n) {
    if (d.filt && c[0] !== d.filt) return;
    h += '<button type="button" class="kies" data-nr="' + (n + 1) + '" aria-pressed="' + (d.nr === n + 1) + '"><span>' + esc(c[1]) + '</span>' + (c[3] ? '<em>prijs</em>' : '') + '</button>';
  });
  d.lijst.innerHTML = h;
  d.gekozen.innerHTML = d.nr ? '<div class="kaart compact" style="--k:' + SETINFO.zalf.kleur + '">' + kaartHTML('zalf', d.nr - 1) + '</div>' : '';
  if (!L) {
    d.form.hidden = true; d.teller.hidden = true; d.toon.hidden = true; d.eigen.innerHTML = ''; d.uit.innerHTML = '';
    d.voet.textContent = 'Kies een kaart en geef het compliment hardop, met erbij wat je zag. In een live sessie geeft iedereen een kaart vanaf de eigen telefoon.';
    return;
  }
  d.form.hidden = !d.nr;
  var kaarten = Live.inbreng(d.stap, 'zalf').map(parseGeef).filter(Boolean);
  var namen = Live.namen(d.stap).slice();
  if (zichtbaar) kaarten.forEach(function (k) { if (k.voor && namen.map(function (x) { return x.toLowerCase(); }).indexOf(k.voor.toLowerCase()) < 0) namen.push(k.voor); });
  var sleutel = namen.join('|') + '#' + d.voor.value;
  if (sleutel !== d.namen) {
    d.namen = sleutel; h = '';
    namen.forEach(function (n) { h += '<button type="button" class="chip" data-naam="' + esc(n) + '" aria-pressed="' + (n.toLowerCase() === d.voor.value.trim().toLowerCase()) + '">' + esc(n) + '</button>'; });
    d.voorChips.innerHTML = h; d.voorChips.hidden = !namen.length;
  }
  d.teller.hidden = false;
  d.teller.textContent = kaarten.length + (kaarten.length === 1 ? ' kaart gegeven' : ' kaarten gegeven') + ' · ' + Live.aantal() + ' in de sessie';
  h = '';
  if (zichtbaar) {
    var groepen = {}, volgorde = [];
    kaarten.forEach(function (k) { var s = k.voor.toLowerCase(); if (!groepen[s]) { groepen[s] = { naam: k.voor, k: [] }; volgorde.push(s); } groepen[s].k.push(k); });
    volgorde.sort();
    volgorde.forEach(function (s) {
      h += '<div class="voor"><span class="lab">Voor ' + esc(groepen[s].naam) + '</span>';
      groepen[s].k.forEach(function (k) { h += gegevenHTML(k, L, true); });
      h += '</div>';
    });
    d.uit.innerHTML = h; d.eigen.innerHTML = '';
  } else {
    d.uit.innerHTML = L.host ? '' : '<p class="tip">De kaarten verschijnen voor iedereen tegelijk, zodra de begeleider ze laat zien.</p>';
    var mijnK = kaarten.filter(function (k) { return k.eigen; });
    mijnK.forEach(function (k) { h += '<div class="voor"><span class="lab">Voor ' + esc(k.voor) + '</span>' + gegevenHTML(k, L, false) + '</div>'; });
    d.eigen.innerHTML = mijnK.length ? '<span class="lab">Jouw kaarten, nog niet zichtbaar voor anderen</span>' + h : '';
  }
  d.toon.hidden = !L.host || zichtbaar; d.toon.disabled = kaarten.length === 0;
  d.voet.textContent = zichtbaar ? 'Lees je eigen kaart voor en vertel erbij wat je zag. Met “bewaar” zet je een kaart bij Terug, alleen op dit toestel.' : 'Bij een compliment hoort een naam: voor wie het is, en als je wilt ook van wie.';
}
function gekregen() { try { return JSON.parse(lees('gekregen') || '[]') || []; } catch (e) { return []; } }
function bewaarKaart(id) {
  var L = liveHier(); if (!L || !kaartDelen) return;
  var k = Live.inbreng(kaartDelen.stap, 'zalf').map(parseGeef).filter(function (x) { return x && x.id === id; })[0]; if (!k) return;
  var c = SETS.zalf[k.nr - 1], lijst = gekregen();
  if (lijst.some(function (x) { return x.id === id; })) { toast('Deze kaart staat al bij Terug.'); return; }
  lijst.unshift({ id: id, k: c[1], s: c[0], voor: k.voor, t: k.verhaal, van: k.van, d: new Date().toISOString().slice(0, 10) });
  bewaar('gekregen', JSON.stringify(lijst.slice(0, 60)));
  tekenGekregen(); toast('Bewaard bij Terug, alleen op dit toestel.');
}
function tekenGekregen() {
  var box = $('t-gekregen'); if (!box) return;
  var lijst = gekregen(), h = '<span class="lab">Kaarten die ik heb bewaard</span>';
  box.hidden = !lijst.length;
  lijst.forEach(function (x, i) {
    h += '<div class="gegeven"><b>' + esc(x.k) + '</b><span>' + esc(x.t) + '</span><i>voor ' + esc(x.voor) + (x.van ? ' · van ' + esc(x.van) : '') + ' · ' + esc(x.d) + '</i><div class="acties"><button type="button" data-kaartweg="' + i + '">verwijder</button></div></div>';
  });
  box.innerHTML = h;
}

/* --- live: balk, uitnodiging, voet --- */
function uitnodigLink(L) { return basisUrl() + '#j-' + L.sid + '-' + L.code; }
function tekenLive() {
  var L = liveHier(), balk = $('s-live'), uit = $('s-uitnodiging');
  $('s-startlive').hidden = !!L || !Live.beschikbaar();
  $('s-liveuitleg').hidden = !!L || !Live.beschikbaar();
  $('s-livekaart').hidden = !!L || !Live.beschikbaar();
  $('s-geenlive').hidden = Live.beschikbaar();
  $('s-print').hidden = !!L && !L.host;
  if (!L) { balk.hidden = true; uit.hidden = true; return; }
  balk.hidden = false;
  var status = L.fout === 'verbinding' ? 'Verbinding kwijt, opnieuw proberen…' : L.fout === 'zenden' ? 'Versturen lukt niet op dit netwerk' : !L.verbonden ? 'Verbinden…' : (L.alleen && !L.host) ? 'Wachten op de begeleider…' : 'Live';
  balk.className = 'livebalk' + (status === 'Live' ? '' : ' uit');
  var n = Live.aantal();
  balk.innerHTML = '<span class="punt"></span><span><b style="font-weight:500">' + esc(status) + '</b> · <code>' + Live.toonCode(L.code) + '</code> · ' + n + (n === 1 ? ' deelnemer' : ' deelnemers') + '</span>' +
    (L.host ? '<button class="btn klein" type="button" data-live="uitnodigen">' + (uitnodigingOpen ? 'Verberg code' : 'Toon code') + '</button><button class="btn klein" type="button" data-live="stop" style="margin-left:0">Sluit af</button>'
            : '<button class="btn klein" type="button" data-live="stop">Verlaat</button>');
  if (L.host && uitnodigingOpen) {
    uit.hidden = false;
    uit.innerHTML = '<span class="lab">Nodig je team uit</span><div class="uitnodiging"><div class="qrtegel">' + qrSvg(uitnodigLink(L)) + '</div><div class="tekst">' +
      '<p style="font-size:.9375rem">Laat iedereen deze code scannen met de camera van de telefoon. Of ga naar het tabblad Team en vul de code in:</p>' +
      '<p class="grotecode">' + Live.toonCode(L.code) + '</p>' +
      '<button class="btn klein" type="button" data-live="link" style="align-self:flex-start">Kopieer de link</button></div></div>' +
      '<p class="tip">Iedereen volgt jouw stap. Stemmen en antwoorden komen binnen zonder naam; jij bepaalt wanneer ze zichtbaar worden. De berichten zijn versleuteld met deze code.</p>';
  } else uit.hidden = true;
}
function tekenVoet() {
  var L = liveHier(), v = $('voetin'), laatsteStap = IX === SES.stappen.length - 1;
  if (L && !L.host && !zelfBladeren) {
    v.innerHTML = '<span class="status">De begeleider bepaalt de stap.</span><button class="btn klein" type="button" data-voet="zelf" style="flex:0 0 auto">Zelf bladeren</button>';
  } else {
    v.innerHTML = '<button class="btn" type="button" data-voet="vorige"' + (IX === 0 ? ' disabled' : '') + '>Vorige</button>' +
      (L && !L.host ? '<button class="btn" type="button" data-voet="volg">Volg begeleider</button>' : '') +
      '<button class="btn vol" type="button" data-voet="volgende">' + (laatsteStap ? 'Klaar' : 'Volgende') + '</button>';
  }
}
function naarStap(i) {
  IX = Math.max(0, Math.min(i, SES.stappen.length - 1));
  var L = liveHier(); if (L && L.host) { Live.zetStap(IX); uitnodigingOpen = false; }
  tekenStap();
}
$('voetin').addEventListener('click', function (e) {
  var b = e.target.closest('[data-voet]'); if (!b || !SES) return;
  var a = b.getAttribute('data-voet'), L = liveHier();
  if (a === 'zelf') { zelfBladeren = true; tekenVoet(); }
  else if (a === 'volg') { zelfBladeren = false; if (L) IX = L.stap; tekenStap(); }
  else if (a === 'vorige') naarStap(IX - 1);
  else if (a === 'volgende') {
    if (IX < SES.stappen.length - 1) naarStap(IX + 1);
    else if (L && L.host) { Live.stop(); ga('team'); toast('De sessie is afgesloten.'); }
    else ga('team');
  }
});
document.addEventListener('keydown', function (e) {
  if ($('v-sessie').hidden || !SES || /^(TEXTAREA|INPUT)$/.test(e.target.tagName)) return;
  var L = liveHier(); if (L && !L.host && !zelfBladeren) return;
  if (e.key === 'ArrowRight' && IX < SES.stappen.length - 1) naarStap(IX + 1);
  if (e.key === 'ArrowLeft' && IX > 0) naarStap(IX - 1);
});
$('s-live').addEventListener('click', function (e) { liveKnop(e); });
$('s-uitnodiging').addEventListener('click', function (e) { liveKnop(e); });
function liveKnop(e) {
  var b = e.target.closest('[data-live]'); if (!b) return;
  var a = b.getAttribute('data-live'), L = Live.sessie();
  if (a === 'uitnodigen') { uitnodigingOpen = !uitnodigingOpen; tekenLive(); }
  else if (a === 'link' && L) kopieer(uitnodigLink(L), 'Link gekopieerd');
  else if (a === 'stop') { var wasHost = L && L.host; Live.stop(); toast(wasHost ? 'De sessie is afgesloten voor iedereen.' : 'Je hebt de sessie verlaten.'); }
}
$('s-startlive').addEventListener('click', function () {
  var knop = $('s-startlive'); knop.disabled = true; knop.textContent = 'Starten…';
  Live.start(SES.id, IX).then(function () { uitnodigingOpen = true; zelfBladeren = false; tekenStap(); window.scrollTo(0, 0); },
    function () { toast('Een live sessie starten lukt niet in deze browser.'); })
    .then(function () { knop.disabled = false; knop.textContent = 'Start live sessie'; });
});
$('s-terug').addEventListener('click', function () { ga('team'); });

Live.op(function (wat) {
  var L = Live.sessie();
  if (wat === 'einde' || wat === 'afgesloten') {
    inbrengDelen = null; zelfBladeren = false; uitnodigingOpen = false; wachtOpCode = false;
    if (SES && !$('v-sessie').hidden) tekenStap();
    tekenTeamLive();
    if (wat === 'afgesloten') toast('De begeleider heeft de sessie afgesloten.');
    return;
  }
  if (!L) return;
  // meedoen met alleen een code: zodra we weten welke sessie het is, gaan we erheen
  if (wachtOpCode && L.sid) { wachtOpCode = false; $('meedoen-melding').textContent = ''; ga('sessie-' + L.sid + '-' + (L.stap + 1)); return; }
  if (wachtOpCode && wat === 'status' && L.alleen) $('meedoen-melding').textContent = 'Er reageert nog niemand op deze code. Klopt de code, en loopt de sessie al?';
  if (wachtOpCode && wat === 'status' && L.fout) $('meedoen-melding').textContent = 'Verbinden lukt niet op dit netwerk. Probeer het via mobiel internet.';
  tekenTeamLive();
  if (!SES || $('v-sessie').hidden || L.sid !== SES.id) return;
  if ((wat === 'stap' || wat === 'staat') && !L.host && !zelfBladeren && L.stap !== IX && L.stap < SES.stappen.length) { IX = L.stap; tekenStap(); return; }
  if (wat === 'status' || wat === 'wie' || wat === 'staat') tekenLive();
  ververInbreng();
});

/* --- meedoen met een code --- */
var wachtOpCode = false;
$('meedoen').addEventListener('submit', function (e) {
  e.preventDefault();
  var code = Live.normCode($('codeveld').value), m = $('meedoen-melding');
  if (!code) { m.textContent = 'Een code bestaat uit acht tekens, bijvoorbeeld K7M2-QXPA.'; return; }
  if (!Live.beschikbaar()) { m.textContent = 'Live meedoen lukt niet in deze browser.'; return; }
  m.textContent = 'Verbinden…'; wachtOpCode = true;
  Live.doeMee(code).catch(function () { wachtOpCode = false; m.textContent = 'Verbinden lukt niet.'; });
});
function tekenTeamLive() {
  var L = Live.sessie(), oud = $('teamlive');
  if (oud) oud.parentNode.removeChild(oud);
  if (!L || !L.sid || !sessie(L.sid)) return;
  var c = el('section', 'livebalk'); c.id = 'teamlive';
  c.innerHTML = '<span class="punt"></span><span>Live sessie <code>' + Live.toonCode(L.code) + '</code> · ' + esc(sessie(L.sid).naam) + '</span><button class="btn klein" type="button" data-ga="sessie-' + L.sid + '-' + (L.stap + 1) + '">Ga terug</button>';
  $('v-team').insertBefore(c, $('v-team').firstChild);
}

/* --- printen --- */
$('s-print').addEventListener('click', function () {
  if (!SES) return;
  var h = '<h2>' + esc(SES.naam) + ' &middot; ' + esc(SES.duur) + '</h2><p>' + esc(SES.intro) + '</p>';
  SES.stappen.forEach(function (s, i) {
    h += '<h3>' + (i + 1) + '. ' + esc(s.k) + (s.opt ? ' (optioneel)' : '') + '</h3>';
    if (s.b) h += '<p>' + esc(s.b) + '</p>';
    if (s.lees) h += '<p class="pq">&ldquo;' + esc(s.lees[0]) + '&rdquo;</p>';
    if (s.vragen) { h += '<ul>'; s.vragen.forEach(function (v) { h += '<li>' + esc(v) + '</li>'; }); h += '</ul>'; }
    if (s.kaart) { var c = SETS[s.kaart[0]][s.kaart[1] - 1]; h += '<p class="pq">' + esc(c[1]) + '</p><p>' + esc(c[3]) + ': ' + esc(c[4]) + '</p>'; }
    if (s.set) { h += '<ul>'; SETS[s.set[0]].forEach(function (c) { if (!s.set[1] || c[0] === s.set[1]) h += '<li>' + esc(c[1]) + '</li>'; }); h += '</ul>'; }
    if (s.spiegel) { h += '<p>Bijvoorbeeld bij ' + esc(s.spiegel) + ':</p><ul>'; SETS.spiegel.forEach(function (c) { if (c[0] === s.spiegel) h += '<li>' + esc(c[1]) + '</li>'; }); h += '</ul>'; }
    if (s.inb && s.inb[0] === 'zin') { h += '<ul>'; SETS.verband.forEach(function (c) { if (c[0] !== 'Samen voorbereiden' && (!s.inb[2] || c[0] === s.inb[2])) h += '<li>' + esc(c[1]) + '</li>'; }); h += '</ul>'; }
    if (s.inb && s.inb[0] === 'geef') h += '<p>Gebruik de kaarten uit Zalf (vak 3).</p>';
    if (s.sec) h += '<p>Tijd: ' + fmt(s.sec) + '</p>';
    if (s.tip) h += '<p>' + esc(s.tip) + '</p>';
  });
  h += '<p>EHBO-doos &middot; Busje Oranje &middot; antwoorden leg je niet vast</p>';
  $('printblok').innerHTML = h; window.print();
});

/* ================= navigatie ================= */
var TABS = [['nu', 'Nu', 'M3 12h4l2-6 3 12 2-6h5'],
            ['plan', 'Plan', 'M4 3h12v14H4zM7 7h6M7 10h6M7 13h4'],
            ['check', 'Check', 'M3 10l4 4 10-10'],
            ['team', 'Team', 'M7 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM14 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM2 17c0-3 2-5 5-5s5 2 5 5M13 12c3 0 5 2 5 5'],
            ['terug', 'Terug', 'M4 10a6 6 0 1 1 2 4.5M4 6v4h4']];
var VIEWS = ['nu', 'plan', 'check', 'team', 'sessie', 'kaarten', 'leiding', 'terug', 'over'];
var TABVAN = { sessie: 'team', kaarten: 'team', leiding: 'team', over: 'nu' };
var KOPPEN = { kaarten: ['Losse kaarten', 'Zalf, Verband en Spiegel'], leiding: ['Voor wie leiding geeft', 'Het onderdeel dat de zes vakken met elkaar verbindt'], over: ['Over de EHBO-doos', 'Zes vakken, één app'] };
TABS.forEach(function (t) {
  var b = el('button'); b.type = 'button'; b.setAttribute('data-ga', t[0]);
  b.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="' + t[2] + '"/></svg><span>' + t[1] + '</span>';
  $('nav').appendChild(b);
});
function toon(view) {
  VIEWS.forEach(function (v) { $('v-' + v).hidden = (v !== view); });
  var tab = TABVAN[view] || view;
  Array.prototype.forEach.call($('nav').children, function (b) { if (b.getAttribute('data-ga') === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  $('navbalk').hidden = (view === 'sessie'); $('voet').hidden = (view !== 'sessie');
  var k = KOPPEN[view] || ['EHBO-doos', 'Voor als het spannend wordt'];
  $('kop').textContent = k[0]; $('onderkop').textContent = k[1];
  if (view !== 'sessie') { stopKlok(); houdWakker(false); } else houdWakker(true);
}
function ga(doel) { if (location.hash === '#' + doel) route(); else location.hash = '#' + doel; }
function route() {
  var h = decodeURIComponent((location.hash || '').replace(/^#/, '')) || 'nu', d = h.split('-');
  if (d[0] === 'j' && d.length >= 3) {            // uitnodigingslink: #j-<sessie>-<code>
    var code = Live.normCode(d[d.length - 1]), sid = d[1];
    try { history.replaceState(null, '', '#sessie-' + sid + '-1'); } catch (e) {}
    if (code && sessie(sid) && Live.beschikbaar()) { zelfBladeren = false; Live.doeMee(code, sid).then(route, route); toast('Je doet mee met de live sessie.'); }
    else if (!Live.beschikbaar()) toast('Live meedoen lukt niet in deze browser. Je kunt de sessie wel volgen.');
    h = 'sessie-' + sid + '-1'; d = h.split('-');
  }
  if (d[0] === 'sessie' && sessie(d[1])) {
    SES = sessie(d[1]); IX = Math.max(0, Math.min((parseInt(d[2], 10) || 1) - 1, SES.stappen.length - 1));
    var L = liveHier();
    if (L && !L.host && !zelfBladeren && L.staatGezien) IX = Math.min(L.stap, SES.stappen.length - 1);
    if (L && L.host && L.stap !== IX) Live.zetStap(IX);
    toon('sessie'); tekenStap(); return;
  }
  if (d[0] === 'kaarten') {
    var set = SETS[d[1]] ? d[1] : 'zalf';
    if (set !== KSET) { KSET = set; KFILT = ''; KIX = 0; }
    if (d[2] != null && kSoorten()[+d[2] - 1]) { KFILT = kSoorten()[+d[2] - 1]; KIX = 0; }
    toon('kaarten'); tekenKaarten(); window.scrollTo(0, 0); return;
  }
  if (VIEWS.indexOf(h) < 0 || h === 'sessie') h = 'nu';
  toon(h);
  if (h === 'team') tekenTeamLive();
  window.scrollTo(0, 0);
}
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-ga]'); if (!b) return;
  e.preventDefault(); ga(b.getAttribute('data-ga'));
});
window.addEventListener('hashchange', route);

/* ================= installeren en offline ================= */
var installVraag = null;
window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installVraag = e; $('installeer').hidden = false; });
$('installeer').addEventListener('click', function () { if (!installVraag) return; installVraag.prompt(); installVraag = null; $('installeer').hidden = true; });
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
}

/* ================= tekeningen op vaste plekken ================= */
if ($('p-strip')) $('p-strip').innerHTML = strip('pleister', ['Je merkt het eerst in je lijf, niet in je agenda', 'Tien minuten pauze levert meer op dan tien minuten doorploeteren', 'Een pauze die je niet hoeft te verstoppen']);
if ($('l-strip')) $('l-strip').innerHTML = strip('leiding', ['Jij gaat als eerste, en niet altijd in het groen', 'Jij laat de stilte vallen', 'Jij doet er zichtbaar iets mee']);
if ($('o-busje')) $('o-busje').innerHTML = T.busje || '';

/* ================= start ================= */
tekenGekregen();
$('t-gekregen').addEventListener('click', function (e) {
  var b = e.target.closest('[data-kaartweg]'); if (!b) return;
  var lijst = gekregen(); lijst.splice(+b.getAttribute('data-kaartweg'), 1); bewaar('gekregen', JSON.stringify(lijst)); tekenGekregen();
});
trek();
Live.hervat().then(route, route);
route();
})();
