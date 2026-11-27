/**
 * Question bank for the 4.0 arcades.
 *
 * Every question carries a one-sentence hint (shown only after a miss —
 * «Майже!») and a one-sentence «чому» shown after the right answer
 * (мікронавчання: кожен крок перевіряється одразу й пояснюється).
 *
 * Generated questions keep a stable id but get new numbers every time
 * («числа й імена змінних щоразу інші»), so a returning review question
 * can't be answered from memory alone.
 */

export interface Question {
  id: string;
  tag: string;
  text: string;
  code?: string;
  options: string[];
  correct: number;
  hint: string;
  explain: string;
}

type QuestionSource = Question | (() => Question);

const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

function uniqueOptions(right: string, wrong: string[]): { options: string[]; correct: number } {
  const set: string[] = [right];
  for (const w of wrong) {
    if (set.length >= 4) break;
    if (!set.includes(w)) set.push(w);
  }
  let filler = 1;
  while (set.length < 4) {
    const extra = `${right} ${"!".repeat(filler++)}`;
    if (!set.includes(extra)) set.push(extra);
  }
  return { options: set, correct: 0 };
}

const genRange = (): Question => {
  const start = rnd(0, 4);
  const step = rnd(2, 3);
  const count = rnd(3, 5);
  const stop = start + step * (count - 1) + 1;
  const vals: number[] = [];
  for (let v = start; v < stop; v += step) vals.push(v);
  const right = vals.join(", ");
  const withStop = [...vals, stop].join(", ");
  const byOne = Array.from({ length: count }, (_, i) => start + i).join(", ");
  const fromOne = vals.map((v) => v + 1).join(", ");
  const { options, correct } = uniqueOptions(right, [withStop, byOne, fromOne]);
  return {
    id: "gen-range",
    tag: "#цикли",
    text: "Які числа видасть цей range?",
    code: `range(${start}, ${stop}, ${step})`,
    options,
    correct,
    hint: "Друге число — межа, яку range не включає. Третє — крок.",
    explain: `Починаємо з ${start}, крок ${step}, а ${stop} вже не входить.`,
  };
};

const genPrecedence = (): Question => {
  const a = rnd(1, 6);
  const b = rnd(2, 5);
  const c = rnd(2, 4);
  const right = a + b * c;
  const leftToRight = (a + b) * c;
  const { options, correct } = uniqueOptions(String(right), [
    String(leftToRight),
    String(a * b + c),
    String(right + 1),
  ]);
  return {
    id: "gen-precedence",
    tag: "#вирази",
    text: "Що виведе програма?",
    code: `print(${a} + ${b} * ${c})`,
    options,
    correct,
    hint: "Як у математиці: спершу множення, потім додавання.",
    explain: `${b} * ${c} = ${b * c}, потім + ${a} = ${right}.`,
  };
};

const NAMES = ["lynn", "axo", "bit", "code", "pixel", "byte", "python", "coral"];

const genLen = (): Question => {
  const word = NAMES[rnd(0, NAMES.length - 1)];
  const right = word.length;
  const { options, correct } = uniqueOptions(String(right), [
    String(right - 1),
    String(right + 1),
    String(right + 2),
  ]);
  return {
    id: "gen-len",
    tag: "#рядки",
    text: "Що виведе програма?",
    code: `name = "${word}"\nprint(len(name))`,
    options,
    correct,
    hint: "len рахує кожну літеру в рядку. Лапки не рахуються.",
    explain: `У слові «${word}» ${right} літер.`,
  };
};

const genIndex = (): Question => {
  const pool = ["риба", "краб", "мушля", "корал", "медуза"];
  const items = [...pool].sort(() => Math.random() - 0.5).slice(0, 4);
  const idx = rnd(1, 3);
  const right = items[idx];
  // the most common slip is counting from 1, so that answer goes first
  const countedFromOne = items[idx - 1];
  const others = items.filter((_, i) => i !== idx && i !== idx - 1);
  const { options, correct } = uniqueOptions(right, [countedFromOne, ...others]);
  return {
    id: "gen-index",
    tag: "#списки",
    text: "Що виведе програма?",
    code: `sea = ["${items.join('", "')}"]\nprint(sea[${idx}])`,
    options,
    correct,
    hint: "У Python рахунок у списку починається з нуля.",
    explain: `sea[0] — «${items[0]}», тож sea[${idx}] — «${right}».`,
  };
};

