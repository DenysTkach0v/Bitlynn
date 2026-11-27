"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  GameId,
  HERO_THEMES,
  HeroColorId,
  Rank,
  REWARD_RULES,
  bitsForXp,
  rankFor,
  rankIndexFor,
  stepXp,
} from "./tokens";
import type { Direction } from "./questions";

/* ───────────────────────── dates ───────────────────────── */

export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseKey(k: string): Date {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(k: string, n: number): string {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

/** Monday of the week that contains `k`. */
export function weekKey(k: string = dateKey()): string {
  const d = parseKey(k);
  const dow = (d.getDay() + 6) % 7; // Mon = 0
  d.setDate(d.getDate() - dow);
  return dateKey(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 86_400_000);
}

/* ───────────────────────── types ───────────────────────── */

/** Інтервальне повторення: помилка повертається через 1, 3 і 7 днів. */
export const REVIEW_INTERVALS = [1, 3, 7];

export interface ReviewItem {
  stage: number; // 0..2 while learning
  due: string;
  firstMissed: string;
  lastSeen: string;
  learned: boolean;
  text: string;
}

export interface StepResult {
  firstTry: boolean;
  questionId?: string;
  questionText?: string;
  /** the right answer, for the «ПОВТОРИТИ» card on the result screen */
  answerText?: string;
  code?: string;
  wasReview?: boolean;
}

export interface SessionSummary {
  game: GameId;
  steps: StepResult[];
  firstTryCount: number;
  xpGained: number;
  bitsGained: number;
  waveBonus: number;
  prevXp: number;
  newXp: number;
  rankUp: Rank | null;
  waveDaysThisWeek: number;
  waveGoalJustHit: boolean;
  returningMistakes: StepResult[];
  learnedNow: number;
  isBest: boolean;
  prevBest: number | null;
}

interface ArcadeState {
  xp: number;
  bits: number;
  direction: Direction;
  ownedItems: string[];
  gamesToday: { date: string; count: number };
  hero: HeroColorId;
  ownedHeroes: HeroColorId[];
  playedDays: string[];
  waveRewardedWeeks: string[];
  restMode: boolean;
  restWeeks: string[];
  reviews: Record<string, ReviewItem>;
  best: Partial<Record<GameId, number>>;
  sessions: number;
  soundOn: boolean;

  /** partial = «Почати знову» mid-round: answered steps still count, no round bonus. */
  finishSession: (game: GameId, steps: StepResult[], opts?: { partial?: boolean }) => SessionSummary;
  setHero: (id: HeroColorId) => void;
  buyHero: (id: HeroColorId) => "ok" | "no-bits" | "rank-only" | "owned";
  toggleRest: () => void;
  ensureRestWeek: () => void;
  setSound: (on: boolean) => void;
  setDirection: (d: Direction) => void;
  buyItem: (id: string, price: number) => "ok" | "no-bits" | "owned";
}

/* ───────────────────────── store ───────────────────────── */

export const useArcadeStore = create<ArcadeState>()(
  persist(
    (set, get) => ({
      // Demo seed: close to «Джун II», so the very first round shows a rank-up
      // and unlocks the maze. Thresholds are from the progress audit (stage 2).
      xp: 520,
      bits: 340,
      direction: "python",
      ownedItems: ["laptop", "mattress"],
      gamesToday: { date: "", count: 0 },
      hero: "pink",
      ownedHeroes: ["pink"],
      playedDays: [],
      waveRewardedWeeks: [],
      restMode: false,
      restWeeks: [],
      reviews: {},
      best: {},
      sessions: 0,
      soundOn: true,

      finishSession: (game, steps, opts) => {
        const partial = !!opts?.partial;
        const s = get();
        const today = dateKey();
        const firstTryCount = steps.filter((x) => x.firstTry).length;
        const xpGained =
          steps.reduce((sum, x) => sum + stepXp(x.firstTry), 0) + (partial ? 0 : REWARD_RULES.roundBonusXp);
        const bitsGained = bitsForXp(xpGained);

        const prevXp = s.xp;
        const newXp = prevXp + xpGained;
        const rankUp = rankIndexFor(newXp) > rankIndexFor(prevXp) ? rankFor(newXp) : null;

        // Хвиля: count distinct days this week; +50 bits once when the goal is reached.
        const playedDays = s.playedDays.includes(today) ? s.playedDays : [...s.playedDays, today];
        const wk = weekKey(today);
        const waveDaysThisWeek = playedDays.filter((d) => weekKey(d) === wk).length;
        const waveGoalJustHit =
          waveDaysThisWeek >= REWARD_RULES.waveGoalDays && !s.waveRewardedWeeks.includes(wk);
        const waveBonus = waveGoalJustHit ? REWARD_RULES.waveBits : 0;

        // Повторення помилок.
        const reviews = { ...s.reviews };
        const returningMistakes: StepResult[] = [];
        let learnedNow = 0;
        for (const st of steps) {
          if (!st.questionId) continue;
          const prev = reviews[st.questionId];
          if (st.firstTry) {
            if (prev && !prev.learned) {
              const stage = prev.stage + 1;
              if (stage >= REVIEW_INTERVALS.length) {
                reviews[st.questionId] = { ...prev, learned: true, lastSeen: today };
                learnedNow += 1;
              } else {
                reviews[st.questionId] = {
                  ...prev,
                  stage,
                  due: addDays(today, REVIEW_INTERVALS[stage]),
                  lastSeen: today,
                };
              }
            }
          } else {
            reviews[st.questionId] = {
              stage: 0,
              due: addDays(today, REVIEW_INTERVALS[0]),
              firstMissed: prev?.firstMissed ?? today,
              lastSeen: today,
              learned: false,
              text: st.questionText ?? prev?.text ?? "",
            };
            returningMistakes.push(st);
          }
        }

        const isBest = !partial && firstTryCount > (s.best[game] ?? -1);

        set({
          xp: newXp,
          bits: s.bits + bitsGained + waveBonus,
          playedDays: playedDays.slice(-120),
          waveRewardedWeeks: waveGoalJustHit ? [...s.waveRewardedWeeks, wk] : s.waveRewardedWeeks,
          reviews,
          best: isBest ? { ...s.best, [game]: firstTryCount } : s.best,
          sessions: s.sessions + 1,
          gamesToday: partial
            ? s.gamesToday
            : { date: today, count: s.gamesToday.date === today ? s.gamesToday.count + 1 : 1 },
        });


        return {
          game,
          steps,
          firstTryCount,
          xpGained,
          bitsGained,
          waveBonus,
          prevXp,
          newXp,
          rankUp,
          waveDaysThisWeek,
          waveGoalJustHit,
          returningMistakes,
          learnedNow,
          isBest,
          prevBest: s.best[game] ?? null,
        };
      },

      setHero: (id) => {
        if (get().ownedHeroes.includes(id)) set({ hero: id });
      },

      buyHero: (id) => {
        const s = get();
        const theme = HERO_THEMES[id];
        if (s.ownedHeroes.includes(id)) {
          set({ hero: id });
          return "owned";
        }
        if (theme.rankOnly) {
          const need = theme.rankOnly;
          if (rankFor(s.xp).id !== need) return "rank-only";
          set({ ownedHeroes: [...s.ownedHeroes, id], hero: id });
          return "ok";
        }
        if (s.bits < theme.price) return "no-bits";
        set({ bits: s.bits - theme.price, ownedHeroes: [...s.ownedHeroes, id], hero: id });
        return "ok";
      },

      toggleRest: () => {
        const s = get();
        const wk = weekKey();
        const on = !s.restMode;
        set({
          restMode: on,
          restWeeks: on && !s.restWeeks.includes(wk) ? [...s.restWeeks, wk] : s.restWeeks,
        });
      },

      ensureRestWeek: () => {
        const s = get();
        const wk = weekKey();
        if (s.restMode && !s.restWeeks.includes(wk)) set({ restWeeks: [...s.restWeeks, wk] });
      },

      setSound: (on) => set({ soundOn: on }),

      setDirection: (d) => set({ direction: d }),

      buyItem: (id, price) => {
        const s = get();
        if (s.ownedItems.includes(id)) return "owned";
        if (s.bits < price) return "no-bits";
        set({ bits: s.bits - price, ownedItems: [...s.ownedItems, id] });
        return "ok";
      },
    }),
    {
      name: "bitlynn-mobile-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        xp: s.xp,
        bits: s.bits,
        direction: s.direction,
        ownedItems: s.ownedItems,
        gamesToday: s.gamesToday,
        hero: s.hero,
        ownedHeroes: s.ownedHeroes,
        playedDays: s.playedDays,
        waveRewardedWeeks: s.waveRewardedWeeks,
        restMode: s.restMode,
        restWeeks: s.restWeeks,
        reviews: s.reviews,
        best: s.best,
        sessions: s.sessions,
        soundOn: s.soundOn,
      }),
    }
  )
);

