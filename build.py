#!/usr/bin/env python3
"""Build data.js from data/categories.json, data/sentences/<id>.tsv and data/words.tsv.

Usage:
    python3 build.py           # write data.js
    python3 build.py --check   # exit 1 if data.js is out of date (no write)

Sentence files: one sentence per line, three fields separated by " | ":
    English | Tamil (spoken, Tamil script) | Tanglish (romanized)
Blank lines and lines starting with "#" are ignored.

Rules checked here:
  - the Tamil field uses Tamil script only (no Latin letters, no zero-width characters)
  - the Tanglish field is plain ASCII
  - Tamil and Tanglish have the same number of words (word-by-word breakdown and the
    "build the sentence" game rely on this)
  - no duplicate English sentence within a category

words.tsv: "Tamil word | meaning", used for tap-a-word meanings.
No third-party dependencies; needs Python 3.8+.
"""

import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
OUT = ROOT / "data.js"

TAMIL = re.compile(r"[\u0B80-\u0BFF]")
TELUGU = re.compile(r"[\u0C00-\u0C7F]")
LATIN = re.compile(r"[A-Za-z]")
ZERO_WIDTH = re.compile(r"[\u200B-\u200D\uFEFF]")
TANGLISH_OK = re.compile(r"^[A-Za-z0-9 ,.!?'\-]+$")
EDGE_PUNCT = ".,!?"


class BuildError(Exception):
    pass


def sentence_id(cat, english):
    # Stable across reordering, so saved progress survives edits elsewhere in the file.
    digest = hashlib.sha1(english.strip().lower().encode("utf-8")).hexdigest()[:8]
    return f"{cat}-{digest}"


def load_categories():
    cats = json.loads((DATA / "categories.json").read_text(encoding="utf-8"))
    seen = set()
    for c in cats:
        for key in ("id", "name", "ta", "tl", "emoji", "colors", "adult"):
            if key not in c:
                raise BuildError(f"categories.json: '{c.get('id', '?')}' is missing '{key}'")
        if c["id"] in seen:
            raise BuildError(f"categories.json: duplicate id '{c['id']}'")
        seen.add(c["id"])
    return cats


def load_sentences(cat_id):
    path = DATA / "sentences" / f"{cat_id}.tsv"
    if not path.exists():
        raise BuildError(f"missing {path.relative_to(ROOT)}")
    out, english_seen, ids = [], set(), set()
    for number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        where = f"{path.relative_to(ROOT)}:{number}"
        parts = [p.strip() for p in line.split(" | ")]
        if len(parts) != 3 or not all(parts):
            raise BuildError(f"{where}: expected 'English | Tamil | Tanglish'")
        en, ta, tl = parts
        if ZERO_WIDTH.search(ta) or ZERO_WIDTH.search(tl):
            raise BuildError(f"{where}: remove zero-width characters")
        if not TAMIL.search(ta) or LATIN.search(ta):
            raise BuildError(f"{where}: the Tamil field must be Tamil script only: {ta}")
        if not TANGLISH_OK.match(tl):
            raise BuildError(f"{where}: Tanglish must be plain ASCII letters/punctuation: {tl}")
        if len(ta.split()) != len(tl.split()):
            raise BuildError(
                f"{where}: Tamil has {len(ta.split())} words but Tanglish has {len(tl.split())}"
            )
        key = en.lower()
        if key in english_seen:
            raise BuildError(f"{where}: duplicate English sentence: {en}")
        english_seen.add(key)
        sid = sentence_id(cat_id, en)
        if sid in ids:
            raise BuildError(f"{where}: id collision for {en}")
        ids.add(sid)
        out.append({"id": sid, "en": en, "ta": ta, "tl": tl})
    return out


