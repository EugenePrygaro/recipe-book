/**
 * Стан застосунку.
 *  - ui:   що бачить користувач (пошук, фільтри, відкрита страва, порції)
 *  - data: що прийшло з сервера (додані страви, правки, фото, особисті дані)
 * Плюс селектори, що збирають дані для відображення.
 */
import { BUILTIN } from "./data/builtin.js";
import { NO_CATEGORY } from "./config.js";
import { plural } from "./lib/dom.js";
import { fmtDay } from "./lib/format.js";

export const ui = {
  q: "",
  mode: "all", // all | name | cat | ing
  cat: null,
  tag: null,
  fav: false,
  sort: "default",
  minRating: 0, // фільтр «оцінка від…»
  openId: null, // розгорнута картка на комп’ютері
  serv: new Map(), // id → обрана кількість порцій
  checked: new Set(), // відмічені інгредієнти й кроки під час готування
};

export const emptyPersonal = () => ({
  fav: [],
  pantry: [],
  shop: { recipes: {}, checked: [], extra: [] },
  celebration: { current: null, archive: [] },
});

export const data = {
  loaded: false,
  userRecipes: [],
  edits: {},
  photos: {},
  cooked: {}, // id → [мітки часу] (спільне)
  ratings: {}, // id → { uid: { stars, name } } (спільне)
  personal: emptyPersonal(),
  offline: false,
};

const CATEGORY_PRIORITY = ["сніданки", "гарніри", "салати", "м'ясо", "супи"];
const normalizedCategory = (category) =>
  category.toLocaleLowerCase("uk").replace(/[’ʼ`]/g, "'");

export function normPersonal(p) {
  const e = emptyPersonal();
  if (!p || typeof p !== "object") return e;
  const sh = p.shop && typeof p.shop === "object" ? p.shop : {};
  const celebration =
    p.celebration && typeof p.celebration === "object" ? p.celebration : {};
  return {
    fav: Array.isArray(p.fav) ? p.fav : [],
    pantry: Array.isArray(p.pantry) ? p.pantry : [],
    shop: {
      recipes: sh.recipes && typeof sh.recipes === "object" ? sh.recipes : {},
      checked: Array.isArray(sh.checked) ? sh.checked : [],
      extra: Array.isArray(sh.extra) ? sh.extra : [],
    },
    celebration: {
      current:
        celebration.current && typeof celebration.current === "object"
          ? celebration.current
          : null,
      archive: Array.isArray(celebration.archive) ? celebration.archive : [],
    },
  };
}

/** Усі страви: спершу додані вами (новіші вище), потім вбудовані з урахуванням правок. */
export function allRecipes() {
  const mine = [...data.userRecipes].sort(
    (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
  );
  const builtin = BUILTIN.map((b) =>
    data.edits[b.id]
      ? { ...b, ...data.edits[b.id], id: b.id, builtin: true, edited: true }
      : b,
  );
  return [...mine, ...builtin];
}

export const findRecipe = (id) => allRecipes().find((r) => r.id === id);

export function categories() {
  const counts = new Map();
  for (const r of allRecipes()) {
    const c = r.category || NO_CATEGORY;
    counts.set(c, (counts.get(c) || 0) + 1);
  }
  return [...counts.entries()].sort(([a], [b]) => {
    const ai = CATEGORY_PRIORITY.indexOf(normalizedCategory(a));
    const bi = CATEGORY_PRIORITY.indexOf(normalizedCategory(b));
    if (ai >= 0 || bi >= 0) {
      if (ai < 0) return 1;
      if (bi < 0) return -1;
      if (ai !== bi) return ai - bi;
    }
    return a.localeCompare(b, "uk");
  });
}

export const photoSrc = (r) => data.photos[r.id]?.url || null;
/** Зменшена копія фото для карток (якщо є). */
export const photoThumb = (r) => data.photos[r.id]?.thumbUrl || photoSrc(r);
export const isFav = (id) => data.personal.fav.includes(id);
export const cookedArr = (id) =>
  Array.isArray(data.cooked[id]) ? data.cooked[id] : [];
export const lastCooked = (id) => {
  const a = cookedArr(id);
  return a.length ? a[a.length - 1] : 0;
};

/* ---------- оцінки ---------- */
export const ratingsOf = (id) =>
  Object.entries(data.ratings[id] || {}).map(([uid, v]) => ({ uid, ...v }));
export const myRating = (id) => data.ratings[id]?.shared?.stars || 0;
/** Середня оцінка або 0, якщо ніхто не оцінював. */
export function avgRating(id) {
  const list = ratingsOf(id);
  return list.length ? list.reduce((s, r) => s + r.stars, 0) / list.length : 0;
}

/** «Давно не готували»: готували хоча б раз, востаннє — понад `days` днів тому. */
export const STALE_DAYS = 21;
export const isStale = (id, days = STALE_DAYS) => {
  const last = lastCooked(id);
  return last > 0 && Date.now() - last > days * 86400000;
};
export const servingsOf = (r) => ui.serv.get(r.id) || r.servings;

export function cookedText(id) {
  const list = cookedArr(id);
  if (!list.length) return "";
  return `Готували ${list.length} ${plural(list.length, "раз", "рази", "разів")}, востаннє ${fmtDay(list[list.length - 1])}`;
}
