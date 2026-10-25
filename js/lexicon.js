// Vocabulary for the sentence builder (spoken Tamil).
//
// Verb stems end in a consonant + pulli (்). The builder swaps that pulli for a
// person ending, e.g. சாப்பிடற் + ேன் → சாப்பிடறேன் (saappidar + en → saappidaren).
// Each stem is [Tamil, Tanglish]. Keys:
//   pres / past / fut : stems that take person endings
//   inf               : infinitive, used with மாட்டேன் ("won't")
//   neg               : one form for "not doing / didn't do", same for every person
(function (root) {
  "use strict";

  const persons = [
    { id: "naan", ta: "நான்", tl: "naan", dat: "எனக்கு", datTl: "enakku", end: "en",
      en: "I", sm: "I'm", be: "am", was: "was", will: "I'll", do: "do", s: "", have: "have",
      label: "I", tag: "", datGloss: "to me" },
    { id: "nee", ta: "நீ", tl: "nee", dat: "உனக்கு", datTl: "unakku", end: "a",
      en: "you", sm: "you're", be: "are", was: "were", will: "you'll", do: "do", s: "", have: "have",
      label: "you", tag: "informal", datGloss: "to you" },
    { id: "neenga", ta: "நீங்க", tl: "neenga", dat: "உங்களுக்கு", datTl: "ungalukku", end: "eenga",
      en: "you", sm: "you're", be: "are", was: "were", will: "you'll", do: "do", s: "", have: "have",
      label: "you", tag: "respectful", datGloss: "to you (respectful)" },
    { id: "avan", ta: "அவன்", tl: "avan", dat: "அவனுக்கு", datTl: "avanukku", end: "aan",
      en: "he", sm: "he's", be: "is", was: "was", will: "he'll", do: "does", s: "s", have: "has",
      label: "he", tag: "", datGloss: "to him" },
    { id: "ava", ta: "அவ", tl: "ava", dat: "அவளுக்கு", datTl: "avalukku", end: "aa",
      en: "she", sm: "she's", be: "is", was: "was", will: "she'll", do: "does", s: "s", have: "has",
      label: "she", tag: "", datGloss: "to her" },
    { id: "avanga", ta: "அவங்க", tl: "avanga", dat: "அவங்களுக்கு", datTl: "avangalukku", end: "aanga",
      en: "they", sm: "they're", be: "are", was: "were", will: "they'll", do: "do", s: "", have: "have",
      label: "they", tag: "or respectful he/she", datGloss: "to them" },
    { id: "naanga", ta: "நாங்க", tl: "naanga", dat: "எங்களுக்கு", datTl: "engalukku", end: "om",
      en: "we", sm: "we're", be: "are", was: "were", will: "we'll", do: "do", s: "", have: "have",
      label: "we", tag: "", datGloss: "to us" },
  ];

  // Person endings: Tamil vowel sign that replaces the stem's pulli, and Tanglish suffix.
  const endings = {
    en: ["ேன்", "en"],
    a: ["", "a"],
    eenga: ["ீங்க", "eenga"],
    aan: ["ான்", "aan"],
    aa: ["ா", "aa"],
    aanga: ["ாங்க", "aanga"],
    om: ["ோம்", "om"],
  };

  const v = (pres, past, fut, inf, neg) => ({ pres, past, fut, inf, neg });

  const verbs = {
    eat: v(["சாப்பிடற்", "saappidar"], ["சாப்பிட்ட்", "saappitt"], ["சாப்பிடுவ்", "saappiduv"], ["சாப்பிட", "saappida"], ["சாப்பிடல", "saappidala"]),
    drink: v(["குடிக்கற்", "kudikkar"], ["குடிச்ச்", "kudich"], ["குடிப்ப்", "kudipp"], ["குடிக்க", "kudikka"], ["குடிக்கல", "kudikkala"]),
    see: v(["பாக்கற்", "paakkar"], ["பாத்த்", "paath"], ["பாப்ப்", "paapp"], ["பாக்க", "paakka"], ["பாக்கல", "paakkala"]),
    go: v(["போற்", "por"], ["போன்", "pon"], ["போவ்", "pov"], ["போக", "poga"], ["போகல", "pogala"]),
    come: v(["வர்", "var"], ["வந்த்", "vandh"], ["வருவ்", "varuv"], ["வர", "vara"], ["வரல", "varala"]),
    do: v(["பண்ற்", "panr"], ["பண்ண்", "pann"], ["பண்ணுவ்", "pannuv"], ["பண்ண", "panna"], ["பண்ணல", "pannala"]),
    read: v(["படிக்கற்", "padikkar"], ["படிச்ச்", "padich"], ["படிப்ப்", "padipp"], ["படிக்க", "padikka"], ["படிக்கல", "padikkala"]),
    sleep: v(["தூங்கற்", "thoongar"], ["தூங்குன்", "thoongun"], ["தூங்குவ்", "thoonguv"], ["தூங்க", "thoonga"], ["தூங்கல", "thoongala"]),
    talk: v(["பேசற்", "pesar"], ["பேசுன்", "pesun"], ["பேசுவ்", "pesuv"], ["பேச", "pesa"], ["பேசல", "pesala"]),
    buy: v(["வாங்கற்", "vaangar"], ["வாங்குன்", "vaangun"], ["வாங்குவ்", "vaanguv"], ["வாங்க", "vaanga"], ["வாங்கல", "vaangala"]),
    write: v(["எழுதற்", "ezhudhar"], ["எழுதுன்", "ezhudhun"], ["எழுதுவ்", "ezhudhuv"], ["எழுத", "ezhudha"], ["எழுதல", "ezhudhala"]),
    listen: v(["கேக்கற்", "kekkar"], ["கேட்ட்", "kett"], ["கேப்ப்", "kepp"], ["கேக்க", "kekka"], ["கேக்கல", "kekkala"]),
    play: v(["விளையாடற்", "vilaiyaadar"], ["விளையாடுன்", "vilaiyaadun"], ["விளையாடுவ்", "vilaiyaaduv"], ["விளையாட", "vilaiyaada"], ["விளையாடல", "vilaiyaadala"]),
    drive: v(["ஓட்டற்", "ottar"], ["ஓட்டுன்", "ottun"], ["ஓட்டுவ்", "ottuv"], ["ஓட்ட", "otta"], ["ஓட்டல", "ottala"]),
    wash: v(["கழுவற்", "kazhuvar"], ["கழுவுன்", "kazhuvun"], ["கழுவுவ்", "kazhuvuv"], ["கழுவ", "kazhuva"], ["கழுவல", "kazhuvala"]),
    launder: v(["துவைக்கற்", "thuvaikkar"], ["துவைச்ச்", "thuvaich"], ["துவைப்ப்", "thuvaipp"], ["துவைக்க", "thuvaikka"], ["துவைக்கல", "thuvaikkala"]),
    search: v(["தேடற்", "thedar"], ["தேடுன்", "thedun"], ["தேடுவ்", "theduv"], ["தேட", "theda"], ["தேடல", "thedala"]),
    wait: v(["காத்திருக்க்", "kaathirukk"], ["காத்திருந்த்", "kaathirundh"], ["காத்திருப்ப்", "kaathirupp"], ["காத்திருக்க", "kaathirukka"], ["காத்திருக்கல", "kaathirukkala"]),
    tell: v(["சொல்ற்", "solr"], ["சொன்ன்", "sonn"], ["சொல்லுவ்", "solluv"], ["சொல்ல", "solla"], ["சொல்லல", "sollala"]),
    cook: v(["சமைக்கற்", "samaikkar"], ["சமைச்ச்", "samaich"], ["சமைப்ப்", "samaipp"], ["சமைக்க", "samaikka"], ["சமைக்கல", "samaikkala"]),
    run: v(["ஓடற்", "odar"], ["ஓடுன்", "odun"], ["ஓடுவ்", "oduv"], ["ஓட", "oda"], ["ஓடல", "odala"]),
    walk: v(["நடக்கற்", "nadakkar"], ["நடந்த்", "nadandh"], ["நடப்ப்", "nadapp"], ["நடக்க", "nadakka"], ["நடக்கல", "nadakkala"]),
    learn: v(["கத்துக்கற்", "kathukkar"], ["கத்துக்கிட்ட்", "kathukkitt"], ["கத்துக்குவ்", "kathukkuv"], ["கத்துக்க", "kathukka"], ["கத்துக்கல", "kathukkala"]),
    send: v(["அனுப்பற்", "anuppar"], ["அனுப்புன்", "anuppun"], ["அனுப்புவ்", "anuppuv"], ["அனுப்ப", "anuppa"], ["அனுப்பல", "anuppala"]),
    open: v(["திறக்கற்", "thirakkar"], ["திறந்த்", "thirandh"], ["திறப்ப்", "thirapp"], ["திறக்க", "thirakka"], ["திறக்கல", "thirakkala"]),
    close: v(["மூடற்", "moodar"], ["மூடுன்", "moodun"], ["மூடுவ்", "mooduv"], ["மூட", "mooda"], ["மூடல", "moodala"]),
    pay: v(["கட்டற்", "kattar"], ["கட்டுன்", "kattun"], ["கட்டுவ்", "kattuv"], ["கட்ட", "katta"], ["கட்டல", "kattala"]),
    dance: v(["ஆடற்", "aadar"], ["ஆடுன்", "aadun"], ["ஆடுவ்", "aaduv"], ["ஆட", "aada"], ["ஆடல", "aadala"]),
    sing: v(["பாடற்", "paadar"], ["பாடுன்", "paadun"], ["பாடுவ்", "paaduv"], ["பாட", "paada"], ["பாடல", "paadala"]),
    bathe: v(["குளிக்கற்", "kulikkar"], ["குளிச்ச்", "kulich"], ["குளிப்ப்", "kulipp"], ["குளிக்க", "kulikka"], ["குளிக்கல", "kulikkala"]),
    give: v(["குடுக்கற்", "kudukkar"], ["குடுத்த்", "kuduth"], ["குடுப்ப்", "kudupp"], ["குடுக்க", "kudukka"], ["குடுக்கல", "kudukkala"]),
    take: v(["எடுக்கற்", "edukkar"], ["எடுத்த்", "eduth"], ["எடுப்ப்", "edupp"], ["எடுக்க", "edukka"], ["எடுக்கல", "edukkala"]),
    put: v(["போடற்", "podar"], ["போட்ட்", "pott"], ["போடுவ்", "poduv"], ["போட", "poda"], ["போடல", "podala"]),
    think: v(["யோசிக்கற்", "yosikkar"], ["யோசிச்ச்", "yosich"], ["யோசிப்ப்", "yosipp"], ["யோசிக்க", "yosikka"], ["யோசிக்கல", "yosikkala"]),
    laugh: v(["சிரிக்கற்", "sirikkar"], ["சிரிச்ச்", "sirich"], ["சிரிப்ப்", "siripp"], ["சிரிக்க", "sirikka"], ["சிரிக்கல", "sirikkala"]),
    cry: v(["அழுற்", "azhur"], ["அழுத்", "azhudh"], ["அழுவ்", "azhuv"], ["அழ", "azha"], ["அழல", "azhala"]),
    forgive: v(["மன்னிக்கற்", "mannikkar"], ["மன்னிச்ச்", "mannich"], ["மன்னிப்ப்", "mannipp"], ["மன்னிக்க", "mannikka"], ["மன்னிக்கல", "mannikkala"]),
    trust: v(["நம்பற்", "nambar"], ["நம்புன்", "nambun"], ["நம்புவ்", "nambuv"], ["நம்ப", "namba"], ["நம்பல", "nambala"]),
  };

  // "to be" with an adverb: நான் சந்தோஷமா இருக்கேன் (I'm happy).
  const iru = {
    pres: ["இருக்க்", "irukk"], past: ["இருந்த்", "irundh"], fut: ["இருப்ப்", "irupp"],
    inf: ["இருக்க", "irukka"], negPres: ["இல்ல", "illa"], negPast: ["இருக்கல", "irukkala"],
  };
  const maatt = ["மாட்ட்", "maatt"]; // won't: மாட்டேன், மாட்டான், ...

  const time = {
    present: ["இப்ப", "ippa", "now"],
    past: ["நேத்து", "nethu", "yesterday"],
    future: ["நாளைக்கு", "naalaikku", "tomorrow"],
  };

  // English verb forms: [base, 3rd person, -ing, past]
  const E = (base, s, ing, past) => ({ base, s, ing, past });
  // Action: [id, group, English verb, English object, Tamil verb key, Tamil object, Tanglish object, options]
  const A = (id, group, en, obj, verb, taObj, tlObj, opts) =>
    Object.assign({ id, group, en, obj, verb, taObj, tlObj }, opts || {});

  const eat = E("eat", "eats", "eating", "ate");
  const drink = E("drink", "drinks", "drinking", "drank");
  const go = E("go", "goes", "going", "went");
  const come = E("come", "comes", "coming", "came");
  const watch = E("watch", "watches", "watching", "watched");
  const play = E("play", "plays", "playing", "played");
  const listen = E("listen", "listens", "listening", "listened");
  const buy = E("buy", "buys", "buying", "bought");
  const send = E("send", "sends", "sending", "sent");
  const pay = E("pay", "pays", "paying", "paid");
  const call = E("call", "calls", "calling", "called");
  const talk = E("talk", "talks", "talking", "talked");
  const read = E("read", "reads", "reading", "read");
  const cook = E("cook", "cooks", "cooking", "cooked");
  const tell = E("tell", "tells", "telling", "told");
  const take = E("take", "takes", "taking", "took");
  const wait = E("wait", "waits", "waiting", "waited");

  const actions = [
    // Food & drink
    A("eat-rice", "Food & drink", eat, "rice", "eat", "சோறு", "soru"),
    A("eat-breakfast", "Food & drink", eat, "breakfast", "eat", "டிபன்", "tiffin"),
    A("eat-biryani", "Food & drink", eat, "biryani", "eat", "பிரியாணி", "biriyaani"),
    A("eat-dosa", "Food & drink", eat, "dosa", "eat", "தோசை", "dosai"),
    A("drink-coffee", "Food & drink", drink, "coffee", "drink", "காபி", "coffee"),
    A("drink-tea", "Food & drink", drink, "tea", "drink", "டீ", "tea"),
    A("drink-water", "Food & drink", drink, "water", "drink", "தண்ணி", "thanni"),
    A("drink-juice", "Food & drink", drink, "juice", "drink", "ஜூஸ்", "juice"),
    A("cook-dinner", "Food & drink", cook, "dinner", "cook", "ராத்திரி சாப்பாடு", "raathiri saappaadu"),
    A("cook-chicken", "Food & drink", cook, "chicken", "cook", "சிக்கன்", "chicken"),
    A("make-tea", "Food & drink", E("make", "makes", "making", "made"), "tea", "put", "டீ", "tea"),
    A("buy-vegetables", "Food & drink", buy, "vegetables", "buy", "காய்கறி", "kaaikari"),
    A("buy-milk", "Food & drink", buy, "milk", "buy", "பால்", "paal"),
    A("order-food", "Food & drink", E("order", "orders", "ordering", "ordered"), "food", "do", "சாப்பாடு ஆர்டர்", "saappaadu order"),
    A("take-medicine", "Food & drink", take, "medicine", "eat", "மாத்திரை", "maathirai"),

    // At home
    A("wash-dishes", "At home", E("wash", "washes", "washing", "washed"), "the dishes", "wash", "பாத்திரம்", "paathiram"),
    A("wash-clothes", "At home", E("wash", "washes", "washing", "washed"), "the clothes", "launder", "துணி", "thuni"),
    A("clean-house", "At home", E("clean", "cleans", "cleaning", "cleaned"), "the house", "do", "வீட்ட சுத்தம்", "veetta suththam"),
    A("open-door", "At home", E("open", "opens", "opening", "opened"), "the door", "open", "கதவ", "kadhava"),
    A("close-window", "At home", E("close", "closes", "closing", "closed"), "the window", "close", "ஜன்னல", "jannala"),
    A("take-shower", "At home", take, "a shower", "bathe", "", ""),
    A("sleep-early", "At home", E("sleep", "sleeps", "sleeping", "slept"), "early", "sleep", "சீக்கிரம்", "seekkiram", { noTime: true }),
    A("light-on", "At home", E("switch on", "switches on", "switching on", "switched on"), "the light", "put", "லைட்ட", "light-a"),
    A("fan-on", "At home", E("switch on", "switches on", "switching on", "switched on"), "the fan", "put", "ஃபேன", "fan-a"),
    A("pay-bill", "At home", pay, "the bill", "pay", "பில்", "bill"),
    A("pay-rent", "At home", pay, "the rent", "pay", "வாடகை", "vaadagai"),
    A("look-keys", "At home", E("look for", "looks for", "looking for", "looked for"), "my keys", "search", "என் சாவிய", "en saaviya"),

    // Work & study
    A("work", "Work & study", E("work", "works", "working", "worked"), "", "see", "வேலை", "velai"),
    A("study", "Work & study", E("study", "studies", "studying", "studied"), "", "read", "", ""),
    A("read-book", "Work & study", read, "a book", "read", "புக்", "book"),
    A("read-paper", "Work & study", read, "the newspaper", "read", "பேப்பர்", "paper"),
    A("write-letter", "Work & study", E("write", "writes", "writing", "wrote"), "a letter", "write", "லெட்டர்", "letter"),
    A("send-email", "Work & study", send, "an email", "send", "மெயில்", "mail"),
    A("send-message", "Work & study", send, "a message", "send", "மெசேஜ்", "message"),
    A("send-money", "Work & study", send, "money", "send", "காசு", "kaasu"),
    A("learn-tamil", "Work & study", E("learn", "learns", "learning", "learned"), "Tamil", "learn", "தமிழ்", "thamizh"),
    A("learn-driving", "Work & study", E("learn", "learns", "learning", "learned"), "to drive", "learn", "டிரைவிங்", "driving"),

    // Going places
    A("go-office", "Going places", go, "to the office", "go", "ஆபீஸுக்கு", "officekku"),
    A("go-home", "Going places", go, "home", "go", "வீட்டுக்கு", "veettukku"),
    A("go-market", "Going places", go, "to the market", "go", "மார்க்கெட்டுக்கு", "marketukku"),
    A("go-temple", "Going places", go, "to the temple", "go", "கோயிலுக்கு", "koyilukku"),
    A("go-beach", "Going places", go, "to the beach", "go", "பீச்சுக்கு", "beachukku"),
    A("go-movies", "Going places", go, "to the movies", "go", "படத்துக்கு", "padathukku"),
    A("go-school", "Going places", go, "to school", "go", "ஸ்கூலுக்கு", "schoolukku"),
    A("go-hospital", "Going places", go, "to the hospital", "go", "ஆஸ்பத்திரிக்கு", "aaspathirikku"),
    A("go-meeting", "Going places", go, "to the meeting", "go", "மீட்டிங்குக்கு", "meetingukku"),
    A("come-home", "Going places", come, "home", "come", "வீட்டுக்கு", "veettukku"),
    A("come-party", "Going places", come, "to the party", "come", "பார்ட்டிக்கு", "partykku"),
    A("come-your-house", "Going places", come, "to your house", "come", "உங்க வீட்டுக்கு", "unga veettukku", { skip: ["nee", "neenga"] }),
    A("come-late", "Going places", come, "late", "come", "லேட்டா", "late-aa", { noTime: true }),

    // Fun
    A("watch-movie", "Fun", watch, "a movie", "see", "படம்", "padam"),
    A("watch-tv", "Fun", watch, "TV", "see", "டிவி", "TV"),
    A("watch-cricket", "Fun", watch, "cricket", "see", "கிரிக்கெட்", "cricket"),
    A("play-cricket", "Fun", play, "cricket", "play", "கிரிக்கெட்", "cricket"),
    A("play-football", "Fun", play, "football", "play", "ஃபுட்பால்", "football"),
    A("play-kids", "Fun", play, "with the kids", "play", "பசங்க கூட", "pasanga kooda"),
    A("listen-music", "Fun", listen, "to music", "listen", "பாட்டு", "paattu"),
    A("listen-radio", "Fun", listen, "to the radio", "listen", "ரேடியோ", "radio"),
    A("sing-song", "Fun", E("sing", "sings", "singing", "sang"), "a song", "sing", "ஒரு பாட்டு", "oru paattu"),
    A("dance", "Fun", E("dance", "dances", "dancing", "danced"), "", "dance", "டான்ஸ்", "dance"),
    A("walk", "Fun", E("walk", "walks", "walking", "walked"), "", "walk", "", ""),
    A("run-park", "Fun", E("run", "runs", "running", "ran"), "in the park", "run", "பார்க்ல", "parkla"),
    A("drive-car", "Fun", E("drive", "drives", "driving", "drove"), "the car", "drive", "கார்", "car"),
    A("ride-bike", "Fun", E("ride", "rides", "riding", "rode"), "the bike", "drive", "பைக்", "bike"),
    A("take-photos", "Fun", take, "photos", "take", "ஃபோட்டோ", "photo"),
    A("shop", "Fun", E("shop", "shops", "shopping", "shopped"), "", "do", "ஷாப்பிங்", "shopping"),

    // People
    A("call-mom", "People", call, "mom", "do", "அம்மாவுக்கு ஃபோன்", "ammaavukku phone"),
    A("call-friend", "People", call, "my friend", "do", "என் ஃப்ரெண்டுக்கு ஃபோன்", "en friendukku phone"),
    A("talk-sister", "People", talk, "to my sister", "talk", "என் தங்கச்சி கூட", "en thangachi kooda"),
    A("talk-manager", "People", talk, "to the manager", "talk", "மேனேஜர் கூட", "manager kooda"),
    A("meet-friends", "People", E("meet", "meets", "meeting", "met"), "my friends", "see", "என் ஃப்ரெண்ட்ஸ", "en friends-a"),
    A("help-mom", "People", E("help", "helps", "helping", "helped"), "my mother", "do", "என் அம்மாவுக்கு உதவி", "en ammaavukku udhavi"),
    A("visit-grandparents", "People", E("visit", "visits", "visiting", "visited"), "my grandparents", "see", "தாத்தா பாட்டிய", "thaatha paattiya"),
    A("wait-bus", "People", wait, "for the bus", "wait", "பஸ்ஸுக்கு", "bussukku"),
    A("wait-you", "People", wait, "for you", "wait", "உனக்காக", "unakkaaga", { skip: ["nee", "neenga"] }),
    A("tell-truth", "People", tell, "the truth", "tell", "உண்மைய", "unmaiya"),
    A("tell-story", "People", tell, "a story", "tell", "ஒரு கதை", "oru kadhai"),
    A("give-gift", "People", E("give", "gives", "giving", "gave"), "a gift", "give", "ஒரு கிஃப்ட்", "oru gift"),
    A("forgive-him", "People", E("forgive", "forgives", "forgiving", "forgave"), "him", "forgive", "அவன", "avana", { skip: ["avan"] }),
    A("trust-her", "People", E("trust", "trusts", "trusting", "trusted"), "her", "trust", "அவள", "avala", { skip: ["ava"] }),
    A("fight-brother", "People", E("fight", "fights", "fighting", "fought"), "with my brother", "put", "என் தம்பி கூட சண்டை", "en thambi kooda sandai"),
    A("miss-home", "People", E("miss", "misses", "missing", "missed"), "home", "do", "வீட்ட மிஸ்", "veetta miss"),
    A("think-about-it", "People", E("think", "thinks", "thinking", "thought"), "about it", "think", "அத பத்தி", "adha pathi"),
    A("laugh", "People", E("laugh", "laughs", "laughing", "laughed"), "", "laugh", "", ""),
    A("cry", "People", E("cry", "cries", "crying", "cried"), "", "cry", "", ""),
  ];

  // "I am …" states with இரு: [id, English, Tamil adverb, Tanglish, options]
  const S = (id, en, ta, tl, opts) => Object.assign({ id, en, ta, tl }, opts || {});
  const states = [
    S("happy", "happy", "சந்தோஷமா", "santhoshamaa"),
    S("sad", "sad", "சோகமா", "sogamaa"),
    S("angry", "angry", "கோபமா", "kobamaa"),
    S("tired", "tired", "டயர்டா", "tiredaa"),
    S("busy", "busy", "பிஸியா", "busyaa"),
    S("free", "free", "ஃப்ரீயா", "freeyaa"),
    S("ready", "ready", "ரெடியா", "readyaa"),
    S("fine", "fine", "நல்லா", "nallaa"),
    S("alone", "alone", "தனியா", "thaniyaa"),
    S("calm", "calm", "அமைதியா", "amaidhiyaa"),
    S("careful", "careful", "கவனமா", "kavanamaa"),
    S("brave", "brave", "தைரியமா", "thairiyamaa"),
    S("quiet", "quiet", "சைலண்டா", "silentaa"),
    S("safe", "safe", "பத்திரமா", "pathiramaa"),
    S("healthy", "healthy", "ஆரோக்கியமா", "aarokkiyamaa"),
    S("single", "single", "சிங்கிளா", "singlaa"),
    S("honest", "honest", "நேர்மையா", "nermaiyaa"),
    S("patient", "patient", "பொறுமையா", "porumaiyaa"),
    S("at-home", "at home", "வீட்ல", "veetla"),
    S("here", "here", "இங்க", "inga"),
    S("there", "there", "அங்க", "anga"),
    S("at-office", "at the office", "ஆபீஸ்ல", "officela"),
    S("in-chennai", "in Chennai", "சென்னைல", "chennaila"),
    S("together", "together", "ஒண்ணா", "onnaa", { only: ["neenga", "avanga", "naanga"] }),
  ];

  // "I feel …" (dative): எனக்கு பயமா இருக்கு. The verb stays in the "it" form.
  // forms: [Tamil, Tanglish] for pres / negPres / past / negPast / fut / negFut (null = not used)
  const F = (pres, negPres, past, negPast, fut, negFut) => ({ pres, negPres, past, negPast, fut, negFut });
  const iruIt = F(["இருக்கு", "irukku"], ["இல்ல", "illa"], ["இருந்துச்சு", "irundhuchu"], ["இருக்கல", "irukkala"], ["இருக்கும்", "irukkum"], ["இருக்காது", "irukkaadhu"]);
  const D = (id, group, label, head, forms, verbGloss, en, opts) =>
    Object.assign({ id, group, label, head, forms, verbGloss, en }, opts || {});
  const adjFeel = (id, en, ta, tl) => D(id, "Feelings (I feel…)", `feel ${en}`, [ta, tl, en], iruIt, "be", { adj: en });
  const O = (en, ta, tl) => ({ en, ta, tl });

  const feelings = [
    adjFeel("scared", "scared", "பயமா", "bayamaa"),
    adjFeel("shy", "shy", "வெட்கமா", "vetkamaa"),
    adjFeel("surprised", "surprised", "ஆச்சரியமா", "aachariyamaa"),
    adjFeel("jealous", "jealous", "பொறாமையா", "poraamaiyaa"),
    adjFeel("worried", "worried", "கவலையா", "kavalaiyaa"),
    adjFeel("confused", "confused", "குழப்பமா", "kuzhappamaa"),
    adjFeel("proud", "proud", "பெருமையா", "perumaiyaa"),
    adjFeel("lonely", "lonely", "தனிமையா", "thanimaiyaa"),
    adjFeel("thirsty", "thirsty", "தாகமா", "thaagamaa"),
    D("hungry", "Feelings (I feel…)", "be hungry", null,
      F(["பசிக்குது", "pasikkudhu"], ["பசிக்கல", "pasikkala"], ["பசிச்சுது", "pasichudhu"], ["பசிக்கல", "pasikkala"], ["பசிக்கும்", "pasikkum"], ["பசிக்காது", "pasikkaadhu"]),
      "be hungry", { adj: "hungry" }),
    D("sleepy", "Feelings (I feel…)", "be sleepy", ["தூக்கம்", "thookkam", "sleep"],
      F(["வருது", "varudhu"], ["வரல", "varala"], ["வந்துச்சு", "vandhuchu"], ["வரல", "varala"], ["வரும்", "varum"], ["வராது", "varaadhu"]),
      "come", { adj: "sleepy" }),
    D("bored", "Feelings (I feel…)", "be bored", ["போர்", "bore", "boredom"],
      F(["அடிக்குது", "adikkudhu"], ["அடிக்கல", "adikkala"], ["அடிச்சுது", "adichudhu"], ["அடிக்கல", "adikkala"], ["அடிக்கும்", "adikkum"], ["அடிக்காது", "adikkaadhu"]),
      "hit", { adj: "bored" }),
    D("cold", "Feelings (I feel…)", "feel cold", null,
      F(["குளிருது", "kulirudhu"], ["குளிரல", "kulirala"], ["குளிருச்சு", "kuliruchu"], ["குளிரல", "kulirala"], ["குளிரும்", "kulirum"], ["குளிராது", "kuliraadhu"]),
      "feel cold", { adj: "cold" }),
    D("headache", "Feelings (I feel…)", "have a headache", ["தலை", "thalai", "head"],
      F(["வலிக்குது", "valikkudhu"], ["வலிக்கல", "valikkala"], ["வலிச்சுது", "valichudhu"], ["வலிக்கல", "valikkala"], ["வலிக்கும்", "valikkum"], ["வலிக்காது", "valikkaadhu"]),
      "ache", { tpl: {
        pres: "{S} {have} a headache", negPres: "{S} {do}n't have a headache",
        past: "{S} had a headache", negPast: "{S} didn't have a headache",
        fut: "{will} have a headache", negFut: "{S} won't have a headache" } }),
    D("stomachache", "Feelings (I feel…)", "have a stomach ache", ["வயிறு", "vayiru", "stomach"],
      F(["வலிக்குது", "valikkudhu"], ["வலிக்கல", "valikkala"], ["வலிச்சுது", "valichudhu"], ["வலிக்கல", "valikkala"], ["வலிக்கும்", "valikkum"], ["வலிக்காது", "valikkaadhu"]),
      "ache", { tpl: {
        pres: "{S} {have} a stomach ache", negPres: "{S} {do}n't have a stomach ache",
        past: "{S} had a stomach ache", negPast: "{S} didn't have a stomach ache",
        fut: "{will} have a stomach ache", negFut: "{S} won't have a stomach ache" } }),
    D("get-angry", "Feelings (I feel…)", "get angry", ["கோபம்", "kobam", "anger"],
      F(["வருது", "varudhu"], ["வரல", "varala"], ["வந்துச்சு", "vandhuchu"], ["வரல", "varala"], ["வரும்", "varum"], ["வராது", "varaadhu"]),
      "come", { tpl: {
        pres: "{sm} getting angry", negPres: "{sm} not getting angry",
        past: "{S} got angry", negPast: "{S} didn't get angry",
        fut: "{will} get angry", negFut: "{S} won't get angry" } }),
    D("understand", "Feelings (I feel…)", "understand", null,
      F(["புரியுது", "puriyudhu"], ["புரியல", "puriyala"], ["புரிஞ்சுது", "purinjudhu"], ["புரியல", "puriyala"], ["புரியும்", "puriyum"], ["புரியாது", "puriyaadhu"]),
      "understand", { tpl: {
        pres: "{S} understand{s}", negPres: "{S} {do}n't understand",
        past: "{S} understood", negPast: "{S} didn't understand",
        fut: "{will} understand", negFut: "{S} won't understand" } }),
    D("remember", "Feelings (I feel…)", "remember", ["ஞாபகம்", "nyaabagam", "memory"],
      iruIt, "be", { tpl: {
        pres: "{S} remember{s}", negPres: "{S} {do}n't remember",
        past: "{S} remembered", negPast: "{S} didn't remember",
        fut: "{will} remember", negFut: "{S} won't remember" } }),
    D("like", "Likes, wants & know-how", "like", null,
      F(["பிடிக்கும்", "pidikkum"], ["பிடிக்காது", "pidikkaadhu"], ["பிடிச்சுது", "pidichudhu"], ["பிடிக்கல", "pidikkala"], null, null),
      "like", { tpl: {
        pres: "{S} like{s} {obj}", negPres: "{S} {do}n't like {obj}",
        past: "{S} liked {obj}", negPast: "{S} didn't like {obj}" } },
      { noTime: true, objects: [
        O("coffee", "காபி", "coffee"), O("rain", "மழை", "mazhai"), O("this song", "இந்த பாட்டு", "indha paattu"),
        O("biryani", "பிரியாணி", "biriyaani"), O("cricket", "கிரிக்கெட்", "cricket"), O("movies", "சினிமா", "cinema"),
        O("Tamil", "தமிழ்", "thamizh"), O("dogs", "நாய்", "naai"), O("sweets", "ஸ்வீட்", "sweet"), O("traveling", "டிராவல்", "travel"),
      ] }),
    D("want", "Likes, wants & know-how", "want", null,
      F(["வேணும்", "venum"], ["வேண்டாம்", "vendaam"], null, null, null, null),
      "want", { tpl: { pres: "{S} want{s} {obj}", negPres: "{S} {do}n't want {obj}" } },
      { noTime: true, objects: [
        O("coffee", "காபி", "coffee"), O("water", "தண்ணி", "thanni"), O("tea", "டீ", "tea"),
        O("some rest", "கொஞ்சம் ரெஸ்ட்", "konjam rest"), O("money", "காசு", "kaasu"), O("a new phone", "புது ஃபோன்", "pudhu phone"),
        O("a holiday", "லீவு", "leevu"), O("help", "உதவி", "udhavi"),
      ] }),
    D("know", "Likes, wants & know-how", "know", null,
      F(["தெரியும்", "theriyum"], ["தெரியாது", "theriyaadhu"], null, null, null, null),
      "know", { tpl: { pres: "{S} know{s} {obj}", negPres: "{S} {do}n't know {obj}" } },
      { noTime: true, objects: [
        O("Tamil", "தமிழ்", "thamizh"), O("English", "இங்கிலீஷ்", "English"), O("how to swim", "நீச்சல்", "neechal"),
        O("how to drive", "டிரைவிங்", "driving"), O("how to cook", "சமையல்", "samaiyal"),
      ] }),
  ];

  const LEX = { persons, endings, verbs, iru, maatt, time, actions, states, feelings };
  root.PP_LEX = LEX;
  if (typeof module !== "undefined" && module.exports) module.exports = LEX;
})(typeof window !== "undefined" ? window : globalThis);
