/**
 * Рулетка страв у стилі ігрового автомата: барабан з назвами крутиться й зупиняється на випадковій страві.
 * Вибирає серед страв, що проходять фільтри сторінки та вибрані категорії.
 */
import { $, esc, plural, reducedMotion } from "../lib/dom.js";
import { confettiFrom } from "../lib/confetti.js";
import { food } from "../lib/icons.js";
import { ui, allRecipes, categories } from "../state.js";
import { CAT_ICONS, NO_CATEGORY } from "../config.js";
import { haptic } from "../services/haptics.js";
import { isMobile } from "./media.js";
import { matchRecipe, focusCard } from "./list.js";
import { tagBadge } from "./cards.js";
import { pushOverlay, popOverlay, openSheet } from "./overlays.js";
import { rerender } from "./app.js";

const SPIN_MS = 4200;
const CATEGORIES_KEY = "recipe-book:roulette-categories:v1";

let selectedCategories = new Set();
try {
  const saved = JSON.parse(localStorage.getItem(CATEGORIES_KEY));
  if (Array.isArray(saved)) selectedCategories = new Set(saved.filter((item) => typeof item === "string"));
} catch { /* немає збережених категорій */ }

let spinning = false;
let lastPick = null;
let winner = null;
let openAfterClose = null;
let animation = null;

/** Страви для барабана: фільтри сторінки + вибрані категорії. */
function pool() {
  return allRecipes().filter((r) => matchRecipe(r) &&
    (!selectedCategories.size || selectedCategories.has(r.category || NO_CATEGORY)));
}

const pageFiltered = () => Boolean(ui.q || ui.cat || ui.tag || ui.fav || ui.minRating);

function renderConds() {
  const available = new Set(categories().map(([category]) => category));
  selectedCategories = new Set([...selectedCategories].filter((category) => available.has(category)));
  const choices = [
    `<button type="button" class="rl-cond" data-cond="" aria-pressed="${!selectedCategories.size}">${food("fork-and-knife-with-plate", "fi-xs", { lazy: false })}Усі страви</button>`,
    ...categories().map(([category]) => `<button type="button" class="rl-cond" data-cond="${esc(category)}" aria-pressed="${selectedCategories.has(category)}">${CAT_ICONS[category] ? food(CAT_ICONS[category], "fi-xs", { lazy: false }) : ""}${esc(category)}</button>`),
  ];
  $("#rlConds").innerHTML = choices.join("");
  const n = pool().length;
  const selectedCount = selectedCategories.size;
  const selectedText = selectedCount ? ` у вибраних категоріях (${[...selectedCategories].join(", ")})` : "";
  $("#rlCount").textContent = n
    ? `${n} ${plural(n, "страва", "страви", "страв")}${selectedText} на барабані${pageFiltered() ? " (з урахуванням фільтрів на сторінці)" : ""}`
    : "За вибраними категоріями та фільтрами немає страв. Оберіть інше.";
  $("#rlCount").classList.toggle("warn", !n);
  if (!spinning) $("#rlSpin").disabled = !n;
}
const randomOf = (list) => list[Math.floor(Math.random() * list.length)];

const itemHTML = (r) =>
  `<div class="rl-item" data-rid="${esc(r.id)}">${food(r.icon, "", { lazy: false })}<span>${esc(r.title)}</span></div>`;

/** Послідовність для барабана: випадкові страви, переможець майже наприкінці. */
function buildSequence(list, target, count) {
  const seq = [];
  let prev = null;
  for (let i = 0; i < count; i++) {
    let r = randomOf(list);
    if (list.length > 1) while (r === prev) r = randomOf(list);
    seq.push(r);
    prev = r;
  }
  seq.push(target, randomOf(list), randomOf(list));
  return seq;
}

function showResult(r) {
  winner = r;
  const meta = [
    r.kcal ? `<span class="rl-pill">${food("fire", "fi-xs")}${esc(r.kcal)} ккал</span>` : "",
    ...(r.tags || []).map((k) => tagBadge(k, "rl-pill tagged")),
  ].join("");
  $("#rlResult").innerHTML = `<p class="rl-label">Сьогодні готуємо</p><h3>${esc(r.title)}</h3>${meta ? `<div class="rl-meta">${meta}</div>` : ""}`;
  $("#rlResult").hidden = false;
  $("#rlOpen").hidden = false;
  $("#rlSpin").textContent = "Ще раз";
}

