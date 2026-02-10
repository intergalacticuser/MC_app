export const CATEGORY_SUGGESTIONS = {
  love_relationships: [
    "Romantic Relationships",
    "Family",
    "Intimacy & Sex",
    "Emotional Connection",
    "Boundaries & Expectations"
  ],
  lifestyle_values: [
    "Core Values",
    "Life Goals & Dreams",
    "Career & Ambitions",
    "Personal Growth",
    "Life Philosophy"
  ],
  cultural_taste: [
    "Music",
    "Movies & Series",
    "Books",
    "Art & Creativity",
    "Podcasts & Media"
  ],
  hobbies_activities: [
    "Sports & Fitness",
    "Outdoor & Nature",
    "Creative Hobbies",
    "Social Activities",
    "Travel & Adventures"
  ],
  food_everyday_life: [
    "Food Preferences",
    "Cooking & Home Food",
    "Cafes & Restaurants",
    "Daily Rituals",
    "Home & Comfort"
  ]
};

// Level 3 suggestions: concrete concepts inside each fixed Level 2 subcategory.
// Keep these stable and curated (>= 10 each) so the UI feels intentional.
export const CONCEPT_SUGGESTIONS = {
  love_relationships: {
    "Romantic Relationships": [
      "Love languages",
      "Date night ideas",
      "Communication styles",
      "Conflict resolution",
      "Trust & reliability",
      "Emotional safety",
      "Long-term plans",
      "Shared hobbies",
      "Quality time",
      "Affection"
    ],
    "Family": [
      "Family traditions",
      "Sibling relationships",
      "Parent-child bond",
      "Family gatherings",
      "Chosen family",
      "Supporting relatives",
      "Intergenerational stories",
      "Family values",
      "Healthy communication",
      "Home holidays"
    ],
    "Intimacy & Sex": [
      "Consent",
      "Affection",
      "Flirting",
      "Emotional intimacy",
      "Physical compatibility",
      "Boundaries",
      "Desire & attraction",
      "Safety & trust",
      "Open conversations",
      "Playfulness"
    ],
    "Emotional Connection": [
      "Vulnerability",
      "Active listening",
      "Empathy",
      "Shared memories",
      "Inside jokes",
      "Support in hard times",
      "Feeling seen",
      "Comfort & warmth",
      "Deep talks",
      "Kindness"
    ],
    "Boundaries & Expectations": [
      "Personal space",
      "Time together",
      "Honesty",
      "Jealousy rules",
      "Financial expectations",
      "Social boundaries",
      "Communication frequency",
      "Respect",
      "Independence",
      "Commitment"
    ]
  },
  lifestyle_values: {
    "Core Values": [
      "Honesty",
      "Kindness",
      "Loyalty",
      "Freedom",
      "Responsibility",
      "Curiosity",
      "Compassion",
      "Courage",
      "Fairness",
      "Authenticity"
    ],
    "Life Goals & Dreams": [
      "Travel the world",
      "Build a family",
      "Move to a new city",
      "Buy a home",
      "Learn a new skill",
      "Start a business",
      "Write a book",
      "Financial independence",
      "Make an impact",
      "Create a passion project"
    ],
    "Career & Ambitions": [
      "Leadership",
      "Creative work",
      "Entrepreneurship",
      "Remote work",
      "Work-life balance",
      "Learning & growth",
      "Changing careers",
      "Side projects",
      "Networking",
      "Professional mastery"
    ],
    "Personal Growth": [
      "Mindfulness",
      "Therapy",
      "Journaling",
      "Discipline",
      "Confidence",
      "Habits",
      "Emotional intelligence",
      "Self-care",
      "Public speaking",
      "Learning every day"
    ],
    "Life Philosophy": [
      "Stoicism",
      "Optimism",
      "Minimalism",
      "Spirituality",
      "Pragmatism",
      "Gratitude",
      "Simplicity",
      "Living intentionally",
      "Balance",
      "Growth mindset"
    ]
  },
  cultural_taste: {
    "Music": [
      "Indie",
      "Hip-hop",
      "Pop",
      "Jazz",
      "Classical",
      "Electronic",
      "Rock",
      "R&B",
      "Live concerts",
      "Playlists"
    ],
    "Movies & Series": [
      "Sci-fi",
      "Comedy",
      "Drama",
      "Thrillers",
      "Documentaries",
      "Anime",
      "Rom-coms",
      "Crime series",
      "Classic films",
      "Movie nights"
    ],
    "Books": [
      "Fantasy",
      "Mystery",
      "Non-fiction",
      "Psychology",
      "Business",
      "Romance",
      "Sci-fi novels",
      "Biographies",
      "Poetry",
      "Book clubs"
    ],
    "Art & Creativity": [
      "Drawing",
      "Painting",
      "Photography",
      "Design",
      "Street art",
      "Museums",
      "Creative writing",
      "Crafts",
      "Digital art",
      "Fashion"
    ],
    "Podcasts & Media": [
      "Tech podcasts",
      "Self-improvement",
      "True crime",
      "Comedy podcasts",
      "Science shows",
      "News analysis",
      "History",
      "Business media",
      "YouTube channels",
      "Audiobooks"
    ]
  },
  hobbies_activities: {
    "Sports & Fitness": [
      "Gym training",
      "Running",
      "Yoga",
      "Cycling",
      "Swimming",
      "Martial arts",
      "Team sports",
      "Hiking workouts",
      "Pilates",
      "Strength training"
    ],
    "Outdoor & Nature": [
      "Hiking",
      "Camping",
      "Beach days",
      "Mountains",
      "Sunsets",
      "Road trips",
      "National parks",
      "Stargazing",
      "Picnics",
      "Gardening"
    ],
    "Creative Hobbies": [
      "Photography",
      "Cooking experiments",
      "Music instruments",
      "DIY projects",
      "Drawing",
      "Writing",
      "Video editing",
      "Crafting",
      "3D printing",
      "Painting"
    ],
    "Social Activities": [
      "Board games",
      "Parties",
      "Karaoke",
      "Volunteering",
      "Meetups",
      "Dancing",
      "Trivia nights",
      "Group workouts",
      "Workshops",
      "Community events"
    ],
    "Travel & Adventures": [
      "Backpacking",
      "City breaks",
      "Beach vacations",
      "Mountains trips",
      "Weekend getaways",
      "New cuisines",
      "Cultural festivals",
      "Extreme sports",
      "Photography trips",
      "Hidden gems"
    ]
  },
  food_everyday_life: {
    "Food Preferences": [
      "Vegetarian",
      "Vegan",
      "Street food",
      "Spicy food",
      "Desserts",
      "Seafood",
      "Healthy eating",
      "Comfort food",
      "Coffee lover",
      "Tea lover"
    ],
    "Cooking & Home Food": [
      "Baking",
      "Meal prep",
      "Pasta nights",
      "BBQ",
      "Homemade soups",
      "Trying new recipes",
      "Cooking for friends",
      "Slow cooking",
      "Healthy cooking",
      "Dessert experiments"
    ],
    "Cafes & Restaurants": [
      "Coffee shops",
      "Brunch",
      "Fine dining",
      "Local spots",
      "Sushi",
      "Pizza places",
      "Taco joints",
      "Bakeries",
      "Food markets",
      "Date restaurants"
    ],
    "Daily Rituals": [
      "Morning coffee",
      "Evening walks",
      "Reading before bed",
      "Meditation",
      "Workout routine",
      "Weekly planning",
      "Music while working",
      "Tea time",
      "Digital detox",
      "Skincare routine"
    ],
    "Home & Comfort": [
      "Cozy lighting",
      "Home decor",
      "Clean space",
      "Scented candles",
      "Soft blankets",
      "Minimalism at home",
      "Plants",
      "Movie nights",
      "Comfort playlists",
      "Cooking at home"
    ]
  }
};

