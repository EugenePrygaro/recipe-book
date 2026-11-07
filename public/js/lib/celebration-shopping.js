import { norm } from "./dom.js";

function ingredientId(planId, dishId, ingredient, index) {
  let hash = 2166136261;
  for (const char of norm(ingredient)) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `holiday-${planId.slice(-7)}-${dishId.slice(-7)}-${(hash >>> 0).toString(36)}-${index}`;
}

/** Keep the shared cart aligned with the active celebration without touching unrelated items. */
export function syncCelebrationShopping(plan, shop, validRecipeIds) {
  const previousRecipes = plan.shopping?.recipes || {};
  const nextRecipes = {};
  for (const dish of plan.recipes) {
    if (!validRecipeIds.has(dish.id)) continue;
    const previous = previousRecipes[dish.id];
    nextRecipes[dish.id] = {
      servings: dish.servings,
      owned: previous ? previous.owned : !Object.hasOwn(shop.recipes, dish.id),
    };
  }
  for (const [id, previous] of Object.entries(previousRecipes)) {
    if (!Object.hasOwn(nextRecipes, id) && previous.owned && shop.recipes[id] === previous.servings) {
      delete shop.recipes[id];
    }
  }
  for (const [id, entry] of Object.entries(nextRecipes)) shop.recipes[id] = entry.servings;

  const previousExtraIds = new Set(plan.shopping?.extras || []);
  const existingExtra = new Map(shop.extra.filter((item) => previousExtraIds.has(item.id)).map((item) => [item.id, item]));
  shop.extra = shop.extra.filter((item) => !previousExtraIds.has(item.id));
  const extras = plan.custom.flatMap((dish) => dish.ingredients.map((ingredient, index) => {
    const id = ingredientId(plan.id, dish.id, ingredient, index);
    return { id, text: ingredient, done: existingExtra.get(id)?.done || plan.checked.includes(norm(ingredient)) };
  }));
  shop.extra.push(...extras);
  plan.shopping = { recipes: nextRecipes, extras: extras.map((item) => item.id) };
}
