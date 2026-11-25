"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useBitlynnStore } from "@/store/useBitlynnStore";
import {
  C,
  GAMES,
  GameId,
  HERO_ORDER,
  HERO_THEMES,
  HeroColorId,
  REWARD_RULES,
  fmt,
  nextRank,
  plural,
  rankById,
  rankFor,
  rankIndexFor,
  RANKS,
} from "./tokens";
import { dateKey, dueReviews, weekKey, useArcadeStore } from "./useArcadeStore";
import { bankFor, idOf } from "./questions";
import {
  AxoAvatar,
  BackIcon,
  BitIcon,
  CheckIcon,
  FONT_MONO,
  FONT_PIXEL,
  FONT_UI,
  IconButton,
  LockIcon,
  PrimaryButton,
  Sheet,
  TextButton,
  WaveIcon,
} from "./ui";
import { GamePreview } from "./GamePreview";
import { haptic, sfx } from "./arcadeAudio";

/** «Гра дня»: одна з відкритих ігор, стабільна протягом дня. */
export function gameOfTheDay(xp: number): GameId {
  const open = GAMES.filter((g) => g.ready && rankIndexFor(xp) >= RANKS.findIndex((r) => r.id === g.unlockRank));
  const d = new Date();
  const seed = d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate();
  return open[seed % open.length]?.id ?? "snake";
}