/* ───────────────────────── derived ───────────────────────── */

/**
 * Хвиля: росте на 1 за кожен тиждень із 3 днями навчання, а за пропущений
 * тиждень лише трохи знижується (−1), ніколи не обнуляється. Тижні в режимі
 * відпочинку не враховуються — хвиля завмирає.
 */
export function computeWaveLevel(playedDays: string[], restWeeks: string[]): number {
  if (playedDays.length === 0) return 0;
  const sorted = [...playedDays].sort();
  const current = weekKey();
  let wk = weekKey(sorted[0]);
  let level = 0;
  let guard = 0;
  while (wk < current && guard++ < 200) {
    const days = sorted.filter((d) => weekKey(d) === wk).length;
    if (days >= REWARD_RULES.waveGoalDays) level = Math.min(5, level + 1);
    else if (!restWeeks.includes(wk)) level = Math.max(0, level - 1);
    wk = addDays(wk, 7);
  }
  const thisWeek = sorted.filter((d) => weekKey(d) === current).length;
  if (thisWeek >= REWARD_RULES.waveGoalDays) level = Math.min(5, level + 1);
  return level;
}

export function dueReviews(reviews: Record<string, ReviewItem>, today = dateKey()) {
  return Object.entries(reviews)
    .filter(([, r]) => !r.learned && r.due <= today)
    .map(([id, r]) => ({ id, ...r }));
}
