"use client";

import React from "react";
import { GameId } from "./tokens";
import { FIELD, tones } from "./games/pixel";
import { AxoAvatar } from "./ui";

/** Small static pixel previews for the start screen and the game list. */
export function GamePreview({ game, accent, size = 1 }: { game: GameId; accent: string; size?: number }) {
  const t = tones(accent);
  const W = 30;
  const H = 20;
  const px = 4 * size;

  if (game === "catch") {
    return (
      <div className="flex items-end justify-center gap-1" style={{ width: W * px, height: H * px }}>
        <AxoAvatar hoodie={accent} px={2.4 * size} />
        <AxoAvatar hoodie={accent} px={3.2 * size} eyes="blink" />
        <AxoAvatar hoodie={accent} px={2.4 * size} />
      </div>
    );
  }

  const rects: { x: number; y: number; w: number; h: number; c: string }[] = [];
  const block = (x: number, y: number, c: { light: string; base: string; dark: string; edge: string }, s = 3) => {
    rects.push({ x, y, w: s, h: s, c: c.edge });
    rects.push({ x: x + 0.5, y: y + 0.5, w: s - 1, h: s - 1, c: c.dark });
    rects.push({ x: x + 0.5, y: y + 0.5, w: s - 1.5, h: s - 1.5, c: c.base });
    rects.push({ x: x + 0.5, y: y + 0.5, w: s - 1.5, h: 0.5, c: c.light });
  };
  const cube = { light: FIELD.cubeLight, base: FIELD.cube, dark: FIELD.cubeDark, edge: FIELD.cubeEdge };

  if (game === "snake") {
    [
      [6, 11],
      [9, 11],
      [12, 11],
      [12, 8],
      [15, 8],
      [18, 8],
    ].forEach(([x, y]) => block(x, y, t));
    rects.push({ x: 18, y: 7.5, w: 0.5, h: 0.5, c: "#E0457B" }, { x: 20, y: 7.5, w: 0.5, h: 0.5, c: "#E0457B" });
    rects.push({ x: 20, y: 9, w: 0.5, h: 0.5, c: "#1A0B12" });
    block(23, 8, cube);
    rects.push({ x: 9, y: 4, w: 1, h: 1, c: FIELD.pearlShade }, { x: 24, y: 14, w: 1, h: 1, c: FIELD.pearlShade });
  } else if (game === "maze") {
    const walls = [
      [2, 3, 26, 1.5],
      [2, 3, 1.5, 14],
      [26.5, 3, 1.5, 14],
      [2, 15.5, 26, 1.5],
      [8, 7, 6, 1.5],
      [17, 7, 1.5, 5],
      [8, 11, 1.5, 4.5],
    ];
    walls.forEach(([x, y, w, h]) => rects.push({ x, y, w, h, c: FIELD.wall }));
    for (let x = 5; x < 26; x += 3) rects.push({ x, y: 5, w: 0.8, h: 0.8, c: FIELD.pearlShade });
    block(5, 10, t);
    block(21, 10, cube);
    rects.push({ x: 12, y: 11, w: 3, h: 1.5, c: FIELD.jelly }, { x: 12, y: 12.5, w: 0.6, h: 1, c: FIELD.jelly }, { x: 14.4, y: 12.5, w: 0.6, h: 1, c: FIELD.jelly });
  } else {
    // delivery / factory — locked previews: a crate on a belt
    rects.push({ x: 3, y: 14, w: 24, h: 1.5, c: FIELD.wall });
    block(8, 10, cube, 4);
    block(16, 10, cube, 4);
  }

  return (
    <svg width={W * px} height={H * px} viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" aria-hidden="true">
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.c} />
      ))}
    </svg>
  );
}
