/** Список покупок: зведення продуктів зі страв, свої пункти, відмітки й «Поділитися». */
import { $, esc, norm, plural, toast, confirmTwice } from "../lib/dom.js";
import { fmtQty } from "../lib/format.js";
import { food } from "../lib/icons.js";
import { data, findRecipe } from "../state.js";
import { collectIngredients } from "../lib/ingredients.js";
import { personalChanged } from "../actions.js";
import { isMobile } from "./media.js";
import { pushOverlay, popOverlay } from "./overlays.js";
import { shareText } from "./share.js";

const shop = () => data.personal.shop;

function entries() {
  return Object.entries(shop().recipes)
    .map(([id, s]) => [findRecipe(id), Number(s) || 1])
    .filter(([r]) => r);
}

const collectItems = (list) => collectIngredients(list).map((item) => ({ ...item, parts: item.amounts }));
const qtyText = (item) => [...item.parts].map(([unit, amount]) => fmtQty(amount, unit, 1)).join(" + ");

function counts() {
  const items = collectItems(entries()).filter((i) => i.parts.size);
  const checked = new Set(shop().checked);
  const total = items.length + shop().extra.length;
  const done = items.filter((i) => checked.has(i.key)).length + shop().extra.filter((x) => x.done).length;
  return { items, checked, total, done };
}

export function updateShopBadge() {
  const { total, done } = counts();
  $("#shBadge").textContent = total - done > 0 ? total - done : "";
}

function renderShop() {
  const body = $("#shBody");
  const list = entries();
  const all = collectItems(list);
  const { checked, total, done } = counts();
  const extra = shop().extra;
  const addForm = `<form class="sh-add" id="shAdd"><input type="text" id="shNew" maxlength="80" placeholder="Свій пункт, наприклад сміттєві пакети" aria-label="Свій пункт"><button type="submit" class="btn">Додати</button></form>`;

  if (!list.length && !extra.length) {
    body.innerHTML = `<div class="sh-empty"><div class="big">${food("basket", "fi-xl", { lazy: false })}</div><p>Список поки порожній. Відкрийте рецепт і натисніть «Додати в покупки», або впишіть свій пункт.</p></div>${addForm}`;
    return;
  }

  const buy = all.filter((i) => i.parts.size)
    .sort((a, b) => (checked.has(a.key) - checked.has(b.key)) || a.name.localeCompare(b.name, "uk"));
  const atHome = all.filter((i) => !i.parts.size).map((i) => i.name);
  const portions = (n) => `${n} ${plural(n, "порція", "порції", "порцій")}`;
  const pct = total ? Math.round((done / total) * 100) : 0;

  body.innerHTML = `
    <div class="sh-progress"><div class="bar"><i style="width:${pct}%"></i></div><span>Куплено ${done} з ${total}</span></div>
    ${list.length ? `<h3>Страви</h3><ul class="sh-recipes">${list.map(([r, s]) => `
      <li data-sid="${esc(r.id)}"><span class="em" aria-hidden="true">${food(r.icon)}</span>
        <span class="t">${esc(r.title)}<small>${portions(s)}</small></span>
        <span class="stepper sm" role="group" aria-label="Порції: ${esc(r.title)}">
          <button type="button" data-sh="dec" aria-label="Менше порцій" ${s <= 1 ? "disabled" : ""}>−</button><output>${s}</output><button type="button" data-sh="inc" aria-label="Більше порцій">+</button>
        </span>
        <button type="button" class="xs" data-sh="rm" aria-label="Прибрати ${esc(r.title)} зі списку">×</button></li>`).join("")}</ul>` : ""}
    ${buy.length || extra.length ? `<h3>Що купити</h3><ul class="ings sh-items">
      ${buy.map((i) => `<li><button type="button" class="ing" data-sh="chk" data-k="${esc(i.key)}" aria-pressed="${checked.has(i.key)}">
        <span class="box" aria-hidden="true"></span><span class="nm">${esc(i.name)}<small>${esc([...i.from].join(", "))}</small></span>
        <span class="q">${esc(qtyText(i))}</span></button></li>`).join("")}
      ${extra.map((x) => `<li><button type="button" class="ing" data-sh="chkx" data-x="${esc(x.id)}" aria-pressed="${Boolean(x.done)}">
        <span class="box" aria-hidden="true"></span><span class="nm">${esc(x.text)}<small>свій пункт</small></span></button>
        <button type="button" class="xs" data-sh="rmx" data-x="${esc(x.id)}" aria-label="Прибрати пункт">×</button></li>`).join("")}
    </ul>` : ""}
    ${addForm}
    ${atHome.length ? `<h3>Перевірте, чи є вдома</h3><p class="sh-taste">${esc(atHome.join(", "))}</p>` : ""}
    <div class="sh-actions">
      <button type="button" class="btn" data-sh="share">Поділитися списком</button>
      ${done ? `<button type="button" class="btn ghost" data-sh="uncheck">Зняти всі відмітки</button>` : ""}
      <button type="button" class="del" data-sh="clear">Очистити список</button>
    </div>`;
}

