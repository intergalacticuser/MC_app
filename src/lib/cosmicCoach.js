function cleanText(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim();
}

function listTitles(titles, { limit = 8 } = {}) {
  const arr = Array.isArray(titles) ? titles : [];
  const cleaned = arr.map(cleanText).filter(Boolean);
  return cleaned.slice(0, limit);
}

export function buildInterestNudgePrompt({
  categoryId = "",
  categoryLabel = "",
  interestTitle = "",
  existingTitles = [],
  userName = ""
} = {}) {
  const existing = listTitles(existingTitles);
  const safeUserName = cleanText(userName);
  const safeTitle = cleanText(interestTitle);
  const safeCategoryLabel = cleanText(categoryLabel);
  const safeCategoryId = cleanText(categoryId);

  return [
    "Ты встроенный ассистент MindCircle в космической тематике.",
    "Ситуация: пользователь добавляет новый интерес в категорию своего профиля.",
    "",
    "Тон: очень позитивный, теплый, приятный, немного \"звездный\" (легкие космические метафоры), но без инфантилизма.",
    "Задача: напиши ОДНУ короткую реплику (максимум 2 предложения, до 220 символов) в стиле дружелюбного \"комикс-пузыря\".",
    "Реплика должна:",
    "- быть уникальной и не шаблонной",
    "- объяснять, чем этот интерес может быть классным для человека",
    "- задать 1 конкретный вопрос, чтобы подтолкнуть пользователя написать описание (что именно ему нравится)",
    "- без перечислений, без кавычек, без markdown",
    "",
    `Пользователь: ${safeUserName || "(неизвестно)"}`,
    `Категория: ${safeCategoryLabel || "(неизвестно)"} (${safeCategoryId || "id?"})`,
    `Новый интерес: ${safeTitle || "(пусто)"}`,
    `Уже есть в этой категории: ${existing.length ? existing.join(", ") : "(пока пусто)"}`,
    "",
    "Ответ только текстом реплики."
  ].join("\n");
}

export function buildInterestReflectionPrompt({
  categoryId = "",
  categoryLabel = "",
  interestTitle = "",
  userDescription = "",
  userName = ""
} = {}) {
  const safeUserName = cleanText(userName);
  const safeTitle = cleanText(interestTitle);
  const safeCategoryLabel = cleanText(categoryLabel);
  const safeCategoryId = cleanText(categoryId);
  const safeDesc = String(userDescription || "").trim();

  return [
    "Ты встроенный ассистент MindCircle в космической тематике.",
    "Ситуация: пользователь уже добавил интерес и написал описание своими словами.",
    "",
    "Тон: очень позитивный, теплый, приятный, немного \"звездный\" (легкие космические метафоры), но без пафоса.",
    "Задача: ответь как поддерживающий гид (максимум 3 коротких предложения, до 320 символов).",
    "Ответ должен:",
    "- кратко перефразировать 1 ключевую мысль пользователя (покажи, что ты понял)",
    "- похвалить конкретно, без пустых комплиментов",
    "- мягко предложить следующий шаг одним вопросом (например, уточнить деталь или добавить еще один пример)",
    "- без кавычек, без markdown",
    "",
    `Пользователь: ${safeUserName || "(неизвестно)"}`,
    `Категория: ${safeCategoryLabel || "(неизвестно)"} (${safeCategoryId || "id?"})`,
    `Интерес: ${safeTitle || "(пусто)"}`,
    "Текст пользователя:",
    safeDesc ? safeDesc : "(пусто)",
    "",
    "Ответ только текстом."
  ].join("\n");
}
