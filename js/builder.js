// Sentence builder: combines who × what × tense × positive/negative (× optional time word)
// into English, spoken Tamil and Tanglish, word by word.
(function (root) {
  "use strict";
  const LEX = root.PP_LEX || (typeof require !== "undefined" ? require("./lexicon.js") : null);
  const PULLI = "்";
  const TENSES = ["past", "present", "future"];
  const KEY = { present: ["pres", "negPres"], past: ["past", "negPast"], future: ["fut", "negFut"] };

  const personById = {};
  LEX.persons.forEach((p) => (personById[p.id] = p));

  // ---------- phrases (one entry per thing you can say) ----------
  const phrases = [];
  LEX.actions.forEach((a) => {
    phrases.push({
      id: "a:" + a.id, kind: "action", group: a.group, src: a,
      label: (a.en.base + " " + a.obj).trim(),
    });
  });
  LEX.states.forEach((s) => {
    phrases.push({ id: "s:" + s.id, kind: "state", group: "Feelings & places (I am…)", src: s, label: "be " + s.en });
  });
  LEX.feelings.forEach((f) => {
    if (f.objects) {
      f.objects.forEach((o, i) =>
        phrases.push({ id: `f:${f.id}:${i}`, kind: "feel", group: f.group, src: f, obj: o, label: `${f.label} ${o.en}` })
      );
    } else {
      phrases.push({ id: "f:" + f.id, kind: "feel", group: f.group, src: f, label: f.label });
    }
  });
  const phraseById = {};
  phrases.forEach((p) => (phraseById[p.id] = p));

  // ---------- helpers ----------
  // Swap the stem's final pulli for a person ending, and say which part changed.
  function conj(stem, personId) {
    const [ta, tl] = stem;
    if (!ta.endsWith(PULLI)) throw new Error("stem must end with ் : " + ta);
    const [eTa, eTl] = LEX.endings[personById[personId].end];
    const base = ta.slice(0, -2);
    const hl = ta.slice(-2, -1) + eTa;
    return { ta: base + hl, tl: tl + eTl, taBase: base, taHl: hl, tlBase: tl, tlHl: eTl };
  }
  const word = (ta, tl, gloss, role, extra) => Object.assign({ ta, tl, gloss, role }, extra || {});
  const split = (ta, tl, gloss, role) => {
    const t = ta.split(" "), l = tl.split(" ");
    return t.map((x, i) => word(x, l[i], i === t.length - 1 ? gloss : "", role));
  };

  function fill(tpl, p, vars) {
    return tpl.replace(/\{(\w+)\}/g, (_, k) => {
      if (k === "S") return p.en;
      if (k in vars) return vars[k];
      return p[k] !== undefined ? p[k] : "";
    });
  }
  function finishEn(text, timeEn) {
    let t = text.replace(/\s+/g, " ").trim();
    if (timeEn) t += " " + timeEn;
    return t.charAt(0).toUpperCase() + t.slice(1) + ".";
  }

  const EN_ACTION = {
    pres: "{sm} {ing} {obj}", negPres: "{sm} not {ing} {obj}",
    past: "{S} {past} {obj}", negPast: "{S} didn't {base} {obj}",
    fut: "{will} {base} {obj}", negFut: "{S} won't {base} {obj}",
  };
  const EN_ADJ = {
    pres: "{sm} {adj}", negPres: "{sm} not {adj}",
    past: "{S} {was} {adj}", negPast: "{S} {was}n't {adj}",
    fut: "{will} be {adj}", negFut: "{S} won't be {adj}",
  };

  // ---------- availability ----------
  function personAllowed(ph, personId) {
    const src = ph.src;
    if (src.skip && src.skip.includes(personId)) return false;
    if (src.only && !src.only.includes(personId)) return false;
    return true;
  }
  function formAvailable(ph, tense, neg) {
    if (ph.kind !== "feel") return true;
    return !!ph.src.forms[KEY[tense][neg ? 1 : 0]];
  }
  const timeAllowed = (ph) => !ph.src.noTime;

  // ---------- generation ----------
  function generate(opts) {
    const p = personById[opts.person];
    const ph = phraseById[opts.phrase];
    const tense = opts.tense || "present";
    const neg = !!opts.neg;
    if (!p || !ph || !KEY[tense]) return null;
    if (!personAllowed(ph, p.id) || !formAvailable(ph, tense, neg)) return null;
    const useTime = !!opts.time && timeAllowed(ph);
    const key = KEY[tense][neg ? 1 : 0];
    const words = [];
    const tw = LEX.time[tense];
    let en;
    let rule;

    if (ph.kind === "feel") {
      words.push(word(p.dat, p.datTl, p.datGloss, "subject"));
    } else {
      words.push(word(p.ta, p.tl, p.label + (p.tag ? ` (${p.tag})` : ""), "subject"));
    }
    if (useTime) words.push(word(tw[0], tw[1], tw[2], "time"));

    if (ph.kind === "action") {
      const a = ph.src;
      const vb = LEX.verbs[a.verb];
      if (a.taObj) words.push(...split(a.taObj, a.tlObj, a.obj || a.en.base, "object"));
      const g = a.en.base;
      if (key === "pres") { words.push(word(null, null, `${g} · present`, "verb", conj(vb.pres, p.id))); rule = "Present stem + person ending."; }
      if (key === "past") { words.push(word(null, null, `${g} · past`, "verb", conj(vb.past, p.id))); rule = "Past stem + person ending."; }
      if (key === "fut") { words.push(word(null, null, `${g} · future`, "verb", conj(vb.fut, p.id))); rule = "Future stem + person ending."; }
      if (key === "negPres" || key === "negPast") {
        words.push(word(vb.neg[0], vb.neg[1], `not ${g}`, "verb"));
        rule = "Negative: one form for everyone. It means both \"not doing\" and \"didn't do\".";
      }
      if (key === "negFut") {
        words.push(word(vb.inf[0], vb.inf[1], g, "verb"));
        words.push(word(null, null, "won't", "verb", conj(LEX.maatt, p.id)));
        rule = "Won't: the infinitive + மாட்ட் with the person ending.";
      }
      en = fill(EN_ACTION[key], p, Object.assign({ obj: a.obj }, a.en));
    } else if (ph.kind === "state") {
      const s = ph.src;
      const I = LEX.iru;
      words.push(word(s.ta, s.tl, s.en, "object"));
      if (key === "pres") { words.push(word(null, null, `${p.be} · present`, "verb", conj(I.pres, p.id))); rule = "இரு (to be), present + person ending."; }
      if (key === "past") { words.push(word(null, null, `${p.was} · past`, "verb", conj(I.past, p.id))); rule = "இரு (to be), past + person ending."; }
      if (key === "fut") { words.push(word(null, null, "will be", "verb", conj(I.fut, p.id))); rule = "இரு (to be), future + person ending."; }
      if (key === "negPres") { words.push(word(I.negPres[0], I.negPres[1], "not", "verb")); rule = "\"Not\" right now is just இல்ல, for everyone."; }
      if (key === "negPast") { words.push(word(I.negPast[0], I.negPast[1], "wasn't", "verb")); rule = "\"Wasn't\" is இருக்கல, for everyone."; }
      if (key === "negFut") {
        words.push(word(I.inf[0], I.inf[1], "be", "verb"));
        words.push(word(null, null, "won't", "verb", conj(LEX.maatt, p.id)));
        rule = "Won't be: இருக்க + மாட்ட் with the person ending.";
      }
      en = fill(EN_ADJ[key], p, { adj: s.en });
    } else {
      const f = ph.src;
      if (ph.obj) words.push(...split(ph.obj.ta, ph.obj.tl, ph.obj.en, "object"));
      if (f.head) words.push(word(f.head[0], f.head[1], f.head[2], "object"));
      const form = f.forms[key];
      const tLabel = { pres: "present", negPres: "not · present", past: "past", negPast: "not · past", fut: "future", negFut: "not · future" }[key];
      words.push(word(form[0], form[1], `${f.verbGloss} · ${tLabel}`, "verb"));
      rule = "\"I feel\" sentences use எனக்கு (to me) and the verb never changes with the person.";
      const tpl = f.en.tpl ? f.en.tpl[key] : EN_ADJ[key];
      en = fill(tpl, p, { adj: f.en.adj || "", obj: ph.obj ? ph.obj.en : "" });
    }

    words.forEach((w) => {
      if (w.ta === null) { w.ta = w.taBase + w.taHl; }
      if (w.tl === null) { w.tl = w.tlBase + w.tlHl; }
    });
    const ta = words.map((w) => w.ta).join(" ") + ".";
    let tl = words.map((w) => w.tl).join(" ") + ".";
    tl = tl.charAt(0).toUpperCase() + tl.slice(1);
    return {
      en: finishEn(en, useTime ? tw[2] : ""),
      ta, tl, words, rule,
      tag: p.tag,
      key: [p.id, ph.id, tense, neg ? 1 : 0, useTime ? 1 : 0].join("|"),
    };
  }

  // ---------- Telugu reference (shown next to the English) ----------
  const PIDX = {};
  LEX.persons.forEach((p, i) => (PIDX[p.id] = i));
  const KEYIDX = { pres: 0, negPres: 1, past: 2, negPast: 3, fut: 4, negFut: 5 };

  function teVerb(vb, key, pid) {
    const E = LEX.te.endings, i = PIDX[pid], she = pid === "ava";
    if (key === "pres") return she ? vb.pres.slice(0, -1) + "ోంది" : vb.pres + E.pres[i];
    if (key === "past") return she ? vb.shePast : vb.past + E.past[i];
    if (key === "fut") return vb.fut + E.fut[i];
    if (key === "negPres") return vb.negNow;
    if (key === "negPast") return vb.negPast;
    return vb.negFut + E.negFut[i];
  }
  function teBe(key, pid) {
    const E = LEX.te.endings, i = PIDX[pid], she = pid === "ava";
    if (key === "pres" || key === "past") return she ? "ఉంది" : "ఉన్న" + E.past[i];
    if (key === "fut") return "ఉంట" + E.fut[i];
    if (key === "negPres" || key === "negPast") return "లే" + E.beNeg[i];
    return "ఉండ" + E.negFut[i];
  }

  // Returns the Telugu sentence for the same combination, or null if there's no Telugu data.
  function generateTe(opts) {
    const TE = LEX.te;
    if (!TE) return null;
    const ph = phraseById[opts.phrase];
    const tense = opts.tense || "present";
    if (!ph || !personAllowed(ph, opts.person) || !formAvailable(ph, tense, !!opts.neg)) return null;
    const key = KEY[tense][opts.neg ? 1 : 0];
    const [nom, dat] = TE.persons[opts.person];
    const parts = [];
    if (ph.kind === "feel") parts.push(dat); else parts.push(nom);
    if (opts.time && timeAllowed(ph)) parts.push(TE.time[tense]);

    if (ph.kind === "action") {
      const a = TE.actions[ph.src.id];
      if (!a) return null;
      if (a[0]) parts.push(a[0]);
      parts.push(teVerb(TE.verbs[a[1]], key, opts.person));
    } else if (ph.kind === "state") {
      const adv = TE.states[ph.src.id];
      if (!adv) return null;
      parts.push(adv, teBe(key, opts.person));
    } else {
      const forms = TE.feelings[ph.src.id];
      const form = forms && forms[KEYIDX[key]];
      if (!form) return null;
      if (ph.obj) {
        const i = ph.src.objects.indexOf(ph.obj);
        const o = TE.objects[ph.src.id] && TE.objects[ph.src.id][i];
        if (!o) return null;
        parts.push(o);
      }
      parts.push(form);
    }
    return parts.join(" ") + ".";
  }

  // Every valid combination, as option objects.
  function allCombos() {
    const out = [];
    phrases.forEach((ph) => {
      LEX.persons.forEach((p) => {
        if (!personAllowed(ph, p.id)) return;
        TENSES.forEach((tense) => {
          [false, true].forEach((neg) => {
            if (!formAvailable(ph, tense, neg)) return;
            out.push({ person: p.id, phrase: ph.id, tense, neg, time: false });
            if (timeAllowed(ph)) out.push({ person: p.id, phrase: ph.id, tense, neg, time: true });
          });
        });
      });
    });
    return out;
  }
  let comboCount = null;
  function count() {
    if (comboCount === null) comboCount = allCombos().length;
    return comboCount;
  }
  function random(rand) {
    const r = rand || Math.random;
    const all = allCombos();
    return all[Math.floor(r() * all.length)];
  }

  const API = {
    persons: LEX.persons, phrases, phraseById, TENSES,
    generate, generateTe, allCombos, count, random, personAllowed, formAvailable, timeAllowed,
  };
  root.PPBuilder = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
