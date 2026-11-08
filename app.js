"use strict";
// En route · Französisch für zwei. Inhalte in content/etappen.json, Lernreihenfolge und Quellen in ../Leitfaden.md.
// Login und Speicher: gleiches Supabase-Projekt wie das PARA Cockpit. Eigene Zeilen in der Tabelle items:
// "__enroute" (Profile), "__enroute_p1" und "__enroute_p2" (Fortschritt je Person). Das Cockpit blendet "__"-Zeilen aus.
// Jede Person hat eine eigene Zeile, damit sich zwei Handys beim gleichzeitigen Lernen nichts überschreiben.

const CONFIG = {url:"https://yzntbxbdxtdqgddyicdn.supabase.co", key:"sb_publishable_0hu09OCTj9H1dnam_ztXYQ_0OfPEk1R"};
const ROWS = {meta:"__enroute", p1:"__enroute_p1", p2:"__enroute_p2"};
const LKEY = "enroute-v1";
const INTERVALLE = [1, 3, 7, 16, 35, 80];           // Tage bis zur nächsten Wiederholung (Leitfaden 1.6)
const SCHRITTE = [
  {n:1, t:"Hören", d:"Dialog mit zwei Stimmen, dreimal", min:6},
  {n:2, t:"Verstehen", d:"Fragen, kurze Erklärung, Aussprache", min:4},
  {n:3, t:"Nachsprechen", d:"Satz für Satz, das Handy hört zu", min:6},
  {n:4, t:"Selbst reden", d:"Rollenspiel, du antwortest frei", min:5},
  {n:5, t:"Wiederholen", d:"Die wichtigsten Sätze als Karten", min:4}
];
// Der ganze Weg (Leitfaden Kap. 5). Inhalte gibt es bisher für die ersten drei.
const WEG = [
  {nr:1, t:"Ankommen", fr:"L'arrivée", nv:"A1"}, {nr:2, t:"Bäckerei", fr:"À la boulangerie", nv:"A1"},
  {nr:3, t:"Markt und Käse", fr:"Au marché", nv:"A1"}, {nr:4, t:"Arbeit suchen", fr:"Chercher du travail", nv:"A1"},
  {nr:5, t:"Supermarkt und Etiketten", fr:"Au supermarché", nv:"A1"}, {nr:6, t:"Nachbarn und Freunde", fr:"Les voisins", nv:"A1"},
  {nr:7, t:"Wohnung", fr:"Le logement", nv:"A1/A2"}, {nr:8, t:"Arzt und Apotheke", fr:"Chez le médecin", nv:"A2"},
  {nr:9, t:"Vorstellungsgespräch", fr:"L'entretien d'embauche", nv:"A2"}, {nr:10, t:"Rathaus und Behörden", fr:"À la mairie", nv:"A2"},
  {nr:11, t:"Kirche", fr:"À la paroisse", nv:"A2"}, {nr:12, t:"Kollegen und Kunden", fr:"Au travail", nv:"A2"},
  {nr:13, t:"Küche", fr:"En cuisine", nv:"A2"}, {nr:14, t:"Echte Gespräche", fr:"Pour de vrai", nv:"A2"}
];

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad = n => String(n).padStart(2, "0");
const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (k, n) => { const [y, m, d] = k.split("-").map(Number); return dkey(new Date(y, m - 1, d + n)); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const nr2 = n => "Nº " + pad(n);
function toast(t){ const el = $("#toast"); el.textContent = t; el.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("show"), 2600); }

/* ---------- Symbole (fein gezeichnet, 1,5er Linie) ---------- */
const I = {
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  play:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a.8.8 0 0 0 1.2.7l10.4-6.5a.8.8 0 0 0 0-1.4L9.2 4.8A.8.8 0 0 0 8 5.5z"/></svg>',
  pause:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/></svg>',
  mic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/></svg>',
  stop:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="7" width="10" height="10" rx="1.5"/></svg>',
  laut:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
  haken:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.2 4.2L19 7"/></svg>',
  pfeil:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  zahnrad:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7"/></svg>',
  wdh:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 20v-4.5h4.5"/></svg>'
};
const MOTIV = {
  schluessel:`<svg class="motiv" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="38" cy="46" r="20"/><circle cx="38" cy="46" r="9"/><path d="M53 58l42 42M80 85l7-7M87 92l6-6M72 77l5-5"/>
    <path class="akz" stroke="currentColor" d="M18 92c8-6 18-6 26 0s18 6 26 0" opacity=".9"/></svg>`,
  brot:`<svg class="motiv" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 92L88 22c6-6 14 2 8 8L26 100c-6 6-14-2-8-8z"/><path class="akz" d="M38 76l6 2M50 64l6 2M62 52l6 2M74 40l6 2"/>
    <ellipse cx="78" cy="88" rx="26" ry="16"/><path class="akz" d="M62 84c6-4 10-4 16 0M70 92c6-4 10-4 16 0"/></svg>`,
  kaese:`<svg class="motiv" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 78l64-40 28 18v22L42 100 14 92z"/><path d="M14 78l28 14 64-36M42 92v8"/>
    <path class="akz" d="M20 80l22 11M26 76l18 9" opacity=".7"/><circle class="akz" cx="70" cy="74" r="3"/><circle class="akz" cx="84" cy="66" r="2"/>
    <path d="M70 30l22-16M88 18l6 6"/></svg>`
};
function siegel(cls = "siegel"){
  return `<svg class="${cls}" viewBox="0 0 120 120" aria-hidden="true"><defs><path id="sgk" d="M60 60m-41 0a41 41 0 1 1 82 0a41 41 0 1 1-82 0"/></defs>
    <circle cx="60" cy="60" r="56" fill="currentColor"/><circle cx="60" cy="60" r="50" fill="none" stroke="#FAF6EE" stroke-width="1" opacity=".75"/>
    <circle cx="60" cy="60" r="31" fill="none" stroke="#FAF6EE" stroke-width="1" opacity=".75"/>
    <text font-size="10.5" letter-spacing="3.2" fill="#FAF6EE" font-weight="600"><textPath href="#sgk">EN ROUTE · FRANÇAIS · POUR DEUX ·</textPath></text>
    <text x="60" y="73" text-anchor="middle" font-family="Bodoni Moda, Didot, Georgia, serif" font-size="38" font-weight="700" fill="#FAF6EE">F</text></svg>`;
}

