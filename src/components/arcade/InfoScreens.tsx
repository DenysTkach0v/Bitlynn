"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { C, GAMES, GameId, RANKS, REWARD_RULES, fmt, rankFor, stepXp, bitsForXp } from "./tokens";
import { addDays, computeWaveLevel, dateKey, weekKey, useArcadeStore } from "./useArcadeStore";
import { BackIcon, FONT_MONO, FONT_PIXEL, FONT_UI, IconButton, PrimaryButton, CheckIcon } from "./ui";
import { sfx } from "./arcadeAudio";

const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

function TopBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="grid shrink-0 grid-cols-[48px_1fr_48px] items-center gap-3 px-4 pt-3">
      <IconButton ariaLabel="Назад" onClick={onBack}>
        <BackIcon />
      </IconButton>
      <span className="text-center text-[17px] font-bold" style={{ color: C.text }}>
        {title}
      </span>
      <span />
    </div>
  );
}

/**
 * Спільний екран №5 — Хвиля тижня (замість стріку).
 * Ціль — 3 дні на тиждень, пропуск нічого не забирає, є режим відпочинку,
 * сповіщень за замовчуванням немає.
 */
export function WaveScreen({ onBack, onPlay, dailyGame }: { onBack: () => void; onPlay: (g: GameId) => void; dailyGame: GameId }) {
  const reduce = useReducedMotion();
  const playedDays = useArcadeStore((s) => s.playedDays);
  const restWeeks = useArcadeStore((s) => s.restWeeks);
  const restMode = useArcadeStore((s) => s.restMode);
  const toggleRest = useArcadeStore((s) => s.toggleRest);
  const today = dateKey();
  const monday = weekKey(today);
  const week = DAY_LABELS.map((label, i) => {
    const k = addDays(monday, i);
    return { label, key: k, played: playedDays.includes(k), isToday: k === today, future: k > today };
  });
  const count = week.filter((d) => d.played).length;
  const level = computeWaveLevel(playedDays, restWeeks);
  const goal = REWARD_RULES.waveGoalDays;
  const dailyTitle = GAMES.find((g) => g.id === dailyGame)?.title ?? "Змійка";

  // wave height: weekly level + this week's days, so every played day visibly lifts it
  const h = 16 + level * 10 + Math.min(count, goal) * 6;

  return (
    <div className="flex h-full flex-col" style={{ fontFamily: FONT_UI }}>
      <TopBar title="Хвиля тижня" onBack={onBack} />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4 pt-4 [&>*]:shrink-0">
        <p className="text-[15px] leading-[22px]" style={{ color: C.text }}>
          Вчися {goal} дні на тиждень — і хвиля росте. Пропуск нічого не забирає: хвиля лише трохи опуститься.
        </p>

        <div className="relative h-[132px] overflow-hidden rounded-2xl border" style={{ background: "#0B1D22", borderColor: C.line }}>
          <motion.svg
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 w-full"
            viewBox="0 0 400 100"
            preserveAspectRatio="none"
            style={{ height: `${h}%` }}
            initial={reduce ? false : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <path d="M0 18 C 50 4, 100 4, 150 18 S 250 32, 300 18 S 375 4, 400 14 L400 100 L0 100 Z" fill={C.wave} opacity={restMode ? 0.35 : 0.85} />
            <path d="M0 34 C 60 22, 110 22, 170 34 S 270 46, 330 34 S 380 26, 400 30 L400 100 L0 100 Z" fill="#2B9C93" opacity={restMode ? 0.4 : 0.9} />
          </motion.svg>
          <div className="relative flex h-full flex-col justify-between p-3.5">
            <span className="text-[13px]" style={{ fontFamily: FONT_MONO, color: C.text }}>
              рівень хвилі {level} / 5{restMode ? " · завмерла" : ""}
            </span>
            <b className="text-[28px]" style={{ fontFamily: FONT_MONO, color: C.text }}>
              {Math.min(count, goal)} / {goal} дні
            </b>
          </div>
        </div>

        <ol className="grid grid-cols-7 gap-1.5" aria-label="Дні цього тижня">
          {week.map((d) => (
            <li key={d.key} className="flex flex-col items-center gap-1">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full text-[12px] font-bold"
                aria-label={`${d.label}: ${d.played ? "навчався" : d.future ? "попереду" : "без гри"}`}
                style={{
                  background: d.played ? C.wave : "transparent",
                  color: d.played ? C.bg : C.muted,
                  border: d.isToday && !d.played ? `2px solid ${C.wave}` : d.played ? "none" : `1px solid ${C.line}`,
                  opacity: d.future ? 0.5 : 1,
                }}
              >
                {d.played ? <CheckIcon size={14} /> : ""}
              </span>
              <span className="text-[12px]" style={{ color: d.isToday ? C.text : C.muted }}>
                {d.label}
              </span>
            </li>
          ))}
        </ol>

        <p className="rounded-xl px-3.5 py-3 text-[14px] leading-[21px]" style={{ background: C.waveSoft, color: C.text }}>
          За {goal} дні — фіксовано <b style={{ color: C.bits }}>+{REWARD_RULES.waveBits} біт</b>, один раз на тиждень. Нагадувань немає — повертайся, коли зручно.
        </p>

        <button
          type="button"
          role="switch"
          aria-checked={restMode}
          onClick={() => {
            sfx("tap");
            toggleRest();
          }}
          className="arc-card flex min-h-[64px] items-center gap-3 rounded-2xl border px-4 py-3 text-left outline-none"
          style={{ borderColor: C.line, background: C.card }}
        >
          <span className="flex flex-1 flex-col">
            <b className="text-[15px]" style={{ color: C.text }}>
              Режим відпочинку
            </b>
            <span className="text-[13px]" style={{ color: C.muted }}>
              Канікули чи хвороба — хвиля завмирає
            </span>
          </span>
          <span className="relative h-8 w-14 shrink-0 rounded-full transition-colors" style={{ background: restMode ? C.wave : C.line }}>
            <span className="absolute top-1 h-6 w-6 rounded-full transition-all" style={{ left: restMode ? 28 : 4, background: restMode ? C.bg : C.muted }} />
          </span>
        </button>

        <div className="flex flex-col gap-0.5 px-1">
          <b className="text-[15px]" style={{ color: C.text }}>
            Сьогодні вистачить
          </b>
          <span className="text-[14px]" style={{ color: C.muted }}>
            Одна гра ≈ 4 хвилини · {dailyTitle}
          </span>
        </div>
        <p className="px-1 text-[13px] leading-[19px]" style={{ color: C.muted }}>
          Ніяких «ти втратив серію». Лише хвиля, яка чекає на тебе.
        </p>
      </div>
      <div className="shrink-0 pt-2" style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>
        <PrimaryButton onClick={() => onPlay(dailyGame)}>Почати</PrimaryButton>
      </div>
    </div>
  );
}

/** Прозорі правила нагород — усе видно одразу, нічого не продається за гроші. */
export function RulesScreen({ onBack }: { onBack: () => void }) {
  const xp = useArcadeStore((s) => s.xp);
  const current = rankFor(xp).id;
  const row = "flex items-center justify-between gap-3 px-3.5 py-2.5 text-[14px]";
  return (
    <div className="flex h-full flex-col" style={{ fontFamily: FONT_UI }}>
      <TopBar title="Як працюють нагороди" onBack={onBack} />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pt-4 [&>*]:shrink-0" style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>
        <section>
          <h2 className="mb-2 text-[12px] uppercase tracking-[0.08em]" style={{ fontFamily: FONT_MONO, color: C.muted }}>
            Ранги — лише за досвід
          </h2>
          <ol className="overflow-hidden rounded-2xl border" style={{ borderColor: C.line, background: C.card }}>
            {RANKS.map((r, i) => (
              <li key={r.id} className={row} style={{ borderTop: i ? `1px solid ${C.line}` : undefined, background: r.id === current ? "var(--acc-soft)" : undefined }}>
                <b style={{ fontFamily: FONT_PIXEL, color: r.id === current ? "var(--acc-ring)" : C.text }}>{r.label}</b>
                <span style={{ fontFamily: FONT_MONO, color: C.xp }}>{fmt(r.xp)} XP</span>
                <span className="flex-1 text-right" style={{ color: C.muted }}>
                  {r.room}
                  {r.id === current ? " · ти тут" : ""}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="mb-2 text-[12px] uppercase tracking-[0.08em]" style={{ fontFamily: FONT_MONO, color: C.muted }}>
            Досвід і біти
          </h2>
          <ul className="overflow-hidden rounded-2xl border" style={{ borderColor: C.line, background: C.card }}>
            {[
              ["Відповідь з першої спроби", `+${stepXp(true)} XP · +${bitsForXp(stepXp(true))} біт`],
              ["Відповідь з другої спроби", `+${stepXp(false)} XP · +${bitsForXp(stepXp(false))} біт`],
              ["Раунд до кінця", `+${REWARD_RULES.roundBonusXp} XP`],
              [`Хвиля: ${REWARD_RULES.waveGoalDays} дні за тиждень`, `+${REWARD_RULES.waveBits} біт`],
            ].map(([a, b], i) => (
              <li key={a} className={row} style={{ borderTop: i ? `1px solid ${C.line}` : undefined }}>
                <span style={{ color: C.text }}>{a}</span>
                <span className="text-right" style={{ fontFamily: FONT_MONO, color: C.xp }}>
                  {b}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[13px] leading-[19px]" style={{ color: C.muted }}>
            Біти = половина досвіду за те саме завдання. Нічого не нараховується «просто так» і нічого не забирається за помилку.
          </p>
        </section>

        <section className="grid grid-cols-2 gap-2.5 text-[14px] leading-[20px]">
          <div className="rounded-2xl p-3.5" style={{ background: C.successSoft }}>
            <b style={{ color: C.success }}>За біти</b>
            <p className="mt-1" style={{ color: C.text }}>
              Колір героя (250–370 біт), декор для кімнати.
            </p>
          </div>
          <div className="rounded-2xl p-3.5" style={{ background: C.almostSoft }}>
            <b style={{ color: C.almost }}>Ніколи</b>
            <p className="mt-1" style={{ color: C.text }}>
              Ранг, кімнати, ігри й підказки не купуються. Лутбоксів і справжніх грошей немає.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
