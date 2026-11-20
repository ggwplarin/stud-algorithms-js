/*
 * Работа 11. Обход дерева
 * Задание в СДО: https://online.mospolytech.ru/mod/assign/view.php?id=432199
 *
 * Узел дерева — объект `{ value, left, right }`, отсутствующий потомок —
 * `null`. Обходы возвращают значения узлов в порядке посещения.
 */

'use strict';

// ── Задача 1. Три способа обхода бинарного дерева ──────────────────────────
//
// Условие: Реализовать прямой (корень, левое, правое), симметричный (левое,
// корень, правое) и обратный (левое, правое, корень) обходы бинарного дерева.
//
// Все три обхода рекурсивны и отличаются только тем, когда посещается корень:
// до поддеревьев (прямой), между ними (симметричный) или после (обратный).
// Пустое поддерево даёт пустой список — это база рекурсии.
//
// Для дерева поиска симметричный обход выдаёт значения по возрастанию. Прямой
// обход удобен для копирования дерева, обратный — для его удаления.

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
}

module.exports = {
  preorder,
  inorder,
  postorder,
  traverseAll,
};
