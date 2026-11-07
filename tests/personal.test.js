import { test } from "node:test";
import assert from "node:assert/strict";
import personal from "../api/personal.js";
import { setRedisClient } from "../lib/store.js";
import { MemoryRedis } from "../scripts/memory-redis.js";

function response() {
  return {
    statusCode: 200,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers[name] = value; },
    json(body) { this.body = body; },
  };
}

test("unauthenticated personal state merges legacy profiles and is shared", async () => {
  const redis = new MemoryRedis();
  setRedisClient(redis);
  await redis.set("rb:personal:tg:123", { fav: ["b-plov"], pantry: ["rice"] });
  await redis.set("rb:personal:web", { fav: ["b-soup"], shop: { extra: [{ id: "x", text: "milk" }] } });

  const initial = response();
  await personal({ method: "GET", query: {}, headers: {} }, initial);
  assert.deepEqual(initial.body.state.fav.sort(), ["b-plov", "b-soup"]);
  assert.deepEqual(initial.body.state.pantry, ["rice"]);
  assert.deepEqual(initial.body.state.shop.extra, [{ id: "x", text: "milk", done: false }]);

  const update = response();
  await personal({
    method: "PUT",
    query: {},
    headers: {},
    body: { state: { fav: ["b-shared"] }, revision: initial.body.revision },
  }, update);
  assert.equal(update.body.ok, true);
  assert.equal(update.body.revision, initial.body.revision + 1);

  const secondVisitor = response();
  await personal({ method: "GET", query: {}, headers: {} }, secondVisitor);
  assert.deepEqual(secondVisitor.body.state.fav, ["b-shared"]);
});

test("stale personal writes return latest state instead of overwriting concurrent changes", async () => {
  const redis = new MemoryRedis();
  setRedisClient(redis);
  const read = response();
  await personal({ method: "GET", query: {}, headers: {} }, read);

  const first = response();
  await personal({
    method: "PUT", query: {}, headers: {},
    body: { state: { fav: ["b-first"] }, revision: read.body.revision },
  }, first);
  assert.equal(first.statusCode, 200);

  const stale = response();
  await personal({
    method: "PUT", query: {}, headers: {},
    body: { state: { pantry: ["rice"] }, revision: read.body.revision },
  }, stale);
  assert.equal(stale.statusCode, 409);
  assert.deepEqual(stale.body.state.fav, ["b-first"]);
  assert.equal(stale.body.revision, first.body.revision);
});
