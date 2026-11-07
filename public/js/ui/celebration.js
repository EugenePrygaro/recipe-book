/** Спільний поточний план свята, список інгредієнтів і архів. */
import { $, esc, norm, plural, toast, confirmTwice } from "../lib/dom.js";
import { fmtQty } from "../lib/format.js";
import { food } from "../lib/icons.js";
import { data, allRecipes, findRecipe } from "../state.js";
import { collectIngredients } from "../lib/ingredients.js";
import { syncCelebrationShopping } from "../lib/celebration-shopping.js";
import { personalChanged } from "../actions.js";
import { pushOverlay, popOverlay } from "./overlays.js";
import { openShop } from "./shop.js";

const currentPlan = () => data.personal.celebration.current;
const isoToday = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const makeId = (prefix) => `${prefix}-${Date.now().toString(36)}`;
const portions = (n) => `${n} ${plural(n, "порція", "порції", "порцій")}`;

function planItems(plan = currentPlan()) {
  if (!plan) return [];
  const recipes = plan.recipes
    .map((dish) => [findRecipe(dish.id), dish.servings])
    .filter(([recipe]) => recipe);
  return collectIngredients(recipes, plan.custom);
}

function quantityText(item) {
  const quantities = [...item.amounts].map(([unit, amount]) =>
    fmtQty(amount, unit),
  );
  return quantities.length ? quantities.join(" + ") : "кількість не вказана";
}

function syncToShopping(plan) {
  syncCelebrationShopping(
    plan,
    data.personal.shop,
    new Set(allRecipes().map((recipe) => recipe.id)),
  );
}

function archiveHTML() {
  const archive = data.personal.celebration.archive;
  if (!archive.length) return "";
  return `<details class="holiday-archive"><summary>Архів свят — ${archive.length}</summary><ul>
    ${archive
      .map((plan) => {
        const count = plan.recipes.length + plan.custom.length;
        return `<li><strong>${esc(plan.title)}</strong><span>${plan.date ? esc(plan.date) : "Без дати"} · ${count} ${plural(count, "страва", "страви", "страв")}</span>
        <small>${[...plan.recipes.map((dish) => findRecipe(dish.id)?.title).filter(Boolean), ...plan.custom.map((dish) => dish.name)].map(esc).join(", ")}</small></li>`;
      })
      .join("")}
  </ul></details>`;
}

function renderCreate() {
  $("#holidayTitle").textContent = "Запланувати свято";
  $("#holidayBody").innerHTML = `
    <p class="holiday-intro">Створіть спільний план: оберіть страви, кількість порцій і додайте власні позиції. Інгредієнти потраплять у список покупок.</p>
    <form class="holiday-create" id="holidayCreate">
      <label class="holiday-field">
        <span class="holiday-field-label">${food("party-popper", "fi-xs", { lazy: false })}Назва свята</span>
        <input class="holiday-input" id="holidayName" data-draft maxlength="100" required placeholder="Наприклад, Різдво">
      </label>
      <label class="holiday-field">
        <span class="holiday-field-label"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="16" rx="3"></rect><path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17M8 13h2m4 0h2m-8 4h2"></path></svg>Дата свята</span>
        <input class="holiday-input" id="holidayDate" data-draft type="date" value="${isoToday()}">
      </label>
      <button class="btn" type="submit">Створити меню</button>
    </form>
    ${archiveHTML()}`;
}

