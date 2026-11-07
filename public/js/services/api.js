/**
 * Клієнт відкритого серверного API (/api/*).
 */

export class ApiError extends Error {
  constructor(status, code, payload = {}) {
    super(code);
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

async function request(method, path, body, { keepalive = false } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      keepalive,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "network");
  }
  let json = null;
  try { json = await res.json(); } catch { /* порожня відповідь */ }
  if (!res.ok) {
    const code = json?.error || (res.status === 413 ? "image_too_large" : "error");
    throw new ApiError(res.status, code, json || {});
  }
  return json;
}

const withId = (path, id) => `${path}?id=${encodeURIComponent(id)}`;

export const api = {
  loadShared: () => request("GET", "/api/data"),
  createRecipe: (recipe) => request("POST", "/api/recipes", { recipe }),
  updateRecipe: (id, recipe) => request("PUT", withId("/api/recipes", id), { recipe }),
  deleteRecipe: (id) => request("DELETE", withId("/api/recipes", id)),
  saveEdit: (id, edit) => request("PUT", withId("/api/edits", id), { edit }),
  deleteEdit: (id) => request("DELETE", withId("/api/edits", id)),
  uploadPhoto: (id, photo) => request("POST", withId("/api/photos", id), photo),
  deletePhoto: (id) => request("DELETE", withId("/api/photos", id)),
  loadPersonal: () => request("GET", "/api/personal"),
  markCooked: (id) => request("POST", withId("/api/cooked", id)),
  unmarkCooked: (id) => request("DELETE", withId("/api/cooked", id)),
  rate: (id, stars) => request("PUT", withId("/api/ratings", id), { stars }),
  savePersonal: (state, revision, opts) => request("PUT", "/api/personal", { state, revision }, opts),
};

const MESSAGES = {
  network: "Немає з’єднання з сервером. Перевірте інтернет.",
  invalid: "Перевірте заповнені поля.",
  invalid_image: "Не вдалося прочитати фото.",
  image_too_large: "Фото завелике.",
  not_found: "Цю страву вже видалено.",
  offline: "Немає інтернету. Ця дія запрацює, щойно з’явиться зв’язок.",
  storage_not_configured: "Сервер не налаштований: підключіть Upstash Redis у Vercel.",
  blob_not_configured: "Для фото підключіть Vercel Blob у налаштуваннях проєкту.",
};

export const errorText = (err) => MESSAGES[err?.code] || "Щось пішло не так. Спробуйте ще раз.";
