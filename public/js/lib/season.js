/**
 * Теми автоматично визначаються за датою.
 */

/** Дата православного Великодня (за новим стилем), алгоритм Меєуса для юліанського календаря. */
export function orthodoxEaster(year) {
  const a = year % 4, b = year % 7, c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31); // 3 — березень, 4 — квітень (юліанський)
  const day = ((d + e + 114) % 31) + 1;
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + 13); // юліанський → григоріанський (1900–2099)
  return date;
}

const between = (date, from, to) => date >= from && date <= to;
const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const theme = {
  newyear: { key: "newyear", greeting: "Святковий сезон: час планувати меню", icon: "christmas-tree", action: { tag: "holiday" } },
  winter: { key: "winter", greeting: "Зима: час для гарячих супів", icon: "snowflake", action: { cat: "Супи" } },
  valentine: { key: "valentine", greeting: "З Днем закоханих! Ваші улюблені страви", icon: "heart-with-ribbon", action: { fav: true } },
  autumn: { key: "autumn", greeting: "Осінь: затишні страви та сезонні смаки", icon: "leafy-green", action: null },
  spring: { key: "spring", greeting: "Весна: час свіжих і легких страв", icon: "cherry-blossom", action: null },
  summer: { key: "summer", greeting: "Літній настрій: час свіжих сезонних страв", icon: "sparkles", action: null },
};

function seasonalTheme(key, date) {
  if (key === "easter") {
    const easter = orthodoxEaster(date.getFullYear());
    return date >= easter
      ? { key: "easter", greeting: "Христос Воскрес! Святкові страви — тут", icon: "hatching-chick", action: { tag: "holiday" } }
      : { key: "easter", greeting: "Готуємось до Великодня", icon: "nest-with-eggs", action: { tag: "holiday" } };
  }
  return theme[key] || null;
}

/**
 * @returns {{key: string, greeting: string, icon: string, action: object|null} | null}
 * action — фільтр, який застосовується при натисканні на привітання.
 */
export function seasonFor(now = new Date()) {
  const d = dayStart(now);
  const m = d.getMonth() + 1;
  const day = d.getDate();

  const easter = orthodoxEaster(d.getFullYear());
  const easterFrom = new Date(easter); easterFrom.setDate(easter.getDate() - 7);
  const easterTo = new Date(easter); easterTo.setDate(easter.getDate() + 7);
  if (between(d, easterFrom, easterTo)) {
    return seasonalTheme("easter", d);
  }

  if ((m === 12 && day >= 10) || (m === 1 && day <= 14)) {
    let greeting = "Святковий сезон: час планувати меню";
    if (m === 12 && day >= 24 && day <= 26) greeting = "Веселого Різдва!";
    else if ((m === 12 && day >= 27) || (m === 1 && day <= 2)) greeting = "З Новим роком!";
    return { ...seasonalTheme("newyear", d), greeting };
  }

  if (m === 2 && day >= 12 && day <= 15) {
    return seasonalTheme("valentine", d);
  }

  if (m === 12 || m === 1 || m === 2) return seasonalTheme("winter", d);
  if (m === 10 || m === 11) return seasonalTheme("autumn", d);
  if (m >= 3 && m <= 5) return seasonalTheme("spring", d);
  if (m >= 6 && m <= 8) return seasonalTheme("summer", d);
  return null;
}

/** Активний сезон за поточною датою. */
export function activeSeason() {
  return seasonFor();
}
