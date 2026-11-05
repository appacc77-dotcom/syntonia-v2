# Syntonia v2 — Astro spike

Готовы главная (15 блоков), «Метод», «Мастера», legal/404. В работе
«Пространство практики», «Библиотека», «Запись» и Quiz. Стек: Astro +
обычный CSS + данные из Figma, без React, Tailwind и CMS.

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
  Library, AirPhoto, Faq, Footer, Button, TextLink,
  MethodHero, MethodPrinciples, MethodCta,
  MastersHero, MastersTeam, MastersMore, MasterCard, MasterPlayer,
  AudioButton, LinkCard, LegalPage
src/data/formats.ts, voices.ts, structure.ts
src/layouts/BaseLayout.astro
src/pages/index.astro, method.astro, masters.astro,
  offer.astro, privacy.astro, consent.astro, 404.astro,
  progress.astro, structure.astro
src/styles/tokens.css, base.css
public/fonts, public/img, public/icons
design/export/home/     выгрузка Figma и кроп главной
design/export/method/   рендер страницы метода
reports/layout/         отчёты по карточкам
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

## Страница «Метод»

`/method.html`, Figma `323:422`, источник — `design/export/method/method-1440.png`.

| Блок | Высота | y |
|---|---:|---:|
| hero | 800 | 0 |
| about | 1077 | 800 |
| cta | 499 | 1877 |
| footer | 361 | 2376 |
| **итого** | **2737** | |

Пиксельная сверка: hero 0,86 (1,75 %), about 2,26 (4,95 %), cta 3,32
(4,64 %), footer 8,01 (3,90 %); **вся страница 2,85 (3,86 %)**. Это
регрессия к старому QA-рендеру, не к Figma.
На 768 — 2849, на 390 — 3280; переполнения нет, консоль 0.

## Страница «Мастера»

`/masters.html`, 1440×3886: founder hero 839, team 2066, more 620, footer 361;
на 390 — 6291. Секции собраны по extracted; 1:1 Figma-рендера нет, поэтому
пиксельная Δ не заявляется. Аудио — честные заглушки.

## Legal / 404

`/offer.html`, `/privacy.html`, `/consent.html` — текстовые заглушки 1440×991 /
390×1576; `/404.html` отдаёт 404 и ведёт на главную/структуру. Figma нет.

## Каркас

- бургер открывает меню под шапкой, закрывает Escape, клик вне и клик по ссылке;
- 8 ссылок + CTA «Личная встреча»;
- `aria-current="page"` подсвечивает текущий раздел в шапке, dropdown и меню;
- проверено на 1440/768/390, консоль 0.
- play-кнопка пока без модального окна — отдельная задача.

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
| Build | проходит, 9 страниц |

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

## Прогресс и структура

- `/progress.html` — живой прогресс карточек из канбана DSH (dev-прокси
  `/kanban/api/board`, обновление каждые 2,5 с);
- `/structure.html` — карта страниц и блоков со статусами и превью.

## Структура сайта

`/structure.html` — внутренняя карта (noindex): 11 страниц, 45 блоков + 2 общих,
статусы «готово / на доработке / не начато», что делает каждый блок и что
осталось. У собранных блоков — два превью: эталон и текущая реализация.
Ссылки ведут на локальные маршруты. Карточка на доске — `c-34afe664`.
Карточки блоков — `docs/block-cards.json`: `Home · …` в done, `Method · …`
в progress, `Page · …` в backlog; всего 28 карточек, у каждой ссылка на
`#block-…`.

## Что осталось

- method и каркас — в работе после приёмки RED;
- остальные страницы: masters, practice, library, booking, quiz, legal;
- play-кнопка без модального окна;
- ссылки соцсетей и Cookie settings — заглушки;
- оптимизация изображений (`srcset`, WebP);
- автоматический `spec`/`verify` (замеры пока ручные).
