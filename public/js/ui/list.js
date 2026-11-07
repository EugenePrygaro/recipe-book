/** Список страв: фільтрація, сортування, фільтри-чипи й лічильники. */
import { TAGS, CAT_ICONS, MODES, NO_CATEGORY } from "../config.js";
import { food } from "../lib/icons.js";
import { $, $$, esc, norm, plural, scrollBehavior, reducedMotion } from "../lib/dom.js";
import { catColor } from "../lib/format.js";
import { ui, allRecipes, categories, isFav, cookedArr, lastCooked, avgRating } from "../state.js";
import { cardHTML, revealed } from "./cards.js";

function updateScrollCue(strip) {
  const cue = strip.parentElement;
  cue.classList.toggle("has-more", strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 1);
  cue.classList.toggle("has-left", strip.scrollLeft > 1);
}

function updateScrollCues() {
  document.querySelectorAll("[data-scroll-strip]").forEach(updateScrollCue);
}

document.addEventListener("scroll", (event) => {
  if (event.target instanceof HTMLElement && event.target.matches("[data-scroll-strip]")) {
    updateScrollCue(event.target);
  }
}, { capture: true, passive: true });
window.addEventListener("resize", updateScrollCues, { passive: true });

/** null — страва не підходить; інакше {hits} зі знайденими інгредієнтами. */
export function matchRecipe(r) {
  if (ui.cat && (r.category || NO_CATEGORY) !== ui.cat) return null;
  if (ui.tag && !(r.tags || []).includes(ui.tag)) return null;
  if (ui.fav && !isFav(r.id)) return null;
  if (ui.minRating && avgRating(r.id) < ui.minRating) return null;
  const q = norm(ui.q);
  if (!q) return { hits: [] };
  const ingHits = (r.ingredients || []).filter((i) => norm(i.name).includes(q)).map((i) => i.name);
  const byName = norm(r.title).includes(q);
  const byCat = norm(r.category).includes(q);
  if (ui.mode === "name") return byName ? { hits: [] } : null;
  if (ui.mode === "cat") return byCat ? { hits: [] } : null;
  if (ui.mode === "ing") return ingHits.length ? { hits: ingHits } : null;
  const any = byName || byCat || ingHits.length || norm(r.description).includes(q);
  return any ? { hits: byName ? [] : ingHits } : null;
}

const num = (v, missing) => (v === null || v === undefined || v === "" || isNaN(v) ? missing : Number(v));

const SORTERS = {
  az: (a, b) => a.title.localeCompare(b.title, "uk"),
  "kcal-asc": (a, b) => num(a.kcal, 1e9) - num(b.kcal, 1e9),
  "kcal-desc": (a, b) => num(b.kcal, -1) - num(a.kcal, -1),
  prot: (a, b) => num(b.prot, -1) - num(a.prot, -1),
  cooked: (a, b) => cookedArr(b.id).length - cookedArr(a.id).length,
  stale: (a, b) => lastCooked(a.id) - lastCooked(b.id),
  rating: (a, b) => avgRating(b.id) - avgRating(a.id),
};

/** Страви, що проходять фільтри, у вибраному порядку: [[recipe, match], …] */
export function visibleRecipes() {
  const list = [];
  for (const r of allRecipes()) {
    const m = matchRecipe(r);
    if (m) list.push([r, m]);
  }
  const sorter = SORTERS[ui.sort];
  if (sorter) list.sort((x, y) => sorter(x[0], y[0]));
  return list;
}

function catChipsHTML(total) {
  return `<button type="button" class="chip" data-cat="" aria-pressed="${!ui.cat}">Усі категорії <span class="n">${total}</span></button>` +
    categories().map(([c, n]) => `<button type="button" class="chip" data-cat="${esc(c)}" style="--g:${catColor(c)}" aria-pressed="${ui.cat === c}">${
      CAT_ICONS[c] ? food(CAT_ICONS[c], "fi-xs") : `<span class="dot"></span>`
    }${esc(c)} <span class="n">${n}</span></button>`).join("");
}