function renderPlan() {
  const plan = currentPlan();
  if (!plan) {
    renderCreate();
    return;
  }
  $("#holidayTitle").textContent = plan.title;
  const recipes = allRecipes();
  const items = planItems(plan);
  const checked = new Set([...plan.checked, ...data.personal.shop.checked]);
  const done = items.filter((item) => checked.has(item.key)).length;
  const ready =
    plan.recipes.filter((dish) => dish.ready).length +
    plan.custom.filter((dish) => dish.ready).length;
  const dishTotal = plan.recipes.length + plan.custom.length;
  const recipeRows = plan.recipes
    .map((dish) => {
      const recipe = findRecipe(dish.id);
      if (!recipe) return "";
      return `<li class="holiday-dish" data-hid="${esc(dish.id)}">
      <span class="holiday-dish-icon">${food(recipe.icon || "fork-and-knife-with-plate")}</span>
      <span class="holiday-dish-name">${esc(recipe.title)}<small>${portions(dish.servings)}</small></span>
      <span class="stepper sm" role="group" aria-label="Порції: ${esc(recipe.title)}">
        <button type="button" data-ha="serving" data-delta="-1" aria-label="Менше порцій" ${dish.servings <= 1 ? "disabled" : ""}>−</button>
        <output>${dish.servings}</output>
        <button type="button" data-ha="serving" data-delta="1" aria-label="Більше порцій">+</button>
      </span>
      <label class="holiday-ready"><input type="checkbox" data-ha="ready" ${dish.ready ? "checked" : ""}><span>Готово</span></label>
      <button type="button" class="xs" data-ha="remove-dish" aria-label="Прибрати ${esc(recipe.title)}">×</button>
    </li>`;
    })
    .join("");
  const customRows = plan.custom
    .map(
      (dish) => `<li class="holiday-dish" data-hid="${esc(dish.id)}">
    <span class="holiday-dish-icon">${food("cooking")}</span>
    <span class="holiday-dish-name">${esc(dish.name)}<small>${portions(dish.servings)} · власна страва</small></span>
    <label class="holiday-ready"><input type="checkbox" data-ha="ready-custom" ${dish.ready ? "checked" : ""}><span>Готово</span></label>
    <button type="button" class="xs" data-ha="remove-custom" aria-label="Прибрати ${esc(dish.name)}">×</button>
  </li>`,
    )
    .join("");
  const recipeOptions = recipes
    .map(
      (recipe) =>
        `<option value="${esc(recipe.id)}">${esc(recipe.title)}</option>`,
    )
    .join("");
  const ingredientRows = items
    .map(
      (
        item,
      ) => `<li><button type="button" class="ing holiday-ingredient" data-ha="check-ingredient" data-key="${esc(item.key)}" aria-pressed="${checked.has(item.key)}">
    <span class="box" aria-hidden="true"></span><span class="nm">${esc(item.name)}<small>${esc([...item.sources].join(", "))}</small></span><span class="q">${esc(quantityText(item))}</span>
  </button></li>`,
    )
    .join("");
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  $("#holidayBody").innerHTML = `
    <div class="holiday-summary">
      <label class="f">Свято<input data-draft data-hfield="title" maxlength="100" value="${esc(plan.title)}"></label>
      <label class="f">Дата<input data-draft data-hfield="date" type="date" value="${esc(plan.date)}"></label>
      <div class="sh-progress"><div class="bar"><i style="width:${pct}%"></i></div><span>Куплено ${done} з ${items.length} інгредієнтів · готово ${ready} з ${dishTotal} страв</span></div>
    </div>
    <h3>Меню</h3>
    ${dishTotal ? `<ul class="holiday-dishes">${recipeRows}${customRows}</ul>` : `<p class="holiday-empty">Додайте страви до святкового меню.</p>`}
    <form class="holiday-add" id="holidayAddRecipe">
      <label class="f">Страва з книги<select id="holidayRecipe" data-draft required><option value="">Оберіть страву…</option>${recipeOptions}</select></label>
      <label class="f">Порцій<input id="holidayServings" data-draft type="number" min="1" max="50" value="4" inputmode="numeric"></label>
      <button class="btn" type="submit">Додати страву</button>
    </form>
    <details class="holiday-custom"><summary>Додати власну страву</summary>
      <form id="holidayAddCustom">
        <label class="f">Назва<input id="holidayCustomName" data-draft maxlength="100" required placeholder="Наприклад, Домашній рулет"></label>
        <label class="f">Порцій<input id="holidayCustomServings" data-draft type="number" min="1" max="50" value="4" inputmode="numeric"></label>
        <label class="f">Інгредієнти <small>по одному на рядок; кількість можна написати в тому ж рядку</small><textarea id="holidayCustomIngredients" data-draft rows="4" placeholder="Яйця — 4 шт&#10;Борошно — 200 г"></textarea></label>
        <button class="btn" type="submit">Додати власну страву</button>
      </form>
    </details>
    <h3>Інгредієнти</h3>
    ${ingredientRows ? `<ul class="ings holiday-ingredients">${ingredientRows}</ul>` : `<p class="holiday-empty">Додайте страви, щоб побачити інгредієнти.</p>`}
    <div class="sh-actions holiday-actions">
      <button type="button" class="btn" data-ha="shopping">Відкрити список покупок</button>
      <button type="button" class="btn ghost" data-ha="archive">Завершити свято й перенести в архів</button>
    </div>
    ${archiveHTML()}`;
}

