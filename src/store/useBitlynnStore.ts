import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type AppView =
  | "home"
  | "arcade"
  | "play-hangman"
  | "play-mutator"
  | "cyber-crew"
  | "peer-exchange"
  | "teacher-templates"
  | "sanctum";

export type BitlynnTab = AppView;

export type SanctumSection = "market" | "blitz" | "tournaments";

export interface StudentProfile {
  name: string;
  grade: string;
  callsign: string;
}

export function formatStudentAuthorName(profile: StudentProfile): string {
  return `Ви (${profile.name} • ${profile.grade})`;
}

export function formatStudentAnonAlias(
  profile: StudentProfile,
  withYouSuffix = true
): string {
  return withYouSuffix ? `${profile.callsign} (Ви)` : profile.callsign;
}

function isCurrentUserAuthor(
  authorName: string,
  authorAnonAlias: string | undefined,
  profile: StudentProfile
): boolean {
  const formatted = formatStudentAuthorName(profile);
  return (
    authorName.startsWith("Ви (") ||
    authorName === formatted ||
    Boolean(authorAnonAlias?.includes("(Ви)"))
  );
}

export type UserRole = "student" | "teacher";

export type PrivacyScope = "class-named" | "interschool-anon";

export type ModerationStatus = "approved" | "pending-teacher" | "rejected";

export type MasteryRank =
  | "Kilo-Node"
  | "Mega-Stream"
  | "Giga-Coder"
  | "Tera-Architect";

export type LynnMood =
  | "sleeping"
  | "curious"
  | "coding"
  | "debugging"
  | "triumph";

export interface HangmanWordItem {
  id: string;
  word: string;
  clue: string;
  radarKeyword: string;
  radarFact: string;
}

export interface MutatorBlueprint {
  id: string;
  type: "bytes-to-bits" | "bits-to-bytes" | "word-encoding" | "unit-compare";
  title: string;
}

export interface LessonTemplate {
  id: string;
  title: string;
  subject: string;
  gradeRange: string;
  author: string;
  isPublic: boolean;
  deliveryMode: "classroom-15m" | "homework";
  forksCount: number;
  hangmanWords: HangmanWordItem[];
  mutatorBlueprints: MutatorBlueprint[];
}

export interface LynnSkin {
  id: string;
  name: string;
  tagline: string;
  byteCost: number;
  primaryHex: string;
  secondaryHex: string;
  gillHex: string;
}

export interface AnswerVfxItem {
  id: string;
  name: string;
  tagline: string;
  coinCost: number;
  emoji: string;
  accentHex: string;
}

export interface PeerReply {
  id: string;
  authorName: string;
  authorAnonAlias: string;
  schoolBadge: string;
  explanation: string;
  empathyNote: string;
  createdAt: string;
  reactions?: Record<string, number>;
  acceptedByAuthor?: boolean;
}

export interface DailyQuestSteps {
  playedGame: boolean;
  helpedPeer: boolean;
  boostedOrCustomized: boolean;
  claimedBonus: boolean;
}

export interface SquadFeedItem {
  id: string;
  memberName: string;
  actionText: string;
  points: number;
  timestamp: string;
}

export type ClassroomSessionMode =
  | "play-hangman"
  | "play-mutator"
  | "cyber-crew";

export interface ClassroomSession {
  active: boolean;
  mode: ClassroomSessionMode;
  remainingSeconds: number;
  assignedAsHomework: boolean;
}

export interface PeerHelpTicket {
  id: string;
  topic: string;
  question: string;
  scope: PrivacyScope;
  authorName: string;
  authorAnonAlias: string;
  grade: string;
  bountyCoins: number;
  status: "open" | "solved";
  replies: PeerReply[];
}

export interface StudentChallenge {
  id: string;
  title: string;
  authorName: string;
  authorAnonAlias: string;
  scope: PrivacyScope;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  rewardCoins: number;
  solvedByUser: boolean;
  likes: number;
}

export interface FunBlitzQuestion {
  q: string;
  options: string[];
  funOutcome: string;
}

export interface StudentFunBlitz {
  id: string;
  title: string;
  authorName: string;
  durationSeconds: number;
  status: ModerationStatus;
  teacherNote: string;
  questions: FunBlitzQuestion[];
  playsCount: number;
}

export interface TournamentSquad {
  id: string;
  name: string;
  motto: string;
  membersCount: number;
  maxMembers: number;
  scorePoints: number;
  discountReward: string;
  isUserSquad: boolean;
}

export const LYNN_SKINS: LynnSkin[] = [
  {
    id: "neon-default",
    name: "Biolume Axolotl",
    tagline: "Оригінальне кібер-сяйво та сакурові зябра регенерації.",
    byteCost: 0,
    primaryHex: "#00F2FE",
    secondaryHex: "#4FACFE",
    gillHex: "#FF6AD5",
  },
  {
    id: "plasma-lotl",
    name: "Plasma Pulse",
    tagline: "Високовольтне маджента-ядро, загартоване у сміливому дебагінгу.",
    byteCost: 2,
    primaryHex: "#FF6AD5",
    secondaryHex: "#9B51E0",
    gillHex: "#00F2FE",
  },
  {
    id: "emerald-synapse",
    name: "Emerald Synapse",
    tagline: "Чиста нейронна зелень для архітекторів бездоганної логіки.",
    byteCost: 3,
    primaryHex: "#38EF7D",
    secondaryHex: "#11998E",
    gillHex: "#FFE066",
  },
  {
    id: "solar-architect",
    name: "Tera-Gold Hologram",
    tagline: "Призматичне золоте сяйво для майстрів тихих командних батлів.",
    byteCost: 5,
    primaryHex: "#FFB800",
    secondaryHex: "#FF5E62",
    gillHex: "#00F2FE",
  },
];

export const ANSWER_VFX_ITEMS: AnswerVfxItem[] = [
  {
    id: "vfx-cyber-spark",
    name: "Кібер-Іскра (Базова)",
    tagline: "Стандартний біолюмінесцентний імпульс під час правильної відповіді.",
    coinCost: 0,
    emoji: "⚡",
    accentHex: "#00F2FE",
  },
  {
    id: "vfx-sakura-wave",
    name: "Вихор Кібер-Сакури",
    tagline: "Неонові пелюстки аксолотля розлітаються екраном при перемозі в раунді.",
    coinCost: 120,
    emoji: "🌸",
    accentHex: "#FF6AD5",
  },
  {
    id: "vfx-matrix-rain",
    name: "Бінарний Каскад 0101",
    tagline: "Смарагдовий водоспад бітів та байтів підсвічує твій нікнейм у класі.",
    coinCost: 180,
    emoji: "🟢",
    accentHex: "#38EF7D",
  },
  {
    id: "vfx-supernova",
    name: "Квантова Наднова",
    tagline: "Золотий голографічний вибух для лідерів квартального турніру.",
    coinCost: 250,
    emoji: "🌟",
    accentHex: "#FFB800",
  },
];

