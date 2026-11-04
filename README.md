# Syntonia v2 — Astro spike

Первые шесть секций главной: `header`, `hero`, `banner-founder`, `pain`,
`method`, `quiz`, `about-founder`. Цель — проверить подход: HTML-компоненты
Astro + обычный CSS + данные из Figma, без React, Tailwind и CMS.

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
    Method.astro          «Метод Syntonia»
    Quiz.astro            «Диагностика состояния»
    AboutFounder.astro    карточка основателя
    Button.astro          кнопки: solid/textured, m/l, caps
    TextLink.astro        ссылка с подчёркиванием и стрелкой
  layouts/BaseLayout.astro
  pages/index.astro
  styles/tokens.css       цвета и шрифты из Figma
  styles/base.css         reset и базовая типографика
public/
  fonts/                  woff2 + fonts.css
  img/                    изображения из .fig
  icons/                  SVG из Figma
design/export/home/       PNG/PDF-выгрузка и точный кроп главной
```

## Выгрузка из Figma

В `design/export/home/Website Syntonia.png` лежит экспорт канвы 18 524 × 10 548.
Главная — первый фрейм слева, `x = 0`, `1440 × 10 548`. Кроп сохранён как
`design/export/home/home-1440.png`. Рендеры секций режутся из него по `y`.

## Что проверено

| Проверка | Результат |
|---|---|
| Высоты секций 1440 | 780 / 525 / 707 / 615 / 550 / 757; сумма 3934 |
| Header CTA | 215×45, x=1078, y=31.5 |
| Header login / burger | login 45×45 x=1301; burger 38×25 x=1362 |
| Pain list | 584×515, x=752, y=1401 |
| Founder card | 1184×565, x=128, y=3273 |
| Горизонтальное переполнение | 1440 — нет, 390 — нет |
| Шрифты | Golos Text, Literata, Cormorant, Great Vibes, Hurricane, Lora |
| Ошибки консоли | 0 |
| Мобильный header | логотип и burger не пересекаются |

Пиксельная сверка против `design/export/home/home-1440.png`:

| Секция | Средняя Δ | Пикселей > 16 |
|---|---:|---:|
| hero | 3,52 | 2,25 % |
| banner | 4,06 | 2,93 % |
| pain | 4,90 | 5,86 % |
| method | 3,06 | 2,22 % |
| quiz | 2,09 | 1,71 % |
| founder | 2,20 | 2,40 % |
| **вся страница (3934 px)** | **3,31** | **2,94 %** |

Остаток — в основном сглаживание шрифтов браузером против Figma; фоновые
изображения и блоки совпадают по геометрии.

Скриншоты: `.screens/home-1440.png`, `.screens/home-390.png`.

## Что выяснилось про Figma

### Текстовые стили нельзя брать вслепую

- `pain` list: в узле `fontSize: 48`, но высоты 78/117 при ширине 513 дают
  **29 px / 39 px**; старый сайт тоже 29/39. Использовано 29/39.
- `hero` title: `lineHeightPx: 95`, но высота 192 на 3 строки = **64 px**.
- `banner` title: `lineHeightPx: 71`, но высота 120 на 2 строки = **60 px**.
- `quiz` title: `lineHeightPx: 71`, но высота 60 на одну строку = **60 px**.

### Картинки: transform — это кроп, а не «cover»

- `banner`: кроп источника `(0, 58.6, 1280, 525.2)` → 1440×525. Совпало.
- `quiz`: кроп `(0, 0, 1280, 477.8)` → 1440×550. Совпало.
- `founder`: кроп `(454, 0, 1366, 941)` → 548×565. Совпало.
- `pain`: у заливки есть `paintFilter` (`exposure: 0.35`,
  `vibrance: -0.13`), которого нет в старом экстракторе. Простое
  экспонирование не совпало по цвету; в спайке использован уже
  цветокорректированный `pain-bg-figma.jpg` из старого проекта. Для нового
  пайплайна нужно переносить `paintFilter` в обработку изображений.

### Наложения из старого CSS могут мешать

В старом `quiz` был градиентный оверлей `rgba(70,50,28,.35)`. В Figma его
нет: у секции только image-заливка. После удаления оверлея Δ quiz упала
с 8,07 до 2,09.

## Что не сделано

- остальные секции главной: `process`, `entry`, `formats`, `voices`,
  `library`, `air-photo`, `faq`, `footer`;
- остальные страницы;
- мобильное меню и play-кнопка пока без обработчиков;
- ссылки ведут на будущие страницы;
- оптимизация изображений (`srcset`, WebP) — это spike;
- автоматический `spec`/`verify` — пока замеры ручные.

## Следующий шаг

Добить главную до конца по той же схеме: кроп секции из `home-1440.png` →
компонент → замер высот/позиций → пиксельная Δ. После главной — «Метод» как
вторая калибровка.
