export const CATEGORIES_LIST = [
  { id: "love_relationships", label: "Love & Relationships", color: "#FF4D8D", icon: "💞" },
  { id: "lifestyle_values", label: "Lifestyle & Values", color: "#8B5CF6", icon: "🧭" },
  { id: "cultural_taste", label: "Cultural Taste", color: "#F97316", icon: "🎭" },
  { id: "hobbies_activities", label: "Hobbies & Activities", color: "#10B981", icon: "🏃" },
  { id: "food_everyday_life", label: "Food & Everyday Life", color: "#EF4444", icon: "🍽️" }
];

export const SUBCATEGORIES_BY_DOMAIN = {
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

const DOMAIN_IDS = new Set(CATEGORIES_LIST.map((item) => item.id));

export function normalizeCategoryId(categoryId) {
  const key = String(categoryId || "").trim().toLowerCase();
  if (!key) return "";
  return DOMAIN_IDS.has(key) ? key : "";
}

export const MESSAGE_UNLOCK_THRESHOLD = 30;
const MATCH_WEIGHTS = {
  interests: 0.65,
  mood: 0.15,
  quote: 0.1,
  interaction: 0.1
};

const MOOD_GROUPS = {
  energetic: ["😎", "🔥", "💪", "🎉", "🌟", "⚡"],
  calm: ["😊", "🤔", "😴", "💭", "❤️", "🧘"],
  social: ["😄", "🥳", "😁", "🤝", "🎊"]
};

const clamp01 = (value) => Math.max(0, Math.min(1, value));

const toWordSet = (input = "") =>
  new Set(
    String(input)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 3)
  );

const getMoodGroup = (mood = "") => {
  const normalized = String(mood || "").trim();
  if (!normalized) return null;
  if (MOOD_GROUPS.energetic.includes(normalized)) return "energetic";
  if (MOOD_GROUPS.calm.includes(normalized)) return "calm";
  if (MOOD_GROUPS.social.includes(normalized)) return "social";
  return "other";
};

function computeInterestCompatibility(myInterests = [], otherInterests = []) {
  const myByCategory = {};
  const otherByCategory = {};

  myInterests.forEach((interest) => {
    const key = normalizeCategoryId(interest.category);
    if (!key) return;
    myByCategory[key] = (myByCategory[key] || 0) + 1;
  });

  otherInterests.forEach((interest) => {
    const key = normalizeCategoryId(interest.category);
    if (!key) return;
    otherByCategory[key] = (otherByCategory[key] || 0) + 1;
  });

  const myCategories = new Set(Object.keys(myByCategory));
  const otherCategories = new Set(Object.keys(otherByCategory));
  const unionCategories = new Set([...myCategories, ...otherCategories]);
  const sharedCategories = CATEGORIES_LIST.map((cat) => cat.id).filter(
    (categoryId) => myCategories.has(categoryId) && otherCategories.has(categoryId)
  );

  if (!unionCategories.size) {
    return {
      normalizedScore: 0,
      matchedCategories: []
    };
  }

  const categoryOverlap = sharedCategories.length / unionCategories.size;
  const depthScore = sharedCategories.length
    ? sharedCategories.reduce((sum, categoryId) => {
        const mine = myByCategory[categoryId] || 0;
        const other = otherByCategory[categoryId] || 0;
        if (!mine || !other) return sum;
        return sum + Math.min(mine, other) / Math.max(mine, other);
      }, 0) / sharedCategories.length
    : 0;

  const normalizedScore = clamp01(categoryOverlap * 0.7 + depthScore * 0.3);
  return {
    normalizedScore,
    matchedCategories: sharedCategories
  };
}

function toCategoryArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeCategoryId(item))
    .filter(Boolean);
}

function mergeCategoryPresence({ byInterests, fallbackCategories }) {
  const merged = { ...byInterests };
  toCategoryArray(fallbackCategories).forEach((categoryId) => {
    if (!merged[categoryId]) {
      // Add a light synthetic weight so onboarding key categories participate in matching.
      merged[categoryId] = 0.75;
    }
  });
  return merged;
}

function computeMoodCompatibility(currentMood, otherMood) {
  const moodA = String(currentMood || "").trim();
  const moodB = String(otherMood || "").trim();
  if (!moodA && !moodB) return 0.35;
  if (!moodA || !moodB) return 0.2;
  if (moodA === moodB) return 1;
  return getMoodGroup(moodA) === getMoodGroup(moodB) ? 0.65 : 0.2;
}

function computeQuoteCompatibility(currentQuote, otherQuote) {
  const setA = toWordSet(currentQuote);
  const setB = toWordSet(otherQuote);
  if (!setA.size && !setB.size) return 0.3;
  if (!setA.size || !setB.size) return 0.12;

  const intersectionSize = Array.from(setA).filter((word) => setB.has(word)).length;
  const unionSize = new Set([...setA, ...setB]).size;
  if (!unionSize) return 0;
  return clamp01(intersectionSize / unionSize);
}

