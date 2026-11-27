"use client";

import React from "react";

/**
 * Pixel office chair (14×18 grid, ×3 = 42×54), drawn in the room's style:
 * three tones lit from the top-left and a coloured outline. The cushion
 * wears the hero colour.
 */
const ROWS = [
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
  "..eeeeeeeeee..",
  "......eMe.....",
  "......eMe.....",
  "..eeeeeMeeeee.",
  ".eMMMMMMMMMMe.",
  ".ee..ee..ee...",
];

export function PixelChair({ accent }: { accent: string }) {
  const pal: Record<string, string> = {
    e: "#1A1D2B", // outline
    L: "#ffffff", // highlight (tinted below)
    c: accent, // cushion
    D: "#00000055", // shade
    M: "#5D6B8A", // metal
  };
  const rects: React.ReactNode[] = [];
  ROWS.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === ".") {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < row.length && row[x + w] === ch) w++;
      rects.push(
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={w}
          height={1}
          fill={ch === "D" ? "#000000" : pal[ch]}
          fillOpacity={ch === "L" ? 0.45 : ch === "D" ? 0.3 : 1}
        />
      );
      // shade/highlight sit on top of the cushion colour
      if (ch === "L" || ch === "D") rects.unshift(<rect key={`b${x}-${y}`} x={x} y={y} width={w} height={1} fill={accent} />);
      x += w;
    }
  });
  return (
    <svg width={42} height={54} viewBox="0 0 14 18" shapeRendering="crispEdges" aria-hidden="true" style={{ display: "block", imageRendering: "pixelated" }}>
      {rects}
    </svg>
  );
}
