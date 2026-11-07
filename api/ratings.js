/**
 * Спільна оцінка страви.
 * PUT /api/ratings?id=…  {stars: 1–5} → поставити; {stars: 0} → прибрати
 */
import { handler, readJson, send, query } from "../lib/http.js";
import { redis, KEYS } from "../lib/store.js";
import { requireId, sanitizeStars } from "../lib/validate.js";

export default handler(["PUT"], async (req, res) => {
  const id = requireId(query(req, "id"));
  const stars = sanitizeStars(readJson(req).stars);
  const r = redis();
  const rating = { ...((await r.hget(KEYS.ratings, id)) || {}) };
  if (stars) rating.shared = { stars, name: "Усі користувачі", at: Date.now() };
  else delete rating.shared;
  if (Object.keys(rating).length) await r.hset(KEYS.ratings, { [id]: rating });
  else await r.hdel(KEYS.ratings, id);
  send(res, 200, { rating });
});
