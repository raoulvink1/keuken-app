/* Keukenbord — keukentablet voor weekmenu, voorraad en boodschappen.
   Hoe het samenhangt:
   - Weekmenu: Claude zet elke week een menu klaar (data/volgende.json). Je past het aan zoals je wilt.
   - Boodschappen = wat het menu, school, huishouden en je minimale voorraad nodig hebben,
     min wat in huis is, min wat al besteld en onderweg is. Na het bestellen is de lijst dus leeg.
   - Een bestelling loopt: verstuurd → in AH-mandje → besteld → binnen. Bij "binnen" gaat alles de voorraad in.
   - Koken haalt de ingrediënten weer uit de voorraad. */
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
  // Schappen in de volgorde van een winkel, zodat de lijst logisch leest.
  const WINKEL_VOLGORDE = ["Groente en fruit", "Vlees en vis", "Kaas, zuivel en eieren", "Brood en ontbijt", "Voorraadkast", "Diepvries", "Drinken", "Overig", "Mee naar school", "Huishouden"];
  const WINKEL_HERKEN = [
    ["Diepvries", /diepvries|bevroren|visstick|ijsjes|doperwten diep/],
    ["Vlees en vis", /gehakt|kip|filet|vlees|worst|spek|bacon|\bham\b|zalm|\bvis\b|kabeljauw|tonijn|garnal|rund|varken|shoarma|schnitzel|burger|balletjes|soepballetjes|lam/],
    ["Kaas, zuivel en eieren", /kaas|melk|yoghurt|kwark|room|boter|\beie?ren\b|\bei\b|\bvla\b|crème fraîche|creme fraiche|mozzarella|feta|parmezaan|kokosmelk/],
    ["Groente en fruit", /appel|peer|banaan|mandarijn|sinaasappel|druif|druiven|aardbei|fruit|tomaat|tomaten(?!blok|puree)|komkommer|paprika|\bui\b|uien|knoflook|wortel|peen|\bsla\b|spinazie|broccoli|bloemkool|courgette|prei|aardappel|kriel|champignon|boerenkool|sperzieb|avocado|citroen|limoen|gember|peterselie|basilicum|bieslook|koriander|groente|andijvie|spruit|kool|pompoen|bosui/],
    ["Brood en ontbijt", /brood|\bbol(len)?\b|krentenbol|beschuit|cracker|wrap|tortilla|pita|naan|ontbijtkoek|hagelslag|\bjam\b|pindakaas|muesli|havermout|cornflakes|rijstwafel|pannenkoekmix/],
    ["Drinken", /\bsap\b|limonade|drinkpak|\bwater\b|cola|\bthee\b|koffie|siroop/],
    ["Voorraadkast", /pasta|spaghetti|macaroni|penne|vermicelli|rijst|noedel|meel|bloem|suiker|olie|azijn|saus|bouillon|\bblik\b|tomatenblok|tomatenpuree|passata|kruiden|poeder|kerrie|mosterd|mayonaise|ketchup|pesto|couscous|linzen|kikkererwt|soep/]
  ];

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
    return `${txt} ${e === "stuks" && n === 1 ? "stuk" : e}`;
  }
  // Reken kg/l om naar g/ml zodat hoeveelheden optelbaar zijn.
  const naarBasis = (h, e) => e === "kg" ? [h * 1000, "g"] : e === "l" ? [h * 1000, "ml"] : [Number(h) || 0, e];
  const vanBasis = (h, e) => e === "kg" || e === "l" ? h / 1000 : h;
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
  const STANDAARD_WENSEN = {
    gezin: "2 volwassenen en 3 kinderen (9, 3 en 1 jaar), ongeveer 4 volwassen porties",
    allergieen: "",
    nietLekker: "",
    wensen: "Mild gekruid en kindvriendelijk. Voor de 1-jarige geen hele noten, geen honing en weinig zout.",
    nieuwPerWeek: 2,
    maxTijd: 35,
    budget: 60
  };
  function wensenTekst(w = state.wensen) {
    const z = (t) => String(t).trim().replace(/[.!\s]+$/, "");
    w = { ...w, gezin: z(w.gezin), allergieen: z(w.allergieen), nietLekker: z(w.nietLekker), wensen: z(w.wensen) };
    return [
      `Gezin: ${w.gezin}.`,
      w.allergieen ? `Allergieën en wat echt niet mag (strikt, ook geen sporen in de hoofdingrediënten): ${w.allergieen}.` : "",
      w.nietLekker ? `Lusten we niet: ${w.nietLekker}.` : "",
      w.wensen ? `Wensen: ${w.wensen}.` : "",
      `Doordeweeks maximaal ${w.maxTijd} minuten koken.`,
      w.budget ? `Budget voor de avondmaaltijden: ongeveer € ${w.budget} per week.` : ""
    ].filter(Boolean).join("\n");
  }
  function compleet(s) {
    s.menu ||= { status: "leeg", dagen: [] };
    s.recepten ||= [];
    s.voorraad ||= { items: [] };
    s.vaste ||= { items: [] };
    s.school ||= { kinderen: [] };
    s.wensen ||= { ...STANDAARD_WENSEN };
    s.lijst ||= { items: [] };
    s.lijst.items ||= [];
    s.producten ||= {};
    s.bestellingen ||= [];
    s.ah ||= null;
    s.volgende ||= null;
    s._ts ||= {};
    // Oude opzet (één lijst met status) omzetten naar een bestelling.
    const l = s.lijst;
    if (l.klaarOp && l.bestelling?.length && !s.bestellingen.some((b) => b.klaarOp === l.klaarOp)) {
      s.bestellingen.push({ id: uid(), week: null, klaarOp: l.klaarOp, items: l.bestelling, mandje: l.mandje || null, ah: l.bezorging || null,
        status: l.binnenOp ? "binnen" : l.bezorging ? "besteld" : l.mandje ? "gevuld" : l.verstuurdOp ? "verstuurd" : "verlopen", binnenOp: l.binnenOp || null });
    }
    for (const k of ["status", "klaarOp", "verstuurdOp", "bestelling", "mandje", "bezorging", "binnenOp"]) delete l[k];
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
        if (res.status === 404) { this.status = "aan"; this.laatst = new Date(); await this.bestellingen(); return false; }
        if (!res.ok) throw new Error(`server gaf ${res.status}`);
        const data = await res.json();
        this.status = "aan"; this.fout = ""; this.laatst = new Date();
        let veranderd = false, nieuw = false;
        const al = [state.menu?.week, state.volgende?.week];
        const laatsteDag = data?.dagen?.[data.dagen.length - 1]?.datum;
        if (data?.week && data.dagen?.length && laatsteDag >= vandaagISO()) {
          if (!al.includes(data.week)) { state.volgende = data; nieuw = veranderd = true; }
          else if (state.volgende?.week === data.week && !state.volgende.aangepast && !bestellingVoor(data.week) && data.gemaaktOp && data.gemaaktOp !== state.volgende.gemaaktOp) {
            state.volgende = data; veranderd = true; // bijgewerkt door de zaterdagcontrole, en jij had nog niets veranderd of besteld
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
        await this.bestellingen();
        return veranderd;
      } catch (e) { this.status = "fout"; this.fout = e.message; return false; }
    },
    // Volgt de bestellingen: is het AH-mandje gevuld (data/mandje.json) en wat is er bij AH besteld
    // (data/ah-bestellingen.json, ook bestellingen die je zelf in de AH-app deed). Beide schrijft de desktop-taak.
    async bestellingen() {
      let veranderd = false;
      const lees = async (pad) => { try { const r = await fetch(pad, { cache: "no-store" }); return r.ok ? await r.json() : null; } catch { return null; } };
      const [m, ah] = await Promise.all([lees("data/mandje.json"), lees("data/ah-bestellingen.json")]);
      if (m?.status === "gevuld") {
        const b = state.bestellingen.find((x) => x.klaarOp === m.klaarOp);
        if (b && b.status === "verstuurd") { b.status = "gevuld"; b.mandje = m; veranderd = true; toast("Je AH-mandje is gevuld. Rond de bestelling af bij AH."); }
        for (const k of m.keuzes || []) leerProduct(k);
      } else if (m?.status === "mislukt") {
        // De taak kon het mandje niet vullen (geen browser, niet ingelogd bij AH). Laat dat zien; de volgende ronde probeert hij opnieuw.
        const b = state.bestellingen.find((x) => x.klaarOp === m.klaarOp && x.status === "verstuurd");
        if (b && JSON.stringify(b.probleem) !== JSON.stringify({ reden: m.reden, op: m.op })) { b.probleem = { reden: m.reden, op: m.op }; veranderd = true; }
      }
      if (ah?.bestellingen) {
        state.ah = { bijgewerkt: ah.bijgewerkt, bestellingen: ah.bestellingen.slice(0, 8) };
        for (const o of ah.bestellingen) {
          const links = [].concat(o.klaarOps || [], o.klaarOp || []);
          let eigen = state.bestellingen.filter((b) => links.includes(b.klaarOp) || (o.nummer && b.ah?.nummer === o.nummer));
          if (!eigen.length) {
            // Zelf besteld in de AH-app: neem hem op, zodat de lijst niet opnieuw volloopt en hij straks de voorraad in kan.
            if (!o.nummer || !o.geplaatstOp || (Date.now() - new Date(o.geplaatstOp)) > 14 * 864e5) continue;
            const b = { id: uid(), week: null, klaarOp: null, bron: "ah-app", items: o.items || [], status: "besteld", ah: o };
            state.bestellingen.push(b); eigen = [b]; veranderd = true;
            toast(`Bestelling bij AH gezien${o.bezorgmoment?.van ? `, bezorging ${fmtMoment(o.bezorgmoment)}` : ""}.`);
          }
          for (const b of eigen) {
            if (b.status === "binnen" || JSON.stringify(b.ah) === JSON.stringify(o)) continue;
            const eerst = b.status !== "besteld";
            b.ah = o; b.status = "besteld"; veranderd = true;
            if (eerst) toast(`Besteld bij AH${o.bezorgmoment?.van ? `, bezorging ${fmtMoment(o.bezorgmoment)}` : ""}.`);
          }
        }
      }
      if (verloopOud()) veranderd = true;
      if (veranderd) { bewaar(); render(); }
      return veranderd;
    },
    duw() { /* tablet schrijft niet terug naar de repo */ }
  };

  // ---------- Claude: gerechtideeën ----------
  // De tablet vraagt Claude rechtstreeks om voorstellen. De API-sleutel blijft op deze tablet.
  // Geen SDK: de app heeft geen bouwstap, dus een gewone fetch naar de Messages API.
  const CLAUDE_SLEUTEL = "keukenbord.claudesleutel";
  const EENHEID_ENUM = ["g", "kg", "ml", "l", "stuks", "blik", "pak", "zak", "pot", "fles", "bos"];
  const GERECHT_SCHEMA = {
    type: "object", additionalProperties: false, required: ["gerechten"],
    properties: { gerechten: { type: "array", items: {
      type: "object", additionalProperties: false,
      required: ["gerecht", "waarom", "tijd", "kosten", "porties", "bonus", "kindertip", "ingredienten", "benodigdheden", "voorbereiding", "stappen"],
      properties: {
        gerecht: { type: "string" }, waarom: { type: "string" }, tijd: { type: "integer" }, kosten: { type: "number" }, porties: { type: "integer" },
        bonus: { type: "array", items: { type: "string" } }, kindertip: { type: "string" },
        ingredienten: { type: "array", items: { type: "object", additionalProperties: false, required: ["naam", "hoeveelheid", "eenheid"],
          properties: { naam: { type: "string" }, hoeveelheid: { type: "number" }, eenheid: { type: "string", enum: EENHEID_ENUM } } } },
        benodigdheden: { type: "array", items: { type: "string" } },
        voorbereiding: { type: "array", items: { type: "string" } },
        stappen: { type: "array", items: { type: "string" } }
      } } } }
  };
  const PRODUCT_SCHEMA = {
    type: "object", additionalProperties: false, required: ["opties"],
    properties: { opties: { type: "array", items: {
      type: "object", additionalProperties: false, required: ["product", "hoeveelheid", "eenheid", "categorie", "toelichting"],
      properties: { product: { type: "string" }, hoeveelheid: { type: "number" }, eenheid: { type: "string", enum: EENHEID_ENUM },
        categorie: { type: "string", enum: WINKEL_VOLGORDE }, toelichting: { type: "string" } } } } }
  };
  // Zo schrijft Claude recepten die je echt kunt volgen; ook gebruikt in docs/weekmenu-routine.md.
  const RECEPT_EISEN = `Schrijf elk recept zo dat iemand die niet vaak kookt het kan volgen:
- voorbereiding: wat je vooraf klaarzet en snijdt (met hoe: "ui in kleine blokjes", "paprika in reepjes").
- benodigdheden: pannen, ovenschaal, staafmixer en dergelijke.
- stappen: 6 tot 12 stappen in de goede volgorde. Noem in elke stap het vuur of de oventemperatuur, hoe lang (in minuten, bijvoorbeeld "8 minuten") en waaraan je ziet dat het goed is. Eén handeling per stap. Zet ingrediënten met hoeveelheid in de stap waar je ze gebruikt.
- Laatste stap: opdienen, met wat je voor de kleinsten anders doet.`;
  const claude = {
    sleutel() { try { return localStorage.getItem(CLAUDE_SLEUTEL) || ""; } catch { return ""; } },
    // Eén vraag aan Claude met een vast antwoordformaat (JSON volgens schema).
    async vraag(tekst, schema) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.sleutel(),
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-opus-5-5",
          max_tokens: 12000,
          output_config: { effort: "low", format: { type: "json_schema", schema } },
          messages: [{ role: "user", content: tekst }]
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) throw new Error("de Claude-sleutel klopt niet");
        if (res.status === 429) throw new Error("Claude is even te druk, probeer het zo opnieuw");
        throw new Error(data?.error?.message || `server gaf ${res.status}`);
      }
      if (data.stop_reason === "refusal") throw new Error("Claude wilde dit niet uitwerken");
      if (data.stop_reason === "max_tokens") throw new Error("het antwoord werd te lang");
      return JSON.parse((data.content || []).filter((b) => b.type === "text").map((b) => b.text).join(""));
    },
    async ideeen(idee, dag, menu) {
      const anderen = menu.dagen.filter((x) => x !== dag && !x.geschrapt).map((x) => `${dagNaam(x.datum)}: ${x.gerecht}`).join("; ");
      const bonus = [...new Set(menu.dagen.flatMap((x) => x.bonus || []))].join(", ");
      const voorraad = state.voorraad.items.filter((v) => v.hoeveelheid > 0).map((v) => `${v.naam} (${v.hoeveelheid} ${v.eenheid})`).join(", ");
      const weekdag = parseISO(dag.datum).getDay() % 6 !== 0;
      const vraag = `Stel 3 avondgerechten voor ${dagNaam(dag.datum)} voor op basis van dit idee van het gezin: "${idee}".

${wensenTekst()}
Voordelig, boodschappen bij Albert Heijn.${weekdag ? ` Het is doordeweeks: maximaal ${state.wensen.maxTijd} minuten.` : ""}
Vervangt: ${dag.gerecht || "nog niets"}.
Andere avonden deze week (niet herhalen): ${anderen || "geen"}.
Bonusproducten in dit menu, gebruik ze waar het past: ${bonus || "onbekend"}.
In huis: ${voorraad || "onbekend"}.

Geef per gerecht in het Nederlands: naam, in één korte zin waarom het past bij het idee, bereidingstijd in minuten, geschatte kosten in euro voor het hele gezin, aantal porties, welke bonusproducten erin zitten, een tip voor de kleintjes en ingrediënten met hoeveelheid en eenheid (gebruik dezelfde namen als in de voorraad waar dat kan). Maak de 3 voorstellen echt verschillend.

${RECEPT_EISEN}`;
      return (await this.vraag(vraag, GERECHT_SCHEMA)).gerechten || [];
    },
    async productOpties(naam, gebruik) {
      const vraag = `Op de boodschappenlijst van een gezin staat "${naam}"${gebruik ? ` (${gebruik})` : ""}. Ze bestellen bij Albert Heijn.
${wensenTekst()}
Geef 5 gangbare, concrete varianten die bij AH te koop zijn, van voordelig (AH-huismerk) tot iets luxer, met een typische verpakkingsgrootte. Denk aan soort, vorm en smaak, bijvoorbeeld bij kaas: jong belegen plakken, geraspt, blok. Noem bij product de naam zoals AH hem ongeveer verkoopt. toelichting: één korte zin waarvoor het handig is. categorie: het schap waar het ligt.`;
      return (await this.vraag(vraag, PRODUCT_SCHEMA)).opties || [];
    }
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
  function weekBereik(m) {
    const d = (m?.dagen || []).map((x) => x.datum).sort();
    return d.length ? `${dagNaam(d[0]).slice(0, 2)} ${korteDatum(d[0])} – ${dagNaam(d[d.length - 1]).slice(0, 2)} ${korteDatum(d[d.length - 1])}` : "";
  }
  // Zoek in de voorraad: eerst exact, anders een algemenere naam ("aardappelen" voor "kruimige aardappelen"),
  // maar nooit een specifiekere ("geraspte kaas" is niet zomaar "kaas").
  function vindVoorraad(naam, eenheid, exact = false) {
    const n = norm(naam);
    const precies = state.voorraad.items.filter((v) => norm(v.naam) === n);
    const kandidaten = precies.length || exact ? precies : state.voorraad.items.filter((v) => new RegExp(`(^|\\s)${norm(v.naam).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`).test(n));
    const basis = naarBasis(0, eenheid)[1];
    return kandidaten.find((v) => v.eenheid === eenheid) || kandidaten.find((v) => naarBasis(0, v.eenheid)[1] === basis) || kandidaten[0] || null;
  }
  // Hoeveel er in huis is, in de basiseenheid van "eenheid" (0 als de eenheden niet te vergelijken zijn).
  function inHuis(naam, eenheid) {
    const v = vindVoorraad(naam, eenheid);
    if (!v) return 0;
    const [h, e] = naarBasis(v.hoeveelheid, v.eenheid);
    return e === naarBasis(0, eenheid)[1] ? h : 0;
  }
  function inHuisVoor(ing) {
    const heb = inHuis(ing.naam, ing.eenheid), nodig = naarBasis(ing.hoeveelheid, ing.eenheid)[0];
    return { status: heb >= nodig ? "ja" : heb > 0 ? "deels" : "nee" };
  }

  // ---------- Producten: welke kaas precies? ----------
  // Per artikel onthoudt de tablet welk AH-product jullie nemen. Kies je zelf, dan blijft dat zo;
  // anders onthoudt hij wat Claude bij AH koos (op basis van wat jullie eerder kochten).
  function product(naam) { return state.producten[norm(naam)] || null; }
  function leerProduct(k) {
    if (!k?.naam || !k.product) return;
    const cur = product(k.naam);
    if (cur?.bron === "jij") return;
    state.producten[norm(k.naam)] = { naam: k.naam, keuze: k.product, verpakking: k.verpakking || null, categorie: cur?.categorie || null, bron: "AH" };
  }
  function winkelGroep(it) {
    if (it.groep === "huishouden") return "Huishouden";
    if (it.groep === "school") return "Mee naar school";
    const p = product(it.naam); if (p?.categorie) return p.categorie;
    const v = vindVoorraad(it.naam, it.eenheid); const n = norm(it.naam);
    for (const [g, re] of WINKEL_HERKEN) if (re.test(n)) return g;
    if (v?.categorie === "Groente en fruit") return "Groente en fruit";
    return "Overig";
  }
  // "1× 400 g" als we de verpakking kennen, anders de hoeveelheid zelf.
  function inPakken(it) {
    const vp = product(it.naam)?.verpakking;
    if (vp?.hoeveelheid > 0) {
      const [h, e] = naarBasis(it.hoeveelheid, it.eenheid), [vh, ve] = naarBasis(vp.hoeveelheid, vp.eenheid);
      if (e === ve) { const n = Math.max(1, Math.ceil(h / vh - 0.05)); return { aantal: n, tekst: `${n}× ${fmtHoeveel(vp.hoeveelheid, vp.eenheid)}` }; }
    }
    return { aantal: null, tekst: fmtHoeveel(it.hoeveelheid, it.eenheid) };
  }

  // ---------- Bestellingen ----------
  // status: verstuurd → gevuld (in AH-mandje) → besteld → binnen. "verlopen" = nooit besteld.
  const LOPEND = ["verstuurd", "gevuld", "besteld"];
  function bestellingVoor(week) { return week ? state.bestellingen.find((b) => b.week === week && b.status !== "verlopen") : null; }
  function laatsteBestelling() { return [...state.bestellingen].reverse().find((b) => b.status !== "verlopen") || null; }
  // Lopende bestellingen, de belangrijkste eerst: binnen-vraag, dan afronden bij AH, dan de rest.
  function lopendeBestellingen() {
    const gewicht = (b) => isBezorgd(b) ? 0 : b.status === "gevuld" ? 1 : b.status === "verstuurd" ? 2 : 3;
    return state.bestellingen.filter((b) => LOPEND.includes(b.status)).sort((a, b) => gewicht(a) - gewicht(b));
  }
  function isBezorgd(b) { return b.status === "besteld" && (b.ah?.status === "bezorgd" || (b.ah?.bezorgmoment?.van && new Date() >= new Date(b.ah.bezorgmoment.van))); }
  function verloopOud() {
    let x = false;
    for (const b of state.bestellingen) {
      const oud = b.klaarOp && (Date.now() - new Date(b.klaarOp)) > 7 * 864e5;
      if ((b.status === "verstuurd" || b.status === "gevuld") && oud) { b.status = "verlopen"; x = true; }
    }
    if (state.bestellingen.length > 12) { state.bestellingen = state.bestellingen.slice(-12); x = true; }
    return x;
  }
  // Wat al besteld is maar nog niet binnen: telt mee alsof het er al is.
  function onderwegKaart() {
    const map = new Map();
    for (const b of state.bestellingen) {
      if (!LOPEND.includes(b.status)) continue;
      const mist = new Set((b.ah?.nietGeleverd || []).map((v) => norm(typeof v === "string" ? v : v.naam)));
      for (const it of (b.ah?.items?.length ? b.ah.items : b.items)) {
        if (mist.has(norm(it.naam))) continue;
        const [h, e] = naarBasis(it.hoeveelheid, it.eenheid);
        const k = norm(it.naam) + "|" + e;
        map.set(k, (map.get(k) || 0) + h);
      }
    }
    return map;
  }

  // Zet de bezorgde boodschappen in de voorraad, met de echte hoeveelheden van AH als die er zijn.
  function boekBinnen(b, overslaan = new Set()) {
    const backup = JSON.stringify({ voorraad: state.voorraad, vaste: state.vaste, bestellingen: state.bestellingen });
    const items = b.ah?.items?.length ? b.ah.items : b.items;
    const mist = new Set((b.ah?.nietGeleverd || []).map((v) => norm(typeof v === "string" ? v : v.naam)));
    let n = 0;
    for (let it of items) {
      if (overslaan.has(norm(it.naam)) || mist.has(norm(it.naam))) continue;
      const vast = state.vaste.items.find((x) => norm(x.naam) === norm(it.naam));
      if (it.groep === "huishouden" || vast) { if (vast) { vast.laatst = vandaagISO(); vast.opLijst = false; n++; } continue; }
      if (BASIS.has(norm(it.naam))) continue;
      // "2 stuks" kaas met een bekende verpakking van 400 g wordt 800 g in de voorraad.
      const vp = it.verpakking || product(it.naam)?.verpakking;
      if (it.eenheid === "stuks" && vp?.hoeveelheid > 0 && vp.eenheid !== "stuks") it = { ...it, hoeveelheid: it.hoeveelheid * vp.hoeveelheid, eenheid: vp.eenheid };
      const v = vindVoorraad(it.naam, it.eenheid, true);
      const [h, e] = naarBasis(Number(it.hoeveelheid) || 0, it.eenheid);
      if (v && naarBasis(0, v.eenheid)[1] === e) { v.hoeveelheid = +(v.hoeveelheid + vanBasis(h, v.eenheid)).toFixed(3); n++; continue; }
      state.voorraad.items.push({ id: uid(), naam: norm(it.naam), hoeveelheid: h, eenheid: e, categorie: plekVoor(winkelGroep(it)) });
      n++;
    }
    b.status = "binnen"; b.binnenOp = new Date().toISOString();
    bewaar(); render();
    toast(`${n} artikelen in de voorraad gezet.`, () => {
      const o = JSON.parse(backup);
      state.voorraad = o.voorraad; state.vaste = o.vaste; state.bestellingen = o.bestellingen; bewaar(); render();
    });
  }
  // Schap in de winkel → plek in huis.
  function plekVoor(groep) {
    return { "Groente en fruit": "Groente en fruit", "Vlees en vis": "Koelkast", "Kaas, zuivel en eieren": "Koelkast", "Brood en ontbijt": "Brood en ontbijt", "Diepvries": "Vriezer", "Mee naar school": "School", "Drinken": "Voorraadkast", "Voorraadkast": "Voorraadkast" }[groep] || "Overig";
  }

  function kook(datum) {
    const dag = dagVan(datum);
    if (!dag || dag.gekookt) return;
    const backup = JSON.stringify({ voorraad: state.voorraad, dag });
    const nietAfgeboekt = [];
    for (const ing of dag.ingredienten || []) {
      if (BASIS.has(norm(ing.naam))) continue;
      const v = vindVoorraad(ing.naam, ing.eenheid);
      const [h, e] = naarBasis(ing.hoeveelheid, ing.eenheid);
      if (!v || naarBasis(0, v.eenheid)[1] !== e) { nietAfgeboekt.push(ing.naam); continue; }
      v.hoeveelheid = Math.max(0, +(v.hoeveelheid - vanBasis(h, v.eenheid)).toFixed(3));
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
  // Nodig = menu (nog niet gekookt) + school + minimale voorraad. Daar gaat af wat in huis is en wat onderweg is.
  // Plus huishoudproducten die bijna op zijn en wat je zelf toevoegt.
  function berekenLijst() {
    const nodig = new Map();
    const voeg = (naam, h, e, groep, waarom) => {
      const [bh, be] = naarBasis(h, e);
      const k = norm(naam) + "|" + be;
      const x = nodig.get(k) || { naam: norm(naam), hoeveelheid: 0, eenheid: be, groep, waarom: [] };
      x.hoeveelheid += bh; if (waarom && !x.waarom.includes(waarom)) x.waarom.push(waarom);
      if (groep === "menu") x.groep = "menu";
      nodig.set(k, x);
    };
    const vandaag = vandaagISO();
    for (const d of bestelMenu().dagen) {
      if (d.geschrapt || d.gekookt || d.datum < vandaag) continue;
      for (const ing of d.ingredienten || []) if (!BASIS.has(norm(ing.naam))) voeg(ing.naam, ing.hoeveelheid, ing.eenheid, "menu", dagNaam(d.datum));
    }
    for (const kind of state.school.kinderen) for (const it of kind.items) voeg(it.naam, it.perDag * kind.dagen, it.eenheid, "school", kind.naam.replace(/\s*\(.*\)/, ""));
    for (const v of state.voorraad.items) if (v.min > 0) voeg(v.naam, v.min, v.eenheid, "basis", "altijd in huis");
    const onderweg = onderwegKaart();
    const koop = [], huis = [], weg = [];
    for (const [k, x] of nodig) {
      const heb = inHuis(x.naam, x.eenheid), komt = onderweg.get(k) || 0;
      const tekort = +(x.hoeveelheid - heb - komt).toFixed(3);
      const item = { ...x, nodig: x.hoeveelheid, heb, komt, sleutel: k };
      if (tekort > 0) koop.push({ ...item, hoeveelheid: tekort });
      else if (komt > 0 && heb < x.hoeveelheid) weg.push(item);
      else huis.push(item);
    }
    for (const v of state.vaste.items) {
      const op = v.opLijst || dagenTussen(v.laatst, vandaag) >= v.intervalDagen - 3;
      if (!op) continue;
      const k = norm(v.naam) + "|stuks";
      if (onderweg.has(k)) { weg.push({ naam: v.naam, eenheid: "stuks", nodig: v.aantal || 1, komt: onderweg.get(k), groep: "huishouden", sleutel: k, waarom: [] }); continue; }
      koop.push({ naam: v.naam, hoeveelheid: v.aantal || 1, eenheid: "stuks", groep: "huishouden", waarom: [v.opLijst ? "zelf op de lijst gezet" : resterend(v).toLowerCase()], sleutel: k, vastId: v.id });
    }
    for (const x of state.lijst.items) koop.push({ naam: x.naam, hoeveelheid: x.aantal, eenheid: x.eenheid || "stuks", groep: "eigen", waarom: ["zelf toegevoegd"], sleutel: "eigen|" + x.id, eigenId: x.id });
    for (const it of koop) it.schap = winkelGroep(it);
    koop.sort((a, b) => WINKEL_VOLGORDE.indexOf(a.schap) - WINKEL_VOLGORDE.indexOf(b.schap) || a.naam.localeCompare(b.naam));
    return { koop, huis, weg };
  }
  function resterend(v) {
    const over = v.intervalDagen - dagenTussen(v.laatst, vandaagISO());
    return over <= 0 ? "Waarschijnlijk op" : over === 1 ? "Nog ongeveer 1 dag" : `Nog ongeveer ${over} dagen`;
  }
  function aantalTeKopen() { return berekenLijst().koop.length; }

  // ---------- Schermen ----------
  const views = {};

  // Korte melding bovenaan Vandaag over de boodschappen, alleen als er iets te doen is.
  function bestelMelding() {
    const b = lopendeBestellingen()[0];
    if (b && isBezorgd(b)) return `<div class="status-band"><div><b>Zijn de boodschappen binnen?</b><div class="sub">Zet ze met één tik in de voorraad.</div></div><button class="btn primair" data-goto="boodschappen">Naar boodschappen</button></div>`;
    if (b?.status === "gevuld") {
      const uiterlijk = bestelUiterlijk();
      const laat = uiterlijk && new Date() >= uiterlijk;
      return `<div class="status-band ${laat ? "let-op" : ""}"><div><b>${laat ? "Nog niet besteld bij AH" : "Je AH-mandje staat klaar"}</b><div class="sub">Kies een bezorgmoment en reken af bij AH.${laat ? " De eerste kookdag komt eraan." : ""}</div></div><a class="btn primair" href="https://www.ah.nl/mijnlijst" target="_blank" rel="noopener">Afronden bij AH</a></div>`;
    }
    const m = bestelMenu();
    if (m.dagen?.length && !m.voorbeeld && !bestellingVoor(m.week) && m === state.volgende) {
      return `<div class="status-band"><div><b>Het menu voor volgende week staat klaar</b><div class="sub">Pas aan wat je anders wilt en bestel dan de boodschappen.</div></div><button class="btn primair" data-act="naar-volgende">Bekijken</button></div>`;
    }
    return "";
  }

  // Tijd in een stap herkennen ("8 minuten", "10-12 min") voor een timer.
  function stapMinuten(t) { const m = String(t).match(/(\d+)(?:\s*(?:-|–|tot)\s*(\d+))?\s*min/i); return m ? +(m[2] || m[1]) : 0; }

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
    const kop = `${bestelMelding()}<div class="kop"><div><div class="eyebrow">${esc(cap(dagNaam(iso)))} ${esc(korteDatum(iso))}</div><h1>${esc(titel)}</h1></div>${nav}</div>`;
    if (!dag) {
      return kop + `<div class="paneel leeg"><h2>Nog geen gerecht voor deze dag</h2>
        <p>Zodra het weekmenu klaarstaat zie je hier het recept van de dag.</p>
        <button class="btn primair" data-goto="week">Naar het weekmenu</button></div>`;
    }
    if (dag.geschrapt) {
      return kop + `<div class="paneel leeg"><h2>Geen kookavond</h2><p>Deze dag is uit het menu gehaald. Restjes of uit eten?</p>
        <button class="btn" data-act="herstel" data-datum="${dag.datum}">Gerecht terugzetten</button></div>`;
    }
    const stapStatus = ui.stappen[dag.datum] || [];
    const eersteOpen = (dag.stappen || []).findIndex((_, i) => !stapStatus[i]);
    const ingr = (dag.ingredienten || []).map((ing) => {
      const st = BASIS.has(norm(ing.naam)) ? { status: "basis" } : inHuisVoor(ing);
      const chip = st.status === "basis" ? "" : st.status === "ja" ? '<span class="chip ok">In huis</span>' : st.status === "deels" ? '<span class="chip warn">Te weinig</span>' : '<span class="chip">Niet in huis</span>';
      return `<li><span class="hoeveel">${esc(fmtHoeveel(ing.hoeveelheid, ing.eenheid))}</span><span>${esc(ing.naam)}</span>${dag.gekookt ? "" : chip}</li>`;
    }).join("");
    const stappen = (dag.stappen || []).map((t, i) => {
      const min = stapMinuten(t);
      return `<li class="${stapStatus[i] ? "klaar" : ""} ${i === eersteOpen ? "actief" : ""}"><span data-act="stap" data-datum="${dag.datum}" data-i="${i}">${esc(t)}</span>${min ? `<button class="timer-knop" data-act="timer" data-min="${min}" data-label="${esc(dag.gerecht)}: stap ${i + 1}">⏱ ${min} min</button>` : ""}</li>`;
    }).join("");
    const lijstje = (titel, xs) => xs?.length ? `<section class="paneel"><h3>${titel}</h3><ul class="vink-lijst">${xs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section>` : "";
    const knoppen = dag.gekookt
      ? `<div><span class="chip ok" style="font-size:16px;padding:8px 14px">Gekookt · voorraad bijgewerkt</span></div>`
      : `<div class="btn-rij kook-knoppen"><button class="btn accent kook-knop" data-act="kookmodus" data-datum="${dag.datum}">Start met koken</button>
          <button class="btn klein" data-act="kook" data-datum="${dag.datum}">Al gekookt</button></div>`;
    return kop + `<div class="vandaag">
      <section class="gerecht-hero">
        <div>
          <div class="eyebrow">${dag.gekookt ? "Gekookt" : isVandaag ? "Vanavond" : "Op het menu"}${state.menu.voorbeeld ? ' · <span class="chip voorbeeld">Voorbeeld</span>' : ""}</div>
          <h2>${esc(dag.gerecht)}</h2>
          <div class="hero-feiten">${dag.nieuw ? '<span class="chip nieuw">Nieuw gerecht</span>' : ""}<span><b>${esc(dag.tijd)}</b> minuten</span><span><b>${esc(dag.porties || 4)}</b> porties</span><span>ca. <b>${euro(dag.kosten)}</b></span>${(dag.bonus || []).map((b) => `<span class="chip bonus">Bonus: ${esc(b)}</span>`).join("")}</div>
          ${dag.kindertip ? `<div class="kindertip"><b>Voor de kinderen:</b> ${esc(dag.kindertip)}</div>` : ""}
        </div>
        ${knoppen}
      </section>
      <section class="paneel"><h3>Ingrediënten</h3><ul class="ingr-lijst">${ingr}</ul>
        <p class="sub">Als je klaar bent met koken, gaan deze ingrediënten van de voorraad af.</p></section>
      ${lijstje("Pak alvast", dag.benodigdheden)}
      ${lijstje("Voorbereiden", dag.voorbereiding)}
      <section class="paneel recept-stappen"><h3>Zo maak je het</h3><ol class="stappen">${stappen}</ol>
        <p class="sub">Tik op een stap als die klaar is. Met ⏱ zet je een kookwekker.</p></section>
    </div>`;
  };

  // ---------- Kookmodus: één stap per scherm, groot, met kookwekker ----------
  function toonKookmodus() {
    const km = ui.kookmodus; const el = $("#kookmodus");
    if (!km) { el.hidden = true; el.innerHTML = ""; return; }
    const dag = dagVan(km.datum); if (!dag) { ui.kookmodus = null; return toonKookmodus(); }
    const stappen = [...(dag.voorbereiding?.length ? [`Voorbereiden: ${dag.voorbereiding.join(" · ")}`] : []), ...(dag.stappen || [])];
    const i = Math.min(km.i, stappen.length - 1), t = stappen[i] || "", min = stapMinuten(t);
    const laatste = i >= stappen.length - 1;
    el.hidden = false;
    el.innerHTML = `<div class="km-kop"><div><div class="eyebrow">${esc(dag.gerecht)}</div><div class="km-teller">Stap ${i + 1} van ${stappen.length}</div></div>
        <button class="btn klein" data-km="dicht">Sluiten</button></div>
      <div class="km-balk"><i style="width:${Math.round(((i + 1) / stappen.length) * 100)}%"></i></div>
      <div class="km-stap" key="${i}">${esc(t)}</div>
      ${min ? `<button class="btn klein km-timer" data-km="timer" data-min="${min}">⏱ Kookwekker ${min} minuten</button>` : ""}
      <details class="km-ingr"><summary>Ingrediënten</summary><ul>${(dag.ingredienten || []).map((x) => `<li><b>${esc(fmtHoeveel(x.hoeveelheid, x.eenheid))}</b> ${esc(x.naam)}</li>`).join("")}</ul></details>
      <div class="km-nav"><button class="btn groot" data-km="terug" ${i === 0 ? "disabled" : ""}>‹ Vorige</button>
        ${laatste ? `<button class="btn accent groot" data-km="klaar">Klaar, eet smakelijk</button>` : `<button class="btn primair groot" data-km="verder">Volgende ›</button>`}</div>`;
  }
  $("#kookmodus").addEventListener("click", (e) => {
    const k = e.target.closest("[data-km]")?.dataset.km; if (!k || !ui.kookmodus) return;
    const km = ui.kookmodus;
    if (k === "dicht") ui.kookmodus = null;
    if (k === "verder") km.i++;
    if (k === "terug") km.i = Math.max(0, km.i - 1);
    if (k === "timer") { const d = dagVan(km.datum); startTimer(+e.target.closest("[data-km]").dataset.min, `${d?.gerecht || "Koken"}: stap ${km.i + 1}`); }
    if (k === "klaar") { const d = km.datum; ui.kookmodus = null; toonKookmodus(); kook(d); return; }
    toonKookmodus();
  });

  // ---------- Kookwekkers ----------
  const timers = [];
  function startTimer(min, label) {
    timers.push({ id: uid(), label, eind: Date.now() + min * 60000 });
    toonTimers(); toast(`Kookwekker gezet: ${min} minuten.`);
  }
  function piep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.4, 0.8].forEach((t) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(0.3, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.3); });
    } catch {}
  }
  function toonTimers() {
    const el = $("#timers"); const nu = Date.now();
    el.hidden = !timers.length;
    el.innerHTML = timers.map((t) => {
      const over = Math.max(0, Math.round((t.eind - nu) / 1000));
      return `<div class="timer ${over === 0 ? "af" : ""}"><span class="t-label">${esc(t.label)}</span><span class="t-tijd">${over === 0 ? "Klaar!" : `${Math.floor(over / 60)}:${String(over % 60).padStart(2, "0")}`}</span><button data-timer="${t.id}" aria-label="Kookwekker weg">×</button></div>`;
    }).join("");
  }
  setInterval(() => {
    if (!timers.length) return;
    for (const t of timers) if (!t.gepiept && Date.now() >= t.eind) { t.gepiept = true; piep(); toast(`Kookwekker: ${t.label}`); }
    toonTimers();
  }, 1000);
  $("#timers").addEventListener("click", (e) => { const id = e.target.closest("[data-timer]")?.dataset.timer; if (!id) return; timers.splice(timers.findIndex((t) => t.id === id), 1); toonTimers(); });

  views.week = function () {
    if (!ui.week) ui.week = state.volgende?.dagen?.length ? "volgende" : "deze";
    const heeftVolgende = !!state.volgende?.dagen?.length;
    if (!heeftVolgende) ui.week = "deze";
    const m = ui.week === "volgende" ? state.volgende : state.menu;
    const tabs = heeftVolgende ? `<div class="btn-rij" role="tablist">
        <button class="btn klein ${ui.week === "deze" ? "primair" : ""}" data-act="weektab" data-week="deze" role="tab" aria-selected="${ui.week === "deze"}">Deze week</button>
        <button class="btn klein ${ui.week === "volgende" ? "primair" : ""}" data-act="weektab" data-week="volgende" role="tab" aria-selected="${ui.week === "volgende"}">Volgende week</button></div>` : "";
    if (!m.dagen.length) {
      return `<div class="kop"><div><div class="eyebrow">Weekmenu</div><h1>Nog geen weekmenu</h1></div></div>
        <div class="paneel leeg"><h2>Het weekmenu komt hier</h2><p>Elke donderdag zet Claude hier het menu voor volgende week klaar, op basis van de AH Bonus, jullie wensen en wat er in huis is.</p>
        <button class="btn" data-act="voorbeeld">Voorbeeldweek laden</button></div>`;
    }
    const totaal = m.dagen.filter((d) => !d.geschrapt).reduce((s, d) => s + (Number(d.kosten) || 0), 0);
    // Geen goedkeurknop: je past het menu aan zoals je wilt. Bestellen doe je bij Boodschappen.
    const b = bestellingVoor(m.week);
    const band = b
      ? `<div class="status-band akkoord"><div><b>${b.status === "binnen" ? "De boodschappen voor deze week zijn binnen." : b.status === "besteld" ? `Boodschappen besteld${b.ah?.bezorgmoment?.van ? `, bezorging ${esc(fmtMoment(b.ah.bezorgmoment))}` : ""}.` : "Boodschappen voor dit menu zijn onderweg naar je AH-mandje."}</b>
          <div class="sub">Pas je nog iets aan, dan komt alleen wat er extra nodig is op de boodschappenlijst.</div></div><button class="btn klein" data-goto="boodschappen">Naar boodschappen</button></div>`
      : bestelMenu() === m
        ? `<div class="status-band"><div><b>Tevreden met het menu?</b><div class="sub">Wissel of schrap wat je anders wilt. Daarna bestel je de boodschappen in één keer.</div></div><button class="btn primair" data-goto="boodschappen">Naar boodschappen</button></div>`
        : "";
    const vandaag = vandaagISO();
    const kaarten = m.dagen.map((d) => `
      <article class="dag ${d.datum === vandaag ? "vandaag-dag" : ""} ${d.geschrapt ? "geschrapt" : ""}">
        <div class="dag-kop"><span class="dag-naam">${esc(cap(dagNaam(d.datum)))}</span><span class="dag-datum">${esc(korteDatum(d.datum))}</span></div>
        <div class="dag-gerecht">${esc(d.gerecht)}</div>
        <div class="dag-meta"><span class="chip">${esc(d.tijd)} min</span><span class="chip">${euro(d.kosten)}</span>${d.nieuw ? '<span class="chip nieuw">Nieuw</span>' : ""}${(d.bonus || []).length ? `<span class="chip bonus">${d.bonus.length}× Bonus</span>` : ""}${d.gekookt ? '<span class="chip ok">Gekookt</span>' : ""}</div>
        <div class="dag-acties">
          <button class="btn klein" data-act="open-dag" data-datum="${d.datum}">Recept</button>
          ${d.gekookt ? "" : `<button class="btn klein" data-act="wissel" data-datum="${d.datum}">Ander gerecht</button>`}
          ${d.gekookt ? "" : d.geschrapt ? `<button class="btn klein" data-act="herstel" data-datum="${d.datum}">Terugzetten</button>` : `<button class="btn klein" data-act="schrap" data-datum="${d.datum}">Geen kookavond</button>`}
        </div>
      </article>`).join("");
    return `<div class="kop"><div><div class="eyebrow">Weekmenu ${esc(weekBereik(m))}${m.voorbeeld ? ' · <span class="chip voorbeeld">Voorbeeld</span>' : ""}</div><h1>${ui.week === "volgende" ? "Wat eten we volgende week?" : "Wat eten we deze week?"}</h1>
      <p class="sub">Geschat ${euro(totaal)} voor ${m.dagen.filter((d) => !d.geschrapt).length} avonden${m.bonusBesparing ? `, waarvan ${euro(m.bonusBesparing)} Bonusvoordeel` : ""}.</p></div>${tabs}</div>
      ${band}<div class="week-grid">${kaarten}</div>`;
  };

  // ---------- Boodschappen ----------
  const FASEN = ["Lijst", "In AH-mandje", "Besteld", "In de voorraad"];
  function faseVan(b) {
    if (!b || b.status === "verlopen") return 0;
    return { verstuurd: 1, gevuld: 1, besteld: isBezorgd(b) ? 3 : 2, binnen: 4 }[b.status] ?? 0;
  }
  function stappenBalk(fase) {
    return `<ol class="fasen">${FASEN.map((t, i) => `<li class="${i < fase ? "klaar" : i === fase ? "nu" : ""}"><span class="f-bol">${i < fase ? "✓" : i + 1}</span>${t}</li>`).join("")}</ol>`;
  }
  function wanneer(iso) { return new Date(iso).toLocaleString("nl-NL", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }); }

  // De kaart met de stand van de laatste bestelling.
  function bestelKaart(b) {
    if (!b) return "";
    const lijstje = (titel, xs) => xs?.length ? `<p class="sub"><b>${titel}:</b> ${xs.map(esc).join(", ")}</p>` : "";
    const aantal = (b.ah?.items?.length || b.items.length);
    if (b.status === "verstuurd") {
      const traag = (Date.now() - new Date(b.klaarOp)) > 2 * 36e5;
      const kop = b.probleem ? "Het AH-mandje is nog niet gevuld" : traag ? "Je AH-mandje is nog niet gevuld" : `Claude zet ${aantal} artikelen in je AH-mandje`;
      const uitleg = b.probleem
        ? `Laatste poging ${esc(wanneer(b.probleem.op))}: ${esc(b.probleem.reden || "onbekende fout")}. Zet de Claude-app op je computer aan en log in de ingebouwde browser in bij AH; het volgende uur probeert Claude het opnieuw.`
        : traag ? `Doorgestuurd op ${esc(wanneer(b.klaarOp))}, maar er is nog niets gebeurd. Staat je computer aan met de Claude-app open?`
        : `Doorgestuurd op ${esc(wanneer(b.klaarOp))}. Dat gebeurt binnen een uur, als de Claude-app op je computer aan staat.`;
      return `<div class="bestel-kaart ${b.probleem || traag ? "let-op" : ""}"><div><b>${kop}</b>
      <p class="sub">${uitleg}</p></div>
      <div class="btn-rij"><button class="btn klein" data-act="bestel-intrekken" data-id="${b.id}">Intrekken</button></div></div>`;
    }
    if (b.status === "gevuld") {
      const m = b.mandje || {};
      const uiterlijk = bestelUiterlijk(); const laat = uiterlijk && new Date() >= uiterlijk;
      const extra = [m.artikelen ? `${m.artikelen} artikelen` : "", m.totaal != null ? `ca. ${euro(m.totaal)}` : "", m.besparing ? `${euro(m.besparing)} Bonusvoordeel` : ""].filter(Boolean).join(" · ");
      return `<div class="bestel-kaart ${laat ? "let-op" : ""}"><div><b>${laat ? "Nog niet besteld!" : "Je AH-mandje is gevuld"}</b>
        <p class="sub">${esc(extra)}${extra ? ". " : ""}Kies een bezorgmoment en reken af bij AH. Zodra AH de bestelling heeft, zie je dat hier vanzelf.</p>
        ${lijstje("Vervangen", (m.vervangingen || []).map((v) => typeof v === "string" ? v : `${v.van} → ${v.naar}`))}
        ${lijstje("Niet gevonden", (m.nietGevonden || []).map((v) => typeof v === "string" ? v : v.naam))}</div>
        <div class="btn-rij"><a class="btn accent groot" href="https://www.ah.nl/mijnlijst" target="_blank" rel="noopener">Bestelling afronden bij AH</a>
          <button class="btn klein" data-act="binnen-kies" data-id="${b.id}">Al bezorgd?</button></div></div>`;
    }
    if (b.status === "besteld") {
      const o = b.ah || {};
      const mist = (o.nietGeleverd || []).map((v) => typeof v === "string" ? v : v.naam);
      const bron = b.bron === "ah-app" ? "Zelf besteld in de AH-app" : "Besteld bij AH";
      if (isBezorgd(b)) return `<div class="bestel-kaart"><div><b>Zijn de boodschappen binnen?</b>
        <p class="sub">${o.status === "bezorgd" ? "AH meldt dat de bestelling is bezorgd." : `Bezorging was ${esc(fmtMoment(o.bezorgmoment))}.`} Eén tik en alles staat in de voorraad.</p>
        ${lijstje("Niet geleverd volgens AH", mist)}</div>
        <div class="btn-rij"><button class="btn accent groot" data-act="binnen-alles" data-id="${b.id}">Ja, alles in de voorraad</button>
          <button class="btn klein" data-act="binnen-kies" data-id="${b.id}">Er ontbrak iets</button></div></div>`;
      return `<div class="bestel-kaart"><div><b>${bron}</b>
        <p class="sub">${o.bezorgmoment?.van ? `Bezorging ${esc(fmtMoment(o.bezorgmoment))}.` : "Bezorgmoment nog onbekend."}${o.totaal ? ` Totaal ${euro(o.totaal)}.` : ""} ${aantal} ${aantal === 1 ? "artikel" : "artikelen"}. Die tellen nu als "onderweg", dus ze komen niet nog een keer op de lijst.</p></div>
        <div class="btn-rij"><a class="btn klein" href="https://www.ah.nl/mijn/bestellingen" target="_blank" rel="noopener">Bekijk bij AH</a></div></div>`;
    }
    if (b.status === "binnen") return `<div class="bestel-kaart klaar"><div><b>Laatste boodschappen staan in de voorraad</b>
      <p class="sub">Binnen op ${esc(wanneer(b.binnenOp))}.</p></div></div>`;
    return "";
  }

  views.boodschappen = function () {
    const l = berekenLijst(); ui.lijst = l.koop;
    const lopende = lopendeBestellingen();
    const lopend = lopende.length > 0;
    const laatste = laatsteBestelling();
    const b = lopende[0] || (laatste?.status === "binnen" ? laatste : null);
    const m = bestelMenu();
    // Rijen per schap
    let huidig = "", rijen = "";
    l.koop.forEach((x, i) => {
      if (x.schap !== huidig) { huidig = x.schap; rijen += `<div class="schap">${esc(x.schap)}</div>`; }
      const p = product(x.naam), pk = inPakken(x);
      const extra = [x.waarom.length ? (x.groep === "menu" ? "voor " : "") + x.waarom.join(", ") : "", x.heb > 0 ? `je hebt ${fmtHoeveel(x.heb, x.eenheid)}` : ""].filter(Boolean).join(" · ");
      const keuze = p?.keuze ? `<span class="li-product">${esc(p.keuze)}${p.bron === "AH" ? " · vorige keer" : ""}</span>` : `<span class="li-product kies">Claude kiest bij AH · tik om zelf te kiezen</span>`;
      rijen += `<div class="lijst-item"><button class="li-hoofd" data-act="product" data-i="${i}"><span class="li-naam">${esc(cap(x.naam))}</span>${keuze}<span class="waarom">${esc(extra)}</span></button>
        ${x.eigenId ? `<span class="stepper"><button data-act="eigen-min" data-id="${x.eigenId}" aria-label="Minder">−</button><span class="waarde">${esc(x.hoeveelheid)}</span><button data-act="eigen-plus" data-id="${x.eigenId}" aria-label="Meer">+</button></span>`
          : `<span class="aantal">${esc(pk.tekst)}</span><button class="btn klein heb-al" data-act="heb-al" data-i="${i}">Heb ik nog</button>`}</div>`;
    });
    const huisRegels = l.huis.map((x) => `<div class="lijst-item rustig"><span>${esc(cap(x.naam))}</span><span class="aantal">${esc(fmtHoeveel(x.nodig, x.eenheid))}</span><span class="waarom">in huis: ${esc(fmtHoeveel(x.heb, x.eenheid))}</span></div>`).join("");
    const wegRegels = l.weg.map((x) => `<div class="lijst-item rustig"><span>${esc(cap(x.naam))}</span><span class="aantal">${esc(fmtHoeveel(x.komt, x.eenheid))}</span><span class="waarom">besteld, komt eraan</span></div>`).join("");
    const voor = m.dagen?.length ? `het menu van ${esc(weekBereik(m))}` : "deze week";
    const titel = l.koop.length ? `${l.koop.length} ${l.koop.length === 1 ? "artikel" : "artikelen"} nodig` : "Niets nodig";
    const geschiedenis = (state.ah?.bestellingen || []).slice(0, 4).map((o) => `<div class="lijst-item rustig"><span>${o.geplaatstOp ? esc(wanneer(o.geplaatstOp)) : "Bestelling"}</span><span class="aantal">${o.totaal ? euro(o.totaal) : ""}</span>
      <span class="waarom">${o.status === "bezorgd" ? "bezorgd" : "besteld"}${o.bezorgmoment?.van ? ` · bezorging ${esc(fmtMoment(o.bezorgmoment))}` : ""}${o.items?.length ? ` · ${o.items.length} artikelen` : ""}</span></div>`).join("");
    return `<div class="kop"><div><div class="eyebrow">Boodschappen</div><h1>${titel}</h1>
      <p class="sub">Voor ${voor}, school en huishouden. Wat in huis is of al besteld is, staat er niet op.</p></div>
      <button class="btn" data-act="kopieer">Lijst kopiëren</button></div>
      ${stappenBalk(lopend || (b && !l.koop.length) ? faseVan(b) : 0)}
      ${lopend ? lopende.map(bestelKaart).join("") : bestelKaart(b)}
      ${l.koop.length ? `<section class="paneel lijst-paneel">${rijen}</section>` : `<div class="paneel leeg"><h2>${lopend ? "Alles is besteld" : "Alles is in huis"}</h2><p>${lopend ? "Wat je nu nog toevoegt, komt in een extra bestelling." : "Voeg hieronder iets toe als je toch iets nodig hebt."}</p></div>`}
      <form class="btn-rij toevoegen" data-form="eigen"><input class="zoek" style="flex:1;min-width:0" id="eigen-naam" placeholder="Iets toevoegen, bijv. pindakaas" autocomplete="off" aria-label="Artikel toevoegen"><button class="btn primair">Toevoegen</button></form>
      <div class="inklap">
        ${wegRegels ? `<details><summary>Onderweg (${l.weg.length})</summary><div class="paneel">${wegRegels}</div></details>` : ""}
        ${huisRegels ? `<details><summary>Al in huis (${l.huis.length})</summary><div class="paneel">${huisRegels}</div></details>` : ""}
        ${geschiedenis ? `<details><summary>Laatste bestellingen bij AH</summary><div class="paneel">${geschiedenis}<p class="sub">Bijgewerkt ${state.ah?.bijgewerkt ? esc(wanneer(state.ah.bijgewerkt)) : "onbekend"}.</p></div></details>` : ""}
      </div>
      ${l.koop.length ? `<div class="klaar-band"><div><b>${lopend ? "Extra bestellen" : "Bestellen bij AH"}</b>
        <p class="sub">${gh.token() ? `Claude zet ${l.koop.length} artikelen in je AH-mandje. Afrekenen doe je zelf.` : "Stel eerst bij Instellingen, App een GitHub-sleutel in."}</p></div>
        <div class="btn-rij"><button class="btn accent groot" data-act="bestel" ${gh.token() ? "" : "disabled"}>${lopend ? "Ook bestellen" : "Bestellen"}</button></div></div>` : ""}`;
  };

  function fmtMoment(m) {
    if (!m?.van) return "";
    const van = new Date(m.van), tot = m.tot ? new Date(m.tot) : null;
    const tijd = (d) => d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
    return `${van.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })} ${tijd(van)}${tot ? `–${tijd(tot)}` : ""}`;
  }
  // Uiterlijk de dag vóór de eerste kookdag moet er besteld zijn.
  function bestelUiterlijk() {
    const eerste = bestelMenu()?.dagen?.find((d) => !d.geschrapt)?.datum;
    if (!eerste) return null;
    const d = parseISO(eerste); d.setDate(d.getDate() - 1); return d;
  }

  views.voorraad = function () {
    const q = norm(ui.zoek);
    const onderweg = onderwegKaart();
    const items = state.voorraad.items.filter((v) => !q || norm(v.naam).includes(q));
    const groepen = {};
    for (const v of items) (groepen[v.categorie || "Overig"] ||= []).push(v);
    const html = Object.keys(groepen).sort().map((g) => `<div class="groep-kop"><h2>${esc(g)}</h2><span class="tel">${groepen[g].length}</span></div>
      <div class="rij-lijst">${groepen[g].sort((a, b) => a.naam.localeCompare(b.naam)).map((v) => {
        const [, be] = naarBasis(0, v.eenheid); const komt = onderweg.get(norm(v.naam) + "|" + be) || 0;
        const p = product(v.naam);
        const sub = [v.hoeveelheid <= 0 ? '<span class="chip warn">Op</span>' : v.min > 0 && v.hoeveelheid < v.min ? '<span class="chip warn">Bijna op</span>' : "",
          komt ? `<span class="chip bonus">+${esc(fmtHoeveel(komt, be))} onderweg</span>` : "",
          v.min > 0 ? `altijd minstens ${esc(fmtHoeveel(v.min, v.eenheid))}` : "", p?.keuze ? esc(p.keuze) : ""].filter(Boolean).join(" · ");
        return `<div class="rij"><button class="rij-knop" data-act="voorraad-bewerk" data-id="${v.id}"><div class="rij-naam">${esc(cap(v.naam))}</div>
          <div class="rij-sub">${sub || "Tik om aan te passen"}</div></button>
          <div class="stepper"><button data-act="v-min" data-id="${v.id}" aria-label="Minder ${esc(v.naam)}">−</button><span class="waarde">${esc(fmtHoeveel(v.hoeveelheid, v.eenheid))}</span><button data-act="v-plus" data-id="${v.id}" aria-label="Meer ${esc(v.naam)}">+</button></div></div>`;
      }).join("")}</div>`).join("");
    return `<div class="kop"><div><div class="eyebrow">Voorraad</div><h1>Wat hebben we in huis?</h1><p class="sub">Gaat omhoog als boodschappen binnen zijn en omlaag als je kookt. Zet bij producten die altijd in huis moeten een minimum, dan komen ze vanzelf op de lijst.</p></div>
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
  let vorigeView = null, binnenTimer = null;
  function plaatsIndicator() {
    const knop = document.querySelector(`.rail-btn[data-view="${ui.view}"]`);
    const ind = $("#rail-indicator"); if (!knop || !ind) return;
    const smal = getComputedStyle(document.querySelector(".rail")).flexDirection === "row";
    if (smal) { ind.style.width = knop.offsetWidth + "px"; ind.style.height = knop.offsetHeight + "px"; ind.style.transform = `translateX(${knop.offsetLeft}px)`; }
    else { ind.style.width = ""; ind.style.height = knop.offsetHeight + "px"; ind.style.transform = `translateY(${knop.offsetTop}px)`; }
  }
  window.addEventListener("resize", () => plaatsIndicator());
  function render() {
    const main = $("#main");
    const scroll = main.scrollTop;
    main.innerHTML = views[ui.view]();
    main.scrollTop = scroll;
    if (ui.view !== vorigeView) {
      vorigeView = ui.view;
      main.classList.remove("binnen"); void main.offsetWidth; main.classList.add("binnen");
      clearTimeout(binnenTimer); binnenTimer = setTimeout(() => main.classList.remove("binnen"), 900);
      requestAnimationFrame(plaatsIndicator);
    }
    document.querySelectorAll(".rail-btn[data-view]").forEach((b) => b.toggleAttribute("aria-current", b.dataset.view === ui.view) || (b.dataset.view === ui.view && b.setAttribute("aria-current", "page")));
    const n = aantalTeKopen();
    const bl = $("#badge-lijst"); bl.hidden = !n; bl.textContent = n;
    const due = berekenLijst().koop.filter((x) => x.groep === "huishouden").length;
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
    kookmodus(el) { ui.kookmodus = { datum: el.dataset.datum, i: 0 }; toonKookmodus(); },
    timer(el) { startTimer(+el.dataset.min, el.dataset.label); },
    weektab(el) { ui.week = el.dataset.week; render(); },
    "inst-tab"(el) { ui.instTab = el.dataset.tab; render(); },
    async "nu-controleren"() { const nieuw = await sync.haal(); render(); if (!nieuw) toast(sync.status === "aan" ? "Er is nog geen nieuw weekmenu." : `Controleren lukte niet: ${sync.fout}.`); },
    "wis-claude"() { try { localStorage.removeItem(CLAUDE_SLEUTEL); } catch {} render(); toast("Claude-sleutel gewist."); },
    "wis-token"() { try { localStorage.removeItem(GH_SLEUTEL); } catch {} render(); toast("GitHub-sleutel gewist."); },
    volscherm() {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      else document.documentElement.requestFullscreen?.().catch(() => toast("Volledig scherm is hier niet beschikbaar."));
    },
    schrap(el) { const d = dagVan(el.dataset.datum); d.geschrapt = true; menuGewijzigd(d.datum); bewaar(); render(); toast(`${cap(dagNaam(d.datum))}: geen kookavond.`, () => { d.geschrapt = false; bewaar(); render(); }); },
    herstel(el) { dagVan(el.dataset.datum).geschrapt = false; menuGewijzigd(el.dataset.datum); bewaar(); render(); },
    wissel(el) {
      const d = dagVan(el.dataset.datum);
      const mm = menuVan(d.datum);
      const inMenu = new Set(mm.dagen.map((x) => norm(x.gerecht)));
      const opties = state.recepten.filter((r) => !inMenu.has(norm(r.gerecht)));
      const rij = (r, i, soort) => `<button class="rij" style="text-align:left" data-${soort}="${i}"><div><div class="rij-naam">${esc(r.gerecht)}</div><div class="rij-sub">${esc(r.tijd)} min · ${euro(r.kosten)}${r.waarom ? ` · ${esc(r.waarom)}` : ""}</div></div><span class="chip">Kies</span></button>`;
      const heeftSleutel = !!claude.sleutel();
      sheet(`Ander gerecht voor ${dagNaam(d.datum)}`, `
        <form class="idee-balk" data-idee>
          <input class="zoek" name="idee" autocomplete="off" placeholder="Waar heb je zin in? Bijv. iets met zalm, of snel en Mexicaans" aria-label="Jouw idee">
          <button class="btn accent">Vraag Claude</button>
        </form>
        ${heeftSleutel ? "" : '<p class="sub">Stel eerst bij Instellingen, App een Claude-sleutel in om ideeën te laten uitwerken.</p>'}
        <div class="idee-uit" aria-live="polite"></div>
        ${opties.length ? `<h3 class="sectie-titel" style="margin-top:18px">Of kies een bewaard recept</h3><div class="rij-lijst">${opties.map((r, i) => rij(r, i, "kies")).join("")}</div>` : ""}
        <div class="btn-rij" style="margin-top:14px"><button class="btn" data-act="sluit">Annuleren</button></div>`, (root) => {
        const vervang = (r, bewaard) => {
          const oud = { ...d };
          const i = mm.dagen.indexOf(d);
          if (bewaard) state.recepten = state.recepten.filter((x) => x !== r);
          if (!state.recepten.some((x) => norm(x.gerecht) === norm(oud.gerecht)))
            state.recepten.push({ gerecht: oud.gerecht, tijd: oud.tijd, kosten: oud.kosten, porties: oud.porties, bonus: oud.bonus, kindertip: oud.kindertip, ingredienten: oud.ingredienten, benodigdheden: oud.benodigdheden, voorbereiding: oud.voorbereiding, stappen: oud.stappen });
          const { waarom, ...rest } = r;
          mm.dagen[i] = { ...JSON.parse(JSON.stringify(rest)), datum: d.datum, geschrapt: false, gekookt: false };
          const al = menuGewijzigd(d.datum);
          bewaar(); sluitSheet(); render();
          toast(`${cap(dagNaam(d.datum))}: ${r.gerecht}.${al ? " De boodschappen waren al besteld; wat er extra nodig is, staat op de lijst." : ""}`);
        };
        root.querySelectorAll("[data-kies]").forEach((b) => b.addEventListener("click", () => vervang(opties[+b.dataset.kies], true)));
        const uit = root.querySelector(".idee-uit");
        root.querySelector("[data-idee]").addEventListener("submit", async (e) => {
          e.preventDefault();
          const f = e.currentTarget, idee = f.idee.value.trim();
          if (!idee) { f.idee.focus(); return; }
          if (!claude.sleutel()) { uit.innerHTML = '<p class="sub">Er is nog geen Claude-sleutel. Zet die bij Instellingen, App.</p>'; return; }
          const knop = f.querySelector("button"); knop.disabled = true; knop.textContent = "Claude denkt na…";
          uit.innerHTML = '<div class="idee-laden"><span></span><span></span><span></span></div>';
          try {
            const voorstellen = await claude.ideeen(idee, d, mm);
            if (!root.isConnected) return;
            uit.innerHTML = voorstellen.length ? `<div class="rij-lijst">${voorstellen.map((r, i) => rij(r, i, "nieuw")).join("")}</div>` : '<p class="sub">Claude had geen voorstel. Probeer het anders te omschrijven.</p>';
            uit.querySelectorAll("[data-nieuw]").forEach((b) => b.addEventListener("click", () => vervang(voorstellen[+b.dataset.nieuw], false)));
          } catch (err) {
            uit.innerHTML = `<p class="sub">Dat lukte niet: ${esc(err.message)}.</p>`;
          } finally { knop.disabled = false; knop.textContent = "Vraag Claude"; }
        });
      });
    },
    async voorbeeld() { const v = await laadVoorbeeld(); state = compleet({ ...state, menu: v.menu, recepten: v.recepten }); bewaar(); render(); },
    kopieer() {
      const l = berekenLijst();
      const tekst = "Boodschappen\n" + l.koop.map((x) => `- ${cap(x.naam)}: ${inPakken(x).tekst}${product(x.naam)?.keuze ? ` (${product(x.naam).keuze})` : ""}`).join("\n");
      navigator.clipboard?.writeText(tekst).then(() => toast("Lijst gekopieerd."), () => toast("Kopiëren lukte niet op dit apparaat."));
    },
    // Eén knop: de lijst gaat naar Claude, die hem in je AH-mandje zet. Wat besteld is, telt daarna als onderweg.
    async bestel() {
      const l = berekenLijst();
      if (!l.koop.length) { toast("Er staat niets op de lijst."); return; }
      if (!gh.token()) { toast("Stel eerst bij Instellingen, App een GitHub-sleutel in."); return; }
      const items = l.koop.map((x) => ({ naam: x.naam, hoeveelheid: +x.hoeveelheid.toFixed(3), eenheid: x.eenheid, groep: x.groep, schap: x.schap,
        product: product(x.naam)?.keuze || null, verpakking: product(x.naam)?.verpakking || null, voor: x.waarom.join(", ") }));
      // Nog niet in het mandje? Dan voegen we samen tot één opdracht.
      const vorige = state.bestellingen.filter((b) => b.status === "verstuurd");
      for (const v of vorige) for (const it of v.items) if (!items.some((x) => norm(x.naam) === norm(it.naam))) items.push(it);
      const b = { id: uid(), week: bestelMenu().week || null, klaarOp: new Date().toISOString(), status: "verstuurd", items };
      const backup = JSON.stringify({ bestellingen: state.bestellingen, lijst: state.lijst });
      for (const v of vorige) v.status = "verlopen";
      state.bestellingen.push(b);
      state.lijst.items = [];
      for (const v of state.vaste.items) if (items.some((x) => norm(x.naam) === norm(v.naam))) v.opLijst = false;
      bewaar(); render(); toast("Wordt doorgestuurd…");
      try {
        await stuurDoor(b);
        toast("Doorgestuurd. Claude zet de boodschappen binnen een uur in je AH-mandje.");
      } catch (e) {
        const o = JSON.parse(backup); state.bestellingen = o.bestellingen; state.lijst = o.lijst; bewaar(); render();
        toast(`Doorsturen lukte niet: ${e.message}. Er is niets veranderd.`);
      }
    },
    "bestel-intrekken"(el) {
      const b = state.bestellingen.find((x) => x.id === el.dataset.id); if (!b) return;
      b.status = "verlopen"; bewaar(); render();
      toast("Ingetrokken. De artikelen staan weer op de lijst. Heeft Claude het mandje al gevuld, haal ze dan zelf weg bij AH.");
    },
    "binnen-alles"(el) { const b = state.bestellingen.find((x) => x.id === el.dataset.id); if (b) boekBinnen(b); },
    "binnen-kies"(el) {
      const b = state.bestellingen.find((x) => x.id === el.dataset.id); if (!b) return;
      const items = b.ah?.items?.length ? b.ah.items : b.items;
      const mist = new Set((b.ah?.nietGeleverd || []).map((v) => norm(typeof v === "string" ? v : v.naam)));
      sheet("Wat is er binnengekomen?", `<p class="sub" style="margin-top:0">Haal het vinkje weg bij wat ontbrak.</p>
        <div class="rij-lijst">${items.map((it, i) => `<label class="rij" style="cursor:pointer"><div><div class="rij-naam">${esc(cap(it.naam))}</div><div class="rij-sub">${esc(fmtHoeveel(it.hoeveelheid, it.eenheid))}${it.product ? ` · ${esc(it.product)}` : ""}</div></div>
          <input type="checkbox" data-i="${i}" ${mist.has(norm(it.naam)) ? "" : "checked"} style="width:28px;height:28px"></label>`).join("")}</div>
        <div class="btn-rij" style="margin-top:14px"><button class="btn accent" data-binnen>In de voorraad</button><button class="btn" data-act="sluit">Annuleren</button></div>`, (root) => {
        root.querySelector("[data-binnen]").addEventListener("click", () => {
          const overslaan = new Set([...root.querySelectorAll("input[data-i]")].filter((c) => !c.checked).map((c) => norm(items[+c.dataset.i].naam)));
          sluitSheet(); boekBinnen(b, overslaan);
        });
      });
    },
    // "Heb ik nog": zet het in de voorraad, dan klopt de lijst en de voorraad meteen allebei.
    "heb-al"(el) {
      const x = ui.lijst?.[+el.dataset.i]; if (!x) return;
      const backup = JSON.stringify({ voorraad: state.voorraad, vaste: state.vaste });
      if (x.vastId) { const v = state.vaste.items.find((i) => i.id === x.vastId); v.laatst = vandaagISO(); v.opLijst = false; }
      else {
        const v = vindVoorraad(x.naam, x.eenheid, true);
        if (v && naarBasis(0, v.eenheid)[1] === x.eenheid) v.hoeveelheid = +(v.hoeveelheid + vanBasis(x.hoeveelheid, v.eenheid)).toFixed(3);
        else state.voorraad.items.push({ id: uid(), naam: x.naam, hoeveelheid: x.hoeveelheid, eenheid: x.eenheid, categorie: plekVoor(x.schap) });
      }
      bewaar(); render();
      toast(`${cap(x.naam)} staat nu in de voorraad.`, () => { const o = JSON.parse(backup); state.voorraad = o.voorraad; state.vaste = o.vaste; bewaar(); render(); });
    },
    product(el) { const x = ui.lijst?.[+el.dataset.i]; if (x) productSheet(x.naam, x); },
    "eigen-plus"(el) { const x = state.lijst.items.find((i) => i.id === el.dataset.id); x.aantal++; bewaar(); render(); },
    "eigen-min"(el) { const x = state.lijst.items.find((i) => i.id === el.dataset.id); x.aantal--; if (x.aantal <= 0) state.lijst.items = state.lijst.items.filter((i) => i !== x); bewaar(); render(); },
    "v-plus"(el) { const v = state.voorraad.items.find((i) => i.id === el.dataset.id); v.hoeveelheid = +(v.hoeveelheid + stapVoor(v.eenheid)).toFixed(3); bewaar(); render(); },
    "v-min"(el) { const v = state.voorraad.items.find((i) => i.id === el.dataset.id); v.hoeveelheid = Math.max(0, +(v.hoeveelheid - stapVoor(v.eenheid)).toFixed(3)); bewaar(); render(); },
    "voorraad-nieuw"() { voorraadSheet(null); },
    "voorraad-bewerk"(el) { voorraadSheet(state.voorraad.items.find((i) => i.id === el.dataset.id)); },
    "naar-volgende"() { ui.week = "volgende"; ga("week"); },
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
      const naam = norm($("#eigen-naam").value); if (!naam) return;
      const bestaand = state.lijst.items.find((i) => norm(i.naam) === naam);
      if (bestaand) bestaand.aantal++; else state.lijst.items.push({ id: uid(), naam, aantal: 1 });
      bewaar(); render(); $("#eigen-naam")?.focus();
      if (!product(naam)) toast(`${cap(naam)} staat op de lijst. Tik erop om te kiezen welke precies, of laat Claude kiezen bij AH.`);
    }
    if (f.dataset.form === "wensen") {
      const w = state.wensen;
      for (const k of ["gezin", "allergieen", "nietLekker", "wensen"]) w[k] = f[k].value.trim();
      w.nieuwPerWeek = +f.nieuwPerWeek.value; w.maxTijd = +f.maxTijd.value; w.budget = +f.budget.value || 0;
      w.bijgewerkt = new Date().toISOString(); w.verstuurd = false;
      bewaar(); render();
      if (!gh.token()) { toast("Wensen opgeslagen op de tablet. Stel een GitHub-sleutel in zodat Claude ze kan lezen."); return; }
      gh.schrijf("data/wensen.json", { ...w, verstuurd: undefined }, "Gezinswensen bijgewerkt vanaf de tablet")
        .then(() => { w.verstuurd = true; bewaar(); render(); toast("Wensen opgeslagen. Het volgende weekmenu houdt er rekening mee."); })
        .catch((err) => toast(`Opgeslagen op de tablet, doorsturen lukte niet: ${err.message}.`));
      return;
    }
    if (f.dataset.form === "claude") {
      const v = f.sleutel.value.trim();
      if (v) { try { localStorage.setItem(CLAUDE_SLEUTEL, v); } catch {} }
      render(); toast(v ? "Claude-sleutel opgeslagen." : "Niets gewijzigd.");
    }
    if (f.dataset.form === "token") {
      const v = f.token.value.trim();
      if (v) { try { localStorage.setItem(GH_SLEUTEL, v); } catch {} }
      render(); toast(v ? "GitHub-sleutel opgeslagen." : "Niets gewijzigd.");
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

  // Jij hebt het menu aangepast: de zaterdagcontrole overschrijft het dan niet meer.
  function menuGewijzigd(datum) { const m = menuVan(datum); m.aangepast = true; return !!bestellingVoor(m.week); }

  // ---------- Formulieren ----------
  const eenheidOpties = (sel) => EENHEDEN.map((e) => `<option ${e === sel ? "selected" : ""}>${e}</option>`).join("");
  const CATEGORIEEN = ["Groente en fruit", "Koelkast", "Vriezer", "Voorraadkast", "Brood en ontbijt", "School", "Overig"];
  function voorraadSheet(v) {
    const p = v ? product(v.naam) : null;
    sheet(v ? `${cap(v.naam)} aanpassen` : "Product toevoegen", `<form id="f-voorraad">
      <div class="veld"><label for="fv-naam">Naam</label><input id="fv-naam" name="naam" required value="${esc(v?.naam || "")}" placeholder="Bijv. kaas" autocomplete="off"></div>
      <div class="veld-rij"><div class="veld"><label for="fv-h">Hoeveel in huis</label><input id="fv-h" name="h" type="number" step="any" min="0" inputmode="decimal" value="${esc(v?.hoeveelheid ?? 1)}"></div>
        <div class="veld"><label for="fv-e">Eenheid</label><select id="fv-e" name="e">${eenheidOpties(v?.eenheid || "stuks")}</select></div></div>
      <div class="veld"><label for="fv-min">Altijd minstens in huis (leeg = nee)</label><input id="fv-min" name="min" type="number" step="any" min="0" inputmode="decimal" value="${esc(v?.min || "")}" placeholder="Bijv. 400 bij kaas in gram">
        <span class="sub">Zakt de voorraad hieronder, dan komt het vanzelf op de boodschappenlijst.</span></div>
      <div class="veld"><label for="fv-c">Plek</label><select id="fv-c" name="c">${CATEGORIEEN.map((c) => `<option ${c === (v?.categorie || "Voorraadkast") ? "selected" : ""}>${c}</option>`).join("")}</select></div>
      ${v ? `<div class="veld"><label>Welk product bij AH</label><div class="rij"><div><div class="rij-naam">${p?.keuze ? esc(p.keuze) : "Nog niet gekozen"}</div><div class="rij-sub">${p?.bron === "AH" ? "Zo besteld bij AH" : p ? "Zelf gekozen" : "Claude kiest bij AH op basis van wat jullie eerder kochten"}</div></div><button type="button" class="btn klein" id="fv-product">Kiezen</button></div></div>` : ""}
      <div class="btn-rij"><button class="btn primair">Opslaan</button><button type="button" class="btn" data-act="sluit">Annuleren</button>${v ? '<button type="button" class="btn" id="fv-weg" style="margin-left:auto">Verwijderen</button>' : ""}</div></form>`, (root) => {
      root.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault(); const f = e.target;
        const data = { naam: norm(f.naam.value), hoeveelheid: Number(f.h.value) || 0, eenheid: f.e.value, categorie: f.c.value, min: Number(f.min.value) || 0 };
        if (v) Object.assign(v, data); else state.voorraad.items.push({ id: uid(), ...data });
        bewaar(); sluitSheet(); render();
      });
      root.querySelector("#fv-product")?.addEventListener("click", () => productSheet(v.naam, { naam: v.naam, hoeveelheid: v.min || v.hoeveelheid, eenheid: v.eenheid }));
      root.querySelector("#fv-weg")?.addEventListener("click", () => { state.voorraad.items = state.voorraad.items.filter((i) => i !== v); bewaar(); sluitSheet(); render(); toast(`${cap(v.naam)} verwijderd.`); });
    });
  }

  // Welke kaas precies? Kies zelf, laat Claude opties geven, of laat Claude bij AH kiezen op basis van eerder gekocht.
  function productSheet(naam, x) {
    const p = product(naam) || {};
    const vp = p.verpakking || {};
    sheet(`Welke ${naam}?`, `<form id="f-product">
      <p class="sub" style="margin-top:0">Kies je niets, dan pakt Claude bij AH wat jullie eerder kochten en onthoudt de tablet dat.</p>
      <div class="veld"><label for="fp-keuze">Product</label><input id="fp-keuze" name="keuze" value="${esc(p.keuze || "")}" placeholder="Bijv. AH Jong belegen 48+ plakken" autocomplete="off"></div>
      <div class="veld-rij"><div class="veld"><label for="fp-h">Verpakking</label><input id="fp-h" name="h" type="number" step="any" min="0" inputmode="decimal" value="${esc(vp.hoeveelheid || "")}" placeholder="Bijv. 400"></div>
        <div class="veld"><label for="fp-e">Eenheid</label><select id="fp-e" name="e">${eenheidOpties(vp.eenheid || (x?.eenheid === "stuks" ? "stuks" : x?.eenheid) || "g")}</select></div></div>
      <div class="veld"><label for="fp-c">Schap</label><select id="fp-c" name="c">${WINKEL_VOLGORDE.filter((g) => g !== "Mee naar school" && g !== "Huishouden").map((g) => `<option ${g === (p.categorie || winkelGroep({ naam, eenheid: x?.eenheid })) ? "selected" : ""}>${g}</option>`).join("")}</select></div>
      ${claude.sleutel() ? `<button type="button" class="btn klein" id="fp-claude">Claude, geef opties</button>` : ""}
      <div class="product-opties" aria-live="polite"></div>
      <div class="btn-rij" style="margin-top:14px"><button class="btn primair">Onthouden</button>${p.keuze ? '<button type="button" class="btn" id="fp-wis">Laat Claude kiezen</button>' : ""}<button type="button" class="btn" data-act="sluit">Annuleren</button></div></form>`, (root) => {
      const f = root.querySelector("form");
      f.addEventListener("submit", (e) => {
        e.preventDefault();
        const keuze = f.keuze.value.trim();
        state.producten[norm(naam)] = { naam, keuze: keuze || null, verpakking: Number(f.h.value) > 0 ? { hoeveelheid: Number(f.h.value), eenheid: f.e.value } : null, categorie: f.c.value, bron: "jij" };
        bewaar(); sluitSheet(); render(); toast(keuze ? `Onthouden: ${keuze}.` : "Onthouden.");
      });
      root.querySelector("#fp-wis")?.addEventListener("click", () => { delete state.producten[norm(naam)]; bewaar(); sluitSheet(); render(); toast("Claude kiest dit bij AH."); });
      root.querySelector("#fp-claude")?.addEventListener("click", async (e) => {
        const knop = e.currentTarget, uit = root.querySelector(".product-opties");
        knop.disabled = true; uit.innerHTML = '<div class="idee-laden"><span></span><span></span><span></span></div>';
        try {
          const opties = await claude.productOpties(naam, x?.waarom?.length ? `voor ${x.waarom.join(", ")}` : "");
          uit.innerHTML = `<div class="snelkeuze">${opties.map((o, i) => `<button type="button" data-o="${i}"><b>${esc(o.product)}</b> · ${esc(fmtHoeveel(o.hoeveelheid, o.eenheid))}<br><span class="sub">${esc(o.toelichting)}</span></button>`).join("")}</div>`;
          uit.querySelectorAll("[data-o]").forEach((b) => b.addEventListener("click", () => {
            const o = opties[+b.dataset.o];
            f.keuze.value = o.product; f.h.value = o.hoeveelheid; f.e.value = o.eenheid; f.c.value = o.categorie;
            uit.querySelectorAll("[data-o]").forEach((x) => x.classList.toggle("gekozen", x === b));
          }));
        } catch (err) { uit.innerHTML = `<p class="sub">Dat lukte niet: ${esc(err.message)}.</p>`; }
        finally { knop.disabled = false; }
      });
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
  async function stuurDoor(b) {
    const m = bestelMenu();
    await gh.schrijf("data/bestelling.json", {
      week: b.week,
      klaarOp: b.klaarOp,
      status: "klaar",
      menu: (m.dagen || []).filter((d) => !d.geschrapt && !d.gekookt).map((d) => ({ datum: d.datum, gerecht: d.gerecht })),
      items: b.items
    }, `Bestelling ${b.week || ""} vanaf de tablet`.replace("  ", " "));
    await gh.schrijf("data/voorraad.json", {
      bijgewerkt: new Date().toISOString(),
      voorraad: state.voorraad.items.map(({ naam, hoeveelheid, eenheid, categorie, min }) => ({ naam, hoeveelheid, eenheid, categorie, min: min || 0 })),
      producten: Object.values(state.producten),
      vaste: state.vaste.items.map(({ naam, intervalDagen, laatst, aantal }) => ({ naam, intervalDagen, laatst, aantal })),
      school: state.school.kinderen.map(({ naam, dagen, items }) => ({ naam, dagen, items }))
    }, "Voorraad bijgewerkt vanaf de tablet");
  }

  // ---------- Instellingen ----------
  const INST_TABS = [["wensen", "Gezin en wensen"], ["huishouden", "Huishouden"], ["school", "School"], ["app", "App en verbinding"]];
  function alsSectie(html) {
    // Maak van de paginakop van een onderdeel een sectiekop binnen Instellingen.
    return html.replace(/<div class="eyebrow">[^<]*<\/div>/, "").replace("<h1>", '<h2 class="sectie-titel">').replace("</h1>", "</h2>").replace('<div class="kop">', '<div class="kop sectie">');
  }
  views.instellingen = function () {
    ui.instTab ||= "wensen";
    const tabs = `<div class="btn-rij" role="tablist" style="margin-bottom:8px">${INST_TABS.map(([k, t]) => `<button class="btn klein ${ui.instTab === k ? "primair" : ""}" data-act="inst-tab" data-tab="${k}" role="tab" aria-selected="${ui.instTab === k}">${t}</button>`).join("")}</div>`;
    const inhoud = ui.instTab === "school" ? alsSectie(views.school()) : ui.instTab === "app" ? appInstellingen() : ui.instTab === "wensen" ? wensenInstellingen() : alsSectie(views.huishouden());
    return `<div class="kop"><div><div class="eyebrow">Gezin, huishouden, school en app</div><h1>Instellingen</h1></div></div>${tabs}<div class="inst-inhoud" data-tab="${ui.instTab}">${inhoud}</div>`;
  };
  function wensenInstellingen() {
    const w = state.wensen;
    const veld = (naam, label, uitleg, voorbeeld) => `<div class="veld"><label for="fw-${naam}">${label}</label>
      <textarea id="fw-${naam}" name="${naam}" rows="2" placeholder="${esc(voorbeeld)}">${esc(w[naam])}</textarea>${uitleg ? `<span class="sub">${uitleg}</span>` : ""}</div>`;
    const keuze = (naam, label, opties, eenheid) => `<div class="veld"><label for="fw-${naam}">${label}</label>
      <select id="fw-${naam}" name="${naam}">${opties.map((o) => `<option value="${o}" ${+w[naam] === o ? "selected" : ""}>${o}${eenheid}</option>`).join("")}</select></div>`;
    return `<form data-form="wensen" class="twee-kol" style="margin-top:14px">
      <section class="paneel"><h3>Ons gezin</h3>
        <p class="sub" style="margin-top:0">Claude houdt hier rekening mee bij elk weekmenu en bij Ander gerecht.</p>
        ${veld("gezin", "Wie eten er mee", "", "Bijv. 2 volwassenen, kinderen van 9, 3 en 1")}
        ${veld("allergieen", "Allergieën en wat niet mag", "Hier houdt Claude zich altijd aan.", "Bijv. pinda, lactose, geen varkensvlees")}
        ${veld("nietLekker", "Lusten we niet", "", "Bijv. spruitjes, champignons")}
        ${veld("wensen", "Wensen", "", "Bijv. vaker vis, één avond vegetarisch, vrijdag iets feestelijks")}</section>
      <section class="paneel"><h3>Het menu</h3>
        ${keuze("nieuwPerWeek", "Nieuwe gerechten per week", [0, 1, 2, 3, 4], "")}
        <p class="sub" style="margin-top:-6px">Gerechten die jullie nog niet eerder op het menu hadden. Ze krijgen een label Nieuw.</p>
        ${keuze("maxTijd", "Doordeweeks maximaal koken", [20, 30, 35, 40, 50, 60], " minuten")}
        <div class="veld"><label for="fw-budget">Budget per week voor het avondeten</label>
          <input id="fw-budget" name="budget" type="number" min="0" step="5" inputmode="numeric" value="${esc(w.budget)}"></div>
        <div class="btn-rij"><button class="btn primair">Wensen opslaan</button></div>
        <p class="sub">${w.bijgewerkt ? `Laatst opgeslagen ${new Date(w.bijgewerkt).toLocaleString("nl-NL", { weekday: "long", hour: "2-digit", minute: "2-digit" })}${w.verstuurd ? ", Claude kan ze lezen" : ", nog niet doorgestuurd (geen GitHub-sleutel)"}.` : "Het volgende weekmenu gebruikt wat hier staat."}</p></section>
    </form>`;
  }
  function appInstellingen() {
    const status = sync.status === "aan" ? `Laatst gecontroleerd om ${sync.laatst.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}.` : sync.status === "fout" ? `Controleren lukte niet: ${esc(sync.fout)}.` : "Nog niet gecontroleerd.";
    const v = state.volgende;
    return `<div class="twee-kol" style="margin-top:14px">
      <section class="paneel"><h3>Weekmenu van Claude</h3>
        <p class="sub" style="margin-top:0">Claude zet elke donderdagochtend het menu voor volgende week klaar. De tablet kijkt elk half uur of het er is.</p>
        <p><b>${v?.dagen?.length ? `Volgende week (${esc(v.week)}) staat klaar${bestellingVoor(v.week) ? " en de boodschappen zijn besteld" : ""}.` : "Nog geen menu voor volgende week."}</b><br><span class="sub">${status}</span></p>
        <button class="btn primair" data-act="nu-controleren">Nu controleren</button></section>
      <section class="paneel"><h3>Doorsturen naar je AH-mandje</h3>
        <form data-form="token">
          <div class="veld"><label for="fi-token">GitHub-sleutel</label>
            <input id="fi-token" name="token" type="password" autocomplete="off" placeholder="${gh.token() ? "Ingesteld (laat leeg om te houden)" : "github_pat_…"}"></div>
          <p class="sub">Een sleutel die alleen <b>keuken-app</b> mag wijzigen. Hij blijft op deze tablet.</p>
          <div class="btn-rij"><button class="btn">Sleutel opslaan</button>${gh.token() ? '<button type="button" class="btn" data-act="wis-token">Sleutel wissen</button>' : ""}</div>
        </form></section>
      <section class="paneel"><h3>Ideeën van Claude</h3>
        <form data-form="claude">
          <div class="veld"><label for="fi-claude">Claude API-sleutel</label>
            <input id="fi-claude" name="sleutel" type="password" autocomplete="off" placeholder="${claude.sleutel() ? "Ingesteld (laat leeg om te houden)" : "sk-ant-…"}"></div>
          <p class="sub">Hiermee werkt Claude je eigen ideeën uit bij Ander gerecht. Maak hem aan op console.anthropic.com. Hij blijft op deze tablet; een vraag kost een paar cent.</p>
          <div class="btn-rij"><button class="btn">Sleutel opslaan</button>${claude.sleutel() ? '<button type="button" class="btn" data-act="wis-claude">Sleutel wissen</button>' : ""}</div>
        </form></section>
      <section class="paneel"><h3>Scherm</h3>
        <p class="sub" style="margin-top:0">Na 3 minuten niets doen verschijnt de klok. 's Nachts wordt hij gedimd.</p>
        <button class="btn" data-act="volscherm">Volledig scherm aan of uit</button></section>
    </div>`;
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
  $("#btn-klok").addEventListener("click", () => setTimeout(startScreensaver, 0));

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
    // Zolang er een bestelling loopt, vaker kijken (en de "binnen?"-vraag op tijd tonen).
    setInterval(() => { if (state.bestellingen.some((b) => LOPEND.includes(b.status))) { sync.bestellingen(); render(); } }, 2 * 60 * 1000);
  }
  start();

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
