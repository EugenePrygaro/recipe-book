/**
 * Єдина точка перемальовування. Будь-яка зміна стану закінчується rerender().
 */
import { renderList } from "./list.js";
import { renderSheetIfOpen } from "./overlays.js";
import { renderShopIfOpen, updateShopBadge } from "./shop.js";
import { renderPantryIfOpen } from "./pantry.js";
import { renderStale } from "./stale.js";
import { updateOfflineBar } from "./pwa.js";
import { renderCelebrationIfOpen, updateCelebrationButton } from "./celebration.js";

export function rerender() {
  renderList();
  renderStale();
  updateShopBadge();
  renderSheetIfOpen();
  renderShopIfOpen();
  renderPantryIfOpen();
  renderCelebrationIfOpen();
  updateCelebrationButton();
  updateOfflineBar();
}
