import { test } from "node:test";
import assert from "node:assert/strict";
import { mergePersonal } from "../public/js/lib/personal-merge.js";

test("three-way merge preserves parallel edits to different shared fields", () => {
  const base = { fav: [], pantry: [], shop: { recipes: {}, checked: [], extra: [] } };
  const local = { ...base, fav: ["b-local"] };
  const remote = { ...base, pantry: ["rice"] };
  assert.deepEqual(mergePersonal(base, local, remote), {
    fav: ["b-local"], pantry: ["rice"], shop: { recipes: {}, checked: [], extra: [] },
  });
});

test("three-way merge combines independent additions and keyed list entries", () => {
  const base = { fav: ["b-kept"], shop: { recipes: {}, checked: [], extra: [] } };
  const local = { fav: ["b-kept", "b-local"], shop: { recipes: {}, checked: [], extra: [{ id: "local", text: "milk" }] } };
  const remote = { fav: ["b-kept", "b-remote"], shop: { recipes: {}, checked: [], extra: [{ id: "remote", text: "bread" }] } };
  const merged = mergePersonal(base, local, remote);
  assert.deepEqual(merged.fav, ["b-kept", "b-local", "b-remote"]);
  assert.deepEqual(merged.shop.extra.map((item) => item.id).sort(), ["local", "remote"]);
});

test("three-way merge retains local removals and local winner for conflicting field edits", () => {
  const base = { fav: ["b-remove"], celebration: { current: { id: "h", title: "Original", recipes: [], custom: [], checked: [] } } };
  const local = { fav: [], celebration: { current: { id: "h", title: "Local title", recipes: [], custom: [], checked: [] } } };
  const remote = { fav: ["b-remove", "b-new"], celebration: { current: { id: "h", title: "Remote title", recipes: [], custom: [], checked: [] } } };
  const merged = mergePersonal(base, local, remote);
  assert.deepEqual(merged.fav, ["b-new"]);
  assert.equal(merged.celebration.current.title, "Local title");
});
