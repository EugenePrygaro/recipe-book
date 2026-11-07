/** Форма додавання й редагування страви. */
import { TAGS, UNITS, NO_CATEGORY, RECIPE_ICONS, DEFAULT_ICON } from "../config.js";
import { icon, food } from "../lib/icons.js";
import { $, $$, esc, toast, scrollBehavior } from "../lib/dom.js";
import { loadImage, preparePhoto } from "../lib/image.js";
import { ui, photoSrc, categories } from "../state.js";
import { createRecipe, updateRecipe } from "../actions.js";
import { errorText } from "../services/api.js";
import { isMobile } from "./media.js";
import { pushOverlay, popOverlay, hasOverlay, openSheet } from "./overlays.js";
import { focusCard } from "./list.js";
import { rerender } from "./app.js";

const panel = () => $("#addPanel");

let editing = null;      // страва, яку редагуємо, або null
let newPhoto = null;     // нове фото: { image, thumb }
let photoMode = "keep";  // keep | new | none
let afterClose = null;
const CUSTOM_CATEGORY = "__custom_category__";

function setCategoryField(category = "") {
  const select = $("#fCatSelect");
  const names = categories().map(([name]) => name).filter((name) => name !== NO_CATEGORY);
  select.innerHTML = [
    '<option value="">Оберіть категорію</option>',
    ...names.map((name) => `<option value="${esc(name)}">${esc(name)}</option>`),
    `<option value="${esc(NO_CATEGORY)}">${esc(NO_CATEGORY)}</option>`,
    '<option value="__custom_category__">Інша категорія…</option>',
  ].join("");

  const isCustom = Boolean(category && category !== NO_CATEGORY && !names.includes(category));
  select.value = isCustom ? CUSTOM_CATEGORY : category;
  $("#fCat").value = isCustom ? category : "";
  $("#customCatField").hidden = !isCustom;
}

/* ---------- рядки інгредієнтів ---------- */

function addIngRow(v = {}) {
  const unit = v.unit ?? (v.name ? "" : "г");
  const units = UNITS.includes(unit) ? UNITS : [...UNITS.slice(0, -1), unit, ""];
  const row = document.createElement("div");
  row.className = "ing-row";
  row.innerHTML = `
    <input type="text" class="in-name" placeholder="Інгредієнт" aria-label="Назва інгредієнта" value="${esc(v.name || "")}">
    <input type="number" class="in-amt" placeholder="Кількість" aria-label="Кількість" min="0" step="any" inputmode="decimal" value="${v.amount ?? ""}">
    <select class="in-unit" aria-label="Одиниця">${units.map((u) => `<option value="${esc(u)}"${unit === u ? " selected" : ""}>${esc(u) || "—"}</option>`).join("")}</select>
    <button type="button" class="icon-btn" aria-label="Прибрати інгредієнт">${icon("x")}</button>`;
  row.querySelector(".icon-btn").addEventListener("click", () => {
    row.remove();
    if (!$("#ingRows").children.length) addIngRow();
  });
  $("#ingRows").appendChild(row);
  return row;
}

/* ---------- фото ---------- */

function showPreview(src) {
  $("#photoPreview").src = src;
  $("#photoPreview").hidden = false;
  $("#photoHint").hidden = true;
  $("#photoClear").hidden = false;
}

function clearPhoto() {
  newPhoto = null;
  photoMode = "keep";
  $("#photoPreview").hidden = true;
  $("#photoPreview").removeAttribute("src");
  $("#photoHint").hidden = false;
  $("#photoClear").hidden = true;
  $("#photoNote").textContent = "";
}

/* ---------- іконка страви ---------- */

function setIcon(name) {
  const input = $(`#iconPick input[value="${name}"]`) || $(`#iconPick input[value="${DEFAULT_ICON}"]`);
  if (input) input.checked = true;
}

/* ---------- відкриття / закриття ---------- */

export function resetForm() {
  editing = null;
  $("#addForm").reset();
  setCategoryField();
  $("#fServ").value = 2;
  $("#ingRows").innerHTML = "";
  addIngRow(); addIngRow(); addIngRow();
  clearPhoto();
  $("#formErr").textContent = "";
  setIcon(DEFAULT_ICON);
  $("#addTitle").textContent = "Нова страва";
  $("#saveBtn").textContent = "Зберегти страву";
}

function openForm() {
  panel().hidden = false;
  $("#openAdd").setAttribute("aria-expanded", "true");
  if (isMobile()) {
    panel().scrollTop = 0;
    pushOverlay(editing ? "edit" : "add", hideForm);
  } else {
    panel().scrollIntoView({ block: "start", behavior: scrollBehavior() });
    setTimeout(() => $("#fTitle").focus({ preventScroll: true }), 250);
  }
}

function hideForm() {
  panel().hidden = true;
  $("#openAdd").setAttribute("aria-expanded", "false");
  resetForm();
  const cb = afterClose;
  afterClose = null;
  cb?.();
}

function closeForm() {
  if (hasOverlay(hideForm)) { popOverlay(); return; }
  const back = editing?.id;
  hideForm();
  if (back) focusCard(back, "start");
  else $("#openAdd").focus();
}

export function openNewForm() {
  resetForm();
  openForm();
}

