'use strict';

/*
 * Ядро сайта с решениями.
 *
 * Каждая работа — файл в labs/, который вызывает registerLab({...}).
 * Код задач хранится строкой: он же показывается в редакторе и он же
 * исполняется, поэтому правка в редакторе сразу меняет результат.
 */

const LABS = [];

/** Публичный репозиторий с решениями; у каждой работы есть ссылка на свой файл. */
const REPOSITORY = 'https://github.com/ggwplarin/stud-algorithms-js';

function registerLab(lab) {
  LABS.push(lab);
}

/* ======================= Запуск кода ======================= */

/** Имя функции, которую нужно вызвать: task.entry или первая объявленная. */
function entryName(task) {
  if (task.entry) return task.entry;
  const match = /function\s+([\w$]+)/.exec(task.code);
  if (!match) throw new Error('В коде не найдено объявление функции');
  return match[1];
}

/** Собирает исполняемый текст: общий код работы + код задачи. */
function buildSource(shared, code, entry) {
  return `${shared || ''}\n${code}\nreturn ${entry};`;
}

/** Синхронный запуск (используется в тестах и как запасной вариант). */
function runSource(source, args) {
  const fn = new Function(source)();
  return fn(...args);
}

const WORKER_URL = URL.createObjectURL(new Blob([`
  onmessage = (event) => {
    const { source, args } = event.data;
    let value;
    try {
      value = new Function(source)()(...args);
    } catch (error) {
      postMessage({ ok: false, error: error && error.message ? error.message : String(error) });
      return;
    }
    try {
      postMessage({ ok: true, value });
    } catch {
      postMessage({ ok: true, value: String(value) });
    }
  };
`], { type: 'text/javascript' }));

/**
 * Выполняет код в Web Worker, чтобы бесконечный цикл, набранный во время
 * правки, не подвешивал страницу. Новый запуск отменяет предыдущий.
 */
class Runner {
  constructor(timeout = 2000) {
    this.timeout = timeout;
    this.worker = null;
    this.cancel = null;
  }

  run(source, args) {
    if (this.cancel) this.cancel();

    return new Promise((resolve) => {
      let worker;
      try {
        worker = this.worker ??= new Worker(WORKER_URL);
      } catch {
        // Worker недоступен (например, строгие настройки file://) — выполняем на месте.
        try {
          resolve({ ok: true, value: runSource(source, args) });
        } catch (error) {
          resolve({ ok: false, error: error.message });
        }
        return;
      }

      const finish = (result) => {
        clearTimeout(timer);
        worker.onmessage = null;
        this.cancel = null;
        resolve(result);
      };
      const kill = () => {
        worker.terminate();
        this.worker = null;
      };
      const timer = setTimeout(() => {
        kill();
        finish({ ok: false, error: `Выполнение дольше ${this.timeout / 1000} с — возможно, бесконечный цикл` });
      }, this.timeout);

      this.cancel = () => {
        kill();
        finish({ ok: false, cancelled: true });
      };
      worker.onmessage = (event) => finish(event.data);
      worker.postMessage({ source, args });
    });
  }
}

/* ======================= Вспомогательные функции ======================= */

/**
 * Делит общий код работы на объявления верхнего уровня: [{ name, code }].
 * Комментарии над объявлением относятся к нему.
 */
function splitDeclarations(source) {
  const declarations = [];
  let comments = [];
  for (const line of source.split('\n')) {
    const start = /^(?:function\s+|const\s+|let\s+|class\s+)([\w$]+)/.exec(line);
    if (start) {
      declarations.push({ name: start[1], lines: [...comments, line] });
      comments = [];
    } else if (line.startsWith('//')) {
      comments.push(line);
    } else if (declarations.length) {
      declarations.at(-1).lines.push(line);
    }
  }
  return declarations.map(({ name, lines }) => ({ name, code: lines.join('\n').trim() }));
}

const mentions = (code, name) => new RegExp(`(^|[^\\w$.])${name.replace(/\$/g, '\\$')}(?![\\w$])`).test(code);

/** Объявления из общего кода, которые использует задача (с учётом вложенных вызовов). */
function usedHelpers(code, shared) {
  const declarations = splitDeclarations(shared);
  const used = new Set();
  let scope = code;
  let added = true;
  while (added) {
    added = false;
    for (const declaration of declarations) {
      if (!used.has(declaration) && mentions(scope, declaration.name)) {
        used.add(declaration);
        scope += '\n' + declaration.code;
        added = true;
      }
    }
  }
  return declarations.filter((d) => used.has(d));
}

/* ======================= Подсветка синтаксиса ======================= */

const KEYWORDS = new Set((
  'const let var function return if else for while do of in new class ' +
  'extends throw try catch finally break continue switch case default ' +
  'typeof instanceof this null undefined true false static get set'
).split(' '));

const TOKEN_RE = new RegExp([
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/.source,                       // 1 комментарий
  /('(?:\\.|[^'\\\n])*'?|"(?:\\.|[^"\\\n])*"?|`(?:\\.|[^`\\])*`?)/.source, // 2 строка
  /\b(\d+(?:\.\d+)?(?:e[+-]?\d+)?n?)\b/.source,                  // 3 число
  /([A-Za-z_$][\w$]*)(?=\s*\()/.source,                          // 4 вызов
  /([A-Za-z_$][\w$]*)/.source,                                   // 5 слово
].join('|'), 'g');

const escapeHtml = (text) =>
  text.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[ch]);

function highlight(code) {
  let html = '';
  let last = 0;
  for (const match of code.matchAll(TOKEN_RE)) {
    html += escapeHtml(code.slice(last, match.index));
    const [text, comment, string, number, call, word] = match;
    let cls = null;
    if (comment) cls = 'com';
    else if (string) cls = 'str';
    else if (number) cls = 'num';
    else if (KEYWORDS.has(call || word)) cls = 'kw';
    else if (call) cls = 'fn';
    html += cls ? `<span class="tok-${cls}">${escapeHtml(text)}</span>` : escapeHtml(text);
    last = match.index + text.length;
  }
  // Завершающий перевод строки нужен, чтобы высота подложки совпадала с textarea.
  return html + escapeHtml(code.slice(last)) + '\n';
}

/* ======================= Форматирование значений ======================= */

function formatNumber(n) {
  return Number.isInteger(n) || !Number.isFinite(n) ? String(n) : String(+n.toPrecision(12));
}

function formatPlain(value) {
  if (typeof value === 'number') return formatNumber(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(formatPlain).join(', ')}]`;
  if (value === undefined) return '—';
  if (value === null) return 'null';
  if (typeof value === 'object') {
    const fields = Object.entries(value).map(([k, v]) => `${k}: ${formatPlain(v)}`);
    return `{ ${fields.join(', ')} }`;
  }
  return String(value);
}

const isMatrix = (v) =>
  Array.isArray(v) && v.length > 0 &&
  v.every((row) => Array.isArray(row) && row.every((x) => typeof x !== 'object'));

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children.flat(Infinity));
  return node;
}

/**
 * Абзацы пояснения: пустая строка разделяет абзацы, `код` выделяется моноширинным.
 */
function prose(text) {
  return text.trim().split(/\n\s*\n/).map((paragraph) =>
    el('p', {}, paragraph.split(/`([^`]+)`/).map((part, i) => (i % 2 ? el('code', {}, part) : part))));
}

