"use client";

import { useCallback, useRef, useState } from "react";
import { MotionValue, animate, useMotionValue } from "framer-motion";
import { sfx, haptic } from "@/components/arcade/arcadeAudio";
import { ROOM_MOTION as M } from "./roomMotion";
import { SIT_SCENE as S } from "./sitScene";
import { useRoomWalker } from "./useRoomWalker";

type Walker = ReturnType<typeof useRoomWalker>;

const tween = (mv: MotionValue<number>, to: number | number[], ms: number, ease: "easeIn" | "easeOut" | "easeInOut" | "linear" = "easeOut") =>
  new Promise<void>((resolve) => animate(mv, to as number, { duration: ms / 1000, ease, onComplete: resolve }));

/**
 * The «sleep → wake → chair from the pocket → jump» choreography.
 * Timings and offsets come from sitScene.ts; this file only orders the steps.
 */
export function useSitScene(walker: Walker) {
  /** lying on the bed: rotation (deg) and how much lower he lies (px) */
  const lay = useMotionValue(0);
  const layY = useMotionValue(0);
  /** squash & stretch of the hero (scaleY) */
  const squash = useMotionValue(1);
  /** the chair */
  const chairX = useMotionValue(0);
  const chairY = useMotionValue(0);
  const chairScale = useMotionValue(0);
  const chairRot = useMotionValue(0);
  const chairSquash = useMotionValue(1);

  const [asleep, setAsleep] = useState(false);
  const [alert, setAlert] = useState(false);
  const [chairOn, setChairOn] = useState(false);
  const skipped = useRef(false);

  /** Put him to bed at a spot (instant). */
  const sleepAt = useCallback(
    (x: number, dy: number) => {
      walker.heroX.set(x);
      lay.set(-90);
      layY.set(dy);
      setAsleep(true);
    },
    [walker.heroX, lay, layY]
  );

  /** 1 · wake up: «!», hop, stand. Safe to call when already awake. */
  const wake = useCallback(async () => {
    if (!asleep) return;
    setAsleep(false);
    setAlert(true);
    sfx("wake");
    haptic(6);
    await Promise.all([
      tween(lay, 0, S.wakeMs, "easeOut"),
      tween(layY, 0, S.wakeMs, "easeOut"),
      tween(walker.bob, [0, -S.wakeHopPx, 0], S.wakeMs, "easeOut"),
    ]);
    setTimeout(() => setAlert(false), Math.max(0, S.alertMs - S.wakeMs));
  }, [asleep, lay, layY, walker.bob]);

  /** Full scene. Resolves when he sits (or right away when skipped). */
  const play = useCallback(
    async (pcX: number) => {
      skipped.current = false;
      const stop = () => skipped.current;

      await wake();
      if (stop()) return;

      // 2 · walk to the PC
      const d = pcX >= walker.heroX.get() ? 1 : -1;
      walker.startSteps(d);
      await walker.walkTo(pcX, S.walkMs, M.easeWalkIn);
      walker.stopSteps();
      if (stop()) return;

      // 3 · pat the pocket
      sfx("pat");
      await tween(walker.lean, S.patKeysDeg, S.patMs, "linear");
      if (stop()) return;

      // 4 · a tiny chair pops out of the pocket…
      const x0 = pcX + S.pocketOffset.x;
      chairX.set(x0);
      chairY.set(S.pocketOffset.y);
      chairScale.set(S.popStartScale);
      chairRot.set(0);
      chairSquash.set(1);
      setChairOn(true);
      sfx("pop");
      await Promise.all([
        tween(chairY, S.popPeakY, S.popMs, "easeOut"),
        tween(chairScale, 0.55, S.popMs, "easeOut"),
        tween(chairRot, -140, S.popMs, "easeOut"),
        tween(chairX, x0 + 14, S.popMs, "easeOut"),
      ]);
      if (stop()) return;

      // 5 · …does a flip and grows…
      await Promise.all([
        tween(chairY, S.chairOffset.y, S.flipMs, "easeIn"),
        tween(chairScale, 1, S.flipMs, "easeOut"),
        tween(chairRot, 360 * S.flipTurns, S.flipMs, "easeInOut"),
        tween(chairX, pcX + S.chairOffset.x, S.flipMs, "easeInOut"),
      ]);
      // 6 · …and lands with a bonk
      sfx("bonk");
      haptic(12);
      chairRot.set(0);
      await tween(chairSquash, S.landSquashKeys, S.landMs, "easeOut");
      if (stop()) return;

      // 7 · boing — jump onto the chair
      sfx("boing");
      await tween(walker.bob, [0, -S.jumpPeakPx, -S.seatPx], S.jumpMs, "easeOut");
      // 8 · plop
      sfx("plop");
      await tween(squash, S.plopSquashKeys, S.plopMs, "easeOut");
      await new Promise((r) => setTimeout(r, S.holdMs));
      await tween(walker.fade, 0, S.fadeMs, "linear");
    },
    [wake, walker, chairX, chairY, chairScale, chairRot, chairSquash, squash]
  );

  const skip = useCallback(() => {
    skipped.current = true;
  }, []);

  return {
    lay,
    layY,
    squash,
    chair: { x: chairX, y: chairY, scale: chairScale, rotate: chairRot, squash: chairSquash },
    asleep,
    alert,
    chairOn,
    sleepAt,
    wake,
    play,
    skip,
  };
}
