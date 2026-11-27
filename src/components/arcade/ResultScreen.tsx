"use client";

import { loop } from "@/components/mobile/loop";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  C,
  GameMeta,
  REWARD_RULES,
  RANKS,
  fmt,
  nextRank,
  plural,
  rankFor,
  rankIndexFor,
} from "./tokens";
import { SessionSummary } from "./useArcadeStore";
import {
  AxoAvatar,
  BitIcon,
  CheckIcon,
  FONT_MONO,
  FONT_PIXEL,
  FONT_UI,
  PixelBurst,
  PrimaryButton,
  SecondaryButton,
  WaveIcon,
  XpIcon,
  useCountUp,
} from "./ui";
import { sfx } from "./arcadeAudio";

/**
 * Спільний екран №4 — результат. Тільки тут з'являються XP, біти й Хвиля.
 * Тон завжди підтримувальний: немає «програв», є «що далі».
 */
export function ResultScreen({
  meta,
  summary,
  accent,
  onAgain,
  onRoom,
}: {
  meta: GameMeta;
  summary: SessionSummary;
  accent: string;
  onAgain: () => void;
  onRoom: () => void;
}) {
  const reduce = useReducedMotion();
  const total = summary.steps.length;
  const ft = summary.firstTryCount;
  const [phase, setPhase] = useState(0); // 0 → numbers, 1 → bar, 2 → rank-up
  const xp = useCountUp(summary.xpGained, true, 700, () => sfx("count"));
  const bits = useCountUp(summary.bitsGained + summary.waveBonus, true, 700);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), reduce ? 0 : 650);
    const t2 = setTimeout(() => {
      setPhase(2);
      if (summary.rankUp) sfx("rankup");
      else if (summary.waveGoalJustHit) sfx("wave");
    }, reduce ? 0 : 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reduce, summary.rankUp, summary.waveGoalJustHit]);

  const headline = ft === total ? "Ідеально!" : ft >= total - 1 ? "Чудово!" : ft >= Math.ceil(total / 2) ? "Добре йде!" : "Раунд пройдено!";
  const firstTryLabel = meta.id === "catch" ? "раундів без промахів" : "з першої спроби";

  // rank bar: inside the rank the child ends in
  const rank = rankFor(summary.newXp);
  const nxt = nextRank(summary.newXp);
  const floor = rank.xp;
  const ceil = nxt?.xp ?? rank.xp;
  const fromPct = summary.rankUp ? 0 : nxt ? ((Math.max(summary.prevXp, floor) - floor) / (ceil - floor)) * 100 : 100;
  const toPct = nxt ? ((summary.newXp - floor) / (ceil - floor)) * 100 : 100;

  const playedDays = summary.waveDaysThisWeek;


  const mistake = summary.steps.find((s) => !s.firstTry && s.questionText);
  const returning = summary.returningMistakes.length;

  return (
    <div className="relative flex h-full flex-col" style={{ fontFamily: FONT_UI }}>
      {phase >= 2 && (summary.rankUp || summary.waveGoalJustHit) && (
        <PixelBurst colors={summary.rankUp ? [accent, C.bits, C.xp, "#FFFFFF"] : [C.wave, "#C6F6FF", C.bits]} originY="22%" />
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-5 [&>*]:shrink-0">
        <span className="text-center text-[12px] uppercase tracking-[0.08em]" style={{ fontFamily: FONT_MONO, color: C.muted }}>
          {meta.title} · раунд пройдено
        </span>

        <div className="mt-3 flex items-center justify-center gap-4">
          <motion.div
            initial={reduce ? false : { y: 0 }}
            animate={reduce ? undefined : { y: loop([0, -14, 0, -6, 0]) }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <AxoAvatar hoodie={accent} px={3} eyes={ft === total ? "blink" : "normal"} title="Твій аксолотль" />
          </motion.div>
          <div className="flex flex-col">
            <span className="text-[20px] font-bold" style={{ color: C.text }}>
              {headline}
            </span>
            <span className="flex items-baseline gap-2">
              <b className="text-[40px] leading-[48px]" style={{ fontFamily: FONT_MONO, color: C.text }}>
                {ft}/{total}
              </b>
              <span className="text-[14px]" style={{ color: C.muted }}>
                {firstTryLabel}
              </span>
            </span>
          </div>
        </div>

        {summary.isBest && summary.prevBest !== null && (
          <p className="mt-1 text-center text-[13px] font-semibold" style={{ color: "var(--acc-ring)" }}>
            Твій найкращий результат у цій грі!
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1 rounded-2xl border p-3.5" style={{ background: C.card, borderColor: C.line }}>
            <span className="flex items-center gap-2 text-[22px] font-bold" style={{ fontFamily: FONT_MONO, color: C.xp }}>
              <XpIcon size={18} />+{xp} XP
            </span>
            <span className="text-[13px]" style={{ color: C.muted }}>
              досвід
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl border p-3.5" style={{ background: C.card, borderColor: C.line }}>
            <span className="flex items-center gap-2 text-[22px] font-bold" style={{ fontFamily: FONT_MONO, color: C.bits }}>
              <BitIcon size={18} />+{bits}
            </span>
            <span className="text-[13px]" style={{ color: C.muted }}>
              {summary.waveBonus ? `біт · з них +${summary.waveBonus} за Хвилю` : "біт"}
            </span>
          </div>
        </div>

        {/* rank */}
        <div className="relative mt-3 overflow-hidden rounded-2xl border p-3.5" style={{ background: summary.rankUp ? "var(--acc-soft)" : C.card, borderColor: summary.rankUp ? "var(--acc)" : C.line }}>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <AnimatePresence mode="wait">
                <motion.b
                  key={summary.rankUp && phase >= 2 ? "new" : "old"}
                  className="rounded-lg px-2 py-0.5 text-[16px]"
                  style={{ fontFamily: FONT_PIXEL, background: "var(--acc-soft)", border: "1px solid var(--acc)", color: "var(--acc-ring)" }}
                  initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                >
                  {summary.rankUp && phase < 2 ? RANKS[rankIndexFor(summary.prevXp)].label : rank.label}
                </motion.b>
              </AnimatePresence>
            </span>
            <span className="text-[13px]" style={{ fontFamily: FONT_MONO, color: C.muted }}>
              {fmt(summary.newXp)}
              {nxt ? ` / ${fmt(nxt.xp)}` : ""} XP
            </span>
          </div>
          <div className="mt-2.5 h-2 overflow-hidden rounded-full" style={{ background: C.line }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: "var(--acc)" }}
              initial={{ width: `${fromPct}%` }}
              animate={{ width: `${phase >= 1 ? toPct : fromPct}%` }}
              transition={{ duration: reduce ? 0 : 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <AnimatePresence>
            {summary.rankUp && phase >= 2 ? (
              <motion.p
                key="up"
                className="mt-2.5 text-[14px] leading-[21px]"
                style={{ color: C.text }}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <b style={{ color: "var(--acc-ring)" }}>Новий ранг — {summary.rankUp.label}!</b> Ти переїжджаєш у кімнату «{summary.rankUp.room}».
                {summary.rankUp.id === "junior2" && " Відкрито гру «Підводний лабіринт»."}
              </motion.p>
            ) : nxt ? (
              <p className="mt-2.5 text-[14px] leading-[21px]" style={{ color: C.muted }}>
                Ще {fmt(nxt.xp - summary.newXp)} XP — ранг {nxt.label} і кімната {nxt.room}
              </p>
            ) : null}
          </AnimatePresence>
        </div>

        {/* wave */}
        <div className="mt-3 flex items-center gap-3 rounded-2xl border px-3.5 py-3" style={{ background: C.card, borderColor: C.line }}>
          <WaveIcon />
          <span className="flex-1 text-[14px]" style={{ color: C.text }}>
            Хвиля: {Math.min(playedDays, REWARD_RULES.waveGoalDays)} з {REWARD_RULES.waveGoalDays} днів цього тижня
          </span>
          <span className="flex gap-1">
            {Array.from({ length: REWARD_RULES.waveGoalDays }, (_, i) => (
              <span key={i} className="h-2.5 w-2.5 rounded-full" style={{ background: i < playedDays ? C.wave : C.line }} />
            ))}
          </span>
        </div>

        {/* mistakes come back — spaced repetition */}
        {mistake && (
          <div className="mt-3 rounded-2xl border px-3.5 py-3" style={{ background: C.card, borderColor: C.line }}>
            <span className="text-[12px] uppercase tracking-[0.08em]" style={{ fontFamily: FONT_MONO, color: C.almost }}>
              Повторити
            </span>
            <p className="mt-1 text-[14px] leading-[21px]" style={{ color: C.text }}>
              {mistake.questionText}
              {mistake.code && (
                <code className="ml-1 rounded px-1.5 py-0.5 text-[13px]" style={{ fontFamily: FONT_MONO, background: C.bg, color: "#C6F6FF" }}>
                  {mistake.code.split("\n").slice(-1)[0]}
                </code>
              )}
              <br />
              <span style={{ color: C.success }}>→ {mistake.answerText}</span>
            </p>
            {returning > 0 && (
              <p className="mt-2 text-[13px] leading-[19px]" style={{ color: C.muted }}>
                <b style={{ color: C.wave }}>↺ {returning}</b> {plural(returning, "питання повернеться", "питання повернуться", "питань повернуться")} завтра, потім через 3 і 7 днів — так воно краще запам’ятається.
              </p>
            )}
          </div>
        )}

        {summary.learnedNow > 0 && (
          <p className="mt-3 flex items-center gap-2 rounded-2xl px-3.5 py-3 text-[14px]" style={{ background: C.successSoft, color: C.text }}>
            <span style={{ color: C.success }}>
              <CheckIcon size={16} />
            </span>
            {summary.learnedNow} {plural(summary.learnedNow, "питання вивчено", "питання вивчено", "питань вивчено")} — більше не повертатиметься.
          </p>
        )}

      </div>

      <div className="flex shrink-0 flex-col gap-3 pt-3" style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>
        <PrimaryButton onClick={onAgain}>Ще раз</PrimaryButton>
        <SecondaryButton onClick={onRoom}>У кімнату</SecondaryButton>
      </div>
    </div>
  );
}