/** HTML-представление результата. */
function renderValue(value) {
  if (typeof value === 'string') return el('div', { style: 'white-space: pre-wrap' }, value);
  if (isMatrix(value)) {
    return el('table', {}, value.map((row) =>
      el('tr', {}, row.map((x) => el('td', {}, formatPlain(x))))));
  }
  if (Array.isArray(value) && value.length > 3 && value.every((x) => typeof x === 'string')) {
    return el('ol', {}, value.map((x) => el('li', {}, x)));
  }
  return el('div', {}, formatPlain(value));
}

/* ======================= Форматы полей ввода ======================= */

/** Значение токена: число, если это число, иначе строка. */
function scalar(token) {
  const n = Number(token);
  return token !== '' && !Number.isNaN(n) ? n : token;
}

function parseNumber(raw) {
  const text = raw.trim().replace(',', '.');
  const n = Number(text);
  if (text === '' || Number.isNaN(n)) throw new Error('ожидается число');
  return n;
}

/** «1 2 3», «1, 2, 3» или JSON → массив чисел. */
function parseList(raw) {
  const text = raw.trim();
  if (text.startsWith('[')) return parseJson(text);
  if (text === '') return [];
  return text.split(/[\s,;]+/).filter(Boolean).map((token) => {
    const n = Number(token);
    if (Number.isNaN(n)) throw new Error(`«${token}» — не число`);
    return n;
  });
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('неверный JSON');
  }
}

/** Дерево по уровням: «2 1 3 - 4», где «-» — отсутствующий узел. */
function treeToText(root) {
  const tokens = [];
  const queue = [root];
  while (queue.length) {
    const node = queue.shift();
    tokens.push(node ? String(node.value) : '-');
    if (node) queue.push(node.left ?? null, node.right ?? null);
  }
  while (tokens.at(-1) === '-') tokens.pop();
  return tokens.join(' ');
}

function textToTree(raw) {
  const tokens = raw.trim().split(/[\s,]+/).filter(Boolean);
  const make = (token) => (token === undefined || token === '-' ? null : { value: scalar(token), left: null, right: null });
  const root = make(tokens[0]);
  const queue = root ? [root] : [];
  let i = 1;
  while (queue.length && i < tokens.length) {
    const node = queue.shift();
    node.left = make(tokens[i++]);
    node.right = make(tokens[i++]);
    for (const child of [node.left, node.right]) if (child) queue.push(child);
  }
  return root;
}

function countNodes(node) {
  return node ? 1 + countNodes(node.left) + countNodes(node.right) : 0;
}

/**
 * Визуальный редактор дерева: рисует дерево в SVG.
 * «+» добавляет потомка, клик по узлу меняет значение, пустое значение удаляет узел.
 */
function treeWidget({ commit }) {
  const STEP_X = 40;
  const STEP_Y = 52;
  const PAD = 22;
  const canvas = el('div');
  const box = el('div', { className: 'tree-view' }, canvas);
  let tree = null;
  let items = [];

  // Раскладка: x — порядок симметричного обхода (вместе с пустыми местами), y — глубина.
  function layout(root) {
    const result = [];
    let column = 0;
    const walk = (node, path, depth, parent) => {
      const item = { path, depth, parent, node };
      if (node) walk(node.left, path + 'L', depth + 1, item);
      item.x = PAD + STEP_X * column++;
      item.y = PAD + 20 + STEP_Y * depth; // +20 — место для подписей и номеров над корнем
      result.push(item);
      if (node) walk(node.right, path + 'R', depth + 1, item);
    };
    walk(root, '', 0, null);
    return result;
  }

  function render() {
    items = layout(tree);
    const width = Math.max(...items.map((i) => i.x)) + PAD;
    const height = Math.max(...items.map((i) => i.y)) + PAD + 16; // +16 — подписи под нижним рядом
    const esc = (t) => escapeHtml(String(t)).replace(/"/g, '&quot;');
    const edges = items.filter((i) => i.parent).map((i) =>
      `<line class="${i.node ? 'edge' : 'edge slot'}" data-from="${i.parent.path}" data-to="${i.path}" x1="${i.parent.x}" y1="${i.parent.y}" x2="${i.x}" y2="${i.y}"/>`);
    const nodes = items.map((i) => (i.node
      ? `<g class="node" data-path="${i.path}"><circle cx="${i.x}" cy="${i.y}" r="15"/><text x="${i.x}" y="${i.y}">${esc(i.node.value)}</text></g>`
      : `<g class="node slot" data-path="${i.path}"><circle cx="${i.x}" cy="${i.y}" r="10"/><text x="${i.x}" y="${i.y}">+</text></g>`));
    // Перерисовывается только холст: открытое поле редактирования не затрагивается.
    canvas.innerHTML = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
      + '<defs><marker id="trace-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
      + '<path d="M0 0 L10 5 L0 10 z"/></marker></defs>'
      + `${edges.join('')}${nodes.join('')}<g class="relation-layer"></g><g class="trace-layer"></g></svg>`;
  }

  /** Меняет узел по пути из 'L'/'R': value === null — удалить. */
  function apply(path, value) {
    const next = structuredClone(tree);
    const created = { value, left: null, right: null };
    if (path === '') return value === null ? null : next ? Object.assign(next, { value }) : created;
    let parent = next;
    for (const step of path.slice(0, -1)) parent = step === 'L' ? parent.left : parent.right;
    const side = path.at(-1) === 'L' ? 'left' : 'right';
    if (value === null) parent[side] = null;
    else if (parent[side]) parent[side].value = value;
    else parent[side] = created;
    return next;
  }

  function edit(item) {
    const input = el('input', { className: 'tree-edit', value: item.node ? String(item.node.value) : '' });
    // Координаты узла — внутри SVG; SVG отцентрирован в рамке. Поле не выходит за левый край.
    const svgRect = box.querySelector('svg').getBoundingClientRect();
    const boxRect = box.getBoundingClientRect();
    const offsetX = svgRect.left - boxRect.left + box.scrollLeft;
    const offsetY = svgRect.top - boxRect.top;
    Object.assign(input.style, {
      left: `${Math.max(offsetX + item.x, 32)}px`,
      top: `${offsetY + item.y}px`,
    });
    let done = false;
    const finish = (save) => {
      if (done) return;
      done = true;
      input.remove();
      const raw = input.value.trim();
      if (!save || (!item.node && raw === '')) return;
      commit(apply(item.path, raw === '' ? null : scalar(raw)));
    };
    // Ввод в поле узла не должен всплывать до формы: иначе задача пересчитается
    // и перерисует дерево посреди правки.
    input.addEventListener('input', (e) => e.stopPropagation());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') finish(false);
    });
    input.addEventListener('blur', () => finish(true));
    box.append(input);
    input.focus();
    input.select();
  }

  /** Подписи «родитель», «левый», «правый» вокруг узла под курсором. */
  function showRelations(path) {
    const item = items.find((i) => i.path === path && i.node);
    const layer = canvas.querySelector('.relation-layer');
    if (!item || !layer) return clearRelations();
    const related = new Map();
    if (item.parent) related.set(item.parent.path, ['parent', 'родитель', -1]);
    for (const child of items.filter((i) => i.parent === item)) {
      const left = child.path.endsWith('L');
      related.set(child.path, [left ? 'left' : 'right', left ? 'левый' : 'правый', 1]);
    }

    const pill = (x, y, role, text, direction) => {
      const width = text.length * 6.4 + 12;
      const top = direction < 0 ? y - 34 : y + 20;
      return `<g class="relation ${role}"><rect x="${x - width / 2}" y="${top}" width="${width}" height="15" rx="7.5"/>`
        + `<text x="${x}" y="${top + 7.5}">${text}</text></g>`;
    };
    const labels = [...related].map(([p, [role, text, direction]]) => {
      const target = items.find((i) => i.path === p);
      return pill(target.x, target.y, role, text, direction);
    });
    if (!item.parent) labels.push(pill(item.x, item.y, 'self', 'корень', -1));
    layer.innerHTML = labels.join('');

    box.classList.add('relating');
    for (const g of canvas.querySelectorAll('.node')) {
      const [role] = related.get(g.dataset.path) ?? [g.dataset.path === path ? 'self' : null];
      g.dataset.role = role ?? '';
    }
    for (const line of canvas.querySelectorAll('line')) {
      const role = line.dataset.from === path ? related.get(line.dataset.to)?.[0]
        : line.dataset.to === path ? 'parent' : '';
      line.dataset.role = role ?? '';
    }
  }

  function clearRelations() {
    const layer = canvas.querySelector('.relation-layer');
    if (layer) layer.innerHTML = '';
    box.classList.remove('relating');
    for (const g of canvas.querySelectorAll('[data-role]')) g.dataset.role = '';
  }

  canvas.addEventListener('mouseover', (event) => {
    const node = event.target.closest('.node:not(.slot)');
    if (node) showRelations(node.dataset.path);
    else clearRelations();
  });
  canvas.addEventListener('mouseleave', clearRelations);

  box.addEventListener('click', (event) => {
    const target = event.target.closest('[data-path]');
    if (target) edit(items.find((i) => i.path === target.dataset.path));
  });

  // Пути узлов в порядке обхода: 'pre' | 'in' | 'post'.
  function orderOf(kind) {
    const result = [];
    const walk = (node, path) => {
      if (!node) return;
      if (kind === 'pre') result.push(path);
      walk(node.left, path + 'L');
      if (kind === 'in') result.push(path);
      walk(node.right, path + 'R');
      if (kind === 'post') result.push(path);
    };
    walk(tree, '');
    return result;
  }

  /**
   * Рисует траекторию поверх дерева. Узлы сопоставляются фактическому выводу кода;
   * при одинаковых значениях берётся узел, который раньше идёт в обходе данного вида.
   */
  function trace(values, kind) {
    const layer = canvas.querySelector('.trace-layer');
    if (!layer || !Array.isArray(values)) return;
    const byPath = new Map(items.filter((i) => i.node).map((i) => [i.path, i]));
    const candidates = orderOf(kind);
    const used = new Set();
    const route = [];
    for (const value of values) {
      const path = candidates.find((p) => !used.has(p) && String(byPath.get(p).node.value) === String(value));
      if (path === undefined) continue;
      used.add(path);
      route.push(byPath.get(path));
    }

    const R = 17;
    const arrows = route.slice(1).map((to, k) => {
      const from = route[k];
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.hypot(dx, dy) || 1;
      const [ux, uy] = [dx / length, dy / length];
      // Дуга, отогнутая в сторону от ребра дерева, чтобы не сливаться с ним.
      const bend = Math.min(28, length * 0.25);
      const cx = (from.x + to.x) / 2 - uy * bend;
      const cy = (from.y + to.y) / 2 + ux * bend;
      const start = [from.x + ux * R, from.y + uy * R];
      const end = [to.x - ux * R, to.y - uy * R];
      return `<path class="trace-step" style="animation-delay:${k * 90}ms" d="M${start} Q${cx},${cy} ${end}" marker-end="url(#trace-arrow)"/>`;
    });
    const badges = route.map((item, k) =>
      `<g class="trace-badge" style="animation-delay:${k * 90}ms"><circle cx="${item.x + 14}" cy="${item.y - 14}" r="8"/>`
      + `<text x="${item.x + 14}" y="${item.y - 14}">${k + 1}</text></g>`);
    layer.innerHTML = arrows.join('') + badges.join('');
    box.classList.add('tracing');
    for (const g of canvas.querySelectorAll('.node[data-path]')) {
      g.classList.toggle('on-route', used.has(g.dataset.path));
    }
  }

  function clearTrace() {
    const layer = canvas.querySelector('.trace-layer');
    if (layer) layer.innerHTML = '';
    box.classList.remove('tracing');
  }

  return {
    element: box,
    update(value) {
      tree = value;
      render();
    },
    trace,
    clearTrace,
  };
}