function computeInteractionCompatibility(currentUserId, otherUserId, messages = []) {
  const messageCount = (messages || []).filter(
    (msg) =>
      (msg.from_user_id === currentUserId && msg.to_user_id === otherUserId) ||
      (msg.from_user_id === otherUserId && msg.to_user_id === currentUserId)
  ).length;
  return {
    normalizedScore: clamp01(1 - Math.exp(-messageCount / 6)),
    messageCount
  };
}

/**
 * Calculate match score between two users
 * Returns percentage (0-100) and details
 */
export const calculateMatchScore = (currentUser, otherUser, interests, messages) => {
  if (!currentUser || !otherUser) {
    return { percentage: 0, rawScore: 0, interestScore: 0, moodScore: 0, quoteScore: 0, interactionScore: 0, matchedCategories: [], canMessage: false };
  }
  const safeInterests = interests || [];
  const safeMessages = messages || [];
  const myInterests = safeInterests.filter((item) => item.user_id === currentUser.id);
  const otherInterests = safeInterests.filter((item) => item.user_id === otherUser.id);

  const myByCategory = myInterests.reduce((acc, item) => {
    const key = normalizeCategoryId(item.category);
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const otherByCategory = otherInterests.reduce((acc, item) => {
    const key = normalizeCategoryId(item.category);
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const mergedMyInterests = Object.entries(
    mergeCategoryPresence({
      byInterests: myByCategory,
      fallbackCategories: currentUser?.key_interest_categories
    })
  ).flatMap(([category, count]) =>
    Array.from({ length: Math.max(1, Math.round(Number(count) || 1)) }).map(() => ({ category }))
  );
  const mergedOtherInterests = Object.entries(
    mergeCategoryPresence({
      byInterests: otherByCategory,
      fallbackCategories: otherUser?.key_interest_categories
    })
  ).flatMap(([category, count]) =>
    Array.from({ length: Math.max(1, Math.round(Number(count) || 1)) }).map(() => ({ category }))
  );

  const {
    normalizedScore: interestNorm,
    matchedCategories
  } = computeInterestCompatibility(mergedMyInterests, mergedOtherInterests);
  const moodNorm = computeMoodCompatibility(currentUser.mood, otherUser.mood);
  const quoteNorm = computeQuoteCompatibility(currentUser.quote, otherUser.quote);
  const {
    normalizedScore: interactionNorm,
    messageCount
  } = computeInteractionCompatibility(currentUser.id, otherUser.id, safeMessages);

  const rawNormalized =
    interestNorm * MATCH_WEIGHTS.interests +
    moodNorm * MATCH_WEIGHTS.mood +
    quoteNorm * MATCH_WEIGHTS.quote +
    interactionNorm * MATCH_WEIGHTS.interaction;

  const percentage = Math.round(clamp01(rawNormalized) * 100);
  const interestScore = Math.round(interestNorm * 100);
  const moodScore = Math.round(moodNorm * 100);
  const quoteScore = Math.round(quoteNorm * 100);
  const interactionScore = Math.round(interactionNorm * 100);

  return {
    percentage,
    rawScore: percentage,
    interestScore,
    moodScore,
    quoteScore,
    interactionScore,
    messageCount,
    matchedCategories,
    canMessage: percentage >= MESSAGE_UNLOCK_THRESHOLD
  };
};

export const isProfileDiscoverable = (profile, interests = []) => {
  if (!profile?.user_id) return false;
  if (profile?.onboarding_completed) return true;
  if (profile?.bio || profile?.profile_photo) return true;
  return (interests || []).some((item) => item.user_id === profile.user_id);
};

export const buildMatchExplanation = (currentUser, otherUser, interests = [], score = null) => {
  if (!currentUser || !otherUser) {
    return {
      sharedCategories: 0,
      sharedInterests: 0,
      sharedValues: 0,
      photoMatchesByCategory: [],
      keyMatches: []
    };
  }

  const myInterests = (interests || []).filter((item) => item.user_id === currentUser.id);
  const otherInterests = (interests || []).filter((item) => item.user_id === otherUser.id);

  const byCategoryMine = myInterests.reduce((acc, item) => {
    const key = normalizeCategoryId(item.category);
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
  const byCategoryOther = otherInterests.reduce((acc, item) => {
    const key = normalizeCategoryId(item.category);
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const matchedCategories = score?.matchedCategories || [];
  const photoMatchesByCategory = matchedCategories
    .map((categoryId) => {
      const mine = byCategoryMine[categoryId] || [];
      const other = byCategoryOther[categoryId] || [];
      return {
        categoryId,
        count: Math.min(mine.length, other.length)
      };
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  const sharedInterests = photoMatchesByCategory.reduce((sum, item) => sum + item.count, 0);
  const sharedValues = Math.min(
    (byCategoryMine.lifestyle_values || []).length,
    (byCategoryOther.lifestyle_values || []).length
  );

  const mineTitles = new Set(
    myInterests
      .map((item) => String(item.title || "").trim().toLowerCase())
      .filter(Boolean)
  );
  const keyMatches = otherInterests
    .map((item) => String(item.title || "").trim())
    .filter((title) => title && mineTitles.has(title.toLowerCase()))
    .slice(0, 3);

  return {
    sharedCategories: matchedCategories.length,
    sharedInterests,
    sharedValues,
    photoMatchesByCategory,
    keyMatches
  };
};