export function openEditor(r) {
  resetForm();
  editing = r;
  $("#addTitle").textContent = `Редагування: ${r.title}`;
  $("#saveBtn").textContent = "Зберегти зміни";
  $("#fTitle").value = r.title || "";
  $("#fServ").value = r.servings || 2;
  setCategoryField(r.category || "");
  $("#fKcal").value = r.kcal || "";
  $("#fProt").value = r.prot ?? "";
  $("#fFat").value = r.fat ?? "";
  $("#fCarb").value = r.carb ?? "";
  $("#fDesc").value = r.description || "";
  $$("#tagPick input").forEach((i) => { i.checked = (r.tags || []).includes(i.value); });
  setIcon(r.icon || DEFAULT_ICON);
  $("#ingRows").innerHTML = "";
  (r.ingredients || []).forEach((i) => addIngRow(i));
  if (!(r.ingredients || []).length) addIngRow();
  $("#fSteps").value = (r.steps || []).join("\n");
  const src = photoSrc(r);
  if (src) showPreview(src);
  openForm();
}

/* ---------- збереження ---------- */

function readForm() {
  const intOrNull = (v, min = 1) => { const n = parseInt(v, 10); return n >= min ? n : null; };
  const ingredients = $$("#ingRows .ing-row").map((row) => {
    const name = row.querySelector(".in-name").value.trim();
    const raw = row.querySelector(".in-amt").value.trim().replace(",", ".");
    const amount = raw === "" ? null : Number(raw);
    const ok = amount !== null && amount > 0;
    return { name, amount: ok ? amount : null, unit: ok ? row.querySelector(".in-unit").value : "" };
  }).filter((i) => i.name);
  return {
    title: $("#fTitle").value.trim(),
    servings: Math.min(50, intOrNull($("#fServ").value) || 2),
    category: $("#fCatSelect").value === CUSTOM_CATEGORY
      ? $("#fCat").value.trim() || NO_CATEGORY
      : $("#fCatSelect").value || NO_CATEGORY,
    description: $("#fDesc").value.trim(),
    kcal: intOrNull($("#fKcal").value),
    prot: intOrNull($("#fProt").value, 0),
    fat: intOrNull($("#fFat").value, 0),
    carb: intOrNull($("#fCarb").value, 0),
    tags: $$("#tagPick input:checked").map((i) => i.value),
    icon: $("#iconPick input:checked")?.value || DEFAULT_ICON,
    ingredients,
    steps: $("#fSteps").value.split("\n").map((s) => s.replace(/^\s*\d+[.)]\s*/, "").trim()).filter(Boolean),
  };
}

async function onSubmit(e) {
  e.preventDefault();
  const err = $("#formErr");
  err.textContent = "";
  const fields = readForm();
  const fail = (msg, el) => {
    err.textContent = msg;
    el.focus();
    el.scrollIntoView({ block: "center", behavior: scrollBehavior() });
  };
  if (!fields.title) return fail("Вкажіть назву страви.", $("#fTitle"));
  if (!fields.ingredients.length) return fail("Додайте хоча б один інгредієнт.", $("#ingRows .in-name"));
  if (!fields.steps.length) return fail("Опишіть, як приготувати страву.", $("#fSteps"));

  const btn = $("#saveBtn");
  btn.disabled = true;
  btn.textContent = "Зберігаю…";
  const wasEdit = Boolean(editing);
  try {
    let id;
    if (wasEdit) {
      id = editing.id;
      await updateRecipe(editing, fields, photoMode, newPhoto);
    } else {
      id = await createRecipe(fields, newPhoto);
      Object.assign(ui, { q: "", cat: null, tag: null, fav: false });
      $("#q").value = "";
    }
    if (isMobile()) {
      if (!wasEdit) afterClose = () => openSheet(id);
      closeForm();
    } else {
      hideForm();
      ui.openId = id;
      rerender();
      focusCard(id, "start");
    }
    toast(wasEdit ? "Зміни збережено" : "Страву додано");
  } catch (ex) {
    err.textContent = errorText(ex);
  } finally {
    btn.disabled = false;
    btn.textContent = editing ? "Зберегти зміни" : "Зберегти страву";
  }
}

/* ---------- ініціалізація ---------- */

export function initForm() {
  $("#tagPick").innerHTML = Object.entries(TAGS).map(([k, t]) =>
    `<label class="tp" style="--tc:${t.bg};--tt:${t.fg}"><input type="checkbox" value="${k}"><span>${food(t.icon, "fi-xs")}${esc(t.label)}</span></label>`).join("");

  $("#iconPick").innerHTML = RECIPE_ICONS.map((name) =>
    `<label class="ip"><input type="radio" name="recipeIcon" value="${name}"><span>${food(name)}</span></label>`).join("");

  $("#fCatSelect").addEventListener("change", (event) => {
    const isCustom = event.currentTarget.value === CUSTOM_CATEGORY;
    $("#customCatField").hidden = !isCustom;
    if (isCustom) $("#fCat").focus();
  });

  $("#openAdd").addEventListener("click", () => {
    if (!panel().hidden && !editing) { closeForm(); return; }
    openNewForm();
  });
  $("#fab").addEventListener("click", openNewForm);
  $("#cancelAdd").addEventListener("click", closeForm);
  $("#closeAdd").addEventListener("click", closeForm);

  $("#addIng").addEventListener("click", () => {
    const row = addIngRow();
    row.scrollIntoView({ block: "nearest", behavior: scrollBehavior() });
    row.querySelector(".in-name").focus({ preventScroll: true });
  });

  $("#photoInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    $("#photoNote").textContent = "Готую фото…";
    try {
      newPhoto = preparePhoto(await loadImage(file));
      photoMode = "new";
      showPreview(newPhoto.thumb);
      $("#photoNote").textContent = "";
    } catch {
      $("#photoNote").textContent = "Не вдалося відкрити фото. Спробуйте JPG або PNG.";
    }
  });
  $("#photoClear").addEventListener("click", () => {
    clearPhoto();
    if (editing) photoMode = "none";
  });

  $("#addForm").addEventListener("submit", onSubmit);
  resetForm();
}
