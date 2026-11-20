registerLab({
  id: 'tree',
  title: 'Обход дерева',
  sdo: 'https://online.mospolytech.ru/mod/assign/view.php?id=432199',
  // Файл с кодом решения в репозитории: solutions/11-tree-traversal.js
  file: '11-tree-traversal.js',
  intro: 'Дерево собирается прямо на рисунке под условием: «+» добавляет потомка, клик по узлу меняет его значение. Внутри программы каждый узел — объект `{ value, left, right }`, отсутствующий потомок — `null`.',
  // Описание для файла решений (без указаний по интерфейсу сайта).
  codeIntro: 'Узел дерева — объект `{ value, left, right }`, отсутствующий потомок — `null`. Обходы возвращают значения узлов в порядке посещения.',
  tasks: [
    {
      title: 'Три способа обхода бинарного дерева',
      text: 'Реализовать прямой (корень, левое, правое), симметричный (левое, корень, правое) и обратный (левое, правое, корень) обходы бинарного дерева.',
      entry: 'traverseAll',
      explain: 'Все три обхода рекурсивны и отличаются только тем, когда посещается корень: до поддеревьев (прямой), между ними (симметричный) или после (обратный). Пустое поддерево даёт пустой список — это база рекурсии.\n\nДля дерева поиска симметричный обход выдаёт значения по возрастанию. Прямой обход удобен для копирования дерева, обратный — для его удаления.',
      code: String.raw`
function preorder(node) {
  if (node === null) return [];
  return [node.value, ...preorder(node.left), ...preorder(node.right)];
}

function inorder(node) {
  if (node === null) return [];
  return [...inorder(node.left), node.value, ...inorder(node.right)];
}

function postorder(node) {
  if (node === null) return [];
  return [...postorder(node.left), ...postorder(node.right), node.value];
}

function traverseAll(tree) {
  return [preorder(tree), inorder(tree), postorder(tree)];
}`,
      params: [{
        name: 'tree',
        kind: 'tree',
        label: 'Дерево',
        value: {
          value: 2,
          left: { value: 1, left: null, right: null },
          right: { value: 3, left: { value: 4, left: null, right: null }, right: null },
        },
      }],
      outputs: ['Прямой', 'Симметричный', 'Обратный'],
      // Наведение на строку результата показывает траекторию обхода на рисунке.
      traces: ['pre', 'in', 'post'],
      tests: [
        {
          args: [{
            value: 2,
            left: { value: 1, left: null, right: null },
            right: { value: 3, left: { value: 4, left: null, right: null }, right: null },
          }],
          expect: [[2, 1, 3, 4], [1, 2, 4, 3], [1, 4, 3, 2]],
        },
        { args: [null], expect: [[], [], []] },
        { args: [{ value: 5, left: null, right: null }], expect: [[5], [5], [5]] },
      ],
    },
  ],
});
