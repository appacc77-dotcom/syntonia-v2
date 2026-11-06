# masters — страница «Мастера»

- карточка: `Page · Мастера`
- Figma: `masters/main` (`217:238` hero, `217:345` team, `256:374` more)
- extracted: 1440×3886; hero 839, team 2066, more 620, footer 361
- файлы: `src/pages/masters.astro`, `MastersHero`, `MastersTeam`, `MastersMore`, `MasterCard`, `MasterPlayer`, `AudioButton`, `LinkCard`
- ассеты: `public/img/masters-*`

## Проверено

| Проверка | 1440 | 390 |
|---|---:|---:|
| страница | 3886 | 6119 |
| hero | 839 | 1327 |
| team | 2066 | 2224.2 |
| more | 620 | 1794.3 |
| переполнение | нет | нет |
| консоль | 0 | 0 |

- Build: 5 страниц, зелёный.
- Секции совпали с extracted-дерева по высотам 1:1.
- Аудиозаписи — заглушки: при клике честное сообщение «файл ещё не передан»;
  реального аудио нет.
- Ссылки на method/booking/practice/library уже стоят.

## Ограничение

1:1 Figma-рендера masters в репозитории нет. Пиксельная сверка не заявляется;
проверена геометрия по extracted + визуальная сборка по старому HTML/CSS.
