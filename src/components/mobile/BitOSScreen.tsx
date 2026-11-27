"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { C, REWARD_RULES, plural } from "@/components/arcade/tokens";
import { dateKey, dueReviews, useArcadeStore, weekKey } from "@/components/arcade/useArcadeStore";
import { DIRECTIONS } from "@/components/arcade/questions";
import { FONT_MONO } from "@/components/arcade/ui";
import { sfx } from "@/components/arcade/arcadeAudio";
import { Art, At, BitsChip, Cta, PowerIcon, SquareButton } from "./kit";

export type PcApp = "learn" | "arcade" | "shop" | "profile" | "wave";

const DAILY_GOAL = 3;

/**
 * Екран ПК (BitOS). Для 9–14 — мінімум рішень: лише 4 застосунки, які
 * справді працюють (без «скоро»-плиток, що ведуть у глухий кут), і
 * «Сьогодні» з двох рядків: Хвиля й аркади дня.
 */
export function BitOSScreen({ onOff, onOpen }: { onOff: () => void; onOpen: (app: PcApp) => void }) {
  const reduce = useReducedMotion();
  const direction = useArcadeStore((s) => s.direction);
  const playedDays = useArcadeStore((s) => s.playedDays);
  const gamesToday = useArcadeStore((s) => s.gamesToday);
  const reviews = useArcadeStore((s) => s.reviews);

  const wk = weekKey();
  const days = Math.min(REWARD_RULES.waveGoalDays, playedDays.filter((d) => weekKey(d) === wk).length);
  const waveDone = days >= REWARD_RULES.waveGoalDays;
  const played = Math.min(DAILY_GOAL, gamesToday.date === dateKey() ? gamesToday.count : 0);
  const due = dueReviews(reviews).length;
  const dirLabel = DIRECTIONS.find((d) => d.id === direction)?.label ?? "Python";

  const apps: { key: PcApp; art: string; label: string; sub: string }[] = [
    { key: "learn", art: "app_learn", label: "Навчання", sub: `зараз: ${dirLabel}` },
    { key: "arcade", art: "app_arcade", label: "Аркади", sub: due ? `↺ ${due} ${plural(due, "повтор", "повтори", "повторів")}` : `${played} / ${DAILY_GOAL} сьогодні` },
    { key: "shop", art: "app_shop", label: "Магазин", sub: "декор і улюбленці" },
    { key: "profile", art: "app_profile", label: "Профіль", sub: "колір героя" },
  ];

  return (
    <div className="absolute inset-0">
      <SquareButton label="Вимкнути ПК" onClick={onOff}>
        <PowerIcon />
      </SquareButton>
      <h1 className="absolute left-[72px] top-[22px] m-0 text-[20px] font-bold">BitOS</h1>
      <At r={12} y={16}>
        <BitsChip />
      </At>

      <span className="absolute left-5 top-[78px] text-[12px]" style={{ fontFamily: FONT_MONO, color: C.muted }}>
        СЬОГОДНІ
      </span>
      <motion.div
        className="absolute left-5 right-5 top-[100px] flex flex-col gap-3 rounded-[14px] border p-3.5"
        style={{ background: C.card, borderColor: C.line }}
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <button type="button" onClick={() => onOpen("wave")} className="flex min-h-[44px] items-center gap-3 text-left outline-none" aria-label="Відкрити Хвилю тижня">
          <Art name="wave" />
          <span className="flex flex-col gap-0.5">
            <b className="text-[15px]">{waveDone ? "Хвиля тижня — зловив!" : `Хвиля: ${days} з ${REWARD_RULES.waveGoalDays} днів`}</b>
            <span className="text-[13px]" style={{ fontFamily: FONT_MONO, color: waveDone ? C.success : C.muted }}>
              +{REWARD_RULES.waveBits} біт за {REWARD_RULES.waveGoalDays} дні
            </span>
          </span>
        </button>
        <div className="h-px" style={{ background: C.line }} />
        <div className="flex justify-between gap-2.5 text-[15px]">
          <b>Аркади сьогодні</b>
          <span className="text-[14px]" style={{ fontFamily: FONT_MONO, color: played >= DAILY_GOAL ? C.success : C.muted }}>
            {played} / {DAILY_GOAL}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full" style={{ background: C.line }}>
          <motion.div className="h-full" style={{ background: "var(--acc)" }} initial={reduce ? false : { width: 0 }} animate={{ width: `${(played / DAILY_GOAL) * 100}%` }} />
        </div>
      </motion.div>

      <span className="absolute left-5 top-[290px] text-[12px]" style={{ fontFamily: FONT_MONO, color: C.muted }}>
        ЗАСТОСУНКИ
      </span>
      <div className="absolute left-5 right-5 top-[312px] grid grid-cols-2 gap-3">
        {apps.map((a, i) => (
          <motion.button
            key={a.key}
            type="button"
            onClick={() => {
              sfx("tap");
              onOpen(a.key);
            }}
            className="arc-card flex h-[112px] flex-col items-start justify-between rounded-2xl border p-4 text-left outline-none"
            style={{ borderColor: C.line, background: C.card, color: C.text }}
            initial={reduce ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: reduce ? 0 : 0.05 + i * 0.05, type: "spring", stiffness: 420, damping: 26 }}
          >
            <span style={{ color: "var(--acc)" }}>
              <Art name={a.art} />
            </span>
            <span className="flex flex-col gap-0.5">
              <b className="text-[16px]">{a.label}</b>
              <span className="text-[13px]" style={{ color: C.muted }}>
                {a.sub}
              </span>
            </span>
          </motion.button>
        ))}
      </div>

      <p className="absolute left-5 right-5 top-[564px] m-0 text-center text-[13px]" style={{ color: C.muted }}>
        Скоро: квести, команда й дата-центр.
      </p>

      <Cta onClick={() => onOpen("arcade")}>Грати</Cta>
    </div>
  );
}
