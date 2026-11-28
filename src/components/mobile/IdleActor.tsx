"use client";

import React, { useEffect, useRef, useState } from "react";
import { MotionValue, motion, useMotionValue } from "framer-motion";
import { sfx } from "@/components/arcade/arcadeAudio";
import { ANATOMY, HERO_PAL, IDLE, IdleMove } from "./idleConfig";
import { tween } from "./tween";

/** One sprite pixel on screen. */
const P = 3;
const px = (n: number) => n * P;

type Pal = (typeof HERO_PAL)[string];

/** Picks idle moves at random intervals while `enabled` (see idleConfig.ts). */
export function useIdle(enabled: boolean) {
  const [move, setMove] = useState<IdleMove | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (!enabled || !IDLE.enabled) {
      setMove(null);
      first.current = true;
      return;
    }
    if (move) return;
    const delay = first.current ? IDLE.firstDelayMs : IDLE.gapMinMs + Math.random() * (IDLE.gapMaxMs - IDLE.gapMinMs);
    const t = setTimeout(() => {
      first.current = false;
      const list = (Object.keys(IDLE.moves) as IdleMove[]).flatMap((k) => Array(IDLE.moves[k].weight).fill(k) as IdleMove[]);
      setMove(list[Math.floor(Math.random() * list.length)]);
    }, delay);
    return () => clearTimeout(t);
  }, [enabled, move]);

  return { move, done: () => setMove(null) };
}

const to = (mv: MotionValue<number>, v: number, ms: number, ease: "easeIn" | "easeOut" | "easeInOut" | "linear" = "easeInOut") => tween(mv, v, ms, ease);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const block = (x: number, y: number, w: number, h: number, bg: string, extra?: React.CSSProperties): React.CSSProperties => ({
  position: "absolute",
  left: px(x),
  top: px(y),
  width: px(w),
  height: px(h),
  background: bg,
  ...extra,
});

/**
 * Wraps the hero sprite and plays one idle move over it: extra pixel parts
 * (paw, tail, open mouth, moving pupils) drawn in the sprite's own 18×16 grid.
 * Each move is a short sequence of steps; numbers come from idleConfig.ts.
 */
