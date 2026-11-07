/**
 * Перевірка й очищення даних від клієнта перед збереженням.
 */
import { HttpError } from "./http.js";

/** Має збігатися з ключами TAGS у public/js/config.js */
export const TAG_KEYS = ["quick", "everyday", "holiday", "spicy"];
export const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const ICON_RE = /^[a-z0-9-]{1,40}$/;
export const NO_CATEGORY = "Без категорії";

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function int(v, min, max) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min) return null;
  return Math.min(max, Math.round(n));
}

export function requireId(id) {
  if (typeof id !== "string" || !ID_RE.test(id)) throw new HttpError(400, "invalid_id");
  return id;
}

/** Страва: обов’язкові назва, хоча б один інгредієнт і хоча б один крок. */
export function sanitizeRecipe(input) {
  if (!input || typeof input !== "object") throw new HttpError(400, "invalid");
  const title = str(input.title, 120);

  const ingredients = (Array.isArray(input.ingredients) ? input.ingredients : [])
    .slice(0, 80)
    .map((i) => {
      const n = i?.amount === null || i?.amount === "" ? NaN : Number(i?.amount);
      const amount = Number.isFinite(n) && n > 0 ? Math.min(100000, Math.round(n * 1000) / 1000) : null;
      return { name: str(i?.name, 120), amount, unit: amount === null ? "" : str(i?.unit, 20) };
    })
    .filter((i) => i.name);

  const steps = (Array.isArray(input.steps) ? input.steps : [])
    .slice(0, 60)
    .map((s) => str(s, 1500))
    .filter(Boolean);

  if (!title || !ingredients.length || !steps.length) throw new HttpError(400, "invalid");

  return {
    title,
    category: str(input.category, 40) || NO_CATEGORY,
    description: str(input.description, 300),
    servings: int(input.servings, 1, 50) || 2,
    kcal: int(input.kcal, 1, 10000),
    prot: int(input.prot, 0, 1000),
    fat: int(input.fat, 0, 1000),
    carb: int(input.carb, 0, 1000),
    icon: typeof input.icon === "string" && ICON_RE.test(input.icon) ? input.icon : "",
    tags: [...new Set((Array.isArray(input.tags) ? input.tags : []).filter((t) => TAG_KEYS.includes(t)))],
    ingredients,
    steps,
  };
}

/** Оцінка: ціле 1–5, або 0 / null — прибрати. */
export function sanitizeStars(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(5, Math.max(1, Math.round(n)));
}

/** Особисті дані: обране, продукти вдома, список покупок. */
export function sanitizePersonal(input) {
  const o = input && typeof input === "object" ? input : {};
  const isId = (v) => typeof v === "string" && ID_RE.test(v);
  const obj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});

  const fav = [...new Set((Array.isArray(o.fav) ? o.fav : []).filter(isId))].slice(0, 1000);

  // продукти, які є вдома (для «Що приготувати з того, що є»)
  const pantry = [...new Set((Array.isArray(o.pantry) ? o.pantry : [])
    .filter((x) => typeof x === "string").map((x) => x.trim().slice(0, 60)).filter(Boolean))].slice(0, 300);

  const shop = obj(o.shop);
  const recipes = {};
  for (const [k, v] of Object.entries(obj(shop.recipes)).slice(0, 200)) {
    const n = int(v, 1, 50);
    if (isId(k) && n) recipes[k] = n;
  }
  const checked = (Array.isArray(shop.checked) ? shop.checked : [])
    .filter((x) => typeof x === "string")
    .map((x) => x.slice(0, 200))
    .slice(0, 1000);
  const extra = (Array.isArray(shop.extra) ? shop.extra : [])
    .filter((x) => x && typeof x.text === "string")
    .slice(0, 200)
    .map((x) => ({ id: str(x.id, 40) || `x${Math.random().toString(36).slice(2, 8)}`, text: str(x.text, 120), done: !!x.done }))
    .filter((x) => x.text);

  const sanitizeDish = (dish) => {
    if (!dish || typeof dish !== "object" || !isId(dish.id)) return null;
    return { id: dish.id, servings: int(dish.servings, 1, 50) || 1, ready: Boolean(dish.ready) };
  };
  const sanitizeCustomDish = (dish) => {
    if (!dish || typeof dish !== "object" || !isId(dish.id)) return null;
    const name = str(dish.name, 100);
    if (!name) return null;
    return {
      id: dish.id,
      name,
      servings: int(dish.servings, 1, 50) || 1,
      ready: Boolean(dish.ready),
      ingredients: [...new Set((Array.isArray(dish.ingredients) ? dish.ingredients : [])
        .filter((x) => typeof x === "string").map((x) => x.trim().slice(0, 120)).filter(Boolean))].slice(0, 100),
    };
  };
  const sanitizePlan = (plan) => {
    if (!plan || typeof plan !== "object" || !isId(plan.id)) return null;
    const title = str(plan.title, 100);
    if (!title) return null;
    const date = typeof plan.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(plan.date) ? plan.date : "";
    const shopping = obj(plan.shopping);
    const shoppingRecipes = {};
    for (const [id, entry] of Object.entries(obj(shopping.recipes)).slice(0, 100)) {
      const objectEntry = entry && typeof entry === "object" && !Array.isArray(entry);
      const count = int(objectEntry ? entry.servings : entry, 1, 50);
      if (isId(id) && count) shoppingRecipes[id] = { servings: count, owned: objectEntry && Boolean(entry.owned) };
    }
    return {
      id: plan.id,
      title,
      date,
      recipes: (Array.isArray(plan.recipes) ? plan.recipes : []).map(sanitizeDish).filter(Boolean).slice(0, 100),
      custom: (Array.isArray(plan.custom) ? plan.custom : []).map(sanitizeCustomDish).filter(Boolean).slice(0, 50),
      checked: [...new Set((Array.isArray(plan.checked) ? plan.checked : [])
        .filter((x) => typeof x === "string").map((x) => x.trim().slice(0, 160)).filter(Boolean))].slice(0, 1000),
      shopping: {
        recipes: shoppingRecipes,
        extras: [...new Set((Array.isArray(shopping.extras) ? shopping.extras : [])
          .filter((x) => typeof x === "string").map((x) => x.slice(0, 40)).filter(Boolean))].slice(0, 100),
      },
    };
  };
  const celebration = obj(o.celebration);
  const archive = (Array.isArray(celebration.archive) ? celebration.archive : [])
    .map((plan) => ({ ...sanitizePlan(plan), archivedAt: int(plan?.archivedAt, 0, Number.MAX_SAFE_INTEGER) || 0 }))
    .filter((plan) => plan.id).slice(0, 20);
  return {
    fav,
    pantry,
    shop: { recipes, checked, extra },
    celebration: { current: sanitizePlan(celebration.current), archive },
  };
}
