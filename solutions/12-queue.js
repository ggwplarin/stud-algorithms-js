/*
 * Работа 12. Очередь
 * Задание в СДО: https://online.mospolytech.ru/mod/assign/view.php?id=432202
 *
 * Очередь FIFO: первым выходит элемент, добавленный раньше всех. Функция
 * `runQueue` принимает список операций вида `[["enqueue", значение],
 * ["dequeue"], ["peek"], ["size"], ["isEmpty"]]` и возвращает журнал их
 * выполнения.
 */

'use strict';

// ── Задача 1. Очередь FIFO ─────────────────────────────────────────────────
//
// Условие: Реализовать очередь с операциями добавления, извлечения и
// просмотра первого элемента.
//
// Очередь работает по принципу FIFO: первым извлекается тот элемент, который
// был добавлен раньше всех. Класс `Queue` скрывает внутренний массив и даёт
// только допустимые операции: добавить в конец, извлечь из начала, посмотреть
// первый элемент, узнать размер. Извлечение и просмотр пустой очереди
// считаются ошибкой.
//
// Функция `runQueue` выполняет операции по списку и после каждой записывает в
// журнал результат и содержимое очереди, чтобы порядок FIFO был виден
// наглядно.

class Queue {
  constructor() {
    this.items = [];
  }

  enqueue(value) {
    this.items.push(value);
  }

  dequeue() {
    if (this.items.length === 0) throw new Error('Очередь пуста');
    return this.items.shift();
  }

  peek() {
    if (this.items.length === 0) throw new Error('Очередь пуста');
    return this.items[0];
  }

  size() {
    return this.items.length;
  }

  isEmpty() {
    return this.items.length === 0;
  }
}

function runQueue(operations) {
  const queue = new Queue();
  const log = [];
  for (const [name, value] of operations) {
    let result;
    try {
      if (name === 'enqueue') {
        queue.enqueue(value);
        result = 'добавлено ' + JSON.stringify(value);
      } else if (name === 'dequeue') {
        result = 'извлечено ' + JSON.stringify(queue.dequeue());
      } else if (name === 'peek') {
        result = 'первый элемент ' + JSON.stringify(queue.peek());
      } else if (name === 'size') {
        result = 'размер ' + queue.size();
      } else if (name === 'isEmpty') {
        result = queue.isEmpty() ? 'да' : 'нет';
      } else {
        result = 'неизвестная операция';
      }
    } catch (error) {
      result = 'ошибка: ' + error.message;
    }
    log.push(name + ': ' + result + '; очередь: ' + JSON.stringify(queue.items));
  }
  return log;
}

module.exports = {
  Queue,
  runQueue,
};
