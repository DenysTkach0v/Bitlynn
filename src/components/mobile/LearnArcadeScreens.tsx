"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { C, GAMES, GameId, RANKS, fmt, rankById, rankFor, rankIndexFor } from "@/components/arcade/tokens";
import { useArcadeStore } from "@/components/arcade/useArcadeStore";
import { DIRECTIONS, Direction } from "@/components/arcade/questions";
import { CheckIcon, FONT_MONO } from "@/components/arcade/ui";
import { sfx } from "@/components/arcade/arcadeAudio";
import { Art, At, BackChevron, BitsChip, Cta, SquareButton } from "./kit";

const DIR_INFO: Record<Direction, { blurb: string; topics: string[] }> = {
  python: { blurb: "Перша справжня мова програмування: команди, цикли, списки.", topics: ["змінні", "умови", "цикли", "списки"] },
  web: { blurb: "Як влаштовані сайти: теги HTML, стилі CSS і браузер.", topics: ["теги", "посилання", "CSS", "біти"] },
  logic: { blurb: "Мислення програміста без коду: алгоритми, умови, пошук помилок.", topics: ["І / АБО", "алгоритми", "дебаг"] },
};

/** Застосунок «Навчання»: дитина сама обирає режим (напрямок) — він визначає питання в іграх. */
export function LearnScreen({ onBack, onPlay }: { onBack: () => void; onPlay: () => void }) {
  const reduce = useReducedMotion();
  const direction = useArcadeStore((s) => s.direction);
  const setDirection = useArcadeStore((s) => s.setDirection);

  return (
    <div className="absolute inset-0">
      <SquareButton label="Назад до BitOS" onClick={onBack}>
        <BackChevron />
      </SquareButton>
      <h1 className="absolute left-[72px] top-[22px] m-0 text-[20px] font-bold">Навчання</h1>
      <At r={12} y={16}>
        <BitsChip />
      </At>
      <span className="absolute left-5 top-[78px] text-[12px]" style={{ fontFamily: FONT_MONO, color: C.muted }}>
        ОБЕРИ РЕЖИМ НАВЧАННЯ
      </span>
      <div role="radiogroup" aria-label="Режим навчання" className="absolute left-5 right-5 top-[100px] flex flex-col gap-3">
        {DIRECTIONS.map((d, i) => {
          const on = d.id === direction;
          return (
            <motion.button
              key={d.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                sfx("tap");
                setDirection(d.id);
              }}
              className="arc-card flex flex-col gap-1.5 rounded-2xl px-4 py-3.5 text-left outline-none"
              style={{ border: on ? "2px solid var(--acc)" : `1px solid ${C.line}`, background: on ? "var(--acc-soft)" : C.card }}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduce ? 0 : i * 0.05 }}
            >
              <span className="flex items-center justify-between">
                <b className="text-[18px]">{d.label}</b>
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full"
                  style={{ border: on ? "none" : "2px solid #3A3D4C", background: on ? "var(--acc)" : "transparent", color: "var(--acc-on)" }}
                >
                  {on && <CheckIcon size={13} />}
                </span>
              </span>
              <span className="text-[14px] leading-[20px]" style={{ color: C.muted }}>
                {DIR_INFO[d.id].blurb}
              </span>
              <span className="flex flex-wrap gap-1.5">
                {DIR_INFO[d.id].topics.map((t) => (
                  <span key={t} className="rounded-md px-2 py-0.5 text-[12px]" style={{ fontFamily: FONT_MONO, background: C.bg, color: C.text }}>
                    {t}
                  </span>
                ))}
              </span>
            </motion.button>
          );
        })}
      </div>
      <p className="absolute left-5 right-5 top-[604px] m-0 text-center text-[13px] leading-[1.45]" style={{ color: C.muted }}>
        Режим можна змінити будь-коли — прогрес і ранг не зміняться.
      </p>
      <Cta onClick={onPlay}>До Аркад</Cta>
    </div>
  );
}