/* ---------- Zustand ---------- */
const blankP = () => ({steps:{}, hoer:{}, cards:{}, days:{}, best:{}, updated:0});
let ST = {v:1, meta:{p1:{name:"", g:"m"}, p2:{name:"", g:"f"}, updated:0}, p:{p1:blankP(), p2:blankP()}, active:null, rate:1, skipLogin:false, uid:null};
try { const j = JSON.parse(localStorage.getItem(LKEY) || "null"); if (j && j.v) ST = {...ST, ...j, p:{p1:{...blankP(), ...(j.p?.p1 || {})}, p2:{...blankP(), ...(j.p?.p2 || {})}}}; } catch (e) {}
const zweiPersonen = () => !!(ST.meta.p2 && ST.meta.p2.name);
const P = () => ST.p[ST.active || "p1"];
const M = () => ST.meta[ST.active || "p1"];
const lv = () => M().g === "f" ? "lf" : "lm";          // Lernstimme passend zur Person
const gform = x => x && typeof x === "object" ? (x[M().g] || x.m) : x;
function saveLocal(){ try { localStorage.setItem(LKEY, JSON.stringify(ST)); } catch (e) {} }
const dirty = new Set();
let sb = null, user = null, sync = "lokal", pushT = null, authChecked = false;
function save(what = ST.active){
  const now = Date.now();
  if (what === "meta") ST.meta.updated = now; else if (what) ST.p[what].updated = now;
  saveLocal();
  if (what) dirty.add(what);
  if (user) { setSync("warte"); clearTimeout(pushT); pushT = setTimeout(push, 900); }
}
function mergeP(a, b){
  const o = blankP();
  for (const k of ["steps", "hoer"]) {
    for (const src of [a[k] || {}, b[k] || {}]) for (const [eid, v] of Object.entries(src)) {
      o[k][eid] = o[k][eid] || {};
      for (const [n, ts] of Object.entries(v)) if (!o[k][eid][n] || ts < o[k][eid][n]) o[k][eid][n] = ts;
    }
  }
  for (const src of [a.cards || {}, b.cards || {}]) for (const [id, c] of Object.entries(src)) {
    const cur = o.cards[id];
    if (!cur || (c.last || 0) > (cur.last || 0)) o.cards[id] = c;
  }
  for (const src of [a.days || {}, b.days || {}]) for (const [d, v] of Object.entries(src)) o.days[d] = Math.max(o.days[d] || 0, v);
  for (const src of [a.best || {}, b.best || {}]) for (const [k, v] of Object.entries(src)) o.best[k] = Math.max(o.best[k] || 0, v);
  o.updated = Math.max(a.updated || 0, b.updated || 0);
  return o;
}
async function push(){
  if (!sb || !user) return;
  clearTimeout(pushT); pushT = null;
  const rows = [...dirty].map(w => w === "meta"
    ? {user_id:user.id, id:ROWS.meta, data:ST.meta, updated_at:ST.meta.updated, deleted:false}
    : {user_id:user.id, id:ROWS[w], data:ST.p[w], updated_at:ST.p[w].updated, deleted:false});
  if (!rows.length) return setSync("ok");
  try {
    const {error} = await sb.from("items").upsert(rows, {onConflict:"user_id,id"});
    if (error) throw error;
    dirty.clear(); setSync("ok");
  } catch (e) { setSync(navigator.onLine ? "fehler" : "offline"); }
}
async function pull(){
  if (!sb || !user) return;
  try {
    const {data, error} = await sb.from("items").select("id,data,updated_at").in("id", Object.values(ROWS));
    if (error) throw error;
    const by = Object.fromEntries((data || []).map(r => [r.id, r]));
    let changed = false;
    const m = by[ROWS.meta];
    if (m && m.data && m.updated_at > (ST.meta.updated || 0)) { ST.meta = {...m.data, updated:m.updated_at}; changed = true; }
    else if ((ST.meta.updated || 0) > (m ? m.updated_at : 0)) dirty.add("meta");
    for (const w of ["p1", "p2"]) {
      const r = by[ROWS[w]];
      if (!r || !r.data) { if (ST.p[w].updated) dirty.add(w); continue; }
      const merged = mergeP(ST.p[w], r.data);
      if (JSON.stringify(merged) !== JSON.stringify(ST.p[w])) { ST.p[w] = merged; changed = true; }
      if ((ST.p[w].updated || 0) > r.updated_at || JSON.stringify(merged) !== JSON.stringify(r.data)) dirty.add(w);
    }
    saveLocal();
    if (dirty.size) await push(); else setSync("ok");
    if (changed && !LAUF.aktiv) render();
  } catch (e) { setSync(navigator.onLine ? "fehler" : "offline"); }
}
function setSync(s){ sync = s; $$(".sync").forEach(el => el.outerHTML = syncPill()); }
function syncPill(){
  const m = {ok:["ok", "Synchron"], warte:["warn", "Speichert"], offline:["warn", "Offline"], fehler:["err", "Sync-Fehler"], lokal:["", user ? "Verbinde" : "Nur hier"]}[sync] || ["", ""];
  return `<span class="sync" title="${user ? "Mit deinem Konto abgeglichen" : "Nur auf diesem Gerät gespeichert"}"><span class="dot ${m[0]}"></span><span class="st">${m[1]}</span></span>`;
}
// Der Lernstand auf dem Gerät gehört zu einem Konto. Meldet sich jemand anderes an (z. B. die Mama auf seinem Handy),
// fängt das Gerät mit einem leeren Stand an und holt ihren aus der Cloud. Ohne Konto Gelerntes übernimmt das erste Konto.
function kontoWechsel(u){
  if (ST.uid && ST.uid !== u.id) {
    ST = {...ST, meta:{p1:{name:"", g:"m"}, p2:{name:"", g:"f"}, updated:0}, p:{p1:blankP(), p2:blankP()}, active:null};
    dirty.clear(); KARTEN.quelle = null;
  }
  ST.uid = u.id; ST.skipLogin = false; saveLocal();
}
async function initAuth(){
  if (!window.supabase) { authChecked = true; render(); return; }
  // detectSessionInUrl: Der Bestätigungslink aus der Registrierungs-Mail meldet direkt hier an
  sb = window.supabase.createClient(CONFIG.url, CONFIG.key, {auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:true}});
  try { const {data} = await sb.auth.getSession(); user = data.session ? data.session.user : null; } catch (e) {}
  if (/access_token|error_description|type=signup/.test(location.hash)) history.replaceState(null, "", location.pathname + "#/");
  if (user) kontoWechsel(user);
  authChecked = true; render();
  if (user) pull();
  sb.auth.onAuthStateChange((ev, s) => { const was = user; user = s ? s.user : null; if (user && !was) { kontoWechsel(user); render(); pull().then(render); } if (!user && was) render(); });
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") pull(); else if (pushT) push(); });
window.addEventListener("online", () => pull());

/* ---------- Inhalte und Audio ---------- */
let C = null, AMAP = {};
async function loadContent(){
  const [c, a] = await Promise.all([
    fetch("content/etappen.json").then(r => r.json()),
    fetch("content/audio.json").then(r => r.json()).catch(() => ({}))
  ]);
  C = c; AMAP = a;
}
const etappe = id => C.etappen.find(e => e.id === id);
const player = new Audio();
player.preservesPitch = true;
let spielId = 0;
function stopAudio(){ spielId++; player.pause(); if (window.speechSynthesis) speechSynthesis.cancel(); }
function play(v, text, rate = ST.rate){
  stopAudio();
  const id = spielId, f = AMAP[`${v}|${text}`];
  return new Promise(res => {
    if (f) {
      player.src = "audio/" + f; player.playbackRate = rate;
      player.onended = () => res(id === spielId); player.onerror = () => res(false);
      player.play().catch(() => res(false));
    } else if (window.speechSynthesis) {      // Notlösung, falls eine Datei fehlt
      const u = new SpeechSynthesisUtterance(text.replace(/…/g, "")); u.lang = "fr-FR"; u.rate = .95 * rate;
      u.onend = () => res(id === spielId); u.onerror = () => res(false);
      speechSynthesis.speak(u);
    } else res(false);
  });
}

/* ---------- Spracherkennung ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let erkenner = null;
function hoerZu(onZwischen){
  return new Promise((res, rej) => {
    if (!SR) return rej("nicht-da");
    stopAudio();
    const r = new SR(); erkenner = r;
    r.lang = "fr-FR"; r.interimResults = true; r.maxAlternatives = 4; r.continuous = false;
    let alts = [], fertig = false;
    r.onresult = e => {
      let txt = "";
      for (let i = 0; i < e.results.length; i++) {
        txt += e.results[i][0].transcript;
        if (e.results[i].isFinal) alts = [...e.results[i]].map(a => a.transcript);
      }
      if (onZwischen) onZwischen(txt);
      if (!alts.length) alts = [txt];
    };
    r.onerror = e => { if (!fertig) { fertig = true; erkenner = null; rej(e.error); } };
    r.onend = () => { if (!fertig) { fertig = true; erkenner = null; res(alts); } };
    try { r.start(); } catch (e) { rej("start"); }
  });
}
function hoerAuf(){ if (erkenner) try { erkenner.stop(); } catch (e) {} }
function srFehler(e){
  if (e === "not-allowed" || e === "service-not-allowed") return "Das Mikrofon ist gesperrt. Erlaub es in Chrome für diese Seite (Schloss neben der Adresse).";
  if (e === "no-speech") return "Ich hab nichts gehört. Tipp aufs Mikrofon und sprich gleich los.";
  if (e === "network") return "Die Spracherkennung braucht Internet.";
  if (e === "nicht-da") return "Dieser Browser kann keine Spracherkennung. Nimm Chrome.";
  return "Das hat nicht geklappt. Versuch's nochmal.";
}
function frNum(n){
  const u = ["zéro","un","deux","trois","quatre","cinq","six","sept","huit","neuf","dix","onze","douze","treize","quatorze","quinze","seize"];
  const t = {20:"vingt", 30:"trente", 40:"quarante", 50:"cinquante", 60:"soixante"};
  if (n < 17) return u[n];
  if (n < 20) return "dix " + u[n - 10];
  if (n < 70) { const d = Math.floor(n / 10) * 10, r = n % 10; return t[d] + (r === 0 ? "" : r === 1 ? " et un" : " " + u[r]); }
  if (n < 80) return n === 71 ? "soixante et onze" : "soixante " + frNum(n - 60);
  if (n < 100) return "quatre vingt" + (n === 80 ? "s" : " " + frNum(n - 80));
  if (n < 1000) { const h = Math.floor(n / 100), r = n % 100; return (h === 1 ? "cent" : u[h] + " cent" + (r ? "" : "s")) + (r ? " " + frNum(r) : ""); }
  return String(n);
}
function woerter(t){
  t = String(t).replace(/(\d+)[,.](\d{1,2})\s*(€|euros?)/gi, "$1 euros $2").replace(/€/g, " euros ")
    .replace(/(\d)\s*kg\b/gi, "$1 kilos").replace(/(\d)\s*g\b/gi, "$1 grammes").replace(/\d+/g, d => " " + frNum(+d) + " ");
  t = t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/œ/g, "oe")
    .replace(/[’'`]/g, " ").replace(/-/g, " ").replace(/[^a-z\s]/g, " ");
  return t.split(/\s+/).filter(Boolean).map(w => w.replace(/s$/, ""));   // Plural-s hört man nicht
}
// Vergleicht den erwarteten Satz mit dem Gehörten (längste gemeinsame Folge), Wort für Wort markiert
function vergleich(soll, gehoert){
  const anzeige = soll.split(/\s+/).filter(Boolean);
  const E = []; anzeige.forEach((w, i) => woerter(w).forEach(x => E.push({w:x, i})));
  let bestes = null;
  for (const g of (Array.isArray(gehoert) ? gehoert : [gehoert])) {
    const S = woerter(g), n = E.length, m = S.length;
    const L = Array.from({length:n + 1}, () => new Array(m + 1).fill(0));
    for (let a = n - 1; a >= 0; a--) for (let b = m - 1; b >= 0; b--)
      L[a][b] = E[a].w === S[b] ? L[a + 1][b + 1] + 1 : Math.max(L[a + 1][b], L[a][b + 1]);
    const ok = new Array(n).fill(false);
    for (let a = 0, b = 0; a < n && b < m;) {
      if (E[a].w === S[b]) { ok[a] = true; a++; b++; } else if (L[a + 1][b] >= L[a][b + 1]) a++; else b++;
    }
    const score = n ? ok.filter(Boolean).length / n : 0;
    if (!bestes || score > bestes.score) bestes = {score, ok, text:g};
  }
  const wortOk = anzeige.map((w, i) => { const idx = E.map((e, k) => e.i === i ? k : -1).filter(k => k >= 0); return idx.length ? idx.every(k => bestes.ok[k]) : true; });
  return {score:bestes ? bestes.score : 0, text:bestes ? bestes.text : "", html:anzeige.map((w, i) => `<span class="w ${wortOk[i] ? "ok" : "nein"}">${esc(w)}</span>`).join(" ")};
}

/* ---------- Fortschritt ---------- */
const stepDone = (eid, n) => !!(P().steps[eid] && P().steps[eid][n]);
const etappeDone = eid => SCHRITTE.every(s => stepDone(eid, s.n));
function markStep(eid, n){
  const p = P(); p.steps[eid] = p.steps[eid] || {};
  const neu = !p.steps[eid][n];
  if (neu) p.steps[eid][n] = Date.now();
  save(); return neu;
}
function aktuelleEtappe(){ return C.etappen.find(e => !etappeDone(e.id)) || null; }
function naechsterSchritt(){
  const e = aktuelleEtappe(); if (!e) return null;
  const s = SCHRITTE.find(s => !stepDone(e.id, s.n));
  return {e, s};
}
function karteId(eid, i){ return `${eid}k${i}`; }
function alleKarten(){
  const out = [];
  for (const e of C.etappen) e.karten.forEach((k, i) => out.push({id:karteId(e.id, i), e, k}));
  return out;
}
function faellig(){
  const heute = dkey(), cs = P().cards;
  return alleKarten().filter(x => cs[x.id] && cs[x.id].due <= heute);
}
function karteEinfuehren(eid){
  const e = etappe(eid), cs = P().cards;
  e.karten.forEach((k, i) => { const id = karteId(eid, i); if (!cs[id]) cs[id] = {b:0, due:dkey(), last:0}; });
}
function karteBewerten(id, gewusst, schonFalsch){
  const cs = P().cards, c = cs[id] || {b:0};
  if (gewusst && !schonFalsch) { c.b = Math.min((c.b || 0) + 1, INTERVALLE.length); c.due = addDays(dkey(), INTERVALLE[c.b - 1]); }
  else { c.b = 0; c.due = addDays(dkey(), 1); }
  c.last = Date.now(); cs[id] = c; save();
}
function zeitBuchen(sek){
  if (sek < 5) return;
  const p = P(), d = dkey(); p.days[d] = Math.round(((p.days[d] || 0) + Math.min(sek, 600) / 60) * 10) / 10; save();
}
function serie(){
  const days = P().days; let n = 0, k = dkey();
  if (!days[k]) k = addDays(k, -1);
  while (days[k]) { n++; k = addDays(k, -1); }
  return n;
}
function heuteListe(){
  const out = [], f = faellig().length, nx = naechsterSchritt();
  if (f) out.push({t:"Wiederholen", d:`${f} ${f === 1 ? "Satz" : "Sätze"} aus früheren Etappen · ca. ${Math.max(2, Math.round(f / 3))} Min.`, href:"#/wdh"});
  if (nx) out.push({t:`Etappe ${nx.e.nr}: ${nx.e.titel}`, d:`Schritt ${nx.s.n}, ${nx.s.t} · ca. ${nx.s.min} Min.`, href:`#/e/${nx.e.id}/${nx.s.n}`});
  return out;
}
function weiterZiel(){ const l = heuteListe(); return l.length ? l[0] : null; }

