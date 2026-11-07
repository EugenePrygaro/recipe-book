/** Розгорнутий рецепт: порції, інгредієнти, кроки, кнопки дій. */
import { icon, food } from "../lib/icons.js";
import { esc, norm, plural } from "../lib/dom.js";
import { fmtQty, fmtRating } from "../lib/format.js";
import { ui, data, cookedArr, cookedText, photoSrc, servingsOf, myRating, avgRating } from "../state.js";

const portions = (n) => `${n} ${plural(n, "порцію", "порції", "порцій")}`;

export function ingredientsHTML(r) {
  const factor = servingsOf(r) / r.servings;
  const q = norm(ui.q);
  const highlightIng = q && (ui.mode === "ing" || ui.mode === "all");
  return (r.ingredients || []).map((ing, i) => {
    const qty = fmtQty(ing.amount, ing.unit, factor);
    const key = `${r.id}|i|${i}`;
    const hl = highlightIng && norm(ing.name).includes(q) ? ' class="hl"' : "";
    return `<li${hl}><button type="button" class="ing" data-act="ing" data-k="${esc(key)}" aria-pressed="${ui.checked.has(key)}">
      <span class="box" aria-hidden="true"></span><span class="nm">${esc(ing.name)}</span>
      <span class="q${qty ? "" : " none"}">${qty ? esc(qty) : "за смаком"}</span></button></li>`;
  }).join("");
}

export function servHTML(r) {
  const s = servingsOf(r);
  const changed = s !== r.servings;
  const macros = [["prot", "білки"], ["fat", "жири"], ["carb", "вуглеводи"]].filter(([k]) => r[k] !== null && r[k] !== undefined);
  return `<div class="serv">
    <span class="lbl" id="sl-${esc(r.id)}">Порції</span>
    <span class="stepper" role="group" aria-labelledby="sl-${esc(r.id)}">
      <button type="button" data-act="dec" aria-label="Менше порцій" ${s <= 1 ? "disabled" : ""}>−</button>
      <output aria-live="polite" class="bump">${s}</output>
      <button type="button" data-act="inc" aria-label="Більше порцій" ${s >= 50 ? "disabled" : ""}>+</button>
    </span>
    ${changed
      ? `<button type="button" class="linkbtn" data-act="reset">Як у рецепті (${r.servings})</button>`
      : `<span class="orig">рецепт на ${portions(r.servings)}</span>`}
    ${r.kcal ? `<p class="kline">≈ <b>${r.kcal} ккал</b> на порцію, разом на ${portions(s)} ≈ <b>${(r.kcal * s).toLocaleString("uk-UA")} ккал</b></p>` : ""}
    ${macros.length ? `<div class="macros" aria-label="На одну порцію">${macros.map(([k, label]) => `<span class="mc"><b>${esc(r[k])} г</b> ${label}</span>`).join("")}</div>` : ""}
  </div>`;
}

function shopBlockHTML(r) {
  const s = servingsOf(r);
  const inList = Number(data.personal.shop.recipes[r.id]) || 0;
  if (!inList) {
    return `<div class="quick"><button type="button" class="qbtn" data-act="shop">${icon("shopping-cart")}Додати в покупки (${portions(s)})</button></div>`;
  }
  if (inList !== s) {
    return `<div class="quick"><button type="button" class="qbtn" data-act="shop">${icon("shopping-cart")}Оновити в покупках: ${portions(s)}</button>
      <p class="qnote">Зараз у списку покупок на ${portions(inList)}. <button type="button" class="linkbtn" data-act="unshop">Прибрати</button></p></div>`;
  }
  return `<div class="quick"><button type="button" class="qbtn soft" data-act="openshop">${icon("shopping-cart")}Відкрити список покупок</button>
    <p class="qnote">У списку на ${portions(s)}. <button type="button" class="linkbtn" data-act="unshop">Прибрати зі списку</button></p></div>`;
}

