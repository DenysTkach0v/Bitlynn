"use client";

import React, { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { buildAxoPalette, getAxoGrid, gridToRects } from "@/components/arcade/axolotlSprite";
import { tones } from "@/components/arcade/games/pixel";
import { Bed, SLEEP } from "./sitScene";
import { ROOM_MOTION } from "./roomMotion";

/**
 * The hero asleep in bed: body lies flat under a blanket, only the head rests
 * on the pillow. The blanket «breathes». Eyes: closed / open (for the sleepy blink).
 */

/** Blanket height profile (rows from the top that are still empty), 38 columns ×3 px. */
const PROFILE = [
  3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 3, 3, 3, 4, 5,
];
const ROWS = 9;

function Blanket({ accent }: { accent: string }) {
  const t = tones(accent);
  const rects: React.ReactNode[] = [];
  PROFILE.forEach((top, x) => {
    for (let y = top; y < ROWS; y++) {
      let fill = t.base;
      if (y === top) fill = t.edge; // outline
      else if (y === top + 1) fill = t.light; // lit from above
      else if (y >= ROWS - 2) fill = t.dark; // shadow where it tucks in
      else if (x % 7 === 3) fill = t.dark; // stitched stripes
      if (x <= 1 && y > top) fill = "#ECEEF4"; // folded white edge at the neck
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />);
    }
  });
  return (
    <svg width={PROFILE.length * 3} height={ROWS * 3} viewBox={`0 0 ${PROFILE.length} ${ROWS}`} shapeRendering="crispEdges" style={{ display: "block", imageRendering: "pixelated" }}>
      {rects}
    </svg>
  );
}

function Head({ eyes }: { eyes: "open" | "closed" }) {
  const rects = useMemo(() => gridToRects(getAxoGrid("idle", eyes === "open" ? "normal" : "blink").slice(0, 9), buildAxoPalette("#000000")), [eyes]);
  return (
    <svg width={48} height={27} viewBox="0 0 16 9" shapeRendering="crispEdges" style={{ display: "block", imageRendering: "pixelated" }}>
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}

export function Sleeper({ bed, accent, eyes, blanketOff }: { bed: Bed; accent: string; eyes: "open" | "closed"; blanketOff: boolean }) {
  const reducedPref = useReducedMotion();
  const reduce = ROOM_MOTION.respectReducedMotion && !!reducedPref;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute" style={{ left: bed.head.x, top: bed.head.y }}>
        <Head eyes={eyes} />
      </div>
      <motion.div
        className="absolute"
        style={{ left: bed.blanket.x, top: bed.blanket.y, transformOrigin: "50% 100%" }}
        animate={
          blanketOff
            ? { x: SLEEP.blanketOff.dx, y: SLEEP.blanketOff.dy, rotate: SLEEP.blanketOff.rotate, opacity: 0, scaleY: 1 }
            : reduce
            ? {}
            : { scaleY: [1, SLEEP.breathScale, 1] }
        }
        transition={
          blanketOff
            ? { duration: SLEEP.blanketOff.ms / 1000, ease: "easeIn" }
            : { duration: SLEEP.breathSec, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <Blanket accent={accent} />
      </motion.div>
    </div>
  );
}
