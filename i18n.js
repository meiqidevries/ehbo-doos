/* EHBO-doos · taal
 * De app is in het Nederlands geschreven. Kiest iemand Engels, dan vervangt dit bestand
 * de teksten op het scherm door de vertaling uit en.js. Eigen invoer blijft ongemoeid. */
(function () {
  'use strict';
  var taal = 'nl';
  try { taal = localStorage.getItem('ehbo.taal') || 'nl'; } catch (e) {}
  window.EHBO_TAAL = taal;
  window.EHBO_zetTaal = function (t) { try { localStorage.setItem('ehbo.taal', t); } catch (e) {} location.reload(); };
  var knop = document.getElementById('taalknop');
  if (knop) {
    knop.textContent = taal === 'en' ? 'NL' : 'EN';
    knop.setAttribute('aria-label', taal === 'en' ? 'Schakel naar Nederlands' : 'Switch to English');
    knop.addEventListener('click', function () { window.EHBO_zetTaal(taal === 'en' ? 'nl' : 'en'); });
  }
  if (taal !== 'en') return;
  document.documentElement.lang = 'en';
  var D = window.EHBO_EN || {};
  function mv(n, een, meer) { return n + ' ' + (+n === 1 ? een : meer); }
  var REGELS = [
    [/^“(.+)”$/, function (m) { var v = vert(m[1]); return v == null ? null : '“' + v + '”'; }],
    [/^stap (\d+) van (\d+)$/i, function (m) { return 'step ' + m[1] + ' of ' + m[2]; }],
    [/^Vraag (\d+) van (\d+)$/, function (m) { return 'Question ' + m[1] + ' of ' + m[2]; }],
    [/^(\d+) stem(?:men)? binnen$/, function (m) { return mv(m[1], 'vote', 'votes') + ' in'; }],
    [/^(\d+) antwoord(?:en)? binnen$/, function (m) { return mv(m[1], 'answer', 'answers') + ' in'; }],
    [/^(\d+) in de sessie$/, function (m) { return m[1] + ' in the session'; }],
    [/^(\d+) van (\d+) hebben gekozen$/, function (m) { return m[1] + ' of ' + m[2] + ' have chosen'; }],
    [/^(\d+) kaart(?:en)? gegeven$/, function (m) { return mv(m[1], 'card', 'cards') + ' given'; }],
    [/^(\d+) deelnemers?$/, function (m) { return mv(m[1], 'participant', 'participants'); }],
    [/^Je kunt per stap maximaal (\d+) antwoorden sturen\.$/, function (m) { return 'You can send at most ' + m[1] + ' answers per step.'; }],
    [/^Je kunt per ronde maximaal (\d+) kaarten geven\.$/, function (m) { return 'You can give at most ' + m[1] + ' cards per round.'; }],
    [/^(\d+) van (\d+) beantwoord\. Na de vijfde vraag volgt je conclusie\.$/, function (m) { return m[1] + ' of ' + m[2] + ' answered. Your conclusion follows after the fifth question.'; }],
    [/^(\d+) keer ja, (\d+) keer nee$/, function (m) { return m[1] + ' times yes, ' + m[2] + ' times no'; }],
    [/^(\d+) keer ja, (\d+) keer nee\. Eerst regelen:$/, function (m) { return m[1] + ' times yes, ' + m[2] + ' times no. Arrange first:'; }],
    [/^rondje (\d+)$/, function (m) { return 'round ' + m[1]; }],
    [/^Terug om (.+)$/, function (m) { return 'Back at ' + m[1]; }],
    [/^Tijd: (.+)$/, function (m) { return 'Time: ' + m[1]; }],
    [/^Bijvoorbeeld bij (.+):$/, function (m) { return 'For example at ' + (vert(m[1]) || m[1]) + ':'; }],
    [/^(.+) \(optioneel\)$/, function (m) { var v = vert(m[1]); return v == null ? null : v + ' (optional)'; }],
    [/^(\d+)\. (.+)$/, function (m) { var v = vert(m[2]); return v == null ? null : m[1] + '. ' + v; }],
    [/^- (.+)$/, function (m) { var v = vert(m[1]); return v == null ? null : '- ' + v; }],
    [/^Voor ([^ ].*)$/, function (m) { return 'For ' + m[1]; }],
    [/^voor ([^ ].*)$/, function (m) { return 'for ' + m[1]; }],
    [/^van ([^ ].*)$/, function (m) { return 'from ' + m[1]; }]
  ];
  // één tekst vertalen; null als er geen vertaling is
  function vert(s) {
    var n = String(s).replace(/\s+/g, ' ').trim();
    if (!n) return null;
    if (Object.prototype.hasOwnProperty.call(D, n)) return D[n];
    var i, m, v;
    if (n.indexOf(' · ') > 0) {
      var delen = n.split(' · '), raak = false;
      for (i = 0; i < delen.length; i++) { v = vert(delen[i]); if (v != null) { delen[i] = v; raak = true; } }
      if (raak) return delen.join(' · ');
    }
    if (n.charAt(0) === '·') { v = vert(n.slice(1)); if (v != null) return '· ' + v; }
    for (i = 0; i < REGELS.length; i++) { m = n.match(REGELS[i][0]); if (m) { v = REGELS[i][1](m); if (v != null) return v; } }
    m = n.match(/^(.+?): (.+)$/);
    if (m) { var a = vert(m[1]), b = vert(m[2]); if (a != null && b != null) return a + ': ' + b; }
    return null;
  }
  function metRand(oud, nieuw) { var m = oud.match(/^(\s*)[\s\S]*?(\s*)$/); return m[1] + nieuw + m[2]; }
  var ATTR = ['placeholder', 'aria-label', 'title'];
  function doeTekst(node) {
    var oud = node.nodeValue; if (!oud || node.__ehbo === oud) return;
    var v = vert(oud);
    if (v != null) { var nieuw = metRand(oud, v); if (nieuw !== oud) node.nodeValue = nieuw; }
    node.__ehbo = node.nodeValue;
  }
  function doeAttr(el) {
    for (var i = 0; i < ATTR.length; i++) {
      var a = el.getAttribute && el.getAttribute(ATTR[i]);
      if (a) { var v = vert(a); if (v != null && v !== a) el.setAttribute(ATTR[i], v); }
    }
  }
  function overslaan(el) { return !el || /^(SCRIPT|STYLE|TEXTAREA|CODE)$/.test(el.nodeName) || (el.closest && el.closest('[data-notr]')); }
  function loop(root) {
    if (root.nodeType === 3) { if (!overslaan(root.parentNode)) doeTekst(root); return; }
    if (root.nodeType !== 1 || overslaan(root)) return;
    doeAttr(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null), n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) { if (!overslaan(n.parentNode)) doeTekst(n); }
      else doeAttr(n);
    }
  }
  new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];
      if (m.type === 'characterData') { if (!overslaan(m.target.parentNode)) doeTekst(m.target); }
      else if (m.type === 'attributes') doeAttr(m.target);
      else for (var j = 0; j < m.addedNodes.length; j++) loop(m.addedNodes[j]);
    }
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR });
  if (document.body) loop(document.body);
  var t = vert(document.title); if (t != null) document.title = t;
  // tekst die naar het klembord gaat: per regel, en bij "label: eigen tekst" alleen het label
  window.EHBO_vertaalTekst = function (tekst) {
    return String(tekst).split('\n').map(function (r) {
      var v = vert(r); if (v != null) return metRand(r, v);
      var m = r.match(/^(\s*(?:- )?)([^:]{2,40}): (.*)$/);
      if (m) { var a = vert(m[2]); if (a != null) return m[1] + a + ': ' + (vert(m[3]) || m[3]); }
      return r;
    }).join('\n');
  };
})();