export const INITIAL_TEMPLATES: LessonTemplate[] = [
  {
    id: "tpl-info-units",
    title: "Інформатика: Одиниці інформації",
    subject: "Інформатика",
    gradeRange: "5–7 клас",
    author: "Базовий шаблон Bitlynn",
    isPublic: true,
    deliveryMode: "classroom-15m",
    forksCount: 148,
    hangmanWords: [
      {
        id: "w-bit",
        word: "БІТ",
        clue: "Найменша одиниця вимірювання інформації, що може приймати значення 0 або 1.",
        radarKeyword: "мінімум",
        radarFact:
          "Походить від англ. BInary digiT (двійкова цифра). Це буквально один перемикач: світло вимкнено (0) або увімкнено (1).",
      },
      {
        id: "w-byte",
        word: "БАЙТ",
        clue: "Послідовність із 8 двійкових розрядів, достатня для кодування 1 символу латиниці.",
        radarKeyword: "вісім",
        radarFact:
          "1 БАЙТ = 8 БІТІВ. Саме стільки потрібно, щоб записати одну літеру в таблиці ASCII (наприклад, літеру 'A').",
      },
      {
        id: "w-kilobyte",
        word: "КІЛОБАЙТ",
        clue: "Одиниця інформації, що дорівнює 1024 байтам у двійковій системі.",
        radarKeyword: "тисяча",
        radarFact:
          "Префікс 'кіло-' в комп'ютерній пам'яті означає степінь двійки: 2¹⁰ = 1024 байти (приблизно половина сторінки чистого тексту).",
      },
      {
        id: "w-coding",
        word: "КОДУВАННЯ",
        clue: "Процес перетворення повідомлення у форму, зручну для зберігання та передачі.",
        radarKeyword: "перетворення",
        radarFact:
          "Азбука Морзе, шрифт Брайля та двійковий код у смартфоні — це все приклади різних способів представлення однакового змісту.",
      },
      {
        id: "w-alphabet",
        word: "АЛФАВІТ",
        clue: "Упорядкований скінченний набір символів, з яких складаються повідомлення.",
        radarKeyword: "набір символів",
        radarFact:
          "Для двійкової системи він складається всього з двох знаків ('0' і '1'), а для української мови — із 33 літер.",
      },
    ],
    mutatorBlueprints: [
      {
        id: "mb-1",
        type: "bytes-to-bits",
        title: "Динамічна конвертація: Байти → Біти",
      },
      {
        id: "mb-2",
        type: "bits-to-bytes",
        title: "Зворотне пакування: Біти → Байти",
      },
      {
        id: "mb-3",
        type: "word-encoding",
        title: "Вага слова в пам'яті (ASCII / Unicode)",
      },
      {
        id: "mb-4",
        type: "unit-compare",
        title: "Порівняння величин без зазубрювання",
      },
    ],
  },
  {
    id: "tpl-algorithms",
    title: "Алгоритми та базові структури",
    subject: "Інформатика",
    gradeRange: "6–8 клас",
    author: "Олена Коваль (Вчитель)",
    isPublic: true,
    deliveryMode: "classroom-15m",
    forksCount: 74,
    hangmanWords: [
      {
        id: "w-loop",
        word: "ЦИКЛ",
        clue: "Алгоритмічна конструкція, що повторює певну групу команд багато разів.",
        radarKeyword: "повторення",
        radarFact:
          "Замість того щоб писати 'крок вперед' 100 разів, програміст огортає одну дію в повторюваний блок (for або while).",
      },
      {
        id: "w-condition",
        word: "УМОВА",
        clue: "Логічна перевірка (якщо → то / інакше), яка визначає напрямок виконання програми.",
        radarKeyword: "розгалуження",
        radarFact:
          "Приклад з життя: ЯКЩО на вулиці дощ, ТО взяти парасольку, ІНАКШЕ — одягнути окуляри.",
      },
      {
        id: "w-variable",
        word: "ЗМІННА",
        clue: "Іменована комірка пам'яті, значення якої може оновлюватися під час гри або програми.",
        radarKeyword: "коробка пам'яті",
        radarFact:
          "Лічильник твоїх коїнів або життів у грі зберігається саме в такій іменованій комірці.",
      },
      {
        id: "w-flowchart",
        word: "БЛОКСХЕМА",
        clue: "Графічний спосіб подання алгоритму за допомогою геометричних фігур і стрілок.",
        radarKeyword: "графіка",
        radarFact:
          "Овал означає початок або кінець, прямокутник — дію, а ромб — перевірку умови.",
      },
    ],
    mutatorBlueprints: [
      {
        id: "mb-alg-1",
        type: "bytes-to-bits",
        title: "Оцінка розміру змінних у бітах",
      },
      {
        id: "mb-alg-2",
        type: "word-encoding",
        title: "Довжина рядків у пам'яті",
      },
    ],
  },
  {
    id: "tpl-cybersec",
    title: "Цифрова гігієна та паролі",
    subject: "Цифрова безпека",
    gradeRange: "5–9 клас",
    author: "Тарас Мельник (Вчитель)",
    isPublic: true,
    deliveryMode: "homework",
    forksCount: 92,
    hangmanWords: [
      {
        id: "w-phishing",
        word: "ФІШИНГ",
        clue: "Вид інтернет-шахрайства, коли зловмисники виманюють паролі підробними сайтами.",
        radarKeyword: "обман",
        radarFact:
          "Назва співзвучна з англ. fishing ('риболовля'). Шахраї закидають 'наживку' на кшталт 'Ти виграв 1000 скінів — увійди за посиланням'.",
      },
      {
        id: "w-password",
        word: "ПАРОЛЬ",
        clue: "Секретний набір символів для підтвердження особи під час входу в акаунт.",
        radarKeyword: "ключ",
        radarFact:
          "Надійний секретний ключ має містити щонайменше 12 символів, великі й малі літери, цифри та спецзнаки.",
      },
      {
        id: "w-2fa",
        word: "ДВОФАКТОРКА",
        clue: "Розмовна назва захисту акаунту, де окрім пароля потрібен ще код підтвердження.",
        radarKeyword: "подвійний захист",
        radarFact:
          "Навіть якщо злодій вкраде пароль, без другого фактору (SMS або застосунку-автентифікатора) він не зайде в акаунт.",
      },
      {
        id: "w-cipher",
        word: "ШИФР",
        clue: "Секретний спосіб перетворення тексту так, щоб його не змогли прочитати сторонні.",
        radarKeyword: "секретність",
        radarFact:
          "Юлій Цезар використовував зсув літер алфавіту, а сучасні месенджери — наскрізну математику великих простих чисел.",
      },
    ],
    mutatorBlueprints: [
      {
        id: "mb-sec-1",
        type: "bytes-to-bits",
        title: "Криптостійкість ключа в бітах",
      },
      {
        id: "mb-sec-2",
        type: "word-encoding",
        title: "Довжина пароля в байтах",
      },
    ],
  },
];

export const INITIAL_PEER_TICKETS: PeerHelpTicket[] = [
  {
    id: "tkt-1",
    topic: "Одиниці інформації",
    question:
      "Друзі, вчителька дала ДЗ: чому 2 Кілобайти — це 2048 байтів, а не 2000? Я постійно плутаю з кілограмами 😢 Поясніть по-людськи!",
    scope: "class-named",
    authorName: "Софія Бондаренко (7-А)",
    authorAnonAlias: "Кібер-Промінь #308",
    grade: "6 клас",
    bountyCoins: 35,
    status: "open",
    replies: [
      {
        id: "rep-1",
        authorName: "Максим Кравчук (7-А)",
        authorAnonAlias: "Неоновий Сокіл #114",
        schoolBadge: "Однокласник • 7-А",
        explanation:
          "Софіє, не переживай! У звичайному житті ми рахуємо десятками (10³ = 1000), а комп'ютер знає лише 0 і 1 (двійкова система). Тому він множить двійки: 2¹⁰ = 1024 байти в 1 КБ. А 2 КБ = 1024 × 2 = 2048!",
        empathyNote: "Я теж минулого тижня на цьому спіткнувся, ти супер! 💪",
        createdAt: "4 хв тому",
      },
    ],
  },
  {
    id: "tkt-2",
    topic: "Кодування Unicode vs ASCII",
    question:
      "Спитав у нейромережі задачу зі шкільного тесту про вагу слова «СОНЦЕ» в UTF-16, а вона написала пів сторінки складних термінів. Як це швидко рахувати на контроній?",
    scope: "interschool-anon",
    authorName: "Денис Ткаченко (Ліцей №14)",
    authorAnonAlias: "Квантовий Єнот #742",
    grade: "7 клас",
    bountyCoins: 45,
    status: "open",
    replies: [],
  },
  {
    id: "tkt-3",
    topic: "Алгоритми та Цикли",
    question:
      "Хто може пояснити різницю між циклом «ПОКИ» (while) та циклом з лічильником (for) на прикладі Кібер-Екіпажу або командного бліцу?",
    scope: "interschool-anon",
    authorName: "Аліна Савчук (Гімназія №5)",
    authorAnonAlias: "Біолюм-Лисиця #509",
    grade: "6 клас",
    bountyCoins: 40,
    status: "open",
    replies: [],
  },
];

