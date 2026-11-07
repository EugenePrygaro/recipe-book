import { test } from "node:test";
import assert from "node:assert/strict";
import { syncCelebrationShopping } from "../public/js/lib/celebration-shopping.js";

test("removing dishes from the active plan removes only its owned shopping rows", () => {
  const plan = {
    id: "holiday-1",
    recipes: [{ id: "b-keep", servings: 6 }],
    custom: [{ id: "dish-new", name: "Салат", ingredients: ["Сир"] }],
    checked: [],
    shopping: {
      recipes: {
        "b-remove": { servings: 4, owned: true },
        "b-keep": { servings: 2, owned: false },
      },
      extras: ["holiday-1-dish-old-id"],
    },
  };
  const shop = {
    recipes: { "b-remove": 4, "b-keep": 2, "b-manual": 3 },
    checked: [],
    extra: [
      { id: "holiday-1-dish-old-id", text: "Старий сир", done: false },
      { id: "manual", text: "Пакети", done: false },
    ],
  };

  syncCelebrationShopping(plan, shop, new Set(["b-remove", "b-keep", "b-manual"]));
  assert.deepEqual(shop.recipes, { "b-keep": 6, "b-manual": 3 });
  assert.deepEqual(shop.extra.map((item) => item.id), ["manual", ...plan.shopping.extras]);
  assert.ok(shop.extra.some((item) => item.text === "Сир"));
});
