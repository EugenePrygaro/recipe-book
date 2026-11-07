import { test } from "node:test";
import assert from "node:assert/strict";
import { collectIngredients } from "../public/js/lib/ingredients.js";

test("shop and celebration ingredient collection share normalization and quantity aggregation", () => {
  const recipe = {
    title: "Суп",
    servings: 2,
    ingredients: [
      { name: "Мед (маринад)", amount: 0.2, unit: "кг" },
      { name: "Мед", amount: 100, unit: "г" },
      { name: "Сіль, перець", amount: null, unit: "" },
      { name: "Вода", amount: 1, unit: "л" },
    ],
  };
  const rows = collectIngredients([[recipe, 2]], [{ name: "Домашня страва", ingredients: ["мед", "Сир"] }]);
  const honey = rows.find((item) => item.key === "мед");
  assert.equal(honey.amounts.get("г"), 300);
  assert.deepEqual([...honey.sources], ["Суп", "Домашня страва"]);
  assert.ok(rows.some((item) => item.name === "Сіль"));
  assert.ok(rows.some((item) => item.name === "Перець"));
  assert.ok(!rows.some((item) => item.key === "вода"));
});
