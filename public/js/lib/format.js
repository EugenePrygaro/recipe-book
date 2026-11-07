/** Форматування кількостей, часу й дат. */
import { HALF_UNITS, QUARTER_UNITS, PALETTE } from "../config.js";

function fraction(value, step) {
  const v = Math.max(step, Math.round(value / step) * step);
  const whole = Math.floor(v + 1e-9);
  const rest = Math.round((v - whole) * 4) / 4;
  const sym = { 0.25: "¼", 0.5: "½", 0.75: "¾" }[rest] || "";
  return (whole ? String(whole) : "") + sym || "0";
}

/**
 * Кількість інгредієнта з урахуванням множника порцій.
 * Повертає null для «за смаком».
 */
export function fmtQty(amount, unit, factor = 1) {
  if (amount === null || amount === undefined || amount === "" || isNaN(amount)) return null;
  let v = Number(amount) * factor;
  let out;
  if (QUARTER_UNITS.has(unit)) out = fraction(v, 0.25);
  else if (HALF_UNITS.has(unit)) out = fraction(v, 0.5);
  else if (unit === "г" || unit === "мл") {
    v = v < 20 ? Math.round(v) : v < 200 ? Math.round(v / 5) * 5 : Math.round(v / 10) * 10;
    if (v >= 1000) {
      out = String(Math.round(v / 10) / 100).replace(".", ",");
      unit = unit === "г" ? "кг" : "л";
    } else out = String(Math.max(1, v));
  } else {
    out = String(Math.round(v * 100) / 100).replace(".", ",");
  }
  return unit ? `${out} ${unit}` : out;
}

export function fmtDay(ts) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (ts >= start) return "сьогодні";
  if (ts >= start - 86400000) return "вчора";
  return new Date(ts).toLocaleDateString("uk-UA", { day: "numeric", month: "long" });
}

/** Стабільний колір для категорії. */
export function catColor(category) {
  let h = 0;
  for (const ch of String(category)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** 4.333 → "4,3" */
export const fmtRating = (v) => String(Math.round(v * 10) / 10).replace(".", ",");

/** Скільки днів тому: «сьогодні», «вчора», «12 днів тому». */
export function daysAgo(ts) {
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return "сьогодні";
  if (days === 1) return "вчора";
  const a = days % 100, b = days % 10;
  const word = a > 10 && a < 20 ? "днів" : b === 1 ? "день" : b >= 2 && b <= 4 ? "дні" : "днів";
  return `${days} ${word} тому`;
}
