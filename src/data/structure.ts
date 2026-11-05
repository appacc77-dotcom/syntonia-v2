export type Status = 'done' | 'review' | 'progress' | 'todo';

export interface Shots {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
  warning?: string;
}

export interface Block {
  id: string;
  title: string;
  does: string;
  task: string;
  status: Status;
  note?: string;
  images?: Shots;
}

export interface SitePage {
  id: string;
  number: string;
  title: string;
  route: string;
  status: Status;
  note: string;
  height: string;
  blocks: Block[];
}

const homeShot = (id: string): Shots => ({
  before: `/structure/home-${id}-figma.jpg`,
  after: `/structure/home-${id}-site.jpg`,
  beforeLabel: 'Figma',
  afterLabel: 'Сделано',
});

const methodShot = (id: string): Shots => ({
  before: `/structure/method-${id}-ref.jpg`,
  after: `/structure/method-${id}-site.jpg`,
  beforeLabel: 'Эталон, не Figma',
  afterLabel: 'Сделано',
  warning: 'Эталон — рендер старой сборки, не экспорт Figma. Пиксельная Δ ниже — регрессия, а не доказательство соответствия макету.',
});

export const globalBlocks: Block[] = [
  {
    id: 'header',
    title: 'Шапка',
    does: 'Фиксированная тёмная шапка: nav, лого, CTA «Личная встреча», кабинет, бургер и мобильное меню.',
    task: 'Исправить якоря #voices/#faq, тап-таргет бургера и возврат фокуса после Escape; уточнить 7 nav-ссылок + CTA или 8 + CTA.',
    status: 'review',
    note: 'Карточка c-3fea934a — на приёмке, RED снят.',
  },
  {
    id: 'footer',
    title: 'Подвал',
    does: 'Навигация, контакты, юридические ссылки, лого и подпись.',
    task: 'Соцсети и Cookie settings — заглушки; пиксельный хвост фактуры.',
    status: 'done',
    note: 'Δ 8,41 на главной.',
    images: {
      before: '/structure/home-footer-figma.jpg',
      after: '/structure/home-footer-site.jpg',
      beforeLabel: 'Figma',
      afterLabel: 'Сделано',
    },
  },
];

