"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { C } from "../tokens";
import { CATCH_CATEGORIES, CatchCategory } from "../questions";
import { sfx, haptic } from "../arcadeAudio";
import { AxoAvatar, CheckIcon, FONT_MONO, FONT_UI, RetryIcon } from "../ui";
import type { GameProps } from "./types";

const SLOTS = 9;
const NEED = 3; // правильних «уловів» на раунд
const UP_MS = 2300;
const SPAWN_MS = 820;

interface Pop {
  id: number;
  slot: number;
  word: string;
  right: boolean;
  why?: string;
  state: "up" | "caught" | "hiding";
}

/**
 * «Лови» (колишні «Кроти»). Угорі — група, яку ловимо. Торкнись аксолотля з
 * правильним словом. Хибний тап — він просто ховається й підказує, чому.
 * Раунд «з першої спроби» = без жодного хибного тапу.
 */
export function CatchGame({ paused, accent, stepsDone, stepsLeft, onStep }: GameProps) {
  const reduce = useReducedMotion();
  const total = stepsDone + stepsLeft;
  const cats = useMemo<CatchCategory[]>(
    () => [...CATCH_CATEGORIES].sort(() => Math.random() - 0.5).slice(0, total),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const cat = cats[Math.min(stepsDone, cats.length - 1)];

  const [pops, setPops] = useState<Pop[]>([]);
  const popsRef = useRef<Pop[]>([]);
  // side-effect-free state updates (no work inside React updaters)
  const update = useCallback((fn: (cur: Pop[]) => Pop[]) => {
    popsRef.current = fn(popsRef.current);
    setPops(popsRef.current);
  }, []);
  const [caught, setCaught] = useState(0);
  const [note, setNote] = useState<{ text: string; key: number } | null>(null);
  const [roundDone, setRoundDone] = useState(false);
  const clean = useRef(true);
  const firstMiss = useRef<{ word: string; why: string } | null>(null);
  const idRef = useRef(1);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const rightStreak = useRef(0);
  const caughtRef = useRef(0);

  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current.clear();
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  // new round → reset
  useEffect(() => {
    setCaught(0);
    caughtRef.current = 0;
    setRoundDone(false);
    update(() => []);
    setNote(null);
    clean.current = true;
    firstMiss.current = null;
  }, [stepsDone, update]);

  // pausing makes everyone dive; nothing is lost
  useEffect(() => {
    if (paused) {
      clearTimers();
      update(() => []);
    }
  }, [paused, clearTimers, update]);

  // spawner
  useEffect(() => {
    if (paused || roundDone || !cat) return;
    const iv = setInterval(() => {
      update((cur) => {
        const live = cur.filter((p) => p.state === "up");
        if (live.length >= 2) return cur;
        const used = new Set(cur.map((p) => p.slot));
        const free = Array.from({ length: SLOTS }, (_, i) => i).filter((i) => !used.has(i));
        if (!free.length) return cur;
        const slot = free[Math.floor(Math.random() * free.length)];
        // keep it fair: never more than two wrong ones in a row
        const right = rightStreak.current <= -2 ? true : Math.random() < 0.55;
        rightStreak.current = right ? Math.max(1, rightStreak.current + 1) : Math.min(-1, rightStreak.current - 1);
        const onField = new Set(cur.map((p) => p.word));
        let word: string;
        let why: string | undefined;
        if (right) {
          const pool = cat.right.filter((w) => !onField.has(w));
          word = pool[Math.floor(Math.random() * pool.length)] ?? cat.right[0];
        } else {
          const pool = cat.wrong.filter((w) => !onField.has(w.word));
          const w = pool[Math.floor(Math.random() * pool.length)] ?? cat.wrong[0];
          word = w.word;
          why = w.why;
        }
        const id = idRef.current++;
        later(() => {
          update((c2) => c2.map((p) => (p.id === id && p.state === "up" ? { ...p, state: "hiding" } : p)));
          later(() => update((c3) => c3.filter((p) => p.id !== id)), 260);
        }, UP_MS);
        return [...cur, { id, slot, word, right, why, state: "up" }];
      });
    }, SPAWN_MS);
    return () => clearInterval(iv);
  }, [paused, roundDone, cat, later, update]);

  const tap = (pop: Pop) => {
    if (pop.state !== "up" || paused || roundDone || caughtRef.current >= NEED) return;
    if (pop.right) {
      sfx("catch");
      haptic(10);
      update((c) => c.map((p) => (p.id === pop.id ? { ...p, state: "caught" } : p)));
      later(() => update((c) => c.filter((p) => p.id !== pop.id)), 520);
      const next = caughtRef.current + 1;
      caughtRef.current = next;
      setCaught(next);
      if (next >= NEED) {
        setRoundDone(true);
        clearTimers();
        later(() => {
          const miss = firstMiss.current;
          onStep({
            firstTry: clean.current,
            questionText: miss ? `${cat.title}: чи підходить «${miss.word}»?` : undefined,
            answerText: miss ? `Ні — ${miss.why}` : undefined,
          });
        }, 1100);
      }
    } else {
      sfx("hide");
      clean.current = false;
      if (!firstMiss.current && pop.why) firstMiss.current = { word: pop.word, why: pop.why };
      update((c) => c.map((p) => (p.id === pop.id ? { ...p, state: "hiding" } : p)));
      later(() => update((c) => c.filter((p) => p.id !== pop.id)), 260);
      setNote({ text: pop.why ? `${pop.why[0].toUpperCase()}${pop.why.slice(1)}.` : `«${pop.word}» — не з цієї групи.`, key: Date.now() });
    }
  };

  if (!cat) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 pt-3" style={{ fontFamily: FONT_UI }}>
      <div className="flex shrink-0 items-end justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[13px]" style={{ color: C.muted }}>
            Лови тільки
          </span>
          <AnimatePresence mode="wait">
            <motion.b
              key={cat.id}
              className="text-[20px] leading-[26px]"
              style={{ color: C.text }}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              {cat.title}
            </motion.b>
          </AnimatePresence>
        </div>
        <div className="flex gap-1.5" aria-label={`Спіймано ${caught} з ${NEED}`}>
          {Array.from({ length: NEED }, (_, i) => (
            <motion.span
              key={i}
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: i < caught ? "var(--acc)" : C.line, color: "var(--acc-on)" }}
              animate={i < caught && !reduce ? { scale: [1.3, 1] } : { scale: 1 }}
            >
              {i < caught && <CheckIcon size={14} />}
            </motion.span>
          ))}
        </div>
      </div>

      <div className="relative mt-4 grid min-h-0 flex-1 grid-cols-3 content-start gap-3 touch-manipulation select-none" style={{ maxHeight: 400 }}>
        {Array.from({ length: SLOTS }, (_, slot) => {
          const pop = pops.find((p) => p.slot === slot);
          return (
            <button
              key={slot}
              type="button"
              disabled={!pop || pop.state !== "up"}
              aria-label={pop ? `Лови: ${pop.word}` : "Порожня нора"}
              onClick={() => pop && tap(pop)}
              className="arc-card relative h-[112px] overflow-hidden rounded-2xl outline-none"
              style={{ background: "#0B1D22", border: `1px solid ${C.line}` }}
            >
              {/* burrow */}
              <span aria-hidden="true" className="absolute bottom-2 left-1/2 h-4 w-[72%] -translate-x-1/2 rounded-[50%]" style={{ background: "#101820" }} />
              <AnimatePresence>
                {pop && (
                  <motion.span
                    key={pop.id}
                    className="absolute inset-x-0 bottom-3 flex flex-col items-center"
                    initial={reduce ? { opacity: 0 } : { y: 80 }}
                    animate={
                      pop.state === "caught"
                        ? reduce
                          ? { opacity: 1 }
                          : { y: -14, scale: 1.08 }
                        : pop.state === "hiding"
                        ? reduce
                          ? { opacity: 0 }
                          : { y: 90 }
                        : reduce
                        ? { opacity: 1 }
                        : { y: 0 }
                    }
                    exit={reduce ? { opacity: 0 } : { y: 90 }}
                    transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  >
                    <span
                      className="mb-1 max-w-[100px] truncate rounded-lg px-2 py-1 text-[13px] font-bold"
                      style={{
                        background: pop.state === "caught" ? C.success : C.text,
                        color: C.bg,
                        fontFamily: pop.word.startsWith(".") ? FONT_MONO : FONT_UI,
                      }}
                    >
                      {pop.word}
                    </span>
                    <AxoAvatar hoodie={accent} px={2.6} eyes={pop.state === "caught" ? "blink" : "normal"} />
                  </motion.span>
                )}
              </AnimatePresence>
              {pop?.state === "caught" && !reduce && (
                <motion.span
                  aria-hidden="true"
                  className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md"
                  style={{ background: C.success, color: C.bg }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <CheckIcon size={13} />
                </motion.span>
              )}
            </button>
          );
        })}

        <AnimatePresence>
          {roundDone && (
            <motion.div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="flex items-center gap-2 rounded-2xl px-5 py-3 text-[18px] font-bold"
                style={{ background: C.card, border: `2px solid ${clean.current ? C.success : C.almost}`, color: C.text }}
                initial={reduce ? false : { scale: 0.8 }}
                animate={{ scale: 1 }}
              >
                <span style={{ color: clean.current ? C.success : C.almost }}>{clean.current ? <CheckIcon size={18} /> : <RetryIcon size={18} />}</span>
                {clean.current ? "Раунд без промахів!" : "Раунд пройдено"}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div aria-live="polite" className="mt-3 flex min-h-[48px] shrink-0 items-start justify-center text-center text-[14px] leading-[21px]">
        <AnimatePresence mode="wait">
          {note ? (
            <motion.span
              key={note.key}
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onAnimationComplete={() => later(() => setNote((n) => (n?.key === note.key ? null : n)), 1900)}
              className="rounded-xl px-3 py-2"
              style={{ background: C.almostSoft, color: C.text }}
            >
              <b style={{ color: C.almost }}>Майже!</b> {note.text}
            </motion.span>
          ) : (
            <motion.span key="hint" style={{ color: C.muted }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              Торкнись аксолотля з правильним словом.
              <br />
              Хибний тап — він просто ховається.
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