/* ---------- Laufende Übung (Zeit messen, Audio stoppen) ---------- */
const LAUF = {aktiv:false, seit:0};
function laufStart(){ LAUF.aktiv = true; LAUF.seit = Date.now(); }
function laufEnde(){ if (LAUF.aktiv) zeitBuchen((Date.now() - LAUF.seit) / 1000); LAUF.aktiv = false; stopAudio(); hoerAuf(); }

function stempel(wort = "Bravo"){
  const el = document.createElement("div");
  el.className = "stempel"; el.innerHTML = `<div class="s">${siegel()}<div class="w">${esc(wort)}</div></div>`;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add("weg"), 50);
  setTimeout(() => el.remove(), 1500);
  if (navigator.vibrate) navigator.vibrate(18);
}

/* ---------- Als App installieren ---------- */
let installEvt = null;
const istApp = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; if (C && ["", "einst"].includes(route()[0] || "")) zeichneNeu(); });
addEventListener("appinstalled", () => { installEvt = null; toast("En route ist jetzt auf deinem Startbildschirm"); });
function installBlock(){
  if (istApp()) return "";
  return `<section class="blatt"><span class="label">Aufs Handy</span><h2>Als App installieren</h2>
    ${installEvt ? `<p class="szene">Dann startet En route wie eine echte App vom Startbildschirm.</p><button class="btn klein" data-act="installieren" style="margin-top:8px">Jetzt installieren</button>`
    : `<p class="szene">In Chrome oben rechts auf die drei Punkte tippen, dann „App installieren“ oder „Zum Startbildschirm hinzufügen“.</p>
      <p class="szene">Passiert danach nichts (bei Xiaomi häufig): In den Handy-Einstellungen unter Apps, Chrome, Berechtigungen „Verknüpfungen auf dem Startbildschirm“ erlauben und es nochmal probieren.</p>`}</section>`;
}

/* ---------- Ansichten ---------- */
const route = () => location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
function topbar(backHref, backText = "Zurück"){
  return `<header class="top"><button class="back" data-go="${backHref}">${I.back}${esc(backText)}</button>${syncPill()}</header>`;
}
function datumText(){
  return new Date().toLocaleDateString("de-DE", {weekday:"long", day:"numeric", month:"long"});
}

const LOGIN = {modus:"login", msg:"", ok:false};
function loginView(){
  const neu = LOGIN.modus === "neu";
  return `<div class="page"><div class="mast"><div class="datum">Französisch für zwei</div><h1>En <em>route</em></h1><div class="doppel"></div>
    <div class="unter"><span>Euer Weg nach Frankreich</span><span>${nr2(1)}</span></div></div>
    <div class="runden" role="tablist" style="margin-top:22px"><button role="tab" data-login="login" class="${neu ? "" : "an"}">Anmelden</button><button role="tab" data-login="neu" class="${neu ? "an" : ""}">Neues Konto</button><span class="linie"></span></div>
    <section class="blatt ink" style="--i:1">${neu
      ? `<span class="label">Eigenes Konto</span><h2>Konto anlegen</h2>
        <p class="szene">Mit deiner eigenen E-Mail. Dann hast du deinen eigenen Lernstand, auf jedem Handy.</p>`
      : `<span class="label">Anmelden</span><h2>Mit deinem Konto</h2>
        <p class="szene">Hast du schon ein Konto für das PARA Cockpit, nimm die gleiche E-Mail und das gleiche Passwort.</p>`}
    <form id="login"><div class="fld"><label for="l-mail">E-Mail</label><input type="email" id="l-mail" autocomplete="${neu ? "email" : "username"}" required></div>
    <div class="fld"><label for="l-pw">Passwort${neu ? " (mindestens 8 Zeichen)" : ""}</label><input type="password" id="l-pw" autocomplete="${neu ? "new-password" : "current-password"}" ${neu ? 'minlength="8"' : ""} required></div>
    <p class="fehltext" id="l-msg" style="${LOGIN.ok ? "color:var(--olive)" : ""}">${esc(LOGIN.msg)}</p><button class="btn block" type="submit" id="l-btn">${neu ? "Konto anlegen" : "Anmelden"}</button></form>
    <button class="linkbtn" data-act="skip-login" style="margin-top:12px">Erst mal ohne Konto, nur auf diesem Gerät</button></section></div>`;
}

function setupView(){
  const m = ST.meta;
  const seg = w => `<div class="seg" role="group" aria-label="Anrede"><button type="button" data-g="${w}:m" class="${m[w].g === "m" ? "an" : ""}">er</button><button type="button" data-g="${w}:f" class="${m[w].g === "f" ? "an" : ""}">sie</button></div>`;
  return `<div class="page">${ST.active ? topbar("#/einst", "Einstellungen") : `<header class="top"><span></span>${syncPill()}</header>`}
    <div class="skopf"><span class="label">Wer lernt hier?</span><h1>Wie heißt <em>du?</em></h1>
    <p>Die Anrede braucht die App für Sätze wie „Je suis allemand“ oder „allemande“ und für die passende Stimme beim Üben.</p></div>
    <form id="setup"><section class="blatt ink" style="--i:1"><span class="label">${nr2(1)} · Du</span>
      <div class="fld"><label for="n-p1">Name</label><input type="text" id="n-p1" value="${esc(m.p1.name)}" placeholder="Dein Vorname" autocomplete="given-name" required></div>
      ${seg("p1")}</section>
    <section class="blatt ink" style="--i:2"><span class="label">${nr2(2)} · Freiwillig</span>
      <div class="fld"><label for="n-p2">Zweite Person auf diesem Konto</label><input type="text" id="n-p2" value="${esc(m.p2.name)}" placeholder="Leer lassen, wenn nur du hier lernst" autocomplete="off"></div>
      ${seg("p2")}<p class="szene" style="margin-top:12px">Ihr könnt auch zwei getrennte Konten haben, jede Person mit eigener E-Mail. Dann bleibt das hier leer.</p></section>
    <div class="leiste"><button class="btn block" type="submit">Speichern</button></div></form></div>`;
}

function profilView(){
  const m = ST.meta;
  return `<div class="page"><header class="top"><span></span>${syncPill()}</header>
    <div class="mast"><div class="datum">${esc(datumText())}</div><h1>En <em>route</em></h1><div class="doppel"></div></div>
    <div class="skopf" style="margin-top:22px"><span class="label">Bonjour</span><h1>Wer lernt <em>heute?</em></h1></div>
    <div class="profile">${["p1", "p2"].map((w, i) => {
      const p = ST.p[w], n = Object.values(p.cards).filter(c => c.b >= 1).length;
      return `<button class="profil ink ${ST.active === w ? "an" : ""}" style="--i:${i + 1}" data-profil="${w}"><span class="mono">${esc((m[w].name || "?")[0].toUpperCase())}</span>
        <span><b>${esc(m[w].name)}</b><small>${n} ${n === 1 ? "Satz" : "Sätze"} im Kopf · ${Object.keys(p.steps).filter(etappeDone).length} Etappen geschafft</small></span></button>`; }).join("")}</div>
    <p class="foot"><button class="linkbtn" data-go="#/setup">Namen ändern</button></p></div>`;
}

