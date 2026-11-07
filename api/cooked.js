/**
 * Історія «Приготували» — спільна для всіх, хто має доступ до книги.
 * POST   /api/cooked?id=…  → додати запис «сьогодні»
 * DELETE /api/cooked?id=…  → скасувати останній запис
 */
import { handler, send, query } from "../lib/http.js";
import { redis, KEYS } from "../lib/store.js";
import { requireId } from "../lib/validate.js";

export default handler(["POST", "DELETE"], async (req, res) => {
  const id = requireId(query(req, "id"));
  const r = redis();
  const current = (await r.hget(KEYS.cooked, id)) || [];
  const list = req.method === "POST" ? [...current, Date.now()].slice(-50) : current.slice(0, -1);
  if (list.length) await r.hset(KEYS.cooked, { [id]: list });
  else await r.hdel(KEYS.cooked, id);
  send(res, 200, { cooked: list });
});
