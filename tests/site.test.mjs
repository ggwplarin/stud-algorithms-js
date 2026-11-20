// Примеры из каждой задачи сайта (docs/labs) выполняются и дают ожидаемый ответ.
import { test } from 'node:test';
import { entryName, loadLabs } from '../tools/labs.mjs';
import { assertClose } from './assert-close.mjs';
import assert from 'node:assert/strict';

function run(lab, task, args) {
  const fn = new Function(`${lab.shared || ''}\n${task.code}\nreturn ${entryName(task)};`)();
  return fn(...structuredClone(args));
}

for (const lab of loadLabs()) {
  lab.tasks.forEach((task, i) => {
    test(`сайт · ${lab.id} · ${i + 1}. ${task.title}`, () => {
      assert.ok(task.tests?.length, 'нет примеров');
      // Значения полей ввода по умолчанию должны выполняться без ошибок.
      run(lab, task, task.params.map((p) => p.value));
      for (const { args, expect, throws } of task.tests) {
        if (throws) assert.throws(() => run(lab, task, args), `ожидалась ошибка для ${JSON.stringify(args)}`);
        else assertClose(run(lab, task, args), expect, JSON.stringify(args));
      }
    });
  });
}
