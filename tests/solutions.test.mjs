// Файлы solutions/*.js подключаются как обычные модули и дают те же ответы,
// а их содержимое совпадает с тем, что собирает tools/build-solutions.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { entryName, loadLabs } from '../tools/labs.mjs';
import { assertClose } from './assert-close.mjs';

const require = createRequire(import.meta.url);

test('solutions/ актуальна (npm run build)', () => {
  execFileSync(process.execPath, [new URL('../tools/build-solutions.mjs', import.meta.url).pathname, '--check'], { stdio: 'pipe' });
});

for (const lab of loadLabs()) {
  const { file } = lab;
  const solutions = require(`../solutions/${file}`);
  lab.tasks.forEach((task, i) => {
    const name = entryName(task);
    test(`solutions/${file} · ${i + 1}. ${name}`, () => {
      assert.equal(typeof solutions[name], 'function', `${name} не экспортируется`);
      for (const { args, expect, throws } of task.tests) {
        const call = () => solutions[name](...structuredClone(args));
        if (throws) assert.throws(call);
        else assertClose(call(), expect, `${name}(${JSON.stringify(args).slice(1, -1)})`);
      }
    });
  });
}