def load_glossary():
    path = DATA / "words.tsv"
    glossary = {}
    for number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        where = f"data/words.tsv:{number}"
        parts = [p.strip() for p in line.split(" | ")]
        if not 2 <= len(parts) <= 4 or not all(parts):
            raise BuildError(f"{where}: expected 'Tamil | meaning [| Telugu [| ≈ or ⚠ note]]'")
        word, meaning = parts[0], parts[1]
        if LATIN.search(word) or not TAMIL.search(word) or any(ch in word for ch in EDGE_PUNCT):
            raise BuildError(f"{where}: bad Tamil word: {word}")
        if word in glossary:
            raise BuildError(f"{where}: duplicate word: {word}")
        entry = {"m": meaning}
        if len(parts) >= 3:
            te = parts[2]
            if not TELUGU.search(te) or LATIN.search(te) or TAMIL.search(te):
                raise BuildError(f"{where}: the Telugu field must be Telugu script only: {te}")
            entry["te"] = te
        if len(parts) == 4:
            mark = parts[3]
            if mark == "≈":
                entry["sim"] = True  # sounds like the Telugu word
            elif mark.startswith("⚠"):
                entry["warn"] = mark.lstrip("⚠ ").strip()  # false friend: explain the trap
            else:
                raise BuildError(f"{where}: 4th field must be '≈' or '⚠ note'")
        glossary[word] = entry
    return glossary


def load_telugu(cat_id, sentences):
    """Attach optional Telugu reference lines: data/telugu/<id>.tsv, 'English | Telugu'.

    Telugu is only a reference shown next to the English (the learner is learning Tamil),
    so it's matched to the Tamil sentence by its English text.
    """
    path = DATA / "telugu" / f"{cat_id}.tsv"
    if not path.exists():
        return 0
    by_en = {s["en"].lower(): s for s in sentences}
    seen = set()
    for number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        where = f"{path.relative_to(ROOT)}:{number}"
        parts = [p.strip() for p in line.split(" | ")]
        if len(parts) != 2 or not all(parts):
            raise BuildError(f"{where}: expected 'English | Telugu'")
        en, te = parts
        # Telugu legitimately uses ZWNJ/ZWJ for half-forms (సర్‌ప్రైజ్); only reject
        # zero-width spaces and BOMs.
        if re.search(r"[\u200B\uFEFF]", te):
            raise BuildError(f"{where}: remove zero-width spaces")
        if not TELUGU.search(te) or LATIN.search(te) or TAMIL.search(te):
            raise BuildError(f"{where}: the Telugu field must be Telugu script only: {te}")
        key = en.lower()
        if key not in by_en:
            raise BuildError(f"{where}: no {cat_id} sentence with this English: {en}")
        if key in seen:
            raise BuildError(f"{where}: duplicate Telugu line for: {en}")
        seen.add(key)
        by_en[key]["te"] = te
    return len(seen)


# Common spoken-Tamil endings. When a word isn't in words.tsv, try removing an ending
# and look up the base word: எக்ஸாம்ல = எக்ஸாம் (exam) + ல (in).
# (ending, what to put back on the base, meaning of the ending, Telugu equivalent)
SUFFIXES = [
    ("லேர்ந்து", "", "from", "నుంచి"),
    ("ுக்குள்ள", "்", "inside / between", "లోపల"),
    ("க்குள்ள", "", "inside / between", "లోపల"),
    ("த்துக்கு", "ம்", "to / for", "కి"),
    ("த்துல", "ம்", "in", "లో"),
    ("ன்னு", "", "(saying) that", "అని"),
    ("னு", "", "(saying) that", "అని"),
    ("யே", "", "(emphasis: even / itself)", "ే"),
    ("ே", "்", "(emphasis: even / itself)", "ే"),
    ("ே", "ு", "(emphasis: even / itself)", "ే"),
    ("யா", "", "(-ly / as, or a ? question)", "గా / ఆ?"),
    ("ா", "்", "(-ly / as, or a ? question)", "గా / ఆ?"),
    ("ுக்காக", "்", "for", "కోసం"),
    ("க்காக", "", "for", "కోసం"),
    ("ுக்கு", "்", "to / for", "కి"),
    ("க்கு", "", "to / for", "కి"),
    ("கிட்ட", "", "with / to (someone)", "దగ్గర"),
    ("ல்ல", "ல்", "in", "లో"),
    ("ுல", "ு", "in", "లో"),
    ("ல", "", "in", "లో"),
    ("தான்", "", "(emphasis: it's / only)", "ే"),
    ("ும்", "ு", "also / and", "కూడా"),
    ("ோட", "்", "of / 's", "యొక్క"),
]
VOWEL_SIGNS = set(chr(c) for c in range(0x0BBE, 0x0BCD))
PULLI = "\u0BCD"


