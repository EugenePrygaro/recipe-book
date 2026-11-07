/**
 * Спільні страви.
 * POST   /api/recipes        {recipe} → нова страва
 * PUT    /api/recipes?id=…   {recipe} → змінити
 * DELETE /api/recipes?id=…            → видалити (разом із фото)
 */
import crypto from "node:crypto";
import { del } from "@vercel/blob";
import { handler, readJson, send, query, HttpError } from "../lib/http.js";
import { redis, KEYS } from "../lib/store.js";
import { sanitizeRecipe, requireId } from "../lib/validate.js";

const newId = () => `u-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;

export default handler(["POST", "PUT", "DELETE"], async (req, res) => {
  const r = redis();

  if (req.method === "POST") {
    const clean = sanitizeRecipe(readJson(req).recipe);
    const now = Date.now();
    const recipe = { ...clean, id: newId(), createdAt: now, updatedAt: now, createdBy: "shared" };
    await r.hset(KEYS.recipes, { [recipe.id]: recipe });
    return send(res, 201, { recipe });
  }

  const id = requireId(query(req, "id"));
  const existing = await r.hget(KEYS.recipes, id);
  if (!existing) throw new HttpError(404, "not_found");

  if (req.method === "PUT") {
    const clean = sanitizeRecipe(readJson(req).recipe);
    const recipe = { ...clean, id, createdAt: existing.createdAt, createdBy: existing.createdBy, updatedAt: Date.now() };
    await r.hset(KEYS.recipes, { [id]: recipe });
    return send(res, 200, { recipe });
  }

  // DELETE
  const photo = await r.hget(KEYS.photos, id);
  await r.hdel(KEYS.recipes, id);
  if (photo) {
    await r.hdel(KEYS.photos, id);
    const urls = [...new Set([photo.url, photo.thumbUrl].filter(Boolean))];
    if (urls.length) await del(urls).catch((e) => console.warn("blob delete failed", e));
  }
  send(res, 200, { ok: true });
});
