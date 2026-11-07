/**
 * Дії, що змінюють дані: звертаються до API, оновлюють стан і перемальовують сторінку.
 * Помилки API прокидаються далі — їх показує той, хто викликав дію.
 *
 * Робота без інтернету:
 *  - після кожного завантаження дані зберігаються в localStorage (знімок),
 *    і без зв’язку книга відкривається з нього;
 *  - особисті зміни (обране, продукти вдома, список покупок) без зв’язку
 *    зберігаються локально й відправляються, щойно з’явиться інтернет.
 */
import { api, ApiError, errorText } from "./services/api.js";
import { data, emptyPersonal, ui, normPersonal } from "./state.js";
import { toast } from "./lib/dom.js";
import { mergePersonal } from "./lib/personal-merge.js";
import { rerender } from "./ui/app.js";

const SNAPSHOT_KEY = "recipe-book:snapshot:v1";
const PENDING_KEY = "recipe-book:pending-personal:v1";

const readLS = (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
const writeLS = (key, value) => { try { value === null ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(value)); } catch { /* немає місця */ } };
const clone = (value) => JSON.parse(JSON.stringify(value));

function applyShared(shared) {
  data.userRecipes = shared.recipes || [];
  data.edits = shared.edits || {};
  data.photos = shared.photos || {};
  data.cooked = shared.cooked || {};
  data.ratings = shared.ratings || {};
}

function saveSnapshot() {
  writeLS(SNAPSHOT_KEY, {
    at: Date.now(),
    shared: { recipes: data.userRecipes, edits: data.edits, photos: data.photos, cooked: data.cooked, ratings: data.ratings },
    personal: data.personal,
  });
}

let personalRevision = 0;
let syncedPersonal = clone(data.personal);
const pendingState = (pending) => {
  if (!pending || typeof pending !== "object") return null;
  return Object.hasOwn(pending, "state")
    ? pending
    : { state: pending, base: readLS(SNAPSHOT_KEY)?.personal || emptyPersonal(), revision: personalRevision };
};

/** Завантажує все з сервера; без зв’язку — з останнього знімка. */
export async function loadAll() {
  try {
    const [shared, personal] = await Promise.all([api.loadShared(), api.loadPersonal()]);
    applyShared(shared);
    const remote = normPersonal(personal.state);
    personalRevision = personal.revision || 0;
    syncedPersonal = clone(remote);
    const pending = pendingState(readLS(PENDING_KEY));
    if (pending) {
      const local = normPersonal(pending.state);
      data.personal = mergePersonal(normPersonal(pending.base || remote), local, remote);
      writeLS(PENDING_KEY, { state: data.personal, base: remote, revision: personalRevision });
      flushPersonal();
    } else if (!personalDirty()) data.personal = remote;
    data.offline = false;
    data.loaded = true;
    saveSnapshot();
  } catch (err) {
    const snap = err instanceof ApiError && err.code === "network" ? readLS(SNAPSHOT_KEY) : null;
    if (!snap) throw err;
    applyShared(snap.shared || {});
    data.personal = normPersonal(readLS(PENDING_KEY) || snap.personal);
    data.offline = true;
    data.loaded = true;
  }
  rerender();
}

/** Для дій, яким потрібен сервер: зрозуміла помилка без зв’язку. */
function online() {
  if (!navigator.onLine) throw new ApiError(0, "offline");
}

/* ---------- страви ---------- */

export async function createRecipe(fields, photo) {
  online();
  const { recipe } = await api.createRecipe(fields);
  data.userRecipes = [...data.userRecipes, recipe];
  if (photo) await setPhoto(recipe.id, photo);
  saveSnapshot();
  rerender();
  return recipe.id;
}

/** photoMode: keep — не чіпати, new — замінити, none — прибрати. */
export async function updateRecipe(recipe, fields, photoMode, photo) {
  online();
  if (recipe.builtin) {
    const { edit } = await api.saveEdit(recipe.id, fields);
    data.edits = { ...data.edits, [recipe.id]: edit };
  } else {
    const { recipe: saved } = await api.updateRecipe(recipe.id, fields);
    data.userRecipes = data.userRecipes.map((x) => (x.id === recipe.id ? saved : x));
  }
  if (photoMode === "new" && photo) await setPhoto(recipe.id, photo);
  else if (photoMode === "none" && data.photos[recipe.id]) await removePhoto(recipe.id);
  ui.serv.delete(recipe.id);
  saveSnapshot();
  rerender();
}