/**
 * Редактор и наглядное состояние очереди.
 * Список операций правится кнопками; под ним — очередь после всех операций или,
 * при наведении на шаг, состояние после этого шага (по фактическому выводу кода).
 */
function queueWidget({ commit }) {
  const OPERATIONS = ['dequeue', 'peek', 'size', 'isEmpty'];
  let ops = [];
  let log = [];

  const list = el('ol', { className: 'q-ops' });
  const valueInput = el('input', { className: 'q-value', placeholder: 'значение' });
  const enqueue = () => {
    const raw = valueInput.value.trim();
    if (raw === '') return valueInput.focus();
    valueInput.value = '';
    commit([...ops, ['enqueue', scalar(raw)]]);
    valueInput.focus();
  };
  valueInput.addEventListener('input', (e) => e.stopPropagation());
  valueInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); enqueue(); }
  });
  const adder = el('div', { className: 'q-adder' },
    valueInput,
    el('button', { type: 'button', onclick: enqueue }, 'enqueue'),
    OPERATIONS.map((name) => el('button', { type: 'button', onclick: () => commit([...ops, [name]]) }, name)));
  const view = el('div', { className: 'q-view' });
  const box = el('div', { className: 'queue-view' }, list, adder, view);

  function renderList() {
    list.replaceChildren(...ops.map(([name, value], i) => {
      const row = el('li', { className: 'q-op' }, el('code', {}, name));
      if (name === 'enqueue') {
        const input = el('input', { className: 'q-value', value: String(value) });
        input.addEventListener('input', (e) => e.stopPropagation());
        input.addEventListener('change', () => {
          const raw = input.value.trim();
          commit(ops.map((op, k) => (k === i ? (raw === '' ? null : ['enqueue', scalar(raw)]) : op)).filter(Boolean));
        });
        row.append(input);
      }
      row.append(el('button', {
        type: 'button', className: 'q-remove', title: 'Удалить операцию',
        onclick: () => commit(ops.filter((_, k) => k !== i)),
      }, '×'));
      row.addEventListener('mouseenter', () => step(i));
      row.addEventListener('mouseleave', () => step(null));
      return row;
    }));
  }

  /** Содержимое очереди из строки журнала («…; очередь: [...]»). */
  function stateAt(i) {
    const line = log[i];
    const at = typeof line === 'string' ? line.lastIndexOf('очередь: ') : -1;
    if (at < 0) return null;
    try {
      return JSON.parse(line.slice(at + 'очередь: '.length));
    } catch {
      return null;
    }
  }

  const show = (value) => (typeof value === 'string' ? value : JSON.stringify(value));

  function draw(state, { removed, mark, caption, error } = {}) {
    if (!state) {
      view.replaceChildren(el('div', { className: 'q-caption' }, 'Состояние появится после выполнения кода'));
      return;
    }
    const cells = state.map((value, k) => el('div', {
      className: 'q-cell' + (mark === 'last' && k === state.length - 1 ? ' added' : '') + (mark === 'first' && k === 0 ? ' peeked' : ''),
    },
    k === 0 ? el('span', { className: 'q-tag' }, 'начало') : '',
    k === state.length - 1 ? el('span', { className: 'q-tag end' }, 'конец') : '',
    show(value)));
    if (removed !== undefined) cells.unshift(el('div', { className: 'q-cell removed' }, show(removed)));
    view.replaceChildren(
      el('div', { className: 'q-strip' },
        el('span', { className: 'q-io' }, 'выход ←'),
        cells.length ? cells : el('div', { className: 'q-empty' }, 'пусто'),
        el('span', { className: 'q-io' }, '← вход')),
      el('div', { className: 'q-caption' + (error ? ' error' : '') }, caption));
  }

  function step(i) {
    list.querySelectorAll('.q-op').forEach((row, k) => row.classList.toggle('current', k === i));
    if (i === null || i === undefined) {
      draw(stateAt(log.length - 1) ?? (log.length ? null : []), { caption: 'После всех операций' });
      return;
    }
    const [name, value] = ops[i] ?? [];
    const before = i > 0 ? stateAt(i - 1) ?? [] : [];
    const after = stateAt(i);
    const line = String(log[i] ?? '');
    const failed = line.includes('ошибка');
    const caption = `Шаг ${i + 1}: ${name}${name === 'enqueue' ? ' ' + show(value) : ''}`;
    if (failed) return draw(after, { caption: `${caption} — ${line.split('; очередь')[0].split(': ').slice(1).join(': ')}`, error: true });
    if (name === 'enqueue') return draw(after, { mark: 'last', caption: `${caption} — элемент встаёт в конец` });
    if (name === 'dequeue') return draw(after, { removed: before[0], caption: `${caption} — первый элемент покидает очередь` });
    if (name === 'peek') return draw(after, { mark: 'first', caption: `${caption} — смотрим на начало, очередь не меняется` });
    if (name === 'size') return draw(after, { caption: `${caption} — в очереди ${after?.length ?? 0}` });
    return draw(after, { caption: `${caption} — ${after?.length ? 'очередь не пуста' : 'очередь пуста'}` });
  }

  return {
    element: box,
    update(value) {
      ops = value;
      renderList();
    },
    result(value) {
      log = Array.isArray(value) ? value : [];
      step(null);
    },
    trace: (_, i) => step(i),
    clearTrace: () => step(null),
  };
}

