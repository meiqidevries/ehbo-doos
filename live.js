/* EHBO-doos · live sessies
 *
 * Iedereen met dezelfde sessiecode komt in dezelfde sessie en ziet elkaars inbreng, zonder namen.
 *
 * Hoe het werkt, in vier zinnen:
 * 1. De code is het geheim. Uit de code leiden we een versleutelsleutel en een kanaalnaam af.
 * 2. Elk bericht wordt op het toestel versleuteld (AES-GCM) en naar een doorgeefserver gestuurd.
 * 3. De doorgeefserver ziet alleen de kanaalnaam en onleesbare tekst, en geeft die door aan wie meeluistert.
 * 4. Er is geen database: de stand van de sessie leeft alleen op de toestellen van de deelnemers.
 *
 * De doorgeefserver is een ntfy-server (open source, https://ntfy.sh). Voor de pilot is dat de openbare
 * server; voor een definitieve versie hoort hier het adres van een eigen server te staan. Dat is deze ene regel:
 */
(function () {
  'use strict';
  var RELAY = 'https://ntfy.sh';

  // Alleen bij lokaal testen mag het adres worden overschreven (?relay=http://localhost:8787).
  try {
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
      var q = new URLSearchParams(location.search).get('relay');
      if (q) RELAY = q;
    }
  } catch (e) {}

  var ALFABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // zonder I, L, O, 0 en 1: die lees je verkeerd over
  var MAX_TEKST = 280, MAX_PER_STAP = 5, MAX_BERICHT = 2200;
  var enc = new TextEncoder(), dec = new TextDecoder();
  var S = null;            // de lopende sessie, of null
  var luisteraars = [];
  var rij = Promise.resolve();

  function beschikbaar() {
    return !!(window.crypto && crypto.subtle && window.EventSource && window.fetch && window.isSecureContext !== false);
  }
  function meld(wat) { for (var i = 0; i < luisteraars.length; i++) { try { luisteraars[i](wat, S); } catch (e) {} } }
  function willekeurig(n, tekens) {
    var b = new Uint8Array(n * 2), s = '';
    crypto.getRandomValues(b);
    // verwerp waarden die de verdeling scheef maken
    var grens = 256 - (256 % tekens.length);
    for (var i = 0; i < b.length && s.length < n; i++) if (b[i] < grens) s += tekens[b[i] % tekens.length];
    return s.length === n ? s : willekeurig(n, tekens);
  }
  function nieuweCode() { return willekeurig(8, ALFABET); }
  function normCode(s) {
    s = String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (s.length !== 8) return '';
    for (var i = 0; i < s.length; i++) if (ALFABET.indexOf(s[i]) < 0) return '';
    return s;
  }
  function toonCode(c) { return c ? c.slice(0, 4) + '-' + c.slice(4) : ''; }
  function hex(b) { var s = ''; for (var i = 0; i < b.length; i++) s += (b[i] < 16 ? '0' : '') + b[i].toString(16); return s; }
  function b64(b) { var s = ''; for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
    var t = atob(s), b = new Uint8Array(t.length); for (var i = 0; i < t.length; i++) b[i] = t.charCodeAt(i); return b;
  }

  function afleiden(code) {
    return crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveBits']).then(function (basis) {
      return crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode('ehbo-doos/live/v1'), iterations: 150000, hash: 'SHA-256' }, basis, 384);
    }).then(function (bits) {
      var b = new Uint8Array(bits);
      return crypto.subtle.importKey('raw', b.slice(0, 32), 'AES-GCM', false, ['encrypt', 'decrypt']).then(function (key) {
        return { key: key, topic: 'ehbo' + hex(b.slice(32, 48)) };
      });
    });
  }
  function versleutel(obj) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, S.key, enc.encode(JSON.stringify(obj))).then(function (ct) {
      var c = new Uint8Array(ct), uit = new Uint8Array(12 + c.length); uit.set(iv); uit.set(c, 12); return b64(uit);
    });
  }
  function ontsleutel(tekst) {
    var b = unb64(tekst);
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(0, 12) }, S.key, b.slice(12)).then(function (pt) { return JSON.parse(dec.decode(pt)); });
  }

  /* ---------- versturen ---------- */
  function stuur(obj) {
    if (!S) return Promise.resolve();
    var sessie = S; obj.c = sessie.ik; obj.pv = 1;   // pv = protocolversie
    rij = rij.then(function () {
      if (S !== sessie || !sessie.key) return;
      return versleutel(obj).then(function (tekst) { return post(sessie, tekst, 0); });
    }).catch(function () {});
    return rij;
  }
  function post(sessie, tekst, poging) {
    return fetch(RELAY + '/' + sessie.topic + '?cache=no&firebase=no', { method: 'POST', body: tekst }).then(function (r) {
      if (r.ok) { if (sessie.fout === 'zenden') { sessie.fout = null; meld('status'); } return; }
      throw new Error('status ' + r.status);
    }).catch(function (e) {
      if (S !== sessie) return;
      if (poging < 2) return new Promise(function (ok) { setTimeout(ok, 1500 * (poging + 1)); }).then(function () { return post(sessie, tekst, poging + 1); });
      sessie.fout = 'zenden'; meld('status');
    });
  }

  /* ---------- ontvangen ---------- */
  function luister() {
    var sessie = S;
    if (sessie.es) { try { sessie.es.close(); } catch (e) {} }
    var es = sessie.es = new EventSource(RELAY + '/' + sessie.topic + '/sse');
    es.onopen = function () {
      if (S !== sessie) return;
      sessie.verbonden = true; if (sessie.fout === 'verbinding') sessie.fout = null; meld('status');
      stuur({ t: 'hallo', h: sessie.host ? 1 : 0 });
      if (!sessie.host) {
        clearTimeout(sessie.wachtTimer);
        sessie.wachtTimer = setTimeout(function () { if (S === sessie && !sessie.staatGezien) { sessie.alleen = true; meld('status'); } }, 6000);
      }
    };
    es.onmessage = function (e) {
      if (S !== sessie) return;
      var d; try { d = JSON.parse(e.data); } catch (x) { return; }
      if (!d || d.event !== 'message' || typeof d.message !== 'string') return;
      ontsleutel(d.message).then(function (m) { if (S === sessie) verwerk(m); }).catch(function () {});
    };
    es.onerror = function () {
      if (S !== sessie) return;
      sessie.verbonden = false; sessie.fout = 'verbinding'; meld('status');
      if (es.readyState === 2) { // de browser geeft het op: zelf opnieuw proberen
        clearTimeout(sessie.herTimer);
        sessie.herTimer = setTimeout(function () { if (S === sessie) luister(); }, 4000);
      }
    };
  }

  function ken(id) { if (id && !S.wie[id]) { S.wie[id] = 1; return true; } return false; }

  function verwerk(m) {
    if (!m || m.pv !== 1 || typeof m.c !== 'string') return;
    var nieuwGezicht = ken(m.c), eigen = (m.c === S.ik);
    switch (m.t) {
      case 'hallo':
        if (m.h) S.hostId = m.c;
        if (!eigen) planStaat(m.c);
        if (nieuwGezicht) meld('wie');
        break;
      case 'staat':
        clearTimeout(S.staatTimers[m.voor]); delete S.staatTimers[m.voor];
        if (eigen) break;
        S.staatGezien = true; S.alleen = false;
        if (m.host) S.hostId = m.host;
        if (m.sid && !S.sid) S.sid = m.sid;
        if (typeof m.stap === 'number' && !S.host) S.stap = m.stap;
        (m.toon || []).forEach(function (s) { S.toon[s] = 1; });
        (m.wie || []).forEach(ken);
        (m.weg || []).forEach(function (id) { S.weg[id] = 1; delete S.items[id]; });
        (m.items || []).forEach(function (it) {
          var had = S.items[it[0]];
          if (!S.weg[it[0]] && (!had || (it[5] || 0) > had.n)) S.items[it[0]] = { s: it[1], k: it[2], v: it[3], c: it[4], n: it[5] || 0 };
        });
        meld('staat');
        break;
      case 'stap':
        if (S.hostId && m.c !== S.hostId) break;
        if (!S.hostId) S.hostId = m.c;
        if (typeof m.i === 'number' && !S.host) { S.stap = m.i; meld('stap'); }
        break;
      case 'in':
        if (typeof m.id !== 'string' || m.id.indexOf(m.c + ':') !== 0 || S.weg[m.id]) break;
        if (m.k !== 'kleur' && m.k !== 'tekst') break;
        var v = String(m.v == null ? '' : m.v).slice(0, MAX_TEKST);
        if (!v) break;
        var had = S.items[m.id], n = +m.n || 0;
        if (had && had.n > n) break;
        S.items[m.id] = { s: m.s | 0, k: m.k, v: v, c: m.c, n: n };
        meld('in');
        break;
      case 'weg':
        if (typeof m.id !== 'string' || m.id.indexOf(m.c + ':') !== 0) break;
        S.weg[m.id] = 1; delete S.items[m.id]; meld('in');
        break;
      case 'toon':
        if (S.hostId && m.c !== S.hostId) break;
        S.toon[m.s | 0] = 1; meld('toon');
        break;
      case 'einde':
        if (S.hostId && m.c !== S.hostId) break;
        if (!eigen) { sluit(); meld('afgesloten'); }
        break;
    }
  }

  // Iemand is binnengekomen: één deelnemer stuurt de stand. De begeleider eerst, anders wie het snelst is.
  function planStaat(voor) {
    clearTimeout(S.staatTimers[voor]);
    var sessie = S, wacht = sessie.host ? 150 : 900 + Math.random() * 1200;
    sessie.staatTimers[voor] = setTimeout(function () {
      if (S !== sessie) return;
      delete sessie.staatTimers[voor];
      if (!sessie.host && !sessie.staatGezien) return; // wie zelf nog niets weet, antwoordt niet
      stuurStaat(voor);
    }, wacht);
  }
  function stuurStaat(voor) {
    var basis = { t: 'staat', voor: voor, sid: S.sid, stap: S.stap, host: S.host ? S.ik : (S.hostId || ''),
                  toon: Object.keys(S.toon).map(Number), wie: Object.keys(S.wie), weg: Object.keys(S.weg).slice(-200) };
    var alle = Object.keys(S.items).map(function (id) { var it = S.items[id]; return [id, it.s, it.k, it.v, it.c, it.n]; });
    var delen = [[]], maat = 0;
    alle.forEach(function (it) {
      var l = JSON.stringify(it).length + 1;
      if (maat + l > MAX_BERICHT && delen[delen.length - 1].length) { delen.push([]); maat = 0; }
      delen[delen.length - 1].push(it); maat += l;
    });
    delen.forEach(function (items, i) {
      var m = i === 0 ? JSON.parse(JSON.stringify(basis)) : { t: 'staat', voor: voor, sid: S.sid };
      m.items = items; stuur(m);
    });
  }

  /* ---------- sessie starten, meedoen, stoppen ---------- */
  function bewaar() {
    try { sessionStorage.setItem('ehbo.live', JSON.stringify({ code: S.code, sid: S.sid, host: S.host, ik: S.ik })); } catch (e) {}
  }
  function open(code, sid, host, ik, stap) {
    sluit();
    var sessie = S = { code: code, sid: sid || '', host: !!host, ik: ik || willekeurig(10, ALFABET), hostId: host ? null : '',
          key: null, topic: '', es: null, verbonden: false, fout: null, alleen: false, staatGezien: !!host,
          stap: stap || 0, items: {}, toon: {}, wie: {}, weg: {}, staatTimers: {}, teller: 0 };
    if (host) sessie.hostId = sessie.ik;
    sessie.wie[sessie.ik] = 1;
    meld('status');
    return afleiden(code).then(function (k) {
      if (S !== sessie) return null;
      sessie.key = k.key; sessie.topic = k.topic; bewaar(); luister(); return sessie;
    });
  }
  function start(sid, stap) {
    if (!beschikbaar()) return Promise.reject(new Error('niet beschikbaar'));
    return open(nieuweCode(), sid, true, null, stap || 0);
  }
  function doeMee(code, sid) {
    code = normCode(code);
    if (!code) return Promise.reject(new Error('code'));
    if (!beschikbaar()) return Promise.reject(new Error('niet beschikbaar'));
    return open(code, sid || '', false, null, 0);
  }
  function hervat() {
    var o = null; try { o = JSON.parse(sessionStorage.getItem('ehbo.live') || 'null'); } catch (e) {}
    if (!o || !normCode(o.code) || !beschikbaar()) return Promise.resolve(null);
    return open(o.code, o.sid, o.host, o.ik, 0);
  }
  function sluit() {
    if (!S) return;
    var s = S; S = null;
    try { if (s.es) s.es.close(); } catch (e) {}
    clearTimeout(s.wachtTimer); clearTimeout(s.herTimer);
    Object.keys(s.staatTimers).forEach(function (k) { clearTimeout(s.staatTimers[k]); });
    try { sessionStorage.removeItem('ehbo.live'); } catch (e) {}
  }
  function stop() {
    if (!S) return;
    if (S.host) { var s = S; stuur({ t: 'einde' }).then(function () { if (S === s) { sluit(); meld('einde'); } }); }
    else { sluit(); meld('einde'); }
  }

  /* ---------- wat deelnemers kunnen doen ---------- */
  function zetStap(i) { if (!S || !S.host) return; S.stap = i; stuur({ t: 'stap', i: i }); }
  function laatZien(stap) { if (!S || !S.host) return; S.toon[stap] = 1; stuur({ t: 'toon', s: stap }); meld('toon'); }
  function stem(stap, kleur) {
    if (!S) return;
    var id = S.ik + ':k' + stap;
    var n = Date.now();
    S.items[id] = { s: stap, k: 'kleur', v: kleur, c: S.ik, n: n };
    stuur({ t: 'in', id: id, s: stap, k: 'kleur', v: kleur, n: n }); meld('in');
  }
  function antwoord(stap, tekst) {
    if (!S) return false;
    tekst = String(tekst || '').trim().slice(0, MAX_TEKST);
    if (!tekst || mijn(stap, 'tekst').length >= MAX_PER_STAP) return false;
    var id = S.ik + ':t' + stap + '.' + (++S.teller) + willekeurig(3, ALFABET);
    var n = Date.now();
    S.items[id] = { s: stap, k: 'tekst', v: tekst, c: S.ik, n: n };
    stuur({ t: 'in', id: id, s: stap, k: 'tekst', v: tekst, n: n }); meld('in');
    return true;
  }
  function trekIn(id) {
    if (!S || id.indexOf(S.ik + ':') !== 0) return;
    S.weg[id] = 1; delete S.items[id]; stuur({ t: 'weg', id: id }); meld('in');
  }
  function inbreng(stap, soort) {
    if (!S) return [];
    return Object.keys(S.items).filter(function (id) { var it = S.items[id]; return it.s === stap && it.k === soort; })
      .sort(function (a, b) { return husselwaarde(a) - husselwaarde(b) || (a < b ? -1 : 1); })
      .map(function (id) { var it = S.items[id]; return { id: id, v: it.v, eigen: it.c === S.ik }; });
  }
  // Vaste maar willekeurige volgorde: inzendingen van dezelfde deelnemer staan niet bij elkaar.
  function husselwaarde(id) { var h = 2166136261; for (var i = id.length - 1; i >= 0; i--) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mijn(stap, soort) { return inbreng(stap, soort).filter(function (x) { return x.eigen; }); }

  window.EHBOLive = {
    beschikbaar: beschikbaar, nieuweCode: nieuweCode, normCode: normCode, toonCode: toonCode,
    start: start, doeMee: doeMee, hervat: hervat, stop: stop,
    zetStap: zetStap, laatZien: laatZien, stem: stem, antwoord: antwoord, trekIn: trekIn,
    inbreng: inbreng, mijn: mijn,
    sessie: function () { return S; },
    aantal: function () { return S ? Object.keys(S.wie).length : 0; },
    zichtbaar: function (stap) { return !!(S && S.toon[stap]); },
    op: function (fn) { luisteraars.push(fn); },
    MAX_TEKST: MAX_TEKST, MAX_PER_STAP: MAX_PER_STAP
  };
})();