function homeView(){
  const first = !sessionStorage.getItem("enroute-mast"); sessionStorage.setItem("enroute-mast", "1");
  const titel = [..."En"].map((c, i) => `<span class="ch" style="--c:${i}">${c}</span>`).join("") + " " +
    `<em>${[..."route"].map((c, i) => `<span class="ch" style="--c:${i + 3}">${c}</span>`).join("")}</em>`;
  const liste = heuteListe(), cur = aktuelleEtappe();
  const p = P(), satz = Object.values(p.cards).filter(c => c.b >= 1).length, minuten = Math.round(Object.values(p.days).reduce((a, b) => a + b, 0));
  const fertigHeute = (p.days[dkey()] || 0) > 0;
  const stationen = WEG.map(w => {
    const e = C.etappen.find(x => x.nr === w.nr);
    if (!e) return `<li class="station bald"><span class="pin">${w.nr}</span><div class="zu"><h3>${esc(w.t)}</h3><div class="fr">${esc(w.fr)}</div><div class="meta">${w.nv} · kommt bald</div></div></li>`;
    const done = etappeDone(e.id), jetzt = cur && cur.id === e.id;
    const anz = SCHRITTE.filter(s => stepDone(e.id, s.n)).length;
    return `<li class="station ${done ? "done" : jetzt ? "jetzt offen" : "offen"}"><span class="pin">${done ? I.haken : w.nr}</span>
      <a href="#/e/${e.id}"><h3>${esc(e.titel)}${jetzt ? '<span class="hier">ici</span>' : ""}</h3><div class="fr">${esc(e.fr)}</div>
      <div class="meta">${e.niveau} · ${done ? "geschafft" : `${anz} von 5 Schritten`}</div>${!done && anz ? `<div class="balken"><i style="width:${anz * 20}%"></i></div>` : ""}</a></li>`;
  }).join("");
  return `<div class="page">
    <header class="top"><button class="chip" data-go="${zweiPersonen() ? "#/profil" : "#/einst"}" aria-label="${zweiPersonen() ? "Profil wechseln" : "Einstellungen"}"><span class="mono">${esc((M().name || "?")[0].toUpperCase())}</span>${esc(M().name)}</button>
      <span style="display:flex;align-items:center;gap:10px">${syncPill()}<button class="einstbtn" data-go="#/einst">${I.zahnrad}<span>Einstellungen</span></button></span></header>
    <div class="mast ${first ? "first" : ""}">${siegel()}<div class="datum">${esc(datumText())}</div><h1>${titel}</h1><div class="doppel"></div>
      <div class="unter"><span>Euer Weg nach Frankreich</span><span>Aujourd'hui</span></div></div>
    <section class="heute ink" style="--i:1"><span class="label">Heute dran</span>
      <h2>${liste.length ? (fertigHeute ? "Weiter <em>geht's</em>" : "Auf <em>geht's</em>") : "Alles <em>erledigt</em>"}</h2>
      ${liste.length ? `<ol>${liste.map(x => `<li><div>${esc(x.t)}<small>${esc(x.d)}</small></div></li>`).join("")}</ol>
        <a class="btn block" href="${liste[0].href}">Heute dran ${I.pfeil}</a>`
      : `<p class="leer">${cur ? "" : "Die ersten drei Etappen sind geschafft. Die nächsten kommen bald. Bis dahin: Hör dir einen Dialog nochmal an, ohne Text."}</p>
        <a class="btn ghost block" href="#/e/${C.etappen[C.etappen.length - 1].id}/1">Einen Dialog nochmal hören</a>`}
    </section>
    <div class="stats ink" style="--i:2"><div><b>${serie()}</b><span>Tage am Stück</span></div><div><b>${satz}</b><span>Sätze im Kopf</span></div><div><b>${minuten}</b><span>Minuten</span></div></div>
    <div class="rubrik"><span class="label">Euer Weg nach Frankreich</span><span class="label">14 Etappen</span></div>
    <ol class="weg">${stationen}</ol>
    <p class="ehrlich">Ehrlich gesagt: Die App bringt euch bis zum ersten Gespräch. Danach braucht ihr echte Gespräche mit Franzosen, am Anfang über ein Tandem, später in Frankreich. Dafür gibt es Etappe 14.</p>
    ${!istApp() ? `<p class="foot">${installEvt ? `<button class="btn ghost klein" data-act="installieren">Als App installieren</button>` : `<button class="linkbtn" data-go="#/einst">Als App aufs Handy</button>`}</p>` : ""}
    <p class="foot">${faellig().length ? `<button class="linkbtn" data-go="#/wdh">Nur wiederholen</button> · ` : ""}Lernreihenfolge nach GER, Nation, Krashen und Pimsleur</p>
  </div>`;
}

function etappeView(eid){
  const e = etappe(eid); if (!e) return homeView();
  const nx = SCHRITTE.find(s => !stepDone(eid, s.n));
  return `<div class="page">${topbar("#/", "Übersicht")}
    <div class="etkopf">${MOTIV[e.motiv] || ""}<span class="label"><b>${nr2(e.nr)}</b> · Etappe · ${e.niveau}</span><h1>${esc(e.titel)}</h1><p class="fr">${esc(e.fr)}</p><div class="doppel"></div></div>
    <p class="ziel ink" style="--i:1">${esc(e.ziel)}</p><p class="szene ink" style="--i:2">${esc(e.szene)}</p>
    <div class="rubrik"><span class="label">Fünf Schritte</span><span class="label">20 bis 30 Min.</span></div>
    <ol class="schritte">${SCHRITTE.map((s, i) => `<li class="ink ${nx && nx.n === s.n ? "weiter" : ""}" style="--i:${i + 3}"><a href="#/e/${eid}/${s.n}"><span class="n">${s.n}</span>
      <span class="t">${s.t}<small>${s.d}</small></span><span class="haken">${stepDone(eid, s.n) ? I.haken : ""}</span></a></li>`).join("")}</ol>
    ${nx ? `<div class="leiste"><a class="btn block" href="#/e/${eid}/${nx.n}">${nx.n === 1 ? "Los geht's" : "Weiter"} mit Schritt ${nx.n}: ${nx.t} ${I.pfeil}</a></div>`
      : `<p class="foot">Etappe geschafft. Die Sätze kommen ab jetzt von selbst in der Wiederholung.</p>`}</div>`;
}

function schrittKopf(e, n, titel, text){
  return `${topbar(`#/e/${e.id}`, e.titel)}<div class="skopf"><span class="label"><b>${nr2(e.nr)}</b> · ${esc(e.titel)} · Schritt ${n} von 5</span>
    <h1>${titel}</h1><p>${text}</p><div class="fort">${SCHRITTE.map(s => `<i class="${stepDone(e.id, s.n) ? "an" : s.n === n ? "jetzt" : ""}"></i>`).join("")}</div></div>`;
}
function fertigBlock(e, n, extra = ""){
  const nx = n < 5 ? SCHRITTE[n] : null;
  const ziel = weiterZiel();
  const href = nx && !stepDone(e.id, nx.n) ? `#/e/${e.id}/${nx.n}` : ziel ? ziel.href : "#/";
  const label = nx && !stepDone(e.id, nx.n) ? `Weiter: ${nx.t}` : ziel ? `Weiter: ${ziel.t}` : "Zur Übersicht";
  return `<section class="blatt fertig-blatt ink"><span class="hand">${n === 5 ? "Bravo" : "Très bien"}</span><h2>Schritt ${n} geschafft</h2>${extra}
    <a class="btn block" href="${href}" style="margin-top:14px">${esc(label)} ${I.pfeil}</a>
    <button class="linkbtn" data-go="#/e/${e.id}" style="margin-top:8px">Zur Etappe</button></section>`;
}

