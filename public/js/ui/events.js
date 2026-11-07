/** Обробка натискань у списку й рецепті, пошук, фільтри, сортування, випадкова страва. */
import { PLACEHOLDERS } from "../config.js";
import { $, $$, toast, confirmTwice } from "../lib/dom.js";
import { loadImage, preparePhoto } from "../lib/image.js";
import { ui, data, findRecipe, isFav, cookedArr, servingsOf, myRating } from "../state.js";
import { confettiFrom } from "../lib/confetti.js";
import { personalChanged, deleteRecipe, revertRecipe, setPhoto, removePhoto, markCooked, unmarkCooked, rate } from "../actions.js";
import { errorText } from "../services/api.js";
import { isMobile } from "./media.js";
import { rerender } from "./app.js";
import { focusCard } from "./list.js";
import { updateServings, recipeText } from "./recipe.js";
import { openSheet, openSheetId, popOverlay } from "./overlays.js";
import { openEditor } from "./form.js";
import { openShop, addToShop, removeFromShop } from "./shop.js";
import { shareText } from "./share.js";

/** Позначає, що всі кроки рецепта виконано: конфеті й підказка відмітити «Приготували». */
function celebrate(r, holder, fromEl) {
  const total = (r.steps || []).length;
  const done = (r.steps || []).filter((_, i) => ui.checked.has(`${r.id}|s|${i}`)).length;
  if (!total || done !== total) return;
  confettiFrom(fromEl, { count: 60, power: 1.3 });
  toast("Усі кроки виконано! Смачного", 3200);
  const btn = holder.querySelector('[data-act="cooked"]');
  const history = cookedArr(r.id);
  const cookedRecently = history.length && Date.now() - history[history.length - 1] < 12 * 3600000;
  if (btn && !cookedRecently) {
    btn.classList.add("nudge");
    btn.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

export function setMode(mode) {
  ui.mode = mode;
  $$("[data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
  $("#q").placeholder = PLACEHOLDERS[mode];
}

function clearFilters() {
  Object.assign(ui, { q: "", cat: null, tag: null, fav: false, minRating: 0 });
  $("#q").value = "";
  setMode("all");
}

let photoTarget = null;

async function run(task, okMessage) {
  try {
    await task();
    if (okMessage) toast(okMessage);
  } catch (err) {
    toast(errorText(err));
  }
}

/** Делегований обробник для карток (#grid) і рецепта на весь екран (#rsBody). */
function handleAct(e) {
  const btn = e.target.closest("[data-act]");
  const holder = e.target.closest("[data-rid]");
  if (!btn) {
    // на телефоні вся картка відкриває рецепт
    if (holder?.classList.contains("card") && isMobile()) openSheet(holder.dataset.rid);
    return;
  }
  const act = btn.dataset.act;
  if (act === "clear") { clearFilters(); rerender(); return; }
  if (!holder) return;
  const r = findRecipe(holder.dataset.rid);
  if (!r) return;
  const personal = data.personal;

  switch (act) {
    case "toggle":
      if (isMobile()) { openSheet(r.id); return; }
      ui.openId = ui.openId === r.id ? null : r.id;
      rerender();
      focusCard(r.id);
      break;

    case "cat":
      ui.cat = r.category;
      if (openSheetId()) popOverlay();
      rerender();
      break;

    case "inc":
    case "dec":
    case "reset": {
      let s = servingsOf(r);
      s = act === "reset" ? r.servings : Math.min(50, Math.max(1, s + (act === "inc" ? 1 : -1)));
      ui.serv.set(r.id, s);
      updateServings(holder, r);
      const again = holder.querySelector(`[data-act="${act}"]`) || holder.querySelector('[data-act="inc"]');
      if (again && !again.disabled) again.focus({ preventScroll: true });
      break;
    }

    case "ing":
    case "step": {
      const key = btn.dataset.k;
      const on = !ui.checked.has(key);
      on ? ui.checked.add(key) : ui.checked.delete(key);
      btn.setAttribute("aria-pressed", String(on));
      if (act === "step") {
        btn.parentElement.classList.toggle("done", on);
        if (on) celebrate(r, holder, btn);
      }
      break;
    }

    case "fav": {
      const on = !isFav(r.id);
      personal.fav = on ? [...personal.fav, r.id] : personal.fav.filter((x) => x !== r.id);
      personalChanged();
      $$(`[data-rid="${CSS.escape(r.id)}"] .fav`).forEach((x) => x.classList.add("pop"));
      toast(on ? "Додано в обране" : "Прибрано з обраного");
      break;
    }

    case "shop": addToShop(r, servingsOf(r)); break;
    case "unshop": removeFromShop(r.id); break;
    case "openshop": openShop(); break;

    case "cooked":
      run(() => markCooked(r.id), "Записали! Смачного");
      break;

    case "uncook":
      run(() => unmarkCooked(r.id), "Останній запис скасовано");
      break;

    case "rate": {
      const stars = Number(btn.dataset.stars) === myRating(r.id) ? 0 : Number(btn.dataset.stars);
      run(() => rate(r.id, stars), stars ? `Ваша оцінка: ${stars} з 5` : "Оцінку прибрано");
      break;
    }

    case "share": shareText(r.title, recipeText(r)); break;
    case "edit": openEditor(r); break;

    case "photo":
      photoTarget = r.id;
      $("#recipePhotoInput").click();
      break;

    case "photo-rm": run(() => removePhoto(r.id), "Фото прибрано"); break;

    case "del":
      if (!confirmTwice(btn, "Натисніть ще раз, щоб видалити", "Видалити страву")) return;
      if (openSheetId() === r.id) popOverlay();
      run(() => deleteRecipe(r.id), "Страву видалено");
      break;

    case "revert":
      if (!confirmTwice(btn, "Натисніть ще раз: зміни зникнуть", "Повернути оригінал")) return;
      run(() => revertRecipe(r.id), "Повернуто оригінальний рецепт");
      break;
  }
}

function onChip(e) {
  const b = e.target.closest(".chip");
  if (!b) return;
  if ("favf" in b.dataset) ui.fav = !ui.fav;
  if ("minr" in b.dataset) ui.minRating = ui.minRating ? 0 : Number(b.dataset.minr);
  if ("cat" in b.dataset) ui.cat = b.dataset.cat || null;
  if (b.dataset.tag) ui.tag = ui.tag === b.dataset.tag ? null : b.dataset.tag;
  rerender();
}

export function initEvents() {
  $("#grid").addEventListener("click", handleAct);
  $("#rsBody").addEventListener("click", handleAct);

  let qTimer;
  $("#q").addEventListener("input", (e) => {
    clearTimeout(qTimer);
    qTimer = setTimeout(() => { ui.q = e.target.value; rerender(); }, 120);
  });
  $("#q").addEventListener("keydown", (e) => { if (e.key === "Enter") e.target.blur(); });

  $$(".seg").forEach((seg) => seg.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-mode]");
    if (!b) return;
    setMode(b.dataset.mode);
    rerender();
  }));

  ["#chips", "#chips2", "#mCats", "#mTags"].forEach((s) => $(s).addEventListener("click", onChip));

  $("#activeF").addEventListener("click", (e) => {
    const b = e.target.closest("[data-clear]");
    if (!b) return;
    const k = b.dataset.clear;
    if (k === "mode") setMode("all");
    else if (k === "fav") ui.fav = false;
    else if (k === "minRating") ui.minRating = 0;
    else ui[k] = null;
    rerender();
  });

  $("#fReset").addEventListener("click", () => {
    Object.assign(ui, { cat: null, tag: null, fav: false, minRating: 0 });
    setMode("all");
    rerender();
  });

  $("#sortSel").addEventListener("change", (e) => { ui.sort = e.target.value; rerender(); });

  $("#recipePhotoInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    const id = photoTarget;
    photoTarget = null;
    if (!file || !id) return;
    toast("Зберігаю фото…");
    try {
      await setPhoto(id, preparePhoto(await loadImage(file)));
      toast("Фото збережено");
    } catch (err) {
      toast(err?.code ? errorText(err) : "Не вдалося відкрити фото. Спробуйте JPG або PNG.");
    }
  });
}