export function renderShopIfOpen() {
  if (!$("#shopSheet").hidden) renderShop();
}

function listText() {
  const list = entries();
  const { items, checked } = counts();
  const lines = ["🛒 Список покупок"];
  if (list.length) lines.push("Для: " + list.map(([r, s]) => `${r.title} (${s} ${plural(s, "порція", "порції", "порцій")})`).join(", "));
  lines.push("");
  items.filter((i) => !checked.has(i.key))
    .sort((a, b) => a.name.localeCompare(b.name, "uk"))
    .forEach((i) => lines.push(`☐ ${i.name} — ${qtyText(i)}`));
  shop().extra.filter((x) => !x.done).forEach((x) => lines.push(`☐ ${x.text}`));
  const atHome = collectItems(list).filter((i) => !i.parts.size).map((i) => i.name);
  if (atHome.length) lines.push("", "Перевірити вдома: " + atHome.join(", "));
  return lines.join("\n");
}

export function openShop() {
  if (!$("#shopSheet").hidden) return;
  renderShop();
  $("#shopSheet").hidden = false;
  $("#shBackdrop").hidden = isMobile();
  $("#shopSheet").scrollTop = 0;
  pushOverlay("shopping", hideShop, { lock: true });
  $("#shBack").focus({ preventScroll: true });
}

function hideShop() {
  $("#shopSheet").hidden = true;
  $("#shBackdrop").hidden = true;
  $("#openShop").focus({ preventScroll: true });
}

/** Додати страву в покупки або оновити кількість порцій. */
export function addToShop(recipe, servings) {
  shop().recipes = { ...shop().recipes, [recipe.id]: servings };
  personalChanged();
  toast(`Додано в покупки: ${recipe.title}`);
}

export function removeFromShop(id) {
  const recipes = { ...shop().recipes };
  delete recipes[id];
  shop().recipes = recipes;
  personalChanged();
  toast("Прибрано зі списку покупок");
}

function onClick(e) {
  const b = e.target.closest("[data-sh]");
  if (!b) return;
  const s = shop();
  const action = b.dataset.sh;
  const sid = b.closest("[data-sid]")?.dataset.sid;

  switch (action) {
    case "inc":
    case "dec": {
      const cur = Number(s.recipes[sid]) || 1;
      s.recipes = { ...s.recipes, [sid]: Math.min(50, Math.max(1, cur + (action === "inc" ? 1 : -1))) };
      break;
    }
    case "rm": {
      const recipes = { ...s.recipes };
      delete recipes[sid];
      s.recipes = recipes;
      break;
    }
    case "chk": {
      const k = b.dataset.k;
      s.checked = s.checked.includes(k) ? s.checked.filter((x) => x !== k) : [...s.checked, k];
      break;
    }
    case "chkx":
      s.extra = s.extra.map((x) => (x.id === b.dataset.x ? { ...x, done: !x.done } : x));
      break;
    case "rmx":
      s.extra = s.extra.filter((x) => x.id !== b.dataset.x);
      break;
    case "uncheck":
      s.checked = [];
      s.extra = s.extra.map((x) => ({ ...x, done: false }));
      break;
    case "share":
      shareText("Список покупок", listText());
      return;
    case "clear":
      if (!confirmTwice(b, "Натисніть ще раз, щоб очистити", "Очистити список")) return;
      data.personal.shop = { recipes: {}, checked: [], extra: [] };
      toast("Список покупок очищено");
      break;
    default:
      return;
  }
  personalChanged();
}

export function initShop() {
  $("#shBody").addEventListener("click", onClick);
  $("#shBody").addEventListener("submit", (e) => {
    if (e.target.id !== "shAdd") return;
    e.preventDefault();
    const text = $("#shNew").value.trim();
    if (!text) return;
    shop().extra = [...shop().extra, { id: `x${Date.now().toString(36)}`, text, done: false }];
    personalChanged();
    setTimeout(() => $("#shNew")?.focus(), 0);
  });
  $("#openShop").addEventListener("click", openShop);
  $("#shBack").addEventListener("click", popOverlay);
  $("#shBackdrop").addEventListener("click", popOverlay);
}