/* ======================= Случайные данные ======================= */

const randomInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

/** Диапазон значений по текущим данным: без нулей и отрицательных, если их там нет. */
function rangeFor(values) {
  if (values.length && values.every((x) => x >= 1)) return [1, 9];
  if (values.length && values.every((x) => x >= 0)) return [0, 9];
  return [-9, 9];
}

/**
 * Случайный массив той же длины. Вид данных задаёт param.random:
 * 'sorted' — по возрастанию без повторов (для бинарного поиска),
 * 'duplicatePair' — ровно два равных элемента,
 * 'progression' — через раз арифметическая прогрессия, иначе разные числа.
 */
function randomList(current, param) {
  const length = Math.max(current.length || param.value.length || 5, 1);
  const [lo, hi] = rangeFor(current);
  if (param.random === 'sorted') {
    let value = randomInt(-5, 5);
    return Array.from({ length }, () => (value += randomInt(1, 4)));
  }
  if (param.random === 'progression' && Math.random() < 0.5) {
    const start = randomInt(-9, 9);
    const step = randomInt(1, 5) * (Math.random() < 0.5 ? -1 : 1);
    return Array.from({ length }, (_, i) => start + i * step);
  }
  if (param.random === 'duplicatePair' || param.random === 'progression') {
    // Разные числа: перемешанный диапазон, при нехватке — расширенный.
    const pool = Array.from({ length: Math.max(hi - lo + 1, length) }, (_, i) => lo + i);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = randomInt(0, i);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const values = pool.slice(0, length);
    if (param.random === 'duplicatePair' && length >= 2) {
      const i = randomInt(0, length - 2);
      values[randomInt(i + 1, length - 1)] = values[i];
    }
    return values;
  }
  return Array.from({ length }, () => randomInt(lo, hi));
}

/** Случайная матрица того же размера. */
function randomMatrix(current, param) {
  const source = current.length ? current : param.value;
  const columns = Math.max(...source.map((row) => row.length), 1);
  const [lo, hi] = rangeFor(source.flat());
  return source.map(() => Array.from({ length: columns }, () => randomInt(lo, hi)));
}

const CODECS = {
  number: {
    compact: true,
    format: String,
    parse: parseNumber,
  },
  text: {
    format: String,
    parse: (raw) => raw,
  },
  list: {
    placeholder: 'числа через пробел',
    format: (v) => v.join(' '),
    parse: parseList,
    random: randomList,
    hint: (v) => `${v.length} ${plural(v.length, 'элемент', 'элемента', 'элементов')}`,
  },
  point: {
    compact: true,
    placeholder: 'x y',
    format: (v) => v.join(' '),
    parse: (raw) => {
      const point = parseList(raw);
      if (point.length !== 2) throw new Error('ожидаются две координаты: x y');
      return point;
    },
  },
  matrix: {
    multiline: true,
    placeholder: 'каждая строка матрицы — с новой строки',
    format: (v) => v.map((row) => row.join(' ')).join('\n'),
    parse: (raw) => (raw.trim().startsWith('[')
      ? parseJson(raw)
      : raw.split('\n').map((line) => line.trim()).filter(Boolean).map(parseList)),
    random: randomMatrix,
    hint: (v) => {
      const ragged = v.some((row) => row.length !== v[0].length);
      return ragged ? 'строки разной длины' : `${v.length} × ${v[0]?.length ?? 0}`;
    },
  },
  tree: {
    placeholder: 'значения по уровням, «-» — нет узла',
    format: treeToText,
    parse: textToTree,
    widget: treeWidget,
    hidden: true,
    hint: (v) => `${countNodes(v)} ${plural(countNodes(v), 'узел', 'узла', 'узлов')} · «+» — добавить узел, клик по узлу — изменить значение, пустое значение — удалить узел с поддеревом`,
  },
  operations: {
    multiline: true,
    placeholder: 'enqueue 5',
    format: (ops) => ops.map((op) => op.join(' ')).join('\n'),
    parse: (raw) => raw.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      const [name, ...rest] = line.split(/\s+/);
      return rest.length ? [name, scalar(rest.join(' '))] : [name];
    }),
    widget: queueWidget,
    hidden: true,
    hint: (ops) => `${ops.length} ${plural(ops.length, 'операция', 'операции', 'операций')} · наведите на операцию или строку результата, чтобы увидеть очередь на этом шаге`,
  },
  json: {
    format: (v) => JSON.stringify(v),
    parse: parseJson,
  },
};

/* ======================= Визуализации результата ======================= */

/**
 * Ханойская башня: начальное положение и положение после каждого хода — одно под другим.
 * Ходы берутся из фактического вывода кода и проверяются по правилам головоломки.
 */