function spin() {
  if (spinning) return;
  const list = pool();
  if (!list.length) { renderConds(); return; }
  let target = randomOf(list);
  if (list.length > 1) while (target.id === lastPick) target = randomOf(list);
  lastPick = target.id;

  const reel = $("#rlReel");
  const machine = $("#rlMachine");
  const count = 38 + Math.floor(Math.random() * 8);
  const seq = buildSequence(list, target, count);
  reel.innerHTML = seq.map(itemHTML).join("");
  $("#rlResult").hidden = true;
  $("#rlOpen").hidden = true;
  machine.classList.remove("won");

  // offsetHeight не залежить від анімації масштабу вікна, на відміну від getBoundingClientRect
  const row = reel.firstElementChild.offsetHeight || 64;
  const end = -(count - 1) * row; // переможець стає в середній ряд вікна
  const finish = () => {
    reel.style.transform = `translateY(${end}px)`;
    reel.children[count].classList.add("win");
    machine.classList.remove("spinning");
    machine.classList.add("won");
    spinning = false;
    $("#rlSpin").disabled = false;
    $("#rlConds").classList.remove("locked");
    haptic("success");
    confettiFrom($("#rlMachine .rl-window"), { count: 50, power: 1.2 });
    showResult(target);
  };

  if (reducedMotion()) { finish(); return; }

  spinning = true;
  $("#rlSpin").disabled = true;
  $("#rlConds").classList.add("locked");
  $("#rlSpin").textContent = "Крутиться…";
  machine.classList.add("spinning");
  reel.style.transform = "translateY(0)";

  animation = reel.animate(
    [
      { transform: "translateY(0)", easing: "cubic-bezier(.16,.42,.12,1)" },
      { transform: `translateY(${end - row * 0.28}px)`, offset: 0.93, easing: "cubic-bezier(.3,.6,.4,1)" },
      { transform: `translateY(${end}px)` },
    ],
    { duration: SPIN_MS, fill: "forwards" }
  );

  // «клацання» барабана: тактильний відгук на кожен ряд, поки крутиться повільно
  let lastIndex = -1;
  let lastTick = 0;
  const tick = (now) => {
    if (!spinning) return;
    const y = new DOMMatrixReadOnly(getComputedStyle(reel).transform).m42;
    const index = Math.round(-y / row);
    if (index !== lastIndex) {
      lastIndex = index;
      $("#rlPointer").classList.remove("tick");
      void $("#rlPointer").offsetWidth;
      $("#rlPointer").classList.add("tick");
      if (now - lastTick > 90) { haptic("tick"); lastTick = now; }
    }
    if (now - start > SPIN_MS * 0.55) machine.classList.remove("spinning"); // прибираємо розмиття під кінець
    requestAnimationFrame(tick);
  };
  const start = performance.now();
  requestAnimationFrame(tick);

  animation.onfinish = () => { animation.cancel(); animation = null; finish(); };
}

/** Початковий вигляд барабана до першого обертання. */
function idleReel() {
  const list = pool().length ? pool() : allRecipes();
  $("#rlReel").style.transform = "translateY(0)";
  $("#rlReel").innerHTML = [randomOf(list), randomOf(list), randomOf(list)].map(itemHTML).join("");
}

export function openRoulette() {
  const box = $("#roulette");
  if (!box.hidden) return;
  winner = null;
  $("#rlResult").hidden = true;
  $("#rlOpen").hidden = true;
  $("#rlSpin").textContent = "Крутити";
  $("#rlMachine").classList.remove("won");
  renderConds();
  idleReel();
  box.hidden = false;
  $("#rlBackdrop").hidden = false;
  pushOverlay("roulette", hideRoulette, { lock: true });
  $("#rlSpin").focus({ preventScroll: true });
  if (pool().length) setTimeout(spin, reducedMotion() ? 0 : 350);
}

function hideRoulette() {
  animation?.cancel();
  animation = null;
  spinning = false;
  $("#rlSpin").disabled = false;
  $("#rlConds").classList.remove("locked");
  $("#rlMachine").classList.remove("spinning");
  $("#roulette").hidden = true;
  $("#rlBackdrop").hidden = true;
  const id = openAfterClose;
  openAfterClose = null;
  if (id) {
    // відкриваємо після того, як закрився шар рулетки (і змінився #хеш)
    setTimeout(() => {
      if (isMobile()) openSheet(id);
      else { ui.openId = id; rerender(); focusCard(id, "start"); }
    }, 60);
  } else {
    $("#pickRandom").focus({ preventScroll: true });
  }
}

export function initRoulette() {
  $("#pickRandom").addEventListener("click", openRoulette);
  $("#rlSpin").addEventListener("click", spin);
  $("#rlConds").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cond]");
    if (!b || spinning) return;
    const k = b.dataset.cond;
    if (!k) selectedCategories.clear();
    else if (selectedCategories.has(k)) selectedCategories.delete(k);
    else selectedCategories.add(k);
    try { localStorage.setItem(CATEGORIES_KEY, JSON.stringify([...selectedCategories])); } catch { /* ignore */ }
    renderConds();
    $("#rlResult").hidden = true;
    $("#rlOpen").hidden = true;
    $("#rlSpin").textContent = "Крутити";
    idleReel();
  });
  $("#rlClose").addEventListener("click", popOverlay);
  $("#rlBackdrop").addEventListener("click", () => { if (!spinning) popOverlay(); });
  $("#rlOpen").addEventListener("click", () => {
    if (!winner) return;
    openAfterClose = winner.id;
    popOverlay();
  });
}