/* ----- Schritt 1: Hören ----- */
const HOER = {runde:1, i:-1, laeuft:false};
function hoerenView(e){
  const r = HOER.runde, h = P().hoer[e.id] || {};
  const tipps = {1:"Hör einfach zu. Worum geht's? Du musst nicht alles verstehen.", 2:"Jetzt mit dem französischen Text. Lies leise mit.", 3:"Jetzt mit Übersetzung. Tipp auf einen Satz, um ihn nochmal zu hören."};
  const sp = e.sprecher, wer = s => C.stimmen[sp[s]];
  const wellen = n => `<span class="wellen">${Array.from({length:n}, (_, k) => `<i style="--h:${6 + ((k * 7) % 13)}px;--k:${k}"></i>`).join("")}</span>`;
  return `<div class="page">${schrittKopf(e, 1, "Hören", "Ein Dialog, drei Durchgänge.")}
    <div class="runden" role="tablist">${[1, 2, 3].map(n => `<button role="tab" data-runde="${n}" class="${r === n ? "an" : ""}">${["Ohne Text", "Mit Text", "Übersetzung"][n - 1]}${h[n] ? `<span class="ok">✓</span>` : ""}</button>`).join("")}<span class="linie"></span></div>
    <p class="hinweis">${tipps[r]}</p>
    <ol class="dialog">${e.dialog.map((l, i) => `<li class="zeile ${l.s} ${HOER.i === i ? "spielt" : ""}" data-zeile="${i}">
      <span class="wer">${esc(wer(l.s).name[0] === "L" ? wer(l.s).name.split(" ")[1][0].toUpperCase() : wer(l.s).name[0])}</span>
      <div><div class="wer-n">${esc(wer(l.s).name)}</div>${r === 1 ? wellen(Math.min(28, 6 + Math.round(l.fr.length / 3))) : `<div class="frz">${esc(l.fr)}</div>${r === 3 ? `<div class="dt">${esc(l.de)}</div>` : ""}`}</div></li>`).join("")}</ol>
    <div id="hoer-ende"></div>
    <div class="leiste"><button class="rund" data-act="hoer-play" aria-label="${HOER.laeuft ? "Pause" : "Abspielen"}">${HOER.laeuft ? I.pause : I.play}</button>
      <button class="tempo ${ST.rate < 1 ? "an" : ""}" data-act="tempo">${ST.rate < 1 ? "Langsam" : "Normal"}</button>
      ${h[1] && h[2] && h[3] ? `<a class="btn" href="#/e/${e.id}/2">Weiter ${I.pfeil}</a>` : `<span style="flex:1;font-size:14px;color:var(--tinte-3)">${r < 3 ? `Durchgang ${r} von 3` : "Letzter Durchgang"}</span>`}</div></div>`;
}
function runden_linie(){
  const t = $(".runden"), b = $(".runden button.an"), l = $(".runden .linie");
  if (t && b && l) { l.style.width = b.offsetWidth + "px"; l.style.transform = `translateX(${b.offsetLeft}px)`; }
}
function zeileMarkieren(i){
  HOER.i = i;
  $$(".zeile").forEach(z => z.classList.toggle("spielt", +z.dataset.zeile === i));
  const z = $(`.zeile[data-zeile="${i}"]`);
  if (z) { const r = z.getBoundingClientRect(); if (r.top < 70 || r.bottom > innerHeight - 110) z.scrollIntoView({block:"center", behavior:"smooth"}); }
}
function playKnopf(){ const b = $('[data-act="hoer-play"]'); if (b) { b.innerHTML = HOER.laeuft ? I.pause : I.play; b.setAttribute("aria-label", HOER.laeuft ? "Pause" : "Abspielen"); } }
async function hoerenAbspielen(e, ab = 0){
  HOER.laeuft = true; playKnopf();
  const myRun = ++hoerenAbspielen.run;
  for (let i = ab; i < e.dialog.length; i++) {
    if (myRun !== hoerenAbspielen.run) return;
    zeileMarkieren(i);
    const l = e.dialog[i];
    const ok = await play(e.sprecher[l.s], l.fr);
    if (!ok || myRun !== hoerenAbspielen.run) return;
    await sleep(l.s !== (e.dialog[i + 1] || {}).s ? 420 : 250);
  }
  if (myRun !== hoerenAbspielen.run) return;
  HOER.laeuft = false; zeileMarkieren(-1); playKnopf();
  const p = P(); p.hoer[e.id] = p.hoer[e.id] || {};
  const war = !!p.hoer[e.id][HOER.runde];
  p.hoer[e.id][HOER.runde] = p.hoer[e.id][HOER.runde] || Date.now();
  save();
  const h = p.hoer[e.id];
  if (h[1] && h[2] && h[3] && markStep(e.id, 1)) { stempel("Très bien"); render(); $("#hoer-ende").innerHTML = fertigBlock(e, 1, `<p>Du hast den Dialog dreimal gehört. Jetzt schauen wir, was hängen geblieben ist.</p>`); $("#hoer-ende").scrollIntoView({behavior:"smooth"}); return; }
  if (HOER.runde < 3) { if (!war) toast(`Durchgang ${HOER.runde} geschafft`); HOER.runde++; HOER.i = -1; render(); scrollTo({top:0, behavior:"smooth"}); }
  else render();
}
hoerenAbspielen.run = 0;
function hoerenStop(){ hoerenAbspielen.run++; HOER.laeuft = false; stopAudio(); playKnopf(); }

/* ----- Schritt 2: Verstehen ----- */
const VER = {i:0, richtig:0, gewaehlt:null};
function verstehenView(e){
  const qs = e.fragen;
  let body;
  if (VER.i < qs.length) {
    const q = qs[VER.i], g = VER.gewaehlt;
    body = `<div class="zaehler">Frage ${VER.i + 1} von ${qs.length}</div><p class="frage ink">${esc(q.q)}</p>
      <div class="optionen">${q.o.map((o, k) => `<button class="opt ink ${g != null ? (k === q.a ? "richtig" : k === g ? "falsch" : "") : ""}" style="--i:${k + 1}" data-opt="${k}" ${g != null ? "disabled" : ""}>${esc(o)}</button>`).join("")}</div>
      <p style="margin:14px 0 0"><button class="linkbtn" data-act="dialog-nochmal">${I.laut.replace("<svg", '<svg style="width:16px;height:16px;vertical-align:-3px"')} Dialog nochmal hören</button></p>
      ${g != null ? `<div class="leiste"><button class="btn block" data-act="ver-weiter">${VER.i + 1 < qs.length ? "Nächste Frage" : "Weiter"} ${I.pfeil}</button></div>` : ""}`;
  } else {
    const x = e.erklaerung, a = e.aussprache, v = lv();
    const bsp = (list, tipp) => `<ul class="bsp">${list.map(b => `<li><button class="mini" data-say="${esc(v)}|${esc(b.fr)}" aria-label="Anhören">${I.play}</button><div><span class="frz">${esc(b.fr)}</span><small>${esc(tipp ? b.tipp : b.de)}</small></div></li>`).join("")}</ul>`;
    body = `<p class="hinweis">${VER.richtig} von ${qs.length} richtig. ${VER.richtig === qs.length ? "Stark, du hast alles verstanden." : VER.richtig >= qs.length - 1 ? "Gut verstanden." : "Kein Problem, hör den Dialog ruhig nochmal ohne Text."}</p>
      <section class="blatt ink" style="--i:1"><span class="label">So funktioniert's</span><h2>${esc(x.titel)}</h2><p>${esc(x.text)}</p>${bsp(x.beispiele)}</section>
      <section class="blatt ink" style="--i:2"><span class="label">Aussprache</span><h2>${esc(a.titel)}</h2><p>${esc(a.text)}</p>${bsp(a.beispiele, true)}</section>
      ${e.extra ? `<section class="blatt ink" style="--i:3"><span class="label">Extra</span><h2>${esc(e.extra.titel)}</h2><p>${esc(e.extra.text)}</p>
        <div class="zahlen">${e.extra.liste.map(z => `<button data-say="${esc(e.extra.v)}|${esc(z.fr)}"><b>${esc(z.de)}</b><span>${esc(z.fr)}</span></button>`).join("")}</div></section>` : ""}
      <div id="ver-ende">${stepDone(e.id, 2) ? fertigBlock(e, 2) : `<div class="leiste"><button class="btn block" data-act="ver-fertig">Verstanden ${I.haken}</button></div>`}</div>`;
  }
  return `<div class="page">${schrittKopf(e, 2, "Verstehen", "Ein paar Fragen zum Dialog, dann kurz das Wichtigste.")}${body}</div>`;
}

/* ----- Schritt 3: Nachsprechen ----- */
const NACH = {k:0, ergebnis:null, hoert:false, zwischen:""};
function nachView(e){
  const idx = e.nachsprechen, k = NACH.k;
  if (k >= idx.length) return `<div class="page">${schrittKopf(e, 3, "Nachsprechen", "")}${fertigBlock(e, 3, `<p>Alle Sätze nachgesprochen. Je öfter du das machst, desto lockerer kommt es raus.</p>`)}</div>`;
  const l = e.dialog[idx[k]], v = e.sprecher[l.s], r = NACH.ergebnis;
  const urteil = r ? (r.score >= .8 ? `<span class="urteil gut">Verstanden</span>` : r.score >= .5 ? `<span class="urteil fast">Fast</span>` : `<span class="urteil nein">Nochmal</span>`) : "";
  const tipp = r ? (r.score >= .8 ? "Das Handy hat dich verstanden. So würde dich auch ein Franzose verstehen." : r.score >= .5 ? "Hör nochmal genau hin bei den unterstrichenen Wörtern." : "Hör dir den Satz langsam an und sprich ihn Stück für Stück.") : "";
  return `<div class="page">${schrittKopf(e, 3, "Nachsprechen", "Erst hören, dann tippst du aufs Mikrofon und sprichst nach.")}
    <div class="zaehler">Satz ${k + 1} von ${idx.length}</div>
    <div class="satz ink"><div class="frz">${r ? r.html : esc(l.fr)}</div><div class="dt">${esc(l.de)}</div></div>
    <div class="gehoert" aria-live="polite">${NACH.hoert ? `<span class="hoert"><i></i><i></i><i></i></span> ${NACH.zwischen ? `<q>${esc(NACH.zwischen)}</q>` : "Ich höre zu …"}` : r ? `Gehört: <q>${esc(r.text || "…")}</q><br>${urteil}<br><span style="font-size:14.5px">${tipp}</span>` : SR ? "" : "Ohne Spracherkennung: Sprich laut nach und vergleich mit dem Original."}</div>
    <div class="leiste"><button class="mini gross" data-act="nach-hoeren" aria-label="Anhören">${I.laut}</button>
      <button class="tempo ${ST.rate < 1 ? "an" : ""}" data-act="tempo">${ST.rate < 1 ? "Langsam" : "Normal"}</button>
      ${SR ? `<button class="rund ${NACH.hoert ? "hoert-zu" : ""}" data-act="nach-mic" aria-label="${NACH.hoert ? "Stopp" : "Sprechen"}">${NACH.hoert ? I.stop : I.mic}</button>` : ""}
      <button class="btn ${r && r.score >= .8 ? "" : "ghost"}" data-act="nach-weiter">${k + 1 < idx.length ? "Weiter" : "Fertig"}</button></div></div>`;
}