function hanoiVisual() {
  const PEGS = ['A', 'B', 'C'];
  const WIDTH = 330;
  const PEG_X = { A: 55, B: 165, C: 275 };
  const MAX_FRAMES = 128; // начальное положение + первые 127 ходов (n ≤ 7 целиком)
  const list = el('ol', { className: 'hanoi-frames' });
  const note = el('div', { className: 'hanoi-note' });
  const box = el('div', { className: 'hanoi-view' }, list, note);
  let frames = [];

  /** Положения после каждого хода; нарушения правил отмечаются, но ход показывается. */
  function simulate(n, lines) {
    const pegs = { A: Array.from({ length: n }, (_, i) => n - i), B: [], C: [] };
    const snapshot = () => ({ A: [...pegs.A], B: [...pegs.B], C: [...pegs.C] });
    const result = [{ state: snapshot(), move: null }];
    for (const line of lines.slice(0, MAX_FRAMES - 1)) {
      const match = /([ABC])\s*(?:→|->)\s*([ABC])/.exec(String(line));
      if (!match) {
        result.push({ state: snapshot(), move: { error: `не удалось разобрать ход «${line}»` } });
        continue;
      }
      const [, from, to] = match;
      const disk = pegs[from].at(-1);
      let error = null;
      if (disk === undefined) error = `стержень ${from} пуст`;
      else if (pegs[to].length && pegs[to].at(-1) < disk) error = `диск ${disk} нельзя класть на меньший диск ${pegs[to].at(-1)}`;
      if (disk !== undefined) pegs[to].push(pegs[from].pop());
      result.push({ state: snapshot(), move: { from, to, disk, error } });
    }
    return result;
  }

  function drawing(n, { state, move }, defs = '') {
    const diskH = Math.max(5, Math.min(12, 84 / Math.max(n, 1)));
    const baseY = 18 + (n + 1) * diskH;
    const height = baseY + 18;
    const diskWidth = (d) => 24 + 72 * (n > 1 ? (d - 1) / (n - 1) : 1);
    const parts = [`<line class="hanoi-base" x1="10" y1="${baseY}" x2="${WIDTH - 10}" y2="${baseY}"/>`];
    for (const peg of PEGS) {
      const x = PEG_X[peg];
      parts.push(`<rect class="hanoi-peg" x="${x - 2}" y="${baseY - (n + 1) * diskH - 4}" width="4" height="${(n + 1) * diskH + 4}" rx="2"/>`);
      parts.push(`<text class="hanoi-label" x="${x}" y="${baseY + 13}">${peg}</text>`);
      state[peg].forEach((d, level) => {
        const w = diskWidth(d);
        const y = baseY - (level + 1) * diskH;
        const moved = move?.disk !== undefined && peg === move.to && level === state[peg].length - 1;
        const hue = 205 + (n > 1 ? (140 * (d - 1)) / (n - 1) : 0);
        parts.push(`<rect class="hanoi-disk${moved ? ' moved' : ''}${moved && move.error ? ' wrong' : ''}" x="${x - w / 2}" y="${y + 1}" width="${w}" height="${diskH - 2}" rx="${Math.min(4, diskH / 2 - 1)}" style="fill:hsl(${hue} 60% 58%)"/>`);
        if (diskH >= 10) parts.push(`<text class="hanoi-num" x="${x}" y="${y + diskH / 2}">${d}</text>`);
      });
    }
    // Стрелка хода: от освободившегося места на источнике к переложенному диску.
    if (move?.disk !== undefined) {
      const x1 = PEG_X[move.from];
      const x2 = PEG_X[move.to];
      const fromTop = baseY - (state[move.from].length + 1) * diskH;
      const toTop = baseY - state[move.to].length * diskH;
      const peak = Math.min(fromTop, toTop) - 14;
      parts.push(`<path class="hanoi-arrow${move.error ? ' wrong' : ''}" d="M${x1},${fromTop} Q${(x1 + x2) / 2},${peak - 10} ${x2},${toTop - 3}" marker-end="url(#hanoi-arrow)"/>`);
    }
    return `<svg viewBox="0 0 ${WIDTH} ${height}" width="${WIDTH}" height="${height}">${defs}${parts.join('')}</svg>`;
  }

  function describe(n, { move }, k, total, solved) {
    if (!move) return [`Начало: ${n} ${plural(n, 'диск', 'диска', 'дисков')} на A`, `ходов: ${total}, минимум ${2 ** n - 1}`];
    if (move.disk === undefined) return [`Ход ${k}`, move.error];
    const detail = move.error ? `ошибка: ${move.error}` : solved ? 'все диски на C — решено' : `диск ${move.disk}`;
    return [`Ход ${k}: ${move.from} → ${move.to}`, detail];
  }

  function highlight(index) {
    [...list.children].forEach((item, k) => item.classList.toggle('current', k === index));
  }

  return {
    element: box,
    result(value, args) {
      if (!Array.isArray(value)) {
        list.replaceChildren();
        note.textContent = 'Нет результата для показа';
        return;
      }
      const n = Math.max(0, Math.floor(Number(args?.[0]) || 0));
      frames = simulate(n, value);
      const marker = '<defs><marker id="hanoi-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z"/></marker></defs>';
      list.replaceChildren(...frames.map((frame, k) => {
        const solved = k === value.length && frame.state.C.length === n;
        const [title, detail] = describe(n, frame, k, value.length, solved);
        const item = el('li', { className: 'hanoi-frame' + (frame.move?.error ? ' error' : '') + (solved ? ' solved' : '') },
          el('div', { className: 'hanoi-text' }, el('strong', {}, title), el('span', {}, detail)),
          el('div', { className: 'hanoi-drawing' }));
        // Наконечник стрелки объявлен один раз, в первом рисунке, и доступен всем остальным.
        item.lastChild.innerHTML = drawing(n, frame, k === 0 ? marker : '');
        return item;
      }));
      const hidden = value.length - (frames.length - 1);
      note.textContent = hidden > 0 ? `Показаны первые ${frames.length - 1} ходов из ${value.length}; остальные — в списке результата.` : '';
    },
    trace: (_, i) => highlight(i + 1),
    clearTrace: () => highlight(-1),
  };
}

/**
 * Бинарный поиск: шаги один под другим.
 * Код запускается повторно с «прослушанным» массивом: обращения к элементам
 * показывают, какие середины на самом деле проверяла программа.
 */
