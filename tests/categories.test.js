import { test } from "node:test";
import assert from "node:assert/strict";
import { categories } from "../public/js/state.js";

test("популярні категорії відображаються першими у заданому порядку", () => {
  const priority = ["Сніданки", "Гарніри", "Салати", "М’ясо", "Супи"];
  assert.deepEqual(categories().slice(0, priority.length).map(([name]) => name), priority);
});