/* ----- Schritt 4: Selbst reden ----- */
const ROLLE = {k:0, phase:"hoeren", ergebnis:null, hoert:false, zwischen:"", textZeigen:false};
function rolleView(e){
  const items = e.rollenspiel, k = ROLLE.k;
  if (k >= items.length) return `<div class="page">${schrittKopf(e, 4, "Selbst reden", "")}${fertigBlock(e, 4, `<p>Du hast das ganze Gespräch selbst geführt. Genau so läuft es dann in echt.</p>`)}</div>`;
  const it = items[k], wer = C.stimmen[e.sprecher[it.s]], muster = gform(it.muster), r = ROLLE.ergebnis;
  const zeigMuster = ROLLE.phase === "loesung";
  let bewertung = "";
  if (r) {
    if (it.frei) bewertung = r.text ? `<span class="urteil gut">Gut</span>` : "";
    else bewertung = r.score >= .6 ? `<span class="urteil gut">Passt</span>` : r.score >= .3 ? `<span class="urteil fast">Fast</span>` : `<span class="urteil nein">Anders</span>`;
  }
  return `<div class="page">${schrittKopf(e, 4, "Selbst reden", `Du bist dran. ${esc(wer.name)} redet mit dir, du antwortest.`)}
    <div class="zaehler">${k + 1} von ${items.length}</div>
    <div class="rolle ink"><div class="sie zeile A"><span class="wer">${esc(wer.name[0] === "L" ? wer.name.split(" ")[1][0].toUpperCase() : wer.name[0])}</span>
      <div><div class="wer-n">${esc(wer.name)}</div>${ROLLE.textZeigen || zeigMuster ? `<div class="frz">${esc(it.fr)}</div>` : `<button class="linkbtn" data-act="rolle-text">Text zeigen</button>`}</div></div>
      <div class="auftrag"><span class="label">Deine Antwort</span><p>${esc(it.hinweis)}</p></div>
      <div class="gehoert" aria-live="polite">${ROLLE.hoert ? `<span class="hoert"><i></i><i></i><i></i></span> ${ROLLE.zwischen ? `<q>${esc(ROLLE.zwischen)}</q>` : "Ich höre zu …"}` : r ? `Gehört: <q>${esc(r.text || "…")}</q><br>${bewertung}` : SR ? "Tipp aufs Mikrofon und antworte." : "Sag deine Antwort laut, dann tipp auf „Lösung“."}</div>
      ${zeigMuster ? `<div class="muster ink"><span class="label">So kann man's sagen</span><div class="frz">${esc(muster)}</div>${it.frei ? `<small style="color:var(--tinte-2)">Statt „…“ dein Name</small>` : ""}</div>` : ""}
    </div>
    <div class="leiste"><button class="mini gross" data-act="rolle-hoeren" aria-label="Nochmal hören">${I.laut}</button>
      ${SR ? `<button class="rund ${ROLLE.hoert ? "hoert-zu" : ""}" data-act="rolle-mic" aria-label="${ROLLE.hoert ? "Stopp" : "Antworten"}">${ROLLE.hoert ? I.stop : I.mic}</button>` : ""}
      ${zeigMuster ? `<button class="btn" data-act="rolle-weiter">${k + 1 < items.length ? "Weiter" : "Fertig"} ${I.pfeil}</button>` : `<button class="btn ghost" data-act="rolle-loesung">Lösung</button>`}</div></div>`;
}

/* ----- Schritt 5 und Wiederholung: Karten ----- */
const KARTEN = {liste:[], pos:0, zeigen:false, falsch:{}, quelle:null, gewusst:0, gesamt:0};
function kartenStart(liste, quelle){
  // Pimsleur im Kleinen: neue Karten mischen, damit nichts nur auswendig in Reihenfolge sitzt
  const l = liste.slice(); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
  Object.assign(KARTEN, {liste:l, pos:0, zeigen:false, falsch:{}, quelle, gewusst:0, gesamt:l.length});
}
function karteView(kopf, endeHtml){
  if (KARTEN.pos >= KARTEN.liste.length) return `<div class="page">${kopf}${endeHtml}</div>`;
  const x = KARTEN.liste[KARTEN.pos], k = x.k, fr = gform(k.fr), de = gform(k.de), hoerKarte = k.dir === "fr";
  const rest = KARTEN.liste.length - KARTEN.pos;
  return `<div class="page">${kopf}<div class="zaehler">Noch ${rest} ${rest === 1 ? "Karte" : "Karten"} · ${esc(x.e.titel)}</div>
    <div class="karte" data-karte>${hoerKarte
      ? `<div class="frage-k">Hör zu. Was heißt das?</div><div><button class="rund" style="margin:0 auto" data-act="karte-hoeren" aria-label="Anhören">${I.laut}</button></div>`
      : `<div class="frage-k">Wie sagst du das auf Französisch? Sag es laut.</div><div class="vorn">${esc(de)}</div>`}
      ${KARTEN.zeigen ? `<div class="loes"><div class="frz">${esc(fr)}</div>${hoerKarte ? `<div class="dt">${esc(de)}</div>` : ""}</div>` : ""}</div>
    <div class="leiste">${KARTEN.zeigen
      ? `<div class="paar" style="flex:1"><button class="btn ghost" data-act="karte-nein">Nochmal</button><button class="btn olive" data-act="karte-ja">Gewusst ${I.haken}</button></div>`
      : `<button class="btn block" data-act="karte-zeigen">Lösung zeigen</button>`}</div></div>`;
}
function karteAudio(x){ const k = x.k; return k.dir === "fr" ? play(k.v, k.fr) : play(lv(), gform(k.fr)); }
function wiederholenView(e){
  if (!KARTEN.quelle || KARTEN.quelle !== e.id) {
    karteEinfuehren(e.id); save();
    kartenStart(e.karten.map((k, i) => ({id:karteId(e.id, i), e, k})), e.id);
  }
  const kopf = schrittKopf(e, 5, "Wiederholen", "Deutsch lesen, Französisch laut sagen, dann aufdecken. Sei ehrlich mit dir.");
  return karteView(kopf, fertigBlock(e, 5, `<p>${KARTEN.gewusst} von ${KARTEN.gesamt} Sätzen saßen beim ersten Mal. Die Sätze kommen morgen wieder, dann in größer werdenden Abständen.</p>`));
}
function wdhView(){
  if (KARTEN.quelle !== "wdh") kartenStart(faellig().slice(0, 25), "wdh");
  const kopf = `${topbar("#/", "Übersicht")}<div class="skopf"><span class="label">Wiederholung · ${esc(datumText())}</span><h1>Wieder<em>holen</em></h1>
    <p>Sätze aus früheren Etappen, die heute dran sind. Was du weißt, kommt erst in ein paar Tagen wieder.</p></div>`;
  const ziel = weiterZiel();
  return karteView(kopf, `<section class="blatt fertig-blatt ink"><span class="hand">Bravo</span><h2>Für heute wiederholt</h2>
    <p>${KARTEN.gesamt ? `${KARTEN.gewusst} von ${KARTEN.gesamt} saßen auf Anhieb.` : "Gerade ist nichts fällig."}</p>
    <a class="btn block" href="${ziel ? ziel.href : "#/"}" style="margin-top:14px">${ziel ? `Weiter: ${esc(ziel.t)}` : "Zur Übersicht"} ${I.pfeil}</a></section>`);
}

function einstView(){
  const t = document.documentElement.dataset.theme || "auto";
  return `<div class="page">${topbar("#/", "Übersicht")}<div class="skopf"><span class="label">Einstellungen</span><h1>Réglages</h1></div>
    <section class="blatt"><span class="label">Profile</span><h2>${zweiPersonen() ? `${esc(ST.meta.p1.name)} und ${esc(ST.meta.p2.name)}` : esc(ST.meta.p1.name)}</h2>
      <p class="szene">${zweiPersonen() ? `Gerade lernt hier: <b>${esc(M().name)}</b>.` : "Auf diesem Konto lernt eine Person. Wer mitlernen will, legt am besten ein eigenes Konto an."}</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">${zweiPersonen() ? `<button class="btn klein" data-go="#/profil">Profil wechseln</button>` : ""}<button class="btn ghost klein" data-go="#/setup">${zweiPersonen() ? "Namen ändern" : "Name ändern oder Person dazu"}</button></div></section>
    ${installBlock()}
    <section class="blatt"><span class="label">Aussehen</span><h2>Hell oder Keller</h2>
      <div class="seg" style="margin-top:6px">${[["auto", "Wie das Handy"], ["light", "Hell"], ["dark", "Dunkel"]].map(([k, l]) => `<button data-theme-set="${k}" class="${t === k ? "an" : ""}">${l}</button>`).join("")}</div></section>
    <section class="blatt"><span class="label">Tempo</span><h2>Wie schnell sprechen die Stimmen?</h2>
      <div class="seg" style="margin-top:6px"><button data-rate="1" class="${ST.rate === 1 ? "an" : ""}">Normal</button><button data-rate="0.8" class="${ST.rate < 1 ? "an" : ""}">Langsam</button></div></section>
    <section class="blatt"><span class="label">Konto</span><h2>${user ? "Angemeldet" : "Nur auf diesem Gerät"}</h2>
      <p class="szene">${user ? `Mit ${esc(user.email)}. Der Lernstand wird mit diesem Konto abgeglichen, auf jedem Handy.` : "Ohne Anmeldung bleibt alles auf diesem Handy."}</p>
      ${user ? `<button class="btn ghost klein" data-act="logout" style="margin-top:8px">Abmelden</button>` : `<button class="btn klein" data-act="login-zeigen" style="margin-top:8px">Anmelden oder Konto anlegen</button>`}</section>
    <section class="blatt"><span class="label">Neu anfangen</span><h2>Fortschritt von ${esc(M().name)} löschen</h2>
      <p class="szene">Setzt Etappen und Karten für dieses Profil zurück.${zweiPersonen() ? " Das andere Profil bleibt." : ""}</p>
      <button class="btn ghost klein" data-act="reset" style="margin-top:8px">Zurücksetzen</button></section>
    <p class="foot">En route · Inhalte nach dem Leitfaden im Projektordner · Stimmen: ElevenLabs</p></div>`;
}