function binarySearchVisual() {
  const list = el('ol', { className: 'steps' });
  const note = el('div', { className: 'steps-note' });
  const box = el('div', { className: 'steps-view' }, list, note);
  const show = (x) => (typeof x === 'string' ? JSON.stringify(x) : String(x));

  /** Индексы элементов, которые читал код (подряд идущие повторы схлопнуты). */
  function recordReads(source, array, target) {
    const reads = [];
    const spy = new Proxy(array, {
      get(items, key) {
        if (typeof key === 'string' && /^\d+$/.test(key)) {
          if (reads.at(-1) !== Number(key)) reads.push(Number(key));
          if (reads.length > 200) throw new Error('слишком много обращений к массиву');
        }
        return items[key];
      },
    });
    new Function(source)()(spy, target);
    return reads;
  }

  function strip(array, { lo, hi, mid, found }) {
    return el('div', { className: 'cells' }, array.map((value, i) => el('div', {
      className: 'cell'
        + (i < lo || i > hi ? ' out' : '')
        + (i === mid ? (found ? ' found' : ' mid') : ''),
    },
    el('span', { className: 'cell-value' }, show(value)),
    el('span', { className: 'cell-index' }, i),
    i === lo && lo <= hi ? el('span', { className: 'cell-mark lo' }, 'lo') : '',
    i === hi && lo <= hi ? el('span', { className: 'cell-mark hi' }, 'hi') : '')));
  }

  return {
    element: box,
    result(value, args, source) {
      list.replaceChildren();
      note.textContent = '';
      note.className = 'steps-note';
      const [array, target] = args ?? [];
      if (!Array.isArray(array) || value === undefined || value === null) {
        note.textContent = 'Нет результата для показа';
        return;
      }
      if (array.some((x, i) => i > 0 && x < array[i - 1])) {
        note.textContent = 'Массив не упорядочен по возрастанию — бинарный поиск на нём не гарантирует верный ответ.';
        note.className = 'steps-note error';
      }

      let reads;
      try {
        reads = recordReads(source, array, target);
      } catch (error) {
        note.textContent = `Не удалось повторить поиск: ${error.message}`;
        note.className = 'steps-note error';
        return;
      }

      // Границы восстанавливаются по сравнениям: так работает классический бинарный поиск.
      let lo = 0;
      let hi = array.length - 1;
      const rows = reads.map((mid, k) => {
        const current = array[mid];
        const found = current === target;
        let verdict;
        if (found) verdict = `a[${mid}] = ${show(current)} — найдено`;
        else if (current < target) verdict = `a[${mid}] = ${show(current)} < ${show(target)} → ищем справа`;
        else verdict = `a[${mid}] = ${show(current)} > ${show(target)} → ищем слева`;
        // Бинарный поиск проверяет середину диапазона; иначе это уже другой алгоритм.
        const middle = Math.floor((lo + hi) / 2);
        const offCenter = mid !== middle;
        if (offCenter) verdict += ` · проверен не средний элемент (середина — ${middle})`;
        const row = el('li', { className: 'step' + (found ? ' found' : '') + (offCenter ? ' off' : '') },
          el('div', { className: 'step-text' },
            el('strong', {}, `Шаг ${k + 1}: lo = ${lo}, hi = ${hi}, mid = ${mid}`),
            el('span', {}, verdict)),
          strip(array, { lo, hi, mid, found }));
        if (!found) {
          if (current < target) lo = mid + 1;
          else hi = mid - 1;
        }
        return row;
      });
      list.replaceChildren(...rows);

      const summary = value === -1
        ? `Диапазон пуст (lo = ${lo} > hi = ${hi}) — элемента ${show(target)} нет, ответ −1`
        : `Ответ: индекс ${value}`;
      const steps = `${reads.length} ${plural(reads.length, 'шаг', 'шага', 'шагов')}; линейному поиску в худшем случае понадобилось бы ${array.length}`;
      note.textContent = note.textContent || `${summary} · ${steps}`;
    },
  };
}

/* ---------- Сортировки: проходы один под другим ---------- */
/*
 * Код сортировок работает с копией массива, поэтому проходы проигрываются
 * по классическому алгоритму на тех же данных, а итог сверяется с результатом кода.
 * Каждая функция ниже возвращает { rows, sorted, summary }, где строка —
 * { title, detail, state, classOf(k) } — заголовок, пояснение, массив и оформление ячейки.
 */

function selectionPasses(input) {
  const a = [...input];
  const n = a.length;
  const rows = [];
  let comparisons = 0;
  let swaps = 0;
  for (let i = 0; i < n - 1; i++) {
    let min = i;
    for (let j = i + 1; j < n; j++) {
      comparisons++;
      if (a[j] < a[min]) min = j;
    }
    const found = a[min];
    const swapped = min !== i;
    if (swapped) {
      [a[i], a[min]] = [a[min], a[i]];
      swaps++;
    }
    // После последнего прохода на месте и последний элемент — массив отсортирован целиком.
    const sortedUpTo = i === n - 2 ? n : i + 1;
    rows.push({
      title: `Проход ${i + 1}`,
      detail: swapped
        ? `минимум среди a[${i}..${n - 1}] — ${showValue(found)} (индекс ${min}), меняем местами с a[${i}] = ${showValue(a[min])}`
        : `минимум среди a[${i}..${n - 1}] — ${showValue(found)}, он уже на своём месте`,
      state: [...a],
      classOf: (k) => (k < sortedUpTo ? ' sorted' : '') + (k === i ? ' placed' : '') + (swapped && k === min ? ' swapped' : ''),
    });
  }
  return {
    rows,
    sorted: a,
    summary: `Проходов: ${rows.length}, сравнений: ${comparisons} (всегда n(n − 1)/2), обменов: ${swaps}.`,
  };
}

function bubblePasses(input) {
  const a = [...input];
  const n = a.length;
  const rows = [];
  let comparisons = 0;
  let swaps = 0;
  let stoppedEarly = false;
  for (let end = n - 1; end > 0; end--) {
    const pairs = [];
    for (let i = 0; i < end; i++) {
      comparisons++;
      if (a[i] > a[i + 1]) {
        [a[i], a[i + 1]] = [a[i + 1], a[i]];
        pairs.push(i);
        swaps++;
      }
    }
    const pass = n - end;
    if (!pairs.length) {
      stoppedEarly = end > 1;
      rows.push({
        title: `Проход ${pass}`,
        detail: 'обменов не было — массив уже упорядочен, сортировка останавливается',
        state: [...a],
        classOf: () => ' sorted',
      });
      break;
    }
    const touched = new Set(pairs.flatMap((i) => [i, i + 1]));
    // На последнем проходе на месте оказывается и первый элемент.
    const sortedFrom = end === 1 ? 0 : end;
    rows.push({
      title: `Проход ${pass}`,
      detail: `${pairs.length} ${plural(pairs.length, 'обмен', 'обмена', 'обменов')} соседей; наибольший из оставшихся — ${showValue(a[end])} — «всплыл» на позицию ${end}`,
      state: [...a],
      classOf: (k) => (k >= sortedFrom ? ' sorted' : '') + (k === end ? ' placed' : '') + (touched.has(k) && k !== end ? ' swapped' : ''),
    });
  }
  return {
    rows,
    sorted: a,
    summary: `Проходов: ${rows.length}, сравнений: ${comparisons}, обменов: ${swaps}.`
      + (stoppedEarly ? ' Проход без обменов остановил сортировку раньше — лишние проходы не выполнялись.' : ''),
  };
}

function insertionPasses(input) {
  const a = [...input];
  const n = a.length;
  const rows = [];
  let comparisons = 0;
  let shifts = 0;
  for (let i = 1; i < n; i++) {
    const value = a[i];
    let j = i - 1;
    while (j >= 0) {
      comparisons++;
      if (a[j] <= value) break;
      a[j + 1] = a[j];
      j--;
    }
    a[j + 1] = value;
    const position = j + 1;
    const moved = i - position;
    shifts += moved;
    rows.push({
      title: `Шаг ${i}`,
      detail: moved
        ? `берём ${showValue(value)}, ${moved} ${plural(moved, 'больший элемент сдвигается', 'больших элемента сдвигаются', 'больших элементов сдвигаются')} вправо, вставляем на позицию ${position}`
        : `берём ${showValue(value)} — он не меньше соседа слева и остаётся на месте`,
      state: [...a],
      classOf: (k) => (k <= i ? ' sorted' : '') + (k === position ? ' placed' : '') + (k > position && k <= i ? ' swapped' : ''),
    });
  }
  return {
    rows,
    sorted: a,
    summary: `Шагов: ${rows.length}, сравнений: ${comparisons}, сдвигов: ${shifts}.`,
  };
}

const showValue = (x) => (typeof x === 'string' ? JSON.stringify(x) : String(x));

