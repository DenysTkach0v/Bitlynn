"use client";

import React, { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface ConfettiBurstProps {
  /** Increment this number to fire a new burst. 0 = nothing rendered. */
  trigger: number;
  colors?: string[];
  /** Optional emoji mixed in with the neon shards (e.g. the equipped VFX emoji). */
  emoji?: string;
  count?: number;
}

/** Small deterministic PRNG so particle layouts are stable per trigger value. */
function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Neon confetti / shard explosion rendered over its relatively positioned parent.
 * Purely decorative: pointer-events are disabled.
 */
export const ConfettiBurst: React.FC<ConfettiBurstProps> = ({
  trigger,
  colors = ["#00F2FE", "#FF6AD5", "#38EF7D", "#FFB800"],
  emoji,
  count = 36,
}) => {
  const particles = useMemo(() => {
    const rnd = seeded(trigger * 9973 + 17);
    return Array.from({ length: count }).map((_, i) => {
      const angle = rnd() * Math.PI * 2;
      const distance = 90 + rnd() * 190;
      return {
        id: `${trigger}-${i}`,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 60,
        rotate: rnd() * 540 - 270,
        size: 6 + rnd() * 8,
        color: colors[i % colors.length],
        isEmoji: Boolean(emoji) && i % 6 === 0,
        shape: i % 3,
        delay: rnd() * 0.12,
      };
    });
  }, [trigger, colors, emoji, count]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-visible"
    >
      <AnimatePresence>
        {trigger > 0 &&
          particles.map((p) => (
            <motion.span
              key={p.id}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
              animate={{
                x: p.x,
                y: [0, p.y, p.y + 140],
                opacity: [1, 1, 0],
                scale: 1,
                rotate: p.rotate,
              }}
              transition={{ duration: 1.5, delay: p.delay, ease: "easeOut" }}
              className="absolute"
              style={
                p.isEmoji
                  ? { fontSize: p.size + 10 }
                  : {
                      width: p.size,
                      height: p.shape === 0 ? p.size : p.size * 0.45,
                      backgroundColor: p.color,
                      borderRadius: p.shape === 2 ? "9999px" : "2px",
                      boxShadow: `0 0 10px ${p.color}`,
                    }
              }
            >
              {p.isEmoji ? emoji : null}
            </motion.span>
          ))}
      </AnimatePresence>
    </div>
  );
};
