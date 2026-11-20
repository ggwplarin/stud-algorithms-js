registerLab({
  id: 'queue',
  title: 'Очередь',
  sdo: 'https://online.mospolytech.ru/mod/assign/view.php?id=432202',
  // Файл с кодом решения в репозитории: solutions/12-queue.js
  file: '12-queue.js',
  intro: 'Очередь FIFO: первым выходит элемент, добавленный раньше всех. Операции добавляются кнопками под условием; наведите на операцию или строку журнала, чтобы увидеть очередь на этом шаге.',
  // Описание для файла решений (без указаний по интерфейсу сайта).
  codeIntro: 'Очередь FIFO: первым выходит элемент, добавленный раньше всех. Функция `runQueue` принимает список операций вида `[["enqueue", значение], ["dequeue"], ["peek"], ["size"], ["isEmpty"]]` и возвращает журнал их выполнения.',
  tasks: [
    {
      title: 'Очередь FIFO',
      text: 'Реализовать очередь с операциями добавления, извлечения и просмотра первого элемента.',
      entry: 'runQueue',
      explain: 'Очередь работает по принципу FIFO: первым извлекается тот элемент, который был добавлен раньше всех. Класс `Queue` скрывает внутренний массив и даёт только допустимые операции: добавить в конец, извлечь из начала, посмотреть первый элемент, узнать размер. Извлечение и просмотр пустой очереди считаются ошибкой.\n\nФункция `runQueue` выполняет операции по списку и после каждой записывает в журнал результат и содержимое очереди, чтобы порядок FIFO был виден наглядно.',
      code: String.raw`
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
}`,
      // Наведение на строку журнала показывает очередь на этом шаге.
      traces: 'steps',
      params: [{
        name: 'operations',
        kind: 'operations',
        label: 'Операции',
        value: [['enqueue', 'первый'], ['enqueue', 'второй'], ['peek'], ['dequeue'], ['isEmpty']],
      }],
      tests: [
        {
          args: [[['enqueue', 'a'], ['enqueue', 'b'], ['peek'], ['dequeue'], ['isEmpty']]],
          expect: [
            'enqueue: добавлено "a"; очередь: ["a"]',
            'enqueue: добавлено "b"; очередь: ["a","b"]',
            'peek: первый элемент "a"; очередь: ["a","b"]',
            'dequeue: извлечено "a"; очередь: ["b"]',
            'isEmpty: нет; очередь: ["b"]',
          ],
        },
        { args: [[['dequeue']]], expect: ['dequeue: ошибка: Очередь пуста; очередь: []'] },
        { args: [[['size'], ['isEmpty']]], expect: ['size: размер 0; очередь: []', 'isEmpty: да; очередь: []'] },
      ],
    },
  ],
});