function render() {
  if ($("#holidaySheet").hidden) return;
  const body = $("#holidayBody");
  const scrollTop = body.scrollTop;
  const drafts = new Map(
    [...body.querySelectorAll("[data-draft]")].map((element) => {
      let start = null,
        end = null,
        direction = null;
      try {
        start = element.selectionStart;
        end = element.selectionEnd;
        direction = element.selectionDirection;
      } catch {
        /* selection is unavailable for date and number inputs */
      }
      return [element.id, { value: element.value, start, end, direction }];
    }),
  );
  const active = body.contains(document.activeElement)
    ? document.activeElement
    : null;
  const activeId = active?.id;
  renderPlan();
  for (const [id, draft] of drafts) {
    const element = document.getElementById(id);
    if (!element || !element.hasAttribute("data-draft")) continue;
    element.value = draft.value;
    if (
      typeof draft.start === "number" &&
      typeof element.setSelectionRange === "function"
    ) {
      element.setSelectionRange(draft.start, draft.end, draft.direction);
    }
  }
  body.scrollTop = scrollTop;
  if (activeId)
    document.getElementById(activeId)?.focus({ preventScroll: true });
}

function openCelebration() {
  const sheet = $("#holidaySheet");
  if (!sheet.hidden) return;
  renderPlan();
  sheet.hidden = false;
  $("#holidayBackdrop").hidden = false;
  sheet.scrollTop = 0;
  pushOverlay("holiday", hideCelebration, { lock: true });
  $("#holidayBack").focus({ preventScroll: true });
}

function hideCelebration() {
  $("#holidaySheet").hidden = true;
  $("#holidayBackdrop").hidden = true;
  $("#planHoliday").focus({ preventScroll: true });
}

function updateButton() {
  const button = $("#planHoliday");
  if (button)
    button.innerHTML = `${food("party-popper", "fi-sm", { lazy: false })}${currentPlan() ? "Відкрити свято" : "Планувати свято"}`;
}

function savePlan() {
  const plan = currentPlan();
  if (!plan) return;
  syncToShopping(plan);
  personalChanged();
}

