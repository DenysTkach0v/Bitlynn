"use client";

import { loop } from "./loop";

import React, { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { C, HERO_ORDER, HERO_THEMES, HeroColorId, REWARD_RULES, fmt, nextRank, rankById, rankFor } from "@/components/arcade/tokens";
import { useArcadeStore, weekKey } from "@/components/arcade/useArcadeStore";
import { AxoAvatar, CheckIcon, FONT_MONO, FONT_PIXEL, LockIcon } from "@/components/arcade/ui";
import { sfx, haptic } from "@/components/arcade/arcadeAudio";
import { At, BackChevron, BitsChip, Cta, SquareButton, Art } from "./kit";

interface Item {
  id: string;
  name: string;
  price: number; // -1 = скоро
}

/** Ціни з аудиту економіки (етап 2): без лутбоксів, таймерів і справжніх грошей. */
const TABS: { name: string; items: Item[] }[] = [
  {
    name: "Техніка",
    items: [
      { id: "laptop", name: "Старий ноутбук", price: 0 },
      { id: "pc", name: "Робочий ПК", price: 800 },
      { id: "gamingPc", name: "Потужний ПК", price: 1500 },
      { id: "twoMonitors", name: "Два монітори", price: 2500 },
      { id: "holoDesk", name: "Голо-стіл", price: 3000 },
      { id: "server", name: "Сервер", price: 7500 },
    ],
  },
  {
    name: "Улюбленці",
    items: [
      { id: "fish", name: "Рибка", price: 300 },
      { id: "snail", name: "Равлик", price: 600 },
      { id: "crab", name: "Краб", price: 900 },
      { id: "turtle", name: "Черепашка", price: 1500 },
      { id: "jelly", name: "Медуза", price: 2000 },
      { id: "octopus", name: "Восьминіг", price: -1 },
    ],
  },
  {
    name: "Меблі",
    items: [
      { id: "mattress", name: "Матрац", price: 0 },
      { id: "bed", name: "Ліжко", price: 700 },
      { id: "designerBed", name: "Дизайнерське ліжко", price: 2200 },
    ],
  },
];

/** id → назва, щоб кімната показувала куплене. */
export const ITEM_NAMES: Record<string, string> = Object.fromEntries(TABS.flatMap((t) => t.items.map((i) => [i.id, i.name])));

export function ShopScreen({ onBack, initialTab = 0 }: { onBack: () => void; initialTab?: number }) {
  const reduce = useReducedMotion();
  const bits = useArcadeStore((s) => s.bits);
  const owned = useArcadeStore((s) => s.ownedItems);
  const buyItem = useArcadeStore((s) => s.buyItem);
  const [tab, setTab] = useState(initialTab);
  const [sel, setSel] = useState(1);
  const [bought, setBought] = useState<string | null>(null);

  const items = TABS[tab].items;
  const item = items[Math.min(sel, items.length - 1)];
  const has = owned.includes(item.id) || item.price === 0;
  const short = item.price - bits;

  let label = `Купити за ${fmt(item.price)} біт`;
  let disabled = false;
  if (item.price < 0) {
    label = "Скоро";
    disabled = true;
  } else if (has) {
    label = "✓ Уже в кімнаті";
    disabled = true;
  } else if (short > 0) {
    label = `Бракує ${fmt(short)} біт`;
    disabled = true;
  }

  return (
    <div className="absolute inset-0">
      <SquareButton label="Назад" onClick={onBack}>
        <BackChevron />
      </SquareButton>
      <h1 className="absolute left-[72px] top-[22px] m-0 text-[20px] font-bold">Магазин</h1>
      <At r={12} y={16}>
        <BitsChip />
      </At>
      <div role="tablist" aria-label="Розділи магазину" className="absolute left-5 right-5 top-[74px] grid h-11 grid-cols-3 gap-1 rounded-xl border p-1" style={{ background: C.card, borderColor: C.line }}>
        {TABS.map((t, i) => (
          <button
            key={t.name}
            type="button"
            role="tab"
            aria-selected={tab === i}
            onClick={() => {
              sfx("tap");
              setTab(i);
              setSel(1);
            }}
            className="h-[34px] rounded-lg text-[14px] font-semibold outline-none"
            style={tab === i ? { background: "var(--acc)", color: "var(--acc-on)" } : { color: C.text }}
          >
            {t.name}
          </button>
        ))}
      </div>
      <span className="absolute left-5 top-[126px] text-[13px]" style={{ color: C.muted }}>
        Ціни в бітах. Без випадкових скринь і таймерів.
      </span>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          className="absolute left-5 right-5 top-[150px] grid grid-cols-2 gap-3"
          initial={reduce ? false : { opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.15 }}
        >
          {items.map((it, i) => {
            const on = i === sel;
            const mine = owned.includes(it.id) || it.price === 0;
            return (
              <button
                key={it.id}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  sfx("tap");
                  setSel(i);
                }}
                className="arc-card flex min-h-[136px] flex-col gap-1.5 rounded-[14px] p-2 text-left outline-none"
                style={{ border: on ? "2px solid var(--acc)" : `1px solid ${C.line}`, background: on ? "var(--acc-soft)" : C.card }}
              >
                <motion.span
                  className="flex h-16 items-center justify-center rounded-[10px]"
                  style={{ background: C.bg }}
                  animate={bought === it.id && !reduce ? { scale: loop([1, 1.15, 1]) } : undefined}
                >
                  <Art name={`item_${it.id}`} />
                </motion.span>
                <b className="text-[14px]">{it.name}</b>
                <span className="text-[13px]">
                  {mine ? (
                    <span className="font-semibold" style={{ color: C.success }}>
                      ✓ є в кімнаті
                    </span>
                  ) : it.price < 0 ? (
                    <span style={{ color: C.muted }}>скоро · без таймера</span>
                  ) : (
                    <span style={{ fontFamily: FONT_MONO }}>
                      {fmt(it.price)} <span style={{ color: C.muted }}>біт</span>
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </motion.div>
      </AnimatePresence>

      <span className="absolute left-5 right-5 top-[604px] text-[13px]" style={{ color: C.muted }}>
        Кольори аксолотля — у Профілі.
      </span>
      <Cta
        y={676}
        disabled={disabled}
        onClick={() => {
          if (buyItem(item.id, item.price) === "ok") {
            sfx("right");
            haptic(14);
            setBought(item.id);
          }
        }}
      >
        {label}
      </Cta>
    </div>
  );
}

/** Профіль: колір героя = колір інтерфейсу, прозорі правила нагород. */
export function ProfileScreen({ onBack, onRules, onWave }: { onBack: () => void; onRules: () => void; onWave: () => void }) {
  const xp = useArcadeStore((s) => s.xp);
  const bits = useArcadeStore((s) => s.bits);
  const hero = useArcadeStore((s) => s.hero);
  const owned = useArcadeStore((s) => s.ownedHeroes);
  const setHero = useArcadeStore((s) => s.setHero);
  const buyHero = useArcadeStore((s) => s.buyHero);
  const playedDays = useArcadeStore((s) => s.playedDays);
  const [pending, setPending] = useState<HeroColorId | null>(null);
  const rank = rankFor(xp);
  const nxt = nextRank(xp);
  const wk = weekKey();
  const days = Math.min(REWARD_RULES.waveGoalDays, playedDays.filter((d) => weekKey(d) === wk).length);

  const pend = pending ? HERO_THEMES[pending] : null;
  const pendRankLocked = !!pend?.rankOnly && rank.id !== pend.rankOnly;
  const pendShort = pend ? pend.price - bits : 0;

  return (
    <div className="absolute inset-0">
      <SquareButton label="Назад" onClick={onBack}>
        <BackChevron />
      </SquareButton>
      <h1 className="absolute left-[72px] top-[22px] m-0 text-[20px] font-bold">Профіль</h1>
      <At r={12} y={16}>
        <BitsChip />
      </At>

      <At x={20} r={20} y={80} className="flex items-center gap-4 rounded-2xl border p-4" style={{ background: C.card, borderColor: C.line }}>
        <span className="flex h-[96px] w-[80px] items-end justify-center rounded-xl" style={{ background: "#0B1D22" }}>
          <AxoAvatar hoodie={HERO_THEMES[pending ?? hero].acc} px={3.6} title="Твій аксолотль" />
        </span>
        <span className="flex flex-col gap-1">
          <b className="text-[16px]">@lynn_dev</b>
          <b className="w-fit rounded-lg px-2 py-0.5 text-[15px]" style={{ fontFamily: FONT_PIXEL, background: "var(--acc-soft)", border: "1px solid var(--acc)", color: "var(--acc-ring)" }}>
            {rank.label}
          </b>
          <span className="text-[13px]" style={{ color: C.muted }}>
            профіль бачать лише друзі
          </span>
        </span>
      </At>

      <At x={20} r={20} y={210} className="grid grid-cols-3 gap-2 text-center">
        {[
          [`${fmt(xp)}`, "XP"],
          [`${fmt(bits)}`, "біт"],
          [`${days} / ${REWARD_RULES.waveGoalDays}`, "Хвиля"],
        ].map(([v, l], i) => (
          <button
            key={l}
            type="button"
            onClick={i === 2 ? onWave : undefined}
            className="flex flex-col rounded-xl border py-2.5 outline-none"
            style={{ borderColor: C.line, background: C.card, cursor: i === 2 ? "pointer" : "default" }}
          >
            <b className="text-[17px]" style={{ fontFamily: FONT_MONO }}>
              {v}
            </b>
            <span className="text-[12px]" style={{ color: C.muted }}>
              {l}
            </span>
          </button>
        ))}
      </At>
      {nxt && (
        <span className="absolute left-5 right-5 top-[284px] text-[13px]" style={{ color: C.muted }}>
          До рангу {nxt.label}: ще {fmt(nxt.xp - xp)} XP
        </span>
      )}

      <span className="absolute left-5 top-[318px] text-[12px]" style={{ fontFamily: FONT_MONO, color: C.muted }}>
        КОЛІР ГЕРОЯ
      </span>
      <div className="absolute left-5 right-5 top-[340px] grid grid-cols-2 gap-2.5">
        {HERO_ORDER.map((id) => {
          const t = HERO_THEMES[id];
          const mine = owned.includes(id);
          const active = hero === id;
          const chosen = pending === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                sfx("tap");
                if (mine) {
                  setHero(id);
                  setPending(null);
                } else setPending(id);
              }}
              className="arc-card flex h-[64px] items-center gap-3 rounded-[14px] px-3 text-left outline-none"
              style={{ border: active || chosen ? `2px solid ${t.acc}` : `1px solid ${C.line}`, background: C.card }}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: t.acc, color: t.on }}>
                {active ? <CheckIcon size={14} /> : !mine && t.rankOnly ? <LockIcon size={12} /> : null}
              </span>
              <span className="flex flex-col">
                <b className="text-[14px]">{t.label}</b>
                <span className="text-[12px]" style={{ fontFamily: FONT_MONO, color: mine ? C.muted : C.bits }}>
                  {active ? "обрано" : mine ? "твій · безкоштовно" : t.rankOnly ? `ранг ${rankById(t.rankOnly).label}` : `${t.price} біт`}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="absolute left-5 right-5 top-[494px] m-0 text-[13px] leading-[1.45]" style={{ color: C.muted }}>
        {pend
          ? pendRankLocked
            ? `«${pend.label}» не купується — він відкривається рангом ${rankById(pend.rankOnly!).label} (${fmt(rankById(pend.rankOnly!).xp)} XP).`
            : pendShort > 0
            ? `«${pend.label}» коштує ${pend.price} біт. Бракує ${pendShort} — це кілька ігор.`
            : `Колір змінює героя, кнопки й прогрес. Купуєш один раз — він твій назавжди.`
          : "Колір змінює героя, кнопки й прогрес. Купуєш один раз — і він твій назавжди. Перемикатися між своїми — безкоштовно."}
      </p>

      <button
        type="button"
        onClick={() => {
          sfx("tap");
          onRules();
        }}
        className="arc-secondary absolute left-[88px] top-[588px] h-12 w-[214px] rounded-[14px] border text-[15px] font-semibold outline-none"
        style={{ borderColor: C.line, background: C.card, color: C.text }}
      >
        Як працюють нагороди
      </button>

      {pend && !pendRankLocked && (
        <Cta
          disabled={pendShort > 0}
          onClick={() => {
            if (buyHero(pend.id) === "ok") {
              sfx("right");
              haptic(14);
              setPending(null);
            }
          }}
        >
          {pendShort > 0 ? `Бракує ${pendShort} біт` : `Взяти за ${pend.price} біт`}
        </Cta>
      )}
    </div>
  );
}