const genBytes = (): Question => {
  const bytes = rnd(2, 6);
  const right = bytes * 8;
  const { options, correct } = uniqueOptions(String(right), [
    String(bytes * 10),
    String(bytes * 4),
    String(bytes * 16),
  ]);
  return {
    id: "gen-bytes",
    tag: "#інформація",
    text: `Скільки бітів у ${bytes} байтах?`,
    options,
    correct,
    hint: "В одному байті 8 бітів.",
    explain: `${bytes} × 8 = ${right} бітів.`,
  };
};

export const PYTHON_BANK: QuestionSource[] = [
  genRange,
  genPrecedence,
  genLen,
  genIndex,
  {
    id: "py-while-forever",
    tag: "#цикли",
    text: "Що станеться, якщо в циклі while забути змінювати лічильник, а умова завжди лишатиметься істинною?",
    options: [
      "Цикл виконуватиметься нескінченно",
      "Програма одразу завершиться",
      "Цикл виконається рівно один раз",
      "Python сам збільшить лічильник",
    ],
    correct: 0,
    hint: "Якщо лічильник не змінюється, умова ніколи не стане хибною.",
    explain: "Цикл без зміни лічильника не зупиняється.",
  },
  {
    id: "py-print",
    tag: "#основи",
    text: "Яка команда виводить текст на екран?",
    options: ["print()", "input()", "show()", "write()"],
    correct: 0,
    hint: "Англійською «друкувати» — print.",
    explain: "print() показує текст або число на екрані.",
  },
  {
    id: "py-input",
    tag: "#основи",
    text: "Яка команда чекає, поки користувач щось надрукує?",
    options: ["input()", "print()", "wait()", "read()"],
    correct: 0,
    hint: "Англійською «ввід» — input.",
    explain: "input() зупиняє програму й чекає на текст від людини.",
  },
  {
    id: "py-comment",
    tag: "#основи",
    text: "Яким знаком у Python починається коментар?",
    options: ["#", "//", "--", "**"],
    correct: 0,
    hint: "Цей знак ще називають «решітка».",
    explain: "Усе після # Python не виконує — це нотатка для людей.",
  },
  {
    id: "py-equals",
    tag: "#умови",
    text: "Як у Python перевірити, чи x дорівнює 5?",
    options: ["x == 5", "x = 5", "x := 5", "x === 5"],
    correct: 0,
    hint: "Один знак = записує значення, а нам треба порівняти.",
    explain: "== порівнює, а = кладе значення у змінну.",
  },
  {
    id: "py-type-str",
    tag: "#типи",
    text: "Якого типу значення \"42\" (у лапках)?",
    options: ["рядок (str)", "ціле число (int)", "дробове (float)", "логічне (bool)"],
    correct: 0,
    hint: "Подивись на лапки навколо числа.",
    explain: "Усе в лапках — це текст, навіть якщо там цифри.",
  },
  {
    id: "py-bool",
    tag: "#умови",
    text: "Що виведе print(3 > 7)?",
    options: ["False", "True", "3", "Помилку"],
    correct: 0,
    hint: "Порівняння відповідає «так» чи «ні».",
    explain: "3 не більше за 7, тому результат — False.",
  },
  {
    id: "py-indent",
    tag: "#синтаксис",
    text: "Як Python розуміє, які рядки належать до циклу або умови?",
    options: ["За відступом", "За фігурними дужками", "За крапкою з комою", "За номером рядка"],
    correct: 0,
    hint: "Подивись, як зсунуті рядки всередині циклу.",
    explain: "Рядки з однаковим відступом — це один блок.",
  },
  {
    id: "py-append",
    tag: "#списки",
    text: "Як додати рибку в кінець списку sea?",
    options: ["sea.append(\"риба\")", "sea.add(\"риба\")", "sea + \"риба\"", "append(sea)"],
    correct: 0,
    hint: "Англійською «дописати в кінець» — append.",
    explain: "append() кладе новий елемент у кінець списку.",
  },
];

