/**
 * Syntonia kanban — клиент без зависимостей.
 * Состояние доски живёт в board.json, каждое изменение уходит на сервер.
 */

const COLUMN_IDS = ['backlog', 'progress', 'review', 'done'];

const ASSIGNEES = {
  agent: { label: 'Агент', mark: 'А', className: 'assignee--agent' },
  human: { label: 'Человек', mark: 'Ч', className: 'assignee--human' },
  both: { label: 'Вместе', mark: 'А·Ч', className: 'assignee--both' },
};

const PRIORITIES = {
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
};

const FILTERS = {
  all: () => true,
  agent: (assignee) => assignee === 'agent' || assignee === 'both',
  human: (assignee) => assignee === 'human' || assignee === 'both',
};

const FILTER_NOTES = {
  all: 'все ответственные',
  agent: 'фильтр: агент',
  human: 'фильтр: человек',
};

const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
});
const shortDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
});
const shortDateWithYearFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const fullDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [
  ...root.querySelectorAll(selector),
];

const els = {
  board: $('#board'),
  loading: $('#board-loading'),
  totalCount: $('#total-count'),
  filterNote: $('#filter-note'),
  filters: $$('.filter'),
  status: $('#save-status'),
  statusText: $('#save-status-text'),
  retry: $('#retry-save'),
  refresh: $('#refresh'),
  alert: $('#alert'),
  alertText: $('#alert-text'),
  alertRetry: $('#alert-retry'),
  columnTemplate: $('#column-template'),
  cardTemplate: $('#card-template'),
  editor: $('#editor'),
  editorForm: $('#editor-form'),
  editorHeading: $('#editor-heading'),
  editorSubtitle: $('#editor-subtitle'),
  editorError: $('#editor-error'),
  editorMeta: $('#editor-meta'),
  editorCreated: $('#editor-created'),
  editorId: $('#editor-id'),
  fieldTitle: $('#field-title'),
  fieldDescription: $('#field-description'),
  fieldTag: $('#field-tag'),
  fieldAssignee: $('#field-assignee'),
  fieldPriority: $('#field-priority'),
  fieldColumn: $('#field-column'),
  deleteCard: $('#delete-card'),
  submit: $('#editor-submit'),
  confirmDialog: $('#confirm-dialog'),
  confirmHeading: $('#confirm-heading'),
  confirmText: $('#confirm-text'),
  confirmDelete: $('#confirm-delete'),
};

const state = {
  columns: [],
  filter: 'all',
  loaded: false,
  lastSavedAt: null,
};

let editing = null;
let pendingPayload = null;
let saving = false;
let saveLoop = null;
let lastError = '';
let retryAction = null;
let loadFailed = false;
let loadSequence = 0;
let drag = null;
let lastDragEndAt = Number.NEGATIVE_INFINITY;
let confirmCallback = null;
const scrollMemory = new Map();

/* ------------------------------------------------------------------ */
/* Утилиты                                                             */
/* ------------------------------------------------------------------ */

