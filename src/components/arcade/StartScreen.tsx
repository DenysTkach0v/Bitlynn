"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { C, GameMeta, REWARD_RULES, bitsForXp, plural, stepXp } from "./tokens";
import { BackIcon, FONT_MONO, FONT_UI, IconButton, PrimaryButton, Tag, BitIcon, XpIcon } from "./ui";
import { GamePreview } from "./GamePreview";

/** Спільний екран №1 — старт гри: що робити, і що за це буде. */
export function StartScreen({
  meta,
  accent,
  reviewsDue,
  onBack,
  onPlay,
}: {
  meta: GameMeta;
  accent: string;
  reviewsDue: number;
  onBack: () => void;
  onPlay: () => void;
}) {
  const reduce = useReducedMotion();
  const maxXp = meta.steps * stepXp(true) + REWARD_RULES.roundBonusXp;
  const minutes = Math.max(3, Math.round(meta.steps * 0.8));

  return (
    <div className="flex h-full flex-col" style={{ fontFamily: FONT_UI }}>
      <div className="flex shrink-0 items-center px-4 pt-3">
        <IconButton ariaLabel="Назад до Аркад" onClick={onBack}>
          <BackIcon />
        </IconButton>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6">
        <motion.div
          className="mx-auto mt-2 flex h-[150px] w-full items-center justify-center rounded-2xl border"
          style={{ background: "#0B1D22", borderColor: C.line }}
          initial={reduce ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <GamePreview game={meta.id} accent={accent} size={1.3} />
        </motion.div>

        <h1 className="mt-5 text-[24px] font-bold leading-[30px]" style={{ color: C.text }}>
          {meta.title}
        </h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <Tag>{meta.tag}</Tag>
          <Tag>
            {meta.steps} {plural(meta.steps, ...meta.stepForms)}
          </Tag>
          <Tag>≈ {minutes} хв</Tag>
        </div>

        <ol className="mt-5 flex flex-col gap-3">
          {meta.rules.map((r, i) => {
            const cubeRule = r.includes("кубик");
            return (
            <li key={r} className="flex items-start gap-3 text-[15px] leading-[22px]" style={{ color: C.text }}>
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[13px]"
                style={{ fontFamily: FONT_MONO, background: cubeRule ? "#4A3010" : C.line, color: cubeRule ? "#FFC857" : C.text }}
              >
                {i + 1}
              </span>
              <span className="pt-0.5">{r}</span>
            </li>
            );
          })}
        </ol>

        {reviewsDue > 0 && meta.id !== "catch" && (
          <p className="mt-4 rounded-xl px-3.5 py-2.5 text-[14px] leading-[21px]" style={{ background: C.waveSoft, color: C.text }}>
            <b style={{ color: C.wave }}>↺ {reviewsDue}</b> {plural(reviewsDue, "питання повернеться", "питання повернуться", "питань повернуться")} для повторення — так вони краще запам’ятаються.
          </p>
        )}

        <div className="mt-auto flex items-center justify-center gap-4 pb-4 pt-5 text-[14px]" style={{ color: C.muted }}>
          <span className="flex items-center gap-1.5">
            <XpIcon size={14} /> до +{maxXp} XP
          </span>
          <span className="flex items-center gap-1.5">
            <BitIcon size={14} /> +{bitsForXp(maxXp)} біт
          </span>
        </div>
      </div>

      <div className="shrink-0 pt-2" style={{ paddingBottom: "calc(72px + env(safe-area-inset-bottom))" }}>
        <PrimaryButton onClick={onPlay}>Грати</PrimaryButton>
      </div>
    </div>
  );
}
