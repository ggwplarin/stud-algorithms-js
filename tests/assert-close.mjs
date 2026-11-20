// Сравнение результатов с допуском для дробных чисел.
import assert from 'node:assert/strict';

export function assertClose(actual, expected, path = 'результат') {
  if (typeof expected === 'number' && typeof actual === 'number') {
    const ok = Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected));
    assert.ok(ok, `${path}: ${actual} ≠ ${expected}`);
  } else if (Array.isArray(expected)) {
    assert.ok(Array.isArray(actual), `${path}: ожидался массив, получено ${JSON.stringify(actual)}`);
    assert.equal(actual.length, expected.length, `${path}: длина`);
    expected.forEach((e, i) => assertClose(actual[i], e, `${path}[${i}]`));
  } else if (expected && typeof expected === 'object') {
    assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort(), `${path}: ключи`);
    for (const key of Object.keys(expected)) assertClose(actual[key], expected[key], `${path}.${key}`);
  } else {
    assert.equal(actual, expected, path);
  }
}
