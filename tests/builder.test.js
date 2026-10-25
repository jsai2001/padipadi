// Run: node tests/builder.test.js
"use strict";
const assert = require("assert");
const path = require("path");
const LEX = require(path.join(__dirname, "..", "js", "lexicon.js"));
require(path.join(__dirname, "..", "js", "lexicon-te.js"));
const B = require(path.join(__dirname, "..", "js", "builder.js"));

let failures = 0;
function check(name, fn) {
  try { fn(); console.log("PASS " + name); }
  catch (e) { failures++; console.log("FAIL " + name + "\n     " + e.message); }
}
const gen = (person, phrase, tense, neg, time) => B.generate({ person, phrase, tense, neg, time });
function expect(opts, en, ta, tl) {
  const r = gen(...opts);
  assert.ok(r, "no result for " + opts.join(","));
  assert.strictEqual(r.en, en);
  assert.strictEqual(r.ta, ta);
  assert.strictEqual(r.tl, tl);
}

check("present, I eat rice", () =>
  expect(["naan", "a:eat-rice", "present", false, false], "I'm eating rice.", "நான் சோறு சாப்பிடறேன்.", "Naan soru saappidaren."));
check("past, you (informal) went home", () =>
  expect(["nee", "a:go-home", "past", false, false], "You went home.", "நீ வீட்டுக்கு போன.", "Nee veettukku pona."));
check("future, respectful you will come to the party", () =>
  expect(["neenga", "a:come-party", "future", false, false], "You'll come to the party.", "நீங்க பார்ட்டிக்கு வருவீங்க.", "Neenga partykku varuveenga."));
check("negative past with time word", () =>
  expect(["naan", "a:eat-rice", "past", true, true], "I didn't eat rice yesterday.", "நான் நேத்து சோறு சாப்பிடல.", "Naan nethu soru saappidala."));
check("won't, she", () =>
  expect(["ava", "a:drink-coffee", "future", true, false], "She won't drink coffee.", "அவ காபி குடிக்க மாட்டா.", "Ava coffee kudikka maattaa."));
check("state present, they are happy", () =>
  expect(["avanga", "s:happy", "present", false, false], "They're happy.", "அவங்க சந்தோஷமா இருக்காங்க.", "Avanga santhoshamaa irukkaanga."));
check("state not, I'm not happy", () =>
  expect(["naan", "s:happy", "present", true, false], "I'm not happy.", "நான் சந்தோஷமா இல்ல.", "Naan santhoshamaa illa."));
check("state won't, he won't be tired", () =>
  expect(["avan", "s:tired", "future", true, false], "He won't be tired.", "அவன் டயர்டா இருக்க மாட்டான்.", "Avan tiredaa irukka maattaan."));
check("state past, we were at home", () =>
  expect(["naanga", "s:at-home", "past", false, false], "We were at home.", "நாங்க வீட்ல இருந்தோம்.", "Naanga veetla irundhom."));
check("dative, she's not scared", () =>
  expect(["ava", "f:scared", "present", true, false], "She's not scared.", "அவளுக்கு பயமா இல்ல.", "Avalukku bayamaa illa."));
check("dative past, you were hungry", () =>
  expect(["neenga", "f:hungry", "past", false, false], "You were hungry.", "உங்களுக்கு பசிச்சுது.", "Ungalukku pasichudhu."));
check("dative tpl, he has a headache", () =>
  expect(["avan", "f:headache", "present", false, false], "He has a headache.", "அவனுக்கு தலை வலிக்குது.", "Avanukku thalai valikkudhu."));
check("like with object", () =>
  expect(["avan", "f:like:0", "present", false, false], "He likes coffee.", "அவனுக்கு காபி பிடிக்கும்.", "Avanukku coffee pidikkum."));
check("doesn't want", () =>
  expect(["ava", "f:want:4", "present", true, false], "She doesn't want money.", "அவளுக்கு காசு வேண்டாம்.", "Avalukku kaasu vendaam."));
check("verb highlight splits at the changed syllable", () => {
  const r = gen("naan", "a:eat-rice", "present", false, false);
  const v = r.words[r.words.length - 1];
  assert.strictEqual(v.taBase, "சாப்பிட");
  assert.strictEqual(v.taHl, "றேன்");
  assert.strictEqual(v.tlHl, "en");
});

check("skip / only rules", () => {
  assert.strictEqual(gen("nee", "a:wait-you", "present", false, false), null);
  assert.strictEqual(gen("naan", "s:together", "present", false, false), null);
  assert.ok(gen("naanga", "s:together", "present", false, false));
  assert.strictEqual(gen("naan", "f:want:0", "past", false, false), null);
});

