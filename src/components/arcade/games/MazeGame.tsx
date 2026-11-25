"use client";

import React, { useEffect, useRef, useState } from "react";
import { C } from "../tokens";
import { sfx, haptic } from "../arcadeAudio";
import { FONT_UI } from "../ui";
import { DIR_VEC, Dir, OPPOSITE, fitCells, useDirectionalInput } from "./useSwipe";
import { FIELD, Particle, burst, drawCube, drawHead, drawPearl, prefersReducedMotion, stepParticles, tones } from "./pixel";
import type { GameProps } from "./types";

const MAP = [
  "#############",
  "#...........#",
  "#.##.###.##.#",
  "#.#.......#.#",
  "#.#.##.##.#.#",
  "#.....#.....#",
  "###.#.#.#.###",
  "#...#...#...#",
  "#.###.#.###.#",
  "#.....#.....#",
  "#.##.###.##.#",
  "#...........#",
  "#.#.##.##.#.#",
  "#...........#",
  "#############",
];
const COLS = MAP[0].length;
const ROWS = MAP.length;
const CUBES = [
  { x: 1, y: 1 },
  { x: 11, y: 1 },
  { x: 6, y: 7 },
  { x: 1, y: 13 },
  { x: 11, y: 13 },
];
const START = { x: 6, y: 11 };
const PLAYER_SPEED = 4.6; // cells / s
const JELLY_SPEED = 2.4;

const isWall = (x: number, y: number) => MAP[y]?.[x] !== ".";

interface Mover {
  x: number; // current cell
  y: number;
  dir: Dir | null;
  t: number; // progress to the next cell
  want: Dir | null;
}

/**
 * Підводний лабіринт. Свайп/стрілки задають напрям, аксолотль пливе сам,
 * поки не впреться в стіну. Перлини — для краси, бурштинові кубики — питання.
 * Медуза не забирає життя: лише пригальмовує на 1,6 с (м'яка реакція 2.0).
 */
