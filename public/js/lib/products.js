/**
 * Довідник продуктів для «Що приготувати з того, що є».
 * Інгредієнти рецептів називаються по-різному («Куряче філе», «Курячі гомілки», «Курка на бульйон»),
 * тому зводимо їх до спільних продуктів за ключовими словами. Порядок важливий: специфічніші — вище.
 * Інгредієнт без збігу стає окремим продуктом зі своєю назвою.
 */
import { norm } from "./dom.js";

export const GROUPS = [
  ["meat", "М’ясо й риба"],
  ["dairy", "Молочне та яйця"],
  ["veg", "Овочі, зелень, фрукти"],
  ["grain", "Крупи, макарони, хліб"],
  ["other", "Соуси та інше"],
];

const P = (name, group, icon, re) => ({ name, group, icon, re });

export const PRODUCTS = [
  P("Курка", "meat", "poultry-leg", /кур(к|я|ч)|(^|\s)філе/),
  P("Свинина", "meat", "cut-of-meat", /свин|ошийок/),
  P("Яловичина", "meat", "cut-of-meat", /ялович/),
  P("Баранина", "meat", "meat-on-bone", /баранин/),
  P("Фарш", "meat", "meat-on-bone", /фарш/),
  P("Бекон", "meat", "bacon", /бекон|гуанчале/),
  P("Сосиски", "meat", "hot-dog", /сосиск/),
  P("Шинка", "meat", "bacon", /шинк/),
  P("Крабові палички", "meat", "crab", /крабов/),
  P("Морепродукти", "meat", "shrimp", /морепродукт|креветк/),
  P("Риба", "meat", "fish", /(^|\s)риб|лосос|тунец/),
  P("Яйця", "dairy", "egg", /яйц|яйце|жовтк/),
  P("Вершкове масло", "dairy", "cheese-wedge", /вершкове масло/),
  P("Вершки", "dairy", "cheese-wedge", /вершки/),
  P("Молоко", "dairy", "cheese-wedge", /молок/),
  P("Сметана", "dairy", "cheese-wedge", /сметан/),
  P("Кисломолочний сир", "dairy", "cheese-wedge", /кисломолочн/),
  P("Плавлений сир", "dairy", "cheese-wedge", /плавлен/),
  P("Твердий сир", "dairy", "cheese-wedge", /твердий сир|пармезан|сулугуні|^сир/),
  P("Майонез", "other", "sandwich", /майонез/),
  P("Морква по-корейськи", "veg", "carrot", /по-корейськи/),
  P("Картопля", "veg", "potato", /картопл/),
  P("Цибуля", "veg", "leafy-green", /цибул/),
  P("Морква", "veg", "carrot", /морк/),
  P("Часник", "veg", "leafy-green", /часник/),
  P("Помідори", "veg", "green-salad", /помідор|томати у власному|черрі/),
  P("Перець болгарський", "veg", "hot-pepper", /болгарськ/),
  P("Огірки", "veg", "green-salad", /огір/),
  P("Гриби", "veg", "brown-mushroom", /гриб|печериц/),
  P("Кабачок", "veg", "green-salad", /кабач/),
  P("Стручкова квасоля", "veg", "green-salad", /стручков/),
  P("Салат", "veg", "green-salad", /салат/),
  P("Селера", "veg", "leafy-green", /селер/),
  P("Зелень", "veg", "leafy-green", /зелень|петрушк|кінз/),
  P("Лимон", "veg", "leafy-green", /лимон/),
  P("Імбир", "veg", "leafy-green", /імбир/),
  P("Макарони", "grain", "spaghetti", /макарон|спагеті/),
  P("Локшина", "grain", "steaming-bowl", /локшин|удон/),
  P("Фунчоза", "grain", "steaming-bowl", /фунчоз/),
  P("Рис", "grain", "cooked-rice", /(^|\s)рис/),
  P("Гречка", "grain", "pot-of-food", /гречк/),
  P("Булгур", "grain", "sheaf-of-rice", /булгур/),
  P("Борошно", "grain", "sheaf-of-rice", /борошн/),
  P("Хліб", "grain", "sandwich", /хліб|батон|тост/),
  P("Сухарі", "grain", "sandwich", /сухар/),
  P("Крохмаль", "grain", "sheaf-of-rice", /крохмал/),
  P("Томатна паста", "other", "hot-pepper", /томатна паста/),
  P("Кетчуп", "other", "hot-pepper", /кетчуп/),
  P("Соєвий соус", "other", "bowl-with-spoon", /соєв/),
  P("Соус теріякі", "other", "bowl-with-spoon", /теріякі/),
  P("Соус унагі", "other", "bowl-with-spoon", /унагі/),
  P("Кисло-солодкий соус", "other", "bowl-with-spoon", /кисло-солодк/),
  P("Устричний соус", "other", "bowl-with-spoon", /устричн/),
  P("Кунжутна олія", "other", "bowl-with-spoon", /кунжутна олія/),
  P("Кунжут", "other", "sheaf-of-rice", /кунжут/),
  P("Мед", "other", "bowl-with-spoon", /(^|\s)мед/),
  P("Гірчиця", "other", "bowl-with-spoon", /гірчиц/),
  P("Вино", "other", "bowl-with-spoon", /(^|\s)вин/),
  P("Бульйонний кубик", "other", "pot-of-food", /кубик/),
];