/* ---------- Rendern ---------- */
let letzteRoute = "";
function render(){
  if (!C) return;
  const r = route(), key = r.join("/");
  if (key !== letzteRoute) {
    laufEnde(); hoerenStop();
    if (r[0] === "e" && r[2]) {
      const n = +r[2];
      if (n === 1) Object.assign(HOER, {runde:1, i:-1, laeuft:false});
      if (n === 1) { const h = P().hoer[r[1]] || {}; HOER.runde = h[1] ? (h[2] ? 3 : 2) : 1; if (h[1] && h[2] && h[3]) HOER.runde = 1; }
      if (n === 2) Object.assign(VER, {i:0, richtig:0, gewaehlt:null});
      if (n === 3) Object.assign(NACH, {k:0, ergebnis:null, hoert:false, zwischen:""});
      if (n === 4) Object.assign(ROLLE, {k:0, phase:"hoeren", ergebnis:null, hoert:false, zwischen:"", textZeigen:false});
      if (n === 5) KARTEN.quelle = null;
      laufStart();
      // Beim Nachsprechen und im Rollenspiel startet der erste Satz von selbst
      const e0 = etappe(r[1]);
      if (e0 && (n === 3 || n === 4)) setTimeout(() => {
        if (route().join("/") !== key) return;
        if (n === 3 && NACH.k === 0 && !NACH.ergebnis) { const l = e0.dialog[e0.nachsprechen[0]]; play(e0.sprecher[l.s], l.fr); }
        if (n === 4 && ROLLE.k === 0 && !ROLLE.ergebnis) { const it = e0.rollenspiel[0]; play(e0.sprecher[it.s], it.fr); }
      }, 600);
    }
    if (r[0] === "wdh") { KARTEN.quelle = null; laufStart(); }
    letzteRoute = key;
  }
  const login = !!(sb && authChecked && !user && !ST.skipLogin && !ST.meta.p1.name);
  if (!zweiPersonen() && ST.meta.p1.name && ST.active !== "p1") { ST.active = "p1"; saveLocal(); }
  let html;
  if (login || r[0] === "login") html = loginView();
  else if (!ST.meta.p1.name || r[0] === "setup") html = setupView();
  else if (zweiPersonen() && (!ST.active || r[0] === "profil")) html = profilView();
  else if (r[0] === "einst") html = einstView();
  else if (r[0] === "wdh") html = wdhView();
  else if (r[0] === "e" && etappe(r[1])) {
    const e = etappe(r[1]), n = +r[2];
    html = n === 1 ? hoerenView(e) : n === 2 ? verstehenView(e) : n === 3 ? nachView(e) : n === 4 ? rolleView(e) : n === 5 ? wiederholenView(e) : etappeView(e.id);
  }
  else html = homeView();
  $("#app").innerHTML = html;
  runden_linie();
}
function zeichneNeu(){ const y = scrollY; render(); scrollTo(0, y); }

