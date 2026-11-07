import { norm } from "./dom.js";

const SKIP = new Set(["вода"]);
const STRIP = /\s*\((заправка|маринад|пюре|за бажанням|якщо є)\)\s*/gi;

/** Combine recipe and custom-dish ingredients into normalized shopping rows. */
export function collectIngredients(recipes, customDishes = []) {
  const items = new Map();
  const entry = (name) => {
    const key = norm(name);
    if (!items.has(key)) items.set(key, { key, name, amounts: new Map(), sources: new Set() });
    return items.get(key);
  };
  const add = (name, amount, unit, source) => {
    const key = norm(name);
    if (!key || SKIP.has(key)) return;
    const item = entry(name);
    item.sources.add(source);
    if (amount === null || amount === undefined || amount === "" || !Number.isFinite(Number(amount))) return;
    let normalizedUnit = unit || "";
    let normalizedAmount = Number(amount);
    if (normalizedUnit === "кг") { normalizedUnit = "г"; normalizedAmount *= 1000; }
    if (normalizedUnit === "л") { normalizedUnit = "мл"; normalizedAmount *= 1000; }
    item.amounts.set(normalizedUnit, (item.amounts.get(normalizedUnit) || 0) + normalizedAmount);
  };

  for (const [recipe, servings] of recipes) {
    const factor = servings / (recipe.servings || 1);
    for (const ingredient of recipe.ingredients || []) {
      const clean = String(ingredient.name).replace(STRIP, " ").replace(/\s+/g, " ").trim();
      const noAmount = ingredient.amount === null || ingredient.amount === undefined || ingredient.amount === "" || !Number.isFinite(Number(ingredient.amount));
      if (noAmount) {
        for (const part of clean.split(/,\s*/)) {
          const name = part.charAt(0).toUpperCase() + part.slice(1);
          add(name, null, "", recipe.title);
        }
      } else {
        add(clean, Number(ingredient.amount) * factor, ingredient.unit, recipe.title);
      }
    }
  }
  for (const dish of customDishes) {
    for (const ingredient of dish.ingredients || []) add(ingredient, null, "", dish.name);
  }

  return [...items.values()].sort((a, b) => a.name.localeCompare(b.name, "uk"));
}
