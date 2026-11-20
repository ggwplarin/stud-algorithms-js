registerLab({
  id: 'sort_selection',
  title: 'Сортировка выбором',
  sdo: 'https://online.mospolytech.ru/mod/assign/view.php?id=429465',
  // Файл с кодом решения в репозитории: solutions/09-selection-sort.js
  file: '09-selection-sort.js',
  intro: 'Исходный массив не изменяется, возвращается отсортированная копия. На каждом шаге выбирается минимум из оставшейся части; сложность O(n²).',
  tasks: [
    {
      title: 'Сортировка выбором',
      text: 'Реализовать сортировку выбором по возрастанию.',
      explain: 'На i-м шаге среди ещё не упорядоченных элементов (от i до конца) ищется минимальный, и он ставится на позицию i. После шага i первые i + 1 элементов стоят на своих местах.\n\nВ отличие от пузырька, на каждом шаге выполняется не больше одного обмена, зато сравнений всегда около n²/2, как бы ни были упорядочены данные.',
      code: String.raw`
function selectionSort(values) {
  const a = [...values];
  for (let i = 0; i < a.length; i++) {
    let minimum = i;
    for (let j = i + 1; j < a.length; j++) {
      if (a[j] < a[minimum]) minimum = j;
    }
    [a[i], a[minimum]] = [a[minimum], a[i]];
  }
  return a;
}`,
      params: [{ name: 'values', label: 'Массив', value: [5, 2, 9, 1, 5, 6] }],
      // Под результатом — проходы: найденный минимум и обмен на каждом шаге.
      visual: 'selectionSort',
      tests: [
        { args: [[5, 2, 9, 1, 5, 6]], expect: [1, 2, 5, 5, 6, 9] },
        { args: [[]], expect: [] },
        { args: [[3, 2, 1]], expect: [1, 2, 3] },
        { args: [[1, 2, 3]], expect: [1, 2, 3] },
      ],
    },
  ],
});