/* ---------- Eingaben ---------- */
document.addEventListener("click", async e => {
  const go = e.target.closest("[data-go]");
  if (go) { location.hash = go.dataset.go; return; }
  const say = e.target.closest("[data-say]");
  if (say) {
    const [v, ...t] = say.dataset.say.split("|");
    $$(".zahlen button.spielt").forEach(b => b.classList.remove("spielt"));
    say.classList.add("spielt"); await play(v, t.join("|")); say.classList.remove("spielt"); return;
  }
  const prof = e.target.closest("[data-profil]");
  if (prof) { ST.active = prof.dataset.profil; saveLocal(); location.hash = "#/"; render(); return; }
  const g = e.target.closest("[data-g]");
  if (g) { const [w, gg] = g.dataset.g.split(":"); ST.meta[w].g = gg; g.parentElement.querySelectorAll("button").forEach(b => b.classList.toggle("an", b === g)); return; }
  const th = e.target.closest("[data-theme-set]");
  if (th) { const v = th.dataset.themeSet; if (v === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = v; try { localStorage.setItem("enroute-theme", v); } catch (_) {} return zeichneNeu(); }
  const rt = e.target.closest("[data-rate]");
  if (rt) { ST.rate = +rt.dataset.rate; saveLocal(); return zeichneNeu(); }
  const rn = e.target.closest("[data-runde]");
  if (rn) { hoerenStop(); HOER.runde = +rn.dataset.runde; HOER.i = -1; return zeichneNeu(); }
  const zl = e.target.closest("[data-zeile]");
  if (zl) { const er = etappe(route()[1]); hoerenStop(); const i = +zl.dataset.zeile; zeileMarkieren(i); await play(er.sprecher[er.dialog[i].s], er.dialog[i].fr); zeileMarkieren(-1); return; }
  const opt = e.target.closest("[data-opt]");
  if (opt && VER.gewaehlt == null) {
    const er = etappe(route()[1]), q = er.fragen[VER.i], k = +opt.dataset.opt;
    VER.gewaehlt = k; if (k === q.a) VER.richtig++;
    stopAudio(); zeichneNeu(); return;
  }
  const lg = e.target.closest("[data-login]");
  if (lg) { LOGIN.modus = lg.dataset.login; LOGIN.msg = ""; LOGIN.ok = false; return zeichneNeu(); }
  const b = e.target.closest("[data-act]"); if (!b) return;
  const act = b.dataset.act, er = route()[0] === "e" ? etappe(route()[1]) : null;
  switch (act) {
    case "skip-login": ST.skipLogin = true; saveLocal(); location.hash = "#/"; return render();
    case "login-zeigen": location.hash = "#/login"; return;
    case "installieren": if (installEvt) { installEvt.prompt(); const c = await installEvt.userChoice.catch(() => null); if (c && c.outcome === "accepted") { installEvt = null; toast("Wird installiert"); } zeichneNeu(); } return;
    case "logout": {
      // Erst alles hochladen, dann das Gerät leeren: Der Lernstand liegt im Konto, das nächste Konto fängt sauber an
      if (dirty.size) await push();
      if (dirty.size && !confirm("Noch nicht alles ist gespeichert (kein Internet?). Trotzdem abmelden? Dann geht das Ungespeicherte verloren.")) return;
      if (sb) await sb.auth.signOut();
      user = null; dirty.clear();
      ST = {...ST, meta:{p1:{name:"", g:"m"}, p2:{name:"", g:"f"}, updated:0}, p:{p1:blankP(), p2:blankP()}, active:null, uid:null, skipLogin:false};
      saveLocal(); setSync("lokal"); location.hash = "#/"; return render();
    }
    case "reset": if (!confirm(`Fortschritt von ${M().name} wirklich löschen? Das lässt sich nicht rückgängig machen.`)) return; ST.p[ST.active] = blankP(); save(); toast("Zurückgesetzt"); location.hash = "#/"; return;
    case "tempo": ST.rate = ST.rate < 1 ? 1 : 0.8; saveLocal(); b.classList.toggle("an", ST.rate < 1); b.textContent = ST.rate < 1 ? "Langsam" : "Normal"; return;
    case "hoer-play":
      if (HOER.laeuft) return hoerenStop();
      return hoerenAbspielen(er, HOER.i >= 0 && HOER.i < er.dialog.length ? HOER.i : 0);
    case "dialog-nochmal": {
      if (b.dataset.laeuft) { hoerenStop(); delete b.dataset.laeuft; return; }
      b.dataset.laeuft = "1"; const run = ++hoerenAbspielen.run;
      for (const l of er.dialog) { if (run !== hoerenAbspielen.run) break; if (!await play(er.sprecher[l.s], l.fr)) break; await sleep(300); }
      delete b.dataset.laeuft; return;
    }
    case "ver-weiter": VER.i++; VER.gewaehlt = null; zeichneNeu(); return scrollTo({top:0});
    case "ver-fertig": if (markStep(er.id, 2)) stempel("Très bien"); $("#ver-ende").innerHTML = fertigBlock(er, 2); return;
    case "nach-hoeren": { const l = er.dialog[er.nachsprechen[NACH.k]]; return play(er.sprecher[l.s], l.fr); }
    case "nach-mic": {
      if (NACH.hoert) return hoerAuf();
      const l = er.dialog[er.nachsprechen[NACH.k]];
      NACH.hoert = true; NACH.zwischen = ""; NACH.ergebnis = null; zeichneNeu();
      try {
        const alts = await hoerZu(t => { NACH.zwischen = t; const q = $(".gehoert"); if (q) q.innerHTML = `<span class="hoert"><i></i><i></i><i></i></span> <q>${esc(t)}</q>`; });
        NACH.ergebnis = vergleich(l.fr, alts.length ? alts : [""]);
        const key = `${er.id}:n${NACH.k}`; P().best[key] = Math.max(P().best[key] || 0, Math.round(NACH.ergebnis.score * 100)); save();
      } catch (err) { toast(srFehler(err)); }
      NACH.hoert = false; return zeichneNeu();
    }
    case "nach-weiter":
      NACH.k++; NACH.ergebnis = null;
      if (NACH.k >= er.nachsprechen.length) { if (markStep(er.id, 3)) stempel("Très bien"); render(); return; }
      zeichneNeu(); { const l = er.dialog[er.nachsprechen[NACH.k]]; await sleep(250); play(er.sprecher[l.s], l.fr); } return;
    case "rolle-text": ROLLE.textZeigen = true; return zeichneNeu();
    case "rolle-hoeren": { const it = er.rollenspiel[ROLLE.k]; return play(er.sprecher[it.s], it.fr); }
    case "rolle-mic": {
      if (ROLLE.hoert) return hoerAuf();
      const it = er.rollenspiel[ROLLE.k];
      ROLLE.hoert = true; ROLLE.zwischen = ""; ROLLE.ergebnis = null; zeichneNeu();
      try {
        const alts = await hoerZu(t => { ROLLE.zwischen = t; const q = $(".gehoert"); if (q) q.innerHTML = `<span class="hoert"><i></i><i></i><i></i></span> <q>${esc(t)}</q>`; });
        ROLLE.ergebnis = vergleich(gform(it.muster).replace(/…/g, ""), alts.length ? alts : [""]);
        ROLLE.phase = "loesung";
      } catch (err) { toast(srFehler(err)); }
      ROLLE.hoert = false; zeichneNeu();
      if (ROLLE.phase === "loesung") { await sleep(350); play(lv(), gform(it.muster)); }
      return;
    }
    case "rolle-loesung": { const it = er.rollenspiel[ROLLE.k]; ROLLE.phase = "loesung"; zeichneNeu(); return play(lv(), gform(it.muster)); }
    case "rolle-weiter":
      ROLLE.k++; Object.assign(ROLLE, {phase:"hoeren", ergebnis:null, textZeigen:false});
      if (ROLLE.k >= er.rollenspiel.length) { if (markStep(er.id, 4)) stempel("Bravo"); render(); return; }
      zeichneNeu(); { const it = er.rollenspiel[ROLLE.k]; await sleep(300); play(er.sprecher[it.s], it.fr); } return;
    case "karte-hoeren": return karteAudio(KARTEN.liste[KARTEN.pos]);
    case "karte-zeigen": { KARTEN.zeigen = true; zeichneNeu(); return karteAudio(KARTEN.liste[KARTEN.pos]); }
    case "karte-ja": case "karte-nein": {
      const x = KARTEN.liste[KARTEN.pos], ja = act === "karte-ja", schonFalsch = !!KARTEN.falsch[x.id];
      if (ja && !schonFalsch) KARTEN.gewusst++;
      karteBewerten(x.id, ja, schonFalsch);
      if (!ja) { KARTEN.falsch[x.id] = 1; KARTEN.liste.splice(Math.min(KARTEN.pos + 4, KARTEN.liste.length), 0, x); }  // kommt gleich nochmal
      KARTEN.pos++; KARTEN.zeigen = false;
      if (KARTEN.pos >= KARTEN.liste.length) {
        if (KARTEN.quelle !== "wdh" && er) { if (markStep(er.id, 5)) stempel("Bravo"); }
        else stempel("Bravo");
        render(); return;
      }
      zeichneNeu();
      if (KARTEN.liste[KARTEN.pos].k.dir === "fr") { await sleep(250); karteAudio(KARTEN.liste[KARTEN.pos]); }
      return;
    }
  }
});
document.addEventListener("submit", async e => {
  e.preventDefault();
  if (e.target.id === "login") {
    const email = $("#l-mail").value.trim(), pw = $("#l-pw").value, neu = LOGIN.modus === "neu", btn = $("#l-btn");
    LOGIN.ok = false; LOGIN.msg = "";
    if (neu && pw.length < 8) { $("#l-msg").textContent = "Bitte mindestens 8 Zeichen für das Passwort."; return; }
    btn.disabled = true;
    try {
      const {data, error} = neu
        ? await sb.auth.signUp({email, password:pw, options:{emailRedirectTo:location.origin + location.pathname}})
        : await sb.auth.signInWithPassword({email, password:pw});
      if (error) throw error;
      if (neu && !(data && data.session)) {
        LOGIN.modus = "login"; LOGIN.ok = true;
        LOGIN.msg = "Fast geschafft: Wir haben dir eine E-Mail geschickt. Tipp dort auf den Link, dann meld dich hier mit E-Mail und Passwort an.";
        return zeichneNeu();
      }
      location.hash = "#/";
    } catch (err) {
      const t = String(err && err.message || "");
      $("#l-msg").textContent = /registered|already/i.test(t) ? "Mit dieser E-Mail gibt es schon ein Konto. Meld dich einfach an."
        : /confirm/i.test(t) ? "Die E-Mail ist noch nicht bestätigt. Schau in dein Postfach, auch im Spam."
        : /rate|limit|seconds/i.test(t) ? "Zu viele Versuche. Warte kurz und versuch es nochmal."
        : neu ? "Das Konto konnte nicht angelegt werden. Stimmt die E-Mail?" : "Anmelden hat nicht geklappt. Stimmen E-Mail und Passwort?";
    } finally { const b2 = $("#l-btn"); if (b2) b2.disabled = false; }
  }
  if (e.target.id === "setup") {
    for (const w of ["p1", "p2"]) ST.meta[w].name = $(`#n-${w}`).value.trim();
    if (!ST.meta.p1.name) return toast("Bitte trag deinen Namen ein.");
    if (!zweiPersonen()) ST.active = "p1";
    save("meta"); location.hash = zweiPersonen() && !ST.active ? "#/profil" : "#/"; render();
  }
});
window.addEventListener("hashchange", () => { render(); scrollTo(0, 0); });
window.addEventListener("resize", runden_linie);

// Ouvertüre: kleine Motion Graphic beim Öffnen, einmal pro Sitzung. Tippen oder eine Taste überspringt sie.
function ouverture(o){
  try { if (sessionStorage.getItem(o.key)) return false; sessionStorage.setItem(o.key, "1"); } catch (e) { return false; }
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  let k = 0;
  const pl = 'pathLength="1"';
  const epi = side => `<svg class="ov-epi ${side}" viewBox="0 0 24 80" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" aria-hidden="true">
    <path ${pl} style="--k:${k = 0}" d="M12 79C12 60 12 30 12 9"/><ellipse ${pl} style="--k:${++k}" cx="12" cy="6.5" rx="2.4" ry="5"/>
    ${[15, 23, 31, 39, 47, 55].map(y => `<ellipse ${pl} style="--k:${++k}" cx="8.4" cy="${y}" rx="2.4" ry="5" transform="rotate(-30 8.4 ${y})"/><ellipse ${pl} style="--k:${k}" cx="15.6" cy="${y}" rx="2.4" ry="5" transform="rotate(30 15.6 ${y})"/>`).join("")}
    <path ${pl} style="--k:2" d="M9.8 3 7.4-4M14.2 3l2.4-7"/></svg>`;
  const seal = `<svg class="ov-seal" viewBox="0 0 100 100" aria-hidden="true"><defs><path id="ovsc" d="M50 50m-37 0a37 37 0 1 1 74 0a37 37 0 1 1-74 0"/></defs>
    <circle class="s-bg" cx="50" cy="50" r="49"/><circle class="s-ln" cx="50" cy="50" r="45.5"/><circle class="s-ln" cx="50" cy="50" r="29"/>
    <g class="ov-rot"><text font-family="Newsreader,Georgia,serif" font-size="8.4" font-weight="600" letter-spacing="1.4"><textPath href="#ovsc" textLength="228" lengthAdjust="spacing">${o.ring}</textPath></text></g>
    <text x="50" y="62" text-anchor="middle" font-family="Bodoni Moda,Didot,serif" font-size="34" font-style="italic" font-weight="500">${o.mono}</text></svg>`;
  const el = document.createElement("div");
  el.id = "ov"; el.setAttribute("aria-hidden", "true");
  el.innerHTML = `<div class="ov-in"><div class="ov-crest">${epi("l")}${epi("r")}<span class="ov-ring"></span>${seal}</div>
    <div class="ov-kick">${o.kick}</div><div class="ov-title">${[...o.title].map((c, i) => `<span style="--i:${i}">${c === " " ? "&nbsp;" : c}</span>`).join("")}</div>
    <div class="ov-rule"></div><div class="ov-date">${o.date}</div>${o.hand ? `<div class="ov-hand">${o.hand}</div>` : ""}</div><div class="ov-skip">Tippen zum Überspringen</div>`;
  document.body.appendChild(el);
  let done = false;
  const out = () => { if (done) return; done = true; removeEventListener("keydown", out); el.classList.add("out"); if (o.onOut) setTimeout(o.onOut, 120); setTimeout(() => el.remove(), 780); };
  el.addEventListener("pointerdown", out);
  addEventListener("keydown", out);
  setTimeout(out, o.ms || (o.hand ? 3000 : 2350));
  return true;
}

(async () => {
  // Ouvertüre einmal pro Sitzung, danach setzt sich der große Titel auf der Startseite
  ouverture({hand:"bon voyage", key:"enroute-ov", mono:"F", ring:"EN ROUTE · FRANÇAIS · POUR DEUX ·", kick:"Français pour deux", title:"En route", date:esc(datumText()),
    onOut:() => { try { sessionStorage.removeItem("enroute-mast"); } catch (e) {} if (C && !route().length) render(); }});
  try { await loadContent(); } catch (e) { $("#app").innerHTML = `<p class="foot">Die Inhalte konnten nicht geladen werden. Bist du online?</p>`; return; }
  render();
  initAuth();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js", {scope:"./"}).catch(() => {});
})();
