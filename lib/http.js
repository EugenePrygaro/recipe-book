/**
 * Дрібні помічники для серверних функцій Vercel (Node.js runtime).
 */

export class HttpError extends Error {
  /**
   * @param {number} status HTTP-статус
   * @param {string} code   машинний код помилки, який розуміє фронтенд
   * @param {object} [extra] додаткові поля відповіді
   */
  constructor(status, code, extra = {}) {
    super(code);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export function send(res, status, body) {
  res.status(status);
  res.setHeader("Cache-Control", "no-store");
  res.json(body);
}

/** Тіло запиту як об’єкт (Vercel сам розбирає JSON, але підстрахуємося). */
export function readJson(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  const raw = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : req.body;
  if (typeof raw === "string" && raw) {
    try { return JSON.parse(raw); } catch { throw new HttpError(400, "invalid_json"); }
  }
  return {};
}

/** Значення параметра з рядка запиту (?id=...). */
export function query(req, name) {
  const v = req.query?.[name];
  return Array.isArray(v) ? v[0] : v;
}

/**
 * Обгортка для обробника: перевіряє метод і перетворює помилки на JSON.
 * @param {string[]} methods дозволені методи
 * @param {(req, res) => Promise<void>} fn
 */
export function handler(methods, fn) {
  return async (req, res) => {
    if (!methods.includes(req.method)) {
      res.setHeader("Allow", methods.join(", "));
      return send(res, 405, { error: "method_not_allowed" });
    }
    try {
      await fn(req, res);
    } catch (err) {
      if (err instanceof HttpError) return send(res, err.status, { error: err.code, ...err.extra });
      console.error(err);
      return send(res, 500, { error: "server_error" });
    }
  };
}

export function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  return (Array.isArray(fwd) ? fwd[0] : fwd || "").split(",")[0].trim() || "unknown";
}
