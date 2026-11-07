/**
 * Константи інтерфейсу: позначки, категорії, одиниці, кольори.
 * Ключі TAGS мають збігатися з TAG_KEYS у lib/validate.js на сервері.
 * Назви іконок — файли з public/icons/food/ (див. scripts/build-assets.mjs).
 */

export const TAGS = {
  quick: { label: "На швидку руку", icon: "high-voltage", bg: "#F2B81F", fg: "#2A1E00" },
  everyday: { label: "На кожен день", icon: "house", bg: "#2E7D4F", fg: "#FFFFFF" },
  holiday: { label: "На свято", icon: "party-popper", bg: "#B4234A", fg: "#FFFFFF" },
  spicy: { label: "Гостре", icon: "hot-pepper", bg: "#D9481F", fg: "#FFFFFF" },
};

export const MODES = { all: "Усюди", name: "Назва", cat: "Категорія", ing: "Інгредієнт" };

export const PLACEHOLDERS = {
  all: "Пошук: курка, паста, гриби…",
  name: "Назва страви…",
  cat: "Категорія: супи, салати…",
  ing: "Інгредієнт: курка, сир…",
};

export const NO_CATEGORY = "Без категорії";
export const DEFAULT_ICON = "fork-and-knife-with-plate";

export const CAT_ICONS = {
  "Паста": "spaghetti", "Супи": "pot-of-food", "Салати": "green-salad", "Курка": "poultry-leg",
  "М’ясо": "cut-of-meat", "Гарніри": "cooked-rice", "Закуски": "dumpling", "Локшина": "steaming-bowl",
  "Сніданки": "cooking",
};

/** Іконки, з яких можна вибрати у формі страви. */
export const RECIPE_ICONS = [
  "fork-and-knife-with-plate", "spaghetti", "steaming-bowl", "pot-of-food", "bowl-with-spoon",
  "shallow-pan-of-food", "curry-rice", "cooked-rice", "green-salad", "poultry-leg", "meat-on-bone",
  "cut-of-meat", "bacon", "hot-dog", "sandwich", "hamburger", "pizza", "taco", "stuffed-flatbread",
  "dumpling", "cooking", "pancakes", "waffle", "potato", "brown-mushroom", "cheese-wedge", "shrimp",
  "crab", "fish", "sushi", "hot-pepper", "sheaf-of-rice", "croissant", "pie", "cookie", "doughnut", "shortcake",
];

/** Кольори «скатертини» на картках без фото, підбираються за назвою категорії. */
export const PALETTE = ["#1B6A3C", "#2E8A57", "#4BA35A", "#3C7D5A", "#5E8A1E", "#2C7A6B", "#7BAF3E", "#1F5F4A"];

/** Одиниці у формі. Порожній рядок — без одиниці. */
export const UNITS = ["г", "кг", "мл", "л", "шт", "ст. л.", "ч. л.", "зубч.", "пучок", "уп.", "банка", ""];
/** Округлюються до ½ */
export const HALF_UNITS = new Set(["шт", "зубч.", "пучок", "уп.", "банка", "головка", "скибка", "стебло", "качан"]);
/** Округлюються до ¼ */
export const QUARTER_UNITS = new Set(["ст. л.", "ч. л."]);

export const MOBILE_QUERY = "(max-width: 700px)";
