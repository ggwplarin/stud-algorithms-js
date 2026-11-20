// Загрузка работ из docs/labs/*.js в том порядке, в каком их подключает сайт.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const docs = new URL('../docs/', import.meta.url);

/** Работы по порядку подключения в docs/index.html. */
export function loadLabs() {
  const html = readFileSync(new URL('index.html', docs), 'utf8');
  const files = [...html.matchAll(/<script src="(labs\/[^"]+)"><\/script>/g)].map((m) => m[1]);
  const labs = [];
  const context = { registerLab: (lab) => labs.push(lab) };
  for (const file of files) {
    runInNewContext(readFileSync(new URL(file, docs), 'utf8'), context, { filename: file });
  }
  return labs;
}

/** Имя вызываемой функции задачи: entry или первая объявленная функция. */
export function entryName(task) {
  if (task.entry) return task.entry;
  return /function\s+([\w$]+)/.exec(task.code)[1];
}
