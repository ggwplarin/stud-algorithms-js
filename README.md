# Алгоритмы и структуры данных — решения на JavaScript

Ларин Александр Олегович, группа 243-321, Московский Политех.

**Сайт с решениями: https://ggwplarin.github.io/stud-algorithms-js/**

На сайте у каждой задачи есть условие, объяснение решения, код и поля ввода.
Код можно править прямо на странице, и результат сразу пересчитывается. Для
дерева, очереди, Ханойской башни, бинарного поиска и сортировок есть пошаговые
визуализации.

## Работы

| № | Работа | Задач | Код | На сайте |
|---|---|---|---|---|
| 1 | Линейные алгоритмы | 12 | [solutions/01-linear.js](solutions/01-linear.js) | [открыть](https://ggwplarin.github.io/stud-algorithms-js/#lab01) |
| 2 | Ветвления | 10 | [solutions/02-branching.js](solutions/02-branching.js) | [открыть](https://ggwplarin.github.io/stud-algorithms-js/#lab02) |
| 3 | Циклы | 10 | [solutions/03-loops.js](solutions/03-loops.js) | [открыть](https://ggwplarin.github.io/stud-algorithms-js/#lab03) |
| 4 | Рекурсия | 9 | [solutions/04-recursion.js](solutions/04-recursion.js) | [открыть](https://ggwplarin.github.io/stud-algorithms-js/#lab04) |
| 5 | Одномерные массивы | 10 | [solutions/05-arrays.js](solutions/05-arrays.js) | [открыть](https://ggwplarin.github.io/stud-algorithms-js/#lab05) |
| 6 | Двумерные массивы | 10 | [solutions/06-matrices.js](solutions/06-matrices.js) | [открыть](https://ggwplarin.github.io/stud-algorithms-js/#lab06) |
| 7 | Сортировка пузырьком | 1 | [solutions/07-bubble-sort.js](solutions/07-bubble-sort.js) | [открыть](https://ggwplarin.github.io/stud-algorithms-js/#sort_bubble) |
| 8 | Сортировка вставками | 1 | [solutions/08-insertion-sort.js](solutions/08-insertion-sort.js) | [открыть](https://ggwplarin.github.io/stud-algorithms-js/#sort_insertion) |
| 9 | Сортировка выбором | 1 | [solutions/09-selection-sort.js](solutions/09-selection-sort.js) | [открыть](https://ggwplarin.github.io/stud-algorithms-js/#sort_selection) |
| 10 | Бинарный поиск | 1 | [solutions/10-binary-search.js](solutions/10-binary-search.js) | [открыть](https://ggwplarin.github.io/stud-algorithms-js/#binary_search) |
| 11 | Обход дерева | 1 | [solutions/11-tree-traversal.js](solutions/11-tree-traversal.js) | [открыть](https://ggwplarin.github.io/stud-algorithms-js/#tree) |
| 12 | Очередь | 1 | [solutions/12-queue.js](solutions/12-queue.js) | [открыть](https://ggwplarin.github.io/stud-algorithms-js/#queue) |

Каждый файл в `solutions/` — обычный JavaScript без зависимостей. Перед каждой
функцией в комментарии приведены условие задачи, объяснение решения и пример
вызова.

## Запуск

Нужен Node.js 20 или новее, сторонние пакеты не используются.

```bash
npm test        # проверка всех решений на примерах
npm run build   # пересобрать solutions/ из данных сайта
```

Функции из решений подключаются как обычные модули:

```bash
node -e "const { rectangle } = require('./solutions/01-linear.js'); console.log(rectangle(3, 4))"
# [ 12, 14 ]
```

Сайт открывается и локально, без сервера: `docs/index.html`.

## Устройство репозитория

| Папка | Что внутри |
|---|---|
| `solutions/` | решения по работам, по одному файлу на работу |
| `docs/` | сайт (GitHub Pages); в `docs/labs/` — условия, объяснения, код и примеры каждой задачи |
| `tools/` | сборка `solutions/` из `docs/labs/` |
| `tests/` | проверка примеров и того, что `solutions/` совпадает со сборкой |

Код решений хранится в одном месте — `docs/labs/`, а `solutions/` собирается
из него командой `npm run build`. Поэтому сайт и файлы решений не расходятся:
если изменить код и не пересобрать, тест укажет на устаревший файл.
