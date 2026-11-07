/**
 * Святкове оформлення шапки за датою (lib/season.js):
 *  - новорічний сезон: гірлянда з вогниками, сніг, сніжна «шапка» на хвилі;
 *  - зима: синя тема й легкий сніг;
 *  - День закоханих: помадно-червона тема, сердечка й троянди;
 *  - весна: сакурові пелюстки;
 *  - осінь: тепла палітра й листя;
 *  - літо: зелена тема, сонце й листочки;
 *  - Великдень: писанки на ниточках, що гойдаються, і пелюстки вишні.
 * Анімації — лише transform/opacity, зупиняються, коли шапка поза екраном.
 * Тема й декорації автоматично перемикаються за датою.
 */
import { $ } from "../lib/dom.js";
import { food } from "../lib/icons.js";
import { seasonFor } from "../lib/season.js";
import { ui } from "../state.js";
import { rerender } from "./app.js";
import { setMode } from "./events.js";

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const dateKey = (date = new Date()) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
let refreshTimer;
let appliedDate = "";

/** Падаючі частинки: сніжинки, пелюстки. */
function falling(count, makeInner, { big = 0 } = {}) {
  return Array.from({ length: count }, (_, i) => {
    const isBig = i < big;
    const size = isBig ? rnd(16, 24) : rnd(3, 7);
    return `<i class="fall${isBig ? " big" : ""}" style="left:${rnd(0, 100).toFixed(1)}%;--s:${size.toFixed(1)}px;--t:${rnd(isBig ? 11 : 7, isBig ? 18 : 14).toFixed(1)}s;--dl:-${rnd(0, 16).toFixed(1)}s;--dx:${rnd(-40, 40).toFixed(0)}px;--o:${rnd(0.55, 1).toFixed(2)}">${isBig ? makeInner() : ""}</i>`;
  }).join("");
}

function garland() {
  const colors = ["#FF5A5F", "#FFD166", "#06D6A0", "#4CC9F0", "#F78CFF"];
  const n = 26;
  const bulbs = Array.from({ length: n }, (_, i) => {
    const x = (i + 0.5) / n * 100;
    const y = 10 + Math.sin((i / (n - 1)) * Math.PI * 6) * 7 + 9;
    return `<span class="bulb" style="left:${x.toFixed(2)}%;top:${y.toFixed(1)}px;--c:${colors[i % colors.length]};--dl:${(i % 2) * 0.6 + (i % 3) * 0.2}s"></span>`;
  }).join("");
  return `<svg class="wire" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden="true"><path d="M0 19 Q 33 33 67 19 T 133 19 T 200 19 T 267 19 T 333 19 T 400 19 T 467 19 T 533 19 T 600 19 T 667 19 T 733 19 T 800 19 T 867 19 T 933 19 T 1000 19 T 1067 19 T 1133 19 T 1200 19"/></svg>${bulbs}`;
}

/** Писанки на ниточках. */
function eggs() {
  const patterns = [
    ["#F7B7C9", "#E5484D"], ["#B6E297", "#2E8A57"], ["#FFE08A", "#E0A21A"],
    ["#BFD7FF", "#3D6E9E"], ["#E6C8FF", "#7A4FB0"], ["#FFD0A8", "#D9481F"],
  ];
  // зліва — коротко, щоб не закривати назву; справа — довші ниточки
  const spots = [[5, 2], [17, 8], [29, 0], [57, 34], [68, 60], [82, 20], [94, 44]];
  return spots.map(([left, len], i) => {
    const [base, ink] = patterns[i % patterns.length];
    return `<span class="egg-hang${left < 50 ? " lft" : ""}" style="left:${left}%;--len:${len}px;--dl:${(i * 0.37).toFixed(2)}s">
      <svg viewBox="0 0 40 52" aria-hidden="true"><path d="M20 2C9 2 2 20 2 32a18 18 0 0 0 36 0C38 20 31 2 20 2Z" fill="${base}"/>
      <path d="M4 26h32M3.5 36h33" stroke="${ink}" stroke-width="2.4" fill="none"/>
      <path d="M6 31l4-4 4 4 4-4 4 4 4-4 4 4 4-4 2 2" stroke="${ink}" stroke-width="1.8" fill="none" stroke-linejoin="round"/>
      <circle cx="13" cy="16" r="2" fill="${ink}"/><circle cx="20" cy="12" r="2" fill="${ink}"/><circle cx="27" cy="16" r="2" fill="${ink}"/>
      <path d="M12 6 Q 9 14 10 20" stroke="#fff" stroke-opacity=".5" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg></span>`;
  }).join("");
}