check("every stem with person endings ends in pulli", () => {
  for (const [k, vb] of Object.entries(LEX.verbs)) {
    for (const t of ["pres", "past", "fut"]) assert.ok(vb[t][0].endsWith("்"), `${k}.${t}: ${vb[t][0]}`);
  }
});

check("all combinations are well formed (and there are 10,000+)", () => {
  const all = B.allCombos();
  const badSign = /[\u0BCD][\u0BBE-\u0BCD]|[\u0B85-\u0B94][\u0BBE-\u0BCD]/; // vowel sign after pulli / vowel
  const keys = new Set();
  for (const o of all) {
    const r = B.generate(o);
    assert.ok(r, "null for " + JSON.stringify(o));
    assert.ok(!keys.has(r.key), "duplicate " + r.key);
    keys.add(r.key);
    assert.ok(!/[A-Za-z]/.test(r.ta), "Latin in Tamil: " + r.ta);
    assert.ok(!badSign.test(r.ta), "broken Tamil: " + r.ta);
    assert.ok(/^[\x20-\x7e]+$/.test(r.tl), "non-ASCII Tanglish: " + r.tl);
    assert.strictEqual(r.ta.split(" ").length, r.tl.split(" ").length, "word count: " + r.ta + " / " + r.tl);
    assert.ok(/^[A-Z].*\.$/.test(r.en) && !/\s\s|\{|\}/.test(r.en), "English: " + r.en);
    assert.ok(r.words.every((w) => w.ta && w.tl), "empty word in " + r.ta);
  }
  console.log(`     ${all.length} combinations from ${B.phrases.length} phrases`);
  assert.ok(all.length >= 10000, "only " + all.length);
});

// ---------- Telugu reference ----------
const te = (person, phrase, tense, neg, time) => B.generateTe({ person, phrase, tense, neg, time });
check("Telugu: I'm eating rice", () => assert.strictEqual(te("naan", "a:eat-rice", "present", false), "నేను అన్నం తింటున్నాను."));
check("Telugu: she is eating (…ోంది)", () => assert.strictEqual(te("ava", "a:eat-rice", "present", false), "ఆమె అన్నం తింటోంది."));
check("Telugu: you went home", () => assert.strictEqual(te("nee", "a:go-home", "past", false), "నువ్వు ఇంటికి వెళ్ళావు."));
check("Telugu: she went home (own past form)", () => assert.strictEqual(te("ava", "a:go-home", "past", false), "ఆమె ఇంటికి వెళ్ళింది."));
check("Telugu: they'll come to the party", () => assert.strictEqual(te("avanga", "a:come-party", "future", false), "వాళ్ళు పార్టీకి వస్తారు."));
check("Telugu: I didn't eat yesterday", () => assert.strictEqual(te("naan", "a:eat-rice", "past", true, true), "నేను నిన్న అన్నం తినలేదు."));
check("Telugu: he won't drink coffee", () => assert.strictEqual(te("avan", "a:drink-coffee", "future", true), "వాడు కాఫీ తాగడు."));
check("Telugu: we're happy / not happy / won't be", () => {
  assert.strictEqual(te("naanga", "s:happy", "present", false), "మేము సంతోషంగా ఉన్నాం.");
  assert.strictEqual(te("naan", "s:happy", "present", true), "నేను సంతోషంగా లేను.");
  assert.strictEqual(te("ava", "s:tired", "future", true), "ఆమె అలసటగా ఉండదు.");
});
check("Telugu: dative feelings", () => {
  assert.strictEqual(te("ava", "f:scared", "present", true), "ఆమెకి భయంగా లేదు.");
  assert.strictEqual(te("avan", "f:like:0", "present", false), "వాడికి కాఫీ ఇష్టం.");
  assert.strictEqual(te("naan", "f:know:0", "present", false), "నాకు తమిళం వచ్చు.");
});
check("Telugu: every combination has well-formed Telugu", () => {
  const brokenSign = /[\u0C3E-\u0C4D][\u0C3E-\u0C4C]|[\u0C05-\u0C14][\u0C3E-\u0C4D]|^[\u0C3E-\u0C4D]|\s[\u0C3E-\u0C4D]/;
  let n = 0;
  for (const o of B.allCombos()) {
    const t = B.generateTe(o);
    assert.ok(t, "no Telugu for " + JSON.stringify(o));
    assert.ok(/[\u0C00-\u0C7F]/.test(t) && !/[A-Za-z\u0B80-\u0BFF]|undefined|null/.test(t), "bad Telugu: " + t);
    assert.ok(!brokenSign.test(t), "broken Telugu: " + t);
    n++;
  }
  console.log(`     ${n} Telugu sentences`);
});

if (failures) { console.log(`\n${failures} failed`); process.exit(1); }
console.log("\nall builder tests passed");