export const WEB_BANK: QuestionSource[] = [
  genBytes,
  {
    id: "html-link",
    tag: "#html",
    text: "Який тег створює посилання?",
    options: ["<a>", "<link>", "<href>", "<url>"],
    correct: 0,
    hint: "Це найкоротший тег — лише одна літера.",
    explain: "<a href=\"...\"> — це посилання, на яке можна натиснути.",
  },
  {
    id: "html-img",
    tag: "#html",
    text: "Який тег показує картинку?",
    options: ["<img>", "<pic>", "<image>", "<src>"],
    correct: 0,
    hint: "Скорочення від англійського image.",
    explain: "<img src=\"...\"> вставляє зображення на сторінку.",
  },
  {
    id: "html-h1",
    tag: "#html",
    text: "Який тег — найбільший заголовок?",
    options: ["<h1>", "<h6>", "<head>", "<title>"],
    correct: 0,
    hint: "Чим менше число після h, тим більший заголовок.",
    explain: "<h1> — головний заголовок сторінки.",
  },
  {
    id: "html-p",
    tag: "#html",
    text: "Яким тегом позначають звичайний абзац тексту?",
    options: ["<p>", "<text>", "<a>", "<br>"],
    correct: 0,
    hint: "Перша літера англійського paragraph.",
    explain: "<p> — абзац, звичайний блок тексту.",
  },
  {
    id: "html-close",
    tag: "#html",
    text: "Як правильно закрити тег <b>?",
    options: ["</b>", "<b/>", "<\\b>", "<end b>"],
    correct: 0,
    hint: "Закривальний тег має похилу риску одразу після <.",
    explain: "</b> закриває жирний текст, відкритий тегом <b>.",
  },
  {
    id: "css-color",
    tag: "#css",
    text: "Яка властивість CSS змінює колір тексту?",
    options: ["color", "background", "font-color", "text-paint"],
    correct: 0,
    hint: "Найпростіше англійське слово «колір».",
    explain: "color: pink; — і текст стане рожевим.",
  },
  {
    id: "web-browser",
    tag: "#веб",
    text: "Яка програма відкриває вебсторінки?",
    options: ["Браузер", "Компілятор", "Антивірус", "Архіватор"],
    correct: 0,
    hint: "Chrome, Firefox, Safari — це саме вони.",
    explain: "Браузер читає HTML і малює сторінку.",
  },
  {
    id: "web-url",
    tag: "#веб",
    text: "Що з цього — адреса сайту?",
    options: ["https://bitlynn.app", "bitlynn@app", "C:\\bitlynn", "#bitlynn"],
    correct: 0,
    hint: "Адреса сайту зазвичай починається з https://",
    explain: "https:// і назва домену — так виглядає адреса сайту.",
  },
  {
    id: "info-binary",
    tag: "#інформація",
    text: "Якими цифрами записує все комп'ютер?",
    options: ["0 і 1", "1 і 2", "0–9", "Лише 1"],
    correct: 0,
    hint: "Двійкова система — лише дві цифри.",
    explain: "Біт — це 0 або 1, з них складається все.",
  },
];

const genSequence = (): Question => {
  const start = rnd(1, 6);
  const step = rnd(2, 5);
  const seq = [0, 1, 2, 3].map((i) => start + i * step);
  const right = start + 4 * step;
  const { options, correct } = uniqueOptions(String(right), [String(right + 1), String(right - step + 1), String(seq[3] * 2)]);
  return {
    id: "gen-sequence",
    tag: "#послідовності",
    text: "Яке число наступне?",
    code: seq.join(", ") + ", ?",
    options,
    correct,
    hint: "Подивись, на скільки зростає кожне наступне число.",
    explain: `Кожне число більше за попереднє на ${step}: ${seq[3]} + ${step} = ${right}.`,
  };
};

