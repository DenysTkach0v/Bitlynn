"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { C } from "./tokens";
import { Question } from "./questions";
import { CheckIcon, FONT_MONO, FONT_UI, PrimaryButton, RetryIcon } from "./ui";
import { haptic, sfx } from "./arcadeAudio";

export interface SheetOutcome {
  firstTry: boolean;
}

/**
 * Шторка з питанням (спільний екран №2). Гра під нею на паузі.
 *
 * Стани картки: default → pressed (120 мс до перевірки) → correct | almost,
 * після правильної — решта disabled. Помилка = «Майже!» бурштиновим, підказка
 * одним реченням і ще одна спроба; нічого не забирається.
 */
export function QuestionSheetBody({
  question,
  index,
  total,
  reviewDaysAgo,
  onDone,
}: {
  question: Question;
  index: number;
  total: number;
  reviewDaysAgo?: number | null;
  onDone: (o: SheetOutcome) => void;
}) {
  const reduce = useReducedMotion();
  const [tried, setTried] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [pressed, setPressed] = useState<number | null>(null);
  const [shake, setShake] = useState<{ i: number; n: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef(false);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const short = question.options.every((o) => o.length <= 9);
  const letters = "ABCD";

  const pick = (i: number) => {
    if (solved || pressed !== null || tried.includes(i)) return;
    setPressed(i);
    sfx("tap");
    timer.current = setTimeout(() => {
      setPressed(null);
      if (i === question.correct) {
        setSolved(true);
        sfx("right");
        haptic(14);
      } else {
        setTried((t) => [...t, i]);
        setShake({ i, n: Date.now() });
        sfx("almost");
        haptic(6);
      }
    }, 120);
  };

  const almost = !solved && tried.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-4" style={{ fontFamily: FONT_UI }}>
      <span className="text-[12px] uppercase tracking-[0.06em]" style={{ fontFamily: FONT_MONO, color: reviewDaysAgo != null ? C.wave : C.muted }}>
        {reviewDaysAgo != null ? (
          <>↺ повторення · {reviewDaysAgo <= 0 ? "ти бачив це сьогодні" : `ти бачив це ${reviewDaysAgo} ${reviewDaysAgo === 1 ? "день" : reviewDaysAgo < 5 ? "дні" : "днів"} тому`}</>
        ) : (
          <>
            Питання {index + 1} / {total} · {question.tag}
          </>
        )}
      </span>

      <h2 className="mt-2 text-[18px] font-semibold leading-[25px]" style={{ color: C.text }}>
        {question.text}
      </h2>

      {question.code && (
        <pre
          className="mt-3 overflow-x-auto whitespace-pre rounded-xl border px-3.5 py-3 text-[14px] leading-[21px]"
          style={{ fontFamily: FONT_MONO, background: C.bg, borderColor: C.line, color: "#C6F6FF" }}
        >
          {question.code}
        </pre>
      )}

      <div className={`mt-4 ${short ? "grid grid-cols-2 gap-3" : "flex flex-col gap-2"}`}>
        {question.options.map((opt, i) => {
          const isRight = solved && i === question.correct;
          const isTried = tried.includes(i);
          const isPressed = pressed === i;
          const dim = solved && !isRight;
          let border = `1px solid ${C.line}`;
          let bg: string = C.bg;
          if (isPressed) {
            border = "2px solid var(--acc)";
            bg = "var(--acc-soft)";
          } else if (isRight) {
            border = `2px solid ${C.success}`;
            bg = C.successSoft;
          } else if (isTried) {
            border = `2px solid ${C.almost}`;
            bg = C.almostSoft;
          }
          const shaking = shake?.i === i;
          return (
            <motion.button
              key={`${question.id}-${i}`}
              type="button"
              disabled={solved || isTried}
              aria-label={`Відповідь ${letters[i]}: ${opt}${isRight ? " — вірно" : isTried ? " — вже пробував" : ""}`}
              onClick={() => pick(i)}
              animate={
                reduce
                  ? { opacity: dim ? 0.45 : 1 }
                  : shaking
                  ? { x: [0, -5, 5, -3, 3, 0], opacity: 1 }
                  : { x: 0, opacity: dim ? 0.45 : 1, scale: isPressed ? 0.98 : 1 }
              }
              transition={shaking ? { duration: 0.32 } : { duration: 0.12 }}
              onAnimationComplete={() => shaking && setShake(null)}
              className={`arc-card relative flex items-center gap-3 rounded-[14px] px-3.5 text-left outline-none ${
                short ? "min-h-[72px] justify-center text-[18px]" : "min-h-[52px] py-2.5 text-[16px]"
              } font-semibold disabled:cursor-default`}
              style={{ border, background: bg, color: C.text, fontFamily: short ? FONT_MONO : FONT_UI }}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[13px] ${short ? "absolute left-2.5 top-2.5 h-6 w-6" : ""}`}
                style={{
                  fontFamily: FONT_MONO,
                  background: isPressed ? "var(--acc)" : isRight ? C.success : isTried ? C.almost : C.line,
                  color: isPressed ? "var(--acc-on)" : isRight || isTried ? C.bg : C.text,
                }}
              >
                {isRight ? (
                  <motion.span initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 18 }}>
                    <CheckIcon size={14} />
                  </motion.span>
                ) : isTried ? (
                  <RetryIcon size={14} />
                ) : (
                  letters[i]
                )}
              </span>
              <span className={short ? "" : "min-w-0 flex-1"}>{opt}</span>
            </motion.button>
          );
        })}
      </div>

      <div aria-live="polite" className="mt-3 min-h-[64px]">
        <AnimatePresence mode="wait">
          {almost && (
            <motion.div
              key={`almost-${tried.length}`}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex gap-2.5 rounded-xl px-3.5 py-3 text-[14px] leading-[21px]"
              style={{ background: C.almostSoft, color: C.text }}
            >
              <span className="mt-0.5 shrink-0" style={{ color: C.almost }}>
                <RetryIcon size={16} />
              </span>
              <span>
                <b style={{ color: C.almost }}>Майже!</b> Спробуй ще раз. Підказка: {question.hint}
              </span>
            </motion.div>
          )}
          {solved && (
            <motion.div
              key="solved"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="flex gap-2.5 rounded-xl px-3.5 py-3 text-[14px] leading-[21px]"
              style={{ background: C.successSoft, color: C.text }}
            >
              <span className="mt-0.5 shrink-0" style={{ color: C.success }}>
                <CheckIcon size={16} />
              </span>
              <span>
                <b style={{ color: C.success }}>Вірно!</b> {question.explain}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* «Далі» — по центру, над нижнім буфером 64 px; кути вільні. */}
      <div className="mt-auto shrink-0 pt-3" style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>
        <div className="h-14">
          {solved && (
            <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, delay: 0.05 }}>
              <PrimaryButton
                autoFocus
                onClick={() => {
                  if (doneRef.current) return;
                  doneRef.current = true;
                  onDone({ firstTry: tried.length === 0 });
                }}
              >
                Далі
              </PrimaryButton>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
