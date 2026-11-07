/** Стрічка «Давно не готували»: страви, які вже готували, але понад STALE_DAYS днів тому. */
import { $, esc } from "../lib/dom.js";
import { food } from "../lib/icons.js";
import { daysAgo } from "../lib/format.js";
import { ui, allRecipes, isStale, lastCooked, photoThumb } from "../state.js";

export function renderStale() {
  const box = $("#stale");
  const list = allRecipes()
    .filter((r) => isStale(r.id))
    .sort((a, b) => lastCooked(a.id) - lastCooked(b.id))
    .slice(0, 10);
  // ховаємо під час пошуку й фільтрів, щоб не заважало
  const filtering = ui.q || ui.cat || ui.tag || ui.fav || ui.minRating;
  box.hidden = !list.length || Boolean(filtering);
  if (box.hidden) return;
  $("#staleRow").innerHTML = list.map((r) => {
    const src = photoThumb(r);
    return `<button type="button" class="st-card" data-stale="${esc(r.id)}">
      <span class="st-pic">${src ? `<img src="${esc(src)}" alt="" loading="lazy" decoding="async">` : food(r.icon)}</span>
      <span class="st-title">${esc(r.title)}</span>
      <span class="st-ago">${food("hourglass-not-done", "fi-xs")}${daysAgo(lastCooked(r.id))}</span>
    </button>`;
  }).join("");
}

/** Натискання на страву зі стрічки відкриває її; «Усі за давністю» — сортування списку. */
export function initStale({ openRecipe, sortByStale }) {
  $("#staleRow").addEventListener("click", (e) => {
    const b = e.target.closest("[data-stale]");
    if (b) openRecipe(b.dataset.stale);
  });
  $("#staleAll").addEventListener("click", sortByStale);
}