/** Сердечка, що злітають. */
function hearts() {
  const icons = ["heart", "rose"];
  return Array.from({ length: 14 }, () =>
    `<i class="rise" style="left:${rnd(2, 98).toFixed(1)}%;--s:${rnd(16, 30).toFixed(0)}px;--t:${rnd(8, 14).toFixed(1)}s;--dl:-${rnd(0, 14).toFixed(1)}s;--dx:${rnd(-30, 30).toFixed(0)}px">${effectIcon(pick(icons))}</i>`).join("");
}

function effectIcon(name) {
  if (name === "snowflake") {
    return `<svg viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="#EAF7FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3v26M4.7 9.5l22.6 13M4.7 22.5l22.6-13M16 3l-3 3m3-3 3 3m-6 20 3 3 3-3M4.7 9.5l4 .3-1 3.8m17.6 8.9-1-3.8 4-.3M4.7 22.5l4-.3-1-3.8m17.6-8.9-1 3.8 4 .3"/></g></svg>`;
  }
  if (name === "rose") {
    return `<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#28794A" d="M16 17h2v13h-2z"/><path fill="#48A66A" d="M16 23c-7-6-10 1-10 1 5 4 9 2 10-1m2-4c7-6 10 1 10 1-5 4-9 2-10-1"/><path fill="#C61E4D" d="M16 19c-6 0-10-4-8-9 1-3 4-5 8-4 4-1 7 1 8 4 2 5-2 9-8 9"/><path fill="#F36A7F" d="M12 10c1-3 7-4 9 0 1 3-2 6-5 7-3-1-6-4-4-7"/><path fill="none" stroke="#8E153A" stroke-width="1.2" d="M12 8c0 3 2 4 4 4 2 0 4-1 5-3"/></svg>`;
  }
  if (name === "leaf") {
    return `<svg viewBox="0 0 40 40" aria-hidden="true"><path fill="#69B85A" d="M4 35C7 17 20 5 36 4c1 16-11 29-29 31"/><path fill="none" stroke="#347C3C" stroke-width="2" stroke-linecap="round" d="M7 34 31 10M16 25l-1-10m7 3 8-1m-15 9-9-1"/></svg>`;
  }
  return `<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#F04467" d="M6 6c4.7-2.4 8.5.5 10 2.5C17.5 6.5 21.3 3.6 26 6c6 3 4.5 10.5 0 15-2.2 2.2-6.1 6.1-8.9 8.2a1.8 1.8 0 0 1-2.2 0C12.3 27 8.2 23.2 6 21 1.5 16.5 0 9 6 6"/><path fill="none" stroke="#FFB2C1" stroke-width="1.6" stroke-linecap="round" d="M7 9c2-2 5-2 7-.5"/></svg>`;
}

function autumnLeaves() {
  const colors = ["#E56A2F", "#F2AE32", "#B94C35", "#D98C24"];
  return `<svg width="100%" height="100%" viewBox="0 0 40 40" aria-hidden="true"><path d="M4 35C7 17 20 5 36 4c1 16-11 29-29 31" fill="${pick(colors)}"/><path d="M7 34 31 10M16 25l-1-10m7 3 8-1m-15 9-9-1m15-3 1 11" fill="none" stroke="#75401D" stroke-width="2" stroke-linecap="round"/></svg>`;
}

function sakuraPetal() {
  return `<svg viewBox="0 0 40 40" aria-hidden="true"><g fill="#F6AFC8" stroke="#FFE1EB" stroke-width=".8"><ellipse cx="20" cy="11" rx="6" ry="10"/><ellipse cx="20" cy="11" rx="6" ry="10" transform="rotate(72 20 20)"/><ellipse cx="20" cy="11" rx="6" ry="10" transform="rotate(144 20 20)"/><ellipse cx="20" cy="11" rx="6" ry="10" transform="rotate(216 20 20)"/><ellipse cx="20" cy="11" rx="6" ry="10" transform="rotate(288 20 20)"/></g><circle cx="20" cy="20" r="3" fill="#F8D982"/></svg>`;
}

