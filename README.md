# Syntonia v2 — Astro spike

Восемь секций главной: `header`, `hero`, `banner-founder`, `pain`, `method`,
`quiz`, `about-founder`, `process`, `entry`. Цель — проверить подход:
HTML-компоненты Astro + обычный CSS + данные из Figma, без React, Tailwind
и CMS.

## Запуск

```bash
npm install
npm run dev      # http://127.0.0.1:4321/
npm run build    # dist/index.html
```

## Что внутри

```
src/components/
  SiteHeader, Hero, BannerFounder, Pain,
  Method, Quiz, AboutFounder, Process, StageCard, Entry,
  Button, TextLink
src/layouts/BaseLayout.astro
src/pages/index.astro
src/styles/tokens.css, base.css
public/fonts, public/img, public/icons
design/export/home/     выгрузка Figma и кроп главной
```

## Выгрузка из Figma

`design/export/home/Website Syntonia.png` — экспорт канвы 18 524 × 10 548.
Главная — первый фрейм слева, `x = 0`, `1440 × 10 548`. Точный кроп:
`design/export/home/home-1440.png`. Рендеры секций режутся из него по `y`.

## Что проверено

| Проверка | Результат |
|---|---|
| Высоты секций 1440 | 780 / 525 / 707 / 615 / 550 / 757 / 1429 / 892 |
| Сумма | 6255 px |
| Header CTA | 215×45, x=1078 |
| Pain list | 584×515, x=752, y=1401 |
| Founder card | 1184×565, x=128, y=3273 |
| Process cards | 1080×339, x=180, y=4154 / 4541 / 4928 |
| Entry container | 1280×550, x=80, y=5609 |
| Переполнение | 1440 — нет, 390 — нет |
| Шрифты | Golos, Literata, Cormorant, Great Vibes, Hurricane, Lora |
| Ошибки консоли | 0 |

Пиксельная сверка против `home-1440.png` (1440, полная страница):

| Секция | Средняя Δ | Пикселей > 16 |
|---|---:|---:|
| hero | 3,52 | 2,25 % |
| banner | 4,06 | 2,93 % |
| pain | 4,90 | 5,86 % |
| method | 3,06 | 2,22 % |
| quiz | 2,09 | 1,71 % |
| founder | 2,20 | 2,40 % |
| process | 1,53 | 1,66 % |
| entry | 4,79 | 6,51 % |
| **вся страница (6255 px)** | **3,12** | **3,15 %** |

Остаток — в основном сглаживание шрифтов браузером против Figma.

## Что выяснилось про Figma

### Текстовые стили нельзя брать вслепую

- `pain` list: в узле `fontSize: 48`, но высоты 78/117 при ширине 513 дают
  **29 px / 39 px**.
- `process` body: в узле `29`, но высота 136/170 при ширине 390 даёт
  **20 px / 34 px**; старый сайт тоже 20.
- `hero` title: `lineHeightPx: 95`, но 192 / 3 строки = **64 px**.
- `banner` и `quiz` title: `lineHeightPx: 71`, но 120 / 2 и 60 / 1 = **60 px**.

### Картинки: transform — это кроп

- `banner`: `(0, 58.6, 1280, 525.2)` → 1440×525.
- `quiz`: `(0, 0, 1280, 477.8)` → 1440×550.
- `founder`: `(454, 0, 1366, 941)` → 548×565.
- `entry` photo: `FILL` → `object-fit: cover`, `object-position: 50% 55%`;
  так совпадает кадр.
- `pain`: у заливки `paintFilter` (`exposure: 0.35`, `vibrance: -0.13`);
  в спайке использован цветокорректированный старый ассет.
- `process`: исходные PNG — с белым фоном, без альфы. Для спайка взяты
  кропы из рендера Figma; для продакшена нужен экспорт с прозрачностью.

### Наложения из старого CSS могут мешать

В старом `quiz` был градиентный оверлей `rgba(70,50,28,.35)`. В Figma его
нет: после удаления Δ quiz упала с 8,07 до 2,09.

### Скриншоты и lazy-картинки

`loading="lazy"` не успевает за полным скриншотом. Перед снятием нужно
проскроллить страницу и дождаться `document.images`; иначе process/entry
выглядят тёмными и Δ врёт.

## Что не сделано

- осталось шесть секций: `formats`, `voices`, `library`, `air-photo`, `faq`,
  `footer`;
- остальные страницы;
- мобильное меню и play-кнопка без обработчиков;
- оптимизация изображений (`srcset`, WebP);
- автоматический `spec`/`verify` — замеры пока ручные.

## Следующий шаг

`formats` (1164 px): сетка форматов и состояния карточек. Дальше `voices`,
`library`, `air-photo`, `faq`, `footer`.
