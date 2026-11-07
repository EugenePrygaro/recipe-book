/**
 * «Що приготувати з того, що є»: відмічаєте продукти вдома, сайт показує страви,
 * для яких бракує найменше. Відсутнє можна одним натисканням додати в покупки.
 * Відмічені продукти зберігаються (personal.pantry) і синхронізуються між пристроями.
 */
import { $, esc, norm, plural, toast } from "../lib/dom.js";
import { food } from "../lib/icons.js";
import { data, ui, allRecipes, avgRating } from "../state.js";
import { GROUPS, productCatalog, analyze } from "../lib/products.js";
import { personalChanged } from "../actions.js";
import { isMobile } from "./media.js";
import { pushOverlay, popOverlay, openSheet } from "./overlays.js";
import { focusCard } from "./list.js";
import { rerender } from "./app.js";

let query = "";
let openAfterClose = null;

const have = () => new Set(data.personal.pantry);

function productsHTML() {
  const catalog = productCatalog(allRecipes());
  const selected = have();
  const q = norm(query);
  return GROUPS.map(([key, title]) => {
    const items = catalog.filter((p) => p.group === key && (!q || norm(p.name).includes(q)));
    if (!items.length) return "";
    return `<h4>${title}</h4><div class="pt-chips">${items.map((p) =>
      `<button type="button" class="pt-chip" data-prod="${esc(p.name)}" aria-pressed="${selected.has(p.name)}">${food(p.icon, "fi-xs")}${esc(p.name)}</button>`).join("")}</div>`;
  }).join("") || `<p class="note">Нічого не знайдено за «${esc(query)}».</p>`;
}

function resultsHTML() {
  const selected = have();
  if (!selected.size) {
    return `<div class="pt-empty">${food("carrot", "fi-xl", { lazy: false })}<p>Відмітьте продукти, які є вдома, і тут з’являться страви, які можна з них приготувати.</p></div>`;
  }
  const rows = allRecipes()
    .map((r) => ({ r, ...analyze(r, selected) }))
    .filter((x) => x.total && x.haveCount > 0 && x.missing.length <= 3)
    .sort((a, b) => a.missing.length - b.missing.length || b.haveCount - a.haveCount || avgRating(b.r.id) - avgRating(a.r.id))
    .slice(0, 16);
  if (!rows.length) return `<p class="note pt-none">Поки нічого не підходить. Відмітьте ще кілька продуктів.</p>`;

  const row = ({ r, missing, haveCount, total }) => `<li class="pt-row" data-rid="${esc(r.id)}">
    <span class="pt-ic">${food(r.icon)}</span>
    <span class="pt-info"><b>${esc(r.title)}</b>
      ${missing.length
        ? `<small>Бракує: ${esc(missing.map((m) => m.alts.join(" або ")).join(", "))}</small>`
        : `<small class="ok">Є все потрібне (${haveCount} з ${total})</small>`}
    </span>
    <span class="pt-actions">
      ${missing.length ? `<button type="button" class="ed soft" data-pt="buy">У покупки</button>` : ""}
      <button type="button" class="ed" data-pt="open">Відкрити</button>
    </span></li>`;

  const ready = rows.filter((x) => !x.missing.length);
  const almost = rows.filter((x) => x.missing.length);
  return `${ready.length ? `<h4 class="pt-h">${food("check-mark-button", "fi-xs")}Можна готувати вже зараз</h4><ul class="pt-list">${ready.map(row).join("")}</ul>` : ""}
    ${almost.length ? `<h4 class="pt-h">${food("shopping-cart", "fi-xs")}Бракує кількох продуктів</h4><ul class="pt-list">${almost.map(row).join("")}</ul>` : ""}`;
}

function matchesCount() {
  const selected = have();
  if (!selected.size) return 0;
  return allRecipes().map((r) => analyze(r, selected))
    .filter((x) => x.total && x.haveCount > 0 && x.missing.length <= 3).length;
}

function renderPantry() {
  const n = data.personal.pantry.length;
  const found = Math.min(16, matchesCount());
  $("#ptJump").hidden = !found;
  $("#ptJump").textContent = `Показати страви (${found})`;
  $("#ptCount").textContent = n ? `Відмічено ${n} ${plural(n, "продукт", "продукти", "продуктів")}` : "";
  $("#ptClear").hidden = !n;
  $("#ptProducts").innerHTML = productsHTML();
  $("#ptResults").innerHTML = resultsHTML();
}

export function renderPantryIfOpen() {
  if (!$("#pantrySheet").hidden) renderPantry();
}

export function openPantry() {
  if (!$("#pantrySheet").hidden) return;
  query = "";
  $("#ptSearch").value = "";
  renderPantry();
  $("#pantrySheet").hidden = false;
  $("#ptBackdrop").hidden = isMobile();
  $("#pantrySheet").scrollTop = 0;
  pushOverlay("pantry", hidePantry, { lock: true });
  $("#ptBack").focus({ preventScroll: true });
}

function hidePantry() {
  $("#pantrySheet").hidden = true;
  $("#ptBackdrop").hidden = true;
  const id = openAfterClose;
  openAfterClose = null;
  if (id) {
    setTimeout(() => {
      if (isMobile()) openSheet(id);
      else { ui.openId = id; rerender(); focusCard(id, "start"); }
    }, 60);
  } else {
    $("#openPantry").focus({ preventScroll: true });
  }
}

/** Відсутні продукти страви — у «свої пункти» списку покупок. */
function buyMissing(recipe) {
  const { missing } = analyze(recipe, have());
  const shop = data.personal.shop;
  const existing = new Set(shop.extra.map((x) => norm(x.text)));
  const add = missing.map((m) => m.alts.join(" або ")).filter((t) => !existing.has(norm(t)));
  shop.extra = [...shop.extra, ...add.map((text, i) => ({ id: `x${Date.now().toString(36)}${i}`, text, done: false }))];
  personalChanged();
  toast(add.length ? `У покупки: ${add.join(", ")}` : "Ці продукти вже є в списку покупок");
}

export function initPantry() {
  $("#openPantry").addEventListener("click", openPantry);
  $("#ptBack").addEventListener("click", popOverlay);
  $("#ptBackdrop").addEventListener("click", popOverlay);
  $("#ptSearch").addEventListener("input", (e) => { query = e.target.value; $("#ptProducts").innerHTML = productsHTML(); });
  $("#ptClear").addEventListener("click", () => { data.personal.pantry = []; personalChanged(); });
  $("#ptJump").addEventListener("click", () => $("#ptResults").scrollIntoView({ behavior: "smooth", block: "start" }));

  $("#ptProducts").addEventListener("click", (e) => {
    const b = e.target.closest("[data-prod]");
    if (!b) return;
    const name = b.dataset.prod;
    const list = data.personal.pantry;
    data.personal.pantry = list.includes(name) ? list.filter((x) => x !== name) : [...list, name];
    personalChanged();
  });

  $("#ptResults").addEventListener("click", (e) => {
    const b = e.target.closest("[data-pt]");
    if (!b) return;
    const recipe = allRecipes().find((r) => r.id === b.closest("[data-rid]").dataset.rid);
    if (!recipe) return;
    if (b.dataset.pt === "buy") buyMissing(recipe);
    else { openAfterClose = recipe.id; popOverlay(); }
  });
}
