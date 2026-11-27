"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { C, REWARD_RULES, plural, rankIndexFor } from "@/components/arcade/tokens";
import { dateKey, dueReviews, useArcadeStore, weekKey } from "@/components/arcade/useArcadeStore";
import { DIRECTIONS } from "@/components/arcade/questions";
import { FONT_MONO } from "@/components/arcade/ui";
import { sfx } from "@/components/arcade/arcadeAudio";
import { Art, At, BitsChip, Cta, PowerIcon, SquareButton, Toast } from "./kit";

export type PcApp = "learn" | "arcade" | "shop" | "profile" | "wave";

const DAILY_GOAL = 3;

/** Екран ПК (BitOS): «Сьогодні» з реальним прогресом і застосунки. */
export function BitOSScreen({ onOff, onOpen }: { onOff: () => void; onOpen: (app: PcApp) => void }) {
  const reduce = useReducedMotion();
  const xp = useArcadeStore((s) => s.xp);
  const direction = useArcadeStore((s) => s.direction);
  const playedDays = useArcadeStore((s) => s.playedDays);
  const gamesToday = useArcadeStore((s) => s.gamesToday);
  const reviews = useArcadeStore((s) => s.reviews);
  const [toast, setToast] = useState<string | null>(null);

  const wk = weekKey();
  const days = playedDays.filter((d) => weekKey(d) === wk).length;
  const waveDone = days >= REWARD_RULES.waveGoalDays;
  const played = gamesToday.date === dateKey() ? gamesToday.count : 0;
  const due = dueReviews(reviews).length;
  const dirLabel = DIRECTIONS.find((d) => d.id === direction)?.label ?? "Python";
  const senior = rankIndexFor(xp) >= 3;

  const soon = (name: string) => {
    sfx("tap");
    setToast(`«${name}» з’явиться в наступній версії демо.`);
    setTimeout(() => setToast(null), 2200);
  };

  const apps: { key: string; label: string; act: () => void }[] = [
    { key: "learn", label: "Навчання", act: () => onOpen("learn") },
    { key: "arcade", label: "Аркади", act: () => onOpen("arcade") },
    { key: "quests", label: "Квести", act: () => soon("Квести") },
    { key: "tasks", label: "Завдання", act: () => soon("Завдання") },
    { key: "team", label: "Команда", act: () => soon("Команда") },
    { key: "shop", label: "Магазин", act: () => onOpen("shop") },
    { key: "profile", label: "Профіль", act: () => onOpen("profile") },
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
        <button type="button" onClick={() => onOpen("wave")} className="flex items-center gap-3 text-left outline-none" aria-label="Відкрити Хвилю тижня">
          <Art name="wave" />
          <span className="flex flex-col gap-0.5">
            <b className="text-[14px]">{waveDone ? `Хвиля ${REWARD_RULES.waveGoalDays}/${REWARD_RULES.waveGoalDays} — зловив!` : `Хвиля ${days}/${REWARD_RULES.waveGoalDays}`}</b>
            <span className="text-[13px]" style={{ fontFamily: FONT_MONO, color: waveDone ? C.success : C.muted }}>
              {waveDone ? `+${REWARD_RULES.waveBits} біт` : `ще ${REWARD_RULES.waveGoalDays - days} ${plural(REWARD_RULES.waveGoalDays - days, "день", "дні", "днів")} → +${REWARD_RULES.waveBits} біт`}
            </span>
          </span>
        </button>
        <div className="h-px" style={{ background: C.line }} />
        <div className="flex justify-between gap-2.5 text-[14px]">
          <span>Режим навчання: {dirLabel}</span>
          <button type="button" onClick={() => onOpen("learn")} className="text-[13px] font-semibold outline-none" style={{ color: "var(--acc-ring)" }}>
            змінити
          </button>
        </div>
        <div className="flex justify-between gap-2.5 text-[14px]">
          <span>Аркада: {DAILY_GOAL} гри</span>
          <span className="text-[13px]" style={{ fontFamily: FONT_MONO, color: played >= DAILY_GOAL ? C.success : C.muted }}>
            {Math.min(played, DAILY_GOAL)} / {DAILY_GOAL}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full" style={{ background: C.line }}>
          <motion.div className="h-full" style={{ background: "var(--acc)" }} initial={reduce ? false : { width: 0 }} animate={{ width: `${(Math.min(played, DAILY_GOAL) / DAILY_GOAL) * 100}%` }} />
        </div>
        <div className="flex justify-between gap-2.5 text-[14px]">
          <span>
            Повторення <span style={{ color: C.muted }}>· помилки повертаються</span>
          </span>
          <span className="whitespace-nowrap text-[13px]" style={{ fontFamily: FONT_MONO, color: due ? C.wave : C.muted }}>
            {due ? `↺ ${due}` : "0"}
          </span>
        </div>
      </motion.div>

      <span className="absolute left-5 top-[352px] text-[12px]" style={{ fontFamily: FONT_MONO, color: C.muted }}>
        ЗАСТОСУНКИ
      </span>
      <div className="absolute left-5 right-5 top-[374px] grid grid-cols-4 gap-3">
        {apps.map((a, i) => (
          <motion.button
            key={a.key}
            type="button"
            onClick={() => {
              sfx("tap");
              a.act();
            }}
            className="arc-card flex h-[84px] flex-col items-center justify-center gap-1.5 rounded-[14px] border text-[12px] font-semibold outline-none"
            style={{ borderColor: C.line, background: C.card, color: C.text }}
            initial={reduce ? false : { opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: reduce ? 0 : 0.05 + i * 0.04, type: "spring", stiffness: 420, damping: 26 }}
          >
            <span style={{ color: "var(--acc)" }}>
              <Art name={`app_${a.key}`} />
            </span>
            {a.label}
          </motion.button>
        ))}
        <motion.button
          type="button"
          aria-label={senior ? "Дата-центр" : "Дата-центр — з рангом Сеньйор"}
          onClick={() => soon("Дата-центр")}
          className="flex h-[84px] flex-col items-center justify-center gap-1.5 rounded-[14px] border border-dashed text-[12px] outline-none"
          style={{ borderColor: "#3A3D4C", background: "transparent", color: C.muted }}
          initial={reduce ? false : { opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: reduce ? 0 : 0.05 + apps.length * 0.04 }}
        >
          <Art name="app_datacenter" />
          Дата-центр
        </motion.button>
      </div>

      <p className="absolute left-5 right-5 top-[576px] m-0 text-[13px] leading-[1.45]" style={{ color: C.muted }}>
        «Команда» замість дуелей: граєте разом, а не одне проти одного.
      </p>

      <Toast text={toast} />
      <Cta onClick={() => onOpen("arcade")}>Продовжити навчання</Cta>
    </div>
  );
}