export async function deleteRecipe(id) {
  online();
  await api.deleteRecipe(id);
  data.userRecipes = data.userRecipes.filter((x) => x.id !== id);
  const photos = { ...data.photos };
  delete photos[id];
  data.photos = photos;
  if (ui.openId === id) ui.openId = null;
  ui.serv.delete(id);
  saveSnapshot();
  rerender();
}

export async function revertRecipe(id) {
  online();
  await api.deleteEdit(id);
  const edits = { ...data.edits };
  delete edits[id];
  data.edits = edits;
  ui.serv.delete(id);
  saveSnapshot();
  rerender();
}

/* ---------- фото ---------- */

/** photo: { image, thumb } — data URL повного й зменшеного фото (див. lib/image.js). */
export async function setPhoto(id, photo) {
  online();
  const { photo: saved } = await api.uploadPhoto(id, photo);
  data.photos = { ...data.photos, [id]: saved };
  saveSnapshot();
  rerender();
}

export async function removePhoto(id) {
  online();
  await api.deletePhoto(id);
  const photos = { ...data.photos };
  delete photos[id];
  data.photos = photos;
  saveSnapshot();
  rerender();
}

/* ---------- спільне: «приготували» й оцінки ---------- */

export async function markCooked(id) {
  online();
  const { cooked } = await api.markCooked(id);
  data.cooked = { ...data.cooked, [id]: cooked };
  saveSnapshot();
  rerender();
}

export async function unmarkCooked(id) {
  online();
  const { cooked } = await api.unmarkCooked(id);
  const all = { ...data.cooked };
  if (cooked.length) all[id] = cooked; else delete all[id];
  data.cooked = all;
  saveSnapshot();
  rerender();
}

export async function rate(id, stars) {
  online();
  const { rating } = await api.rate(id, stars);
  const all = { ...data.ratings };
  if (Object.keys(rating).length) all[id] = rating; else delete all[id];
  data.ratings = all;
  saveSnapshot();
  rerender();
}

/* ---------- особисте: обране, продукти вдома, покупки ---------- */

let saveTimer = null;
let saving = false;
let saveAgain = false;

const personalDirty = () => Boolean(saveTimer || saving || readLS(PENDING_KEY));

/** Викликайте після зміни data.personal: перемалює сторінку й збереже з невеликою затримкою. */
export function personalChanged() {
  writeLS(PENDING_KEY, { state: data.personal, base: syncedPersonal || data.personal, revision: personalRevision });
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushPersonal, 500);
  rerender();
}

async function flushPersonal(opts) {
  clearTimeout(saveTimer);
  saveTimer = null;
  if (saving) { saveAgain = true; return; }
  saving = true;
  const pending = pendingState(readLS(PENDING_KEY));
  const candidate = clone(data.personal);
  const base = clone(pending?.base || syncedPersonal || candidate);
  try {
    const result = await api.savePersonal(candidate, personalRevision, opts);
    personalRevision = result.revision;
    syncedPersonal = clone(candidate);
    if (JSON.stringify(data.personal) === JSON.stringify(candidate)) {
      writeLS(PENDING_KEY, null);
      saveSnapshot();
    } else {
      writeLS(PENDING_KEY, { state: data.personal, base: candidate, revision: personalRevision });
      saveAgain = true;
    }
  } catch (err) {
    if (err instanceof ApiError && err.code === "revision_conflict") {
      const remote = normPersonal(err.payload.state);
      const merged = mergePersonal(base, candidate, remote);
      data.personal = mergePersonal(candidate, data.personal, merged);
      personalRevision = err.payload.revision;
      syncedPersonal = clone(remote);
      writeLS(PENDING_KEY, { state: data.personal, base: remote, revision: personalRevision });
      saveAgain = true;
      rerender();
    }
    if (!(err instanceof ApiError && ["network", "revision_conflict"].includes(err.code))) toast(errorText(err));
  } finally {
    saving = false;
  }
  if (saveAgain) {
    saveAgain = false;
    saveTimer = setTimeout(flushPersonal, 0);
  }
}

/** Зберегти негайно (наприклад, коли застосунок згортають). */
export function flushPersonalNow() {
  if (saveTimer || readLS(PENDING_KEY)) flushPersonal({ keepalive: true });
}

/** З’явився інтернет: відправити відкладене й оновити дані. */
export async function syncWhenOnline() {
  if (readLS(PENDING_KEY)) await flushPersonal();
  await loadAll();
}
