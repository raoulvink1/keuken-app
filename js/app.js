/* Keukenbord — keukentablet voor weekmenu, voorraad en boodschappen.
   Alles draait in de browser. Gegevens staan nu lokaal op de tablet (localStorage);
   in stap 2 komt er een gedeelde opslag bij zodat Claude het weekmenu kan klaarzetten. */
(function () {
  "use strict";

  // ---------- Iconen ----------
  const ICONS = {
    bord: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="4"/><path d="M2 4v6M3.5 4v6M2 10h3M3.5 10v10M22 4c-1.6 0-2.5 2-2.5 5s1 3 2.5 3v8"/></svg>',
    kalender: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M7.5 14h2M11 14h2M14.5 14h2M7.5 17.5h2M11 17.5h2"/></svg>',
    kar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 4h2.6l2.3 11h10.8l2.2-8H6.2"/><circle cx="9" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/></svg>',
    blik: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><ellipse cx="12" cy="5.5" rx="6.5" ry="2.3"/><path d="M5.5 5.5v13c0 1.3 2.9 2.3 6.5 2.3s6.5-1 6.5-2.3v-13"/><path d="M5.5 10c0 1.3 2.9 2.3 6.5 2.3s6.5-1 6.5-2.3"/></svg>',
    spons: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6v3H9zM10 6v2.5M14 6v2.5"/><path d="M7.5 8.5h9l1 3v8.5a1.5 1.5 0 0 1-1.5 1.5H8a1.5 1.5 0 0 1-1.5-1.5v-8.5z"/><path d="M6.5 14h11"/></svg>',
    tas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6"/><rect x="4.5" y="6" width="15" height="15" rx="3"/><path d="M8 13h8v4H8z"/></svg>',
    klok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>',
    tandwiel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M2.5 12h3M18.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/><circle cx="12" cy="12" r="6.5"/></svg>',
    volscherm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>'
  };
  document.querySelectorAll("[data-icon]").forEach((el) => { el.innerHTML = ICONS[el.dataset.icon] || ""; });

  // ---------- Hulpjes ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s || "").trim().toLowerCase();
  const uid = () => Math.random().toString(36).slice(2, 9);
  const DAGEN = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
  const BASIS = new Set(["zout", "peper", "olie", "olijfolie", "zonnebloemolie", "water"]);
  const EENHEDEN = ["stuks", "g", "kg", "ml", "l", "blik", "pak", "zak", "pot", "fles", "bos"];

  function isoVan(d) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }
  const vandaagISO = () => isoVan(new Date());
  function parseISO(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
  function dagenTussen(a, b) { return Math.round((parseISO(b) - parseISO(a)) / 86400000); }
  function dagNaam(iso) { return DAGEN[parseISO(iso).getDay()]; }
  function korteDatum(iso) { return parseISO(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }); }
  const euro = (n) => "€ " + Number(n || 0).toFixed(2).replace(".", ",");

  function fmtHoeveel(h, e) {
    let n = Number(h) || 0;
    if (e === "g" && n >= 1000) { n = n / 1000; e = "kg"; }
    if (e === "ml" && n >= 1000) { n = n / 1000; e = "l"; }
    const txt = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "").replace(".", ",");
    return `${txt} ${e}`;
  }
  function stapVoor(e) { return e === "g" ? 50 : e === "ml" ? 100 : e === "l" || e === "kg" ? 0.5 : 1; }

  // ---------- Opslag ----------
  const SLEUTEL = "keukenbord.v1";
  let state = null;
  const ui = { view: "vandaag", dag: null, stappen: {}, zoek: "" };

  function laadLokaal() {
    try { const raw = localStorage.getItem(SLEUTEL); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
  let saveTimer = null;
  function bewaar() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(SLEUTEL, JSON.stringify(state)); } catch { /* opslag vol of geblokkeerd */ }
      sync.duw();
    }, 250);
  }
  async function laadVoorbeeld() {
    const res = await fetch("data/voorbeeld.json", { cache: "no-cache" });
    return res.json();
  }
  function compleet(s) {
    s.menu ||= { status: "leeg", dagen: [] };
    s.recepten ||= [];
    s.voorraad ||= { items: [] };
    s.vaste ||= { items: [] };
    s.school ||= { kinderen: [] };
    s.lijst ||= { items: [], status: "open" };
    s.volgende ||= null;
    s._ts ||= {};
    return s;
  }

  // Op maandag wordt het menu van "volgende week" het menu van deze week.
  function schuifWeek() {
    const v = state.volgende;
    if (v && v.dagen?.length && v.dagen[0].datum <= vandaagISO()) {
      state.menu = v; state.volgende = null;
      const nu = new Date().toISOString();
      state._ts.menu = nu; state._ts.volgende = nu;
      return true;
    }
    return false;
  }

  // ---------- Weekmenu uit de repo ----------
  // Claude zet elke donderdag het menu voor volgende week in data/volgende.json.
  // De tablet haalt dat bestand op; goedkeuren, voorraad en lijst blijven op de tablet.
  const sync = {
    status: "uit", fout: "", laatst: null,
    async haal() {
      try {
        const res = await fetch("data/volgende.json", { cache: "no-store" });
        if (res.status === 404) { this.status = "aan"; this.laatst = new Date(); return false; }
        if (!res.ok) throw new Error(`server gaf ${res.status}`);
        const data = await res.json();
        this.status = "aan"; this.fout = ""; this.laatst = new Date();
        let veranderd = false, nieuw = false;
        const al = [state.menu?.week, state.volgende?.week];
        const laatsteDag = data?.dagen?.[data.dagen.length - 1]?.datum;
        if (data?.week && data.dagen?.length && laatsteDag >= vandaagISO()) {
          if (!al.includes(data.week)) { state.volgende = data; nieuw = veranderd = true; }
          else if (state.volgende?.week === data.week && state.volgende.status !== "akkoord" && data.gemaaktOp && data.gemaaktOp !== state.volgende.gemaaktOp) {
            state.volgende = data; veranderd = true; // bijgewerkt voorstel (zaterdagcontrole)
          }
        }
        for (const r of data?.recepten || []) {
          if (!state.recepten.some((x) => norm(x.gerecht) === norm(r.gerecht))) { state.recepten.push(r); veranderd = true; }
        }
        if (veranderd) {
          compleet(state);
          schuifWeek();
          try { localStorage.setItem(SLEUTEL, JSON.stringify(state)); } catch {}
          render();
          if (nieuw) toast("Het weekmenu voor volgende week staat klaar. Bekijk het onder Weekmenu.");
        }
        return veranderd;
      } catch (e) { this.status = "fout"; this.fout = e.message; return false; }
    },
    duw() { /* tablet schrijft niet terug naar de repo */ }
  };

  // ---------- Toast en sheet ----------
  let toastTimer = null, toastActie = null;
  function toast(tekst, actie) {
    $("#toast-tekst").textContent = tekst;
    const btn = $("#toast-actie");
    toastActie = actie || null;
    btn.hidden = !actie;
    $("#toast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $("#toast").hidden = true; toastActie = null; }, actie ? 9000 : 4000);
  }
  $("#toast-actie").addEventListener("click", () => { if (toastActie) toastActie(); $("#toast").hidden = true; toastActie = null; });

  function sheet(titel, html, opBinden) {
    $("#sheet-titel").textContent = titel;
    $("#sheet-body").innerHTML = html;
    $("#sheet").hidden = false;
    if (opBinden) opBinden($("#sheet-body"));
    const eerste = $("#sheet-body input");
    if (eerste) setTimeout(() => eerste.focus(), 50);
  }
  function sluitSheet() { $("#sheet").hidden = true; $("#sheet-body").innerHTML = ""; }
  $("#sheet").addEventListener("click", (e) => { if (e.target.id === "sheet" || e.target.dataset.act === "sluit") sluitSheet(); });

  // ---------- Menu-logica ----------
  function dagVan(iso) { return state.menu.dagen.find((d) => d.datum === iso) || state.volgende?.dagen?.find((d) => d.datum === iso) || null; }
  function menuVan(iso) { return state.volgende?.dagen?.some((d) => d.datum === iso) ? state.volgende : state.menu; }
  // Voor de boodschappen telt het menu van volgende week zodra dat er is.
  function bestelMenu() { return state.volgende?.dagen?.length ? state.volgende : state.menu; }
  function vindVoorraad(naam, eenheid) {
    const n = norm(naam);
    const kandidaten = state.voorraad.items.filter((v) => norm(v.naam) === n || norm(v.naam).includes(n) || n.includes(norm(v.naam)));
    return kandidaten.find((v) => v.eenheid === eenheid) || kandidaten[0] || null;
  }
  function inHuisVoor(ing) {
    const v = vindVoorraad(ing.naam, ing.eenheid);
    if (!v || v.eenheid !== ing.eenheid) return { status: "nee", v };
    return { status: v.hoeveelheid >= ing.hoeveelheid ? "ja" : v.hoeveelheid > 0 ? "deels" : "nee", v };
  }

  function kook(datum) {
    const dag = dagVan(datum);
    if (!dag || dag.gekookt) return;
    const backup = JSON.stringify({ voorraad: state.voorraad, dag });
    const nietAfgeboekt = [];
    for (const ing of dag.ingredienten || []) {
      if (BASIS.has(norm(ing.naam))) continue;
      const v = vindVoorraad(ing.naam, ing.eenheid);
      if (!v) { nietAfgeboekt.push(ing.naam); continue; }
      if (v.eenheid !== ing.eenheid) { nietAfgeboekt.push(ing.naam); continue; }
      v.hoeveelheid = Math.max(0, +(v.hoeveelheid - ing.hoeveelheid).toFixed(3));
    }
    dag.gekookt = true;
    dag.gekooktOp = new Date().toISOString();
    bewaar(); render();
    const extra = nietAfgeboekt.length ? ` ${nietAfgeboekt.length} ingrediënt(en) stonden niet in de voorraad.` : "";
    toast(`Eet smakelijk! Voorraad bijgewerkt.${extra}`, () => {
      const b = JSON.parse(backup);
      state.voorraad = b.voorraad;
      const m = menuVan(datum);
      const i = m.dagen.findIndex((d) => d.datum === datum);
      if (i >= 0) m.dagen[i] = b.dag;
      bewaar(); render();
      toast("Teruggezet: voorraad is weer zoals hij was.");
    });
  }

  // ---------- Boodschappenlijst berekenen ----------
  function berekenLijst() {
    const nodig = new Map();
    const voeg = (naam, h, e, bron) => {
      const k = norm(naam) + "|" + e;
      const x = nodig.get(k) || { naam, hoeveelheid: 0, eenheid: e, bronnen: new Set() };
      x.hoeveelheid += Number(h) || 0; x.bronnen.add(bron); nodig.set(k, x);
    };
    for (const d of bestelMenu().dagen) {
      if (d.geschrapt || d.gekookt) continue;
      for (const ing of d.ingredienten || []) if (!BASIS.has(norm(ing.naam))) voeg(ing.naam, ing.hoeveelheid, ing.eenheid, dagNaam(d.datum));
    }
    const school = new Map();
    for (const kind of state.school.kinderen) for (const it of kind.items) {
      const k = norm(it.naam) + "|" + it.eenheid;
      const x = school.get(k) || { naam: it.naam, hoeveelheid: 0, eenheid: it.eenheid, bronnen: new Set() };
      x.hoeveelheid += it.perDag * kind.dagen; x.bronnen.add(kind.naam); school.set(k, x);
    }
    const splits = (map) => {
      const koop = [], huis = [];
      for (const x of map.values()) {
        const v = vindVoorraad(x.naam, x.eenheid);
        const heb = v && v.eenheid === x.eenheid ? v.hoeveelheid : 0;
        const tekort = +(x.hoeveelheid - heb).toFixed(3);
        const item = { naam: x.naam, eenheid: x.eenheid, nodig: x.hoeveelheid, heb, bronnen: [...x.bronnen] };
        if (tekort > 0) koop.push({ ...item, hoeveelheid: tekort }); else huis.push(item);
      }
      koop.sort((a, b) => a.naam.localeCompare(b.naam)); huis.sort((a, b) => a.naam.localeCompare(b.naam));
      return { koop, huis };
    };
    const vandaag = vandaagISO();
    const vaste = state.vaste.items.filter((v) => v.opLijst || dagenTussen(v.laatst, vandaag) >= v.intervalDagen - 3)
      .map((v) => ({ naam: v.naam, hoeveelheid: v.aantal || 1, eenheid: "stuks", reden: v.opLijst ? "Zelf op de lijst gezet" : resterend(v) }));
    return { menu: splits(nodig), school: splits(school), vaste, eigen: state.lijst.items };
  }
  function resterend(v) {
    const over = v.intervalDagen - dagenTussen(v.laatst, vandaagISO());
    return over <= 0 ? "Waarschijnlijk op" : over === 1 ? "Nog ongeveer 1 dag" : `Nog ongeveer ${over} dagen`;
  }
  function aantalTeKopen() {
    const l = berekenLijst();
    return l.menu.koop.length + l.school.koop.length + l.vaste.length + l.eigen.length;
  }

  // ---------- Schermen ----------
  const views = {};

  views.vandaag = function () {
    const iso = ui.dag || vandaagISO();
    const dag = dagVan(iso);
    const isVandaag = iso === vandaagISO();
    const titel = isVandaag ? "Wat eten we vandaag?" : `${cap(dagNaam(iso))} ${korteDatum(iso)}`;
    const nav = `<div class="btn-rij">
        <button class="btn klein" data-act="dag" data-delta="-1" aria-label="Vorige dag">‹ Vorige</button>
        ${isVandaag ? "" : '<button class="btn klein" data-act="dag" data-delta="0">Vandaag</button>'}
        <button class="btn klein" data-act="dag" data-delta="1" aria-label="Volgende dag">Volgende ›</button>
      </div>`;
    const voorstel = state.volgende?.dagen?.length && state.volgende.status !== "akkoord"
      ? `<div class="status-band"><div><b>Het menu voor volgende week staat klaar.</b><div class="sub">Bekijk het en geef akkoord${state.volgende.akkoordVoor ? ` vóór ${esc(state.volgende.akkoordVoor)}` : ""}, dan kan de bestelling op tijd de deur uit.</div></div><button class="btn primair" data-act="naar-volgende">Bekijken</button></div>` : "";
    const kop = `${voorstel}<div class="kop"><div><div class="eyebrow">${esc(cap(dagNaam(iso)))} ${esc(korteDatum(iso))}</div><h1>${esc(titel)}</h1></div>${nav}</div>`;
    if (!dag) {
      return kop + `<div class="paneel leeg"><h2>Nog geen gerecht voor deze dag</h2>
        <p>Zodra het weekmenu klaarstaat zie je hier het recept van de dag.</p>
        <button class="btn primair" data-goto="week">Naar het weekmenu</button></div>`;
    }
    if (dag.geschrapt) {
      return kop + `<div class="paneel leeg"><h2>Vandaag geen kookavond</h2><p>Deze dag is uit het menu geschrapt. Restjes of uit eten?</p>
        <button class="btn" data-act="herstel" data-datum="${dag.datum}">Gerecht terugzetten</button></div>`;
    }
    const stapStatus = ui.stappen[dag.datum] || [];
    const eersteOpen = (dag.stappen || []).findIndex((_, i) => !stapStatus[i]);
    const ingr = (dag.ingredienten || []).map((ing) => {
      const st = inHuisVoor(ing);
      const chip = st.status === "ja" ? '<span class="chip ok">In huis</span>' : st.status === "deels" ? '<span class="chip warn">Te weinig</span>' : '<span class="chip">Niet in voorraad</span>';
      return `<li><span class="hoeveel">${esc(fmtHoeveel(ing.hoeveelheid, ing.eenheid))}</span><span>${esc(ing.naam)}</span>${dag.gekookt ? "" : chip}</li>`;
    }).join("");
    const stappen = (dag.stappen || []).map((s, i) => `<li class="${stapStatus[i] ? "klaar" : ""} ${i === eersteOpen ? "actief" : ""}" data-act="stap" data-datum="${dag.datum}" data-i="${i}">${esc(s)}</li>`).join("");
    const kookKnop = dag.gekookt
      ? `<div><span class="chip ok" style="font-size:16px;padding:8px 14px">Gekookt · voorraad bijgewerkt</span></div>`
      : `<button class="btn accent kook-knop" data-act="kook" data-datum="${dag.datum}">Ik ga dit koken</button>`;
    return kop + `<div class="vandaag">
      <section class="gerecht-hero">
        <div>
          <div class="eyebrow">${dag.gekookt ? "Gekookt" : isVandaag ? "Vanavond" : "Op het menu"}${state.menu.voorbeeld ? ' · <span class="chip voorbeeld">Voorbeeld</span>' : ""}</div>
          <h2>${esc(dag.gerecht)}</h2>
          <div class="hero-feiten"><span><b>${esc(dag.tijd)}</b> minuten</span><span>ca. <b>${euro(dag.kosten)}</b> voor het gezin</span><span><b>4</b> porties</span>${(dag.bonus || []).map((b) => `<span class="chip bonus">Bonus: ${esc(b)}</span>`).join("")}</div>
          ${dag.kindertip ? `<div class="kindertip"><b>Kindertip:</b> ${esc(dag.kindertip)}</div>` : ""}
        </div>
        ${kookKnop}
      </section>
      <section class="paneel"><h3>Ingrediënten</h3><ul class="ingr-lijst">${ingr}</ul>
        <p class="sub">Bij "Ik ga dit koken" gaan deze ingrediënten automatisch van de voorraad af.</p></section>
      <section class="paneel"><h3>Bereiding</h3><ol class="stappen">${stappen}</ol>
        <p class="sub">Tik op een stap als die klaar is.</p></section>
    </div>`;
  };

  views.week = function () {
    if (!ui.week) ui.week = state.volgende?.dagen?.length ? "volgende" : "deze";
    const heeftVolgende = !!state.volgende?.dagen?.length;
    if (!heeftVolgende) ui.week = "deze";
    const m = ui.week === "volgende" ? state.volgende : state.menu;
    const tabs = heeftVolgende ? `<div class="btn-rij" role="tablist">
        <button class="btn klein ${ui.week === "deze" ? "primair" : ""}" data-act="weektab" data-week="deze" role="tab" aria-selected="${ui.week === "deze"}">Deze week</button>
        <button class="btn klein ${ui.week === "volgende" ? "primair" : ""}" data-act="weektab" data-week="volgende" role="tab" aria-selected="${ui.week === "volgende"}">Volgende week${state.volgende.status !== "akkoord" ? " · nieuw" : ""}</button></div>` : "";
    if (!m.dagen.length) {
      return `<div class="kop"><div><div class="eyebrow">Weekmenu</div><h1>Nog geen weekmenu</h1></div></div>
        <div class="paneel leeg"><h2>Het weekmenu van deze week komt hier</h2><p>Elke week verschijnt hier een voorstel op basis van de AH Bonus en wat er nog in huis is.</p>
        <button class="btn" data-act="voorbeeld">Voorbeeldweek laden</button></div>`;
    }
    const totaal = m.dagen.filter((d) => !d.geschrapt).reduce((s, d) => s + (Number(d.kosten) || 0), 0);
    const band = m.status === "akkoord"
      ? `<div class="status-band akkoord"><div><b>Je hebt dit menu goedgekeurd.</b><div class="sub">De ingrediënten staan op de boodschappenlijst.</div></div>
          <div class="btn-rij"><button class="btn primair" data-goto="boodschappen">Naar boodschappen</button><button class="btn klein" data-act="heropen">Weer aanpassen</button></div></div>`
      : `<div class="status-band"><div><b>Voorstel voor ${ui.week === "volgende" ? "volgende" : "deze"} week.</b><div class="sub">Wissel of schrap gerechten en geef daarna akkoord${m.akkoordVoor ? `, het liefst vóór ${esc(m.akkoordVoor)}` : ""}.</div></div>
          <button class="btn primair" data-act="akkoord">Akkoord geven</button></div>`;
    const vandaag = vandaagISO();
    const kaarten = m.dagen.map((d) => `
      <article class="dag ${d.datum === vandaag ? "vandaag-dag" : ""} ${d.geschrapt ? "geschrapt" : ""}">
        <div class="dag-kop"><span class="dag-naam">${esc(cap(dagNaam(d.datum)))}</span><span class="dag-datum">${esc(korteDatum(d.datum))}</span></div>
        <div class="dag-gerecht">${esc(d.gerecht)}</div>
        <div class="dag-meta"><span class="chip">${esc(d.tijd)} min</span><span class="chip">${euro(d.kosten)}</span>${(d.bonus || []).length ? `<span class="chip bonus">${d.bonus.length}× Bonus</span>` : ""}${d.gekookt ? '<span class="chip ok">Gekookt</span>' : ""}</div>
        <div class="dag-acties">
          <button class="btn klein" data-act="open-dag" data-datum="${d.datum}">Recept</button>
          ${d.gekookt ? "" : `<button class="btn klein" data-act="wissel" data-datum="${d.datum}">Ander gerecht</button>`}
          ${d.gekookt ? "" : d.geschrapt ? `<button class="btn klein" data-act="herstel" data-datum="${d.datum}">Terugzetten</button>` : `<button class="btn klein" data-act="schrap" data-datum="${d.datum}">Schrappen</button>`}
        </div>
      </article>`).join("");
    return `<div class="kop"><div><div class="eyebrow">Weekmenu ${esc(m.week || "")}${m.voorbeeld ? ' · <span class="chip voorbeeld">Voorbeeld</span>' : ""}</div><h1>${ui.week === "volgende" ? "Wat eten we volgende week?" : "Wat eten we deze week?"}</h1>
      <p class="sub">Geschat ${euro(totaal)} voor ${m.dagen.filter((d) => !d.geschrapt).length} avonden${m.bonusBesparing ? `, waarvan ${euro(m.bonusBesparing)} Bonusvoordeel` : ""}.</p></div>${tabs}</div>
      ${band}<div class="week-grid">${kaarten}</div>`;
  };

  views.boodschappen = function () {
    const l = berekenLijst();
    const regel = (x, waarom) => `<div class="lijst-item"><span>${esc(x.naam)}</span><span class="aantal">${esc(fmtHoeveel(x.hoeveelheid, x.eenheid))}</span><span class="waarom">${esc(waarom)}</span></div>`;
    const menuKoop = l.menu.koop.map((x) => regel(x, (x.heb ? `Je hebt al ${fmtHoeveel(x.heb, x.eenheid)} · ` : "") + "Voor " + x.bronnen.join(", "))).join("");
    const schoolKoop = l.school.koop.map((x) => regel(x, (x.heb ? `Je hebt al ${fmtHoeveel(x.heb, x.eenheid)} · ` : "") + x.bronnen.join(", "))).join("");
    const vaste = l.vaste.map((x) => regel(x, x.reden)).join("");
    const eigen = l.eigen.map((x) => `<div class="lijst-item"><span>${esc(x.naam)}</span><span class="stepper"><button data-act="eigen-min" data-id="${x.id}" aria-label="Minder">−</button><span class="waarde">${esc(x.aantal)}</span><button data-act="eigen-plus" data-id="${x.id}" aria-label="Meer">+</button></span></div>`).join("");
    const huis = [...l.menu.huis, ...l.school.huis].map((x) => regel({ ...x, hoeveelheid: x.nodig }, `In huis: ${fmtHoeveel(x.heb, x.eenheid)}`)).join("");
    const totaal = aantalTeKopen();
    const sectie = (titel, inhoud, leegTekst) => `<section class="paneel"><h3>${titel}</h3>${inhoud || `<p class="sub">${leegTekst}</p>`}</section>`;
    const klaar = state.lijst.status === "klaar";
    return `<div class="kop"><div><div class="eyebrow">Boodschappen</div><h1>${totaal} ${totaal === 1 ? "artikel" : "artikelen"} op de lijst</h1>
      <p class="sub">Wat je al in huis hebt is er al afgehaald.${bestelMenu().dagen.length ? ` Voor het menu van ${bestelMenu() === state.volgende ? "volgende week" : "deze week"}.` : ""}${bestelMenu().status !== "akkoord" && bestelMenu().dagen.length ? " Dat menu is nog niet goedgekeurd." : ""}</p></div>
      <button class="btn" data-act="kopieer">Lijst kopiëren</button></div>
      <div class="twee-kol">
        ${sectie("Voor het weekmenu", menuKoop, "Alles voor het menu is in huis.")}
        ${sectie("Huishouden", vaste, "Geen huishoudproducten nodig deze week.")}
        ${sectie("School en opvang", schoolKoop, "Alles voor school is in huis.")}
        <section class="paneel"><h3>Eigen artikelen</h3>${eigen}
          <form class="btn-rij" style="margin-top:12px" data-form="eigen"><input class="zoek" style="flex:1;min-width:0" id="eigen-naam" placeholder="Bijv. pindakaas" autocomplete="off" aria-label="Artikel toevoegen"><button class="btn primair">Toevoegen</button></form></section>
      </div>
      ${huis ? `<details class="in-huis" style="margin-top:22px"><summary class="btn klein" style="list-style:none;display:inline-flex">Al in huis (${l.menu.huis.length + l.school.huis.length})</summary><div class="paneel" style="margin-top:10px">${huis}</div></details>` : ""}
      <div class="klaar-band"><div><b>${klaar ? "Lijst staat klaar voor je AH-mandje" : "Klaar met controleren?"}</b>
        <p class="sub">${klaar ? (state.lijst.verstuurdOp ? "Doorgestuurd. Claude zet hem in je AH-mandje; afrekenen doe je daarna in de AH-app." : "Nog niet doorgestuurd. Stel bij Bijwerken een GitHub-sleutel in, of tik op Lijst kopiëren.") : "Zet de lijst klaar, dan gaat hij naar Claude voor je AH-mandje."}</p></div>
        <div class="btn-rij">${klaar ? '<button class="btn klein" data-act="lijst-open">Weer aanpassen</button>' : '<button class="btn accent" data-act="lijst-klaar">Lijst klaarzetten</button>'}
        <a class="btn klein" href="https://www.ah.nl/mijnlijst" target="_blank" rel="noopener">Open AH</a></div></div>`;
  };

  views.voorraad = function () {
    const q = norm(ui.zoek);
    const items = state.voorraad.items.filter((v) => !q || norm(v.naam).includes(q));
    const groepen = {};
    for (const v of items) (groepen[v.categorie || "Overig"] ||= []).push(v);
    const html = Object.keys(groepen).sort().map((g) => `<div class="groep-kop"><h2>${esc(g)}</h2><span class="tel">${groepen[g].length}</span></div>
      <div class="rij-lijst">${groepen[g].sort((a, b) => a.naam.localeCompare(b.naam)).map((v) => `
        <div class="rij"><button class="rij-naam" style="all:unset;cursor:pointer" data-act="voorraad-bewerk" data-id="${v.id}"><div class="rij-naam">${esc(cap(v.naam))}</div>
          <div class="rij-sub">${v.hoeveelheid <= 0 ? '<span class="chip warn">Op</span>' : "Tik om aan te passen"}</div></button>
          <div class="stepper"><button data-act="v-min" data-id="${v.id}" aria-label="Minder ${esc(v.naam)}">−</button><span class="waarde">${esc(fmtHoeveel(v.hoeveelheid, v.eenheid))}</span><button data-act="v-plus" data-id="${v.id}" aria-label="Meer ${esc(v.naam)}">+</button></div></div>`).join("")}</div>`).join("");
    return `<div class="kop"><div><div class="eyebrow">Voorraad</div><h1>Wat hebben we in huis?</h1><p class="sub">Gaat automatisch omlaag als je een gerecht kookt.</p></div>
      <button class="btn primair" data-act="voorraad-nieuw">Product toevoegen</button></div>
      <input class="zoek" id="voorraad-zoek" placeholder="Zoek in de voorraad" value="${esc(ui.zoek)}" autocomplete="off" aria-label="Zoek in de voorraad">
      ${html || '<div class="paneel leeg" style="margin-top:18px"><h2>Niets gevonden</h2><p>Voeg een product toe met de knop hierboven.</p></div>'}`;
  };

  const SNEL_HUISHOUDEN = [["Vaatwastabletten", 21], ["Afwasmiddel", 30], ["Wasmiddel", 30], ["Wasverzachter", 30], ["Wc-papier", 14], ["Keukenrol", 14], ["Luiers", 7], ["Billendoekjes", 10], ["Vuilniszakken", 30], ["Handzeep", 30], ["Tandpasta", 30], ["Allesreiniger", 45], ["Afwasborstel", 60], ["Batterijen", 90]];
  views.huishouden = function () {
    const vandaag = vandaagISO();
    const items = [...state.vaste.items].sort((a, b) => (a.intervalDagen - dagenTussen(a.laatst, vandaag)) - (b.intervalDagen - dagenTussen(b.laatst, vandaag)));
    const bestaand = new Set(state.vaste.items.map((v) => norm(v.naam)));
    const rijen = items.map((v) => {
      const verstreken = dagenTussen(v.laatst, vandaag);
      const fractie = Math.max(0, Math.min(1, 1 - verstreken / v.intervalDagen));
      const klas = fractie <= 0 ? "op" : fractie < 0.2 ? "bijna" : "";
      return `<div class="rij"><button style="all:unset;cursor:pointer;min-width:0" data-act="vaste-bewerk" data-id="${v.id}"><div class="rij-naam">${esc(v.naam)}${v.opLijst ? ' <span class="chip bonus">Op de lijst</span>' : ""}</div>
        <div class="rij-sub">${esc(resterend(v))} · elke ${v.intervalDagen} dagen · ${v.aantal || 1}×</div><div class="balk ${klas}"><i style="width:${Math.round(fractie * 100)}%"></i></div></button>
        <div class="btn-rij"><button class="btn klein" data-act="vaste-lijst" data-id="${v.id}">${v.opLijst ? "Van lijst af" : "Op lijst"}</button><button class="btn klein primair" data-act="vaste-gekocht" data-id="${v.id}">Gekocht</button></div></div>`;
    }).join("");
    const snel = SNEL_HUISHOUDEN.filter(([n]) => !bestaand.has(norm(n))).map(([n, d]) => `<button data-act="snel" data-naam="${esc(n)}" data-dagen="${d}">+ ${esc(n)}</button>`).join("");
    return `<div class="kop"><div><div class="eyebrow">Huishouden</div><h1>Vaste producten</h1><p class="sub">Komen vanzelf op de lijst als ze bijna op zijn.</p></div>
      <button class="btn primair" data-act="vaste-nieuw">Eigen product</button></div>
      <div class="rij-lijst">${rijen || '<div class="paneel leeg"><h2>Nog geen vaste producten</h2><p>Tik hieronder op een product om het toe te voegen.</p></div>'}</div>
      ${snel ? `<div class="groep-kop"><h2>Snel toevoegen</h2></div><div class="snelkeuze">${snel}</div>` : ""}`;
  };

  views.school = function () {
    const kaarten = state.school.kinderen.map((k) => `<section class="paneel">
      <div class="dag-kop" style="margin-bottom:12px"><h3 style="margin:0">${esc(k.naam)}</h3><button class="btn klein" data-act="kind-bewerk" data-id="${k.id}">Wijzig</button></div>
      <div class="rij" style="margin-bottom:12px"><div><div class="rij-naam">Dagen deze week</div><div class="rij-sub">School of opvang</div></div>
        <div class="stepper"><button data-act="kind-dagen" data-id="${k.id}" data-delta="-1" aria-label="Minder dagen">−</button><span class="waarde">${k.dagen}</span><button data-act="kind-dagen" data-id="${k.id}" data-delta="1" aria-label="Meer dagen">+</button></div></div>
      <div class="rij-lijst">${k.items.map((it, i) => `<div class="rij"><div><div class="rij-naam">${esc(cap(it.naam))}</div><div class="rij-sub">${it.perDag * k.dagen} ${esc(it.eenheid)} deze week</div></div>
        <div class="stepper"><button data-act="item-min" data-id="${k.id}" data-i="${i}" aria-label="Minder">−</button><span class="waarde">${it.perDag}/dag</span><button data-act="item-plus" data-id="${k.id}" data-i="${i}" aria-label="Meer">+</button></div></div>`).join("")}</div>
      <form class="btn-rij" style="margin-top:12px" data-form="school-item" data-id="${k.id}"><input class="zoek" style="flex:1;min-width:0" name="naam" placeholder="Bijv. drinkpakje" autocomplete="off" aria-label="Item voor ${esc(k.naam)}"><button class="btn primair">Toevoegen</button></form>
    </section>`).join("");
    return `<div class="kop"><div><div class="eyebrow">School</div><h1>Mee naar school</h1><p class="sub">Eten en drinken per kind, keer het aantal dagen. Gaat mee op de boodschappenlijst.</p></div>
      <button class="btn primair" data-act="kind-nieuw">Kind toevoegen</button></div>
      <div class="twee-kol">${kaarten || '<div class="paneel leeg"><h2>Nog geen kinderen toegevoegd</h2></div>'}</div>`;
  };

  function cap(s) { s = String(s || ""); return s.charAt(0).toUpperCase() + s.slice(1); }

  // ---------- Renderen ----------
  function render() {
    const main = $("#main");
    const scroll = main.scrollTop;
    main.innerHTML = views[ui.view]();
    main.scrollTop = scroll;
    document.querySelectorAll(".rail-btn[data-view]").forEach((b) => b.toggleAttribute("aria-current", b.dataset.view === ui.view) || (b.dataset.view === ui.view && b.setAttribute("aria-current", "page")));
    const n = aantalTeKopen();
    const bl = $("#badge-lijst"); bl.hidden = !n; bl.textContent = n;
    const due = state.vaste.items.filter((v) => dagenTussen(v.laatst, vandaagISO()) >= v.intervalDagen - 3).length;
    const bv = $("#badge-vaste"); bv.hidden = !due; bv.textContent = due;
    const zoek = $("#voorraad-zoek");
    if (zoek && document.activeElement?.id !== "voorraad-zoek" && ui.zoekFocus) { zoek.focus(); zoek.setSelectionRange(zoek.value.length, zoek.value.length); }
  }
  function ga(view) { ui.view = view; if (view !== "vandaag") ui.dag = null; $("#main").scrollTop = 0; render(); }

  document.querySelectorAll(".rail-btn[data-view]").forEach((b) => b.addEventListener("click", () => ga(b.dataset.view)));

  // ---------- Acties ----------
  const acties = {
    dag(el) { const d = +el.dataset.delta; if (d === 0) { ui.dag = null; } else { const base = parseISO(ui.dag || vandaagISO()); base.setDate(base.getDate() + d); ui.dag = isoVan(base); } render(); },
    kook(el) { kook(el.dataset.datum); },
    stap(el) { const d = el.dataset.datum, i = +el.dataset.i; (ui.stappen[d] ||= [])[i] = !ui.stappen[d][i]; render(); },
    "open-dag"(el) { ui.view = "vandaag"; ui.dag = el.dataset.datum; render(); },
    akkoord() { const m = ui.week === "volgende" && state.volgende ? state.volgende : state.menu; m.status = "akkoord"; m.akkoordOp = new Date().toISOString(); bewaar(); render(); toast("Weekmenu goedgekeurd. De ingrediënten staan op de boodschappenlijst."); },
    heropen() { const m = ui.week === "volgende" && state.volgende ? state.volgende : state.menu; m.status = "voorstel"; bewaar(); render(); },
    "naar-volgende"() { ui.week = "volgende"; ga("week"); },
    weektab(el) { ui.week = el.dataset.week; render(); },
    instellingen() { instellingenSheet(); },
    schrap(el) { const d = dagVan(el.dataset.datum); d.geschrapt = true; bewaar(); render(); toast(`${cap(dagNaam(d.datum))} geschrapt.`, () => { d.geschrapt = false; bewaar(); render(); }); },
    herstel(el) { dagVan(el.dataset.datum).geschrapt = false; bewaar(); render(); },
    wissel(el) {
      const d = dagVan(el.dataset.datum);
      const mm = menuVan(d.datum);
      const inMenu = new Set(mm.dagen.map((x) => norm(x.gerecht)));
      const opties = state.recepten.filter((r) => !inMenu.has(norm(r.gerecht)));
      sheet(`Ander gerecht voor ${dagNaam(d.datum)}`, opties.length ? `<div class="rij-lijst">${opties.map((r, i) => `<button class="rij" style="text-align:left" data-kies="${i}"><div><div class="rij-naam">${esc(r.gerecht)}</div><div class="rij-sub">${esc(r.tijd)} min · ${euro(r.kosten)}</div></div><span class="chip">Kies</span></button>`).join("")}</div>
        <p class="sub">Vanaf de volgende stap stelt Claude hier passende gerechten voor op basis van de Bonus.</p><div class="btn-rij" style="margin-top:14px"><button class="btn" data-act="sluit">Annuleren</button></div>`
        : `<p>Er zijn geen andere recepten opgeslagen.</p><button class="btn" data-act="sluit">Sluiten</button>`, (root) => {
        root.querySelectorAll("[data-kies]").forEach((b) => b.addEventListener("click", () => {
          const r = opties[+b.dataset.kies];
          const oud = { ...d };
          const i = mm.dagen.indexOf(d);
          state.recepten = state.recepten.filter((x) => x !== r);
          state.recepten.push({ gerecht: oud.gerecht, tijd: oud.tijd, kosten: oud.kosten, bonus: oud.bonus, kindertip: oud.kindertip, ingredienten: oud.ingredienten, stappen: oud.stappen });
          mm.dagen[i] = { ...JSON.parse(JSON.stringify(r)), datum: d.datum, geschrapt: false, gekookt: false };
          bewaar(); sluitSheet(); render(); toast(`${cap(dagNaam(d.datum))}: ${r.gerecht}.`);
        }));
      });
    },
    async voorbeeld() { const v = await laadVoorbeeld(); state = compleet({ ...state, menu: v.menu, recepten: v.recepten }); bewaar(); render(); },
    kopieer() {
      const l = berekenLijst();
      const regels = [...l.menu.koop, ...l.school.koop, ...l.vaste].map((x) => `- ${x.naam}: ${fmtHoeveel(x.hoeveelheid, x.eenheid)}`).concat(l.eigen.map((x) => `- ${x.naam}: ${x.aantal}`));
      const tekst = "Boodschappen\n" + regels.join("\n");
      navigator.clipboard?.writeText(tekst).then(() => toast("Lijst gekopieerd."), () => toast("Kopiëren lukte niet op dit apparaat."));
    },
    async "lijst-klaar"() {
      const l = berekenLijst();
      const strip = (x) => ({ naam: x.naam, hoeveelheid: x.hoeveelheid, eenheid: x.eenheid });
      state.lijst.status = "klaar"; state.lijst.klaarOp = new Date().toISOString();
      state.lijst.bestelling = [...l.menu.koop.map((x) => ({ ...strip(x), groep: "menu" })), ...l.school.koop.map((x) => ({ ...strip(x), groep: "school" })), ...l.vaste.map((x) => ({ ...strip(x), groep: "huishouden" })), ...l.eigen.map((x) => ({ naam: x.naam, hoeveelheid: x.aantal, eenheid: "stuks", groep: "eigen" }))];
      bewaar(); render();
      if (!gh.token()) { toast("Lijst staat klaar. Stel bij Bijwerken een GitHub-sleutel in om hem automatisch door te sturen."); return; }
      toast("Lijst wordt doorgestuurd…");
      try {
        await stuurDoor();
        state.lijst.verstuurdOp = new Date().toISOString(); bewaar(); render();
        toast("Doorgestuurd. Claude zet de boodschappen in je AH-mandje.");
      } catch (e) { toast(`Doorsturen lukte niet: ${e.message}. Probeer het later opnieuw.`); }
    },
    "lijst-open"() { state.lijst.status = "open"; state.lijst.verstuurdOp = null; bewaar(); render(); },
    "eigen-plus"(el) { const x = state.lijst.items.find((i) => i.id === el.dataset.id); x.aantal++; bewaar(); render(); },
    "eigen-min"(el) { const x = state.lijst.items.find((i) => i.id === el.dataset.id); x.aantal--; if (x.aantal <= 0) state.lijst.items = state.lijst.items.filter((i) => i !== x); bewaar(); render(); },
    "v-plus"(el) { const v = state.voorraad.items.find((i) => i.id === el.dataset.id); v.hoeveelheid = +(v.hoeveelheid + stapVoor(v.eenheid)).toFixed(3); bewaar(); render(); },
    "v-min"(el) { const v = state.voorraad.items.find((i) => i.id === el.dataset.id); v.hoeveelheid = Math.max(0, +(v.hoeveelheid - stapVoor(v.eenheid)).toFixed(3)); bewaar(); render(); },
    "voorraad-nieuw"() { voorraadSheet(null); },
    "voorraad-bewerk"(el) { voorraadSheet(state.voorraad.items.find((i) => i.id === el.dataset.id)); },
    "vaste-gekocht"(el) { const v = state.vaste.items.find((i) => i.id === el.dataset.id); const oud = { laatst: v.laatst, opLijst: v.opLijst }; v.laatst = vandaagISO(); v.opLijst = false; bewaar(); render(); toast(`${v.naam} afgevinkt.`, () => { Object.assign(v, oud); bewaar(); render(); }); },
    "vaste-lijst"(el) { const v = state.vaste.items.find((i) => i.id === el.dataset.id); v.opLijst = !v.opLijst; bewaar(); render(); },
    snel(el) { state.vaste.items.push({ id: uid(), naam: el.dataset.naam, intervalDagen: +el.dataset.dagen, laatst: vandaagISO(), aantal: 1, opLijst: true }); bewaar(); render(); toast(`${el.dataset.naam} toegevoegd en op de lijst gezet.`); },
    "vaste-nieuw"() { vasteSheet(null); },
    "vaste-bewerk"(el) { vasteSheet(state.vaste.items.find((i) => i.id === el.dataset.id)); },
    "kind-dagen"(el) { const k = state.school.kinderen.find((i) => i.id === el.dataset.id); k.dagen = Math.max(0, Math.min(7, k.dagen + +el.dataset.delta)); bewaar(); render(); },
    "item-plus"(el) { const k = state.school.kinderen.find((i) => i.id === el.dataset.id); k.items[+el.dataset.i].perDag++; bewaar(); render(); },
    "item-min"(el) { const k = state.school.kinderen.find((i) => i.id === el.dataset.id); const it = k.items[+el.dataset.i]; it.perDag--; if (it.perDag <= 0) k.items.splice(+el.dataset.i, 1); bewaar(); render(); },
    "kind-nieuw"() { kindSheet(null); },
    "kind-bewerk"(el) { kindSheet(state.school.kinderen.find((i) => i.id === el.dataset.id)); }
  };

  $("#main").addEventListener("click", (e) => {
    const g = e.target.closest("[data-goto]"); if (g) { ga(g.dataset.goto); return; }
    const a = e.target.closest("[data-act]"); if (a && acties[a.dataset.act]) acties[a.dataset.act](a);
  });
  $("#main").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.dataset.form === "eigen") {
      const naam = $("#eigen-naam").value.trim(); if (!naam) return;
      const bestaand = state.lijst.items.find((i) => norm(i.naam) === norm(naam));
      if (bestaand) bestaand.aantal++; else state.lijst.items.push({ id: uid(), naam: cap(naam), aantal: 1 });
      bewaar(); render(); $("#eigen-naam")?.focus();
    }
    if (f.dataset.form === "school-item") {
      const naam = f.naam.value.trim(); if (!naam) return;
      state.school.kinderen.find((k) => k.id === f.dataset.id).items.push({ naam, perDag: 1, eenheid: "stuks" });
      bewaar(); render();
    }
  });
  $("#main").addEventListener("input", (e) => {
    if (e.target.id === "voorraad-zoek") { ui.zoek = e.target.value; ui.zoekFocus = true; render(); ui.zoekFocus = false; }
  });

  // ---------- Formulieren ----------
  const eenheidOpties = (sel) => EENHEDEN.map((e) => `<option ${e === sel ? "selected" : ""}>${e}</option>`).join("");
  const CATEGORIEEN = ["Groente en fruit", "Koelkast", "Vriezer", "Voorraadkast", "Brood en ontbijt", "School", "Overig"];
  function voorraadSheet(v) {
    sheet(v ? `${cap(v.naam)} aanpassen` : "Product toevoegen", `<form id="f-voorraad">
      <div class="veld"><label for="fv-naam">Naam</label><input id="fv-naam" name="naam" required value="${esc(v?.naam || "")}" autocomplete="off"></div>
      <div class="veld-rij"><div class="veld"><label for="fv-h">Hoeveelheid</label><input id="fv-h" name="h" type="number" step="any" min="0" inputmode="decimal" value="${esc(v?.hoeveelheid ?? 1)}"></div>
        <div class="veld"><label for="fv-e">Eenheid</label><select id="fv-e" name="e">${eenheidOpties(v?.eenheid || "stuks")}</select></div></div>
      <div class="veld"><label for="fv-c">Plek</label><select id="fv-c" name="c">${CATEGORIEEN.map((c) => `<option ${c === (v?.categorie || "Voorraadkast") ? "selected" : ""}>${c}</option>`).join("")}</select></div>
      <div class="btn-rij"><button class="btn primair">Opslaan</button><button type="button" class="btn" data-act="sluit">Annuleren</button>${v ? '<button type="button" class="btn" id="fv-weg" style="margin-left:auto">Verwijderen</button>' : ""}</div></form>`, (root) => {
      root.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault(); const f = e.target;
        const data = { naam: norm(f.naam.value), hoeveelheid: Number(f.h.value) || 0, eenheid: f.e.value, categorie: f.c.value };
        if (v) Object.assign(v, data); else state.voorraad.items.push({ id: uid(), ...data });
        bewaar(); sluitSheet(); render();
      });
      root.querySelector("#fv-weg")?.addEventListener("click", () => { state.voorraad.items = state.voorraad.items.filter((i) => i !== v); bewaar(); sluitSheet(); render(); toast(`${cap(v.naam)} verwijderd.`); });
    });
  }
  function vasteSheet(v) {
    sheet(v ? `${v.naam} aanpassen` : "Vast product toevoegen", `<form>
      <div class="veld"><label for="fh-naam">Naam</label><input id="fh-naam" name="naam" required value="${esc(v?.naam || "")}" placeholder="Bijv. vaatwastabletten" autocomplete="off"></div>
      <div class="veld-rij"><div class="veld"><label for="fh-int">Ongeveer elke … dagen op</label><input id="fh-int" name="int" type="number" min="1" inputmode="numeric" value="${esc(v?.intervalDagen ?? 14)}"></div>
        <div class="veld"><label for="fh-aantal">Aantal per keer</label><input id="fh-aantal" name="aantal" type="number" min="1" inputmode="numeric" value="${esc(v?.aantal ?? 1)}"></div></div>
      <div class="btn-rij"><button class="btn primair">Opslaan</button><button type="button" class="btn" data-act="sluit">Annuleren</button>${v ? '<button type="button" class="btn" id="fh-weg" style="margin-left:auto">Verwijderen</button>' : ""}</div></form>`, (root) => {
      root.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault(); const f = e.target;
        const data = { naam: cap(f.naam.value.trim()), intervalDagen: Math.max(1, +f.int.value || 14), aantal: Math.max(1, +f.aantal.value || 1) };
        if (v) Object.assign(v, data); else state.vaste.items.push({ id: uid(), ...data, laatst: vandaagISO(), opLijst: true });
        bewaar(); sluitSheet(); render();
      });
      root.querySelector("#fh-weg")?.addEventListener("click", () => { state.vaste.items = state.vaste.items.filter((i) => i !== v); bewaar(); sluitSheet(); render(); });
    });
  }
  function kindSheet(k) {
    sheet(k ? `${k.naam} aanpassen` : "Kind toevoegen", `<form>
      <div class="veld"><label for="fk-naam">Naam</label><input id="fk-naam" name="naam" required value="${esc(k?.naam || "")}" autocomplete="off"></div>
      <div class="veld"><label for="fk-dagen">Dagen per week naar school of opvang</label><input id="fk-dagen" name="dagen" type="number" min="0" max="7" inputmode="numeric" value="${esc(k?.dagen ?? 5)}"></div>
      <div class="btn-rij"><button class="btn primair">Opslaan</button><button type="button" class="btn" data-act="sluit">Annuleren</button>${k ? '<button type="button" class="btn" id="fk-weg" style="margin-left:auto">Verwijderen</button>' : ""}</div></form>`, (root) => {
      root.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault(); const f = e.target;
        const data = { naam: f.naam.value.trim(), dagen: Math.max(0, Math.min(7, +f.dagen.value || 0)) };
        if (k) Object.assign(k, data); else state.school.kinderen.push({ id: uid(), ...data, items: [] });
        bewaar(); sluitSheet(); render();
      });
      root.querySelector("#fk-weg")?.addEventListener("click", () => { state.school.kinderen = state.school.kinderen.filter((i) => i !== k); bewaar(); sluitSheet(); render(); });
    });
  }

  // ---------- Doorsturen naar de repo ----------
  // Met een GitHub-sleutel die alleen deze repo mag wijzigen zet de tablet de bestelling
  // en de voorraad in de repo, zodat Claude het AH-mandje kan vullen en het menu kan afstemmen.
  const GH_SLEUTEL = "keukenbord.ghtoken";
  const REPO = "raoulvink1/keuken-app";
  const gh = {
    token() { try { return localStorage.getItem(GH_SLEUTEL) || ""; } catch { return ""; } },
    async schrijf(pad, obj, bericht) {
      const t = this.token(); if (!t) throw new Error("geen GitHub-sleutel");
      const url = `https://api.github.com/repos/${REPO}/contents/${pad}`;
      const kop = { Authorization: `Bearer ${t}`, Accept: "application/vnd.github+json" };
      let sha;
      const oud = await fetch(`${url}?ref=main`, { headers: kop, cache: "no-store" });
      if (oud.ok) sha = (await oud.json()).sha;
      else if (oud.status === 401 || oud.status === 403) throw new Error("GitHub-sleutel wordt geweigerd");
      const inhoud = btoa(unescape(encodeURIComponent(JSON.stringify(obj, null, 2) + "\n")));
      const res = await fetch(url, { method: "PUT", headers: kop, body: JSON.stringify({ message: bericht, content: inhoud, sha, branch: "main" }) });
      if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? "GitHub-sleutel wordt geweigerd" : `GitHub gaf ${res.status}`);
    }
  };
  async function stuurDoor() {
    const m = bestelMenu();
    await gh.schrijf("data/bestelling.json", {
      week: m.week || null,
      klaarOp: state.lijst.klaarOp,
      status: "klaar",
      menu: (m.dagen || []).filter((d) => !d.geschrapt).map((d) => ({ datum: d.datum, gerecht: d.gerecht })),
      items: state.lijst.bestelling
    }, `Bestelling ${m.week || ""} klaargezet op de tablet`.trim());
    await gh.schrijf("data/voorraad.json", {
      bijgewerkt: new Date().toISOString(),
      voorraad: state.voorraad.items.map(({ naam, hoeveelheid, eenheid, categorie }) => ({ naam, hoeveelheid, eenheid, categorie })),
      vaste: state.vaste.items.map(({ naam, intervalDagen, laatst, aantal }) => ({ naam, intervalDagen, laatst, aantal })),
      school: state.school.kinderen.map(({ naam, dagen, items }) => ({ naam, dagen, items }))
    }, "Voorraad bijgewerkt vanaf de tablet");
  }

  function instellingenSheet() {
    const status = sync.status === "aan" ? `Laatst gecontroleerd om ${sync.laatst.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}.` : sync.status === "fout" ? `Controleren lukte niet: ${esc(sync.fout)}.` : "Nog niet gecontroleerd.";
    const v = state.volgende;
    sheet("Weekmenu ophalen", `<p class="sub" style="margin-top:0">Claude zet elke donderdagochtend het menu voor volgende week klaar. De tablet kijkt elk half uur of het er is.</p>
      <p><b>${v?.dagen?.length ? `Volgende week (${esc(v.week)}) staat klaar${v.status === "akkoord" ? " en is goedgekeurd" : ""}.` : "Nog geen menu voor volgende week."}</b><br><span class="sub">${status}</span></p>
      <div class="btn-rij" style="margin-top:14px"><button class="btn primair" id="fi-nu">Nu controleren</button><button type="button" class="btn" data-act="sluit">Sluiten</button></div>
      <form id="fi-gh" style="margin-top:24px;padding-top:18px;border-top:1px solid var(--line)">
        <div class="veld"><label for="fi-token">GitHub-sleutel om de lijst door te sturen</label>
          <input id="fi-token" name="token" type="password" autocomplete="off" placeholder="${gh.token() ? "Ingesteld (laat leeg om te houden)" : "github_pat_…"}"></div>
        <p class="sub">Een sleutel die alleen <b>keuken-app</b> mag wijzigen. Hij blijft op deze tablet.</p>
        <div class="btn-rij"><button class="btn">Sleutel opslaan</button>${gh.token() ? '<button type="button" class="btn" id="fi-wis">Sleutel wissen</button>' : ""}</div>
      </form>`, (root) => {
      root.querySelector("#fi-gh").addEventListener("submit", (e) => {
        e.preventDefault(); const v = e.target.token.value.trim();
        if (v) { try { localStorage.setItem(GH_SLEUTEL, v); } catch {} }
        sluitSheet(); toast(v ? "GitHub-sleutel opgeslagen." : "Niets gewijzigd.");
      });
      root.querySelector("#fi-wis")?.addEventListener("click", () => { try { localStorage.removeItem(GH_SLEUTEL); } catch {} sluitSheet(); toast("GitHub-sleutel gewist."); });
      root.querySelector("#fi-nu").addEventListener("click", async () => {
        const nieuw = await sync.haal();
        sluitSheet();
        if (!nieuw) toast(sync.status === "aan" ? "Er is nog geen nieuw weekmenu." : `Controleren lukte niet: ${sync.fout}.`);
      });
    });
  }

  // ---------- Screensaver ----------
  const IDLE_MS = 3 * 60 * 1000;
  let idleTimer = null, klokTimer = null, driftTimer = null;
  function toonKlok() {
    const now = new Date();
    $("#ss-tijd").textContent = now.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
    $("#ss-datum").textContent = cap(now.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" }));
    const d = state && dagVan(vandaagISO());
    $("#ss-vanavond").textContent = d && !d.geschrapt ? (d.gekookt ? `Vandaag gegeten: ${d.gerecht}` : `Vanavond: ${d.gerecht}`) : "";
    const uur = now.getHours();
    $("#screensaver").style.opacity = uur >= 22 || uur < 6 ? "0.55" : "1";
  }
  function drift() {
    const ss = $("#screensaver"), inner = $("#ss-inner");
    const maxX = Math.max(0, ss.clientWidth - inner.offsetWidth), maxY = Math.max(0, ss.clientHeight - inner.offsetHeight);
    inner.style.transform = `translate(${Math.round(Math.random() * maxX)}px, ${Math.round(Math.random() * maxY)}px)`;
  }
  function startScreensaver() {
    if (!$("#sheet").hidden) sluitSheet();
    $("#screensaver").hidden = false;
    toonKlok(); drift();
    klokTimer = setInterval(toonKlok, 1000);
    driftTimer = setInterval(drift, 60000);
  }
  function stopScreensaver() {
    $("#screensaver").hidden = true;
    clearInterval(klokTimer); clearInterval(driftTimer);
    if (ui.view === "vandaag") { ui.dag = null; render(); }
  }
  function resetIdle() { clearTimeout(idleTimer); idleTimer = setTimeout(startScreensaver, IDLE_MS); }
  ["pointerdown", "keydown", "wheel", "touchstart"].forEach((ev) => document.addEventListener(ev, (e) => {
    if (!$("#screensaver").hidden) { e.preventDefault(); e.stopPropagation(); stopScreensaver(); }
    resetIdle(); vraagWakeLock();
  }, { capture: true, passive: false }));
  $("#btn-instellingen").addEventListener("click", () => instellingenSheet());
  $("#btn-klok").addEventListener("click", () => setTimeout(startScreensaver, 0));
  $("#btn-volscherm").addEventListener("click", () => {
    const el = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    else el.requestFullscreen?.().catch(() => toast("Volledig scherm is hier niet beschikbaar."));
  });

  // Scherm aan houden zolang de app open staat
  let wakeLock = null;
  async function vraagWakeLock() {
    if (wakeLock || !("wakeLock" in navigator)) return;
    try { wakeLock = await navigator.wakeLock.request("screen"); wakeLock.addEventListener("release", () => { wakeLock = null; }); } catch { /* niet toegestaan */ }
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") vraagWakeLock(); });

  // Om middernacht verspringt "vandaag"
  let laatsteDag = vandaagISO();
  setInterval(() => { const nu = vandaagISO(); if (nu !== laatsteDag) { laatsteDag = nu; if (state) { if (schuifWeek()) bewaar(); render(); } } }, 60000);

  // ---------- Start ----------
  async function start() {
    state = laadLokaal();
    if (!state) {
      try { state = await laadVoorbeeld(); } catch { state = {}; }
      state = compleet(state);
      bewaar();
    } else compleet(state);
    if (schuifWeek()) { try { localStorage.setItem(SLEUTEL, JSON.stringify(state)); } catch {} }
    render();
    resetIdle();
    await sync.haal();
    setInterval(() => { if (document.visibilityState === "visible") sync.haal(); }, 30 * 60 * 1000);
  }
  start();

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