const genIfElse = (): Question => {
  const x = rnd(1, 12);
  const limit = rnd(4, 9);
  const right = x > limit ? "велике" : "мале";
  return {
    id: "gen-ifelse",
    tag: "#умови",
    text: "Що виведе програма?",
    code: `x = ${x}\nif x > ${limit}:\n    print("велике")\nelse:\n    print("мале")`,
    options: [right, right === "велике" ? "мале" : "велике", "нічого", "помилку"],
    correct: 0,
    hint: `Порівняй ${x} і ${limit}: чи справді ${x} більше?`,
    explain: `${x} ${x > limit ? ">" : "≤"} ${limit}, тому виконується гілка «${right}».`,
  };
};

export const LOGIC_BANK: QuestionSource[] = [
  genSequence,
  genIfElse,
  {
    id: "logic-and",
    tag: "#логіка",
    text: "Двері відчиняються, якщо є ключ І відомий код. Ключ є, коду немає. Що буде?",
    options: ["Двері зачинені", "Двері відчиняться", "Відчиняться наполовину", "Невідомо"],
    correct: 0,
    hint: "«І» означає, що потрібні обидві умови одночасно.",
    explain: "Для «І» мають виконатися обидві умови, а коду немає.",
  },
  {
    id: "logic-or",
    tag: "#логіка",
    text: "Світло вмикається, якщо натиснути кнопку АБО плеснути. Ти плеснув. Що буде?",
    options: ["Світло ввімкнеться", "Нічого", "Треба ще кнопку", "Блимне й згасне"],
    correct: 0,
    hint: "«АБО» — достатньо однієї умови.",
    explain: "Для «АБО» вистачає однієї виконаної умови.",
  },
  {
    id: "logic-not",
    tag: "#логіка",
    text: "Що означає not True?",
    options: ["False (неправда)", "True (правда)", "Нуль", "Помилку"],
    correct: 0,
    hint: "not перевертає значення на протилежне.",
    explain: "not змінює True на False і навпаки.",
  },
  {
    id: "logic-algo",
    tag: "#алгоритми",
    text: "Що таке алгоритм?",
    options: ["Чіткий план кроків для задачі", "Назва комп’ютера", "Вид вірусу", "Мова програмування"],
    correct: 0,
    hint: "Згадай рецепт: спочатку одне, потім інше.",
    explain: "Алгоритм — послідовність кроків, які ведуть до результату.",
  },
  {
    id: "logic-loop",
    tag: "#цикли",
    text: "Робот робить «крок» 4 рази поспіль. Як записати це коротше?",
    options: ["Повторити 4 рази: крок", "крок крок", "Якщо крок, то 4", "крок + 4"],
    correct: 0,
    hint: "Однакові дії, що повторюються, — це цикл.",
    explain: "Цикл «повторити N разів» замінює однакові рядки.",
  },
  {
    id: "logic-bug",
    tag: "#дебаг",
    text: "Програма мала намалювати квадрат, а намалювала лише 3 сторони. Що не так?",
    options: ["Цикл повторюється 3 рази, а не 4", "Комп’ютер зламався", "Забули колір", "Квадрат завеликий"],
    correct: 0,
    hint: "Скільки сторін у квадрата і скільки разів повторився крок?",
    explain: "У квадрата 4 сторони, тож цикл має бути на 4 повтори.",
  },
  {
    id: "logic-order",
    tag: "#алгоритми",
    text: "Який порядок правильний, щоб надіслати лист?",
    options: ["Написати → адреса → надіслати", "Надіслати → написати → адреса", "Адреса → надіслати → написати", "Будь-який"],
    correct: 0,
    hint: "Не можна надіслати те, що ще не написано.",
    explain: "Кроки алгоритму мають логічний порядок.",
  },
];

export type Direction = "python" | "web" | "logic";

