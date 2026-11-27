"use client";

import React from "react";
import { MotionValue, motion, useTransform } from "framer-motion";

/**
 * Pixel office chair with a gas lift, drawn in the room's style (×3 pixels,
 * three tones, coloured outline). Three parts so the lift can really extend:
 *
 *        ┌──────────┐  top  — back + seat (+ lever on the right)
 *        └──┬────┬──┘
 *           │post│      post — grows by `lift` px when the lever is pressed
 *        ╶──┴────┴──╴  base — five-star base with wheels, stands on the floor
 *
 * The component is anchored at the floor: put it at y = floor and it draws upwards.
 */

export const CHAIR = {
  W: 42,
  BASE_H: 15,
  POST_W: 6,
  POST_MIN: 6,
  TOP_H: 36,
  /** seat surface, measured from the bottom of the top part */
  SEAT_FROM_TOP_BOTTOM: 9,
  /** how far the hero sinks into the cushion */
  SINK: 3,
};

/** Offset of the hero (from standing on the floor) when he sits on a chair lifted by `lift` px. */
export function sitOffset(lift: number) {
  return -(CHAIR.BASE_H + CHAIR.POST_MIN + CHAIR.SEAT_FROM_TOP_BOTTOM - CHAIR.SINK + lift);
}

const TOP = [
  "..eeeeeeeeee..",
  ".eLLLLLLLLLLe.",
  ".eLccccccccDe.",
  ".eLccccccccDe.",
  ".eLccccccccDe.",
  ".eLccccccccDe.",
  ".eLDDDDDDDDDe.",
  "..eeeeeeeeee..",
  ".....eMMe.....",
  "eeeeeeeeeeeeee",
  "eLccccccccccDe",
  "eDDDDDDDDDDDDe",
];

const BASE = [
  "......eMMe....",
  "..eeeeeeeeee..",
  ".eMMMMMMMMMMe.",
  ".ee..ee..ee...",
  ".kk..kk..kk...",
];

function Pixels({ rows, accent }: { rows: string[]; accent: string }) {
  const out: React.ReactNode[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === ".") {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < row.length && row[x + w] === ch) w++;
      const key = `${x}-${y}`;
      if (ch === "L" || ch === "D") {
        out.push(<rect key={`b${key}`} x={x} y={y} width={w} height={1} fill={accent} />);
        out.push(<rect key={key} x={x} y={y} width={w} height={1} fill={ch === "L" ? "#FFFFFF" : "#000000"} fillOpacity={ch === "L" ? 0.45 : 0.3} />);
      } else {
        const fill = ch === "e" ? "#1A1D2B" : ch === "M" ? "#5D6B8A" : ch === "k" ? "#2A2E3A" : accent;
        out.push(<rect key={key} x={x} y={y} width={w} height={1} fill={fill} />);
      }
      x += w;
    }
  });
  return <>{out}</>;
}

export function PixelChair({ accent, lift, lever }: { accent: string; lift: MotionValue<number>; lever: MotionValue<number> }) {
  const postH = useTransform(lift, (v) => CHAIR.POST_MIN + Math.max(0, v));
  const topBottom = useTransform(lift, (v) => CHAIR.BASE_H + CHAIR.POST_MIN + Math.max(0, v));
  return (
    <div className="relative" style={{ width: CHAIR.W, height: 0 }}>
      {/* base on the floor */}
      <svg
        className="absolute left-0"
        style={{ bottom: 0, imageRendering: "pixelated" }}
        width={CHAIR.W}
        height={CHAIR.BASE_H}
        viewBox="0 0 14 5"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <Pixels rows={BASE} accent={accent} />
      </svg>
      {/* gas-lift post */}
      <motion.div
        className="absolute"
        style={{
          left: (CHAIR.W - CHAIR.POST_W) / 2,
          bottom: CHAIR.BASE_H,
          width: CHAIR.POST_W,
          height: postH,
          background: "linear-gradient(90deg,#8A97B5 0 33%,#5D6B8A 33% 66%,#3E4A66 66%)",
          boxShadow: "0 0 0 1px #1A1D2B",
        }}
      />
      {/* back + seat + lever */}
      <motion.div className="absolute left-0" style={{ bottom: topBottom, width: CHAIR.W, height: CHAIR.TOP_H }}>
        <svg width={CHAIR.W} height={CHAIR.TOP_H} viewBox="0 0 14 12" shapeRendering="crispEdges" aria-hidden="true" style={{ display: "block", imageRendering: "pixelated" }}>
          <Pixels rows={TOP} accent={accent} />
        </svg>
        {/* the lever under the seat on the right */}
        <motion.span
          className="absolute block"
          style={{ right: -7, bottom: 2, width: 9, height: 3, background: "#5D6B8A", boxShadow: "0 0 0 1px #1A1D2B", originX: 0, rotate: lever }}
        />
      </motion.div>
    </div>
  );
}
