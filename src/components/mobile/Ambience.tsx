"use client";

import React, { useMemo } from "react";
import { AMBIENCE, BUBBLES, LAMP_GLOW, WindowShape } from "./ambienceConfig";

/** Deterministic pseudo-random, so bubbles do not jump around between renders. */
function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function windowBox(w: WindowShape) {
  return w.shape === "circle"
    ? { left: w.cx - w.r, top: w.cy - w.r, width: w.r * 2, height: w.r * 2, clip: "circle(50% at 50% 50%)" }
    : { left: w.x, top: w.y, width: w.w, height: w.h, clip: "none" };
}

/**
 * Background life of a room: bubbles rising behind the windows and a softly
 * breathing lamp light. Pure CSS animation (cheap), drawn over the room art.
 */
export function Ambience({ room, still }: { room: number; still?: boolean }) {
  const cfg = AMBIENCE[room];
  const bubbles = useMemo(
    () =>
      cfg.windows.map((w, wi) => {
        const box = windowBox(w);
        return Array.from({ length: cfg.bubbles }, (_, i) => {
          const seed = room * 100 + wi * 10 + i;
          const size = BUBBLES.sizes[Math.floor(rand(seed) * BUBBLES.sizes.length)];
          const dur = BUBBLES.riseSecMin + rand(seed + 1) * (BUBBLES.riseSecMax - BUBBLES.riseSecMin);
          return {
            left: Math.round((rand(seed + 2) * (box.width - size)) / 3) * 3,
            size,
            dur,
            delay: -rand(seed + 3) * dur, // already mid-way when the room opens
            wobble: (rand(seed + 4) > 0.5 ? 1 : -1) * BUBBLES.wobblePx,
          };
        });
      }),
    [cfg, room]
  );

  if (still) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {cfg.lamps.map((l, i) => (
        <span
          key={`lamp${i}`}
          className="bl-lamp absolute rounded-full"
          style={
            {
              left: l.x - l.r,
              top: l.y - l.r,
              width: l.r * 2,
              height: l.r * 2,
              background: `radial-gradient(circle, ${l.color} 0%, transparent 70%)`,
              mixBlendMode: "screen",
              ["--lamp-min" as string]: LAMP_GLOW.min,
              ["--lamp-max" as string]: LAMP_GLOW.max,
              animationDuration: `${LAMP_GLOW.periodSec}s`,
            } as React.CSSProperties
          }
        />
      ))}
      {cfg.windows.map((w, wi) => {
        const box = windowBox(w);
        return (
          <div
            key={`win${wi}`}
            className="absolute overflow-hidden"
            style={{ left: box.left, top: box.top, width: box.width, height: box.height, clipPath: box.clip }}
          >
            {bubbles[wi].map((b, i) => (
              <span
                key={i}
                className="bl-bubble absolute"
                style={
                  {
                    left: b.left,
                    bottom: -b.size,
                    width: b.size,
                    height: b.size,
                    background: BUBBLES.color,
                    opacity: BUBBLES.opacity,
                    boxShadow: b.size > 3 ? "inset -3px -3px 0 rgba(15,61,102,.45)" : undefined,
                    animationDuration: `${b.dur}s`,
                    animationDelay: `${b.delay}s`,
                    ["--rise" as string]: `-${box.height + b.size * 2}px`,
                    ["--wobble" as string]: `${b.wobble}px`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
