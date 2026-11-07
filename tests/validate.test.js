import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeRecipe, sanitizePersonal, sanitizeStars } from "../lib/validate.js";

test("страва очищується й обрізається", () => {
  const r = sanitizeRecipe({
    title: "  Борщ  ",
    servings: "4",
    time: "30",
    kcal: null,
    prot: 0,
    tags: ["quick", "hack"],
    ingredients: [{ name: "Буряк", amount: "2", unit: "шт" }, { name: "Сіль", amount: null, unit: "г" }, { name: "" }],
    steps: ["Зварити", " "],
    evil: "<script>",
  });
  assert.equal(r.title, "Борщ");
  assert.equal(r.servings, 4);
  assert.equal("time" in r, false);
  assert.equal(r.kcal, null);
  assert.equal(r.prot, 0);
  assert.deepEqual(r.tags, ["quick"]);
  assert.deepEqual(r.ingredients, [{ name: "Буряк", amount: 2, unit: "шт" }, { name: "Сіль", amount: null, unit: "" }]);
  assert.deepEqual(r.steps, ["Зварити"]);
  assert.equal("evil" in r, false);
});

test("без назви, інгредієнтів чи кроків — помилка 400", () => {
  assert.throws(() => sanitizeRecipe({ title: "", ingredients: [{ name: "a" }], steps: ["b"] }), { status: 400 });
  assert.throws(() => sanitizeRecipe({ title: "a", ingredients: [], steps: ["b"] }), { status: 400 });
  assert.throws(() => sanitizeRecipe({ title: "a", ingredients: [{ name: "a" }], steps: [] }), { status: 400 });
});

test("особисті дані", () => {
  const p = sanitizePersonal({
    fav: ["b-plov", "b-plov", "BAD ID"],
    pantry: [" Курка ", "Курка", 5, ""],
    shop: { recipes: { "b-plov": 99, "b-x": 0 }, checked: ["цибуля"], extra: [{ id: "x1", text: "Пакети", done: 1 }, { text: 5 }] },
    celebration: {
      current: { id: "h-party", title: "День народження", date: "2026-12-20", recipes: [{ id: "b-plov", servings: "8", ready: 1 }, { id: "bad id" }], checked: ["цибуля"], custom: [{ id: "h-roll", name: "Рулет", servings: 2, ingredients: ["яйця"] }] },
      archive: [{ id: "h-old", title: "Минуле свято", recipes: [], custom: [], checked: [], archivedAt: 123 }],
    },
  });
  assert.deepEqual(p.fav, ["b-plov"]);
  assert.deepEqual(p.pantry, ["Курка"]);
  assert.deepEqual(p.shop.recipes, { "b-plov": 50 });
  assert.deepEqual(p.shop.extra, [{ id: "x1", text: "Пакети", done: true }]);
  assert.deepEqual(p.celebration.current.recipes, [{ id: "b-plov", servings: 8, ready: true }]);
  assert.deepEqual(p.celebration.current.custom[0].ingredients, ["яйця"]);
  assert.deepEqual(p.celebration.current.shopping, { recipes: {}, extras: [] });
  assert.equal(p.celebration.archive[0].archivedAt, 123);
  assert.deepEqual(sanitizePersonal(null), { fav: [], pantry: [], shop: { recipes: {}, checked: [], extra: [] }, celebration: { current: null, archive: [] } });
});

test("план зберігає відстеження кошика й очищає некоректні значення", () => {
  const personal = sanitizePersonal({
    celebration: {
      current: {
        id: "h-party", title: "Свято", recipes: [], custom: [], checked: [],
        shopping: { recipes: { "b-plov": { servings: 4, owned: true }, "bad id": { servings: 2, owned: true }, "b-soup": null }, extras: ["holiday-extra", 4] },
      },
    },
  });
  assert.deepEqual(personal.celebration.current.shopping, {
    recipes: { "b-plov": { servings: 4, owned: true } },
    extras: ["holiday-extra"],
  });
});

test("оцінка", () => {
  assert.equal(sanitizeStars(4), 4);
  assert.equal(sanitizeStars("5"), 5);
  assert.equal(sanitizeStars(9), 5);
  assert.equal(sanitizeStars(0.4), 1);
  assert.equal(sanitizeStars(0), 0);
  assert.equal(sanitizeStars(null), 0);
  assert.equal(sanitizeStars("abc"), 0);
});