export function IdleActor({ move, palette, onDone, children }: { move: IdleMove | null; palette: Pal; onDone: () => void; children: React.ReactNode }) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  // whole body
  const tilt = useMotionValue(0);
  const stretch = useMotionValue(1);
  // scratch
  const arm = useMotionValue(0);
  const paw = useMotionValue(0);
  const spark = useMotionValue(0);
  // tail + look
  const tail = useMotionValue(0);
  const pupil = useMotionValue(0);
  // yawn
  const mouth = useMotionValue(0);

  useEffect(() => {
    if (!move) return;
    let cancelled = false;
    const alive = () => !cancelled;

    const run = async () => {
      if (move === "scratch") {
        const c = IDLE.moves.scratch;
        await Promise.all([to(tilt, c.tiltDeg, c.armMs), to(arm, 1, c.armMs, "easeOut")]);
        for (let i = 0; i < c.wiggles && alive(); i++) {
          spark.set(i % 2 ? 1 : 0.3);
          await to(paw, i % 2 ? 0 : -px(c.wigglePx), c.wiggleMs, "linear");
        }
        spark.set(0);
        await Promise.all([to(paw, 0, 80), to(arm, 0, c.armMs, "easeIn"), to(tilt, 0, c.armMs)]);
      }

      if (move === "tail") {
        const c = IDLE.moves.tail;
        const wag = (async () => {
          for (let i = 0; i < c.wags && alive(); i++) await to(tail, i % 2 ? c.wagDeg : -c.wagDeg, c.wagMs);
          await to(tail, 0, c.wagMs);
        })();
        const look = (async () => {
          for (const l of c.look) {
            if (!alive()) break;
            await to(pupil, px(l.dx), Math.min(120, l.ms), "easeOut");
            await wait(Math.max(0, l.ms - 120));
          }
          pupil.set(0);
        })();
        await Promise.all([wag, look]);
      }

      if (move === "yawn") {
        const c = IDLE.moves.yawn;
        if (c.sound) sfx("yawn");
        await Promise.all([to(mouth, 1, c.openMs, "easeOut"), to(stretch, c.stretch, c.openMs), to(tilt, c.tiltDeg, c.openMs)]);
        await wait(c.holdMs);
        await Promise.all([to(mouth, 0, c.closeMs, "easeIn"), to(stretch, 1, c.closeMs), to(tilt, 0, c.closeMs)]);
      }

      if (alive()) doneRef.current();
    };
    run();

    return () => {
      cancelled = true;
      // interrupted (child tapped something): snap back to the plain sprite
      [tilt, arm, paw, spark, tail, pupil, mouth].forEach((mv) => mv.set(0));
      stretch.set(1);
    };
  }, [move, tilt, stretch, arm, paw, spark, tail, pupil, mouth]);

  const outline = { boxShadow: `0 0 0 ${P / 3}px ${palette.outline}` };

  return (
    <motion.span className="relative block" style={{ rotate: tilt, scaleY: stretch, originX: 0.5, originY: 1 }}>
      {children}

      {move === "scratch" && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0">
          {/* the arm goes up the side of the head… */}
          <motion.span style={{ ...block(ANATOMY.scratchSpot.x - 1, ANATOMY.scratchSpot.y + 2, 2, 6, palette.skin, outline), scaleY: arm, originY: 1 }} />
          {/* …and the paw scratches the back of the head */}
          <motion.span style={{ ...block(ANATOMY.scratchSpot.x - 1, ANATOMY.scratchSpot.y, 3, 2, palette.skin, outline), y: paw, opacity: arm }} />
          {/* itch sparks */}
          <motion.span style={{ ...block(ANATOMY.scratchSpot.x - 3, ANATOMY.scratchSpot.y - 2, 1, 1, "#ECEEF4"), opacity: spark }} />
          <motion.span style={{ ...block(ANATOMY.scratchSpot.x + 2, ANATOMY.scratchSpot.y - 3, 1, 1, "#ECEEF4"), opacity: spark }} />
        </span>
      )}

      {move === "tail" && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0">
          {/* wagging tail */}
          <motion.span style={{ ...block(ANATOMY.tailRoot.x, ANATOMY.tailRoot.y - 1, 4, 2, palette.skin, outline), rotate: tail, originX: 0, originY: 0.5 }}>
            <span style={block(3, 0, 1, 2, palette.gill)} />
          </motion.span>
          {/* looking around: cover the eyes, draw moving pupils */}
          {ANATOMY.eyes.map((e, i) => (
            <React.Fragment key={i}>
              <span style={block(e.x - 1, e.y, 3, 1, palette.skin)} />
              <motion.span style={{ ...block(e.x, e.y, 1, 1, palette.eye), x: pupil }} />
            </React.Fragment>
          ))}
        </span>
      )}

      {move === "yawn" && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0">
          {/* eyes squeezed shut */}
          {ANATOMY.eyes.map((e, i) => (
            <React.Fragment key={i}>
              <span style={block(e.x, e.y, 1, 1, palette.skin)} />
              <span style={block(e.x - 0.34, e.y + 0.34, 1.67, 0.34, palette.eye)} />
            </React.Fragment>
          ))}
          {/* the smile line is hidden, a round mouth opens */}
          <span style={block(ANATOMY.mouth.x, ANATOMY.mouth.y, ANATOMY.mouth.w, 1, palette.skin)} />
          <motion.span
            style={{
              ...block(ANATOMY.mouth.x + 0.34, ANATOMY.mouth.y - 0.34, ANATOMY.mouth.w - 0.67, 2.34, palette.eye, { borderRadius: P, overflow: "hidden" }),
              scaleY: mouth,
              originY: 0.2,
            }}
          >
            <span style={block(0.67, 1.34, ANATOMY.mouth.w - 2, 1, palette.cheek)} />
          </motion.span>
        </span>
      )}
    </motion.span>
  );
}
