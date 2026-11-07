/**
 * Спільні для всіх дані: обране, продукти вдома і список покупок.
 * GET /api/personal          → {state}
 * PUT /api/personal {state, revision} → compare-and-swap збереження
 */
import { handler, readJson, send } from "../lib/http.js";
import { redis, KEYS } from "../lib/store.js";
import { sanitizePersonal } from "../lib/validate.js";

const SHARED_UID = "shared";
const WRITE_PERSONAL = `
local raw = redis.call("GET", KEYS[1])
local revision = 0
if raw then
  local ok, current = pcall(cjson.decode, raw)
  if ok and type(current) == "table" and current.__personalEnvelope == true then
    revision = tonumber(current.revision) or 0
  end
end
if revision ~= tonumber(ARGV[1]) then return 0 end
redis.call("SET", KEYS[1], ARGV[2])
return 1
`;

function decodeStored(value) {
  if (value?.__personalEnvelope === true && Number.isSafeInteger(value.revision) && value.revision >= 0) {
    return { state: value.state, revision: value.revision };
  }
  return { state: value, revision: 0 };
}

function mergePersonal(states) {
  const merged = {
    fav: new Set(),
    pantry: new Set(),
    shop: { recipes: {}, checked: new Set(), extra: new Map() },
    celebration: { current: null, archive: [] },
  };
  for (const raw of states) {
    const state = sanitizePersonal(raw);
    state.fav.forEach((id) => merged.fav.add(id));
    state.pantry.forEach((id) => merged.pantry.add(id));
    Object.assign(merged.shop.recipes, state.shop.recipes);
    state.shop.checked.forEach((id) => merged.shop.checked.add(id));
    state.shop.extra.forEach((item) => merged.shop.extra.set(item.id || item.text, item));
    if (state.celebration.current || state.celebration.archive.length) {
      merged.celebration = state.celebration;
    }
  }
  return sanitizePersonal({
    fav: [...merged.fav],
    pantry: [...merged.pantry],
    shop: {
      recipes: merged.shop.recipes,
      checked: [...merged.shop.checked],
      extra: [...merged.shop.extra.values()],
    },
    celebration: merged.celebration,
  });
}

export default handler(["GET", "PUT"], async (req, res) => {
  const r = redis();
  const key = KEYS.personal(SHARED_UID);

  if (req.method === "GET") {
    let state = await r.get(key);
    if (!state) {
      const legacyKeys = (await r.keys(KEYS.personal("*"))).filter((legacyKey) => legacyKey !== key);
      const legacyStates = await Promise.all(legacyKeys.map((legacyKey) => r.get(legacyKey)));
      state = mergePersonal(legacyStates);
      if (legacyStates.some(Boolean)) await r.set(key, state);
    }
    const current = decodeStored(state);
    return send(res, 200, { state: sanitizePersonal(current.state), revision: current.revision });
  }

  const body = readJson(req);
  const revision = Number(body.revision);
  if (!Number.isSafeInteger(revision) || revision < 0) {
    return send(res, 400, { error: "invalid_revision" });
  }
  const current = await r.get(key);
  const currentRevision = decodeStored(current).revision;
  const nextRevision = currentRevision + 1;
  const envelope = { __personalEnvelope: true, revision: nextRevision, state: sanitizePersonal(body.state) };
  const stored = await r.eval(WRITE_PERSONAL, [key], [String(revision), JSON.stringify(envelope)]);
  if (Number(stored) !== 1) {
    const latest = decodeStored(await r.get(key));
    return send(res, 409, { error: "revision_conflict", state: sanitizePersonal(latest.state), revision: latest.revision });
  }
  send(res, 200, { ok: true, revision: nextRevision });
});
