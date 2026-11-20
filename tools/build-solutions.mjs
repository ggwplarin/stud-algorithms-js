// Собирает solutions/*.js из данных сайта (docs/labs).
// Сайт и файлы решений показывают один и тот же код, поэтому источник один.
// Запуск: npm run build
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { entryName, loadLabs } from './labs.mjs';

const WIDTH = 78;

/** Перенос текста по словам в строки комментария «// …». */
function comment(text, prefix = '// ') {
  const lines = [];
  for (const paragraph of text.trim().split(/\n\s*\n/)) {
    if (lines.length) lines.push(prefix.trimEnd());
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      if (line && prefix.length + line.length + 1 + word.length > WIDTH) {
        lines.push(prefix + line);
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    if (line) lines.push(prefix + line);
  }
  return lines.join('\n');
}

/** Значение в виде JS-литерала для примера вызова. */
function literal(value) {
  if (value === null || typeof value !== 'object') {
    return typeof value === 'string' ? `'${value.replace(/'/g, "\\'")}'` : String(value);
  }
  if (Array.isArray(value)) return `[${value.map(literal).join(', ')}]`;
  return `{ ${Object.entries(value).map(([k, v]) => `${k}: ${literal(v)}`).join(', ')} }`;
}

function example(task) {
  const sample = task.tests?.find((t) => !t.throws);
  if (!sample) return '';
  const call = `${entryName(task)}(${sample.args.map(literal).join(', ')})`;
  // Вызов, который не помещается в строку (например, с деревом), не показываем:
  // формат таких данных описан в начале файла.
  if (call.length > WIDTH) return '';
  const result = literal(sample.expect);
  if (`// Пример: ${call} → ${result}`.length <= WIDTH) return `// Пример: ${call} → ${result}`;
  if (`//   → ${result}`.length <= WIDTH) return `// Пример: ${call}\n//   → ${result}`;
  // Длинный массив — по элементу на строку.
  const items = Array.isArray(sample.expect) ? sample.expect.map((x) => `//     ${literal(x)},`) : [`//     ${result}`];
  return [`// Пример: ${call}`, '//   → [', ...items, '//   ]'].join('\n');
}

function heading(text) {
  const title = `// ── ${text} `;
  return title + '─'.repeat(Math.max(3, WIDTH - title.length));
}

function render(lab, number) {
  const parts = [];
  const header = [`Работа ${number}. ${lab.title}`];
  if (lab.sdo) header.push(`Задание в СДО: ${lab.sdo}`);
  const intro = lab.codeIntro ?? lab.intro;
  parts.push(`/*\n${header.map((l) => ` * ${l}`).join('\n')}\n *\n${comment(intro, ' * ')}\n */\n\n'use strict';`);

  if (lab.shared) {
    parts.push([
      heading('Вспомогательные функции'),
      lab.sharedExplain ? comment(lab.sharedExplain) : '',
      '',
      lab.shared.trim(),
    ].filter((x, i) => x || i === 2).join('\n'));
  }

  // Экспортируются все функции и классы верхнего уровня из кода задач.
  const names = new Set();
  lab.tasks.forEach((task, i) => {
    for (const [, name] of task.code.matchAll(/^(?:function|class)\s+([\w$]+)/gm)) {
      if (names.has(name)) throw new Error(`${lab.id}: имя ${name} встречается дважды`);
      names.add(name);
    }
    parts.push([
      heading(`Задача ${i + 1}. ${task.title}`),
      '//',
      comment(`Условие: ${task.text}`),
      '//',
      comment(task.explain),
      example(task) ? `//\n${example(task)}` : '',
      '',
      task.code.trim(),
    ].filter((x, k) => x || k === 6).join('\n'));
  });

  parts.push(`module.exports = {\n${[...names].map((n) => `  ${n},`).join('\n')}\n};`);
  return parts.join('\n\n') + '\n';
}

// С флагом --check файлы не записываются: проверяется, что solutions/ актуальна.
const check = process.argv.includes('--check');
const stale = [];
loadLabs().forEach((lab, i) => {
  const { file } = lab;
  if (!file) throw new Error(`У работы ${lab.id} не указано поле file`);
  const path = new URL(`../solutions/${file}`, import.meta.url);
  const text = render(lab, i + 1);
  if (check) {
    if (!existsSync(path) || readFileSync(path, 'utf8') !== text) stale.push(file);
  } else {
    writeFileSync(path, text);
    console.log(`solutions/${file}`);
  }
});
if (stale.length) {
  console.error(`Устарели: ${stale.join(', ')}. Запустите npm run build.`);
  process.exit(1);
}