function handleClick(event) {
  const button = event.target.closest("[data-ha]");
  if (!button) return;
  const plan = currentPlan();
  const dishId = button.closest("[data-hid]")?.dataset.hid;
  const action = button.dataset.ha;
  if (!plan) return;
  if (action === "serving") {
    const dish = plan.recipes.find((item) => item.id === dishId);
    if (!dish) return;
    dish.servings = Math.max(
      1,
      Math.min(50, dish.servings + Number(button.dataset.delta)),
    );
  } else if (action === "ready" || action === "ready-custom") {
    const dishes = action === "ready" ? plan.recipes : plan.custom;
    const dish = dishes.find((item) => item.id === dishId);
    if (!dish) return;
    dish.ready = button.checked;
  } else if (action === "remove-dish") {
    plan.recipes = plan.recipes.filter((item) => item.id !== dishId);
  } else if (action === "remove-custom") {
    plan.custom = plan.custom.filter((item) => item.id !== dishId);
  } else if (action === "check-ingredient") {
    const key = button.dataset.key;
    const checked = new Set(plan.checked);
    if (checked.has(key)) checked.delete(key);
    else checked.add(key);
    plan.checked = [...checked];
    const shopChecked = new Set(data.personal.shop.checked);
    if (checked.has(key)) shopChecked.add(key);
    else shopChecked.delete(key);
    data.personal.shop.checked = [...shopChecked];
    const planExtras = new Set(plan.shopping?.extras || []);
    data.personal.shop.extra = data.personal.shop.extra.map((item) =>
      planExtras.has(item.id) && norm(item.text) === key
        ? { ...item, done: checked.has(key) }
        : item,
    );
  } else if (action === "shopping") {
    savePlan();
    openShop();
    return;
  } else if (action === "archive") {
    if (
      !confirmTwice(
        button,
        "Натисніть ще раз, щоб завершити свято",
        "Завершити свято",
      )
    )
      return;
    data.personal.celebration.archive = [
      { ...plan, archivedAt: Date.now() },
      ...data.personal.celebration.archive,
    ].slice(0, 20);
    data.personal.celebration.current = null;
    personalChanged();
    toast("Свято перенесено в архів");
    render();
    return;
  } else {
    return;
  }
  savePlan();
}

function handleSubmit(event) {
  if (event.target.id === "holidayCreate") {
    event.preventDefault();
    const title = $("#holidayName").value.trim();
    if (!title) return;
    data.personal.celebration.current = {
      id: makeId("holiday"),
      title,
      date: $("#holidayDate").value,
      recipes: [],
      custom: [],
      checked: [],
    };
    savePlan();
    render();
    $("#holidayRecipe")?.focus({ preventScroll: true });
  } else if (event.target.id === "holidayAddRecipe") {
    event.preventDefault();
    const id = $("#holidayRecipe").value;
    const recipe = findRecipe(id);
    if (!recipe) return;
    const plan = currentPlan();
    const servings = Math.max(
      1,
      Math.min(50, Number($("#holidayServings").value) || recipe.servings || 1),
    );
    const existing = plan.recipes.find((dish) => dish.id === id);
    if (existing) {
      existing.servings = servings;
      existing.ready = false;
    } else plan.recipes.push({ id, servings, ready: false });
    savePlan();
    render();
  } else if (event.target.id === "holidayAddCustom") {
    event.preventDefault();
    const name = $("#holidayCustomName").value.trim();
    if (!name) return;
    const plan = currentPlan();
    plan.custom.push({
      id: makeId("dish"),
      name,
      servings: Math.max(
        1,
        Math.min(50, Number($("#holidayCustomServings").value) || 1),
      ),
      ready: false,
      ingredients: $("#holidayCustomIngredients")
        .value.split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    });
    savePlan();
    render();
  }
}

function handleChange(event) {
  const field = event.target.dataset.hfield;
  if (!field) return;
  const plan = currentPlan();
  if (!plan) return;
  if (field === "title") {
    plan.title = event.target.value.trim() || "Святкове меню";
  } else if (field === "date") {
    plan.date = event.target.value;
  }
  savePlan();
  $("#holidayTitle").textContent = plan.title;
  updateButton();
}

export function renderCelebrationIfOpen() {
  render();
}

export function updateCelebrationButton() {
  updateButton();
}

export function initCelebration() {
  $("#planHoliday").addEventListener("click", openCelebration);
  $("#holidayBack").addEventListener("click", popOverlay);
  $("#holidayBackdrop").addEventListener("click", popOverlay);
  $("#holidayBody").addEventListener("click", handleClick);
  $("#holidayBody").addEventListener("submit", handleSubmit);
  $("#holidayBody").addEventListener("change", handleChange);
  updateButton();
}
