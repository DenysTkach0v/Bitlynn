"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MotionValue, useMotionValueEvent } from "framer-motion";
import { ART } from "./art.generated";
import { ANATOMY } from "./idleConfig";
import { HERO_ANIM } from "./heroAnim";

export type HeroFrame = "idle" | "stepA" | "stepB";

const W = 18;
const H = 16;
/** Feet on the bottom row of the sprite (left foot, right foot). */
const FEET = { left: [5, 6], right: [11, 12], row: 15 };

/** The canvas hero sprite (18×16) as a colour grid, parsed once per theme. */
const gridCache: Record<string, (string | null)[][]> = {};
function gridFor(theme: string) {
  if (gridCache[theme]) return gridCache[theme];
  const svg = ART[`hero1_${theme}`] ?? ART.hero1_pink;
  const g: (string | null)[][] = Array.from({ length: H }, () => Array(W).fill(null));
  const re = /<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" fill="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg))) {
    const [x, y, w, h] = [m[1], m[2], m[3], m[4]].map(Number);
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (g[yy]) g[yy][xx] = m[5];
  }
  gridCache[theme] = g;
  return g;
}

/**
 * The hero drawn from his own pixels, so frames can change single pixels:
 * walk frames lift one foot, blinking closes the eyes. Same 54×48 size as the
 * canvas sprite (×3).
 */
export function HeroSprite({ theme, frame, autoBlink = true }: { theme: string; frame: MotionValue<HeroFrame>; autoBlink?: boolean }) {
  const [f, setF] = useState<HeroFrame>(frame.get());
  const [blink, setBlink] = useState(false);
  useMotionValueEvent(frame, "change", (v) => setF(v));

  // natural blinking while idle
  useEffect(() => {
    if (!autoBlink || !HERO_ANIM.blink.enabled) return;
    const b = HERO_ANIM.blink;
    let t: ReturnType<typeof setTimeout>;
    const once = (then: () => void) => {
      setBlink(true);
      t = setTimeout(() => {
        setBlink(false);
        then();
      }, b.closedMs);
    };
    const loop = () => {
      t = setTimeout(() => {
        once(() => {
          if (Math.random() < b.doubleChance) t = setTimeout(() => once(loop), b.closedMs * 1.6);
          else loop();
        });
      }, b.minGapMs + Math.random() * (b.maxGapMs - b.minGapMs));
    };
    loop();
    return () => clearTimeout(t);
  }, [autoBlink]);

  const rects = useMemo(() => {
    const g = gridFor(theme).map((r) => [...r]);
    if (HERO_ANIM.walk.stepFrames && f !== "idle") {
      const lifted = f === "stepA" ? FEET.left : FEET.right;
      for (const x of lifted) g[FEET.row][x] = null;
    }
    if (blink) {
      const skin = g[ANATOMY.eyes[0].y - 1][ANATOMY.eyes[0].x];
      for (const e of ANATOMY.eyes) g[e.y][e.x] = skin;
    }
    const out: { x: number; y: number; w: number; c: string }[] = [];
    g.forEach((row, y) => {
      let x = 0;
      while (x < W) {
        const c = row[x];
        if (!c) {
          x++;
          continue;
        }
        let w = 1;
        while (x + w < W && row[x + w] === c) w++;
        out.push({ x, y, w, c });
        x += w;
      }
    });
    return out;
  }, [theme, f, blink]);

  return (
    <svg width={W * 3} height={H * 3} viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" aria-hidden="true" style={{ display: "block", imageRendering: "pixelated" }}>
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
      ))}
    </svg>
  );
}