/** Общая визуализация сортировки по функции, описывающей её проходы. */
function sortVisual(passes) {
  const list = el('ol', { className: 'steps' });
  const note = el('div', { className: 'steps-note' });
  const box = el('div', { className: 'steps-view' }, list, note);

  const cells = (state, classOf = () => '') => el('div', { className: 'cells' }, state.map((value, k) =>
    el('div', { className: 'cell' + classOf(k) },
      el('span', { className: 'cell-value' }, showValue(value)),
      el('span', { className: 'cell-index' }, k))));
  const row = (title, detail, state, classOf) => el('li', { className: 'step' },
    el('div', { className: 'step-text' }, el('strong', {}, title), el('span', {}, detail)),
    cells(state, classOf));

  return {
    element: box,
    result(value, args) {
      list.replaceChildren();
      note.className = 'steps-note';
      const input = args?.[0];
      if (!Array.isArray(input) || !Array.isArray(value)) {
        note.textContent = 'Нет результата для показа';
        return;
      }
      const { rows, sorted, summary } = passes(input);
      const n = input.length;
      list.replaceChildren(
        row('Исходный массив', `${n} ${plural(n, 'элемент', 'элемента', 'элементов')}`, input),
        ...rows.map((r) => row(r.title, r.detail, r.state, r.classOf)));
      const matches = JSON.stringify(sorted) === JSON.stringify(value);
      note.textContent = matches
        ? `${summary} Итог совпадает с результатом кода.`
        : `Результат кода ${JSON.stringify(value)} не совпадает с ожидаемым ${JSON.stringify(sorted)}.`;
      if (!matches) note.className = 'steps-note error';
    },
  };
}

const VISUALS = {
  hanoi: hanoiVisual,
  binarySearch: binarySearchVisual,
  selectionSort: () => sortVisual(selectionPasses),
  bubbleSort: () => sortVisual(bubblePasses),
  insertionSort: () => sortVisual(insertionPasses),
};

/** Формат поля: явный param.kind или по типу значения по умолчанию. */
function codecFor(param) {
  const value = param.value;
  let kind = param.kind;
  if (!kind) {
    if (typeof value === 'number') kind = 'number';
    else if (typeof value === 'string') kind = 'text';
    else if (isMatrix(value) && value.flat().every((x) => typeof x === 'number')) kind = 'matrix';
    else if (Array.isArray(value) && value.every((x) => typeof x === 'number')) kind = 'list';
    else kind = 'json';
  }
  return { kind, ...CODECS[kind] };
}

