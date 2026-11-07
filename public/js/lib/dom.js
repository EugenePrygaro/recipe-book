/** Дрібні помічники для роботи з DOM і текстом. */

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
/** Екранування тексту для вставки в HTML. */
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

/** Нормалізація для пошуку: нижній регістр, без апострофів, ё → е. */
export const norm = (s) => String(s ?? "").toLowerCase().replace(/ё/g, "е").replace(/[’ʼ']/g, "").trim();

/** Українська множина: plural(5, "страва", "страви", "страв") → "страв". */
export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}

export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
export const scrollBehavior = () => (reducedMotion() ? "auto" : "smooth");

let toastTimer;
export function toast(message, duration = 2600) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), duration);
}

/** Кнопка, що спрацьовує з другого натискання (для видалення). */
export function confirmTwice(button, armedText, idleText) {
  if (button.classList.contains("armed")) return true;
  button.classList.add("armed");
  button.textContent = armedText;
  setTimeout(() => {
    if (button.isConnected) {
      button.classList.remove("armed");
      button.textContent = idleText;
    }
  }, 4000);
  return false;
}