def derive(token, glossary):
    """Explain a word that isn't in words.tsv via a known base word + ending."""
    for ending, restore, meaning, te in SUFFIXES:
        if token.endswith(ending) and len(token) > len(ending) + 1:
            base = token[: -len(ending)] + restore
            # "ல" (in) only follows a noun ending in ் or a vowel sign (எக்ஸாம்ல, காலைல);
            # after a bare consonant it's usually a negative verb (சொல்லல = didn't say).
            if ending == "ல" and base[-1] != PULLI and base[-1] not in VOWEL_SIGNS:
                continue
            if base in glossary:
                # After a verb (பாக்கலாம், போகும்) a final ஆ makes a question.
                if ending in ("ா", "யா") and base.endswith(("லாம்", "ும்")):
                    return base, ending, "(? question)", "ఆ?"
                return base, ending, meaning, te
    # Object form: ஃபோன = ஃபோன் + அ, லைட்ட = லைட் + அ, கைய = கை + அ
    last = token[-1]
    if "\u0B95" <= last <= "\u0BB9":
        if len(token) >= 3 and token[-2] == PULLI and token[-3] == last:
            base = token[:-1]
        elif last == "ய" and len(token) >= 2 and token[-2] in VOWEL_SIGNS:
            base = token[:-1]
        else:
            base = token + PULLI
        if base in glossary:
            return base, "அ", "(as object)", "ని"
        # நேரத்த = நேரம் + அ
        if token.endswith("த்த") and token[:-3] + "ம்" in glossary:
            return token[:-3] + "ம்", "அ", "(as object)", "ని"
    return None


def add_derived_words(cats, glossary):
    """Add an entry for every sentence word that's explained by base + ending."""
    for c in cats:
        for s in c["sentences"]:
            for w in s["ta"].split():
                w = w.strip(EDGE_PUNCT)
                if w in glossary:
                    continue
                found = derive(w, glossary)
                if not found:
                    continue
                base, ending, meaning, te_end = found
                g = glossary[base]
                entry = {"m": f"{g['m']} + {meaning}", "base": base, "end": ending}
                if "te" in g:
                    entry["te"] = f"{g['te'].split(' / ')[0]} + {te_end}"
                if g.get("sim"):
                    entry["sim"] = True
                glossary[w] = entry


def coverage(cats, glossary):
    total = known = 0
    for c in cats:
        for s in c["sentences"]:
            for w in s["ta"].split():
                total += 1
                known += w.strip(EDGE_PUNCT) in glossary
    return known, total


def build():
    cats = load_categories()
    total = 0
    for c in cats:
        c["sentences"] = load_sentences(c["id"])
        c["teCount"] = load_telugu(c["id"], c["sentences"])
        total += len(c["sentences"])
    glossary = load_glossary()
    hand = len(glossary)
    add_derived_words(cats, glossary)
    known, words = coverage(cats, glossary)
    build.stats = f"; word meanings: {hand} words + {len(glossary) - hand} via endings, cover {known}/{words} taps ({known * 100 // words}%)"
    payload = {"categories": cats, "glossary": glossary}
    body = json.dumps(payload, ensure_ascii=False, indent=1)
    js = (
        "// GENERATED by build.py from data/. Don't edit by hand: edit data/ and run\n"
        "// `python3 build.py`.\n"
        f"window.PP_DATA = {body};\n"
    )
    return js, cats, total


def main():
    check = "--check" in sys.argv[1:]
    try:
        js, cats, total = build()
    except BuildError as e:
        print(f"build.py: error: {e}", file=sys.stderr)
        return 2
    summary = ", ".join(f"{c['id']} {len(c['sentences'])}" for c in cats)
    te_total = sum(c["teCount"] for c in cats)
    summary += f"; Telugu reference for {te_total}/{total}" + getattr(build, "stats", "")
    current = OUT.read_text(encoding="utf-8") if OUT.exists() else None
    if check:
        if current != js:
            print("data.js is out of date. Run: python3 build.py", file=sys.stderr)
            return 1
        print(f"data.js is up to date ({total} sentences: {summary}).")
        return 0
    if current != js:
        OUT.write_text(js, encoding="utf-8")
    print(f"Wrote data.js ({total} sentences: {summary}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
