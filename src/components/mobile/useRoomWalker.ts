"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { animate, useMotionValue } from "framer-motion";
import { sfx } from "@/components/arcade/arcadeAudio";
import { ROOM_MOTION as M } from "./roomMotion";
import type { HeroFrame } from "./HeroSprite";
import { tween } from "./tween";

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * The hero's motion in the room, as plain motion values so React does not
 * re-render on every frame:
 *   heroX  — where he stands (design px)
 *   bob    — step bounce / hop offset (px, negative = up)
 *   lean   — body tilt while walking (deg)
 *   fade   — opacity (used when he sits at the PC)
 *   artX   — camera offset of the room strip (px)
 */
export function useRoomWalker(startX: number) {
  const heroX = useMotionValue(startX);
  const bob = useMotionValue(0);
  /** walk frame of the sprite: which foot is up */
  const frame = useMotionValue<HeroFrame>("idle");
  const lean = useMotionValue(0);
  const fade = useMotionValue(1);
  const artX = useMotionValue(0);
  const [facing, setFacing] = useState<1 | -1>(1);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const foot = useRef(0);

  const oneStep = useCallback(() => {
    const right = foot.current++ % 2 === 1;
    frame.set(right ? "stepB" : "stepA");
    animate(bob, [0, -M.stepBobPx, 0], { duration: M.stepMs / 1000, ease: "easeOut" });
    if (M.stepSound) sfx(right ? "stepR" : "stepL");
  }, [bob, frame]);

  /** Start the walk cycle in a direction (1 → right, -1 → left). */
  const startSteps = useCallback(
    (dir: 1 | -1) => {
      setFacing(dir);
      animate(lean, dir * M.leanDeg, { duration: 0.1 });
      if (stepTimer.current) return;
      oneStep();
      stepTimer.current = setInterval(oneStep, M.stepMs);
    },
    [lean, oneStep]
  );

  const stopSteps = useCallback(() => {
    if (stepTimer.current) clearInterval(stepTimer.current);
    stepTimer.current = null;
    frame.set("idle");
    animate(lean, 0, { duration: 0.12 });
    animate(bob, 0, { duration: 0.08 });
  }, [lean, bob, frame]);

  /** Walk to x over `ms`; resolves when he arrives. */
  const walkTo = useCallback(
    (x: number, ms: number, ease: [number, number, number, number]) =>
      tween(heroX, x, ms, ease),
    [heroX]
  );

  const hop = useCallback(() => {
    animate(bob, M.hopKeys, { duration: M.hopMs / 1000, ease: "easeOut" });
  }, [bob]);

  useEffect(() => () => {
    if (stepTimer.current) clearInterval(stepTimer.current);
  }, []);

  return { heroX, bob, lean, fade, artX, facing, frame, startSteps, stopSteps, walkTo, hop };
}