// Suggested photos:
// - Level 1: category domainId -> photo pool
// - Level 2: subcategory label -> curated + derived from its category pool
// - Level 3: concept -> derived by key `${subcategory}::${concept}` (so duplicates across subcats don't collide)
//
// UI takes up to 9 suggestions; we keep pools larger so we can rotate and dedupe.

const normalizePhotoUrl = (url) => {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (!/^https?:\/\//i.test(raw)) return "";

  // Dynamic Unsplash keyword sources. Keep the URL intact so `sig` keeps producing multiple options.
  if (/^https?:\/\/source\.unsplash\.com\//i.test(raw)) {
    return raw;
  }

  // Keep suggestions lightweight and consistent.
  if (/^https?:\/\/images\.unsplash\.com\//i.test(raw)) {
    const base = raw.split("?")[0];
    return `${base}?w=400&q=80`;
  }
  return raw;
};

const uniq = (list) => {
  const out = [];
  const seen = new Set();
  (Array.isArray(list) ? list : []).forEach((item) => {
    const val = String(item || "");
    if (!val) return;
    if (seen.has(val)) return;
    seen.add(val);
    out.push(val);
  });
  return out;
};

const toNormalizedUnique = (list) =>
  uniq((Array.isArray(list) ? list : []).map(normalizePhotoUrl).filter(Boolean));

// Seeded RNG helpers (deterministic pick of "random" photos for each subcategory/concept).
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const pickDeterministic = (pool, seedStr, count) => {
  const items = toNormalizedUnique(pool);
  if (!items.length) return [];
  if (items.length <= count) return items;

  const seed = xmur3(String(seedStr || "seed"))();
  const rand = mulberry32(seed);
  const arr = items.slice();

  // Fisher-Yates shuffle with seeded RNG.
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr.slice(0, Math.max(0, Number(count) || 0));
};

const UNSPLASH_SOURCE_SIZE = 400;

const CATEGORY_KEYWORDS = {
  love_relationships: "couple love relationship romance intimacy connection family",
  lifestyle_values: "lifestyle values goals ambition growth mindfulness philosophy journaling",
  cultural_taste: "music concert cinema film books library art gallery creativity podcast",
  hobbies_activities: "sports fitness hiking camping travel adventure photography yoga friends",
  food_everyday_life: "food coffee cafe restaurant cooking kitchen brunch breakfast home cozy"
};

const SUBCATEGORY_KEYWORDS = {
  "Romantic Relationships": "couple romance date night love",
  "Family": "family together home kids parents",
  "Intimacy & Sex": "intimacy closeness romance",
  "Emotional Connection": "connection empathy conversation warmth",
  "Boundaries & Expectations": "boundaries respect communication trust",

  "Core Values": "values honesty kindness authenticity",
  "Life Goals & Dreams": "goals dreams vision travel success",
  "Career & Ambitions": "career ambition leadership work",
  "Personal Growth": "personal growth mindfulness journaling habits",
  "Life Philosophy": "philosophy stoicism minimalism gratitude",

  "Music": "music headphones vinyl concert stage",
  "Movies & Series": "cinema movie night theater screen",
  "Books": "books reading library bookstore",
  "Art & Creativity": "art creativity painting design studio",
  "Podcasts & Media": "podcast microphone studio headphones",

  "Sports & Fitness": "fitness gym running training",
  "Outdoor & Nature": "nature hiking mountains forest sunset",
  "Creative Hobbies": "creative hobby craft diy photography",
  "Social Activities": "friends party meetup board games",
  "Travel & Adventures": "travel adventure backpacking road trip",

  "Food Preferences": "food cuisine taste dishes",
  "Cooking & Home Food": "cooking kitchen baking meal prep",
  "Cafes & Restaurants": "cafe restaurant coffee brunch",
  "Daily Rituals": "morning routine coffee journal walk",
  "Home & Comfort": "cozy home comfort decor candles"
};

const buildUnsplashSourceUrl = (keywords, sig) => {
  const q = encodeURIComponent(String(keywords || "").trim());
  const s = Math.max(0, Number(sig) || 0);
  if (!q) return "";
  return `https://source.unsplash.com/featured/${UNSPLASH_SOURCE_SIZE}x${UNSPLASH_SOURCE_SIZE}?${q}&sig=${s}`;
};

const buildUnsplashSourcePool = (seedStr, keywords, count) => {
  const base = xmur3(String(seedStr || "seed"))();
  const safeCount = Math.max(0, Number(count) || 0);
  const out = [];
  for (let i = 0; i < safeCount; i++) {
    const url = buildUnsplashSourceUrl(keywords, (base + i) % 10000);
    if (url) out.push(url);
  }
  return out;
};

const buildKeywords = ({ domainId = "", subcatLabel = "", concept = "" }) => {
  const a = String(concept || "").trim();
  const b = String(subcatLabel || "").trim();
  const sub = SUBCATEGORY_KEYWORDS[b] || b;
  const dom = CATEGORY_KEYWORDS[String(domainId || "").trim()] || "";
  const parts = [a, sub, dom].filter(Boolean);
  // Avoid ultra-long query strings; keep it punchy.
  return parts.join(" ").slice(0, 120);
};

const CATEGORY_IMAGE_POOLS = {
  love_relationships: [
    "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400&q=80",
    "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&q=80",
    "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=400&q=80",
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80",
    "https://images.unsplash.com/photo-1473186578172-c141e6798cf4?w=400&q=80",
    "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&q=80",

    "https://images.unsplash.com/photo-1699726265399-b20b23853611?w=400&q=80",
    "https://images.unsplash.com/photo-1662048928919-8569db5996b9?w=400&q=80",
    "https://images.unsplash.com/photo-1600506181398-7595a2aa0a6b?w=400&q=80",
    "https://images.unsplash.com/photo-1546418608-57cbd042b399?w=400&q=80",
    "https://images.unsplash.com/photo-1601980619295-19e9a98780e8?w=400&q=80",
    "https://images.unsplash.com/photo-1765422820809-03585eb97827?w=400&q=80",
    "https://images.unsplash.com/photo-1514846528774-8de9d4a07023?w=400&q=80",

    "https://images.unsplash.com/photo-1542037104857-ffbb0b9155fb?w=400&q=80",
    "https://images.unsplash.com/photo-1609220136736-443140cffec6?w=400&q=80",
    "https://images.unsplash.com/photo-1588979355313-6711a095465f?w=400&q=80",
    "https://images.unsplash.com/photo-1506836467174-27f1042aa48c?w=400&q=80",
    "https://images.unsplash.com/photo-1559734840-f9509ee5677f?w=400&q=80",
    "https://images.unsplash.com/photo-1504439268584-b72c5019471e?w=400&q=80",
    "https://images.unsplash.com/photo-1475503572774-15a45e5d60b9?w=400&q=80",
    "https://images.unsplash.com/photo-1561525140-c2a4cc68e4bd?w=400&q=80",
    "https://images.unsplash.com/photo-1531983412531-1f49a365ffed?w=400&q=80",
    ...buildUnsplashSourcePool("cat:love_relationships", CATEGORY_KEYWORDS.love_relationships, 24)
  ],

  lifestyle_values: [
    "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=400&q=80",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400&q=80",
    "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400&q=80",
    "https://images.unsplash.com/photo-1489710437720-ebb67ec84dd2?w=400&q=80",
    "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80",
    "https://images.unsplash.com/photo-1473830394358-91588751b241?w=400&q=80",

    "https://images.unsplash.com/photo-1512438248247-f0f2a5a8b7f0?w=400&q=80",
    "https://images.unsplash.com/photo-1522075782449-e45a34f1ddfb?w=400&q=80",
    "https://images.unsplash.com/photo-1528715471579-d1bcf0ba5e83?w=400&q=80",
    "https://images.unsplash.com/photo-1559595500-e15296bdbb48?w=400&q=80",
    "https://images.unsplash.com/reserve/YEc7WB6ASDydBTw6GDlF_antalya-beach-lulu.jpg?w=400&q=80",
    "https://images.unsplash.com/photo-1536623975707-c4b3b2af565d?w=400&q=80",

    "https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&q=80",
    "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400&q=80",
    "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=400&q=80",
    "https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?w=400&q=80",
    "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&q=80",

    "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400&q=80",
    "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=400&q=80",
    "https://images.unsplash.com/photo-1506784926709-22f1ec395907?w=400&q=80",
    "https://images.unsplash.com/photo-1517570544249-a47a3b5d8a8d?w=400&q=80",
    "https://images.unsplash.com/photo-1564510714747-69c3bc1fab41?w=400&q=80",
    ...buildUnsplashSourcePool("cat:lifestyle_values", CATEGORY_KEYWORDS.lifestyle_values, 24)
  ],

  cultural_taste: [
    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80",
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80",
    "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&q=80",
    "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400&q=80",
    "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&q=80",

    "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&q=80",
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&q=80",
    "https://images.unsplash.com/photo-1563841930606-67e2bce48b78?w=400&q=80",
    "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400&q=80",
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80",
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80",
    "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=400&q=80",

    "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=400&q=80",
    "https://images.unsplash.com/photo-1519791883288-dc8bd696e667?w=400&q=80",
    "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&q=80",
    "https://images.unsplash.com/photo-1525715843408-5c6ec44503b1?w=400&q=80",

    "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=400&q=80",
    "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&q=80",
    "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&q=80",
    "https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=400&q=80",
    ...buildUnsplashSourcePool("cat:cultural_taste", CATEGORY_KEYWORDS.cultural_taste, 24)
  ],

  hobbies_activities: [
    "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&q=80",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=80",
    "https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=400&q=80",
    "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&q=80",

    "https://images.unsplash.com/photo-1627483298606-cf54c61779a9?w=400&q=80",
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80",
    "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&q=80",
    "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&q=80",
    "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80",

    "https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&q=80",
    "https://images.unsplash.com/photo-1533240332313-0db49b459ad6?w=400&q=80",
    "https://images.unsplash.com/photo-1501554728187-ce583db33af7?w=400&q=80",
    "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=400&q=80",
    "https://images.unsplash.com/photo-1476979735039-2fdea9e9e407?w=400&q=80",

    "https://images.unsplash.com/photo-1528543606781-2f6e6857f318?w=400&q=80",
    "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&q=80",
    "https://images.unsplash.com/photo-1565639828644-ff8e088ebfa8?w=400&q=80",
    "https://images.unsplash.com/photo-1642777793779-0e67e065f79a?w=400&q=80",
    ...buildUnsplashSourcePool("cat:hobbies_activities", CATEGORY_KEYWORDS.hobbies_activities, 24)
  ],

  food_everyday_life: [
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80",
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80",
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80",
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&q=80",
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&q=80",

    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80",
    "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&q=80",
    "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&q=80",
    "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&q=80",
    "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80",

    "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&q=80",
    "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&q=80",
    "https://images.unsplash.com/photo-1507048331197-7d4ac70811cf?w=400&q=80",
    "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=400&q=80",

    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",
    "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&q=80",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80",
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80",
    "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&q=80",
    "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80",
    ...buildUnsplashSourcePool("cat:food_everyday_life", CATEGORY_KEYWORDS.food_everyday_life, 24)
  ]
};

// Pin 1-2 strong "anchor" photos for each Level 2 subcategory, then fill the rest from the category pool.
const SUBCATEGORY_IMAGE_OVERRIDES = {
  "Romantic Relationships": ["https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400&q=80"],
  "Family": ["https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&q=80"],
  "Intimacy & Sex": ["https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=400&q=80"],
  "Emotional Connection": ["https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80"],
  "Boundaries & Expectations": ["https://images.unsplash.com/photo-1473186578172-c141e6798cf4?w=400&q=80"],

  "Core Values": ["https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=400&q=80"],
  "Life Goals & Dreams": ["https://images.unsplash.com/photo-1489710437720-ebb67ec84dd2?w=400&q=80"],
  "Career & Ambitions": ["https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400&q=80"],
  "Personal Growth": ["https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80"],
  "Life Philosophy": ["https://images.unsplash.com/photo-1473830394358-91588751b241?w=400&q=80"],

  "Music": ["https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80"],
  "Movies & Series": ["https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80"],
  "Books": ["https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&q=80"],
  "Art & Creativity": ["https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400&q=80"],
  "Podcasts & Media": ["https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&q=80"],

  "Sports & Fitness": ["https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&q=80"],
  "Outdoor & Nature": ["https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=80"],
  "Creative Hobbies": ["https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&q=80"],
  "Social Activities": ["https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80"],
  "Travel & Adventures": ["https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=400&q=80"],

  "Food Preferences": ["https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80"],
  "Cooking & Home Food": ["https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&q=80"],
  "Cafes & Restaurants": ["https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&q=80"],
  "Daily Rituals": ["https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80"],
  "Home & Comfort": ["https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&q=80"]
};

export const IMAGE_SUGGESTIONS = (() => {
  const out = {};

  // Level 1: categories
  Object.entries(CATEGORY_IMAGE_POOLS).forEach(([domainId, pool]) => {
    out[domainId] = toNormalizedUnique(pool);
  });

  // Level 2: subcategories
  Object.entries(CATEGORY_SUGGESTIONS).forEach(([domainId, subcats]) => {
    const domainPool = out[domainId] || [];
    (Array.isArray(subcats) ? subcats : []).forEach((label) => {
      const overrides = toNormalizedUnique(SUBCATEGORY_IMAGE_OVERRIDES[label] || []);
      const dynamic = buildUnsplashSourcePool(
        `subcat:${domainId}:${label}`,
        buildKeywords({ domainId, subcatLabel: label }),
        24
      );
      const derived = pickDeterministic(domainPool, `subcat:${domainId}:${label}`, 12);
      out[label] = uniq([...overrides, ...dynamic, ...derived]).slice(0, 36);
    });
  });

  // Level 3: concepts (keyed by `${subcategory}::${concept}`)
  Object.entries(CONCEPT_SUGGESTIONS).forEach(([domainId, subcatMap]) => {
    const domainPool = out[domainId] || [];
    Object.entries(subcatMap || {}).forEach(([subcatLabel, concepts]) => {
      const subcatPool = out[subcatLabel] || pickDeterministic(domainPool, `subcat:${domainId}:${subcatLabel}`, 12);
      (Array.isArray(concepts) ? concepts : []).forEach((concept) => {
        const key = `${subcatLabel}::${concept}`;
        const dynamic = buildUnsplashSourcePool(
          `concept:${domainId}:${key}`,
          buildKeywords({ domainId, subcatLabel, concept }),
          30
        );
        const derived = pickDeterministic(subcatPool, `concept:${domainId}:${key}`, 12);
        out[key] = uniq([...dynamic, ...derived]).slice(0, 48);
      });
    });
  });

  return out;
})();
