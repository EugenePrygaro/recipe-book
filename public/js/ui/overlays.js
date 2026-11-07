/**
 * Шари поверх сторінки: рецепт на весь екран (телефон), панель фільтрів, список покупок, форма.
 * Кожен шар отримує свій #хеш, тож жест або кнопка браузера «Назад» закриває його.
 */
import { $ } from "../lib/dom.js";
import { catColor } from "../lib/format.js";
import { NO_CATEGORY } from "../config.js";
import { findRecipe } from "../state.js";
import { isMobile, mobileQuery } from "./media.js";
import { photoHTML, metaHTML } from "./cards.js";
import { detailsHTML } from "./recipe.js";
import { rerender } from "./app.js";
import { openShop } from "./shop.js";

const stack = [];

/**
 * @param {string} hash   ім’я шару в адресі (#hash)
 * @param {Function} close закриває шар
 * @param {{lock?: boolean}} [opts] lock — блокувати прокрутку сторінки й на комп’ютері
 */
export function pushOverlay(hash, close, { lock = false } = {}) {
  const pushed = location.hash.slice(1) !== hash;
  stack.push({ hash, close, pushed, lock });
  if (pushed) location.hash = hash;
  syncChrome();
}

export function popOverlay() {
  const top = stack[stack.length - 1];
  if (!top) return;
  if (top.pushed) {
    history.back();
    // запасний варіант, якщо hashchange не прийде (буває у вбудованих браузерах)
    setTimeout(() => {
      const i = stack.indexOf(top);
      if (i >= 0) { stack.splice(i); top.close(); syncChrome(); }
    }, 450);
  } else {
    stack.pop();
    top.close();
    syncChrome();
    if (location.hash) location.hash = "";
  }
}

export const hasOverlay = (close) => stack.some((o) => o.close === close);

/** Блокує прокрутку сторінки під шаром. */
function syncChrome() {
  const lock = stack.length > 0 && (isMobile() || stack.some((o) => o.lock));
  document.documentElement.classList.toggle("locked", lock);
}

/* ---------- рецепт на весь екран ---------- */

let sheetId = null;
let wakeLock = null;

async function keepScreenOn(on) {
  try {
    if (on && "wakeLock" in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    } else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch { /* браузер не дозволив — не страшно */ }
}

function renderSheet() {
  const r = findRecipe(sheetId);
  if (!r) return;
  const sheet = $("#rSheet");
  const scroll = sheet.scrollTop;
  $("#rsBarTitle").textContent = r.title;
  $("#rsBody").innerHTML = `<div data-rid="${r.id}" style="--g:${catColor(r.category || NO_CATEGORY)}">
    <div class="photo rs-photo">${photoHTML(r)}</div>
    <div class="rs-head">${metaHTML(r)}<h2 id="rsTitle"></h2>${r.description ? `<p class="desc"></p>` : ""}</div>
    ${detailsHTML(r)}
  </div>`;
  $("#rsTitle").textContent = r.title;
  if (r.description) $("#rsBody .rs-head .desc").textContent = r.description;
  sheet.scrollTop = scroll;
}

export function renderSheetIfOpen() {
  if (!sheetId) return;
  if (findRecipe(sheetId)) renderSheet();
  else popOverlay();
}

export function openSheet(id) {
  sheetId = id;
  const sheet = $("#rSheet");
  renderSheet();
  sheet.hidden = false;
  sheet.scrollTop = 0;
  pushOverlay(id, hideSheet);
  $("#rsBack").focus({ preventScroll: true });
  keepScreenOn(true);
}

function hideSheet() {
  const id = sheetId;
  sheetId = null;
  $("#rSheet").hidden = true;
  keepScreenOn(false);
  document.querySelector(`.card[data-rid="${CSS.escape(id || "")}"] .toggle`)?.focus({ preventScroll: true });
}

export const openSheetId = () => sheetId;

/* ---------- панель фільтрів (телефон) ---------- */

function openFilters() {
  $("#fSheet").hidden = false;
  $("#fBackdrop").hidden = false;
  pushOverlay("filters", hideFilters);
  $("#fsTitle").focus({ preventScroll: true });
}

function hideFilters() {
  $("#fSheet").hidden = true;
  $("#fBackdrop").hidden = true;
  $("#openFilters").focus({ preventScroll: true });
}

/* ---------- ініціалізація ---------- */

export function initOverlays() {
  addEventListener("hashchange", () => {
    const h = location.hash.slice(1);
    while (stack.length && stack[stack.length - 1].hash !== h) stack.pop().close();
    if (!stack.length && h) {
      if (h === "shopping") openShop();
      else if (isMobile() && findRecipe(h)) openSheet(h);
    }
    syncChrome();
  });

  addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("#copyBox").hidden) { $("#copyBox").hidden = true; return; }
    if (stack.length) popOverlay();
  });

  mobileQuery.addEventListener("change", () => {
    while (stack.length) stack.pop().close();
    syncChrome();
    rerender();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && sheetId) keepScreenOn(true);
  });

  $("#rsBack").addEventListener("click", popOverlay);
  $("#openFilters").addEventListener("click", openFilters);
  $("#fBackdrop").addEventListener("click", popOverlay);
  $("#fApply").addEventListener("click", popOverlay);
}

/** Відкриває шар за #хешем після завантаження (посилання на страву чи список покупок). */
export function openFromHash() {
  const h = location.hash.slice(1);
  if (!h || stack.length) return null;
  if (h === "shopping") { openShop(); return null; }
  const r = findRecipe(h);
  if (!r) { if (["add", "edit", "filters", "roulette"].includes(h)) location.hash = ""; return null; }
  if (isMobile()) { openSheet(h); return null; }
  return h; // на комп’ютері розгортаємо картку
}
