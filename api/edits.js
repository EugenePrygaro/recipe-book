/**
 * Спільні правки вбудованих страв (id починаються з "b-").
 * PUT    /api/edits?id=…  {edit} → зберегти зміни
 * DELETE /api/edits?id=…         → повернути оригінал
 */
import { handler, readJson, send, query, HttpError } from "../lib/http.js";
import { redis, KEYS } from "../lib/store.js";
import { sanitizeRecipe, requireId } from "../lib/validate.js";

export default handler(["PUT", "DELETE"], async (req, res) => {
  const id = requireId(query(req, "id"));
  if (!id.startsWith("b-")) throw new HttpError(400, "invalid_id");
  const r = redis();

  if (req.method === "PUT") {
    const edit = { ...sanitizeRecipe(readJson(req).edit), updatedAt: Date.now() };
    await r.hset(KEYS.edits, { [id]: edit });
    return send(res, 200, { edit });
  }

  await r.hdel(KEYS.edits, id);
  send(res, 200, { ok: true });
});