/** Застосунок «Аркади» (4.0): напрямок питань + один список тренажерів, відкритих рангом. */
export function ArcadeScreen({ onBack, onPlay }: { onBack: () => void; onPlay: (g: GameId) => void }) {
  const xp = useArcadeStore((s) => s.xp);
  const best = useArcadeStore((s) => s.best);
  const direction = useArcadeStore((s) => s.direction);
  const setDirection = useArcadeStore((s) => s.setDirection);
  const rank = rankFor(xp);
  const isOpen = (id: GameId) => {
    const g = GAMES.find((x) => x.id === id)!;
    return g.ready && rankIndexFor(xp) >= RANKS.findIndex((r) => r.id === g.unlockRank);
  };
  const order: GameId[] = ["snake", "maze", "catch", "delivery", "factory"];
  const [sel, setSel] = useState<GameId>("snake");
  const opened = order.filter(isOpen).length;
  const selMeta = GAMES.find((g) => g.id === sel)!;
  const dirLabel = DIRECTIONS.find((d) => d.id === direction)!.label;

  return (
    <div className="absolute inset-0">
      <SquareButton label="Назад" onClick={onBack}>
        <BackChevron />
      </SquareButton>
      <h1 className="absolute left-[72px] top-[22px] m-0 text-[20px] font-bold">Аркади</h1>
      <At r={12} y={16}>
        <BitsChip />
      </At>
      <span className="absolute left-5 top-[78px] text-[12px]" style={{ fontFamily: FONT_MONO, color: C.muted }}>
        НАПРЯМОК ПИТАНЬ
      </span>
      <div role="radiogroup" aria-label="Напрямок питань" className="absolute left-5 right-5 top-[100px] grid grid-cols-3 gap-2">
        {DIRECTIONS.map((d) => {
          const on = d.id === direction;
          return (
            <button
              key={d.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                sfx("tap");
                setDirection(d.id);
              }}
              className="h-11 rounded-[10px] text-[14px] font-semibold outline-none transition-colors"
              style={on ? { background: "var(--acc)", color: "var(--acc-on)" } : { background: C.card, color: C.text, border: `1px solid ${C.line}` }}
            >
              {d.label}
            </button>
          );
        })}
      </div>
      <span className="absolute left-5 top-[158px] text-[13px]" style={{ color: C.muted }}>
        Ранг {rank.label} · відкрито {opened} з 5 тренажерів
      </span>

      <div className="absolute left-5 right-5 top-[184px] flex flex-col gap-2.5">
        {order.map((id) => {
          const g = GAMES.find((x) => x.id === id)!;
          const open = isOpen(id);
          const on = sel === id && open;
          const need = rankById(g.unlockRank);
          const b = best[id];
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              aria-disabled={!open}
              onClick={() => {
                if (!open) return;
                sfx("tap");
                setSel(id);
              }}
              className="arc-card flex min-h-[68px] w-full items-center gap-3 rounded-[14px] px-3.5 text-left outline-none"
              style={{
                border: on ? "2px solid var(--acc)" : open ? `1px solid ${C.line}` : "1px dashed #3A3D4C",
                background: on ? "var(--acc-soft)" : open ? C.card : "transparent",
                cursor: open ? "pointer" : "default",
              }}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: C.bg, color: open ? "var(--acc)" : C.muted }}>
                <Art name={`game_${id}`} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <b className="text-[15px]" style={{ color: open ? C.text : C.muted }}>
                  {g.title}
                </b>
                <span className="text-[13px]" style={{ color: C.muted }}>
                  {open ? (
                    b !== undefined ? (
                      <>
                        Твій найкращий: <span style={{ fontFamily: FONT_MONO }}>{b}/{g.steps}</span>
                      </>
                    ) : (
                      "Ще не грав — спробуй!"
                    )
                  ) : g.ready ? (
                    `з рангом ${need.label} · ${fmt(need.xp)} XP`
                  ) : (
                    `з рангом ${need.label}`
                  )}
                </span>
              </span>
              {open && (
                <span
                  className="h-5 w-5 shrink-0 rounded-full"
                  style={on ? { border: "6px solid var(--acc)", background: "var(--acc-on)" } : { border: "2px solid #3A3D4C" }}
                />
              )}
            </button>
          );
        })}
      </div>

      <p className="absolute left-5 right-5 top-[586px] m-0 text-center text-[14px]" style={{ color: C.muted }}>
        Обрано: <b style={{ color: C.text }}>{selMeta.title}</b>
        {sel === "catch" ? " · слова про залізо" : ` · питання: ${dirLabel}`}
      </p>
      <Cta onClick={() => onPlay(sel)}>Грати</Cta>
    </div>
  );
}