export const INITIAL_STUDENT_CHALLENGES: StudentChallenge[] = [
  {
    id: "ugc-1",
    title: "Пастка від 7-А: Скільки бітів у слові «КІТ»?",
    authorName: "Артем Коваленко (7-А)",
    authorAnonAlias: "Піксель-Дракон #812",
    scope: "class-named",
    prompt:
      "У слові «КІТ» 3 літери. Кожна літера кодується 1 байтом. Скільки БІТІВ займає це слово?",
    options: ["3 біти", "24 біти", "30 бітів", "12 бітів"],
    correctIndex: 1,
    explanation: "3 літери × 1 байт = 3 байти. А 3 байти × 8 бітів = 24 біти!",
    rewardCoins: 30,
    solvedByUser: false,
    likes: 19,
  },
  {
    id: "ugc-2",
    title: "Міжшкільний ребус: Чи влізе мем у пам'ять?",
    authorName: "Оксана Мельник",
    authorAnonAlias: "Кібер-Комета #401",
    scope: "interschool-anon",
    prompt:
      "У тебе залишилось рівно 2 КБ вільної пам'яті. Ти хочеш зберегти текстовий файл на 2020 байтів. Чи вистачить місця?",
    options: [
      "Так, ще залишиться 28 байтів!",
      "Ні, не вистачить 20 байтів",
      "Вистачить впритул (0 байтів залишку)",
      "Залежить від яскравості екрана",
    ],
    correctIndex: 0,
    explanation:
      "2 КБ = 2 × 1024 = 2048 байтів. 2048 - 2020 = 28 байтів ще залишиться вільними!",
    rewardCoins: 35,
    solvedByUser: false,
    likes: 34,
  },
];

export const INITIAL_FUN_BLITZES: StudentFunBlitz[] = [
  {
    id: "fun-1",
    title: "⚡ 60-сек Мем-Бліц: Хто ти на уроці інформатики?",
    authorName: "Максим К. (7-А)",
    durationSeconds: 60,
    status: "approved",
    teacherNote: "Перевірено вчителем: добрий гумор без образ однокласників.",
    playsCount: 18,
    questions: [
      {
        q: "Коли вчитель каже «Відкриваємо телефони для 15-хвилинної гри в Bitlynn», твоя перша дія:",
        options: [
          "Вводжу 4-значний PIN швидше за швидкість світла ⚡",
          "Шикаю на сусіда по парті, щоб не збив бонус тиші x1.5 🤫",
          "Одразу шукаю, хто сьогодні Саботажник у Кібер-Екіпажі 🛸",
        ],
        funOutcome: "Ти — Кібер-Ніндзя Тихого Шторму!",
      },
      {
        q: "Якби твій мозок після 6-го уроку вимірювали в одиницях інформації, скільки б там було вільної оперативки?",
        options: [
          "Цілий Терабайт — готовий тягнути команду в Турнірі! 🚀",
          "Рівно 8 бітів — вистачає тільки на смайлик у чаті 😂",
          "Режим регенерації аксолотля Лінн 🦎",
        ],
        funOutcome: "Легендарний Архітектор Кешу!",
      },
    ],
  },
  {
    id: "fun-2",
    title: "🛸 Бліц-опитування: Який сектор станції твій улюблений?",
    authorName: "Дарина П. (7-А)",
    durationSeconds: 45,
    status: "pending-teacher",
    teacherNote: "Очікує 1-клік перевірки вчителем перед запуском на клас (Анти-Булінг фільтр пройдено).",
    playsCount: 0,
    questions: [
      {
        q: "Що ти робиш, якщо в Кібер-Екіпажі заморозили твого друга?",
        options: [
          "Миттєво біжу розморожувати задачею за +25 коїнів 🤝",
          "Перевіряю лог термінала, хто підкинув фейкову формулу 🔍",
          "Скликаю Екстрені Збори! 🚨",
        ],
        funOutcome: "Справжній Капітан Орбіти!",
      },
    ],
  },
];

export const INITIAL_TOURNAMENT_SQUADS: TournamentSquad[] = [
  {
    id: "sq-1",
    name: "Кібер-Козаки 7-А",
    motto: "Тиша в класі — золото в байтах!",
    membersCount: 16,
    maxMembers: 18,
    scorePoints: 4850,
    discountReward: "🥇 1 Місце: -30% знижка на наступний навчальний рік",
    isUserSquad: true,
  },
  {
    id: "sq-2",
    name: "Квантові Сови (Львів)",
    motto: "Жодного сліпого кліку — тільки чиста логіка",
    membersCount: 17,
    maxMembers: 18,
    scorePoints: 4720,
    discountReward: "🥈 2 Місце: -20% знижка на наступний навчальний рік",
    isUserSquad: false,
  },
  {
    id: "sq-3",
    name: "Неонові Аксолотлі (Харків)",
    motto: "Регенеруємо знання разом",
    membersCount: 15,
    maxMembers: 18,
    scorePoints: 4390,
    discountReward: "🥉 3 Місце: -10% знижка на наступний навчальний рік",
    isUserSquad: false,
  },
];

function computeMasteryRank(completedCount: number, bytes: number): MasteryRank {
  const score = completedCount * 2 + bytes;
  if (score >= 16) return "Tera-Architect";
  if (score >= 11) return "Giga-Coder";
  if (score >= 7) return "Mega-Stream";
  return "Kilo-Node";
}

function recomputeSquadDiscounts(squads: TournamentSquad[]): TournamentSquad[] {
  const sorted = [...squads].sort((a, b) => b.scorePoints - a.scorePoints);
  return sorted.map((sq, idx) => {
    const discountReward =
      idx === 0
        ? "🥇 1 Місце: -30% знижка на наступний навчальний рік"
        : idx === 1
        ? "🥈 2 Місце: -20% знижка на наступний навчальний рік"
        : idx === 2
        ? "🥉 3 Місце: -10% знижка на наступний навчальний рік"
        : `🎖️ #${idx + 1} у рейтингу: +100 бонусних коїнів команді`;
    return { ...sq, discountReward };
  });
}

function addUserSquadPoints(
  squads: TournamentSquad[],
  points: number
): TournamentSquad[] {
  if (points <= 0) return squads;
  return recomputeSquadDiscounts(
    squads.map((sq) =>
      sq.isUserSquad ? { ...sq, scorePoints: sq.scorePoints + points } : sq
    )
  );
}