export function MazeGame({ paused, accent, stepsDone, stepsLeft, onAsk }: GameProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState({ cell: 26, width: 338, height: 390 });
  const [stunned, setStunned] = useState(false);

  const g = useRef({
    me: { ...START, dir: null, t: 0, want: null } as Mover,
    jellies: [
      { x: 3, y: 3, dir: "right", t: 0, want: null },
      { x: 9, y: 9, dir: "left", t: 0, want: null },
    ] as Mover[],
    pearls: new Set<string>(),
    cubes: CUBES.map((c) => ({ ...c })),
    particles: [] as Particle[],
    slowUntil: 0,
    immuneUntil: 0,
    pearlTick: 0,
    reduce: false,
  });

  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const onAskRef = useRef(onAsk);
  onAskRef.current = onAsk;
  const stepsLeftRef = useRef(stepsLeft);
  stepsLeftRef.current = stepsLeft;

  useEffect(() => {
    const s = g.current;
    s.reduce = prefersReducedMotion();
    fillPearls();
    // only as many cubes as there are questions left
    s.cubes = s.cubes.slice(0, Math.max(0, stepsLeft + stepsDone));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // a short grace period after each question
  useEffect(() => {
    if (!paused) g.current.immuneUntil = performance.now() + 1200;
  }, [paused]);

  function fillPearls() {
    const s = g.current;
    s.pearls.clear();
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        if (isWall(x, y)) continue;
        if (x === START.x && y === START.y) continue;
        if (CUBES.some((c) => c.x === x && c.y === y)) continue;
        s.pearls.add(`${x},${y}`);
      }
  }

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setBox(fitCells(r.width, r.height, COLS, ROWS));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useDirectionalInput(wrapRef, !paused, (d) => {
    const me = g.current.me;
    me.want = d;
    // instant U-turn mid-corridor feels fair
    if (me.dir && d === OPPOSITE[me.dir] && me.t > 0) {
      const v = DIR_VEC[me.dir];
      me.x += v.x;
      me.y += v.y;
      me.t = 1 - me.t;
      me.dir = d;
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = g.current;
    let raf = 0;
    let last = performance.now();
    let clock = 0;

    const canGo = (m: Mover, d: Dir) => !isWall(m.x + DIR_VEC[d].x, m.y + DIR_VEC[d].y);

    const advance = (m: Mover, speed: number, dt: number, onArrive: (m: Mover) => void) => {
      if (!m.dir) {
        if (m.want && canGo(m, m.want)) m.dir = m.want;
        else return;
      }
      m.t += speed * dt;
      while (m.t >= 1 && m.dir) {
        m.t -= 1;
        m.x += DIR_VEC[m.dir].x;
        m.y += DIR_VEC[m.dir].y;
        onArrive(m);
        if (m.want && canGo(m, m.want)) m.dir = m.want;
        else if (!canGo(m, m.dir)) {
          m.dir = null;
          m.t = 0;
        }
      }
    };

    const arriveMe = (m: Mover) => {
      const key = `${m.x},${m.y}`;
      if (s.pearls.delete(key)) {
        s.pearlTick += 1;
        if (s.pearlTick % 2 === 0) sfx("pearl");
        if (s.pearls.size === 0) fillPearls();
      }
      const ci = s.cubes.findIndex((c) => c.x === m.x && c.y === m.y);
      if (ci >= 0) {
        const c = s.cubes.splice(ci, 1)[0];
        sfx("eat");
        haptic(12);
        if (!s.reduce)
          burst(s.particles, (c.x + 0.5) * box.cell, (c.y + 0.5) * box.cell, [FIELD.cubeLight, FIELD.cube, accent], 14, Math.max(3, box.cell / 5));
        if (stepsLeftRef.current > 0) onAskRef.current();
      }
    };

    const arriveJelly = (m: Mover) => {
      const opts = (Object.keys(DIR_VEC) as Dir[]).filter((d) => canGo(m, d) && d !== (m.dir ? OPPOSITE[m.dir] : null));
      m.want = opts.length ? opts[Math.floor(Math.random() * opts.length)] : m.dir ? OPPOSITE[m.dir] : null;
    };

    const pos = (m: Mover) => {
      const v = m.dir ? DIR_VEC[m.dir] : { x: 0, y: 0 };
      return { x: m.x + v.x * m.t, y: m.y + v.y * m.t };
    };

    const draw = (dt: number) => {
      const cell = box.cell;
      const p = Math.max(1, Math.floor(cell / 5));
      ctx.imageSmoothingEnabled = false;
      for (let y = 0; y < ROWS; y++)
        for (let x = 0; x < COLS; x++) {
          const X = x * cell;
          const Y = y * cell;
          if (isWall(x, y)) {
            ctx.fillStyle = FIELD.wallDark;
            ctx.fillRect(X, Y, cell, cell);
            ctx.fillStyle = FIELD.wall;
            ctx.fillRect(X, Y, cell - p, cell - p);
            // light from the top-left: lit edge only where the wall meets water
            ctx.fillStyle = FIELD.wallLight;
            if (!isWall(x, y - 1) || y === 0) ctx.fillRect(X, Y, cell - p, p);
            if (!isWall(x - 1, y)) ctx.fillRect(X, Y, p, cell - p);
          } else {
            ctx.fillStyle = (x + y) % 2 ? FIELD.water : FIELD.waterAlt;
            ctx.fillRect(X, Y, cell, cell);
          }
        }
      s.pearls.forEach((k) => {
        const [x, y] = k.split(",").map(Number);
        drawPearl(ctx, x * cell, y * cell, cell, true);
      });
      for (const c of s.cubes) drawCube(ctx, c.x * cell, c.y * cell, cell);

      for (const j of s.jellies) {
        const q = pos(j);
        drawJelly(ctx, q.x * cell, q.y * cell, cell, p, clock);
      }

      const now = performance.now();
      const me = pos(s.me);
      const flicker = now < s.slowUntil && !s.reduce && Math.floor(now / 90) % 2 === 0;
      if (!flicker) drawHead(ctx, me.x * cell, me.y * cell, cell, p, tones(accent), s.me.dir ?? "up", 0);
      stepParticles(ctx, s.particles, dt);
    };

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!pausedRef.current) {
        clock += dt;
        const slow = now < s.slowUntil;
        advance(s.me, PLAYER_SPEED * (slow ? 0.4 : 1), dt, arriveMe);
        for (const j of s.jellies) {
          if (!j.dir && !j.want) arriveJelly(j);
          advance(j, JELLY_SPEED, dt, arriveJelly);
        }
        if (now > s.immuneUntil && !pausedRef.current) {
          const a = pos(s.me);
          for (const j of s.jellies) {
            const b = pos(j);
            if (Math.hypot(a.x - b.x, a.y - b.y) < 0.62) {
              s.slowUntil = now + 1600;
              s.immuneUntil = now + 2600;
              sfx("bump");
              haptic(10);
              setStunned(true);
              setTimeout(() => setStunned(false), 1600);
              break;
            }
          }
        }
      }
      draw(pausedRef.current ? 0 : dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box, accent]);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center px-5 pt-3">
      <div ref={wrapRef} className="relative flex min-h-0 w-full flex-1 touch-none select-none items-start justify-center" style={{ maxHeight: 460 }}>
        <div className="relative overflow-hidden rounded-xl border" style={{ borderColor: C.line, width: box.width, height: box.height }}>
          <canvas
            ref={canvasRef}
            width={box.width}
            height={box.height}
            role="img"
            aria-label="Підводний лабіринт. Бурштинові кубики — питання, медуз оминай."
            style={{ width: box.width, height: box.height, imageRendering: "pixelated", display: "block" }}
          />
        </div>
      </div>
      <p aria-live="polite" className="mt-3 shrink-0 text-center text-[14px] leading-[21px]" style={{ color: stunned ? C.almost : C.muted, fontFamily: FONT_UI }}>
        {stunned ? (
          <>
            Медуза лоскоче! Трохи повільніше — 2 секунди.
            <br />
            Нічого не втрачено.
          </>
        ) : (
          <>
            Свайпни, щоб пливти. Збирай перлини,
            <br />
            бурштиновий кубик — питання. Медуз оминай.
          </>
        )}
      </p>
    </div>
  );
}

function drawJelly(ctx: CanvasRenderingContext2D, x: number, y: number, cell: number, p: number, clock: number) {
  const X = Math.round(x + (cell - 5 * p) / 2);
  const Y = Math.round(y + (cell - 5 * p) / 2);
  // dome: three tones, lit top-left, coloured outline
  ctx.fillStyle = FIELD.jellyDark;
  ctx.fillRect(X + p, Y, 3 * p, p);
  ctx.fillRect(X, Y + p, 5 * p, 2 * p);
  ctx.fillStyle = FIELD.jelly;
  ctx.fillRect(X + p, Y + p, 3 * p, p);
  ctx.fillStyle = FIELD.jellyLight;
  ctx.fillRect(X + p, Y + p, p, p);
  // tentacles sway a pixel
  const sway = Math.floor(clock * 4) % 2;
  ctx.fillStyle = FIELD.jelly;
  ctx.fillRect(X + (0 + sway) * p, Y + 3 * p, p, p);
  ctx.fillRect(X + 2 * p, Y + 3 * p + sway * p, p, p);
  ctx.fillRect(X + (4 - sway) * p, Y + 3 * p, p, p);
  ctx.fillRect(X + (1 + sway) * p, Y + 4 * p, p, p);
  ctx.fillRect(X + (3 - sway) * p, Y + 4 * p, p, p);
}
