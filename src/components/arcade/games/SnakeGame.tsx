"use client";

import React, { useEffect, useRef, useState } from "react";
import { C } from "../tokens";
import { sfx, haptic } from "../arcadeAudio";
import { FONT_UI } from "../ui";
import { DIR_VEC, Dir, OPPOSITE, fitCells, useDirectionalInput } from "./useSwipe";
import { FIELD, Particle, burst, drawBlock, drawCube, drawHead, drawPearl, prefersReducedMotion, stepParticles, tones } from "./pixel";
import type { GameProps } from "./types";

const COLS = 16;
const ROWS = 16;
const STEP_MS = 190; // ≈ 5 клітинок/с — спокійний темп для 9+
const PEARLS = 3;

interface Pt {
  x: number;
  y: number;
}

const same = (a: Pt, b: Pt) => a.x === b.x && a.y === b.y;

/**
 * Змійка (поле 16×16). Свайп по полю або стрілки.
 *
 * Без смертей: стіни — це тунелі (виходиш з іншого боку), а зіткнення з
 * хвостом лише ненадовго зупиняє змійку, і «відкушений» хвіст розсипається
 * перлинами, які можна зібрати знову. Бурштиновий кубик → шторка з питанням.
 */
export function SnakeGame({ paused, accent, stepsLeft, onAsk }: GameProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState({ cell: 20, width: 320, height: 320 });
  const [started, setStarted] = useState(false);

  const g = useRef({
    snake: [] as Pt[],
    prev: [] as Pt[],
    dir: "right" as Dir,
    queue: [] as Dir[],
    cube: null as Pt | null,
    pearls: [] as Pt[],
    particles: [] as Particle[],
    acc: 0,
    bumpUntil: 0,
    gulp: 0,
    reduce: false,
  });

  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const stepsLeftRef = useRef(stepsLeft);
  stepsLeftRef.current = stepsLeft;
  const onAskRef = useRef(onAsk);
  onAskRef.current = onAsk;
  const startedRef = useRef(started);
  startedRef.current = started;

  // init once
  useEffect(() => {
    const s = g.current;
    s.reduce = prefersReducedMotion();
    s.snake = [
      { x: 6, y: 8 },
      { x: 5, y: 8 },
      { x: 4, y: 8 },
      { x: 3, y: 8 },
    ];
    s.prev = s.snake.map((p) => ({ ...p }));
    s.cube = null;
    s.pearls = [];
    s.cube = freeCell({ x: 11, y: 8 });
    while (s.pearls.length < PEARLS) s.pearls.push(freeCell());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fit to the available space
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

  // after a question: put the next cube on the field
  useEffect(() => {
    const s = g.current;
    if (!paused && !s.cube && stepsLeft > 0) s.cube = freeCell();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, stepsLeft]);

  function occupied(p: Pt) {
    const s = g.current;
    return s.snake.some((q) => same(q, p)) || s.pearls.some((q) => same(q, p)) || (s.cube ? same(s.cube, p) : false);
  }

  function freeCell(prefer?: Pt): Pt {
    if (prefer && !occupied(prefer)) return prefer;
    const head = g.current.snake[0] ?? { x: 0, y: 0 };
    for (let tries = 0; tries < 400; tries++) {
      const p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
      const far = Math.abs(p.x - head.x) + Math.abs(p.y - head.y) > 4;
      if (!occupied(p) && far) return p;
    }
    return { x: 0, y: 0 };
  }

  const turn = (d: Dir) => {
    const s = g.current;
    if (!startedRef.current) setStarted(true);
    const last = s.queue.length ? s.queue[s.queue.length - 1] : s.dir;
    if (d === last || d === OPPOSITE[last]) return;
    if (s.queue.length < 2) s.queue.push(d);
  };

  useDirectionalInput(wrapRef, !paused, turn);

  // main loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = g.current;
    let raf = 0;
    let last = performance.now();

    const tick = () => {
      // bump: a short stop, never a game over
      if (performance.now() < s.bumpUntil) return;
      const nextDir = s.queue.shift();
      if (nextDir) s.dir = nextDir;
      const v = DIR_VEC[s.dir];
      const head = s.snake[0];
      const nh = { x: (head.x + v.x + COLS) % COLS, y: (head.y + v.y + ROWS) % ROWS };

      const hitIdx = s.snake.findIndex((q, i) => i < s.snake.length - 1 && same(q, nh));
      if (hitIdx > 0) {
        const cut = s.snake.splice(hitIdx);
        s.prev = s.snake.map((p) => ({ ...p }));
        for (const c of cut.slice(0, 6)) if (!s.pearls.some((q) => same(q, c))) s.pearls.push(c);
        s.bumpUntil = performance.now() + 420;
        sfx("bump");
        haptic(10);
        return;
      }

      s.prev = s.snake.map((p) => ({ ...p }));
      s.snake.unshift(nh);

      const pi = s.pearls.findIndex((q) => same(q, nh));
      if (pi >= 0) {
        s.pearls.splice(pi, 1);
        if (s.pearls.length < PEARLS) s.pearls.push(freeCell());
        sfx("pearl");
        if (!s.reduce) burst(s.particles, (nh.x + 0.5) * box.cell, (nh.y + 0.5) * box.cell, [FIELD.pearl, FIELD.pearlShade], 6, Math.max(2, box.cell / 5));
        s.prev.push(s.prev[s.prev.length - 1]);
        return; // grow
      }
      if (s.cube && same(s.cube, nh)) {
        s.cube = null;
        s.gulp = 1;
        sfx("eat");
        haptic(12);
        if (!s.reduce)
          burst(s.particles, (nh.x + 0.5) * box.cell, (nh.y + 0.5) * box.cell, [FIELD.cubeLight, FIELD.cube, accent], 14, Math.max(3, box.cell / 5));
        s.prev.push(s.prev[s.prev.length - 1]);
        if (stepsLeftRef.current > 0) onAskRef.current();
        return; // grow
      }
      s.snake.pop();
    };

    const draw = (t: number, dt: number) => {
      const cell = box.cell;
      const p = Math.max(1, Math.floor(cell / 5));
      ctx.imageSmoothingEnabled = false;
      // water
      for (let y = 0; y < ROWS; y++)
        for (let x = 0; x < COLS; x++) {
          ctx.fillStyle = (x + y) % 2 ? FIELD.water : FIELD.waterAlt;
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }
      for (const q of s.pearls) drawPearl(ctx, q.x * cell, q.y * cell, cell);
      if (s.cube) drawCube(ctx, s.cube.x * cell, s.cube.y * cell, cell);

      const bumping = performance.now() < s.bumpUntil;
      const shake = bumping && !s.reduce ? Math.round(Math.sin(t / 22) * p) : 0;
      const tn = tones(accent);
      const body = { ...tn, base: tn.base };
      const n = s.snake.length;
      for (let i = n - 1; i >= 0; i--) {
        const cur = s.snake[i];
        const pr = s.prev[i] ?? cur;
        const near = Math.abs(cur.x - pr.x) <= 1 && Math.abs(cur.y - pr.y) <= 1;
        const k = near && !bumping ? t : 1;
        const x = (pr.x + (cur.x - pr.x) * k) * cell + shake;
        const y = (pr.y + (cur.y - pr.y) * k) * cell;
        if (i === 0) drawHead(ctx, x, y, cell, p, tn, s.dir, s.gulp);
        else {
          const inset = i === n - 1 ? p : 0;
          drawBlock(ctx, Math.round(x + inset), Math.round(y + inset), cell - inset * 2, body, p);
        }
      }
      if (s.gulp > 0) s.gulp = Math.max(0, s.gulp - dt * 5);
      stepParticles(ctx, s.particles, dt);
    };

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!pausedRef.current && startedRef.current) {
        s.acc += dt * 1000;
        while (s.acc >= STEP_MS) {
          s.acc -= STEP_MS;
          tick();
          if (pausedRef.current) {
            s.acc = 0;
            break;
          }
        }
      }
      const t = pausedRef.current || !startedRef.current ? 1 : Math.min(1, s.acc / STEP_MS);
      draw(t, pausedRef.current ? 0 : dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box, accent]);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center px-6 pt-4">
      <div ref={wrapRef} className="relative flex min-h-0 w-full flex-1 touch-none select-none items-start justify-center" style={{ maxHeight: 420 }}>
        <div className="relative overflow-hidden rounded-xl border" style={{ borderColor: C.line, width: box.width, height: box.height }}>
          <canvas
            ref={canvasRef}
            width={box.width}
            height={box.height}
            role="img"
            aria-label="Поле Змійки. Бурштиновий кубик — питання."
            style={{ width: box.width, height: box.height, imageRendering: "pixelated", display: "block" }}
          />
          {!started && !paused && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
              <span className="rounded-lg px-3 py-1.5 text-[13px] font-semibold" style={{ background: "rgba(14,15,19,.82)", color: C.text, fontFamily: FONT_UI }}>
                Свайпни або натисни стрілку, щоб почати
              </span>
            </div>
          )}
        </div>
      </div>
      <p className="mt-4 shrink-0 text-center text-[14px] leading-[21px]" style={{ color: C.muted, fontFamily: FONT_UI }}>
        Свайпни по полю, щоб повернути змійку.
        <br />
        Бурштиновий кубик — це питання.
      </p>
    </div>
  );
}
