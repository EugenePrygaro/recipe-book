# Сторонні ресурси

Усі ресурси лежать у проєкті й віддаються з вашого домену, без звернень до сторонніх серверів.
Генеруються командою `npm run assets` (див. `scripts/build-assets.mjs`).

| Що | Де в проєкті | Джерело | Ліцензія |
|---|---|---|---|
| Інтерфейсні іконки | `public/icons/ui.svg` | [Lucide](https://lucide.dev) через `@iconify-json/lucide` | ISC |
| Іконки застосунку (PNG) | `public/icons/app/` | зібрані з іконки Fluent Emoji «pot of food» | MIT |
| Кольорові іконки страв | `public/icons/food/*.svg` | [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji) (Flat) через `@iconify-json/fluent-emoji-flat` | MIT |
| Шрифт Onest | `public/fonts/onest-*.woff2` | [Onest](https://fonts.google.com/specimen/Onest) через `@fontsource-variable/onest` | SIL OFL 1.1 |
| Шрифт Unbounded | `public/fonts/unbounded-*.woff2` | [Unbounded](https://fonts.google.com/specimen/Unbounded) через `@fontsource-variable/unbounded` | SIL OFL 1.1 |

Тексти ліцензій: ISC і MIT дозволяють вільне використання за умови збереження повідомлення про авторство (воно є в цьому файлі й у коментарі всередині `ui.svg`); SIL OFL 1.1 дозволяє вбудовувати шрифти в сайти.
