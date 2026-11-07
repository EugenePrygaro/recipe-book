/** «Поділитися»: системне меню на телефоні, копіювання або вікно з текстом як запасний варіант. */
import { $, toast } from "../lib/dom.js";

export async function shareText(title, text) {
  try {
    if (navigator.share) { await navigator.share({ title, text }); return; }
  } catch (err) {
    if (err?.name === "AbortError") return;
  }
  try {
    await navigator.clipboard.writeText(text);
    toast("Скопійовано, можна вставляти в месенджер");
    return;
  } catch { /* немає доступу до буфера */ }
  $("#cbText").value = text;
  $("#copyBox").hidden = false;
  setTimeout(() => { $("#cbText").focus(); $("#cbText").select(); }, 50);
}

export function initShare() {
  $("#cbClose").addEventListener("click", () => { $("#copyBox").hidden = true; });
  $("#copyBox").addEventListener("click", (e) => { if (e.target.id === "copyBox") $("#copyBox").hidden = true; });
}