export function ArcadeHub({
  onExit,
  onOpenGame,
  onOpenWave,
  onOpenRules,
}: {
  onExit: () => void;
  onOpenGame: (g: GameId) => void;
  onOpenWave: () => void;
  onOpenRules: () => void;
}) {
  const reduce = useReducedMotion();
  const xp = useArcadeStore((s) => s.xp);
  const hero = useArcadeStore((s) => s.hero);
  const owned = useArcadeStore((s) => s.ownedHeroes);
  const best = useArcadeStore((s) => s.best);
  const reviews = useArcadeStore((s) => s.reviews);
  const playedDays = useArcadeStore((s) => s.playedDays);
  const restMode = useArcadeStore((s) => s.restMode);
  const setHero = useArcadeStore((s) => s.setHero);
  const buyHero = useArcadeStore((s) => s.buyHero);
  const ensureRestWeek = useArcadeStore((s) => s.ensureRestWeek);
  const wallet = useBitlynnStore((s) => s.bits);

  const [buying, setBuying] = useState<HeroColorId | null>(null);

  useEffect(() => ensureRestWeek(), [ensureRestWeek]);

  const rank = rankFor(xp);
  const nxt = nextRank(xp);
  const pct = nxt ? ((xp - rank.xp) / (nxt.xp - rank.xp)) * 100 : 100;
  const wk = weekKey();
  const daysThisWeek = playedDays.filter((d) => weekKey(d) === wk).length;
  const playedToday = playedDays.includes(dateKey());
  const due = dueReviews(reviews);
  const daily = gameOfTheDay(xp);
  const dailyMeta = GAMES.find((g) => g.id === daily)!;

  const reviewGame: GameId | null = useMemo(() => {
    for (const g of ["snake", "maze"] as const) {
      const ids = new Set(bankFor(g).map(idOf));
      const unlocked = rankIndexFor(xp) >= RANKS.findIndex((r) => r.id === GAMES.find((m) => m.id === g)!.unlockRank);
      if (unlocked && due.some((r) => ids.has(r.id))) return g;
    }
    return null;
  }, [due, xp]);

  const buyingTheme = buying ? HERO_THEMES[buying] : null;

  return (
    <div className="relative flex h-full flex-col" style={{ fontFamily: FONT_UI }}>
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-3">
        <IconButton ariaLabel="Назад на платформу" onClick={onExit}>
          <BackIcon />
        </IconButton>
        <span className="text-[17px] font-bold" style={{ color: C.text }}>
          Аркади
        </span>
        <span
          className="flex h-12 min-w-[48px] items-center gap-1.5 rounded-xl border px-3 text-[14px] font-bold"
          style={{ fontFamily: FONT_MONO, borderColor: C.line, background: C.card, color: C.bits }}
          aria-label={`${wallet} біт на рахунку`}
        >
          <BitIcon size={14} />
          {fmt(wallet)}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pb-6 pt-4 [&>*]:shrink-0">
        {/* room + rank: the one progress axis */}
        <section className="flex items-center gap-4 rounded-2xl border p-4" style={{ background: C.card, borderColor: C.line }}>
          <div className="flex h-[104px] w-[88px] shrink-0 items-end justify-center rounded-xl" style={{ background: "#0B1D22" }}>
            <AxoAvatar hoodie={HERO_THEMES[hero].acc} px={4} title="Твій аксолотль" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-[13px]" style={{ color: C.muted }}>
              Кімната · {rank.room}
            </span>
            <b
              className="w-fit rounded-lg px-2 py-0.5 text-[16px]"
              style={{ fontFamily: FONT_PIXEL, background: "var(--acc-soft)", border: "1px solid var(--acc)", color: "var(--acc-ring)" }}
            >
              {rank.label}
            </b>
            <div className="mt-1 h-2 overflow-hidden rounded-full" style={{ background: C.line }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: "var(--acc)" }}
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <span className="text-[13px]" style={{ fontFamily: FONT_MONO, color: C.muted }}>
              {fmt(xp)}
              {nxt ? ` / ${fmt(nxt.xp)} XP · ще ${fmt(nxt.xp - xp)} до ${nxt.label}` : " XP · найвищий ранг"}
            </span>
          </div>
        </section>

        {/* wave */}
        <button
          type="button"
          onClick={() => {
            sfx("tap");
            onOpenWave();
          }}
          className="arc-card flex min-h-[64px] items-center gap-3 rounded-2xl border px-4 py-3 text-left outline-none"
          style={{ background: C.card, borderColor: C.line }}
        >
          <WaveIcon size={24} />
          <span className="flex flex-1 flex-col">
            <b className="text-[15px]" style={{ color: C.text }}>
              Хвиля тижня {restMode && <span style={{ color: C.muted, fontWeight: 400 }}>· відпочинок</span>}
            </b>
            <span className="text-[13px]" style={{ color: C.muted }}>
              {Math.min(daysThisWeek, 3)} з {REWARD_RULES.waveGoalDays} днів{playedToday ? " · сьогодні вже є ✓" : ""}
            </span>
          </span>
          <span className="flex gap-1">
            {Array.from({ length: REWARD_RULES.waveGoalDays }, (_, i) => (
              <span key={i} className="h-2.5 w-2.5 rounded-full" style={{ background: i < daysThisWeek ? C.wave : C.line }} />
            ))}
          </span>
        </button>

        {reviewGame && (
          <button
            type="button"
            onClick={() => {
              sfx("tap");
              onOpenGame(reviewGame);
            }}
            className="arc-card flex min-h-[64px] items-center gap-3 rounded-2xl px-4 py-3 text-left outline-none"
            style={{ background: C.waveSoft }}
          >
            <b className="text-[18px]" style={{ fontFamily: FONT_MONO, color: C.wave }}>
              ↺ {due.length}
            </b>
            <span className="flex-1 text-[14px] leading-[20px]" style={{ color: C.text }}>
              {plural(due.length, "питання чекає", "питання чекають", "питань чекають")} на повторення. Вони з’являться в наступній грі.
            </span>
          </button>
        )}

        <h2 className="mt-2 text-[13px] uppercase tracking-[0.08em]" style={{ fontFamily: FONT_MONO, color: C.muted }}>
          Ігри · відкриваються рангом
        </h2>
        <ul className="flex flex-col gap-2.5">
          {GAMES.map((g) => {
            const need = rankById(g.unlockRank);
            const open = rankIndexFor(xp) >= RANKS.findIndex((r) => r.id === g.unlockRank);
            const playable = open && g.ready;
            const b = best[g.id];
            return (
              <li key={g.id}>
                <button
                  type="button"
                  disabled={!playable}
                  onClick={() => {
                    sfx("tap");
                    haptic(6);
                    onOpenGame(g.id);
                  }}
                  aria-label={playable ? `${g.title}. ${g.blurb}` : `${g.title} — відкривається на ранзі ${need.label}`}
                  className="arc-card flex w-full items-center gap-3 rounded-2xl border p-3 text-left outline-none disabled:cursor-default"
                  style={{ background: C.card, borderColor: g.id === daily && playable ? "var(--acc)" : C.line, opacity: playable ? 1 : 0.62 }}
                >
                  <span className="flex h-[64px] w-[80px] shrink-0 items-center justify-center overflow-hidden rounded-xl" style={{ background: "#0B1D22" }}>
                    <GamePreview game={g.id} accent={playable ? HERO_THEMES[hero].acc : "#5D6B74"} size={0.62} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-2">
                      <b className="text-[16px]" style={{ color: C.text }}>
                        {g.title}
                      </b>
                      {g.id === daily && playable && (
                        <span className="rounded-md px-1.5 py-0.5 text-[11px] font-bold" style={{ background: "var(--acc-soft)", color: "var(--acc-ring)" }}>
                          гра дня
                        </span>
                      )}
                    </span>
                    <span className="text-[13px]" style={{ fontFamily: FONT_MONO, color: C.muted }}>
                      {g.tag}
                    </span>
                    <span className="text-[13px]" style={{ color: C.muted }}>
                      {playable ? (
                        b !== undefined ? (
                          <>
                            Твій найкращий: {b}/{g.steps}
                          </>
                        ) : (
                          g.blurb
                        )
                      ) : open ? (
                        "Скоро"
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <LockIcon size={13} /> Ранг {need.label} · {fmt(need.xp)} XP
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* hero colour = interface colour */}
        <h2 className="mt-3 text-[13px] uppercase tracking-[0.08em]" style={{ fontFamily: FONT_MONO, color: C.muted }}>
          Колір героя
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {HERO_ORDER.map((id) => {
            const t = HERO_THEMES[id];
            const has = owned.includes(id);
            const active = hero === id;
            const state = active ? "обрано" : has ? "твій" : t.rankOnly ? rankById(t.rankOnly).label : `${t.price}`;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                aria-label={`${t.label}: ${active ? "обрано" : has ? "твій, перемкнути безкоштовно" : t.rankOnly ? `відкривається рангом ${rankById(t.rankOnly).label}` : `коштує ${t.price} біт`}`}
                onClick={() => {
                  sfx("tap");
                  if (has) setHero(id);
                  else setBuying(id);
                }}
                className="arc-card flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl border outline-none"
                style={{ background: C.card, borderColor: active ? t.acc : C.line, borderWidth: active ? 2 : 1 }}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: t.acc, color: t.on }}>
                  {active && <CheckIcon size={13} />}
                  {!has && t.rankOnly && <LockIcon size={12} />}
                </span>
                <span className="text-[12px] font-semibold" style={{ color: active ? C.text : C.muted }}>
                  {t.label}
                </span>
                <span className="flex items-center gap-1 text-[11px]" style={{ fontFamily: FONT_MONO, color: has ? C.muted : C.bits }}>
                  {!has && !t.rankOnly && <BitIcon size={10} />}
                  {state}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[13px] leading-[19px]" style={{ color: C.muted }}>
          Колір змінює героя, кнопки й прогрес. Купуєш один раз — і він твій назавжди. Перемикатися між своїми кольорами безкоштовно.
        </p>

        <TextButton onClick={onOpenRules}>Як працюють нагороди →</TextButton>
      </div>

      <div className="shrink-0 border-t pt-3" style={{ borderColor: C.line, background: C.bg, paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>
        <PrimaryButton onClick={() => onOpenGame(daily)} ariaLabel={`Грати: ${dailyMeta.title}`}>
          Грати · {dailyMeta.title}
        </PrimaryButton>
      </div>

      <Sheet open={!!buyingTheme} label="Колір героя" onBackdrop={() => setBuying(null)}>
        {buyingTheme && (
          <BuyColorBody
            id={buyingTheme.id}
            wallet={wallet}
            xp={xp}
            onBuy={() => {
              const r = buyHero(buyingTheme.id);
              if (r === "ok" || r === "owned") {
                sfx("right");
                setBuying(null);
              }
            }}
            onCancel={() => setBuying(null)}
          />
        )}
      </Sheet>
    </div>
  );
}

function BuyColorBody({
  id,
  wallet,
  xp,
  onBuy,
  onCancel,
}: {
  id: HeroColorId;
  wallet: number;
  xp: number;
  onBuy: () => void;
  onCancel: () => void;
}) {
  const t = HERO_THEMES[id];
  const rankLocked = !!t.rankOnly && rankFor(xp).id !== t.rankOnly;
  const short = t.price - wallet;
  return (
    <div className="flex flex-col items-center px-5 pt-4 text-center" style={{ fontFamily: FONT_UI, paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>
      <div className="flex h-[112px] w-[112px] items-end justify-center rounded-2xl" style={{ background: "#0B1D22" }}>
        <AxoAvatar hoodie={t.acc} px={4.4} />
      </div>
      <h2 className="mt-3 text-[20px] font-bold" style={{ color: C.text }}>
        Колір «{t.label}»
      </h2>
      <p className="mt-1 max-w-[300px] text-[14px] leading-[21px]" style={{ color: C.muted }}>
        {rankLocked
          ? `Цей колір не купується — він відкривається лише рангом ${rankById(t.rankOnly!).label} (${fmt(rankById(t.rankOnly!).xp)} XP).`
          : short > 0
          ? `Коштує ${t.price} біт. Бракує ${short} — це приблизно ${Math.ceil(short / 35)} ${plural(Math.ceil(short / 35), "гра", "гри", "ігор")}.`
          : `Коштує ${t.price} біт (на рахунку ${fmt(wallet)}). Купуєш один раз — і він твій назавжди.`}
      </p>
      <div className="mt-5 flex w-full flex-col gap-2">
        {!rankLocked && (
          <PrimaryButton disabled={short > 0} onClick={onBuy}>
            {short > 0 ? `Бракує ${short} біт` : `Взяти за ${t.price} біт`}
          </PrimaryButton>
        )}
        <TextButton onClick={onCancel}>{rankLocked || short > 0 ? "Зрозуміло" : "Скасувати"}</TextButton>
      </div>
    </div>
  );
}
