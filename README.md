# Syntonia v2 — Astro spike

Первые три блока главной страницы: `header`, `hero`, `banner-founder`, `pain`.
Цель — проверить подход: HTML-компоненты Astro + обычный CSS + данные из Figma,
без React, Tailwind и CMS.

## Запуск

```bash
npm install
npm run dev
# http://127.0.0.1:4321/
```

Сборка статики:

```bash
npm run build
# dist/index.html и assets
```

## Что внутри

```
src/
  components/
    SiteHeader.astro      шапка: nav, логотип, CTA, login, burger
    Hero.astro            первый экран
    BannerFounder.astro   баннер с подписью
    Pain.astro            блок «Когда нужен не просто разговор»
    Button.astro          варианты кнопок (solid/textured, m/l, caps)
  layouts/BaseLayout.astro
  pages/index.astro
  styles/tokens.css       цвета и шрифты из Figma
  styles/base.css         reset и базовая типографика
public/
  fonts/                  woff2 + fonts.css
  img/                    изображения из .fig
  icons/                  SVG из старого проекта (те же узлы Figma)
```

## Что проверено

| Проверка | Результат |
|---|---|
| Высоты секций 1440 | hero 780, banner 525, pain 707; сумма 2012 |
| Header CTA | 215×45, x=1078, y=31.5 |
| Header login / burger | login 45×45 x=1301; burger 38×25 x=1362 |
| Pain list | 584×515, x=752, y=1401 |
| Горизонтальное переполнение | 1440 — нет, 390 — нет |
| Шрифты | Golos Text, Literata, Cormorant Garamond, Great Vibes, Hurricane |
| Ошибки консоли | 0 |
| Мобильный header | логотип и burger не пересекаются |

Скриншоты: `.screens/home-1440.png`, `.screens/home-390.png`.

## Важное про данные Figma

В `.fig` часть текстовых стилей противоречит фактической геометрии. Проверка
по узлам и старой вёрстке:

- `pain` list: в узле `fontSize: 48`, но высоты 78/117 при ширине 513 дают
  **29 px / 39 px**; старый сайт тоже 29/39. Использовано 29/39.
- `hero` title: `lineHeightPx: 95`, но высота 192 на 3 строки = **64 px**;
  использовано 64.
- `banner` title: `lineHeightPx: 71`, но высота 120 на 2 строки = **60 px**;
  использовано 60.

Вывод: стили из `.fig` нельзя переносить вслепую; их нужно сверять с высотой
узла, числом строк и рендером.

## Что не сделано

- остальные секции главной и остальные страницы;
- мобильное меню и play-кнопка пока без обработчиков;
- ссылки ведут на будущие страницы (`method.html`, `booking.html` и т.д.);
- оптимизация изображений (`srcset`, WebP) — это spike;
- пиксельная сверка с PNG макета: рендера главной пока нет.

## Следующий шаг

Собрать остальные секции главной по той же схеме: `spec` из `.fig` →
компонент → проверка высот/позиций → скриншот. Затем — страница «Метод» как
вторая калибровка.