function tagChipsHTML(all) {
  const favCount = all.filter((r) => isFav(r.id)).length;
  const topCount = all.filter((r) => avgRating(r.id) >= 4).length;
  return `<button type="button" class="chip tagc" data-favf="1" style="--tc:#E5484D;--tt:#fff" aria-pressed="${ui.fav}">${food("red-heart", "fi-xs")}Обране <span class="n">${favCount}</span></button>` +
    `<button type="button" class="chip tagc" data-minr="4" style="--tc:#E0A21A;--tt:#2A1E00" aria-pressed="${ui.minRating === 4}">${food("glowing-star", "fi-xs")}Оцінка 4+ <span class="n">${topCount}</span></button>` +
    Object.entries(TAGS).map(([k, t]) => `<button type="button" class="chip tagc" data-tag="${k}" style="--tc:${t.bg};--tt:${t.fg}" aria-pressed="${ui.tag === k}">${food(t.icon, "fi-xs")}${esc(t.label)} <span class="n">${all.filter((r) => (r.tags || []).includes(k)).length}</span></button>`).join("");
}

function renderChips(shown, all) {
  const cats = catChipsHTML(all.length);
  const tags = tagChipsHTML(all);
  $("#chips").innerHTML = cats;
  $("#chips2").innerHTML = tags;
  $("#mCats").innerHTML = cats;
  $("#mTags").innerHTML = tags;
  $("#catList").innerHTML = categories().map(([c]) => `<option value="${esc(c)}">`).join("");
  updateScrollCues();

  // увімкнені фільтри (телефон) і лічильник на кнопці «Фільтри»
  const pills = [];
  if (ui.mode !== "all") pills.push(["mode", `Шукати: ${MODES[ui.mode].toLowerCase()}`]);
  if (ui.cat) pills.push(["cat", ui.cat]);
  if (ui.fav) pills.push(["fav", "Обране", "red-heart"]);
  if (ui.minRating) pills.push(["minRating", `Оцінка ${ui.minRating}+`, "glowing-star"]);
  if (ui.tag) pills.push(["tag", TAGS[ui.tag].label, TAGS[ui.tag].icon]);
  $("#fBadge").textContent = pills.length || "";
  $("#activeF").innerHTML = pills.map(([k, label, ic]) =>
    `<button type="button" class="afp" data-clear="${k}" aria-label="Прибрати фільтр: ${esc(label)}">${ic ? food(ic, "fi-xs") : ""}${esc(label)} <span aria-hidden="true">×</span></button>`).join("");
  $("#fApply").textContent = shown ? `Показати ${shown} ${plural(shown, "страву", "страви", "страв")}` : "Нічого не знайдено";
}

/* ---------- поява карток під час прокрутки ---------- */

let observer = null;
let lastFilters = "";

function observeReveals() {
  observer?.disconnect();
  const cards = $$("#grid .card.reveal");
  if (!cards.length) return;
  if (!("IntersectionObserver" in window) || reducedMotion()) {
    cards.forEach((c) => { c.classList.remove("reveal"); revealed.add(c.dataset.rid); });
    return;
  }
  observer = new IntersectionObserver((entries) => {
    let i = 0;
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const card = e.target;
      card.style.setProperty("--d", `${Math.min(i++, 7) * 55}ms`);
      card.classList.add("in");
      revealed.add(card.dataset.rid);
      observer.unobserve(card);
    }
  }, { rootMargin: "0px 0px -6% 0px" });
  cards.forEach((c) => observer.observe(c));
}

export function renderList() {
  // змінилися фільтри чи сортування — картки з’являються заново, з анімацією
  const filters = JSON.stringify([ui.q, ui.mode, ui.cat, ui.tag, ui.fav, ui.minRating, ui.sort]);
  if (filters !== lastFilters) { revealed.clear(); lastFilters = filters; }

  const all = allRecipes();
  const list = visibleRecipes();
  renderChips(list.length, all);

  const grid = $("#grid");
  if (!list.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1">
      <p>${ui.q ? `Нічого не знайдено за запитом «${esc(ui.q)}».` : "Під ці фільтри поки немає страв."} Спробуйте інший пошук або зніміть частину фільтрів.</p>
      <button type="button" class="btn ghost" data-act="clear">Скинути фільтри</button></div>`;
  } else {
    grid.innerHTML = list.map(([r, m]) => cardHTML(r, m)).join("");
  }
  const total = all.length;
  $("#count").textContent = list.length === total
    ? `Усі ${total} ${plural(total, "страва", "страви", "страв")}`
    : `Знайдено ${list.length} з ${total}`;
  $("#footCount").textContent = `${total} ${plural(total, "страва", "страви", "страв")} у книзі`;
  observeReveals();
}

export function focusCard(id, block = "nearest") {
  const card = document.querySelector(`.card[data-rid="${CSS.escape(id)}"]`);
  if (!card) return;
  card.scrollIntoView({ block, behavior: scrollBehavior() });
  card.querySelector(".toggle")?.focus({ preventScroll: true });
}
