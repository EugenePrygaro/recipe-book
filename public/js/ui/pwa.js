/**
 * Застосунок на головному екрані й робота без інтернету:
 *  - реєстрація service worker (лише в зібраній версії);
 *  - кнопка «Встановити на телефон» (Android/Chrome) або підказка для iPhone;
 *  - смужка «Без інтернету» і синхронізація, щойно зв’язок повернувся.
 */
import { $, toast } from "../lib/dom.js";
import { data } from "../state.js";
import { syncWhenOnline } from "../actions.js";
import { errorText } from "../services/api.js";

let installEvent = null;

const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

export function updateOfflineBar() {
  $("#offlineBar").hidden = navigator.onLine && !data.offline;
}

export function initPwa() {
  // window.__PROD__ підставляє збірка; у режимі розробки SW не потрібен
  if (window.__PROD__ && "serviceWorker" in navigator) {
    addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => { /* реєстрація може бути недоступна */ }));
  }

  const btn = $("#installBtn");
  addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installEvent = e;
    btn.hidden = false;
  });
  if (isIOS() && !standalone()) btn.hidden = false;
  btn.addEventListener("click", async () => {
    if (installEvent) {
      installEvent.prompt();
      await installEvent.userChoice.catch(() => null);
      installEvent = null;
      btn.hidden = true;
    } else if (isIOS()) {
      toast("У Safari натисніть «Поділитися», потім «На початковий екран»", 6000);
    }
  });
  addEventListener("appinstalled", () => { btn.hidden = true; toast("Книгу встановлено на головний екран"); });

  addEventListener("offline", updateOfflineBar);
  addEventListener("online", async () => {
    updateOfflineBar();
    try { await syncWhenOnline(); toast("Зв’язок є, дані оновлено"); }
    catch (err) { toast(errorText(err)); }
    updateOfflineBar();
  });
  updateOfflineBar();
}
