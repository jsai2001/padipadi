// PadiPadi app: views, games and progress. No frameworks; renders with plain DOM.
(function () {
  "use strict";

  const DATA = window.PP_DATA;
  const B = window.PPBuilder;
  const view = document.getElementById("view");

  // ---------- saved state ----------
  const KEY = "padipadi-v1";
  const DEFAULTS = {
    settings: { theme: "light", showTl: true, adult: false, goal: 50 },
    xp: 0,
    days: {}, // day number -> XP earned that day
    streak: { count: 0, last: -1, best: 0 },
    cards: {}, // sentence id -> { b: box 0..5, due: day number }
  };
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "{}");
      return {
        settings: Object.assign({}, DEFAULTS.settings, s.settings),
        xp: s.xp || 0,
        days: s.days || {},
        streak: Object.assign({}, DEFAULTS.streak, s.streak),
        cards: s.cards || {},
      };
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULTS));
    }
  }
  let S = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage full/blocked */ }
  }

  const today = () => {
    const d = new Date();
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
  };
  const xpToday = () => S.days[today()] || 0;

  function addXP(n) {
    const t = today();
    S.xp += n;
    S.days[t] = (S.days[t] || 0) + n;
    // Keep ~2 months of day history.
    Object.keys(S.days).forEach((k) => { if (Number(k) < t - 60) delete S.days[k]; });
    if (S.streak.last !== t) {
      S.streak.count = S.streak.last === t - 1 ? S.streak.count + 1 : 1;
      S.streak.last = t;
      S.streak.best = Math.max(S.streak.best, S.streak.count);
    }
    save();
    updateHeader(true);
    if (S.days[t] >= S.settings.goal && S.days[t] - n < S.settings.goal) {
      toast("🎯 Daily goal reached!");
      confetti();
    }
  }

  // ---------- spaced repetition (Leitner boxes) ----------
  const INTERVALS = [0, 1, 2, 4, 7, 15]; // days until a card is due again, per box
  const MASTERED = 3;
  function markCard(id, ok) {
    const c = S.cards[id] || { b: 0, due: today() };
    c.b = ok ? Math.min(c.b + 1, 5) : 1;
    c.due = today() + (ok ? INTERVALS[c.b] : 0);
    S.cards[id] = c;
    save();
  }
  const isMastered = (id) => (S.cards[id] ? S.cards[id].b >= MASTERED : false);
  // Due and new cards first, then the weakest; shuffled within each group.
  function pickCards(list, n) {
    const t = today();
    const scored = list.map((s) => {
      const c = S.cards[s.id];
      const due = !c || c.due <= t ? 0 : 1;
      return { s, k: due * 10 + (c ? c.b : -1) + Math.random() * 0.9 };
    });
    scored.sort((a, b) => a.k - b.k);
    return scored.slice(0, n).map((x) => x.s);
  }

  // ---------- helpers ----------
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    Object.entries(props || {}).forEach(([k, v]) => {
      if (v === null || v === undefined || v === false) return;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k === "style") el.setAttribute("style", v);
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    });
    kids.flat(Infinity).forEach((c) => {
      if (c === null || c === undefined || c === false) return;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    });
    return el;
  }
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const stripPunct = (w) => w.replace(/^[.,!?]+|[.,!?]+$/g, "");
  const catVars = (c) => `--c1:${c.colors[0]};--c2:${c.colors[1]}`;
  const visibleCats = () => DATA.categories.filter((c) => !c.adult || S.settings.adult);
  const catById = (id) => DATA.categories.find((c) => c.id === id);
  const allVisibleSentences = () => visibleCats().flatMap((c) => c.sentences.map((s) => Object.assign({ cat: c.id }, s)));
  const tlLine = (text) => (S.settings.showTl ? h("p", { class: "tl-line" }, text) : null);

  let toastTimer;
  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  function updateHeader(bump) {
    document.getElementById("xp").textContent = S.xp;
    document.getElementById("streak").textContent = S.streak.last >= today() - 1 ? S.streak.count : 0;
    if (bump) {
      const p = document.getElementById("xp-pill");
      p.classList.remove("bump");
      void p.offsetWidth;
      p.classList.add("bump");
    }
  }

  // ---------- speech ----------
  let taVoice = null;
  function findVoice() {
    if (!("speechSynthesis" in window)) return;
    taVoice = speechSynthesis.getVoices().find((v) => /^ta(-|_|$)/i.test(v.lang)) || null;
  }
  if ("speechSynthesis" in window) {
    findVoice();
    speechSynthesis.addEventListener("voiceschanged", findVoice);
  }
  function speak(text) {
    if (!("speechSynthesis" in window) || !taVoice) {
      toast("No Tamil voice on this device. Chrome on Android usually has one.");
      return;
    }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = taVoice;
    u.lang = taVoice.lang;
    u.rate = 0.9;
    speechSynthesis.speak(u);
  }
  const speakBtn = (text) =>
    h("button", { type: "button", class: "icon-btn", "aria-label": "Play the Tamil audio", onclick: (e) => { e.stopPropagation(); speak(text); } }, "🔊");

  // ---------- confetti ----------
  function confetti() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = document.getElementById("confetti");
    const ctx = canvas.getContext("2d");
    const W = (canvas.width = innerWidth), H = (canvas.height = innerHeight);
    const colors = ["#7c3aed", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];
    const parts = Array.from({ length: 140 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.35,
      vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 12 - 4,
      r: Math.random() * 6 + 3, c: colors[Math.floor(Math.random() * colors.length)], a: Math.random() * 6,
    }));
    const start = performance.now();
    (function frame(now) {
      const t = now - start;
      ctx.clearRect(0, 0, W, H);
      parts.forEach((p) => {
        p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.a += 0.2;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
        ctx.globalAlpha = Math.max(0, 1 - t / 1800);
        ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6);
        ctx.restore();
      });
      if (t < 1800) requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H);
    })(start);
  }

  // ---------- theme ----------
  function applyTheme() {
    const dark = S.settings.theme === "dark";
    if (dark) document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    const b = document.getElementById("theme-toggle");
    b.textContent = dark ? "☀️" : "🌙";
    b.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  }
  document.getElementById("theme-toggle").addEventListener("click", () => {
    S.settings.theme = S.settings.theme === "dark" ? "light" : "dark";
    save();
    applyTheme();
  });

  // ---------- router ----------
  let cleanup = null;
  function render() {
    if (cleanup) { cleanup(); cleanup = null; }
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    const tab = parts[0] === "builder" ? "builder" : parts[0] === "me" ? "me" : "learn";
    document.querySelectorAll(".tabbar a").forEach((a) => {
      if (a.dataset.tab === tab) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    view.replaceChildren();
    let node;
    if (!parts.length) node = viewHome();
    else if (parts[0] === "builder") node = viewBuilder();
    else if (parts[0] === "me") node = viewMe();
    else if (parts[0] === "c" || parts[0] === "mix") {
      const cat = parts[0] === "mix" ? mixCategory() : catById(parts[1]);
      const mode = parts[0] === "mix" ? parts[1] : parts[2];
      if (!cat) node = viewNotFound();
      else if (cat.adult && !S.settings.adult) node = viewAdultGate(cat);
      else if (!mode) node = viewCategory(cat);
      else if (mode === "cards") node = viewFlashcards(cat);
      else if (mode === "quiz") node = viewQuiz(cat);
      else if (mode === "build") node = viewBuild(cat);
      else if (mode === "match") node = viewMatch(cat);
      else node = viewNotFound();
    } else node = viewNotFound();
    view.append(node);
    window.scrollTo(0, 0);
    view.focus({ preventScroll: true });
  }
  window.addEventListener("hashchange", render);

  // A pseudo-category mixing every visible category, for "Quick practice".
  function mixCategory() {
    return {
      id: "mix", name: "Quick mix", ta: "கலவை", tl: "Kalavai", emoji: "🎲", colors: ["#C4B5FD", "#EC4899"],
      adult: false, sentences: allVisibleSentences(), mix: true,
    };
  }
  const catHref = (cat, mode) => (cat.mix ? `#/mix/${mode || "quiz"}` : `#/c/${cat.id}${mode ? "/" + mode : ""}`);

  function viewNotFound() {
    return h("section", { class: "stack" },
      h("h1", {}, "Page not found"),
      h("a", { class: "btn btn-primary", href: "#/" }, "Go home"));
  }
  function viewAdultGate(cat) {
    return h("section", { class: "stack" },
      h("a", { class: "back", href: "#/" }, "← Back"),
      h("div", { class: "card stack" },
        h("h1", {}, `${cat.emoji} ${cat.name} is 18+`),
        h("p", { class: "muted" }, "Turn on 18+ categories in Me → Settings to see this one."),
        h("a", { class: "btn btn-primary", href: "#/me" }, "Open settings")));
  }

  // ---------- home ----------
  function phraseOfTheDay() {
    const pool = DATA.categories.filter((c) => !c.adult).flatMap((c) => c.sentences);
    return pool[today() % pool.length];
  }
  function catProgress(cat) {
    const m = cat.sentences.filter((s) => isMastered(s.id)).length;
    return { m, total: cat.sentences.length, pct: cat.sentences.length ? Math.round((m / cat.sentences.length) * 100) : 0 };
  }

  function viewHome() {
    const goal = S.settings.goal;
    const done = Math.min(xpToday(), goal);
    const potd = phraseOfTheDay();
    let revealed = false;
    const potdTa = h("p", { class: "ta-line", lang: "ta", style: "filter: blur(6px)" }, potd.ta);
    const potdTl = S.settings.showTl ? h("p", { class: "tl-line", style: "filter: blur(6px)" }, potd.tl) : null;
    const reveal = h("button", { type: "button", class: "btn", onclick: () => {
      revealed = !revealed;
      [potdTa, potdTl].forEach((el) => el && (el.style.filter = revealed ? "none" : "blur(6px)"));
      reveal.textContent = revealed ? "Hide" : "Reveal Tamil";
    } }, "Reveal Tamil");

    const results = h("div", { class: "stack" });
    const search = h("input", {
      class: "search", type: "search", placeholder: "Search English, Tamil or Tanglish…", "aria-label": "Search sentences",
      oninput: () => {
        const q = search.value.trim().toLowerCase();
        results.replaceChildren();
        if (q.length < 2) return;
        const hits = allVisibleSentences().filter((s) =>
          s.en.toLowerCase().includes(q) || s.tl.toLowerCase().includes(q) || s.ta.includes(search.value.trim()));
        results.append(h("p", { class: "muted small" }, `${hits.length} match${hits.length === 1 ? "" : "es"}`));
        hits.slice(0, 25).forEach((s) => results.append(sentenceCard(s)));
      },
    });

    return h("section", { class: "stack" },
      h("div", { class: "hero" },
        h("h1", {}, "வணக்கம்! ", h("span", { class: "wave", "aria-hidden": "true" }, "👋")),
        h("p", { class: "muted" }, "Vanakkam! Pick a mood and start talking in spoken Tamil.")),
      h("div", { class: "card goal" },
        h("div", { class: "goal-top" },
          h("h2", {}, "Today's goal"),
          h("span", { class: "muted small" }, `${done} / ${goal} XP`)),
        h("div", { class: "bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(goal), "aria-valuenow": String(done), "aria-label": "Daily goal" },
          h("span", { style: `width:${(done / goal) * 100}%` })),
        h("div", { class: "btn-row" },
          h("a", { class: "btn btn-primary", href: "#/mix/quiz" }, "⚡ Quick practice"),
          h("a", { class: "btn", href: "#/builder" }, "🧩 Sentence builder"))),
      h("div", { class: "card potd stack" },
        h("span", { class: "label-chip" }, "Phrase of the day"),
        h("p", { class: "en", style: "font-size:1.15rem;font-weight:700" }, potd.en),
        potdTa, potdTl,
        h("div", { class: "btn-row" }, reveal, speakBtn(potd.ta))),
      search, results,
      h("h2", {}, "Moods & topics"),
      h("div", { class: "cat-grid" }, visibleCats().map(catCard)),
      !S.settings.adult ? h("p", { class: "muted small" }, "Two 18+ categories (Lust, Sex) are hidden. Turn them on in Me → Settings.") : null);
  }

  function catCard(c) {
    const p = catProgress(c);
    return h("a", { class: "cat", href: `#/c/${c.id}`, style: catVars(c) },
      c.adult ? h("span", { class: "badge-18" }, "18+") : null,
      h("span", { class: "cat-emoji", "aria-hidden": "true" }, c.emoji),
      h("span", { class: "cat-name" }, c.name),
      h("span", { class: "cat-ta", lang: "ta" }, c.ta),
      h("span", { class: "muted small" }, `${p.total} phrases · ${p.m} mastered`),
      h("span", { class: "bar", "aria-hidden": "true" }, h("span", { style: `width:${p.pct}%` })));
  }

  // ---------- category ----------
  function sentenceCard(s) {
    const gloss = h("p", { class: "gloss-line", "aria-live": "polite" }, "Tap a word to see what it means.");
    const taWords = s.ta.split(" ");
    const tlWords = s.tl.split(" ");
    const chips = h("div", { class: "chips" }, taWords.map((w, i) => {
      const chip = h("button", { type: "button", class: "chip", "aria-pressed": "false", onclick: () => {
        chips.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", "false"));
        chip.setAttribute("aria-pressed", "true");
        const meaning = DATA.glossary[stripPunct(w)];
        gloss.textContent = `${stripPunct(w)} · ${stripPunct(tlWords[i])} · ${meaning || "not in the word list yet"}`;
      } }, h("span", { class: "ta", lang: "ta" }, w), h("span", { class: "tl" }, tlWords[i]));
      return chip;
    }));
    const words = h("div", { class: "words", hidden: true }, chips, gloss);
    const toggle = h("button", { type: "button", class: "icon-btn", "aria-label": "Show word by word", "aria-expanded": "false", onclick: () => {
      const open = words.hidden;
      words.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
    } }, "🔎");
    return h("article", { class: "card sent" },
      h("div", {},
        h("p", { class: "en" }, s.en, isMastered(s.id) ? h("span", { class: "mastered" }, "  ✓ mastered") : null),
        h("p", { class: "ta-line", lang: "ta" }, s.ta),
        tlLine(s.tl)),
      h("div", { class: "sent-actions" }, speakBtn(s.ta), toggle),
      words);
  }

  function viewCategory(cat) {
    const p = catProgress(cat);
    const mode = (m, emoji, label) => h("a", { class: "mode", href: catHref(cat, m) }, h("span", { "aria-hidden": "true" }, emoji), h("span", {}, label));
    return h("section", { class: "stack" },
      h("a", { class: "back", href: "#/" }, "← All topics"),
      h("div", { class: "banner", style: catVars(cat) },
        h("span", { class: "cat-emoji", "aria-hidden": "true" }, cat.emoji),
        h("div", {},
          h("h1", {}, cat.name),
          h("p", { lang: "ta", class: "ta", style: "font-size:1.15rem" }, `${cat.ta} · ${cat.tl}`),
          h("p", { class: "muted small" }, `${p.total} phrases · ${p.m} mastered`))),
      h("div", { class: "modes" },
        mode("cards", "🃏", "Flashcards"), mode("quiz", "❓", "Quiz"), mode("build", "🧱", "Build it"), mode("match", "🔗", "Match")),
      h("h2", {}, "All phrases"),
      cat.sentences.map(sentenceCard));
  }

  // ---------- practice: shared bits ----------
  function sessionHeader(cat, title) {
    const bar = h("span", { style: "width:0%" });
    const combo = h("span", { class: "combo", "aria-live": "polite" });
    const el = h("div", { class: "stack" },
      h("a", { class: "back", href: cat.mix ? "#/" : catHref(cat) }, cat.mix ? "← Home" : `← ${cat.name}`),
      h("h1", {}, `${cat.emoji} ${title}`),
      h("div", { class: "progress-top" },
        h("div", { class: "bar", role: "progressbar", "aria-label": "Round progress", "aria-valuemin": "0", "aria-valuemax": "100" }, bar),
        combo));
    return {
      el,
      progress(done, total) {
        bar.style.width = `${(done / total) * 100}%`;
        bar.parentNode.setAttribute("aria-valuenow", String(Math.round((done / total) * 100)));
      },
      combo(n) { combo.textContent = n >= 2 ? `🔥 x${n}` : ""; },
    };
  }

  function resultScreen(container, opts) {
    const great = opts.score / opts.total >= 0.7;
    if (great) confetti();
    container.replaceChildren(h("div", { class: "card result" },
      h("div", { class: "big-emoji", "aria-hidden": "true" }, great ? "🎉" : "💪"),
      h("h2", {}, great ? "Semma! Great job." : "Nalla try! Keep going."),
      h("p", { class: "muted" }, opts.line),
      h("p", { style: "font-weight:800;font-size:1.2rem" }, `+${opts.xp} XP`),
      h("div", { class: "btn-row", style: "width:100%" },
        h("button", { type: "button", class: "btn btn-primary", onclick: () => render() }, "Play again"),
        h("a", { class: "btn", href: opts.back }, "Done"))));
    container.querySelector(".btn-primary").focus();
  }

  const answerLines = (s) => h("div", {},
    h("p", { class: "ta-line", lang: "ta", style: "font-size:1.2rem;font-weight:600" }, s.ta),
    tlLine(s.tl));

  // ---------- flashcards ----------
  function viewFlashcards(cat) {
    const deck = pickCards(cat.sentences, 10);
    const head = sessionHeader(cat, "Flashcards");
    const area = h("div", { class: "stack" });
    let i = 0, known = 0, xp = 0;

    function show() {
      head.progress(i, deck.length);
      if (i >= deck.length) {
        resultScreen(area, { score: known, total: deck.length, xp, back: catHref(cat),
          line: `You knew ${known} of ${deck.length}. The ones you missed will come back sooner.` });
        return;
      }
      const s = deck[i];
      let flipped = false;
      const card = h("div", { class: "flash-card", tabindex: "0", role: "button", "aria-label": "Flip card" },
        h("div", { class: "flash-face" },
          h("span", { class: "label-chip" }, "English"),
          h("p", { class: "big" }, s.en),
          h("p", { class: "hint" }, "Say it in Tamil, then tap to flip")),
        h("div", { class: "flash-face back", "aria-hidden": "true" },
          h("span", { class: "label-chip" }, "Tamil"),
          h("p", { class: "big ta", lang: "ta" }, s.ta),
          S.settings.showTl ? h("p", { class: "muted" }, s.tl) : null,
          h("p", { class: "hint" }, "Swipe right if you knew it, left to see it again")));
      const again = h("button", { type: "button", class: "btn btn-bad", disabled: true, onclick: () => answer(false) }, "✗ Again");
      const got = h("button", { type: "button", class: "btn btn-good", disabled: true, onclick: () => answer(true) }, "✓ Got it");
      const listen = h("button", { type: "button", class: "btn", disabled: true, onclick: () => speak(s.ta) }, "🔊 Listen");

      function flip() {
        flipped = !flipped;
        card.classList.toggle("flipped", flipped);
        card.children[0].setAttribute("aria-hidden", String(flipped));
        card.children[1].setAttribute("aria-hidden", String(!flipped));
        [again, got, listen].forEach((b) => (b.disabled = !flipped));
      }
      function answer(ok) {
        markCard(s.id, ok);
        if (ok) { known++; xp += 5; addXP(5); }
        i++;
        show();
      }
      card.addEventListener("click", () => { if (!dragged) flip(); });
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); }
        if (flipped && e.key === "ArrowRight") answer(true);
        if (flipped && e.key === "ArrowLeft") answer(false);
      });
      // Swipe (after flipping): right = got it, left = again.
      let startX = null, dx = 0, dragged = false;
      card.addEventListener("pointerdown", (e) => { if (flipped) { startX = e.clientX; dx = 0; dragged = false; } });
      card.addEventListener("pointermove", (e) => {
        if (startX === null) return;
        dx = e.clientX - startX;
        if (Math.abs(dx) > 8) dragged = true;
        card.style.transform = `rotateY(180deg) translateX(${-dx}px) rotate(${-dx / 25}deg)`;
      });
      const end = () => {
        if (startX === null) return;
        card.style.transform = "";
        startX = null;
        if (Math.abs(dx) > 90) answer(dx > 0);
        setTimeout(() => (dragged = false), 0);
      };
      card.addEventListener("pointerup", end);
      card.addEventListener("pointercancel", end);

      area.replaceChildren(h("div", { class: "flash" }, card), h("div", { class: "btn-row" }, again, listen, got));
      card.focus();
    }
    show();
    return h("section", { class: "stack" }, head.el, area);
  }

  // ---------- quiz ----------
  function distractors(s, pool, n) {
    const others = shuffle(pool.filter((x) => x.id !== s.id && x.ta !== s.ta && x.en !== s.en));
    return others.slice(0, n);
  }
  function viewQuiz(cat) {
    const qs = pickCards(cat.sentences, 10);
    const pool = cat.sentences.length >= 4 ? cat.sentences : allVisibleSentences();
    const head = sessionHeader(cat, cat.mix ? "Quick practice" : "Quiz");
    const area = h("div", { class: "stack" });
    let i = 0, score = 0, combo = 0, xp = 0;

    function show() {
      head.progress(i, qs.length);
      if (i >= qs.length) {
        resultScreen(area, { score, total: qs.length, xp, back: cat.mix ? "#/" : catHref(cat), line: `${score} of ${qs.length} correct.` });
        return;
      }
      const s = qs[i];
      const toTamil = i % 2 === 0; // alternate directions
      const opts = shuffle([s, ...distractors(s, pool, 3)]);
      const feedback = h("p", { class: "feedback", "aria-live": "polite" });
      const next = h("button", { type: "button", class: "btn btn-primary", hidden: true, onclick: () => { i++; show(); } }, "Next →");
      let answered = false;
      const buttons = opts.map((o) => {
        const b = h("button", { type: "button", class: "option", onclick: () => choose(o, b) },
          toTamil ? [h("span", { class: "ta", lang: "ta" }, o.ta), S.settings.showTl ? h("span", { class: "tl" }, o.tl) : null]
            : h("span", {}, o.en));
        return b;
      });
      function choose(o, b) {
        if (answered) return;
        answered = true;
        const ok = o.id === s.id;
        markCard(s.id, ok);
        buttons.forEach((x, k) => { if (opts[k].id === s.id) x.classList.add("correct"); x.disabled = true; });
        if (ok) {
          combo++;
          const gain = 10 + (combo >= 3 ? 5 : 0);
          score++; xp += gain; addXP(gain);
          feedback.className = "feedback good";
          feedback.textContent = combo >= 3 ? `Correct! Combo bonus +5 🔥` : "Correct! 👏";
          speakQuietly(s.ta);
          setTimeout(() => { if (area.isConnected) { i++; show(); } }, 1100);
        } else {
          combo = 0;
          b.classList.add("wrong");
          feedback.className = "feedback bad";
          feedback.textContent = "Not quite. The right answer is highlighted.";
          next.hidden = false;
          next.focus();
        }
        head.combo(combo);
      }
      area.replaceChildren(
        h("div", { class: "card stack" },
          h("span", { class: "label-chip" }, toTamil ? "Pick the Tamil" : "What does this mean?"),
          toTamil ? h("p", { class: "prompt" }, s.en)
            : h("div", {}, h("p", { class: "prompt ta", lang: "ta" }, s.ta), tlLine(s.tl)),
          h("div", { class: "options" }, buttons),
          feedback, next));
      buttons[0].focus();
    }
    show();
    return h("section", { class: "stack" }, head.el, area);
  }
  // Only speak on success if a voice exists; never nag with a toast here.
  const speakQuietly = (text) => { if (taVoice) speak(text); };

  // ---------- build the sentence ----------
  function viewBuild(cat) {
    const usable = cat.sentences.filter((s) => { const n = s.ta.split(" ").length; return n >= 2 && n <= 8; });
    const rounds = pickCards(usable.length ? usable : cat.sentences, 8);
    const head = sessionHeader(cat, "Build it");
    const area = h("div", { class: "stack" });
    let i = 0, score = 0, xp = 0;

    function show() {
      head.progress(i, rounds.length);
      if (i >= rounds.length) {
        resultScreen(area, { score, total: rounds.length, xp, back: catHref(cat), line: `You built ${score} of ${rounds.length} perfectly.` });
        return;
      }
      const s = rounds[i];
      const taW = s.ta.split(" ");
      const tlW = s.tl.split(" ");
      const tiles = shuffle(taW.map((w, k) => ({ w, t: tlW[k], k })));
      const placed = [];
      let hinted = false, checked = false;
      const zone = h("div", { class: "answer-zone", "aria-label": "Your sentence" });
      const bank = h("div", { class: "chips" });
      const feedback = h("p", { class: "feedback", "aria-live": "polite" });
      const check = h("button", { type: "button", class: "btn btn-primary", disabled: true, onclick: doCheck }, "Check");
      const hint = h("button", { type: "button", class: "btn", onclick: doHint }, "💡 Hint");
      const next = h("button", { type: "button", class: "btn btn-primary", hidden: true, onclick: () => { i++; show(); } }, "Next →");

      const tileEl = (tile, inZone) => h("button", { type: "button", class: "tile", onclick: () => (inZone ? remove(tile) : add(tile)) },
        h("span", { class: "ta", lang: "ta" }, tile.w), S.settings.showTl ? h("span", { class: "tl" }, tile.t) : null);
      function draw() {
        zone.replaceChildren(...placed.map((t) => tileEl(t, true)));
        bank.replaceChildren(...tiles.map((t) => {
          const el = tileEl(t, false);
          if (placed.includes(t)) { el.classList.add("used"); el.disabled = true; }
          return el;
        }));
        check.disabled = placed.length !== tiles.length || checked;
      }
      function add(t) { if (!checked) { placed.push(t); draw(); } }
      function remove(t) { if (!checked) { placed.splice(placed.indexOf(t), 1); draw(); } }
      function doHint() {
        if (checked) return;
        hinted = true;
        // Keep the correct prefix, then add the next right word.
        let n = 0;
        while (n < placed.length && placed[n].w === taW[n]) n++;
        placed.splice(n);
        const nextTile = tiles.find((t) => !placed.includes(t) && t.w === taW[n]);
        if (nextTile) placed.push(nextTile);
        draw();
      }
      function doCheck() {
        checked = true;
        const ok = placed.map((t) => t.w).join(" ") === s.ta;
        markCard(s.id, ok && !hinted);
        zone.classList.add(ok ? "good" : "bad");
        if (ok) {
          const gain = hinted ? 5 : 10;
          score += hinted ? 0 : 1; xp += gain; addXP(gain);
          feedback.className = "feedback good";
          feedback.textContent = hinted ? "Correct, with a hint. +5" : "Perfect! +10";
          speakQuietly(s.ta);
        } else {
          feedback.className = "feedback bad";
          feedback.replaceChildren("Not quite. It should be: ", answerLines(s));
        }
        check.hidden = true; hint.hidden = true; next.hidden = false;
        draw();
        next.focus();
      }
      draw();
      area.replaceChildren(h("div", { class: "card stack" },
        h("span", { class: "label-chip" }, "Put the Tamil words in order"),
        h("p", { class: "prompt" }, s.en),
        zone, bank, feedback,
        h("div", { class: "btn-row" }, hint, check, next)));
    }
    show();
    return h("section", { class: "stack" }, head.el, area);
  }

  // ---------- match pairs ----------
  function viewMatch(cat) {
    const short = cat.sentences.filter((s) => s.ta.split(" ").length <= 4);
    const set = pickCards(short.length >= 5 ? short : cat.sentences, 5);
    const head = sessionHeader(cat, "Match");
    const area = h("div", { class: "stack" });
    const started = Date.now();
    let picked = null, matched = 0, mistakes = 0;
    const timer = h("span", { class: "muted small", "aria-live": "off" }, "0s");
    const tick = setInterval(() => (timer.textContent = `${Math.round((Date.now() - started) / 1000)}s`), 1000);
    cleanup = () => clearInterval(tick);

    const item = (s, side) => {
      const b = h("button", { type: "button", class: `match-item${side === "ta" ? " ta" : ""}`, "aria-pressed": "false", lang: side === "ta" ? "ta" : null,
        onclick: () => pick(b, s, side) }, side === "ta" ? s.ta : s.en);
      return b;
    };
    function pick(b, s, side) {
      if (b.classList.contains("done")) return;
      if (!picked || picked.side === side) {
        if (picked) picked.b.setAttribute("aria-pressed", "false");
        picked = { b, s, side };
        b.setAttribute("aria-pressed", "true");
        return;
      }
      const other = picked;
      picked = null;
      other.b.setAttribute("aria-pressed", "false");
      if (other.s.id === s.id) {
        [b, other.b].forEach((x) => x.classList.add("done"));
        markCard(s.id, true);
        matched++;
        head.progress(matched, set.length);
        if (matched === set.length) finish();
      } else {
        mistakes++;
        [b, other.b].forEach((x) => { x.classList.remove("wrong"); void x.offsetWidth; x.classList.add("wrong"); });
      }
    }
    function finish() {
      clearInterval(tick);
      const secs = Math.round((Date.now() - started) / 1000);
      const gain = Math.max(10, 30 - mistakes * 4);
      addXP(gain);
      setTimeout(() => resultScreen(area, { score: set.length - Math.min(mistakes, set.length), total: set.length, xp: gain, back: catHref(cat),
        line: `All ${set.length} pairs in ${secs}s with ${mistakes} mistake${mistakes === 1 ? "" : "s"}.` }), 350);
    }
    area.append(h("div", { class: "card stack" },
      h("div", { class: "goal-top" }, h("span", { class: "label-chip" }, "Tap an English line, then its Tamil"), timer),
      h("div", { class: "match-grid" },
        h("div", { class: "match-col" }, shuffle(set).map((s) => item(s, "en"))),
        h("div", { class: "match-col" }, shuffle(set).map((s) => item(s, "ta"))))));
    head.progress(0, set.length);
    return h("section", { class: "stack" }, head.el, area);
  }

  // ---------- sentence builder ----------
  const builderState = { person: "naan", phrase: "a:eat-rice", tense: "present", neg: false, time: false };

  function viewBuilder() {
    const st = builderState;
    const out = h("div", { class: "card output", "aria-live": "polite" });
    const practice = h("div", { class: "stack" });

    // Who
    const whoBtns = B.persons.map((p) => h("button", { type: "button", "aria-pressed": "false", onclick: () => { st.person = p.id; update(); } },
      h("span", { class: "ta", lang: "ta" }, p.ta),
      h("span", { class: "small" }, p.label + (p.tag ? ` · ${p.tag}` : ""))));
    // What
    const groups = {};
    B.phrases.forEach((ph) => (groups[ph.group] = groups[ph.group] || []).push(ph));
    const select = h("select", { class: "select", "aria-label": "What to say", onchange: () => { st.phrase = select.value; update(); } },
      Object.entries(groups).map(([g, list]) => h("optgroup", { label: g }, list.map((ph) => h("option", { value: ph.id }, ph.label)))));
    // When
    const tenseBtns = B.TENSES.map((t) => h("button", { type: "button", "aria-pressed": "false", onclick: () => { st.tense = t; update(); } },
      t.charAt(0).toUpperCase() + t.slice(1)));
    const negBox = h("input", { type: "checkbox", onchange: () => { st.neg = negBox.checked; update(); } });
    const timeBox = h("input", { type: "checkbox", onchange: () => { st.time = timeBox.checked; update(); } });
    const dice = h("button", { type: "button", class: "btn", onclick: () => { Object.assign(st, B.random()); update(); } }, "🎲 Surprise me");

    // Pick the nearest valid option when a choice isn't available for this phrase.
    function normalize() {
      const ph = B.phraseById[st.phrase];
      if (!B.personAllowed(ph, st.person)) st.person = B.persons.find((p) => B.personAllowed(ph, p.id)).id;
      if (!B.formAvailable(ph, st.tense, st.neg)) {
        const t = B.TENSES.find((x) => B.formAvailable(ph, x, st.neg));
        if (t) st.tense = t; else st.neg = !st.neg;
      }
    }

    function update() {
      normalize();
      const ph = B.phraseById[st.phrase];
      whoBtns.forEach((b, k) => {
        const p = B.persons[k];
        b.setAttribute("aria-pressed", String(p.id === st.person));
        b.disabled = !B.personAllowed(ph, p.id);
      });
      select.value = st.phrase;
      tenseBtns.forEach((b, k) => {
        const t = B.TENSES[k];
        b.setAttribute("aria-pressed", String(t === st.tense));
        b.disabled = !B.formAvailable(ph, t, st.neg) && !B.formAvailable(ph, t, !st.neg);
      });
      negBox.checked = st.neg;
      negBox.disabled = !B.formAvailable(ph, st.tense, !st.neg);
      timeBox.checked = st.time;
      timeBox.disabled = !B.timeAllowed(ph);
      const r = B.generate(st);
      out.replaceChildren(...renderResult(r));
      practice.replaceChildren();
    }

    function renderResult(r) {
      const taLine = h("p", { class: "ta-out", lang: "ta" });
      const tlLine2 = h("p", { class: "tl-out" });
      r.words.forEach((w, k) => {
        if (k) { taLine.append(" "); tlLine2.append(" "); }
        if (w.taHl !== undefined) {
          taLine.append(w.taBase, h("mark", { class: "hl" }, w.taHl));
          const tl = k === 0 ? w.tl.charAt(0).toUpperCase() + w.tl.slice(1) : w.tl;
          tlLine2.append(w.tlHl ? tl.slice(0, tl.length - w.tlHl.length) : tl, w.tlHl ? h("mark", { class: "hl" }, w.tlHl) : "");
        } else {
          taLine.append(w.ta);
          tlLine2.append(k === 0 ? w.tl.charAt(0).toUpperCase() + w.tl.slice(1) : w.tl);
        }
      });
      taLine.append(".");
      tlLine2.append(".");
      return [
        h("p", { class: "en-out" }, r.en, r.tag ? h("span", { class: "muted small" }, `  (${r.tag})`) : null),
        taLine,
        S.settings.showTl ? tlLine2 : null,
        h("div", { class: "chips" }, r.words.map((w) => h("span", { class: "chip" },
          h("span", { class: "ta", lang: "ta" }, w.ta), h("span", { class: "tl" }, w.tl), h("span", { class: "gl" }, w.gloss || "·")))),
        h("p", { class: "rule" }, "💡 " + r.rule),
        h("div", { class: "btn-row" },
          speakBtn(r.ta),
          h("button", { type: "button", class: "btn btn-primary", onclick: startPractice }, "🧱 Practice random sentences")),
      ];
    }

    // Random builder sentences as "put the words in order" drills.
    function startPractice() {
      let n = 0, score = 0;
      function round() {
        if (n >= 5) {
          practice.replaceChildren(h("div", { class: "card result" },
            h("div", { class: "big-emoji", "aria-hidden": "true" }, score >= 4 ? "🎉" : "💪"),
            h("h2", {}, `${score} of 5 perfect`),
            h("button", { type: "button", class: "btn btn-primary", onclick: startPractice }, "Another 5")));
          if (score >= 4) confetti();
          return;
        }
        const r = B.generate(B.random());
        const target = r.words.map((w) => w.ta);
        const tiles = shuffle(r.words.map((w, k) => ({ w: w.ta, t: w.tl, k })));
        const placed = [];
        const zone = h("div", { class: "answer-zone" });
        const bank = h("div", { class: "chips" });
        const fb = h("p", { class: "feedback", "aria-live": "polite" });
        const check = h("button", { type: "button", class: "btn btn-primary", disabled: true, onclick: () => {
          const ok = placed.map((t) => t.w).join(" ") === target.join(" ");
          zone.classList.add(ok ? "good" : "bad");
          fb.className = "feedback " + (ok ? "good" : "bad");
          fb.textContent = ok ? "Perfect! +10" : "Not quite: " + r.ta;
          if (ok) { score++; addXP(10); speakQuietly(r.ta); }
          check.hidden = true; nextB.hidden = false; nextB.focus();
          draw(true);
        } }, "Check");
        const nextB = h("button", { type: "button", class: "btn btn-primary", hidden: true, onclick: () => { n++; round(); } }, "Next →");
        const tileEl = (t, inZone, locked) => h("button", { type: "button", class: "tile", disabled: locked || null,
          onclick: () => { if (inZone) placed.splice(placed.indexOf(t), 1); else placed.push(t); draw(); } },
          h("span", { class: "ta", lang: "ta" }, t.w), S.settings.showTl ? h("span", { class: "tl" }, t.t) : null);
        function draw(locked) {
          zone.replaceChildren(...placed.map((t) => tileEl(t, true, locked)));
          bank.replaceChildren(...tiles.map((t) => { const el = tileEl(t, false, locked); if (placed.includes(t)) { el.classList.add("used"); el.disabled = true; } return el; }));
          check.disabled = placed.length !== tiles.length;
        }
        draw();
        practice.replaceChildren(h("div", { class: "card stack" },
          h("div", { class: "goal-top" }, h("span", { class: "label-chip" }, `Practice ${n + 1} / 5`), h("span", { class: "muted small" }, r.tag ? `you = ${r.tag}` : "")),
          h("p", { class: "prompt" }, r.en), zone, bank, fb, h("div", { class: "btn-row" }, check, nextB)));
        practice.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      round();
    }

    const node = h("section", { class: "stack" },
      h("div", {},
        h("h1", {}, "🧩 Sentence builder"),
        h("p", { class: "muted" }, "Pick who, what and when, and watch the Tamil change. The highlighted part is the ending that changed."),
        h("p", { style: "margin-top:0.5rem" }, h("span", { class: "count-badge" }, `${B.count().toLocaleString()} combinations`))),
      h("div", { class: "card controls" },
        h("div", { class: "stack" }, h("span", { class: "field-label" }, "Who"), h("div", { class: "who" }, whoBtns)),
        h("label", { class: "stack" }, h("span", { class: "field-label" }, "What"), select),
        h("div", { class: "stack" },
          h("span", { class: "field-label" }, "When"),
          h("div", { class: "control-row" },
            h("div", { class: "seg", role: "group", "aria-label": "Tense" }, tenseBtns),
            h("label", { class: "switch" }, negBox, "Negative"),
            h("label", { class: "switch" }, timeBox, "Add now / yesterday / tomorrow"))),
        h("div", { class: "btn-row" }, dice)),
      out, practice);
    update();
    return node;
  }

  // ---------- me: stats & settings ----------
  function viewMe() {
    const mastered = Object.values(S.cards).filter((c) => c.b >= MASTERED).length;
    const setting = (label, control) => h("div", { class: "setting" }, h("span", { style: "font-weight:600" }, label), control);
    const box = (key, onchange) => {
      const el = h("input", { type: "checkbox", class: "switch-input", onchange: () => { onchange(el.checked); } });
      el.checked = !!S.settings[key];
      return el;
    };
    const tl = box("showTl", (v) => { S.settings.showTl = v; save(); });
    const adult = box("adult", (v) => {
      if (v && !confirm("Show the 18+ categories (Lust, Sex)? Only turn this on if you're 18 or older.")) { adult.checked = false; return; }
      S.settings.adult = v; save(); toast(v ? "18+ categories are visible" : "18+ categories are hidden");
    });
    const goal = h("select", { class: "select", style: "width:auto", "aria-label": "Daily goal", onchange: () => { S.settings.goal = Number(goal.value); save(); } },
      [20, 50, 100, 200].map((g) => h("option", { value: String(g) }, `${g} XP`)));
    goal.value = String(S.settings.goal);
    const reset = h("button", { type: "button", class: "btn btn-bad", onclick: () => {
      if (!confirm("Reset all progress (XP, streak and mastered phrases)? This can't be undone.")) return;
      const settings = S.settings;
      S = JSON.parse(JSON.stringify(DEFAULTS));
      S.settings = settings;
      save(); updateHeader(); render(); toast("Progress reset");
    } }, "Reset progress");

    return h("section", { class: "stack" },
      h("h1", {}, "🏆 Your progress"),
      h("div", { class: "stat-grid" },
        h("div", { class: "card stat" }, h("b", {}, String(S.xp)), h("span", { class: "muted small" }, "total XP")),
        h("div", { class: "card stat" }, h("b", {}, `${S.streak.last >= today() - 1 ? S.streak.count : 0}🔥`), h("span", { class: "muted small" }, `streak · best ${S.streak.best}`)),
        h("div", { class: "card stat" }, h("b", {}, String(mastered)), h("span", { class: "muted small" }, "mastered"))),
      h("div", { class: "card stack" },
        h("h2", {}, "By topic"),
        visibleCats().map((c) => {
          const p = catProgress(c);
          return h("a", { class: "cat-progress", href: `#/c/${c.id}`, style: catVars(c) + ";text-decoration:none" },
            h("span", { "aria-hidden": "true" }, c.emoji),
            h("span", {}, h("span", { class: "small", style: "font-weight:600" }, c.name),
              h("span", { class: "bar", style: "display:block;margin-top:0.25rem" }, h("span", { style: `width:${p.pct}%` }))),
            h("span", { class: "muted small" }, `${p.m}/${p.total}`));
        })),
      h("div", { class: "card" },
        h("h2", { style: "margin-bottom:0.4rem" }, "Settings"),
        setting("Show Tanglish (romanized) text", tl),
        setting("Daily goal", goal),
        setting("Show 18+ categories", adult),
        setting("Progress is saved in this browser only", reset)),
      h("p", { class: "muted small" },
        "Sentences are written in spoken Tamil. They were not reviewed by a native speaker yet, so some may sound unnatural. Audio uses your device's Tamil voice when it has one."));
  }

  // ---------- start ----------
  applyTheme();
  updateHeader();
  render();
})();
