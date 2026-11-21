// ===== Future Me Island — Daily Star =====
// One real feel-good news story a day. Read how it starts, type how you think it ended,
// and earn coins for how close you get. Each story is paraphrased from the linked article.
//
// Scoring: each story lists the "beats" of its real ending. A beat counts if the guess
// contains any of its words (matched at the start of a word, so "marri" matches "married").

const STARS = [
  {
    source: 'Good News Network', date: 'Feb 2025',
    url: 'https://www.goodnewsnetwork.org/stranger-pays-familys-breakfast-bill-and-writes-heartfelt-note-praising-dad/',
    setup: "An ER doctor in Fort Worth, Texas, still in his hospital scrubs, takes his wife and three kids out for breakfast. He spends the meal playing a little dot game with his children. As the family gets ready to pay, their waitress walks over to the table holding the receipt...",
    ending: "The $85 bill had already been paid by a stranger. On the receipt was a handwritten note: \"Thank you for being a great dad.\" On the back, a longer message began \"From a dad to dad\" and was signed by a retired Army medic. The doctor said he welled up right away. \"It was just $85 to them, but to me it was so much more.\"",
    beats: [
      { label: 'A stranger paid the bill', words: ['paid', 'pay', 'covered', 'bill', 'tab', 'check', 'free', 'bought', 'treated'] },
      { label: 'They left a note', words: ['note', 'message', 'letter', 'wrote', 'written', 'card'] },
      { label: 'It praised him as a dad', words: ['dad', 'father', 'parent', 'great', 'good'] },
      { label: 'From a veteran / medic', words: ['army', 'medic', 'veteran', 'military', 'soldier', 'doctor'] },
      { label: 'He was moved to tears', words: ['cried', 'cry', 'tear', 'emotional', 'touched', 'moved', 'faith'] },
    ],
  },
  {
    source: 'Good News Network (via The Guardian)', date: 'May 2025',
    url: 'https://www.goodnewsnetwork.org/he-was-injured-with-crutches-when-a-group-of-scary-teens-offered-the-kindness-of-strangers/',
    setup: "Richard broke his ankle playing basketball and ended up on crutches after surgery. To reach the corner store he had to cut through a park where a group of teens hung out after school, smoking and making snide comments at people walking by. One day, hobbling home with a carton of milk, he tried to slip past them quietly — and a few of them got up and started walking toward him...",
    ending: "They offered to carry his bags. For the rest of his recovery the same teens took out his garbage, let him cut ahead of them in line at the store, and kept asking if he needed a hand. He later wrote to their school asking that they be recognized: \"By far the most helpful were those teens.\"",
    beats: [
      { label: 'They offered to carry his bags', words: ['carry', 'carried', 'bag', 'groceries', 'milk', 'help', 'helped', 'hold'] },
      { label: 'They kept helping all recovery', words: ['again', 'every', 'kept', 'regular', 'daily', 'garbage', 'trash', 'recover', 'weeks', 'whole'] },
      { label: 'They let him skip the line', words: ['line', 'queue', 'cut', 'ahead', 'front'] },
      { label: 'He wrote to their school', words: ['letter', 'school', 'recogni', 'principal', 'praise', 'award', 'wrote'] },
      { label: 'They turned out kind', words: ['kind', 'nice', 'friendly', 'helpful', 'sweet', 'good', 'friends'] },
    ],
  },
  {
    source: 'Good News Network', date: 'Oct 2025',
    url: 'https://www.goodnewsnetwork.org/crushed-by-a-car-she-comforted-him-until-911-arrived-he-recovered-and-made-her-his-wife/',
    setup: "Walking out of a swimming class, Kirsty spots a man pinned under a car, his leg flattened by a wheel. She doesn't know what to do, so she just stays — holding his attention and comforting him for about 40 minutes while paramedics fight through gridlocked traffic. The ambulance takes him away, and she has no idea who he is...",
    ending: "From his hospital bed, Ryan posted a Facebook appeal for witnesses. Kirsty saw it and got in touch, and a few weeks later they met again. They started dating, moved in together, and he proposed on a weekend away. They married — and took their wedding photos on the very crossing where they first met. \"It's how I met my wife, so I'd say it was worth it.\"",
    beats: [
      { label: 'He found her again online', words: ['found', 'facebook', 'social', 'post', 'contact', 'reached', 'tracked', 'reconnect', 'again', 'search'] },
      { label: 'They fell in love', words: ['date', 'dating', 'love', 'relationship', 'romance', 'fell', 'together', 'couple', 'girlfriend', 'boyfriend'] },
      { label: 'They got married', words: ['marri', 'marry', 'wedding', 'wife', 'propos', 'engag', 'husband'] },
      { label: 'Photos at the crash spot', words: ['crossing', 'crosswalk', 'spot', 'scene', 'same place', 'where they met', 'where it happened', 'photo'] },
      { label: 'He recovered', words: ['recover', 'heal', 'better', 'walk', 'surviv'] },
    ],
  },
  {
    source: 'Good News Network', date: 'Aug 2026',
    url: 'https://www.goodnewsnetwork.org/midwest-stranger-lends-his-truck-to-band-with-broken-down-van/',
    setup: "A three-piece rock band from Detroit has just played a festival in rural Wisconsin when their tour van dies on the highway. Every mechanic they call says the engine will take two days to fix. Their next show — a festival in Grand Rapids, Michigan — is 500 miles away, and they have ten hours to get there...",
    ending: "A stranger named Ernie, a Wisconsin man in his 60s, pulled over and handed them the keys to his own Ford Explorer — for several days. They made the show and drove over a thousand miles to finish the tour, then brought it back. Ernie said he just did it \"to help three strangers on the side of the road.\"",
    beats: [
      { label: 'A local stranger stepped in', words: ['stranger', 'local', 'man', 'guy', 'someone', 'farmer', 'driver', 'person', 'fan'] },
      { label: 'He lent them his own vehicle', words: ['lent', 'lend', 'loan', 'borrow', 'keys', 'his car', 'his truck', 'his suv', 'his van', 'vehicle', 'gave them'] },
      { label: 'They made the show', words: ['made it', 'made the', 'show', 'gig', 'festival', 'perform', 'played', 'on time'] },
      { label: 'They finished the tour', words: ['tour', 'finish', 'rest of', 'days', 'week'] },
      { label: 'They returned it', words: ['return', 'gave it back', 'brought it back', 'back to him', 'drove back'] },
    ],
  },
  {
    source: 'Good News Network', date: 'Oct 2026',
    url: 'https://www.goodnewsnetwork.org/girl-sitting-in-dirt-at-bus-stop-gets-surprise-bench-from-couple/',
    setup: "A couple of teachers in Florida have a school bus stop at the end of their driveway. There's no sidewalk, so every morning a middle schooler waits there sitting on the ground in the dirt, right by the traffic. They first notice her on their own security camera...",
    ending: "They built her a bench. On camera, she jumped for joy the morning she found it, and left a note: \"Now I don't have to worry about dirt and bugs, I appreciate it a ton!\" The couple then added a stocked mini free library beside it, which other neighborhood kids now borrow from — and the girl left them flowers.",
    beats: [
      { label: 'They gave her a bench', words: ['bench', 'seat', 'chair', 'stool', 'sit'] },
      { label: 'They built it themselves', words: ['built', 'build', 'made', 'install', 'put', 'set up'] },
      { label: 'She was overjoyed', words: ['happy', 'joy', 'jump', 'danc', 'smile', 'excited', 'thrill', 'delight', 'love'] },
      { label: 'She thanked them', words: ['thank', 'note', 'flower', 'card', 'grateful'] },
      { label: 'They added a little library', words: ['library', 'book', 'read'] },
    ],
  },
  {
    source: 'Good News Network', date: 'Jul 2025',
    url: 'https://www.goodnewsnetwork.org/woman-finds-message-on-toilet-paper-roll-written-35-years-ago-by-little-girl/',
    setup: "Charlotte and her husband are five months into renovating their house in Nottingham, England. Up in the loft, tucked out of sight, they find a message left behind by someone who lived there decades earlier. Charlotte can't stop wondering who wrote it — and where that person is now...",
    ending: "It was a cardboard toilet-roll tube with a note in red marker from Emma, a seven-year-old moving out in 1989: \"I hope you enjoy staying here. Lots of love, from a friend.\" Charlotte posted it on a local Facebook group and Emma — now 43 and still living in Nottingham — was found within the hour. She doesn't remember writing it. Charlotte plans to leave it in the loft for the next owners.",
    beats: [
      { label: 'A little girl wrote it', words: ['girl', 'child', 'kid', 'little', 'young', 'daughter'] },
      { label: 'A warm welcome note', words: ['welcome', 'enjoy', 'love', 'friend', 'hope', 'happy', 'kind', 'nice'] },
      { label: 'They found her online', words: ['found', 'facebook', 'tracked', 'located', 'posted', 'social', 'online', 'contact', 'reached', 'met'] },
      { label: 'Super fast', words: ['hour', 'quick', 'fast', 'same day', 'minutes', 'soon', 'immediately'] },
      { label: 'She still lives nearby', words: ['nearby', 'still', 'same town', 'local', 'grown', 'adult', 'close'] },
      { label: 'Left for the next owners', words: ['leave', 'left it', 'keep', 'next', 'future', 'put it back'] },
    ],
  },
  {
    source: 'KCRA', date: '2018',
    url: 'https://www.kcra.com/article/stranger-returns-lost-wallet-but-adds-surprise-for-owner-before-returning-have-fun/25336747',
    setup: "Hunter, from South Dakota, is flying to Las Vegas for his sister's wedding when he loses his wallet somewhere on the trip. Inside: $60 in cash and a check for about $400. He figures he'll never see it again...",
    ending: "A few days later a package arrived with his wallet and a letter. A stranger had found it wedged between a seat and the wall on a later flight. They returned everything — and added $40 so he'd have \"an even $100\" to celebrate, signing off \"Have fun\" with just their initials. Hunter tracked down the return address and thanked them.",
    beats: [
      { label: 'It was mailed back', words: ['return', 'mail', 'sent', 'back', 'package', 'post', 'shipped', 'envelope'] },
      { label: 'A stranger found it', words: ['stranger', 'passenger', 'someone', 'anonymous', 'person', 'found', 'crew'] },
      { label: 'Nothing was missing', words: ['everything', 'all of', 'intact', 'nothing missing', 'cash', 'check', 'money still'] },
      { label: 'They added extra money', words: ['extra', 'added', 'more money', '40', '100', 'bonus', 'plus', 'tip'] },
      { label: 'With a friendly note', words: ['note', 'letter', 'have fun', 'message', 'card'] },
    ],
  },
  {
    source: 'Good News Network', date: 'Nov 2026',
    url: 'https://www.goodnewsnetwork.org/viral-video-raises-76000-for-caregiver/',
    setup: "Suzanna, a pizza delivery driver, shows up at a pastor's home in Castle Rock, Colorado — and apologizes because she's mixed up their order and has to go back for the right one. She blames \"getting old,\" but she's clearly struggling: between shifts, she's the full-time caregiver for her 82-year-old mother...",
    ending: "Instead of getting annoyed, the pastor, his wife, and their three young daughters stepped outside, put their hands on her shoulders, and prayed with her. The doorbell-camera clip went viral and people asked how to help. With her permission they started a GoFundMe: more than 2,600 donors gave over $76,000 — far past the $10,000 goal.",
    beats: [
      { label: 'They were kind, not angry', words: ['kind', 'forgave', 'understand', 'patient', 'no problem', 'nice', 'hug', 'comfort', 'okay'] },
      { label: 'They prayed with her', words: ['pray', 'bless', 'god'] },
      { label: 'The video went viral', words: ['video', 'viral', 'camera', 'online', 'internet', 'tiktok', 'social', 'shared'] },
      { label: 'A fundraiser for her', words: ['gofundme', 'fundrais', 'donat', 'raised', 'crowdfund', 'money', 'tip'] },
      { label: 'Tens of thousands raised', words: ['thousand', '76', '70', '000', 'lots of money', 'huge'] },
    ],
  },
  {
    source: 'Good News Network', date: 'Oct 2026',
    url: 'https://www.goodnewsnetwork.org/npr-inspired-homework-leads-teen-to-find-hidden-message-a-decade-after-a-strangers-kindness/',
    setup: "When Rika was 7, in Japan, the brakes on her brand-new bike failed and she crashed into a wall, hurting her foot. A tall man in a suit came over. She was nervous, but he washed her cut at a water fountain and showed her how to fold an origami crane, which she kept. Ten years later, a high-school English assignment about \"unsung heroes\" makes her think of him again...",
    ending: "She went home and unfolded the old crane — and found a secret message hidden inside: two Japanese characters forming a well-known idiom, which she took to mean \"cherish the moment.\" Finding it made her realize even more how kind the stranger had been.",
    beats: [
      { label: 'She unfolded the crane', words: ['unfold', 'opened', 'open', 'inside', 'took apart'] },
      { label: 'A hidden message was inside', words: ['message', 'note', 'writing', 'written', 'secret', 'hidden', 'word', 'letter'] },
      { label: 'It was in Japanese', words: ['japanese', 'kanji', 'character', 'idiom', 'proverb', 'saying'] },
      { label: '"Cherish the moment"', words: ['cherish', 'moment', 'present', 'now', 'once', 'treasure', 'enjoy'] },
      { label: 'She saw how kind he was', words: ['kind', 'hero', 'grateful', 'thank', 'realiz', 'appreciat'] },
    ],
  },
  {
    source: 'Good News Network', date: 'Oct 2026',
    url: 'https://www.goodnewsnetwork.org/anonymously-pays-dinner-tab-for-27-disability-staff-in-south-korea/',
    setup: "A group of 27 from a community welfare center in Incheon, South Korea — staff, volunteers, and residents with disabilities — stops at a barbecue restaurant after a morning of sightseeing. When it's time to pay, they find the bill has grown to about $420, and the staff have some unexpected news for them...",
    ending: "A diner who had just left had paid the whole bill anonymously — and even added extra premium beef to their order first. They left without a word. The restaurant owner gave the group a discount and gave the mystery diner, a regular, a bottle of wine. A volunteer said it \"reminded us there are still many warmhearted people around us.\"",
    beats: [
      { label: 'A stranger paid the bill', words: ['paid', 'pay', 'covered', 'bill', 'tab', 'check', 'free', 'treated', 'bought'] },
      { label: 'They stayed anonymous', words: ['anonymous', 'stranger', 'secret', 'unknown', 'mystery', 'without a word', 'left', 'someone'] },
      { label: 'They added extra food first', words: ['extra', 'more food', 'beef', 'meat', 'added', 'ordered more', 'dessert'] },
      { label: 'The owner joined in', words: ['owner', 'discount', 'restaurant', 'manager', 'wine'] },
      { label: 'The group felt grateful', words: ['grateful', 'thank', 'warm', 'happy', 'touched', 'kind', 'moved'] },
    ],
  },
  {
    source: 'Good News Network', date: 'May 2022',
    url: 'https://www.goodnewsnetwork.org/tracy-and-zugay-reunited-after-23-years/',
    setup: "In 1999, 12-year-old Ayda and her sister are fleeing the war in the former Yugoslavia. On their flight to America, a stranger — a tennis coach — quietly slips them an envelope with earrings, $100, and a letter. More than 20 years later the sisters want to thank her, but all they know is her first name: Tracy...",
    ending: "A refugee charity shared Ayda's video with the hashtag #FindTracy and it went viral. A tennis colleague and one of Tracy's daughters recognized her, and an old flight receipt in a scrapbook proved it. They reunited over Zoom, all in tears: \"Thank you for reminding me to be strong.\" The $100 had fed them pancakes all summer, and they hope to meet in person.",
    beats: [
      { label: 'They searched online', words: ['online', 'internet', 'social', 'viral', 'post', 'video', 'hashtag', 'twitter', 'facebook', 'search'] },
      { label: 'People who knew her helped', words: ['daughter', 'friend', 'colleague', 'family', 'recogni', 'someone knew'] },
      { label: 'They found Tracy', words: ['found', 'find', 'tracked', 'located', 'identif'] },
      { label: 'They reunited (by video)', words: ['reunit', 'met', 'meet', 'zoom', 'video call', 'call', 'talked', 'spoke'] },
      { label: 'Tears and thanks', words: ['thank', 'cried', 'cry', 'tear', 'emotional', 'grateful', 'strong'] },
    ],
  },
  {
    source: 'Good News Network', date: 'Sep 2021',
    url: 'https://www.goodnewsnetwork.org/watch-elderly-lady-gets-hokey-pokey-flashmob/',
    setup: "Mrs. B, who lives in Prairie Village, Kansas, absolutely loves the Hokey Pokey. She even gave her neighbor Melanie a Hokey Pokey CD and keeps calling to ask if she's come around to it yet. Melanie hasn't — it was never going to be one of her favorite songs. But Mrs. B's 93rd birthday is coming up...",
    ending: "Melanie and her daughter secretly made invitations and handed them out around the neighborhood. On the day, neighbors in birthday hats gathered on Mrs. B's front lawn and surprised her with a Hokey Pokey flash mob, performing her favorite song. She couldn't stop smiling.",
    beats: [
      { label: 'A surprise party', words: ['surprise', 'party', 'celebrat', 'secret', 'planned'] },
      { label: 'The whole neighborhood came', words: ['neighbor', 'community', 'everyone', 'street', 'invit', 'crowd', 'people'] },
      { label: 'They did the Hokey Pokey', words: ['hokey', 'pokey', 'danc', 'flash mob', 'flashmob', 'song', 'sang', 'sing'] },
      { label: 'On her front lawn', words: ['lawn', 'yard', 'outside', 'front', 'house', 'door'] },
      { label: 'She was overjoyed', words: ['smile', 'happy', 'joy', 'laugh', 'cried', 'tear', 'loved', 'delight'] },
    ],
  },
  {
    source: 'Good News Network', date: 'Jul 2020',
    url: 'https://www.goodnewsnetwork.org/guy-buys-all-the-frozen-pops-from-old-mans-cart-then-raises-60k/',
    setup: "Don Rosario, 70, used to be a carpenter until an injury ended that work. Now he pushes a refrigerated cart through a Chicago neighborhood selling paletas (ice pops). On Father's Day, out in the heat, he says it's just \"another day at the office\" — until a family hosting a barbecue invites him to join them...",
    ending: "They bought every paleta in his cart so he could go home and rest. A friend posted the moment on TikTok, the family started a GoFundMe with a $10,000 goal, and strangers gave more than $62,000. \"It has made me so happy,\" he said — though he plans to keep working, because he doesn't like sitting at home.",
    beats: [
      { label: 'They bought his whole cart', words: ['bought', 'buy', 'all', 'every', 'entire', 'whole', 'sold out'] },
      { label: 'So he could go home and rest', words: ['home', 'rest', 'day off', 'relax', 'break', 'retire'] },
      { label: 'It went viral online', words: ['viral', 'video', 'tiktok', 'online', 'internet', 'social', 'posted', 'filmed'] },
      { label: 'A fundraiser for him', words: ['gofundme', 'fundrais', 'donat', 'raised', 'crowdfund', 'money'] },
      { label: 'Tens of thousands raised', words: ['thousand', '60', '62', '000', 'lots of money', 'huge'] },
    ],
  },
  {
    source: 'Good News Network', date: 'Nov 2026',
    url: 'https://www.goodnewsnetwork.org/loud-neighbor-parkinsons-gofundme/',
    setup: "Heidi has just moved into an apartment in Los Angeles and is getting annoyed by constant thumping from the unit upstairs. One day, her upstairs neighbor's recycling spills outside Heidi's door. The neighbor turns out to be Carole, 87, who lives alone with Parkinson's, has no family nearby, and asks her: \"Am I too loud for you?\"",
    ending: "Heidi became her friend and helper instead: she takes out Carole's trash twice a week, cooks for her weekly (homemade pierogies included), and got the landlord to replace her air conditioner, carpet, stove and fridge. Her GoFundMe for Carole has raised over $109,000, including for a stair lift so Carole can stay in her home. \"Now I got a grandma.\"",
    beats: [
      { label: 'She became her helper / friend', words: ['friend', 'help', 'care', 'check', 'visit', 'grandma', 'family', 'adopt'] },
      { label: 'Chores and cooking', words: ['cook', 'food', 'meal', 'trash', 'garbage', 'clean', 'chore', 'errand', 'groceries'] },
      { label: 'Got the apartment fixed up', words: ['landlord', 'fix', 'repair', 'replace', 'air condition', 'stove', 'fridge', 'carpet'] },
      { label: 'A fundraiser for Carole', words: ['gofundme', 'fundrais', 'donat', 'raised', 'crowdfund', 'money'] },
      { label: 'Over $100,000 raised', words: ['thousand', '100', '109', '000', 'huge'] },
      { label: 'So she can stay home', words: ['stair', 'lift', 'stay', 'independ', 'home'] },
    ],
  },
  {
    source: 'Good News Network', date: 'Dec 2019',
    url: 'https://www.goodnewsnetwork.org/bbc-breakfast-surprises-lonely-pensioner-with-christmas-cheer/',
    setup: "In a BBC interview, Terrence, 78, mentions that he has spent the last twenty Christmases alone since his mother died. He volunteers with a charity for older people. The breakfast-show hosts are so moved by what he said that they decide to do something about it...",
    ending: "The very next day they showed up at his house. Local college students brought him a Christmas tree, and a college choir sang \"Silent Night\" — his favorite carol — at his door. Terrence could barely hold back tears. Through his volunteering, he'd be spending that Christmas with a 90-year-old woman instead of alone, and the video was seen by millions.",
    beats: [
      { label: 'They visited his home', words: ['visit', 'came', 'house', 'home', 'door', 'surprise', 'went'] },
      { label: 'A Christmas tree', words: ['tree', 'decorat', 'lights'] },
      { label: 'Carol singers', words: ['sing', 'sang', 'choir', 'carol', 'song', 'silent night', 'music'] },
      { label: 'He was moved to tears', words: ['cried', 'cry', 'tear', 'emotional', 'moved', 'overwhelm', 'happy'] },
      { label: 'Not alone this Christmas', words: ['company', 'not alone', 'friend', 'spend', 'together', 'with someone', 'invite'] },
    ],
  },
  {
    source: 'Good News Network', date: 'Nov 2026',
    url: 'https://www.goodnewsnetwork.org/climbers-lug-endangered-and-orphaned-seal-pup-up-a-cliff-to-safety',
    setup: "Climbers hiking on the Greek island of Kythira spot something on a beach at the bottom of a cliff that's almost impossible to reach: a baby Mediterranean monk seal, all alone. Monk seals are critically endangered in Greece, and experts think a big wave may have separated the pup from its mother...",
    ending: "The climbers called the coast guard, a monk-seal protection society and a local animal rescue, whose vets climbed down the cliffs with them. They put the pup in a backpack and carried it back up to safety. It was dehydrated and underweight, so it was taken to a rehabilitation center for round-the-clock care.",
    beats: [
      { label: 'They carried it up the cliff', words: ['carried', 'carry', 'lifted', 'climb', 'brought up', 'hauled', 'rescued', 'saved'] },
      { label: 'In a backpack', words: ['backpack', 'bag', 'pack', 'rucksack'] },
      { label: 'They called in experts', words: ['call', 'expert', 'coast guard', 'rescue', 'vet', 'society', 'help'] },
      { label: 'Rehab center care', words: ['rehab', 'center', 'centre', 'care', 'hospital', 'sanctuary', 'treat', 'nursed'] },
      { label: 'The pup was weak/hungry', words: ['dehydrat', 'hungry', 'starv', 'weak', 'thin', 'underweight', 'malnourish'] },
    ],
  },
];

