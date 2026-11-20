registerLab({
  id: 'lab04',
  title: 'Рекурсия',
  sdo: 'https://online.mospolytech.ru/mod/assign/view.php?id=428845',
  // Файл с кодом решения в репозитории: solutions/04-recursion.js
  file: '04-recursion.js',
  intro: 'Все решения рекурсивные: в каждом есть база рекурсии, на которой вычисление останавливается, и шаг, сводящий задачу к такой же, но меньшей.',
  tasks: [
    {
      title: 'Факториал',
      text: 'Напишите функцию, которая рекурсивно вычисляет факториал числа n.',
      explain: 'Факториал определяется рекурсивно: n! = n · (n − 1)!, а 0! = 1! = 1 служат базой рекурсии. Для отрицательного n факториал не определён, и функция сообщает об ошибке.',
      code: String.raw`
function factorial(n) {
  if (n < 0) {
    throw new Error('n должно быть неотрицательным');
  }
  return n < 2 ? 1 : n * factorial(n - 1);
}`,
      params: [{ name: 'n', value: 5 }],
      tests: [{ args: [5], expect: 120 }, { args: [0], expect: 1 }, { args: [-1], throws: true }],
    },
    {
      title: 'Числа Фибоначчи',
      text: 'Напишите функцию, которая рекурсивно вычисляет n-е число Фибоначчи (F₀ = 0, F₁ = 1).',
      explain: 'Прямолинейная рекурсия F(n) = F(n − 1) + F(n − 2) вычисляет одни и те же значения много раз и растёт экспоненциально. Поэтому вспомогательная функция `step` передаёт в рекурсивный вызов пару соседних чисел и сдвигает её на один шаг вперёд. Решение остаётся рекурсивным, но выполняет только n вызовов.\n\nНачальные значения F₀ = 0 и F₁ = 1 заданы условием.',
      code: String.raw`
function fibonacci(n) {
  if (n < 0) {
    throw new Error('n должно быть неотрицательным');
  }
  // k шагов осталось, a и b — два соседних числа
  function step(k, a, b) {
    return k === 0 ? a : step(k - 1, b, a + b);
  }
  return step(n, 0, 1);
}`,
      params: [{ name: 'n', value: 10 }],
      tests: [{ args: [10], expect: 55 }, { args: [0], expect: 0 }, { args: [-1], throws: true }],
    },
    {
      title: 'Возведение в степень',
      text: 'Напишите функцию, которая рекурсивно возводит число x в целую степень n.',
      explain: 'Степень сводится к меньшей степени: xⁿ = x · xⁿ⁻¹, база рекурсии — x⁰ = 1. Отрицательная степень обрабатывается через обратное число: x⁻ⁿ = 1 / xⁿ.',
      code: String.raw`
function power(x, n) {
  if (n < 0) {
    return 1 / power(x, -n);
  }
  return n === 0 ? 1 : x * power(x, n - 1);
}`,
      params: [{ name: 'x', value: 2 }, { name: 'n', value: 10 }],
      tests: [{ args: [2, 10], expect: 1024 }, { args: [2, -2], expect: 0.25 }, { args: [5, 0], expect: 1 }],
    },
    {
      title: 'Палиндром',
      text: 'Напишите функцию, которая рекурсивно проверяет, является ли строка палиндромом.',
      explain: 'Строка является палиндромом, если её первый и последний символы совпадают и середина тоже палиндром. Строки из нуля или одного символа — база рекурсии. Регистр и пробелы не игнорируются, поэтому строка сравнивается в точности как задана.',
      code: String.raw`
function isPalindrome(text) {
  if (text.length < 2) {
    return true;
  }
  // сравниваем крайние символы и проверяем середину
  return text[0] === text[text.length - 1] && isPalindrome(text.slice(1, -1));
}`,
      params: [{ name: 'text', value: 'шалаш' }],
      tests: [
        { args: ['шалаш'], expect: true },
        { args: ['ab'], expect: false },
        { args: [''], expect: true },
      ],
    },
    {
      title: 'Бинарный поиск',
      text: 'Напишите функцию, которая рекурсивно выполняет бинарный поиск элемента в отсортированном массиве. Результат — индекс с нуля или −1.',
      explain: 'Каждый вызов смотрит на средний элемент текущего диапазона `[low, high]`. Если искомое значение меньше, поиск продолжается в левой половине, иначе — в правой. Диапазон каждый раз сокращается вдвое, так что вызовов будет порядка log₂ n.\n\nПустой диапазон (`low > high`) означает, что элемента нет, и функция возвращает −1.',
      code: String.raw`
function binarySearch(items, value, low = 0, high = items.length - 1) {
  if (low > high) {
    return -1;
  }
  const middle = Math.floor((low + high) / 2);
  if (items[middle] === value) {
    return middle;
  }
  return value < items[middle]
    ? binarySearch(items, value, low, middle - 1)
    : binarySearch(items, value, middle + 1, high);
}`,
      params: [{ name: 'items', value: [1, 3, 5, 7, 9], random: 'sorted' }, { name: 'value', value: 7 }],
      // Каждый рекурсивный вызов — отдельный шаг: видно, как сужается диапазон.
      visual: 'binarySearch',
      tests: [
        { args: [[1, 3, 5, 7, 9], 7], expect: 3 },
        { args: [[1, 3, 5], 4], expect: -1 },
        { args: [[], 1], expect: -1 },
      ],
    },
    {
      title: 'Обратный порядок слов',
      text: 'Напишите функцию, которая рекурсивно меняет порядок слов в строке на обратный.',
      explain: 'Строка разбивается на слова, после чего рекурсивно переворачивается список: перевёрнутый хвост, а за ним первое слово. Пустые элементы, которые появляются при двойных пробелах, отбрасываются.',
      code: String.raw`
function reverseWords(text) {
  const words = text.split(' ').filter((word) => word.length > 0);
  function reverse(list) {
    return list.length < 2 ? list : reverse(list.slice(1)).concat(list.slice(0, 1));
  }
  return reverse(words).join(' ');
}`,
      params: [{ name: 'text', value: 'один два три' }],
      tests: [{ args: ['один два три'], expect: 'три два один' }, { args: [''], expect: '' }],
    },
    {
      title: 'Разложение на простые слагаемые',
      text: 'Напишите функцию, которая рекурсивно разлагает число n на сумму простых чисел (одно разложение, повторения допускаются).',
      explain: 'Любое целое число n ≥ 2 раскладывается в сумму двоек и, если n нечётно, одной тройки, а 2 и 3 — простые. Поэтому рекурсия отнимает двойку, пока не останется 2 или 3. Условие требует одно любое разложение, и это самое простое.',
      code: String.raw`
function primeSummands(n) {
  if (n < 2) {
    throw new Error('n должно быть не меньше 2');
  }
  if (!Number.isInteger(n)) {
    return null;
  }
  if (n <= 3) {
    return [n];
  }
  // Любое целое n >= 2 — сумма двоек и, для нечётного n, одной тройки.
  return [2].concat(primeSummands(n - 2));
}`,
      params: [{ name: 'n', value: 10 }],
      tests: [
        { args: [10], expect: [2, 2, 2, 2, 2] },
        { args: [11], expect: [2, 2, 2, 2, 3] },
        { args: [2], expect: [2] },
        { args: [3], expect: [3] },
        { args: [4], expect: [2, 2] },
        { args: [5], expect: [2, 3] },
        { args: [2.5], expect: null },
        { args: [1], throws: true },
      ],
    },
    {
      title: 'Количество цифр',
      text: 'Напишите функцию, которая рекурсивно подсчитывает количество цифр в числе.',
      explain: 'Количество цифр числа на одну больше, чем у числа без последней цифры. Отбросить её можно делением на 10 нацело. Однозначные числа — база рекурсии. Знак на число цифр не влияет, поэтому берётся модуль.',
      code: String.raw`
function countDigits(n) {
  const absolute = Math.abs(n);
  return absolute < 10 ? 1 : 1 + countDigits(Math.floor(absolute / 10));
}`,
      params: [{ name: 'n', value: 12345 }],
      tests: [{ args: [12345], expect: 5 }, { args: [-7], expect: 1 }, { args: [0], expect: 1 }],
    },
    {
      title: 'Ханойская башня',
      text: 'Напишите рекурсивное решение головоломки «Ханойская башня»: выведите список ходов переноса n дисков со стержня A на стержень C через B.',
      explain: 'Чтобы перенести n дисков с A на C, нужно перенести n − 1 верхних дисков на вспомогательный стержень B, переложить самый большой диск на C и вернуть n − 1 дисков с B на C. Для меньших башен действует то же правило, а ноль дисков не требует ходов.\n\nВсего получается 2ⁿ − 1 ход — меньше сделать нельзя.',
      code: String.raw`
function hanoi(n, source = 'A', target = 'C', spare = 'B') {
  if (n < 0) {
    throw new Error('n должно быть неотрицательным');
  }
  if (n === 0) {
    return [];
  }
  return hanoi(n - 1, source, spare, target)
    .concat([source + ' → ' + target])
    .concat(hanoi(n - 1, spare, target, source));
}`,
      params: [{ name: 'n', value: 3 }],
      // Под результатом — положение дисков после каждого хода; наведение на ход подсвечивает его.
      visual: 'hanoi',
      traces: 'steps',
      tests: [
        { args: [2], expect: ['A → B', 'A → C', 'B → C'] },
        { args: [1], expect: ['A → C'] },
        { args: [0], expect: [] },
        { args: [-1], throws: true },
      ],
    },
  ],
});