/** Сіль, олія, вода й спеції — вважаємо, що вони є вдома завжди. */
const STAPLE = /^(сіль|перець(,|$)|чорний перець|вода|олія|цукор|лавровий лист|паприка|зира|хмелі-сунелі|орегано|прованські трави|мускатний горіх|коріандр|карі|куркума|барбарис|перець горошком|червоний мелений перець)/;
/** Необов’язкові інгредієнти не рахуються як «бракує». */
const OPTIONAL = /за бажанням|до подачі|якщо є|інші овочі/;

const clean = (name) => norm(String(name).replace(/\s*\([^)]*\)/g, ""));

/**
 * Що потрібно для страви: список потреб, кожна — набір альтернатив (вистачає будь-якої).
 * «Свинина або баранина» → одна потреба з двома варіантами.
 */
export function recipeNeeds(recipe) {
  const needs = new Map();
  for (const ing of recipe.ingredients || []) {
    const raw = norm(ing.name);
    if (STAPLE.test(raw) || OPTIONAL.test(raw)) continue;
    const name = clean(ing.name);
    const isChoice = /\sабо\s|,/.test(name);
    const matched = PRODUCTS.filter((p) => p.re.test(name)).map((p) => p.name);
    let alts = isChoice ? matched : matched.slice(0, 1);
    if (!alts.length) alts = [ing.name.replace(/\s*\([^)]*\)/g, "").trim()];
    const key = [...alts].sort().join("|");
    if (!needs.has(key)) needs.set(key, { alts, label: ing.name });
  }
  return [...needs.values()];
}

/** Усі продукти, що зустрічаються в стравах, з групою й іконкою. */
export function productCatalog(recipes) {
  const byName = new Map(PRODUCTS.map((p) => [p.name, p]));
  const found = new Map();
  for (const r of recipes) {
    for (const need of recipeNeeds(r)) {
      for (const name of need.alts) {
        if (!found.has(name)) found.set(name, byName.get(name) || { name, group: "other", icon: "fork-and-knife-with-plate" });
      }
    }
  }
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name, "uk"));
}

/** Що є і чого бракує для страви з урахуванням продуктів удома. */
export function analyze(recipe, have) {
  const needs = recipeNeeds(recipe);
  const missing = needs.filter((n) => !n.alts.some((a) => have.has(a)));
  return { total: needs.length, haveCount: needs.length - missing.length, missing };
}
