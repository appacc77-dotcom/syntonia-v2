# Syntonia v2 — Astro spike

Главная собрана полностью: 15 блоков — шапка, 13 секций и подвал.
Стек: Astro + обычный CSS + данные из Figma, без React, Tailwind и CMS.

## Запуск

```bash
npm install
npm run dev      # http://127.0.0.1:4321/
npm run build    # dist/index.html
npm run preview  # http://127.0.0.1:4322/
```

## Что внутри

```
src/components/
  SiteHeader, Hero, BannerFounder, Pain, Method, Quiz,
  AboutFounder, Process, StageCard, Entry, Formats, Voices,
  Library, AirPhoto, Faq, Footer, Button, TextLink
src/data/formats.ts, voices.ts
src/layouts/BaseLayout.astro
src/pages/index.astro
src/styles/tokens.css, base.css
public/fonts, public/img, public/icons
design/export/home/     выгрузка Figma и кроп главной
```

## Выгрузка из Figma

`design/export/home/Website Syntonia.png` — экспорт канвы 18 524 × 10 548.
Главная — первый фрейм слева, `x = 0`, `1440 × 10 548`. Точный кроп:
`design/export/home/home-1440.png`. Секции режутся из него по `y`.

## Высоты

| Блок | Высота | y |
|---|---:|---:|
| header (fixed) | 92 | — |
| hero | 780 | 0 |
| banner-founder | 525 | 780 |
| pain | 707 | 1305 |
| method | 615 | 2012 |
| quiz | 550 | 2627 |
| about-founder | 757 | 3177 |
| process | 1429 | 3934 |
| entry | 892 | 5363 |
| formats | 1164 | 6255 |
| voices | 920 | 7419 |
| library | 641 | 8339 |
| air-photo | 400 | 8980 |
| faq | 807 | 9380 |
| footer | 361 | 10187 |
| **итого** | **10 548** | |

## Пиксельная сверка

Против `home-1440.png`, полная страница 1440 × 10 548:

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
| formats | 3,52 | 3,96 % |
| voices | 11,60 | 21,14 % |
| library | 3,42 | 3,15 % |
| air-photo | 1,11 | 0,01 % |
| faq | 7,58 | 4,86 % |
| footer | 8,41 | 10,34 % |
| **вся страница** | **4,37** | **5,07 %** |

Остаток — сглаживание шрифтов и текстуры фонов. Voices — самый большой
остаток: фон-фактура с оливами и стеклянные карточки; геометрия карточек
совпадает.

## Что проверено

| Проверка | Результат |
|---|---|
| Высоты/якоря секций | совпадают, сумма 10 548 |
| Header CTA | 215×45, x=1078 |
| Pain list | 584×515, x=752, y=1401 |
| Founder card | 1184×565, x=128, y=3273 |
| Process cards | 1080×339, x=180, y=4154 / 4541 / 4928 |
| Entry container | 1280×550, x=80, y=5609 |
| Formats panel | 1280×740, x=80, y=6501 |
| Formats tabs | 335 / 232,25 × 296 |
| Voices card | 672×482; шаг 720 |
| Library content | 493×449, x=867 |
| FAQ | открытый 163, закрытый 71; список 511 |
| Footer | 361; контент 1152 |
| 1440 / 768 / 390 | переполнения нет |
| Консоль | 0 ошибок |
| Build | проходит |

## Интерактив

- `Formats`: 5 табов, стрелки, счётчик `1/5`, смена фото/описания/цены.
- `Voices`: 12 отзывов, листание стрелками и листовыми точками.
- `FAQ`: аккордеон, открыт один пункт, `aria-expanded`.
- Проверено кликами: formats → `2/5`, voices → 3-я точка, FAQ → второй
  пункт открывается, первый закрывается.

## Что выяснилось про Figma

### Текстовые стили нельзя брать вслепую

- `pain` list: в узле 48, по высотам — **29 / 39**.
- `process` body: в узле 29, по высотам — **20 / 34**.
- `hero` title: `lineHeightPx 95`, фактически **64**.
- `formats` active desc: высота 95 — это фиксированный блок, текст 3 строки;
  поэтому `min-height: 95px`, иначе кнопка уезжает вверх.
- `faq` answer: в узле 22, но две строки при 787 px получаются только
  с **20 px**.
- `voices` quote: в узле Lovers Quarrel 128/28 — это ошибка; фактически
  Lora Italic **20/28**.

### Картинки: transform — это кроп

- `banner`: `(0, 58.6, 1280, 525.2)` → 1440×525.
- `quiz`: `(0, 0, 1280, 477.8)` → 1440×550.
- `founder`: `(454, 0, 1366, 941)` → 548×565.
- `entry` photo: `FILL` → `object-fit: cover`, `object-position: 50% 55%`.
- `process` PNG — с белым фоном без альфы; для спайка взяты кропы из рендера.
- `air-photo` — взят кроп из рендера: исходник 1280×397 не совпадал по кадру.
- `voices` / `faq` / `formats` / `library` / `footer` — старые фоновые
  ассеты, сверены по рендеру.

### Наложения из старого CSS

В старом `quiz` был градиентный оверлей; в Figma его нет. После удаления
Δ quiz упала с 8,07 до 2,09.

### Скриншоты и lazy-картинки

Перед полным скриншотом нужно проскроллить страницу и дождаться
`document.images`, иначе нижние фото не загружаются и Δ врёт.

## Что осталось

- остальные страницы: method, practice, library, booking, masters, legal;
- мобильное меню и play-кнопка без обработчиков;
- ссылки соцсетей и Cookie settings — заглушки;
- оптимизация изображений (`srcset`, WebP);
- автоматический `spec`/`verify` (замеры пока ручные).
