/**
 * Мінімальна імітація @upstash/redis у пам’яті — лише ті команди, що використовує проєкт.
 * Дані зникають після перезапуску. Тільки для локальної перевірки.
 */
const clone = (v) => (v === undefined ? null : JSON.parse(JSON.stringify(v)));

export class MemoryRedis {
  constructor() { this.data = new Map(); }
  async get(k) { return clone(this.data.get(k)); }
  async set(k, v) { this.data.set(k, clone(v)); return "OK"; }
  async eval(_script, keys, args) {
    const [key] = keys;
    const [expectedRevision, encoded] = args;
    const current = this.data.get(key);
    const revision = current?.__personalEnvelope === true ? current.revision : 0;
    if (revision !== Number(expectedRevision)) return 0;
    this.data.set(key, clone(JSON.parse(encoded)));
    return 1;
  }
  async keys(pattern) {
    const prefix = pattern.endsWith("*") ? pattern.slice(0, -1) : pattern;
    return [...this.data.keys()].filter((key) => key.startsWith(prefix));
  }
  async incr(k) { const n = (this.data.get(k) || 0) + 1; this.data.set(k, n); return n; }
  async expire() { return 1; }
  hash(k) { if (!this.data.has(k)) this.data.set(k, {}); return this.data.get(k); }
  async hgetall(k) { const h = this.data.get(k); return h && Object.keys(h).length ? clone(h) : null; }
  async hget(k, f) { return clone(this.data.get(k)?.[f]); }
  async hset(k, obj) { Object.assign(this.hash(k), clone(obj)); return Object.keys(obj).length; }
  async hdel(k, ...fields) { const h = this.hash(k); fields.forEach((f) => delete h[f]); return fields.length; }
  pipeline() {
    const calls = [];
    const p = new Proxy({}, {
      get: (_, name) => name === "exec"
        ? () => Promise.all(calls.map(([n, a]) => this[n](...a)))
        : (...args) => { calls.push([name, args]); return p; },
    });
    return p;
  }
}
