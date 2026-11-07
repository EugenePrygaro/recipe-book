/**
 * Генерує іконки й шрифти з відкритих npm-пакетів у public/:
 *   public/icons/ui.svg         спрайт інтерфейсних іконок Lucide (ISC)
 *   public/icons/food/*.svg     кольорові іконки Microsoft Fluent Emoji Flat (MIT)
 *   public/fonts/*.woff2        шрифти Onest і Unbounded (SIL OFL 1.1), лише кирилиця й латиниця
 *   public/css/fonts.css        @font-face для них
 *
 * Результат зберігається в репозиторії, тож на Vercel цей скрипт не запускається.
 * Запускайте `npm run assets`, коли додаєте нову іконку (і допишіть її в списки нижче).
 */
import { readFile, writeFile, mkdir, copyFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mod = (p) => path.join(root, "node_modules", p);
const out = (p) => path.join(root, "public", p);

/** Інтерфейсні іконки (Lucide). Використання: icon("heart") у public/js/lib/icons.js */
export const UI_ICONS = [
  "search", "sliders-horizontal", "shopping-cart", "plus", "minus", "chevron-down", "chevron-left", "x",
  "heart", "clock", "pencil", "share-2", "camera", "trash-2", "rotate-ccw", "check", "arrow-up-down",
  "log-out", "external-link", "utensils", "sparkles", "star", "wifi-off", "download", "refrigerator", "hourglass",
];

/** Кольорові іконки страв, категорій і позначок (Fluent Emoji Flat). */
export const FOOD_ICONS = [
  // страви (доступні у формі)
  "spaghetti", "steaming-bowl", "pot-of-food", "bowl-with-spoon", "shallow-pan-of-food", "curry-rice",
  "cooked-rice", "green-salad", "poultry-leg", "meat-on-bone", "cut-of-meat", "bacon", "hot-dog",
  "sandwich", "hamburger", "pizza", "taco", "stuffed-flatbread", "dumpling", "cooking", "pancakes",
  "waffle", "potato", "brown-mushroom", "cheese-wedge", "shrimp", "crab", "fish", "sushi", "hot-pepper",
  "sheaf-of-rice", "croissant", "pie", "cookie", "doughnut", "shortcake", "fork-and-knife-with-plate",
  // інтерфейс
  "high-voltage", "house", "party-popper", "red-heart", "fire", "check-mark-button", "shopping-cart",
  "basket", "slot-machine", "sparkles", "star", "leafy-green", "carrot", "egg", "hourglass-not-done", "glowing-star",
  // святкове оформлення
  "christmas-tree", "wrapped-gift", "snowflake", "heart-with-ribbon", "sparkling-heart", "rose",
  "cherry-blossom", "tulip", "hatching-chick", "nest-with-eggs",
];

const FONTS = [
  { pkg: "@fontsource-variable/onest", family: "Onest", file: "onest" },
  { pkg: "@fontsource-variable/unbounded", family: "Unbounded", file: "unbounded" },
];
const SUBSETS = ["cyrillic", "latin"];

/** Іконка з набору Iconify з урахуванням псевдонімів (aliases). */
function pick(set, name) {
  let n = name;
  for (let i = 0; i < 5 && !set.icons[n] && set.aliases?.[n]; i++) n = set.aliases[n].parent;
  return set.icons[n];
}

async function icons() {
  const lucide = JSON.parse(await readFile(mod("@iconify-json/lucide/icons.json"), "utf8"));
  const fluent = JSON.parse(await readFile(mod("@iconify-json/fluent-emoji-flat/icons.json"), "utf8"));

  const symbols = UI_ICONS.map((name) => {
    const icon = pick(lucide, name);
    if (!icon) throw new Error(`Lucide: немає іконки ${name}`);
    const w = icon.width || lucide.width || 24;
    const h = icon.height || lucide.height || 24;
    // fill="none" прибираємо, щоб заливку можна було вмикати з CSS (.ic { fill: … }), наприклад для сердечка
    return `<symbol id="${name}" viewBox="0 0 ${w} ${h}">${icon.body.replace(/ fill="none"/g, "")}</symbol>`;
  });
  await mkdir(out("icons/food"), { recursive: true });
  await writeFile(out("icons/ui.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg"><!-- Lucide Icons, ISC License, https://lucide.dev -->${symbols.join("")}</svg>\n`);

  await rm(out("icons/food"), { recursive: true, force: true });
  await mkdir(out("icons/food"), { recursive: true });
  for (const name of new Set(FOOD_ICONS)) {
    const icon = pick(fluent, name);
    if (!icon) throw new Error(`Fluent Emoji: немає іконки ${name}`);
    const w = icon.width || fluent.width || 32;
    const h = icon.height || fluent.height || 32;
    const body = icon.body.replace(/id="([^"]+)"/g, `id="${name}-$1"`).replace(/url\(#([^)]+)\)/g, `url(#${name}-$1)`);
    await writeFile(out(`icons/food/${name}.svg`),
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${body}</svg>\n`);
  }
  console.log(`Іконки: ${UI_ICONS.length} інтерфейсних, ${new Set(FOOD_ICONS).size} кольорових`);
}

async function fonts() {
  await mkdir(out("fonts"), { recursive: true });
  let css = "/* Шрифти Onest і Unbounded (SIL Open Font License 1.1), змінна товщина.\n   Згенеровано scripts/build-assets.mjs з пакетів @fontsource-variable. */\n";
  for (const f of FONTS) {
    const index = await readFile(mod(`${f.pkg}/index.css`), "utf8");
    for (const subset of SUBSETS) {
      const block = index.split("@font-face").find((b) => b.includes(`-${subset}-wght-normal.woff2`));
      const range = /unicode-range:\s*([^;]+);/.exec(block)[1];
      const weight = /font-weight:\s*([^;]+);/.exec(block)[1];
      const name = `${f.file}-${subset}.woff2`;
      await copyFile(mod(`${f.pkg}/files/${f.file}-${subset}-wght-normal.woff2`), out(`fonts/${name}`));
      css += `@font-face{font-family:"${f.family}";font-style:normal;font-display:swap;font-weight:${weight};src:url(/fonts/${name}) format("woff2");unicode-range:${range};}\n`;
    }
  }
  await writeFile(out("css/fonts.css"), css);
  console.log("Шрифти: Onest, Unbounded (кирилиця й латиниця)");
}

await icons();
await fonts();