export const DIRECTIONS: { id: Direction; label: string; tag: string }[] = [
  { id: "python", label: "Python", tag: "#python" },
  { id: "web", label: "Веб", tag: "#html" },
  { id: "logic", label: "Логіка", tag: "#логіка" },
];

export interface CatchCategory {
  id: string;
  title: string;
  right: string[];
  wrong: { word: string; why: string }[];
}

export const CATCH_CATEGORIES: CatchCategory[] = [
  {
    id: "input",
    title: "Пристрої введення",
    right: ["миша", "клавіатура", "сканер", "мікрофон", "камера", "тачпад"],
    wrong: [
      { word: "монітор", why: "монітор показує — це виведення" },
      { word: "принтер", why: "принтер друкує — це виведення" },
      { word: "колонки", why: "колонки звучать — це виведення" },
      { word: "навушники", why: "навушники звучать — це виведення" },
    ],
  },
  {
    id: "output",
    title: "Пристрої виведення",
    right: ["монітор", "принтер", "колонки", "навушники", "проєктор"],
    wrong: [
      { word: "миша", why: "мишею ми вводимо — це введення" },
      { word: "клавіатура", why: "нею ми друкуємо — це введення" },
      { word: "мікрофон", why: "мікрофон слухає — це введення" },
      { word: "сканер", why: "сканер зчитує — це введення" },
    ],
  },
  {
    id: "images",
    title: "Файли-картинки",
    right: [".png", ".jpg", ".gif", ".svg", ".webp"],
    wrong: [
      { word: ".mp3", why: ".mp3 — це звук" },
      { word: ".txt", why: ".txt — це текст" },
      { word: ".py", why: ".py — це програма на Python" },
      { word: ".mp4", why: ".mp4 — це відео" },
    ],
  },
  {
    id: "langs",
    title: "Мови програмування",
    right: ["Python", "JavaScript", "Scratch", "C++", "Java"],
    wrong: [
      { word: "Chrome", why: "Chrome — це браузер" },
      { word: "Windows", why: "Windows — це операційна система" },
      { word: "Word", why: "Word — це текстовий редактор" },
      { word: "YouTube", why: "YouTube — це вебсайт" },
    ],
  },
  {
    id: "storage",
    title: "Де зберігаються файли",
    right: ["флешка", "SSD", "жорсткий диск", "хмара", "карта пам'яті"],
    wrong: [
      { word: "процесор", why: "процесор рахує, а не зберігає" },
      { word: "монітор", why: "монітор лише показує" },
      { word: "миша", why: "миша — для керування" },
      { word: "роутер", why: "роутер роздає інтернет" },
    ],
  },
];

export function materialize(src: QuestionSource): Question {
  return typeof src === "function" ? src() : src;
}

/** Shuffle options but remember where the right one went. */
export function shuffleQuestion(q: Question): Question {
  const order = q.options.map((_, i) => i).sort(() => Math.random() - 0.5);
  return {
    ...q,
    options: order.map((i) => q.options[i]),
    correct: order.indexOf(q.correct),
  };
}

export function bankFor(dir: Direction): QuestionSource[] {
  return dir === "python" ? PYTHON_BANK : dir === "web" ? WEB_BANK : LOGIC_BANK;
}

const GENERATORS: Record<string, () => Question> = {
  "gen-range": genRange,
  "gen-precedence": genPrecedence,
  "gen-len": genLen,
  "gen-index": genIndex,
  "gen-bytes": genBytes,
  "gen-sequence": genSequence,
  "gen-ifelse": genIfElse,
};

export function idOf(src: QuestionSource): string {
  if (typeof src !== "function") return src.id;
  return Object.keys(GENERATORS).find((k) => GENERATORS[k] === src) ?? "gen";
}

export function sourceById(id: string): QuestionSource | undefined {
  if (GENERATORS[id]) return GENERATORS[id];
  return [...PYTHON_BANK, ...WEB_BANK, ...LOGIC_BANK].find((s) => typeof s !== "function" && s.id === id);
}
