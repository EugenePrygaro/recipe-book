/** Картка страви в списку і її частини (фото з плашками, мітки категорії). */
import { TAGS, CAT_ICONS, NO_CATEGORY, DEFAULT_ICON } from "../config.js";
import { esc, norm } from "../lib/dom.js";
import { icon, food } from "../lib/icons.js";
import { catColor, fmtRating } from "../lib/format.js";
import { ui, isFav, cookedArr, cookedText, photoSrc, photoThumb, avgRating } from "../state.js";
import { detailsHTML } from "./recipe.js";
import { isMobile } from "./media.js";

/** id карток, які вже з’явилися на екрані (щоб не анімувати їх повторно). */
export const revealed = new Set();

/** Підсвічує збіг із пошуковим запитом. */
export function highlight(text) {
  const q = norm(ui.q);
  const t = String(text);
  const i = norm(t).indexOf(q);
  if (!q || i < 0) return esc(t);
  return `${esc(t.slice(0, i))}<mark>${esc(t.slice(i, i + q.length))}</mark>${esc(t.slice(i + q.length))}`;
}

export const tagBadge = (key, cls = "st", iconOnly = false) => {
  const t = TAGS[key];
  return t ? `<span class="${cls}${iconOnly ? " st-icon" : ""}" style="--tc:${t.bg};--tt:${t.fg}" aria-label="${esc(t.label)}" title="${esc(t.label)}">${food(t.icon, "fi-xs")}${iconOnly ? "" : esc(t.label)}</span>` : "";
};

function stickersHTML(r) {
  const parts = [];
  for (const key of r.tags || []) parts.push(tagBadge(key, "st", true));
  return parts.length ? `<div class="stickers">${parts.join("")}</div>` : "";
}

/**
 * Фото або намальована тарілка з іконкою + плашки позначок, калорій і сердечко.
 * @param {boolean} large — повне фото (рецепт на весь екран), інакше зменшене для картки
 */
export function photoHTML(r, large = false) {
  const src = large ? photoSrc(r) : photoThumb(r);
  const picture = src
    ? `<img class="ph" src="${esc(src)}" alt="${esc(r.title)}" ${large ? "" : 'loading="lazy"'} decoding="async" onload="this.classList.add('ok')" onerror="this.remove()">`
    : `<div class="plate" aria-hidden="true">${food(r.icon || DEFAULT_ICON, "plate-ic")}</div>`;
  const fav = isFav(r.id);
  const heart = `<button type="button" class="fav" data-act="fav" aria-pressed="${fav}" aria-label="${fav ? "Прибрати з обраного" : "Додати в обране"}">${icon("heart")}</button>`;
  const kcal = r.kcal ? `<span class="kc">${food("fire", "fi-xs")}<b>${esc(r.kcal)}</b> ккал на порцію</span>` : "";
  return picture + stickersHTML(r) + heart + kcal;
}

export function metaHTML(r) {
  const cat = r.category || NO_CATEGORY;
  return `<div class="meta">
    <button type="button" class="tag" data-act="cat" title="Показати категорію">${CAT_ICONS[cat] ? food(CAT_ICONS[cat], "fi-xs") : ""}${esc(cat)}</button>
    ${r.builtin ? "" : `<span class="mine">Додано вами</span>`}
    ${r.edited ? `<span class="edited">Змінено</span>` : ""}
    ${avgRating(r.id) ? `<span class="rt" title="Середня оцінка">${icon("star")}${fmtRating(avgRating(r.id))}</span>` : ""}
  </div>`;
}

export function cardHTML(r, match) {
  const open = !isMobile() && ui.openId === r.id;
  const hits = match.hits.length ? `<p class="hit">У складі: ${match.hits.slice(0, 3).map(highlight).join(", ")}</p>` : "";
  const title = ui.mode === "ing" || ui.mode === "cat" ? esc(r.title) : highlight(r.title);
  const reveal = revealed.has(r.id) ? "" : " reveal";
  return `<article class="card${open ? " open" : ""}${reveal}" data-rid="${esc(r.id)}" style="--g:${catColor(r.category || NO_CATEGORY)}">
    <div class="photo">${photoHTML(r, open)}</div>
    <div class="body">
      ${metaHTML(r)}
      <h2>${title}</h2>
      ${r.description ? `<p class="desc">${esc(r.description)}</p>` : ""}
      ${hits}
      ${cookedArr(r.id).length ? `<p class="cooked-line">${food("check-mark-button", "fi-xs")}${esc(cookedText(r.id))}</p>` : ""}
      <button type="button" class="toggle" data-act="toggle" aria-expanded="${open}">
        ${open ? "Згорнути" : "Показати рецепт"} ${icon("chevron-down")}
      </button>
    </div>
    ${open ? detailsHTML(r) : ""}
  </article>`;
}