export const pages: SitePage[] = [
  {
    id: 'home',
    number: '01',
    title: 'Главная',
    route: '/',
    status: 'done',
    note: 'Собрана полностью: 15 блоков, 10 548 px, Δ 4,37 / 5,07 %. Voices и footer — известные хвосты.',
    height: '10 548 px',
    blocks: [
      {
        id: 'hero',
        title: 'Hero',
        does: 'Первый экран: H1 «Состояние, из которого строится жизнь», лид, CTA на quiz, play.',
        task: 'Play-кнопка без модального окна — отдельная задача.',
        status: 'done',
        images: homeShot('hero'),
      },
      {
        id: 'banner',
        title: 'Banner founder',
        does: 'Широкий баннер с основателем и подписью; вход в тему метода.',
        task: 'Готово.',
        status: 'done',
        images: homeShot('banner'),
      },
      {
        id: 'pain',
        title: 'Pain',
        does: 'Список того, что мешает жить; подводит к причине и методу.',
        task: 'Готово.',
        status: 'done',
        images: homeShot('pain'),
      },
      {
        id: 'method',
        title: 'Method',
        does: 'Четыре шага метода: увидеть, понять, отпустить, жить.',
        task: 'Готово.',
        status: 'done',
        images: homeShot('method'),
      },
      {
        id: 'quiz',
        title: 'Quiz',
        does: 'Лид-магнит: «Вопрос 1 из 9» и вход в quiz.',
        task: 'Полный набор вопросов — вне этой страницы.',
        status: 'done',
        images: homeShot('quiz'),
      },
      {
        id: 'founder',
        title: 'About founder',
        does: 'Карточка основателя: фото, имя, регалии, цитата.',
        task: 'Готово.',
        status: 'done',
        images: homeShot('founder'),
      },
      {
        id: 'process',
        title: 'Process',
        does: 'Три stage-карточки: как проходит работа.',
        task: 'Готово.',
        status: 'done',
        images: homeShot('process'),
      },
      {
        id: 'entry',
        title: 'Entry',
        does: 'Точка входа: текст, фото, две кнопки.',
        task: 'Готово.',
        status: 'done',
        images: homeShot('entry'),
      },
      {
        id: 'formats',
        title: 'Formats',
        does: 'Пять форматов: слайдер, табы, цены, CTA.',
        task: 'Цены и длительности не подтверждены заказчиком.',
        status: 'done',
        images: homeShot('formats'),
      },
      {
        id: 'voices',
        title: 'Voices',
        does: '12 отзывов: карусель, листовые точки, стрелки.',
        task: 'Фоновая фактура — остаточная Δ 11,6.',
        status: 'done',
        note: 'Самый большой пиксельный хвост.',
        images: homeShot('voices'),
      },
      {
        id: 'library',
        title: 'Library',
        does: 'Промо книги и журналов Syntonia.',
        task: 'Готово.',
        status: 'done',
        images: homeShot('library'),
      },
      {
        id: 'air',
        title: 'Air photo',
        does: 'Полноэкранный портрет основателя.',
        task: 'Готово.',
        status: 'done',
        images: homeShot('air'),
      },
      {
        id: 'faq',
        title: 'FAQ',
        does: 'Аккордеон из пяти вопросов.',
        task: 'Готово.',
        status: 'done',
        images: homeShot('faq'),
      },
    ],
  },
  {
    id: 'method',
    number: '02',
    title: 'Метод',
    route: '/method.html',
    status: 'review',
    note: 'Собрано 2737 px, геометрия и адаптив сходятся. Правки width/отчёта внесены; ждёт приёмки. Остаток: 1:1 Figma-рендера нет.',
    height: '2 737 px',
    blocks: [
      {
        id: 'hero',
        title: 'Hero',
        does: 'Первый экран метода: заголовок и описание подводного кадра.',
        task: 'Настоящий Figma-кроп; после этого пересчитать Δ.',
        status: 'review',
        images: methodShot('hero'),
      },
      {
        id: 'principles',
        title: 'Principles',
        does: 'Три принципа: глубинный уровень, целостный подход, практический результат.',
        task: 'Пересобрать отчёт по шаблону: figma_version, команды, deviations.',
        status: 'review',
        images: methodShot('principles'),
      },
      {
        id: 'cta',
        title: 'CTA',
        does: 'CTA на точку входа и вопрос; фото лестницы.',
        task: 'Убрать width 219/160 или оформить waiver в decisions.md.',
        status: 'review',
        images: methodShot('cta'),
      },
    ],
  },
  {
    id: 'masters',
    number: '03',
    title: 'Мастера',
    route: '/masters.html',
    status: 'review',
    note: 'Figma 1440×3886, пять блоков. Не начато.',
    height: '3 886 px',
    blocks: [
      { id: 'founder-hero', title: 'Founder hero', does: 'Первый экран с основателем.', task: 'Собрать и сверить с макетом.', status: 'review' },
      { id: 'masters-team', title: 'Masters team', does: 'Команда мастеров и направления.', task: 'Собрать карточки и состояния.', status: 'review' },
      { id: 'masters-more', title: 'Masters more', does: 'Дополнительный блок о подходе.', task: 'Собрать по макету.', status: 'review' },
      { id: 'footer', title: 'Footer', does: 'Общий подвал.', task: 'Переиспользовать.', status: 'review' },
      { id: 'header', title: 'Header', does: 'Общая шапка.', task: 'Переиспользовать после приёмки.', status: 'review' },
    ],
  },
  {
    id: 'practice',
    number: '04',
    title: 'Пространство практики',
    route: '/practice.html',
    status: 'todo',
    note: 'Самая большая страница: Figma 1440×9291, восемь блоков. Не начато.',
    height: '9 291 px',
    blocks: [
      { id: 'hero', title: 'Hero', does: 'Первый экран практик.', task: 'Собрать.', status: 'todo' },
      { id: 'practice-free', title: 'Practice free', does: 'Бесплатный вход в практику.', task: 'Собрать.', status: 'todo' },
      { id: 'quiz', title: 'Quiz', does: 'Встроенный quiz.', task: 'Собрать и связать с логикой.', status: 'todo' },
      { id: 'practice-pay', title: 'Practice pay', does: 'Платные практики.', task: 'Собрать карточки и состояния.', status: 'todo' },
      { id: 'kody-practice-pay', title: 'Kody practice pay', does: 'Практики «Коды».', task: 'Собрать.', status: 'todo' },
      { id: 'practice-package', title: 'Practice package', does: 'Пакет практик.', task: 'Собрать.', status: 'todo' },
      { id: 'info-section', title: 'Info section', does: 'Информационный блок.', task: 'Собрать.', status: 'todo' },
      { id: 'footer', title: 'Footer', does: 'Общий подвал.', task: 'Переиспользовать.', status: 'todo' },
    ],
  },
  {
    id: 'library',
    number: '05',
    title: 'Библиотека',
    route: '/library.html',
    status: 'todo',
    note: 'Figma 1440×3188 + три состояния журнала. Не начато.',
    height: '3 188 px + journal',
    blocks: [
      { id: 'library-hero', title: 'Library hero', does: 'Первый экран библиотеки.', task: 'Собрать.', status: 'todo' },
      { id: 'library-book', title: 'Library book', does: 'Книга Syntonia.', task: 'Собрать.', status: 'todo' },
      { id: 'library-journal', title: 'Library journal', does: 'Журнал и выпуски.', task: 'Собрать.', status: 'todo' },
      { id: 'library-issues', title: 'Library issues', does: 'Сетка выпусков.', task: 'Собрать.', status: 'todo' },
      { id: 'journal-start', title: 'Journal start', does: 'Стартовая страница журнала.', task: 'Собрать отдельным шаблоном.', status: 'todo' },
      { id: 'journal-issue', title: 'Journal issue', does: 'Страница выпуска, 9692 px.', task: 'Собрать после основного шаблона.', status: 'todo' },
    ],
  },
  {
    id: 'booking',
    number: '06',
    title: 'Запись',
    route: '/booking.html',
    status: 'todo',
    note: 'Figma 1440×2416 + четыре состояния форматов. Не начато; нужна точка отправки формы.',
    height: '2 416 px',
    blocks: [
      { id: 'booking-hero', title: 'Booking hero', does: 'Первый экран записи.', task: 'Собрать.', status: 'todo' },
      { id: 'booking-formats', title: 'Booking formats', does: 'Форматы и форма.', task: 'Решить endpoint; собрать валидацию и состояния.', status: 'todo' },
      { id: 'footer', title: 'Footer', does: 'Общий подвал.', task: 'Переиспользовать.', status: 'todo' },
    ],
  },
  {
    id: 'quiz',
    number: '07',
    title: 'Quiz',
    route: '/quiz.html',
    status: 'todo',
    note: 'Figma 1440×1218 + cover, результаты и thanks. Не начато; нужен полный набор вопросов.',
    height: '1 218 px + states',
    blocks: [
      { id: 'quiz-section', title: 'Quiz section', does: 'Вопросы и результат.', task: 'Собрать логику и состояния.', status: 'todo' },
      { id: 'cover', title: 'Cover', does: 'Обложка quiz.', task: 'Собрать.', status: 'todo' },
      { id: 'thanks', title: 'Thanks', does: 'Экран благодарности.', task: 'Собрать.', status: 'todo' },
    ],
  },
  {
    id: 'offer',
    number: '08',
    title: 'Публичная оферта',
    route: '/offer.html',
    status: 'todo',
    note: 'Макета нет — типовой текстовый шаблон.',
    height: 'text',
    blocks: [{ id: 'legal', title: 'Legal text', does: 'Юридический текст.', task: 'Собрать типовой шаблон и подключить контент.', status: 'todo' }],
  },
  {
    id: 'privacy',
    number: '09',
    title: 'Политика конфиденциальности',
    route: '/privacy.html',
    status: 'todo',
    note: 'Макета нет — типовой текстовый шаблон.',
    height: 'text',
    blocks: [{ id: 'legal', title: 'Legal text', does: 'Юридический текст.', task: 'Собрать типовой шаблон и подключить контент.', status: 'todo' }],
  },
  {
    id: 'consent',
    number: '10',
    title: 'Согласие на обработку',
    route: '/consent.html',
    status: 'todo',
    note: 'Макета нет — типовой текстовый шаблон.',
    height: 'text',
    blocks: [{ id: 'legal', title: 'Legal text', does: 'Юридический текст.', task: 'Собрать типовой шаблон и подключить контент.', status: 'todo' }],
  },
  {
    id: '404',
    number: '11',
    title: '404',
    route: '/404.html',
    status: 'todo',
    note: 'Макета нет.',
    height: 'text',
    blocks: [{ id: '404', title: '404', does: 'Страница ошибки.', task: 'Собрать в стиле сайта.', status: 'todo' }],
  },
];

export const statusLabel: Record<Status, string> = {
  done: 'готово',
  review: 'на приёмке',
  progress: 'в работе',
  todo: 'не начато',
};
