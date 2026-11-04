#!/usr/bin/env node
/**
 * Syntonia kanban — локальный мини-сервис без npm-зависимостей.
 *
 *   GET  /api/board  — читает board.json
 *   PUT  /api/board  — валидирует и атомарно сохраняет доску
 *   *                — статика из public/
 *
 * Запуск: node server.mjs → http://127.0.0.1:4324
 */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, 'public');
const BOARD_FILE = path.join(ROOT, 'board.json');

const HOST = '127.0.0.1';
const PORT = 4324;
const MAX_BODY_BYTES = 2 * 1024 * 1024;

const COLUMN_ORDER = ['backlog', 'progress', 'review', 'done'];
const ASSIGNEES = new Set(['agent', 'human', 'both']);
const PRIORITIES = new Set(['high', 'medium', 'low']);

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.avif', 'image/avif'],
  ['.gif', 'image/gif'],
  ['.ico', 'image/x-icon'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
]);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/* ------------------------------------------------------------------ */
/* Валидация доски                                                     */
/* ------------------------------------------------------------------ */

const isObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function validateCard(raw, where) {
  const errors = [];
  if (
    typeof raw.id !== 'string' ||
    raw.id.trim().length === 0 ||
    raw.id.length > 100
  ) {
    errors.push(`${where}: id — непустая строка до 100 символов.`);
  }
  if (
    typeof raw.title !== 'string' ||
    raw.title.trim().length === 0 ||
    raw.title.length > 300
  ) {
    errors.push(`${where}: title — непустая строка до 300 символов.`);
  }

  const description = raw.description ?? '';
  if (typeof description !== 'string' || description.length > 4000) {
    errors.push(`${where}: description — строка до 4000 символов.`);
  }

  const tag = raw.tag ?? '';
  if (typeof tag !== 'string' || tag.length > 80) {
    errors.push(`${where}: tag — строка до 80 символов.`);
  }

  if (!ASSIGNEES.has(raw.assignee)) {
    errors.push(`${where}: assignee должен быть agent, human или both.`);
  }
  if (!PRIORITIES.has(raw.priority)) {
    errors.push(`${where}: priority должен быть high, medium или low.`);
  }
  if (
    typeof raw.createdAt !== 'string' ||
    raw.createdAt.length > 40 ||
    Number.isNaN(Date.parse(raw.createdAt))
  ) {
    errors.push(`${where}: createdAt — корректная ISO-дата.`);
  }

  if (errors.length > 0) return { errors };

  return {
    errors: [],
    card: {
      id: raw.id.trim(),
      title: raw.title.trim(),
      description: description.trim(),
      tag: tag.trim(),
      assignee: raw.assignee,
      priority: raw.priority,
      createdAt: new Date(raw.createdAt).toISOString(),
    },
  };
}

/**
 * Проверяет структуру и возвращает нормализованную доску.
 * @returns {{ errors: string[], board?: { columns: object[] }, cardCount?: number }}
 */
