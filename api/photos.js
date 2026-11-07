/**
 * Фото страв у Vercel Blob.
 * POST   /api/photos?id=…  {image, thumb} → завантажити або замінити
 *        image — повне фото, thumb — зменшене для карток (обидва data:image/jpeg;base64,…)
 * DELETE /api/photos?id=…                → прибрати фото
 *
 * Фронтенд стискає фото до 1400px і 640px, тож запит значно менший за ліміт Vercel у 4,5 МБ.
 */
import { put, del } from "@vercel/blob";
import { handler, readJson, send, query, HttpError } from "../lib/http.js";
import { redis, KEYS } from "../lib/store.js";
import { requireId } from "../lib/validate.js";

const MAX_BYTES = 3 * 1024 * 1024;
const TYPES = { jpeg: "jpg", png: "png", webp: "webp" };

function decode(dataUrl, { optional = false } = {}) {
  if (optional && !dataUrl) return null;
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || "");
  if (!m) throw new HttpError(400, "invalid_image");
  const buffer = Buffer.from(m[2], "base64");
  if (!buffer.length || buffer.length > MAX_BYTES) throw new HttpError(413, "image_too_large");
  return { buffer, type: m[1] };
}

const upload = (pathname, { buffer, type }) =>
  put(`${pathname}.${TYPES[type]}`, buffer, {
    access: "public",
    contentType: `image/${type}`,
    addRandomSuffix: true,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });

async function removeBlobs(photo) {
  const urls = [photo?.url, photo?.thumbUrl].filter(Boolean);
  if (urls.length) await del(urls).catch((e) => console.warn("blob delete failed", e));
}

export default handler(["POST", "DELETE"], async (req, res) => {
  const id = requireId(query(req, "id"));
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new HttpError(500, "blob_not_configured");
  const r = redis();
  const old = await r.hget(KEYS.photos, id);

  if (req.method === "POST") {
    const body = readJson(req);
    const full = decode(body.image);
    const small = decode(body.thumb, { optional: true });
    const [blob, thumb] = await Promise.all([
      upload(`photos/${id}`, full),
      small ? upload(`photos/${id}-thumb`, small) : null,
    ]);
    const photo = { url: blob.url, thumbUrl: thumb?.url || blob.url, pathname: blob.pathname, uploadedAt: Date.now() };
    await r.hset(KEYS.photos, { [id]: photo });
    if (old) await removeBlobs({ url: old.url, thumbUrl: old.thumbUrl !== old.url ? old.thumbUrl : null });
    return send(res, 200, { photo });
  }

  await r.hdel(KEYS.photos, id);
  await removeBlobs(old);
  send(res, 200, { ok: true });
});