function pluralize(count, one, few, many) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function cardsLabel(count) {
  return `${count} ${pluralize(count, 'карточка', 'карточки', 'карточек')}`;
}

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `card-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTime(date) {
  return timeFormatter.format(date);
}

function formatCardDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const now = new Date();
  const startOfDay = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(now) - startOfDay(date)) / 86_400_000,
  );

  if (diffDays === 0) return 'сегодня';
  if (diffDays === 1) return 'вчера';
  if (date.getFullYear() === now.getFullYear()) {
    return shortDateFormatter.format(date);
  }
  return shortDateWithYearFormatter.format(date);
}

function formatFullDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'дата неизвестна';
  return fullDateFormatter.format(date);
}

function normalizeCard(raw) {
  return {
    id: String(raw?.id ?? ''),
    title: String(raw?.title ?? ''),
    description:
      typeof raw?.description === 'string' ? raw.description : '',
    tag: typeof raw?.tag === 'string' ? raw.tag : '',
    assignee: raw?.assignee in ASSIGNEES ? raw.assignee : 'agent',
    priority: raw?.priority in PRIORITIES ? raw.priority : 'medium',
    createdAt:
      typeof raw?.createdAt === 'string'
        ? raw.createdAt
        : new Date().toISOString(),
  };
}

function normalizeColumns(rawColumns) {
  if (!Array.isArray(rawColumns)) {
    throw new Error('В ответе сервера нет массива columns.');
  }

  return rawColumns.map((rawColumn) => {
    if (!rawColumn || typeof rawColumn !== 'object') {
      throw new Error('Сервер вернул некорректную колонку.');
    }
    return {
      id: String(rawColumn.id ?? ''),
      title: String(rawColumn.title ?? ''),
      cards: Array.isArray(rawColumn.cards)
        ? rawColumn.cards.map(normalizeCard)
        : [],
    };
  });
}

function findCard(cardId) {
  for (const column of state.columns) {
    const card = column.cards.find((item) => item.id === cardId);
    if (card) return { column, card };
  }
  return null;
}

async function readErrorMessage(response) {
  try {
    const data = await response.json();
    if (Array.isArray(data?.details) && data.details.length > 0) {
      return `${data.error ?? 'Ошибка'} ${data.details.join(' ')}`;
    }
    if (typeof data?.error === 'string') return data.error;
  } catch {
    /* ignore */
  }
  return `Сервер ответил ${response.status} ${response.statusText}`.trim();
}

/* ------------------------------------------------------------------ */
/* Статус сохранения                                                   */
/* ------------------------------------------------------------------ */

function setStatus(mode, { label } = {}) {
  els.status.dataset.state = mode;

  let text = 'Сохранено';
  if (mode === 'loading') text = 'Загружаем…';
  else if (mode === 'saving') text = 'Сохраняем…';
  else if (mode === 'error') text = label ?? 'Ошибка';
  else if (state.lastSavedAt) {
    text = `Сохранено · ${formatTime(state.lastSavedAt)}`;
  }

  els.statusText.textContent = text;
  els.retry.hidden = mode !== 'error' || typeof retryAction !== 'function';

  if (mode === 'error') {
    els.status.title = lastError || text;
  } else {
    els.status.removeAttribute('title');
  }
}

function showAlert(message) {
  els.alertText.textContent = message;
  els.alert.hidden = false;
}

function hideAlert() {
  els.alert.hidden = true;
}

/* ------------------------------------------------------------------ */
/* Загрузка доски                                                      */
/* ------------------------------------------------------------------ */

async function loadBoard() {
  const token = ++loadSequence;
  loadFailed = false;
  setStatus('loading');

  try {
    const response = await fetch('/api/board', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    const data = await response.json();
    if (token !== loadSequence) return;

    const columns = normalizeColumns(data.columns);
    const unknown = columns.find((column) => !COLUMN_IDS.includes(column.id));
    if (unknown) {
      throw new Error(`Неизвестная колонка «${unknown.id}» в board.json.`);
    }

    state.columns = columns;
    state.loaded = true;
    state.lastSavedAt = null;
    pendingPayload = null;
    retryAction = null;
    hideAlert();
    render();
    els.board.setAttribute('aria-busy', 'false');
    setStatus('saved');
  } catch (error) {
    if (token !== loadSequence) return;

    console.error('[kanban] не удалось загрузить доску:', error);
    loadFailed = true;
    lastError = error.message;
    retryAction = () => loadBoard();
    setStatus('error', { label: 'Ошибка загрузки' });
    showAlert(`Не удалось загрузить доску: ${error.message}`);
    els.board.setAttribute('aria-busy', 'false');

    if (!state.loaded) {
      els.board.replaceChildren();
    }
  }
}

/* ------------------------------------------------------------------ */
/* Рендер                                                              */
/* ------------------------------------------------------------------ */

function rememberScroll() {
  for (const node of $$('.cards[data-drop]')) {
    scrollMemory.set(node.dataset.drop, node.scrollTop);
  }
}

function restoreScroll() {
  for (const node of $$('.cards[data-drop]')) {
    const top = scrollMemory.get(node.dataset.drop);
    if (typeof top === 'number' && top > 0) {
      node.scrollTop = top;
    }
  }
}

function renderCard(card) {
  const node = els.cardTemplate.content.firstElementChild.cloneNode(true);
  const assignee = ASSIGNEES[card.assignee] ?? ASSIGNEES.agent;
  const priorityLabel = PRIORITIES[card.priority] ?? PRIORITIES.medium;

  node.dataset.id = card.id;
  node.dataset.assignee = card.assignee;
  node.dataset.priority = card.priority;
  node.setAttribute(
    'aria-label',
    `Карточка «${card.title}». Ответственный: ${assignee.label}. Приоритет: ${priorityLabel}. Нажмите Enter, чтобы изменить.`,
  );

  $('.tag', node).textContent = card.tag;
  $('.card__title', node).textContent = card.title;
  $('.card__desc', node).textContent = card.description;

  const assigneeNode = $('.assignee', node);
  assigneeNode.classList.add(assignee.className);
  $('.assignee__mark', node).textContent = assignee.mark;
  $('.assignee__label', node).textContent = assignee.label;

  const prioNode = $('.prio', node);
  prioNode.title = `Приоритет: ${priorityLabel.toLowerCase()}`;
  $('.prio__label', node).textContent = priorityLabel;

  const dateNode = $('.card__date', node);
  dateNode.dateTime = card.createdAt;
  dateNode.textContent = formatCardDate(card.createdAt);
  dateNode.title = `Создана ${formatFullDate(card.createdAt)}`;

  return node;
}

function render() {
  rememberScroll();
  els.board.replaceChildren();
  els.board.setAttribute('aria-busy', 'false');

  for (const column of state.columns) {
    const node = els.columnTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.column = column.id;
    $('.column__name', node).textContent = column.title;

    const cardsZone = $('.cards', node);
    cardsZone.dataset.drop = column.id;

    for (const card of column.cards) {
      cardsZone.append(renderCard(card));
    }

    const addButton = $('.add-card', node);
    addButton.dataset.add = column.id;
    addButton.setAttribute(
      'aria-label',
      `Добавить карточку в колонку «${column.title}»`,
    );

    els.board.append(node);
  }

  applyFilter();
  restoreScroll();
}

/* ------------------------------------------------------------------ */
/* Фильтр и счётчики                                                   */
/* ------------------------------------------------------------------ */

function applyFilter() {
  const matcher = FILTERS[state.filter] ?? FILTERS.all;
  const filtering = state.filter !== 'all';
  let visibleCards = 0;

  for (const columnNode of $$('.column', els.board)) {
    let visibleInColumn = 0;

    for (const cardNode of $$('.card', columnNode)) {
      const visible = matcher(cardNode.dataset.assignee);
      cardNode.hidden = !visible;
      if (visible) visibleInColumn += 1;
    }

    visibleCards += visibleInColumn;

    const countNode = $('.column__count', columnNode);
    if (countNode) {
      countNode.textContent = String(visibleInColumn);
      countNode.title = cardsLabel(visibleInColumn);
    }

    const emptyNode = $('.empty', columnNode);
    if (emptyNode) {
      emptyNode.hidden = visibleInColumn > 0;
      if (visibleInColumn === 0) {
        $('.empty__title', emptyNode).textContent = filtering
          ? 'Нет подходящих карточек'
          : 'Пока пусто';
        $('.empty__hint', emptyNode).textContent = filtering
          ? 'Смените фильтр или добавьте новую карточку'
          : 'Перетащите сюда карточку или добавьте новую';
      }
    }
  }

  const total = state.columns.reduce(
    (sum, column) => sum + column.cards.length,
    0,
  );

  els.totalCount.textContent = filtering
    ? `${visibleCards} из ${cardsLabel(total)}`
    : cardsLabel(total);
  els.filterNote.textContent = FILTER_NOTES[state.filter] ?? FILTER_NOTES.all;

  for (const button of els.filters) {
    button.setAttribute(
      'aria-pressed',
      String(button.dataset.filter === state.filter),
    );
  }
}

function setFilter(filter) {
  if (!(filter in FILTERS) || filter === state.filter) {
    applyFilter();
    return;
  }
  state.filter = filter;
  applyFilter();
}

/* ------------------------------------------------------------------ */
/* Сохранение                                                          */
/* ------------------------------------------------------------------ */

function serializeBoard() {
  return JSON.stringify({
    columns: state.columns.map((column) => ({
      id: column.id,
      title: column.title,
      cards: column.cards.map((card) => ({
        id: card.id,
        title: card.title,
        description: card.description,
        tag: card.tag,
        assignee: card.assignee,
        priority: card.priority,
        createdAt: card.createdAt,
      })),
    })),
  });
}

async function putBoard(payload) {
  setStatus('saving');

  let response;
  try {
    response = await fetch('/api/board', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
  } catch {
    throw new Error(
      'Сервер недоступен. Проверьте, что запущен «node server.mjs».',
    );
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  await response.json().catch(() => ({}));
}

function startSaveLoop() {
  if (saveLoop) return saveLoop;

  retryAction = null;

  saveLoop = (async () => {
    saving = true;
    try {
      while (pendingPayload !== null) {
        const payload = pendingPayload;
        pendingPayload = null;

        try {
          await putBoard(payload);
        } catch (error) {
          console.error('[kanban] не удалось сохранить доску:', error);
          lastError = error.message;
          pendingPayload = pendingPayload ?? serializeBoard();
          retryAction = retrySave;
          setStatus('error', { label: 'Ошибка сохранения' });
          return;
        }

        state.lastSavedAt = new Date();
        setStatus('saved');
      }
    } finally {
      saving = false;
      saveLoop = null;
    }
  })();

  return saveLoop;
}

function queueSave() {
  if (!state.loaded) return;
  pendingPayload = serializeBoard();
  if (!saveLoop) startSaveLoop();
}

function retrySave() {
  pendingPayload = serializeBoard();
  lastError = '';
  retryAction = null;
  if (!saveLoop) startSaveLoop();
}

/* ------------------------------------------------------------------ */
/* Редактор карточки                                                   */
/* ------------------------------------------------------------------ */

function fillColumnOptions() {
  els.fieldColumn.replaceChildren(
    ...state.columns.map(
      (column) => new Option(column.title, column.id, false, false),
    ),
  );
}

function showEditorError(message) {
  els.editorError.textContent = message;
  els.editorError.hidden = false;
}

function setEditorSubtitle(columnId, mode) {
  const column = state.columns.find((item) => item.id === columnId);
  if (!column) {
    els.editorSubtitle.textContent = '';
    return;
  }
  els.editorSubtitle.textContent =
    mode === 'create'
      ? `Колонка «${column.title}» · новая карточка появится в конце`
      : `Колонка «${column.title}» · изменения сохранятся на сервере`;
}

function openEditor(mode, { columnId, cardId } = {}) {
  const column = state.columns.find((item) => item.id === columnId);
  if (!column) return;

  let card = null;
  if (mode === 'edit') {
    card = column.cards.find((item) => item.id === cardId);
    if (!card) return;
  }

  editing = {
    mode,
    columnId,
    cardId: card?.id ?? null,
  };

  fillColumnOptions();
  els.fieldColumn.value = columnId;
  els.editorError.hidden = true;
  els.editorError.textContent = '';

  if (mode === 'create') {
    els.editorForm.reset();
    fillColumnOptions();
    els.editorHeading.textContent = 'Новая карточка';
    els.fieldColumn.value = columnId;
    els.fieldAssignee.value = state.filter === 'human' ? 'human' : 'agent';
    els.fieldPriority.value = 'medium';
    els.editorMeta.hidden = true;
    els.deleteCard.hidden = true;
    els.submit.textContent = 'Добавить';
    setEditorSubtitle(columnId, 'create');
  } else {
    els.editorHeading.textContent = 'Редактирование';
    els.fieldTitle.value = card.title;
    els.fieldDescription.value = card.description;
    els.fieldTag.value = card.tag;
    els.fieldAssignee.value = card.assignee;
    els.fieldPriority.value = card.priority;
    els.fieldColumn.value = columnId;
    els.editorMeta.hidden = false;
    els.editorCreated.textContent = formatFullDate(card.createdAt);
    els.editorId.textContent = card.id;
    els.deleteCard.hidden = false;
    els.submit.textContent = 'Сохранить';
    setEditorSubtitle(columnId, 'edit');
  }

  if (!els.editor.open) {
    els.editor.showModal();
  }

  requestAnimationFrame(() => {
    els.fieldTitle.focus();
    if (mode === 'edit') els.fieldTitle.select();
  });
}

function closeEditor() {
  editing = null;
  if (els.editor.open) els.editor.close();
  els.editorError.hidden = true;
  els.editorForm.reset();
}

els.fieldColumn.addEventListener('change', () => {
  if (!editing) return;
  setEditorSubtitle(els.fieldColumn.value, editing.mode);
});

els.editorForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!editing) return;

  const title = els.fieldTitle.value.trim();
  if (!title) {
    showEditorError('У карточки должно быть название.');
    els.fieldTitle.focus();
    return;
  }

  const columnId = els.fieldColumn.value;
  const targetColumn = state.columns.find((item) => item.id === columnId);
  if (!targetColumn) {
    showEditorError('Выберите существующую колонку.');
    return;
  }

  const values = {
    title,
    description: els.fieldDescription.value.trim(),
    tag: els.fieldTag.value.trim().replace(/^#+/, '').trim(),
    assignee: els.fieldAssignee.value,
    priority: els.fieldPriority.value,
  };

  if (!(values.assignee in ASSIGNEES) || !(values.priority in PRIORITIES)) {
    showEditorError('Некорректный ответственный или приоритет.');
    return;
  }

  let card = null;

  if (editing.mode === 'create') {
    card = {
      id: makeId(),
      ...values,
      createdAt: new Date().toISOString(),
    };
    targetColumn.cards.push(card);
  } else {
    const sourceColumn = state.columns.find(
      (item) => item.id === editing.columnId,
    );
    card = sourceColumn?.cards.find((item) => item.id === editing.cardId) ?? null;
    if (!sourceColumn || !card) {
      closeEditor();
      return;
    }

    Object.assign(card, values);

    if (sourceColumn.id !== targetColumn.id) {
      const index = sourceColumn.cards.indexOf(card);
      if (index !== -1) sourceColumn.cards.splice(index, 1);
      targetColumn.cards.push(card);
    }
  }

  if (
    state.filter !== 'all' &&
    !FILTERS[state.filter](card.assignee)
  ) {
    state.filter = 'all';
  }

  closeEditor();
  render();
  queueSave();
});

els.deleteCard.addEventListener('click', () => {
  if (!editing) return;
  requestDeleteCard(editing.columnId, editing.cardId);
});

/* ------------------------------------------------------------------ */
/* Удаление с подтверждением                                           */
/* ------------------------------------------------------------------ */

function requestConfirm({ heading, text, label = 'Удалить', onConfirm }) {
  els.confirmHeading.textContent = heading;
  els.confirmText.textContent = text;
  els.confirmDelete.textContent = label;
  confirmCallback = onConfirm;
  if (!els.confirmDialog.open) els.confirmDialog.showModal();
}

function requestDeleteCard(columnId, cardId) {
  const column = state.columns.find((item) => item.id === columnId);
  const card = column?.cards.find((item) => item.id === cardId);
  if (!column || !card) return;

  requestConfirm({
    heading: 'Удалить карточку?',
    text: `«${card.title}» исчезнет с доски. Изменение сразу уйдёт на сервер.`,
    onConfirm: () => {
      const index = column.cards.findIndex((item) => item.id === cardId);
      if (index === -1) return;
      column.cards.splice(index, 1);
      if (editing?.cardId === cardId) closeEditor();
      render();
      queueSave();
    },
  });
}

els.confirmDelete.addEventListener('click', () => {
  const callback = confirmCallback;
  confirmCallback = null;
  els.confirmDialog.close();
  callback?.();
});

els.confirmDialog.addEventListener('close', () => {
  confirmCallback = null;
});

/* ------------------------------------------------------------------ */
/* Drag-and-drop                                                       */
/* ------------------------------------------------------------------ */

function clearDropHighlights() {
  for (const node of $$('.column.is-over')) node.classList.remove('is-over');
}

function cleanupDrag() {
  if (!drag) return;
  drag.placeholder?.remove();
  drag.cardEl?.classList.remove('is-dragging');
  clearDropHighlights();
  document.body.classList.remove('is-dragging');
  drag = null;
  lastDragEndAt = performance.now();
}

function getCardsZone(columnNode) {
  return $('.cards', columnNode);
}

function computeVisibleDropIndex(cardsZone, placeholder) {
  let index = 0;
  for (const child of cardsZone.children) {
    if (child === placeholder) break;
    if (
      child.classList.contains('card') &&
      !child.hidden &&
      !child.classList.contains('is-dragging')
    ) {
      index += 1;
    }
  }
  return index;
}

function commitDrop(columnNode) {
  if (!drag) return;

  const cardsZone = getCardsZone(columnNode);
  const toColumnId = columnNode.dataset.column;
  if (!cardsZone || !toColumnId) {
    cleanupDrag();
    return;
  }

  if (drag.placeholder.parentElement !== cardsZone) {
    cardsZone.append(drag.placeholder);
  }

  const visibleIndex = computeVisibleDropIndex(
    cardsZone,
    drag.placeholder,
  );
  const visibleIds = $$('.card:not(.is-dragging)', cardsZone)
    .filter((node) => !node.hidden)
    .map((node) => node.dataset.id);

  const fromColumn = state.columns.find(
    (column) => column.id === drag.fromColumn,
  );
  const toColumn = state.columns.find((column) => column.id === toColumnId);
  const cardId = drag.id;

  if (!fromColumn || !toColumn) {
    cleanupDrag();
    return;
  }

  const fromIndex = fromColumn.cards.findIndex((card) => card.id === cardId);
  if (fromIndex === -1) {
    cleanupDrag();
    return;
  }

  const [card] = fromColumn.cards.splice(fromIndex, 1);

  let insertAt = toColumn.cards.length;
  if (visibleIndex < visibleIds.length) {
    const anchorId = visibleIds[visibleIndex];
    const anchorIndex = toColumn.cards.findIndex(
      (item) => item.id === anchorId,
    );
    if (anchorIndex !== -1) insertAt = anchorIndex;
  }

  toColumn.cards.splice(insertAt, 0, card);
  const changed =
    fromColumn.id !== toColumn.id || insertAt !== fromIndex;

  cleanupDrag();
  render();

  if (changed) queueSave();
}

document.addEventListener('dragstart', (event) => {
  const cardEl = event.target.closest?.('.card');
  if (!cardEl || !els.board.contains(cardEl) || cardEl.dataset.dragging === 'no') {
    return;
  }

  const columnEl = cardEl.closest('.column');
  const columnId = columnEl?.dataset.column;
  const cardId = cardEl.dataset.id;
  if (!columnId || !cardId) return;

  const placeholder = document.createElement('div');
  placeholder.className = 'placeholder';
  placeholder.setAttribute('aria-hidden', 'true');
  placeholder.style.height = `${cardEl.getBoundingClientRect().height}px`;

  drag = {
    id: cardId,
    fromColumn: columnId,
    cardEl,
    placeholder,
  };

  event.dataTransfer.effectAllowed = 'move';
  try {
    event.dataTransfer.setData('text/plain', cardId);
  } catch {
    /* некоторые браузеры не дают писать в dataTransfer */
  }

  requestAnimationFrame(() => {
    if (drag?.cardEl !== cardEl) return;
    cardEl.classList.add('is-dragging');
    document.body.classList.add('is-dragging');
  });
});

els.board.addEventListener('dragover', (event) => {
  if (!drag) return;

  const columnNode = event.target.closest?.('.column');
  if (!columnNode || !els.board.contains(columnNode)) return;

  const cardsZone = getCardsZone(columnNode);
  if (!cardsZone) return;

  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';

  for (const node of $$('.column.is-over')) {
    if (node !== columnNode) node.classList.remove('is-over');
  }
  columnNode.classList.add('is-over');

  const rect = cardsZone.getBoundingClientRect();
  const edge = 42;
  if (event.clientY < rect.top + edge) {
    cardsZone.scrollTop -= 14;
  } else if (event.clientY > rect.bottom - edge) {
    cardsZone.scrollTop += 14;
  }

  let before = null;
  for (const cardNode of $$('.card:not(.is-dragging)', cardsZone)) {
    if (cardNode.hidden) continue;
    const cardRect = cardNode.getBoundingClientRect();
    if (event.clientY < cardRect.top + cardRect.height / 2) {
      before = cardNode;
      break;
    }
  }

  if (before) {
    if (
      drag.placeholder.parentElement !== cardsZone ||
      drag.placeholder.nextElementSibling !== before
    ) {
      cardsZone.insertBefore(drag.placeholder, before);
    }
  } else if (
    drag.placeholder.parentElement !== cardsZone ||
    drag.placeholder.nextElementSibling !== null
  ) {
    cardsZone.append(drag.placeholder);
  }
});

els.board.addEventListener('dragleave', (event) => {
  if (!drag) return;

  // dragleave всплывает от детей, поэтому проверяем реальные координаты,
  // а не relatedTarget: так placeholder не мигает при движении внутри доски.
  const rect = els.board.getBoundingClientRect();
  const inside =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;
  if (inside) return;

  drag.placeholder.remove();
  clearDropHighlights();
});

els.board.addEventListener('drop', (event) => {
  if (!drag) return;
  const columnNode = event.target.closest?.('.column');
  if (!columnNode || !els.board.contains(columnNode)) return;
  event.preventDefault();
  commitDrop(columnNode);
});

document.addEventListener('dragover', (event) => {
  if (drag) event.preventDefault();
});

document.addEventListener('drop', (event) => {
  if (drag) event.preventDefault();
});

document.addEventListener('dragend', () => {
  cleanupDrag();
});

/* ------------------------------------------------------------------ */
/* Клики по доске                                                      */
/* ------------------------------------------------------------------ */

els.board.addEventListener('click', (event) => {
  const addButton = event.target.closest?.('.add-card');
  if (addButton) {
    if (performance.now() - lastDragEndAt < 350) return;
    openEditor('create', { columnId: addButton.dataset.add });
    return;
  }

  const cardEl = event.target.closest?.('.card');
  if (!cardEl) return;

  const columnEl = cardEl.closest('.column');
  const columnId = columnEl?.dataset.column;
  const cardId = cardEl.dataset.id;
  if (!columnId || !cardId) return;

  const actionButton = event.target.closest?.('[data-action]');
  if (actionButton) {
    if (actionButton.dataset.action === 'edit') {
      openEditor('edit', { columnId, cardId });
    } else if (actionButton.dataset.action === 'delete') {
      requestDeleteCard(columnId, cardId);
    }
    return;
  }

  if (performance.now() - lastDragEndAt < 350) return;
  openEditor('edit', { columnId, cardId });
});

els.board.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;

  const cardEl = event.target.closest?.('.card');
  if (!cardEl || event.target.closest('button, input, textarea, select')) {
    return;
  }

  const columnEl = cardEl.closest('.column');
  const columnId = columnEl?.dataset.column;
  const cardId = cardEl.dataset.id;
  if (!columnId || !cardId) return;

  event.preventDefault();
  openEditor('edit', { columnId, cardId });
});

/* ------------------------------------------------------------------ */
/* Тулбар                                                              */
/* ------------------------------------------------------------------ */

for (const button of els.filters) {
  button.addEventListener('click', () => {
    setFilter(button.dataset.filter);
  });
}

els.retry.addEventListener('click', () => {
  retryAction?.();
});

els.alertRetry.addEventListener('click', () => {
  void loadBoard();
});

async function refreshBoard() {
  if (els.refresh.disabled) return;
  els.refresh.disabled = true;

  try {
    if (saveLoop) await saveLoop;

    if (pendingPayload !== null) {
      requestConfirm({
        heading: 'Загрузить доску заново?',
        text: 'Есть несохранённые изменения. Если загрузить доску с сервера, они будут потеряны.',
        label: 'Загрузить',
        onConfirm: () => {
          pendingPayload = null;
          retryAction = null;
          void loadBoard();
        },
      });
      return;
    }

    await loadBoard();
  } finally {
    els.refresh.disabled = false;
  }
}

els.refresh.addEventListener('click', () => {
  void refreshBoard();
});

/* ------------------------------------------------------------------ */
/* Диалоги                                                             */
/* ------------------------------------------------------------------ */

document.addEventListener('click', (event) => {
  const closeButton = event.target.closest?.('[data-close]');
  if (!closeButton) return;

  const dialog = closeButton.closest('dialog');
  if (!dialog) return;

  if (dialog === els.editor) {
    closeEditor();
  } else {
    dialog.close();
  }
});

function enableBackdropClose(dialog, close) {
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (!inside) close();
  });
}

enableBackdropClose(els.editor, closeEditor);
enableBackdropClose(els.confirmDialog, () => els.confirmDialog.close());

els.editor.addEventListener('close', () => {
  editing = null;
  els.editorError.hidden = true;
});

els.confirmDialog.addEventListener('cancel', () => {
  confirmCallback = null;
});

/* ------------------------------------------------------------------ */
/* Защита от закрытия с несохранёнными изменениями                     */
/* ------------------------------------------------------------------ */

window.addEventListener('beforeunload', (event) => {
  if (saving || pendingPayload !== null) {
    event.preventDefault();
    event.returnValue = '';
  }
});

/* ------------------------------------------------------------------ */
/* Старт                                                               */
/* ------------------------------------------------------------------ */

applyFilter();
void loadBoard();
