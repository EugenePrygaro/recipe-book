/**
 * Точка входу: ініціалізація інтерфейсу й завантаження спільних даних.
 */
import { $, toast } from "./lib/dom.js";
import { ui } from "./state.js";
import { errorText } from "./services/api.js";
import { loadAll, flushPersonalNow } from "./actions.js";
import { rerender } from "./ui/app.js";
import { initOverlays, openFromHash } from "./ui/overlays.js";
import { initShop } from "./ui/shop.js";
import { initShare } from "./ui/share.js";
import { initForm } from "./ui/form.js";
import { initEvents } from "./ui/events.js";
import { initRoulette } from "./ui/roulette.js";
import { initPantry } from "./ui/pantry.js";
import { initStale } from "./ui/stale.js";
import { initSeason } from "./ui/season.js";
import { initPwa } from "./ui/pwa.js";
import { isMobile } from "./ui/media.js";
import { openSheet } from "./ui/overlays.js";
import { focusCard } from "./ui/list.js";
import { initCelebration } from "./ui/celebration.js";

initOverlays();
initShop();
initShare();
initForm();
initEvents();
initRoulette();
initPantry();
initSeason();
initPwa();
initStale({
  openRecipe(id) {
    if (isMobile()) openSheet(id);
    else { ui.openId = id; rerender(); focusCard(id, "start"); }
  },
  sortByStale() {
    ui.sort = "stale";
    $("#sortSel").value = "stale";
    rerender();
    $("#count").scrollIntoView({ behavior: "smooth", block: "start" });
  },
});
initCelebration();
rerender(); // вбудовані страви видно одразу, ще до завантаження ваших даних

async function loadBook() {
  setStatus("Завантажую книгу…");
  try {
    await loadAll();
    setStatus("");
    const id = openFromHash();
    if (id) { ui.openId = id; rerender(); focusCard(id, "start"); }
  } catch (err) {
    setStatus(errorText(err));
  }
}

function setStatus(text) {
  document.dispatchEvent(new CustomEvent("recipe-book:status", { detail: text }));
}

loadBook();

// Підтягуємо спільні зміни під час повернення та періодично.
let lastSync = 0;
const refreshIfVisible = () => {
  if (document.visibilityState !== "visible" || Date.now() - lastSync < 15_000) return;
  lastSync = Date.now();
  loadAll().catch((err) => toast(errorText(err)));
};
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    flushPersonalNow();
  } else refreshIfVisible();
});
setInterval(refreshIfVisible, 15_000);