function prependSquadFeed(
  feed: SquadFeedItem[],
  memberName: string,
  actionText: string,
  points: number
): SquadFeedItem[] {
  const entry: SquadFeedItem = {
    id: `sf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    memberName,
    actionText,
    points,
    timestamp: "Щойно",
  };
  return [entry, ...feed].slice(0, 8);
}

function buildWarmPeerExplanation(topic: string, question: string): string {
  const qLower = `${topic} ${question}`.toLowerCase();
  if (qLower.includes("біт") || qLower.includes("байт") || qLower.includes("utf")) {
    return "Ось простий лайфхак: 1 байт — це рівно 8 бітів (як 8 шматочків піци в одній коробці 🍕). Щоб перевести байти в біти — множ на 8, а в UTF-16 кожна літера бере 2 байти!";
  }
  if (qLower.includes("цикл") || qLower.includes("for") || qLower.includes("while")) {
    return "Запам'ятати легко на прикладі Кібер-Екіпажу: цикл FOR — це обійти рівно 4 задані сектори станції по черзі, а цикл WHILE (ПОКИ) — патрулювати карту, ПОКИ всі оптичні канали не стануть зеленими!";
  }
  if (qLower.includes("сірник") || qLower.includes("логік") || qLower.includes("умов")) {
    return "Тут головне не поспішати: поділи задачу на дві прості умови «ЯКЩО → ТО → ІНАКШЕ». Перевір найменший приклад спочатку, і вся схема одразу складеться!";
  }
  if (qLower.includes("дрот") || qLower.includes("реактор") || qLower.includes("2fa") || qLower.includes("парол")) {
    return "У цій консолі дивись на ключове слово в підказці зверху: спочатку поєднай знайомі пари (напр. 1 Байт → 8 бітів), а інша пара залишиться методом виключення 😉";
  }
  return `Я щойно розібрав(ла) це на уроці з теми «${topic}»! Головна підказка: розбий умову на маленькі кроки та звірся з ключовим терміном — і відповідь одразу стане очевидною ✨`;
}

export const INITIAL_DAILY_QUEST_STEPS: DailyQuestSteps = {
  playedGame: false,
  helpedPeer: false,
  boostedOrCustomized: false,
  claimedBonus: false,
};

export const INITIAL_SQUAD_FEED: SquadFeedItem[] = [
  {
    id: "sf-1",
    memberName: "Софія М. (7-А)",
    actionText: "Виконала 5 консолей у Кібер-Екіпажі",
    points: 45,
    timestamp: "5 хв тому",
  },
  {
    id: "sf-2",
    memberName: "Дарина К. (7-А)",
    actionText: "Пояснила UTF-16 на Біржі Допомоги",
    points: 35,
    timestamp: "12 хв тому",
  },
  {
    id: "sf-3",
    memberName: "Артем В. (7-А)",
    actionText: "Розгадав слово «КІЛОБАЙТ» у Шибениці",
    points: 30,
    timestamp: "19 хв тому",
  },
];

export const INITIAL_CLASSROOM_SESSION: ClassroomSession = {
  active: false,
  mode: "cyber-crew",
  remainingSeconds: 900,
  assignedAsHomework: false,
};

export type TournamentCadence = "monthly" | "quarterly";

export interface DraftHelpRequest {
  topic: string;
  question: string;
}

export interface BitlynnState {
  _hasHydrated: boolean;
  activeTab: AppView;
  sanctumSection: SanctumSection;
  userRole: UserRole;
  roomPin: string;
  noiseLevelDb: number;
  privacyScope: PrivacyScope;
  tournamentCadence: TournamentCadence;
  draftHelpRequest: DraftHelpRequest | null;
  studentProfile: StudentProfile;

  bits: number;
  bytes: number;
  lifetimeBytesEarned: number;
  waveStreak: number;
  completedChallengesCount: number;
  masteryRank: MasteryRank;
  lynnMood: LynnMood;
  equippedSkin: string;
  unlockedSkins: string[];
  equippedVfx: string;
  unlockedVfx: string[];
  regenerationCount: number;

  templates: LessonTemplate[];
  activeTemplateId: string;
  hangmanWordIndexByTemplate: Record<string, number>;
  hangmanSolvedWordKeys: string[];
  seenMutatorKeys: string[];

  peerTickets: PeerHelpTicket[];
  studentChallenges: StudentChallenge[];
  likedChallengeIds: string[];
  funBlitzList: StudentFunBlitz[];
  completedBlitzIds: string[];
  tournamentSquads: TournamentSquad[];
  dailyQuestSteps: DailyQuestSteps;
  squadFeed: SquadFeedItem[];
  classroomSession: ClassroomSession;

  // Actions
  setHasHydrated: (hydrated: boolean) => void;
  setActiveTab: (tab: AppView) => void;
  setSanctumSection: (section: SanctumSection) => void;
  openSanctumSection: (section: SanctumSection) => void;
  setUserRole: (role: UserRole) => void;
  regenerateRoomPin: () => string;
  joinRoomByPin: (pin: string) => boolean;
  updateStudentProfile: (patch: Partial<StudentProfile>) => void;
  setNoiseLevelDb: (db: number) => void;
  setPrivacyScope: (scope: PrivacyScope) => void;
  setTournamentCadence: (cadence: TournamentCadence) => void;
  askPeersAboutTask: (topic: string, question: string) => void;
  clearDraftHelpRequest: () => void;
  selectTemplate: (id: string) => void;
  setHangmanWordIndex: (templateId: string, index: number) => void;
  advanceHangmanWord: (templateId: string) => void;
  recordHangmanSolvedWord: (wordKey: string) => void;
  recordSeenMutatorKey: (key: string) => void;
  resetSeenMutatorKeys: () => void;
  addWordToTemplate: (
    templateId: string,
    item: Omit<HangmanWordItem, "id">
  ) => void;
  removeWordFromTemplate: (templateId: string, wordId: string) => void;
  updateTemplateMeta: (
    templateId: string,
    patch: Partial<Pick<LessonTemplate, "title" | "deliveryMode" | "isPublic">>
  ) => void;
  forkTemplate: (templateId: string) => void;
  rewardCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  synthesizeByte: () => boolean;
  triggerMistake: () => void;
  setLynnMood: (mood: LynnMood) => void;
  unlockSkin: (skinId: string, byteCost?: number) => boolean;
  unlockAndEquipVfx: (vfxId: string) => boolean;

  // Peer Social & Freelance Actions
  createPeerTicket: (payload: {
    topic: string;
    question: string;
    bountyCoins: number;
    scope: PrivacyScope;
  }) => boolean;
  answerPeerTicket: (
    ticketId: string,
    explanation: string,
    empathyNote: string
  ) => boolean;
  cancelPeerTicket: (ticketId: string) => boolean;
  createStudentChallenge: (payload: {
    title: string;
    prompt: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    rewardCoins: number;
    scope: PrivacyScope;
  }) => void;
  solveStudentChallenge: (challengeId: string) => void;
  toggleLikeChallenge: (challengeId: string) => void;

  // Fun Blitz & Anti-Bullying Moderation Actions
  submitFunBlitz: (payload: {
    title: string;
    questionText: string;
    options: string[];
    funOutcome?: string;
  }) => { ok: boolean; reason?: string };
  moderateFunBlitz: (blitzId: string, status: ModerationStatus) => void;
  recordFunBlitzPlay: (blitzId: string) => boolean;

  // Tournament Actions
  contributeSquadPoints: (coinsToContribute: number) => boolean;
  createTournamentSquad: (name: string, motto: string) => boolean;
  joinTournamentSquad: (squadId: string) => boolean;
  awardTournamentWinPoints: (points: number) => void;

  // Daily Quest, Live Peer Reactions & Classroom 15-Min Session Actions
  claimDailyQuestBonus: () => boolean;
  receiveSimulatedPeerReply: (ticketId: string) => void;
  reactToPeerReply: (ticketId: string, replyId: string, emoji: string) => void;
  acceptPeerReply: (ticketId: string, replyId: string) => void;
  startClassroomSession: (
    mode: ClassroomSessionMode,
    durationSeconds?: number
  ) => void;
  stopClassroomSession: () => void;
  tickClassroomSession: () => void;
  assignActiveTemplateAsHomework: () => void;
}

export const useBitlynnStore = create<BitlynnState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      activeTab: "home",
      sanctumSection: "market",
      userRole: "student",
      roomPin: "4829",
      noiseLevelDb: 42,
      privacyScope: "class-named",
      tournamentCadence: "quarterly",
      draftHelpRequest: null,
      studentProfile: {
        name: "Олександр",
        grade: "7-А",
        callsign: "Кібер-Аксолотль #901",
      },

      bits: 340,
      bytes: 3,
      lifetimeBytesEarned: 3,
      waveStreak: 5,
      completedChallengesCount: 1,
      masteryRank: "Kilo-Node",
      lynnMood: "curious",
      equippedSkin: "neon-default",
      unlockedSkins: ["neon-default"],
      equippedVfx: "vfx-cyber-spark",
      unlockedVfx: ["vfx-cyber-spark"],
      regenerationCount: 2,

      templates: INITIAL_TEMPLATES,
      activeTemplateId: "tpl-info-units",
      hangmanWordIndexByTemplate: {},
      hangmanSolvedWordKeys: [],
      seenMutatorKeys: [],

      peerTickets: INITIAL_PEER_TICKETS,
      studentChallenges: INITIAL_STUDENT_CHALLENGES,
      likedChallengeIds: [],
      funBlitzList: INITIAL_FUN_BLITZES,
      completedBlitzIds: [],
      tournamentSquads: INITIAL_TOURNAMENT_SQUADS,
      dailyQuestSteps: INITIAL_DAILY_QUEST_STEPS,
      squadFeed: INITIAL_SQUAD_FEED,
      classroomSession: INITIAL_CLASSROOM_SESSION,

      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),

      setActiveTab: (tab) =>
        set((state) => ({
          activeTab: tab,
          lynnMood:
            tab === "play-hangman" ||
            tab === "play-mutator" ||
            tab === "cyber-crew"
              ? "coding"
              : tab === "sanctum"
              ? "curious"
              : state.lynnMood === "debugging"
              ? "curious"
              : state.lynnMood,
        })),

      setSanctumSection: (section) => set({ sanctumSection: section }),

      openSanctumSection: (section) =>
        set({
          sanctumSection: section,
          activeTab: "sanctum",
          lynnMood: "curious",
        }),

      setUserRole: (role) => set({ userRole: role }),

      regenerateRoomPin: () => {
        const current = get().roomPin;
        let nextPin = current;
        while (nextPin === current) {
          nextPin = String(1000 + Math.floor(Math.random() * 9000));
        }
        set({ roomPin: nextPin });
        return nextPin;
      },

      joinRoomByPin: (pin) => {
        const clean = pin.trim();
        if (!/^\d{4}$/.test(clean)) return false;
        set({ roomPin: clean, lynnMood: "curious" });
        return true;
      },

      updateStudentProfile: (patch) =>
        set((state) => ({
          studentProfile: {
            name:
              patch.name !== undefined
                ? patch.name.trim() || state.studentProfile.name
                : state.studentProfile.name,
            grade:
              patch.grade !== undefined
                ? patch.grade.trim() || state.studentProfile.grade
                : state.studentProfile.grade,
            callsign:
              patch.callsign !== undefined
                ? patch.callsign.trim() || state.studentProfile.callsign
                : state.studentProfile.callsign,
          },
        })),

      setNoiseLevelDb: (db) =>
        set({
          noiseLevelDb: Math.max(30, Math.min(95, db)),
        }),

      setPrivacyScope: (scope) => set({ privacyScope: scope }),

      setTournamentCadence: (cadence) => set({ tournamentCadence: cadence }),

      askPeersAboutTask: (topic, question) =>
        set({
          draftHelpRequest: { topic, question },
          activeTab: "peer-exchange",
          lynnMood: "curious",
        }),

      clearDraftHelpRequest: () => set({ draftHelpRequest: null }),

      selectTemplate: (id) =>
        set((state) => {
          const exists = state.templates.some((t) => t.id === id);
          if (!exists) return state;
          return { activeTemplateId: id };
        }),

      setHangmanWordIndex: (templateId, index) =>
        set((state) => {
          const tpl = state.templates.find((t) => t.id === templateId);
          const len = tpl?.hangmanWords.length ?? 0;
          const normalized =
            len > 0
              ? ((Math.floor(index) % len) + len) % len
              : Math.max(0, Math.floor(index));
          return {
            hangmanWordIndexByTemplate: {
              ...state.hangmanWordIndexByTemplate,
              [templateId]: normalized,
            },
          };
        }),

      advanceHangmanWord: (templateId) =>
        set((state) => {
          const tpl = state.templates.find((t) => t.id === templateId);
          const len = tpl?.hangmanWords.length ?? 0;
          if (len === 0) return state;
          const current = state.hangmanWordIndexByTemplate[templateId] ?? 0;
          const next = (current + 1) % len;
          return {
            hangmanWordIndexByTemplate: {
              ...state.hangmanWordIndexByTemplate,
              [templateId]: next,
            },
          };
        }),

      recordHangmanSolvedWord: (wordKey) =>
        set((state) => {
          const clean = wordKey.trim();
          if (!clean || state.hangmanSolvedWordKeys.includes(clean)) {
            return state;
          }
          return {
            hangmanSolvedWordKeys: [...state.hangmanSolvedWordKeys, clean],
          };
        }),

      recordSeenMutatorKey: (key) =>
        set((state) => {
          const clean = key.trim();
          if (!clean || state.seenMutatorKeys.includes(clean)) {
            return state;
          }
          return {
            seenMutatorKeys: [...state.seenMutatorKeys, clean],
          };
        }),

      resetSeenMutatorKeys: () => set({ seenMutatorKeys: [] }),

      addWordToTemplate: (templateId, item) =>
        set((state) => {
          const cleanWord = item.word.trim().toUpperCase();
          if (!cleanWord) return state;
          const newItem: HangmanWordItem = {
            ...item,
            word: cleanWord,
            id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          };
          return {
            templates: state.templates.map((tpl) =>
              tpl.id === templateId
                ? { ...tpl, hangmanWords: [...tpl.hangmanWords, newItem] }
                : tpl
            ),
          };
        }),

      removeWordFromTemplate: (templateId, wordId) =>
        set((state) => ({
          templates: state.templates.map((tpl) => {
            if (tpl.id !== templateId) return tpl;
            if (tpl.hangmanWords.length <= 1) return tpl;
            return {
              ...tpl,
              hangmanWords: tpl.hangmanWords.filter((w) => w.id !== wordId),
            };
          }),
        })),

      updateTemplateMeta: (templateId, patch) =>
        set((state) => ({
          templates: state.templates.map((tpl) =>
            tpl.id === templateId ? { ...tpl, ...patch } : tpl
          ),
        })),

      forkTemplate: (templateId) =>
        set((state) => {
          const source = state.templates.find((t) => t.id === templateId);
          if (!source) return state;
          const newId = `tpl-custom-${Date.now()}`;
          const cloned: LessonTemplate = {
            ...source,
            id: newId,
            title: `${source.title} (Копія вчителя)`,
            author: "Ви (Вчитель)",
            isPublic: false,
            forksCount: 0,
            hangmanWords: source.hangmanWords.map((w) => ({
              ...w,
              id: `${w.id}-copy-${Math.random().toString(36).slice(2, 5)}`,
            })),
            mutatorBlueprints: source.mutatorBlueprints.map((m) => ({
              ...m,
            })),
          };
          return {
            templates: state.templates
              .map((t) =>
                t.id === templateId ? { ...t, forksCount: t.forksCount + 1 } : t
              )
              .concat(cloned),
            activeTemplateId: newId,
            userRole: "teacher",
          };
        }),

      rewardCoins: (amount) =>
        set((state) => {
          const safeAmount = Math.max(0, Math.round(amount));
          const newBits = state.bits + safeAmount;
          const newCompleted = state.completedChallengesCount + 1;
          const newWaveStreak = state.waveStreak + 1;
          const tourneyPoints = Math.max(15, Math.round(safeAmount * 0.8));
          return {
            bits: newBits,
            completedChallengesCount: newCompleted,
            waveStreak: newWaveStreak,
            lynnMood: "triumph",
            masteryRank: computeMasteryRank(
              newCompleted,
              state.lifetimeBytesEarned
            ),
            dailyQuestSteps: {
              ...state.dailyQuestSteps,
              playedGame: true,
            },
            tournamentSquads: addUserSquadPoints(
              state.tournamentSquads,
              tourneyPoints
            ),
            squadFeed: prependSquadFeed(
              state.squadFeed,
              `Ви (${state.studentProfile.name})`,
              `Успішний раунд у грі (+${safeAmount} коїнів)`,
              tourneyPoints
            ),
          };
        }),

      spendCoins: (amount) => {
        const state = get();
        const cost = Math.max(0, Math.round(amount));
        if (state.bits < cost) return false;
        set({ bits: state.bits - cost });
        return true;
      },

      synthesizeByte: () => {
        const state = get();
        if (state.bits < 100) return false;

        const newBits = state.bits - 100;
        const newBytes = state.bytes + 1;
        const newLifetimeBytes = state.lifetimeBytesEarned + 1;

        set({
          bits: newBits,
          bytes: newBytes,
          lifetimeBytesEarned: newLifetimeBytes,
          lynnMood: "triumph",
          masteryRank: computeMasteryRank(
            state.completedChallengesCount,
            newLifetimeBytes
          ),
          dailyQuestSteps: {
            ...state.dailyQuestSteps,
            boostedOrCustomized: true,
          },
        });
        return true;
      },

      triggerMistake: () =>
        set((state) => ({
          lynnMood: "debugging",
          regenerationCount: state.regenerationCount + 1,
        })),

      setLynnMood: (mood) => set({ lynnMood: mood }),

      unlockSkin: (skinId, byteCost) => {
        const state = get();
        const skinMeta = LYNN_SKINS.find((s) => s.id === skinId);
        const cost = byteCost ?? skinMeta?.byteCost ?? 0;

        if (state.unlockedSkins.includes(skinId)) {
          set({
            equippedSkin: skinId,
            lynnMood: "triumph",
            dailyQuestSteps: {
              ...state.dailyQuestSteps,
              boostedOrCustomized: true,
            },
          });
          return true;
        }

        if (state.bytes < cost) {
          return false;
        }

        const newBytes = state.bytes - cost;

        set({
          bytes: newBytes,
          unlockedSkins: [...state.unlockedSkins, skinId],
          equippedSkin: skinId,
          lynnMood: "triumph",
          masteryRank: computeMasteryRank(
            state.completedChallengesCount,
            state.lifetimeBytesEarned
          ),
          dailyQuestSteps: {
            ...state.dailyQuestSteps,
            boostedOrCustomized: true,
          },
        });
        return true;
      },

      unlockAndEquipVfx: (vfxId) => {
        const state = get();
        const vfx = ANSWER_VFX_ITEMS.find((v) => v.id === vfxId);
        if (!vfx) return false;

        if (state.unlockedVfx.includes(vfxId)) {
          set({
            equippedVfx: vfxId,
            lynnMood: "triumph",
            dailyQuestSteps: {
              ...state.dailyQuestSteps,
              boostedOrCustomized: true,
            },
          });
          return true;
        }

        if (state.bits < vfx.coinCost) {
          return false;
        }

        set({
          bits: state.bits - vfx.coinCost,
          unlockedVfx: [...state.unlockedVfx, vfxId],
          equippedVfx: vfxId,
          lynnMood: "triumph",
          dailyQuestSteps: {
            ...state.dailyQuestSteps,
            boostedOrCustomized: true,
          },
        });
        return true;
      },

      createPeerTicket: ({ topic, question, bountyCoins, scope }) => {
        const state = get();
        const cleanQuestion = question.trim();
        if (!cleanQuestion) return false;
        const safeBounty = Math.max(10, Math.min(100, Math.round(bountyCoins)));
        if (state.bits < safeBounty) return false;

        const newTicket: PeerHelpTicket = {
          id: `tkt-${Date.now()}`,
          topic: topic.trim() || "Інформатика та Логіка",
          question: cleanQuestion,
          scope,
          authorName: formatStudentAuthorName(state.studentProfile),
          authorAnonAlias: formatStudentAnonAlias(state.studentProfile, true),
          grade: state.studentProfile.grade,
          bountyCoins: safeBounty,
          status: "open",
          replies: [],
        };

        set({
          bits: state.bits - safeBounty,
          peerTickets: [newTicket, ...state.peerTickets],
          lynnMood: "curious",
        });
        return true;
      },

      answerPeerTicket: (ticketId, explanation, empathyNote) => {
        const state = get();
        const target = state.peerTickets.find((t) => t.id === ticketId);
        const cleanExplanation = explanation.trim();
        if (!target || !cleanExplanation) return false;

        if (
          isCurrentUserAuthor(
            target.authorName,
            target.authorAnonAlias,
            state.studentProfile
          )
        ) {
          return false;
        }

        const alreadyRepliedByUser = target.replies.some((r) =>
          isCurrentUserAuthor(
            r.authorName,
            r.authorAnonAlias,
            state.studentProfile
          )
        );
        if (alreadyRepliedByUser) {
          return false;
        }

        const newReply: PeerReply = {
          id: `rep-${Date.now()}`,
          authorName: formatStudentAuthorName(state.studentProfile),
          authorAnonAlias: formatStudentAnonAlias(state.studentProfile, true),
          schoolBadge:
            target.scope === "class-named"
              ? `Однокласник • ${state.studentProfile.grade}`
              : "Анонімний Напарник з іншої школи",
          explanation: cleanExplanation,
          empathyNote:
            empathyNote.trim() ||
            "Разом розберемося! Це легше, ніж здається 🤝",
          createdAt: "Щойно",
          reactions: { "🔥": 0, "❤️": 0, "🦎": 0 },
        };

        const newBits = state.bits + target.bountyCoins;
        const newCompleted = state.completedChallengesCount + 1;

        set({
          bits: newBits,
          completedChallengesCount: newCompleted,
          waveStreak: state.waveStreak + 1,
          lynnMood: "triumph",
          masteryRank: computeMasteryRank(
            newCompleted,
            state.lifetimeBytesEarned
          ),
          dailyQuestSteps: {
            ...state.dailyQuestSteps,
            helpedPeer: true,
          },
          tournamentSquads: addUserSquadPoints(state.tournamentSquads, 35),
          squadFeed: prependSquadFeed(
            state.squadFeed,
            `Ви (${state.studentProfile.name})`,
            "Допомога однолітку на P2P Біржі",
            35
          ),
          peerTickets: state.peerTickets.map((t) =>
            t.id === ticketId
              ? {
                  ...t,
                  status: "solved",
                  replies: [...t.replies, newReply],
                }
              : t
          ),
        });
        return true;
      },

      cancelPeerTicket: (ticketId) => {
        const state = get();
        const target = state.peerTickets.find((t) => t.id === ticketId);
        if (!target) return false;
        if (
          !isCurrentUserAuthor(
            target.authorName,
            target.authorAnonAlias,
            state.studentProfile
          )
        ) {
          return false;
        }
        if (target.status !== "open" || target.replies.length > 0) {
          return false;
        }

        set({
          bits: state.bits + target.bountyCoins,
          peerTickets: state.peerTickets.filter((t) => t.id !== ticketId),
        });
        return true;
      },

      createStudentChallenge: ({
        title,
        prompt,
        options,
        correctIndex,
        explanation,
        rewardCoins,
        scope,
      }) =>
        set((state) => {
          const newChallenge: StudentChallenge = {
            id: `ugc-${Date.now()}`,
            title: title.trim(),
            authorName: formatStudentAuthorName(state.studentProfile),
            authorAnonAlias: formatStudentAnonAlias(state.studentProfile, false),
            scope,
            prompt: prompt.trim(),
            options,
            correctIndex,
            explanation: explanation.trim(),
            rewardCoins: Math.max(15, Math.min(60, rewardCoins)),
            solvedByUser: false,
            likes: 1,
          };
          return {
            studentChallenges: [newChallenge, ...state.studentChallenges],
            bits: state.bits + 20, // Creator bonus
            lynnMood: "triumph",
          };
        }),

      solveStudentChallenge: (challengeId) =>
        set((state) => {
          const ch = state.studentChallenges.find((c) => c.id === challengeId);
          if (!ch || ch.solvedByUser) return state;

          const newBits = state.bits + ch.rewardCoins;
          const newCompleted = state.completedChallengesCount + 1;
          return {
            bits: newBits,
            completedChallengesCount: newCompleted,
            waveStreak: state.waveStreak + 1,
            lynnMood: "triumph",
            masteryRank: computeMasteryRank(
              newCompleted,
              state.lifetimeBytesEarned
            ),
            studentChallenges: state.studentChallenges.map((c) =>
              c.id === challengeId ? { ...c, solvedByUser: true } : c
            ),
          };
        }),

      toggleLikeChallenge: (challengeId) =>
        set((state) => {
          const exists = state.studentChallenges.some(
            (c) => c.id === challengeId
          );
          if (!exists) return state;
          const isLiked = state.likedChallengeIds.includes(challengeId);
          return {
            likedChallengeIds: isLiked
              ? state.likedChallengeIds.filter((id) => id !== challengeId)
              : [...state.likedChallengeIds, challengeId],
            studentChallenges: state.studentChallenges.map((c) =>
              c.id === challengeId
                ? {
                    ...c,
                    likes: isLiked ? Math.max(0, c.likes - 1) : c.likes + 1,
                  }
                : c
            ),
          };
        }),

      submitFunBlitz: ({ title, questionText, options, funOutcome }) => {
        const state = get();
        const cleanTitle = title.trim();
        const cleanQuestion = questionText.trim();
        if (!cleanTitle || !cleanQuestion) {
          return {
            ok: false,
            reason: "Заповни назву та питання тесту.",
          };
        }

        const trimmedOptions = options.map((o) => o.trim()).filter(Boolean);
        const seen = new Set<string>();
        const uniqueOptions: string[] = [];
        for (const opt of trimmedOptions) {
          const key = opt.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            uniqueOptions.push(opt);
          }
        }

        if (uniqueOptions.length < trimmedOptions.length) {
          return {
            ok: false,
            reason: "Варіанти відповіді не повинні повторюватися!",
          };
        }

        if (uniqueOptions.length < 2) {
          return {
            ok: false,
            reason: "Додай щонайменше 2 різні варіанти відповіді!",
          };
        }

        const cleanOutcome =
          (funOutcome ?? "").trim() ||
          `Кібер-Легенда ${state.studentProfile.grade} класу!`;

        const combined = `${cleanTitle} ${cleanQuestion} ${uniqueOptions.join(
          " "
        )} ${cleanOutcome}`.toLowerCase();
        const bannedPatterns = [
          "дурн",
          "туп",
          "лузер",
          "ненавид",
          "слабак",
          "ідіот",
          "образа",
          "ганьба",
        ];

        const foundToxic = bannedPatterns.find((w) => combined.includes(w));
        if (foundToxic) {
          return {
            ok: false,
            reason:
              "Анти-Булінг Щит: виявлено потенційно образливу лексику! У Bitlynn гумор має підтримувати клас, а не ображати.",
          };
        }

        if (state.bits < 50) {
          return {
            ok: false,
            reason:
              "Потрібно 50 Коїнів для запуску власного 60-сек тесту на клас.",
          };
        }

        const newBlitz: StudentFunBlitz = {
          id: `fun-${Date.now()}`,
          title: cleanTitle,
          authorName: formatStudentAuthorName(state.studentProfile),
          durationSeconds: 60,
          status: "pending-teacher",
          teacherNote:
            "Автоматичний Анти-Булінг фільтр пройдено. Очікує схвалення вчителем перед показом у класі.",
          playsCount: 0,
          questions: [
            {
              q: cleanQuestion,
              options: uniqueOptions,
              funOutcome: cleanOutcome,
            },
          ],
        };

        set({
          bits: state.bits - 50,
          funBlitzList: [newBlitz, ...state.funBlitzList],
          lynnMood: "curious",
        });

        return { ok: true };
      },

      moderateFunBlitz: (blitzId, status) =>
        set((state) => ({
          funBlitzList: state.funBlitzList.map((b) =>
            b.id === blitzId
              ? {
                  ...b,
                  status,
                  teacherNote:
                    status === "approved"
                      ? "Схвалено вчителем! Доступно для 60-сек розминки класу."
                      : "Відхилено вчителем (Захист від булінгу та відволікання).",
                }
              : b
          ),
        })),

      recordFunBlitzPlay: (blitzId) => {
        const state = get();
        const alreadyCompleted = state.completedBlitzIds.includes(blitzId);
        const bonus = alreadyCompleted ? 0 : 25;
        set({
          bits: state.bits + bonus,
          lynnMood: "triumph",
          completedBlitzIds: alreadyCompleted
            ? state.completedBlitzIds
            : [...state.completedBlitzIds, blitzId],
          funBlitzList: state.funBlitzList.map((b) =>
            b.id === blitzId ? { ...b, playsCount: b.playsCount + 1 } : b
          ),
        });
        return !alreadyCompleted;
      },

      contributeSquadPoints: (coinsToContribute) => {
        const state = get();
        const amount = Math.max(10, Math.round(coinsToContribute));
        if (state.bits < amount) return false;
        if (!state.tournamentSquads.some((sq) => sq.isUserSquad)) return false;

        const points = amount * 3;
        set({
          bits: state.bits - amount,
          lynnMood: "triumph",
          dailyQuestSteps: {
            ...state.dailyQuestSteps,
            boostedOrCustomized: true,
          },
          tournamentSquads: addUserSquadPoints(state.tournamentSquads, points),
          squadFeed: prependSquadFeed(
            state.squadFeed,
            `Ви (${state.studentProfile.name})`,
            "Внесок коїнів у командний турнір",
            points
          ),
        });
        return true;
      },

      createTournamentSquad: (name, motto) => {
        const cleanName = name.trim();
        if (!cleanName) return false;
        const state = get();
        const newSquad: TournamentSquad = {
          id: `sq-${Date.now()}`,
          name: cleanName,
          motto: motto.trim() || "Разом до знань та командної перемоги!",
          membersCount: 1,
          maxMembers: 18,
          scorePoints: 100,
          discountReward: "",
          isUserSquad: true,
        };
        const updatedSquads = recomputeSquadDiscounts([
          newSquad,
          ...state.tournamentSquads.map((sq) => ({
            ...sq,
            membersCount: sq.isUserSquad
              ? Math.max(0, sq.membersCount - 1)
              : sq.membersCount,
            isUserSquad: false,
          })),
        ]);
        set({
          tournamentSquads: updatedSquads,
          lynnMood: "triumph",
        });
        return true;
      },

      joinTournamentSquad: (squadId) => {
        const state = get();
        const target = state.tournamentSquads.find((sq) => sq.id === squadId);
        if (!target || target.isUserSquad || target.membersCount >= target.maxMembers) {
          return false;
        }
        const updatedSquads = recomputeSquadDiscounts(
          state.tournamentSquads.map((sq) => {
            if (sq.id === squadId) {
              return {
                ...sq,
                isUserSquad: true,
                membersCount: Math.min(sq.maxMembers, sq.membersCount + 1),
              };
            }
            if (sq.isUserSquad) {
              return {
                ...sq,
                isUserSquad: false,
                membersCount: Math.max(0, sq.membersCount - 1),
              };
            }
            return sq;
          })
        );
        set({
          tournamentSquads: updatedSquads,
          lynnMood: "triumph",
        });
        return true;
      },

      awardTournamentWinPoints: (points) => {
        const safePoints = Math.max(0, Math.round(points));
        if (safePoints <= 0) return;
        const state = get();
        set({
          tournamentSquads: addUserSquadPoints(
            state.tournamentSquads,
            safePoints
          ),
        });
      },

      claimDailyQuestBonus: () => {
        const state = get();
        const { playedGame, helpedPeer, boostedOrCustomized, claimedBonus } =
          state.dailyQuestSteps;
        if (!playedGame || !helpedPeer || !boostedOrCustomized || claimedBonus) {
          return false;
        }
        const newBytes = state.bytes + 1;
        const newLifetimeBytes = state.lifetimeBytesEarned + 1;
        set({
          bits: state.bits + 60,
          bytes: newBytes,
          lifetimeBytesEarned: newLifetimeBytes,
          lynnMood: "triumph",
          masteryRank: computeMasteryRank(
            state.completedChallengesCount,
            newLifetimeBytes
          ),
          dailyQuestSteps: {
            ...state.dailyQuestSteps,
            claimedBonus: true,
          },
          tournamentSquads: addUserSquadPoints(state.tournamentSquads, 60),
          squadFeed: prependSquadFeed(
            state.squadFeed,
            `Ви (${state.studentProfile.name})`,
            "Закрив Квест-петлю дня!",
            60
          ),
        });
        return true;
      },

      receiveSimulatedPeerReply: (ticketId) =>
        set((state) => {
          const target = state.peerTickets.find((t) => t.id === ticketId);
          if (!target || target.replies.length > 0) return state;

          const isClass = target.scope === "class-named";
          const simReply: PeerReply = {
            id: `rep-sim-${Date.now()}`,
            authorName: isClass ? "Софія М. • 7-А" : "Аліна Д. (Ліцей №14)",
            authorAnonAlias: isClass
              ? "Сакура-Аксолотль #204"
              : "Неоновий Сокіл #412",
            schoolBadge: isClass
              ? "Однокласниця • 7-А"
              : "Ліцей №14 • Анонімно",
            explanation: buildWarmPeerExplanation(
              target.topic,
              target.question
            ),
            empathyNote:
              "Я теж на цьому зупинялась на уроці! Ось простий розбір на пальцях 🦎💪",
            createdAt: "Щойно",
            reactions: { "🔥": 1, "❤️": 1, "🦎": 1 },
          };

          return {
            lynnMood: "curious",
            peerTickets: state.peerTickets.map((t) =>
              t.id === ticketId ? { ...t, replies: [simReply] } : t
            ),
          };
        }),

      reactToPeerReply: (ticketId, replyId, emoji) =>
        set((state) => ({
          dailyQuestSteps: {
            ...state.dailyQuestSteps,
            helpedPeer: true,
          },
          peerTickets: state.peerTickets.map((t) =>
            t.id !== ticketId
              ? t
              : {
                  ...t,
                  replies: t.replies.map((r) =>
                    r.id !== replyId
                      ? r
                      : {
                          ...r,
                          reactions: {
                            ...(r.reactions ?? {}),
                            [emoji]: (r.reactions?.[emoji] ?? 0) + 1,
                          },
                        }
                  ),
                }
          ),
        })),

      acceptPeerReply: (ticketId, replyId) =>
        set((state) => {
          const ticket = state.peerTickets.find((t) => t.id === ticketId);
          const reply = ticket?.replies.find((r) => r.id === replyId);
          if (!ticket || !reply || reply.acceptedByAuthor) return state;

          return {
            bits: state.bits + 15,
            lynnMood: "triumph",
            dailyQuestSteps: {
              ...state.dailyQuestSteps,
              helpedPeer: true,
            },
            tournamentSquads: addUserSquadPoints(state.tournamentSquads, 25),
            squadFeed: prependSquadFeed(
              state.squadFeed,
              `Ви (${state.studentProfile.name})`,
              "Подяка за відповідь на Біржі",
              25
            ),
            peerTickets: state.peerTickets.map((t) =>
              t.id !== ticketId
                ? t
                : {
                    ...t,
                    status: "solved",
                    replies: t.replies.map((r) =>
                      r.id === replyId ? { ...r, acceptedByAuthor: true } : r
                    ),
                  }
            ),
          };
        }),

      startClassroomSession: (mode, durationSeconds = 900) =>
        set({
          classroomSession: {
            active: true,
            mode,
            remainingSeconds: Math.max(60, Math.round(durationSeconds)),
            assignedAsHomework: false,
          },
          lynnMood: "coding",
        }),

      stopClassroomSession: () =>
        set((state) => ({
          classroomSession: {
            ...state.classroomSession,
            active: false,
          },
        })),

      tickClassroomSession: () =>
        set((state) => {
          if (!state.classroomSession.active) return state;
          if (state.classroomSession.remainingSeconds <= 1) {
            return {
              classroomSession: {
                ...state.classroomSession,
                active: false,
                remainingSeconds: 0,
              },
            };
          }
          return {
            classroomSession: {
              ...state.classroomSession,
              remainingSeconds: state.classroomSession.remainingSeconds - 1,
            },
          };
        }),

      assignActiveTemplateAsHomework: () =>
        set((state) => ({
          templates: state.templates.map((tpl) =>
            tpl.id === state.activeTemplateId
              ? { ...tpl, deliveryMode: "homework" }
              : tpl
          ),
          classroomSession: {
            ...state.classroomSession,
            assignedAsHomework: true,
          },
        })),
    }),
    {
      name: "bitlynn-classroom-v5",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        const persisted = { ...state } as Partial<BitlynnState>;
        delete persisted._hasHydrated;
        return persisted as Omit<BitlynnState, "_hasHydrated">;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        } else {
          queueMicrotask(() => useBitlynnStore.getState().setHasHydrated(true));
        }
      },
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<BitlynnState>;
        const merged: BitlynnState = {
          ...currentState,
          ...persisted,
          _hasHydrated: false,
          studentProfile: {
            ...currentState.studentProfile,
            ...(persisted.studentProfile ?? {}),
          },
          dailyQuestSteps: {
            ...INITIAL_DAILY_QUEST_STEPS,
            ...(persisted.dailyQuestSteps ?? {}),
          },
          squadFeed:
            Array.isArray(persisted.squadFeed) && persisted.squadFeed.length > 0
              ? persisted.squadFeed
              : INITIAL_SQUAD_FEED,
          classroomSession: {
            ...INITIAL_CLASSROOM_SESSION,
            ...(persisted.classroomSession ?? {}),
          },
        };
        merged.lifetimeBytesEarned = Math.max(
          persisted.lifetimeBytesEarned ?? 0,
          merged.bytes ?? 0
        );
        merged.masteryRank = computeMasteryRank(
          merged.completedChallengesCount,
          merged.lifetimeBytesEarned
        );
        return merged;
      },
    }
  )
);