function validateBoard(input) {
  if (!isObject(input)) {
    return { errors: ['Корень доски должен быть JSON-объектом.'] };
  }
  if (!Array.isArray(input.columns)) {
    return { errors: ['Поле columns должно быть массивом.'] };
  }

  const errors = [];
  if (input.columns.length !== COLUMN_ORDER.length) {
    errors.push(
      `Ожидаются ровно ${COLUMN_ORDER.length} колонки: ${COLUMN_ORDER.join(', ')}.`,
    );
  }

  const seenColumns = new Set();
  const seenCardIds = new Set();
  const columns = [];
  let cardCount = 0;

  for (const [columnIndex, rawColumn] of input.columns.entries()) {
    if (!isObject(rawColumn)) {
      errors.push(`Колонка #${columnIndex + 1} должна быть объектом.`);
      continue;
    }

    if (!COLUMN_ORDER.includes(rawColumn.id)) {
      errors.push(
        `Колонка #${columnIndex + 1}: неизвестный id «${String(rawColumn.id)}». Допустимо: ${COLUMN_ORDER.join(', ')}.`,
      );
      continue;
    }
    if (seenColumns.has(rawColumn.id)) {
      errors.push(`Колонка «${rawColumn.id}» встречается больше одного раза.`);
      continue;
    }
    seenColumns.add(rawColumn.id);

    if (
      typeof rawColumn.title !== 'string' ||
      rawColumn.title.trim().length === 0 ||
      rawColumn.title.length > 80
    ) {
      errors.push(
        `Колонка «${rawColumn.id}»: title — непустая строка до 80 символов.`,
      );
    }

    if (!Array.isArray(rawColumn.cards)) {
      errors.push(`Колонка «${rawColumn.id}»: cards должно быть массивом.`);
      continue;
    }
    if (rawColumn.cards.length > 500) {
      errors.push(`Колонка «${rawColumn.id}»: не больше 500 карточек.`);
      continue;
    }

    const cards = [];
    for (const [cardIndex, rawCard] of rawColumn.cards.entries()) {
      const where = `Колонка «${rawColumn.id}», карточка #${cardIndex + 1}`;
      if (!isObject(rawCard)) {
        errors.push(`${where}: должна быть JSON-объектом.`);
        continue;
      }

      const result = validateCard(rawCard, where);
      if (result.errors.length > 0) {
        errors.push(...result.errors);
        continue;
      }

      const card = result.card;
      if (seenCardIds.has(card.id)) {
        errors.push(`${where}: id «${card.id}» уже используется.`);
        continue;
      }
      seenCardIds.add(card.id);
      cards.push(card);
      cardCount += 1;
    }

    columns.push({
      id: rawColumn.id,
      title: rawColumn.title.trim(),
      cards,
    });
  }

  for (const id of COLUMN_ORDER) {
    if (!seenColumns.has(id)) errors.push(`Не хватает колонки «${id}».`);
  }

  if (errors.length > 0) {
    return { errors: errors.slice(0, 30) };
  }

  columns.sort(
    (a, b) => COLUMN_ORDER.indexOf(a.id) - COLUMN_ORDER.indexOf(b.id),
  );

  return { errors: [], board: { columns }, cardCount };
}

/* ------------------------------------------------------------------ */
/* HTTP-помощники                                                      */
/* ------------------------------------------------------------------ */

function baseHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  };
}

function sendJson(req, res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    ...baseHeaders(),
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(req.method === 'HEAD' ? undefined : body);
}

function sendText(req, res, status, text) {
  res.writeHead(status, {
    ...baseHeaders(),
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
    'Cache-Control': 'no-store',
  });
  res.end(req.method === 'HEAD' ? undefined : text);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (tooLarge) {
        reject(
          new HttpError(
            413,
            `Тело запроса больше ${Math.round(MAX_BODY_BYTES / 1024 / 1024)} МБ.`,
          ),
        );
        return;
      }
      resolve(Buffer.concat(chunks).toString('utf8'));
    });

    req.on('error', reject);
  });
}

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

async function readBoard() {
  let raw;
  try {
    raw = await readFile(BOARD_FILE, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new HttpError(500, 'board.json не найден рядом с server.mjs.');
    }
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new HttpError(500, `board.json содержит некорректный JSON: ${error.message}`);
  }

  const result = validateBoard(parsed);
  if (result.errors.length > 0) {
    throw new HttpError(
      500,
      `board.json не прошёл валидацию: ${result.errors.join(' ')}`,
    );
  }
  return result.board;
}

async function writeBoardAtomically(board) {
  const serialized = `${JSON.stringify(board, null, 2)}\n`;
  const tempFile = path.join(ROOT, `.board-${randomUUID()}.tmp`);

  try {
    await writeFile(tempFile, serialized, { encoding: 'utf8', mode: 0o644 });
    await rename(tempFile, BOARD_FILE);
  } catch (error) {
    await unlink(tempFile).catch(() => {});
    throw error;
  }
}