/** ↑/↓ меняют число на 1, с Shift — на 10. */
function stepNumber(event, input) {
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
  event.preventDefault();
  const current = Number(input.value.replace(',', '.')) || 0;
  const step = (event.shiftKey ? 10 : 1) * (event.key === 'ArrowUp' ? 1 : -1);
  input.value = String(+(current + step).toPrecision(12));
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/* ======================= Компоненты ======================= */

/** Редактор кода: прозрачная textarea поверх подсвеченного <pre>. */
class CodeEditor extends HTMLElement {
  connectedCallback() {
    if (this.textarea) return;
    this.original = this.textContent.replace(/^\n/, '');
    this.textContent = '';

    this.pre = el('pre');
    this.textarea = el('textarea', { spellcheck: false, value: this.original });
    this.textarea.setAttribute('autocapitalize', 'off');
    this.textarea.setAttribute('autocomplete', 'off');
    const reset = el('button', { className: 'reset', type: 'button' }, 'сбросить');

    this.append(el('div', { className: 'wrap' }, this.pre, this.textarea), reset);

    this.textarea.addEventListener('input', () => this.changed());
    this.textarea.addEventListener('keydown', (e) => this.onKey(e));
    reset.addEventListener('click', () => {
      this.textarea.value = this.original;
      this.changed();
    });
    this.paint();
  }

  get value() {
    return this.textarea.value;
  }

  paint() {
    this.pre.innerHTML = highlight(this.value);
    this.classList.toggle('modified', this.value !== this.original);
  }

  changed() {
    this.paint();
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  onKey(event) {
    if (event.key !== 'Tab' || event.shiftKey) return;
    event.preventDefault();
    document.execCommand('insertText', false, '  ');
  }
}

/** Одна задача: условие, редактируемый код, поля ввода и результат. */
class LabTask extends HTMLElement {
  connectedCallback() {
    if (this.output) return;
    const { task, number } = this;

    let timer;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => this.run(), 250);
    };

    this.editor = el('code-editor', {}, task.code);
    this.helpers = el('details', { className: 'helpers', open: true, hidden: true });
    this.output = el('div', { className: 'out' });
    this.visual = this.task.visual ? VISUALS[this.task.visual]() : null;
    this.fields = (task.params || []).map((param) => this.makeField(param));

    this.append(
      el('h2', {}, el('span', { className: 'num' }, `${number}.`), task.title),
      task.text ? el('p', { className: 'cond' }, task.text) : '',
      task.explain ? el('div', { className: 'explain' }, prose(task.explain)) : '',
      this.editor,
      this.helpers,
      el('div', { className: this.fields.some((f) => f.wide) ? 'io stacked' : 'io' },
        el('form', { className: 'params', onsubmit: (e) => e.preventDefault(), oninput: () => schedule() },
          this.fields.map((f) => f.label)),
        this.output),
      this.visual ? this.visual.element : '',
    );

    this.editor.addEventListener('change', () => schedule());
    this.run();
  }

  makeField(param) {
    const codec = codecFor(param);
    const name = param.label || param.name;
    const text = codec.format(param.value);
    const input = el(codec.multiline ? 'textarea' : 'input', { value: text, spellcheck: false });
    if (codec.multiline) input.rows = Math.min(10, Math.max(3, text.split('\n').length + 1));
    if (codec.placeholder) input.placeholder = codec.placeholder;
    // Скрытое поле хранит значение, а редактируется оно только через виджет.
    if (codec.hidden) input.hidden = true;
    if (codec.kind === 'number') {
      input.inputMode = 'decimal';
      input.addEventListener('keydown', (e) => stepNumber(e, input));
    }

    const hint = el('small', { className: 'hint' });
    // Случайные значения того же размера, чтобы не вводить данные руками.
    const randomButton = el('button', {
      type: 'button',
      className: 'random',
      title: 'Заполнить случайными значениями того же размера',
      onclick: () => {
        let current;
        try {
          current = codec.parse(input.value);
        } catch {
          current = param.value;
        }
        input.value = codec.format(codec.random(current, param));
        input.dispatchEvent(new Event('input', { bubbles: true }));
      },
    }, '⟳ случайные значения');
    const widget = codec.widget?.({
      commit: (value) => {
        input.value = codec.format(value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      },
    });
    const updateHint = (value) => {
      hint.textContent = codec.hint ? codec.hint(value) : '';
      widget?.update(value);
    };
    updateHint(param.value);

    const parse = () => {
      try {
        const value = codec.parse(input.value);
        input.classList.remove('invalid');
        updateHint(value);
        return value;
      } catch (error) {
        input.classList.add('invalid');
        hint.textContent = '';
        throw new Error(`«${name}»: ${error.message}`);
      }
    };

    // Виджет — вне <label>, иначе клики по нему передавались бы текстовому полю.
    const label = el('div', { className: `field field-${codec.compact ? 'compact' : 'wide'}` },
      el('label', {}, el('span', {}, name), input),
      codec.random && param.random !== false ? el('div', { className: 'field-meta' }, hint, randomButton) : hint,
      widget ? widget.element : '');
    return { label, parse, widget, wide: Boolean(widget) };
  }

  /** Показывает под кодом задачи используемые вспомогательные функции. */
  renderHelpers() {
    const helpers = usedHelpers(this.editor.value, this.shared());
    this.helpers.hidden = helpers.length === 0;
    if (!helpers.length) return;
    const names = helpers.map((h) => h.name);
    if (this.helpers.dataset.names === names.join() && this.helpers.dataset.code === helpers.map((h) => h.code).join()) return;
    Object.assign(this.helpers.dataset, { names: names.join(), code: helpers.map((h) => h.code).join() });

    const pre = el('pre');
    pre.innerHTML = highlight(helpers.map((h) => h.code).join('\n\n'));
    this.helpers.replaceChildren(
      el('summary', {},
        'Вспомогательные функции: ',
        names.map((name, i) => [i ? ', ' : '', el('code', {}, name)]),
        ' · ',
        el('a', { href: `#${this.labId}/shared` }, 'изменить')),
      pre);
  }

  async run() {
    this.renderHelpers();
    let source;
    let args;
    try {
      args = this.fields.map((f) => f.parse());
      source = buildSource(this.shared(), this.editor.value, entryName({ ...this.task, code: this.editor.value }));
    } catch (error) {
      return this.show({ ok: false, error: error.message });
    }
    this.output.classList.add('pending');
    this.lastArgs = args;
    this.lastSource = source;
    this.runner ??= new Runner();
    const result = await this.runner.run(source, args);
    if (!result.cancelled) this.show(result);
  }

  /**
   * Связь результата с виджетом ввода: виджет получает результат целиком,
   * а наведение на строку результата показывает её на виджете.
   * task.traces — вид обхода для каждой строки (['pre', 'in', 'post'])
   * или 'steps', когда строки результата — шаги по порядку.
   */
  linkTraces(value) {
    const widget = this.fields.find((f) => f.widget)?.widget ?? this.visual;
    if (!widget) return;
    widget.result?.(value, this.lastArgs, this.lastSource);
    const kinds = this.task.traces;
    if (!kinds || !widget.trace) return;

    const rows = kinds === 'steps'
      ? [...this.output.querySelectorAll('li')].map((li) => [li])
      : [...this.output.querySelectorAll('dt')].map((dt) => [dt, dt.nextElementSibling]);
    rows.forEach((row, i) => {
      const key = kinds === 'steps' ? i : kinds[i];
      if (key === undefined) return;
      const enter = () => {
        row.forEach((cell) => cell.classList.add('traced'));
        widget.trace(value[i], key);
      };
      const leave = () => {
        row.forEach((cell) => cell.classList.remove('traced'));
        widget.clearTrace();
      };
      for (const cell of row) {
        cell.classList.add('traceable');
        cell.addEventListener('mouseenter', enter);
        cell.addEventListener('mouseleave', leave);
      }
    });
  }

  show(result) {
    const out = this.output;
    out.classList.remove('pending');
    out.classList.toggle('error', !result.ok);
    out.replaceChildren();
    if (!result.ok) {
      out.textContent = result.error;
      this.visual?.result(null);
      return;
    }
    const labels = this.task.outputs;
    const value = result.value;
    if (labels && Array.isArray(value) && labels.length === value.length) {
      out.append(el('dl', {}, labels.map((name, i) => [el('dt', {}, name), el('dd', {}, renderValue(value[i]))])));
    } else if (this.task.traces === 'steps' && Array.isArray(value)) {
      // Шаги всегда нумерованным списком, чтобы на каждый можно было навести.
      out.append(el('span', { className: 'label' }, 'Результат'), el('ol', {}, value.map((line) => el('li', {}, String(line)))));
    } else {
      out.append(el('span', { className: 'label' }, 'Результат'), renderValue(value));
    }
    this.linkTraces(value);
  }
}

customElements.define('code-editor', CodeEditor);
customElements.define('lab-task', LabTask);

/* ======================= Навигация и страницы ======================= */

function parseHash() {
  const [id, task] = decodeURIComponent(location.hash.slice(1)).split('/');
  return { lab: LABS.find((l) => l.id === id) || LABS[0], task: task || '' };
}

let observer;

function renderPage(lab) {
  const page = document.getElementById('page');
  page.replaceChildren();
  // Номер работы — порядок в навигации, он совпадает с порядком заданий в СДО.
  const number = LABS.indexOf(lab) + 1;
  document.title = `${number}. ${lab.title} — Алгоритмы`;

  const head = el('header', { className: 'lab-head' },
    el('h1', {}, lab.title),
    el('div', { className: 'meta' },
      `Работа ${number} · ${lab.tasks.length} ${plural(lab.tasks.length, 'задача', 'задачи', 'задач')}`,
      lab.file ? [' · ', el('a', { href: `${REPOSITORY}/blob/main/solutions/${lab.file}`, target: '_blank', rel: 'noopener' }, 'код на GitHub')] : [],
      lab.sdo ? [' · ', el('a', { href: lab.sdo, target: '_blank', rel: 'noopener' }, 'задание в СДО')] : []),
    lab.intro ? el('div', { className: 'intro' }, prose(lab.intro)) : '');
  page.append(head);

  let sharedEditor = null;
  if (lab.shared) {
    sharedEditor = el('code-editor', {}, lab.shared);
    page.append(el('section', { className: 'shared', id: `${lab.id}/shared` },
      el('h3', {}, 'Вспомогательные функции работы'),
      lab.sharedExplain ? el('div', { className: 'explain' }, prose(lab.sharedExplain)) : '',
      sharedEditor));
  }

  const tasks = lab.tasks.map((task, i) => {
    const node = el('lab-task', { id: `${lab.id}/${i + 1}` });
    Object.assign(node, { task, number: i + 1, labId: lab.id, shared: () => (sharedEditor ? sharedEditor.value : '') });
    return node;
  });
  page.append(...tasks);

  if (sharedEditor) {
    let timer;
    sharedEditor.addEventListener('change', () => {
      clearTimeout(timer);
      timer = setTimeout(() => tasks.forEach((t) => t.run()), 250);
    });
  }

  // Подсветка текущей задачи в навигации при прокрутке.
  observer?.disconnect();
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      document.querySelectorAll('#nav .tasks a').forEach((a) =>
        a.classList.toggle('current', a.dataset.target === entry.target.id));
    }
  }, { rootMargin: '-10% 0px -80% 0px' });
  [document.getElementById(`${lab.id}/shared`), ...tasks].forEach((t) => t && observer.observe(t));
}

function renderNav(current) {
  const list = document.getElementById('nav-list');
  list.replaceChildren(...LABS.map((lab, index) => {
    const active = lab === current;
    const item = el('li', { className: active ? 'active' : '' },
      el('a', { href: `#${lab.id}` }, el('span', { className: 'lab-num' }, index + 1), lab.title));
    if (active && lab.tasks.length > 1) {
      const links = lab.tasks.map((task, i) => [`${i + 1}`, `${i + 1}. ${task.title}`]);
      if (lab.shared) links.unshift(['shared', 'Вспомогательные функции']);
      item.append(el('ol', { className: 'tasks' }, links.map(([key, text]) => {
        const link = el('a', { href: `#${lab.id}/${key}`, title: text }, text);
        link.dataset.target = `${lab.id}/${key}`;
        return el('li', {}, link);
      })));
    }
    return item;
  }));
}

function plural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

let shownLab = null;

function route() {
  const { lab, task } = parseHash();
  if (!lab) return;
  if (lab !== shownLab) {
    shownLab = lab;
    renderNav(lab);
    renderPage(lab);
  }
  if (task) document.getElementById(`${lab.id}/${task}`)?.scrollIntoView();
  else window.scrollTo(0, 0);
}

function startApp() {
  addEventListener('hashchange', route);
  route();
}
