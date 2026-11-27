"use client";

import React, { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { C, REWARD_RULES } from "@/components/arcade/tokens";
import { useArcadeStore, weekKey } from "@/components/arcade/useArcadeStore";
import { FONT_MONO } from "@/components/arcade/ui";
import { sfx } from "@/components/arcade/arcadeAudio";
import { Art, At, BackChevron, BitsChip, Cta, SquareButton } from "./kit";

/** «За столом» — вид зі спини. Кнопка вмикає ПК з короткою анімацією завантаження BitOS. */
export function DeskScreen({ onBack, onBooted }: { onBack: () => void; onBooted: () => void }) {
  const reduce = useReducedMotion();
  const hero = useArcadeStore((s) => s.hero);
  const playedDays = useArcadeStore((s) => s.playedDays);
  const wk = weekKey();
  const days = Math.min(REWARD_RULES.waveGoalDays, playedDays.filter((d) => weekKey(d) === wk).length);
  const [booting, setBooting] = useState(false);

  const boot = () => {
    if (booting) return;
    setBooting(true);
    sfx("wave");
    setTimeout(onBooted, reduce ? 150 : 1300);
  };

  return (
    <div className="absolute inset-0">
      <SquareButton label="Назад у кімнату" onClick={onBack}>
        <BackChevron />
      </SquareButton>
      <At r={12} y={16}>
        <BitsChip />
      </At>

      <At x={0} y={64} w={390} h={390}>
        <Art name="desk" />
        <div className="absolute" style={{ left: 168, top: 235 - 64 }}>
          <motion.div animate={booting && !reduce ? { y: [0, -2, 0] } : undefined} transition={{ duration: 0.3, repeat: 3 }}>
            <Art name={`heroDesk_${hero}`} />
          </motion.div>
        </div>
        {/* monitor glow when the PC boots */}
        <AnimatePresence>
          {booting && (
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(ellipse 46% 30% at 50% 34%, var(--acc) 0%, transparent 70%)", mixBlendMode: "screen" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: reduce ? 0.35 : [0, 0.55, 0.3, 0.5] }}
              transition={{ duration: 1.1 }}
            />
          )}
        </AnimatePresence>
      </At>

      <h2 className="absolute left-5 top-[470px] m-0 text-[26px] font-bold">За столом</h2>
      <p className="absolute left-5 right-5 top-[508px] m-0 text-[15px] leading-[1.45]" style={{ color: C.muted }}>
        Комп’ютер — твій центр: уроки, аркади, квести і команда.
      </p>
      <At x={20} r={20} y={566} className="flex items-center gap-3.5 rounded-xl border px-3.5 py-3" style={{ background: C.card, borderColor: C.line }}>
        <Art name="wave" />
        <div className="flex flex-col gap-0.5">
          <b className="text-[14px]">
            Хвиля тижня: {days} з {REWARD_RULES.waveGoalDays} днів
          </b>
          <span className="text-[13px]" style={{ color: C.muted }}>
            Пропустиш — нічого не згорить.
          </span>
        </div>
      </At>

      <Cta onClick={boot} disabled={booting}>
        {booting ? (
          <span className="flex items-center gap-2" style={{ fontFamily: FONT_MONO }}>
            BitOS
            <motion.span animate={reduce ? undefined : { opacity: [0.2, 1, 0.2] }} transition={{ duration: 0.8, repeat: Infinity }}>
              ···
            </motion.span>
          </span>
        ) : (
          "Увімкнути ПК"
        )}
      </Cta>
    </div>
  );
}