function summerSun() {
  return `<div class="summer-sun" aria-hidden="true"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="20"/><path d="M50 4v17m0 58v17M4 50h17m58 0h17M17.5 17.5l12 12m41 41 12 12m0-65-12 12m-41 41-12 12"/></svg></div>`;
}

function decorations(key) {
  const snowflake = () => effectIcon("snowflake");
  const blossom = () => `<svg viewBox="0 0 32 32" aria-hidden="true"><g fill="#FFB8CC"><ellipse cx="16" cy="8" rx="5" ry="8"/><ellipse cx="16" cy="8" rx="5" ry="8" transform="rotate(72 16 16)"/><ellipse cx="16" cy="8" rx="5" ry="8" transform="rotate(144 16 16)"/><ellipse cx="16" cy="8" rx="5" ry="8" transform="rotate(216 16 16)"/><ellipse cx="16" cy="8" rx="5" ry="8" transform="rotate(288 16 16)"/></g><circle cx="16" cy="16" r="4" fill="#F2C94C"/></svg>`;
  switch (key) {
    case "newyear": return `<div class="garland">${garland()}</div><div class="snow">${falling(38, snowflake, { big: 6 })}</div>`;
    case "winter": return `<div class="snow">${falling(18, snowflake, { big: 1 })}</div>`;
    case "valentine": return `<div class="hearts">${hearts()}</div>`;
    case "autumn": return `<div class="autumn-leaves">${falling(20, autumnLeaves, { big: 20 })}</div>`;
    case "spring": return `<div class="spring-petals">${falling(20, sakuraPetal, { big: 18 })}</div>`;
    case "summer": return `${summerSun()}<div class="summer-leaves">${falling(8, () => effectIcon("leaf"), { big: 8 })}</div>`;
    case "easter": return `<div class="eggs">${eggs()}</div><div class="petals">${falling(14, blossom, { big: 14 })}</div>`;
    default: return "";
  }
}

function applyAction(action) {
  Object.assign(ui, { cat: null, tag: null, fav: false, minRating: 0 });
  if (action.tag) ui.tag = action.tag;
  if (action.cat) ui.cat = action.cat;
  if (action.fav) ui.fav = true;
  setMode("all");
  rerender();
  $(".toolbar").scrollIntoView({ behavior: "smooth", block: "start" });
}

function apply() {
  const season = seasonFor();
  appliedDate = dateKey();
  const root = document.documentElement;
  const layer = $("#seasonLayer");
  const greet = $("#seasonGreet");
  root.dataset.season = season?.key || "";
  root.dataset.palette = season?.key === "newyear" ? "winter"
    : season?.key === "easter" ? "spring" : season?.key || "";
  const footer = $(".foot");
  if (season) footer.dataset.season = season.key;
  else delete footer.dataset.season;
  const themeColor = season?.key === "newyear" || season?.key === "winter" ? "#102E49"
    : season?.key === "valentine" ? "#521126"
      : season?.key === "autumn" ? "#2A1B12"
        : season?.key === "spring" || season?.key === "easter" ? "#271D2A" : "#08311D";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor);
  layer.innerHTML = season ? decorations(season.key) : "";
  greet.hidden = !season;
  if (season) {
    greet.innerHTML = `${food(season.icon, "fi-sm", { lazy: false })}<span>${season.greeting}</span>`;
    greet.onclick = () => { if (season.action) applyAction(season.action); };
  }
}

function scheduleRefresh() {
  clearTimeout(refreshTimer);
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  refreshTimer = setTimeout(() => {
    apply();
    scheduleRefresh();
  }, midnight.getTime() - now.getTime());
}

export function initSeason() {
  apply();
  scheduleRefresh();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      if (dateKey() !== appliedDate) apply();
      scheduleRefresh();
    }
  });
  // не анімуємо, коли шапки не видно
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => document.documentElement.classList.toggle("season-paused", !e.isIntersecting))
      .observe($(".cloth"));
  }
}