(() => {
  const $ = id => document.getElementById(id);
  const card = $('starCard');
  if (!card) return;
  const stage = document.querySelector('.intro-stage');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  const dayIndex = () => { const d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000) % STARS.length; };
  const PIXEL_STAR = '<svg viewBox="0 0 9 9" shape-rendering="crispEdges" aria-hidden="true"><path d="M4 0h1v2h1v1h3v1h-1v1h-1v2h1v2h-1v-1h-1v-1h-3v1h-1v1h-1v-2h1v-2h-1v-1h-1v-1h3v-1h1z"/></svg>';

  let story, typer;

  function score(guess, beats) {
    const text = ' ' + guess.toLowerCase().replace(/[^a-z0-9$ ]+/g, ' ').replace(/\s+/g, ' ') + ' ';
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return beats.map(b => b.words.some(w => new RegExp('[^a-z0-9]' + esc(w.toLowerCase())).test(text)));
  }

  function typeOut(el, text) {
    clearInterval(typer);
    if (reduce) { el.textContent = text; return; }
    el.textContent = ''; el.classList.add('typing');
    let n = 0;
    typer = setInterval(() => {
      n += 2; el.textContent = text.slice(0, n);
      if (n >= text.length) { clearInterval(typer); el.classList.remove('typing'); }
    }, 18);
    // click the story to skip the typing
    el.onclick = () => { clearInterval(typer); el.textContent = text; el.classList.remove('typing'); };
  }

  function show(view) {
    card.querySelectorAll('[data-view]').forEach(v => v.hidden = v.dataset.view !== view);
  }

  function drawMeter(el, stars) {
    el.innerHTML = '';
    for (let k = 0; k < 5; k++) {
      const s = document.createElement('span');
      s.className = 'pstar' + (k < stars ? ' lit' : '');
      s.style.setProperty('--k', k);
      s.innerHTML = PIXEL_STAR;
      el.append(s);
    }
    el.setAttribute('aria-label', `${stars} out of 5 stars`);
  }

  function timeLeft() {
    const now = new Date(), mid = new Date(now); mid.setHours(24, 0, 0, 0);
    const m = Math.ceil((mid - now) / 60000), h = Math.floor(m / 60);
    return h ? `${h}h ${m % 60}m` : `${m}m`;
  }

  function popCard() {
    stage.classList.add('star-mode');
    card.hidden = false;
    card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop');
  }

  function open() {
    $('starNum').textContent = `Story #${dayIndex() + 1}`;
    const done = S.dailyStar && S.dailyStar.day === dayKey();
    if (done) {
      // Already played today: just show the score
      const d = S.dailyStar;
      const stars = d.stars ?? Math.max(1, Math.round(((d.coins - 10) / 90) * 5));
      $('starStatus').textContent = '';
      drawMeter($('starDoneMeter'), stars);
      $('starDoneCoins').textContent = `+${d.coins} 🪙`;
      $('starDoneMsg').textContent = `You already completed today's Daily Star and got +${d.coins} coins. Come back tomorrow!`;
      $('starDoneTimer').textContent = `New story in ${timeLeft()}`;
      show('done');
      popCard();
      $('starDoneEnter').focus({ preventScroll: true });
      return;
    }
    story = STARS[dayIndex()];
    $('starStatus').textContent = 'Up to 100 🪙';
    $('starGuess').value = '';
    show('guess');
    popCard();
    typeOut($('starSetup'), story.setup);
    setTimeout(() => $('starGuess').focus({ preventScroll: true }), reduce ? 0 : 400);
  }

  function close() {
    clearInterval(typer);
    card.hidden = true;
    stage.classList.remove('star-mode');
    $('dailyStar').focus();
  }

  function reveal(e) {
    e.preventDefault();
    const guess = $('starGuess').value.trim();
    if (guess.split(/\s+/).length < 3) {
      $('starGuess').classList.remove('shake'); void $('starGuess').offsetWidth; $('starGuess').classList.add('shake');
      $('starGuess').placeholder = 'Write a few words first! e.g. "a stranger paid for their meal"';
      return;
    }
    clearInterval(typer);
    const hits = score(guess, story.beats);
    const pct = hits.filter(Boolean).length / hits.length;
    const stars = Math.max(1, Math.round(pct * 5)); // trying always earns at least one star
    const coins = 10 + Math.round(pct * 90);
    S.dailyStar = { day: dayKey(), coins, stars };
    S.coins += coins; save(); renderAll();

    drawMeter($('starMeter'), stars);
    $('starStatus').textContent = '';
    $('starVerdict').textContent = ['', 'A little twinkle!', 'Getting warmer!', 'Nice guess!', 'So close!', 'You saw it coming!'][stars];
    $('starCoins').textContent = `+${coins} 🪙`;
    $('starYours').textContent = `“${guess}”`;
    $('starEnding').textContent = story.ending;
    const beats = $('starBeats'); beats.innerHTML = '';
    story.beats.forEach((b, k) => {
      const li = document.createElement('li');
      li.className = hits[k] ? 'hit' : '';
      li.textContent = (hits[k] ? '✓ ' : '· ') + b.label;
      beats.append(li);
    });
    const src = $('starSource');
    src.href = story.url;
    src.textContent = `${story.source} · ${story.date} ↗`;
    show('reveal');
    card.scrollTop = 0;
  }

  $('starForm').addEventListener('submit', reveal);
  $('starGuess').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) reveal(e); });
  card.querySelectorAll('[data-star-back]').forEach(b => b.addEventListener('click', close));
  const enter = () => { card.hidden = true; stage.classList.remove('star-mode'); $('enterWorld').click(); };
  $('starEnter').addEventListener('click', enter);
  $('starDoneEnter').addEventListener('click', enter);

  window.startDailyStar = open;
})();
