import { test } from "node:test";
import assert from "node:assert/strict";
import { seasonFor } from "../public/js/lib/season.js";

const seasonAt = (date) => seasonFor(new Date(`${date}T12:00:00`))?.key || null;

test("зимові свята починаються 10 грудня та закінчуються 14 січня", () => {
  assert.equal(seasonAt("2026-12-09"), "winter");
  assert.equal(seasonAt("2026-12-10"), "newyear");
  assert.equal(seasonAt("2027-01-14"), "newyear");
  assert.equal(seasonAt("2027-01-15"), "winter");
});

test("валентинова тема має пріоритет над зимою", () => {
  assert.equal(seasonAt("2027-02-11"), "winter");
  assert.equal(seasonAt("2027-02-12"), "valentine");
  assert.equal(seasonAt("2027-02-15"), "valentine");
  assert.equal(seasonAt("2027-02-16"), "winter");
  assert.equal(seasonAt("2028-02-29"), "winter");
});

test("осіння тема діє в жовтні та листопаді", () => {
  assert.equal(seasonAt("2026-09-30"), null);
  assert.equal(seasonAt("2026-10-01"), "autumn");
  assert.equal(seasonAt("2026-11-30"), "autumn");
  assert.equal(seasonAt("2026-12-01"), "winter");
});

test("літня тема діє в червні, липні й серпні", () => {
  assert.equal(seasonAt("2026-05-31"), "spring");
  assert.equal(seasonAt("2026-06-01"), "summer");
  assert.equal(seasonAt("2026-08-31"), "summer");
  assert.equal(seasonAt("2026-09-01"), null);
});

test("весняна тема діє з березня до травня", () => {
  assert.equal(seasonAt("2026-02-28"), "winter");
  assert.equal(seasonAt("2026-03-01"), "spring");
  assert.equal(seasonAt("2026-05-31"), "spring");
  assert.equal(seasonAt("2026-06-01"), "summer");
});
