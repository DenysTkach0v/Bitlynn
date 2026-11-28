"use client";

import { MotionValue, animate } from "framer-motion";

export type Ease = "easeIn" | "easeOut" | "easeInOut" | "linear" | [number, number, number, number];

/** extra time before the safety net kicks in */
const GRACE_MS = 250;

/**
 * Animate a motion value and resolve when it is done — ALWAYS.
 *
 * framer-motion never calls onComplete when an animation is interrupted
 * (another animation on the same value) or when the browser stops drawing
 * frames (app in the background). A scene awaiting such a tween would hang
 * for ever. Here a timer finishes the job: after duration + grace the value
 * jumps to its final frame and the promise resolves, so every sequence
 * (sit scene, idle, room walk) always reaches its end.
 */
export function tween(mv: MotionValue<number>, to: number | number[], ms: number, ease: Ease = "easeOut"): Promise<void> {
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve();
    };
    const final = Array.isArray(to) ? to[to.length - 1] : to;
    const controls = animate(mv, to as number, { duration: ms / 1000, ease, onComplete: finish });
    const timer = setTimeout(() => {
      if (done) return;
      controls.stop();
      mv.set(final);
      finish();
    }, ms + GRACE_MS);
  });
}