async function handleBoardApi(req, res, method) {
  if (method === 'GET' || method === 'HEAD') {
    const board = await readBoard();
    sendJson(req, res, 200, board);
    return;
  }

  if (method === 'PUT') {
    const raw = await readRequestBody(req);
    if (raw.trim() === '') {
      throw new HttpError(400, 'Пустое тело запроса: ожидался JSON доски.');
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new HttpError(400, `Некорректный JSON: ${error.message}`);
    }

    const result = validateBoard(parsed);
    if (result.errors.length > 0) {
      sendJson(req, res, 400, {
        error: 'Доска не прошла валидацию.',
        details: result.errors,
      });
      return;
    }

    await writeBoardAtomically(result.board);
    console.log(
      `[kanban] сохранено: ${result.cardCount} карточек → board.json`,
    );
    sendJson(req, res, 200, {
      ok: true,
      savedAt: new Date().toISOString(),
      cards: result.cardCount,
    });
    return;
  }

  res.setHeader('Allow', 'GET, HEAD, PUT');
  sendJson(req, res, 405, {
    error: `Метод ${method} не поддерживается. Используйте GET или PUT.`,
  });
}

/* ------------------------------------------------------------------ */
/* Статика                                                             */
/* ------------------------------------------------------------------ */

async function serveStatic(req, res, url) {
  const method = req.method ?? 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    sendText(req, res, 405, '405 — метод не поддерживается.');
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    sendText(req, res, 400, '400 — некорректный URL.');
    return;
  }

  if (pathname.includes('\0')) {
    sendText(req, res, 400, '400 — некорректный URL.');
    return;
  }

  if (pathname === '/' || pathname === '') pathname = '/index.html';

  let filePath = path.resolve(PUBLIC_DIR, `.${pathname}`);
  const relative = path.relative(PUBLIC_DIR, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    sendText(req, res, 404, '404 — файл не найден.');
    return;
  }

  let info;
  try {
    info = await stat(filePath);
  } catch {
    sendText(req, res, 404, '404 — файл не найден.');
    return;
  }

  if (info.isDirectory()) {
    filePath = path.join(filePath, 'index.html');
    try {
      info = await stat(filePath);
    } catch {
      sendText(req, res, 404, '404 — файл не найден.');
      return;
    }
  }

  if (!info.isFile()) {
    sendText(req, res, 404, '404 — файл не найден.');
    return;
  }

  const contentType =
    MIME_TYPES.get(path.extname(filePath).toLowerCase()) ??
    'application/octet-stream';

  res.writeHead(200, {
    ...baseHeaders(),
    'Content-Type': contentType,
    'Content-Length': info.size,
    'Cache-Control': 'no-cache',
  });

  if (method === 'HEAD') {
    res.end();
    return;
  }

  const stream = createReadStream(filePath);
  stream.on('error', (error) => {
    console.error(`[kanban] не удалось прочитать ${filePath}:`, error.message);
    res.destroy();
  });
  stream.pipe(res);
}

/* ------------------------------------------------------------------ */
/* Роутинг и запуск                                                    */
/* ------------------------------------------------------------------ */

async function handleRequest(req, res) {
  const method = req.method ?? 'GET';
  let url;
  try {
    url = new URL(req.url ?? '/', `http://${HOST}:${PORT}`);
  } catch {
    sendText(req, res, 400, '400 — некорректный URL.');
    return;
  }

  if (url.pathname === '/api/board') {
    await handleBoardApi(req, res, method);
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    sendJson(req, res, 404, { error: 'Неизвестный API-эндпоинт.' });
    return;
  }

  await serveStatic(req, res, url);
}

const server = createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    if (error instanceof HttpError) {
      sendJson(req, res, error.status, { error: error.message });
      return;
    }
    console.error('[kanban] внутренняя ошибка:', error);
    sendJson(req, res, 500, { error: 'Внутренняя ошибка сервера.' });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[kanban] Syntonia kanban → http://${HOST}:${PORT}`);
  console.log(`[kanban] доска: ${BOARD_FILE}`);
  console.log('[kanban] остановить: Ctrl+C');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `[kanban] порт ${PORT} уже занят. Остановите процесс на этом порту и запустите снова.`,
    );
  } else {
    console.error('[kanban] не удалось запустить сервер:', error);
  }
  process.exitCode = 1;
});

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[kanban] ${signal}: останавливаю сервер…`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
