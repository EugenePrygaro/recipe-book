/**
 * Іконки з відкритих наборів, що лежать у проєкті:
 *  - icon(): інтерфейсні іконки Lucide зі спрайта /icons/ui.svg (успадковують колір тексту)
 *  - food(): кольорові іконки Fluent Emoji Flat з /icons/food/*.svg
 * Нові іконки додаються в scripts/build-assets.mjs і генеруються командою `npm run assets`.
 */

export const icon = (name, cls = "") =>
  `<svg class="ic${cls ? " " + cls : ""}" aria-hidden="true" focusable="false"><use href="/icons/ui.svg#${name}"></use></svg>`;

export const food = (name, cls = "", { lazy = true } = {}) =>
  `<img class="fi${cls ? " " + cls : ""}" src="/icons/food/${name || "fork-and-knife-with-plate"}.svg" alt="" width="32" height="32" decoding="async"${lazy ? ' loading="lazy"' : ""}>`;
