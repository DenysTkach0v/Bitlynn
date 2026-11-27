"use client";

import { useEffect, useRef } from "react";

export type Dir = "up" | "down" | "left" | "right";

export const DIR_VEC: Record<Dir, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };

/**
 * Swipe anywhere on the field (finger or mouse drag) + arrow keys / WASD.
 * The swipe origin resets after each turn, so one long gesture can steer
 * through several corners without lifting the finger.
 */
export function useDirectionalInput(
  ref: React.RefObject<HTMLElement | null>,
  enabled: boolean,
  onDir: (d: Dir) => void
) {
  const cb = useRef(onDir);
  cb.current = onDir;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let origin: { x: number; y: number; id: number } | null = null;
    const TH = 18;

    const down = (e: PointerEvent) => {
      if (!enabledRef.current) return;
      origin = { x: e.clientX, y: e.clientY, id: e.pointerId };
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    };
    const move = (e: PointerEvent) => {
      if (!origin || origin.id !== e.pointerId || !enabledRef.current) return;
      const dx = e.clientX - origin.x;
      const dy = e.clientY - origin.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < TH) return;
      if (Math.abs(dx) > Math.abs(dy)) cb.current(dx > 0 ? "right" : "left");
      else cb.current(dy > 0 ? "down" : "up");
      origin = { x: e.clientX, y: e.clientY, id: e.pointerId };
    };
    const up = () => {
      origin = null;
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [ref]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!enabledRef.current) return;
      const map: Record<string, Dir> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right",
        W: "up",
        S: "down",
        A: "left",
        D: "right",
      };
      const d = map[e.key];
      if (d) {
        e.preventDefault();
        cb.current(d);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
}

/** Square canvas that fills the available box, in whole cells (integer pixel scale). */
export function fitCells(w: number, h: number, cols: number, rows: number) {
  const cell = Math.max(8, Math.floor(Math.min(w / cols, h / rows)));
  return { cell, width: cell * cols, height: cell * rows };
}