/** Спільна оцінка книги рецептів. */
function ratingHTML(r) {
  const mine = myRating(r.id);
  const avg = avgRating(r.id);
  const input = [1, 2, 3, 4, 5].map((n) =>
    `<button type="button" class="star${n <= mine ? " on" : ""}" data-act="rate" data-stars="${n}" aria-label="Оцінка ${n} з 5" aria-pressed="${n === mine}">${icon("star")}</button>`).join("");
  return `<div class="rating">
    <div class="rating-head"><h4>Як вам?</h4>${avg ? `<span class="rating-avg">${icon("star")}${fmtRating(avg)} <small>середня</small></span>` : ""}</div>
    <div class="rating-row"><span class="who">Спільна оцінка</span><span class="stars" role="group" aria-label="Спільна оцінка">${input}</span>${mine ? `<span class="rate-hint">натисніть ще раз, щоб прибрати</span>` : ""}</div>
  </div>`;
}

function stepsHTML(r) {
  return (r.steps || []).map((text, i) => {
    const key = `${r.id}|s|${i}`;
    const done = ui.checked.has(key);
    return `<li${done ? ' class="done"' : ""}><button type="button" class="stp" data-act="step" data-k="${esc(key)}" aria-pressed="${done}">${esc(text)}</button></li>`;
  }).join("");
}

export function detailsHTML(r) {
  const steps = stepsHTML(r);
  const cooked = cookedArr(r.id).length;
  let danger = "";
  if (!r.builtin) danger = `<button type="button" class="del" data-act="del">Видалити страву</button>`;
  else if (r.edited) danger = `<button type="button" class="del" data-act="revert">Повернути оригінал</button>`;
  return `<div class="details">
    <section aria-label="Інгредієнти">
      <h3>Інгредієнти</h3>
      ${servHTML(r)}
      <p class="tip">Торкніться продукту, щоб викреслити його.</p>
      <ul class="ings">${ingredientsHTML(r)}</ul>
      ${shopBlockHTML(r)}
    </section>
    <section aria-label="Приготування">
      <h3>Приготування</h3>
      ${steps ? `<p class="tip">Торкніться кроку, коли його виконано.</p><ol class="steps">${steps}</ol>` : `<p class="note">Кроки ще не додані.</p>`}
      <div class="quick">
        <button type="button" class="qbtn soft" data-act="cooked">${food("check-mark-button", "fi-sm")}Приготували сьогодні</button>
        <p class="qnote">${cooked
          ? `${esc(cookedText(r.id))}. <button type="button" class="linkbtn" data-act="uncook">Скасувати останній запис</button>`
          : "Позначте, коли приготуєте, і сайт запам’ятає дату."}</p>
      </div>
      ${ratingHTML(r)}
    </section>
    <div class="extra">
      <span class="acts">
        <button type="button" class="ed" data-act="edit">${icon("pencil")}Редагувати</button>
        <button type="button" class="ed soft" data-act="share">${icon("share-2")}Поділитися</button>
        <button type="button" class="ed soft" data-act="photo">${icon("camera")}${photoSrc(r) ? "Змінити фото" : "Додати фото"}</button>
        ${photoSrc(r) ? `<button type="button" class="ed soft" data-act="photo-rm">${icon("trash-2")}Прибрати фото</button>` : ""}
        ${r.source ? `<a class="ed soft" href="${esc(r.source)}" target="_blank" rel="noopener">${icon("external-link")}Оригінальний рецепт</a>` : ""}
      </span>
      ${danger}
    </div>
  </div>`;
}

/** Оновлює лише порції й інгредієнти, не перемальовуючи весь рецепт. */
export function updateServings(holder, r) {
  const section = holder.querySelector(".details section");
  section.querySelector(".serv").outerHTML = servHTML(r);
  section.querySelector(".ings").innerHTML = ingredientsHTML(r);
  section.querySelector(".quick").outerHTML = shopBlockHTML(r);
}

/** Текст рецепта для «Поділитися». */
export function recipeText(r) {
  const s = servingsOf(r);
  const factor = s / r.servings;
  const meta = [`${s} ${plural(s, "порція", "порції", "порцій")}`];
  if (r.kcal) meta.push(`≈ ${r.kcal} ккал на порцію`);
  return [
    `🍲 ${r.title}`,
    meta.join(", "),
    "",
    "Інгредієнти:",
    ...(r.ingredients || []).map((i) => `• ${i.name} — ${fmtQty(i.amount, i.unit, factor) || "за смаком"}`),
    "",
    "Приготування:",
    ...(r.steps || []).map((t, i) => `${i + 1}. ${t}`),
  ].join("\n");
}
