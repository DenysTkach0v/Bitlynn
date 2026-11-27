/**
 * Bitlynn 4.0 design tokens (canvas «Редизайн 4.0 · Крок 1 — Design System»).
 *
 * Rules baked in here:
 *  - one dark ground, one action colour = the hero colour (theme);
 *  - success green and the amber «Майже!» never change with the theme;
 *  - red is reserved for destructive actions only, never for a wrong answer.
 */

export const C = {
  bg: "#0E0F13",
  card: "#17181F",
  line: "#262833",
  text: "#ECEEF4",
  muted: "#9A9FB2",
  success: "#3DF5A7",
  successSoft: "#10261F",
  wave: "#4FD1C5",
  waveSoft: "#0F2826",
  almost: "#FFB86B",
  almostSoft: "#2A2116",
  danger: "#FF5D7A",
  xp: "#6FE3FF",
  bits: "#FFD86B",
} as const;

export type HeroColorId = "pink" | "indigo" | "mint" | "gold";

export interface HeroTheme {
  id: HeroColorId;
  label: string;
  acc: string;
  pressed: string;
  on: string;
  soft: string;
  ring: string;
  /** price in bits; 0 = owned from the start */
  price: number;
  /** some colours open only with a rank, never for bits */
  rankOnly?: RankId;
}

export const HERO_THEMES: Record<HeroColorId, HeroTheme> = {
  pink: { id: "pink", label: "Рожевий", acc: "#FF8DC0", pressed: "#E5679F", on: "#1A0B12", soft: "#2A1621", ring: "#FFB8D8", price: 0 },
  indigo: { id: "indigo", label: "Індиго", acc: "#8E8CFF", pressed: "#6F6DE6", on: "#0E0F13", soft: "#1D1D33", ring: "#B9B8FF", price: 370 },
  mint: { id: "mint", label: "М'ятний", acc: "#3DF5A7", pressed: "#2CCB8A", on: "#0E0F13", soft: "#10261F", ring: "#9CFFD2", price: 250 },
  gold: { id: "gold", label: "Золотий", acc: "#FFD447", pressed: "#E5B92A", on: "#1A1405", soft: "#2A2410", ring: "#FFE899", price: 0, rankOnly: "senior" },
};

export const HERO_ORDER: HeroColorId[] = ["pink", "mint", "indigo", "gold"];

export type RankId = "junior1" | "junior2" | "middle" | "senior";

export interface Rank {
  id: RankId;
  label: string;
  xp: number;
  room: string;
}

/** Одна вісь прогресу: досвід → ранг → кімната (аудит, етап 2). */
export const RANKS: Rank[] = [
  { id: "junior1", label: "Джун I", xp: 0, room: "Капсула" },
  { id: "junior2", label: "Джун II", xp: 600, room: "Студія" },
  { id: "middle", label: "Мідл", xp: 2000, room: "Dev-лофт" },
  { id: "senior", label: "Сеньйор", xp: 5000, room: "Купол" },
];

export function rankIndexFor(xp: number): number {
  let idx = 0;
  RANKS.forEach((r, i) => {
    if (xp >= r.xp) idx = i;
  });
  return idx;
}

export function rankFor(xp: number): Rank {
  return RANKS[rankIndexFor(xp)];
}

export function nextRank(xp: number): Rank | null {
  return RANKS[rankIndexFor(xp) + 1] ?? null;
}

/** XP rules, shown to the child as-is on the «Як працюють нагороди» screen. */
export const REWARD_RULES = {
  answerXp: 10,
  firstTryMultiplier: 1.5,
  secondTryMultiplier: 0.5,
  roundBonusXp: 5,
  waveGoalDays: 3,
  waveBits: 50,
} as const;

export function stepXp(firstTry: boolean): number {
  return Math.round(
    REWARD_RULES.answerXp *
      (firstTry ? REWARD_RULES.firstTryMultiplier : REWARD_RULES.secondTryMultiplier)
  );
}

/** Біти = половина досвіду за те саме завдання. */
export function bitsForXp(xp: number): number {
  return Math.round(xp / 2);
}

export type GameId = "snake" | "maze" | "catch" | "delivery" | "factory";

export interface GameMeta {
  id: GameId;
  title: string;
  tag: string;
  steps: number;
  /** one / few / many: «1 питання», «2 раунди», «5 зупинок» */
  stepForms: [string, string, string];
  unlockRank: RankId;
  ready: boolean;
  rules: string[];
  blurb: string;
}

export const GAMES: GameMeta[] = [
  {
    id: "snake",
    title: "Змійка",
    tag: "#python",
    steps: 5,
    stepForms: ["питання", "питання", "питань"],
    unlockRank: "junior1",
    ready: true,
    blurb: "Збирай кубики — відповідай на питання про Python.",
    rules: [
      "Свайпни по полю (або стрілки), щоб повернути змійку",
      "Бурштиновий кубик — це питання",
      "Помилка не забирає життя — просто спробуй ще",
    ],
  },
  {
    id: "catch",
    title: "Лови",
    tag: "#залізо",
    steps: 4,
    stepForms: ["раунд", "раунди", "раундів"],
    unlockRank: "junior1",
    ready: true,
    blurb: "Лови аксолотлів зі словами з потрібної групи.",
    rules: [
      "Угорі написано, кого ловити",
      "Торкнись аксолотля з правильним словом",
      "Хибний тап — він просто ховається",
    ],
  },
  {
    id: "maze",
    title: "Підводний лабіринт",
    tag: "#html",
    steps: 5,
    stepForms: ["питання", "питання", "питань"],
    unlockRank: "junior2",
    ready: true,
    blurb: "Пливи лабіринтом, збирай перлини й кубики-питання.",
    rules: [
      "Свайпни (або стрілки), щоб пливти",
      "Бурштиновий кубик — питання, перлини — для краси",
      "Медуза лише ненадовго пригальмує тебе",
    ],
  },
  {
    id: "delivery",
    title: "Доставка",
    tag: "#html",
    steps: 8,
    stepForms: ["зупинка", "зупинки", "зупинок"],
    unlockRank: "middle",
    ready: false,
    blurb: "Веди фуру й відповідай крабам на зупинках.",
    rules: [],
  },
  {
    id: "factory",
    title: "Фабрика",
    tag: "#python",
    steps: 10,
    stepForms: ["замовлення", "замовлення", "замовлень"],
    unlockRank: "senior",
    ready: false,
    blurb: "Сортуй ящики з відповідями на конвеєрі.",
    rules: [],
  },
];

export function gameById(id: GameId): GameMeta {
  return GAMES.find((g) => g.id === id) ?? GAMES[0];
}

export function rankById(id: RankId): Rank {
  return RANKS.find((r) => r.id === id) ?? RANKS[0];
}

/** Ukrainian plural helper: 1 питання / 2 питання / 5 питань. */
export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export function fmt(n: number): string {
  return n.toLocaleString("uk-UA").replace(/,/g, " ");
}
