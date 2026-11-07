/**
 * Сховище даних: Upstash Redis.
 *
 * Ключі:
 *   rb:recipes          hash  id → страва, додана вами
 *   rb:edits            hash  id → ваша версія вбудованої страви
 *   rb:photos           hash  id → { url, thumbUrl, pathname, uploadedAt }
 *   rb:cooked           hash  id → [мітки часу], коли страву готували (спільне для всіх)
 *   rb:ratings          hash  id → { shared: { stars, name, at } } — спільні оцінки
 *   rb:personal:shared  string  спільне обране, продукти вдома і покупки
 *   rb:rl:<key>         лічильник для обмеження спроб входу
 */
import { Redis } from "@upstash/redis";
import { HttpError } from "./http.js";

export const KEYS = {
  recipes: "rb:recipes",
  edits: "rb:edits",
  photos: "rb:photos",
  cooked: "rb:cooked",
  ratings: "rb:ratings",
  personal: (uid) => `rb:personal:${uid}`,
  rateLimit: (key) => `rb:rl:${key}`,
};

let client = null;

/** Для тестів і локального сервера: підставити свій клієнт (див. scripts/local-server.js). */
export function setRedisClient(custom) {
  client = custom;
}

export function redis() {
  if (client) return client;
  // Інтеграція Upstash у Vercel створює змінні KV_REST_API_*,
  // а прямий акаунт Upstash — UPSTASH_REDIS_REST_*. Підтримуємо обидва варіанти.
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new HttpError(500, "storage_not_configured");
  client = new Redis({ url, token });
  return client;
}

/** Усі спільні дані книги одним запитом. */
export async function loadShared() {
  const r = redis();
  const p = r.pipeline();
  p.hgetall(KEYS.recipes);
  p.hgetall(KEYS.edits);
  p.hgetall(KEYS.photos);
  p.hgetall(KEYS.cooked);
  p.hgetall(KEYS.ratings);
  const [recipes, edits, photos, cooked, ratings] = await p.exec();
  return {
    recipes: Object.values(recipes || {}),
    edits: edits || {},
    photos: photos || {},
    cooked: cooked || {},
    ratings: ratings || {},
  };
}

/** Не більше `limit` спроб за `windowSec` секунд для ключа. */
export async function rateLimit(key, limit, windowSec) {
  const r = redis();
  const k = KEYS.rateLimit(key);
  const n = await r.incr(k);
  if (n === 1) await r.expire(k, windowSec);
  if (n > limit) throw new HttpError(429, "too_many_attempts");
}
