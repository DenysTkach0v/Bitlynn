"use client";

import { useCallback, useRef, useState } from "react";
import { MotionValue, animate, useMotionValue, useTransform } from "framer-motion";
import { sfx, haptic } from "@/components/arcade/arcadeAudio";
import { ROOM_MOTION as M } from "./roomMotion";
import { BED, DESK, FLOOR_Y, HERO_H, HERO_W, SIT_BELOW_DESK, SIT_SCENE as S, SLEEP } from "./sitScene";
import { CHAIR, sitOffset } from "./PixelChair";
import { useRoomWalker } from "./useRoomWalker";

type Walker = ReturnType<typeof useRoomWalker>;
type Ease = "easeIn" | "easeOut" | "easeInOut" | "linear";

const tween = (mv: MotionValue<number>, to: number | number[], ms: number, ease: Ease = "easeOut") =>
  new Promise<void>((resolve) => animate(mv, to as number, { duration: ms / 1000, ease, onComplete: resolve }));

/** Hero top when he stands on the floor. */
export const HERO_TOP = FLOOR_Y - HERO_H;


/** How high the gas lift must rise so his feet end SIT_BELOW_DESK under the desk top. */
export function liftFor(room: number) {
  const desk = DESK[room];
  const sitBottomAtZero = FLOOR_Y + sitOffset(0);
  return Math.max(0, sitBottomAtZero - (desk.top + SIT_BELOW_DESK));
}

/**
 * The «sleep → wake → chair from the pocket → hop on → lever lift» choreography.
 * Every number comes from sitScene.ts; this file only orders the steps.
 */
export function useSitScene(walker: Walker) {
  const lay = useMotionValue(0); // rotation while lying (deg)
  const layY = useMotionValue(0); // lying / getting-up offset (px)
  const squash = useMotionValue(1); // hero scaleY
  // the chair: x of its left edge, how high it flies above the floor, its scale/spin/squash, the gas lift, the lever
  const chairX = useMotionValue(0);
  const chairUp = useMotionValue(0);
  const chairScale = useMotionValue(1);
  const chairRot = useMotionValue(0);
  const chairSquash = useMotionValue(1);
  const lift = useMotionValue(0);
  const lever = useMotionValue(0);

  const swivel = useMotionValue(1); // scaleX while turning on the chair

  const [asleep, setAsleep] = useState(false); // «Z z» is shown
  const [inBed, setInBed] = useState(false); // head + blanket drawn instead of the sprite
  const [eyes, setEyes] = useState<"open" | "closed">("closed");
  const [blanketOff, setBlanketOff] = useState(false);
  const [alert, setAlert] = useState(false);
  const [chairOn, setChairOn] = useState(false);
  const [back, setBack] = useState<null | { x: number; y: number }>(null);
  const skipped = useRef(false);

  // chairY mirrors chairUp (up = negative y) so the steps think in «height above the floor»
  const chairY = useTransform(chairUp, (v) => -v);

  /** Put him to bed in a room that has one (instant). Returns false when there is no bed. */
  const sleepIn = useCallback(
    (room: number) => {
      const bed = BED[room];
      if (!bed) return false;
      walker.heroX.set(bed.x);
      layY.set(bed.surface - FLOOR_Y); // standing on the mattress once he gets out
      setEyes("closed");
      setBlanketOff(false);
      setInBed(true);
      setAsleep(true);
      return true;
    },
    [walker.heroX, layY]
  );

  /** 1 · sleepy wake-up: blink-blink, yawn, throw the blanket off, «!», hop down. Safe to call when awake. */
  const wake = useCallback(async () => {
    if (!asleep) return;
    setAsleep(false);
    sfx("yawn");
    for (const f of S.wakeBlinks) {
      setEyes(f.eyes);
      await new Promise((r) => setTimeout(r, f.ms));
    }
    setAlert(true);
    sfx("wake");
    haptic(6);
    setBlanketOff(true);
    sfx("swish");
    await new Promise((r) => setTimeout(r, SLEEP.blanketOff.ms * 0.45));
    setInBed(false);
    const from = layY.get();
    await tween(layY, [from, from - S.wakeHopPx, 0], S.wakeMs, "easeInOut");
    sfx("plop");
    setTimeout(() => setAlert(false), Math.max(0, S.alertMs - S.wakeMs));
  }, [asleep, layY]);

  /** Full scene in room `room`. Resolves when he is up at the keyboard (or right away when skipped). */
  const play = useCallback(
    async (room: number) => {
      skipped.current = false;
      const stop = () => skipped.current;
      const desk = DESK[room];
      const targetLift = liftFor(room);

      await wake();
      if (stop()) return;

      // 2 · walk to his spot in front of the desk
      const d = desk.heroX >= walker.heroX.get() ? 1 : -1;
      walker.startSteps(d);
      await walker.walkTo(desk.heroX, S.walkMs, M.easeWalkIn);
      walker.stopSteps();
      if (stop()) return;

      // 3 · pat the pocket
      sfx("pat");
      await tween(walker.lean, S.patKeysDeg, S.patMs, "linear");
      if (stop()) return;

      // 4 · a tiny chair pops out of the pocket, flips and grows…
      const finalX = desk.heroX + (HERO_W - CHAIR.W) / 2;
      chairX.set(desk.heroX + S.pocket.x - CHAIR.W / 2);
      chairUp.set(S.pocket.up);
      chairScale.set(S.popStartScale);
      chairRot.set(0);
      chairSquash.set(1);
      lift.set(0);
      lever.set(0);
      setChairOn(true);
      sfx("pop");
      await Promise.all([
        tween(chairUp, S.popPeakUp, S.popMs, "easeOut"),
        tween(chairScale, 0.5, S.popMs, "easeOut"),
        tween(chairRot, -120, S.popMs, "easeOut"),
      ]);
      if (stop()) return;
      await Promise.all([
        tween(chairUp, 0, S.flipMs, "easeIn"),
        tween(chairScale, 1, S.flipMs, "easeOut"),
        tween(chairRot, 360 * S.flipTurns, S.flipMs, "easeInOut"),
        tween(chairX, finalX, S.flipMs, "easeInOut"),
      ]);
      // 5 · wheels on the floor — bonk
      chairRot.set(0);
      sfx("bonk");
      haptic(12);
      await tween(chairSquash, S.landSquashKeys, S.landMs, "easeOut");
      if (stop()) return;

      // 6 · hop onto the seat (chair at its lowest)
      sfx("boing");
      await tween(walker.bob, [0, -S.hopPeakPx - 27, sitOffset(0)], S.hopMs, "easeOut");
      sfx("plop");
      await tween(squash, [0.86, 1.06, 1], 160, "easeOut");
      if (stop()) return;

      // 7 · press the lever — pshhh — the gas lift raises him to the keyboard
      await tween(lever, 28, S.leverMs, "easeOut");
      sfx("lift");
      const up = [0, targetLift + S.liftOvershootPx, targetLift];
      await Promise.all([
        tween(lift, up, S.liftMs, "easeOut"),
        tween(walker.bob, up.map((v) => sitOffset(v)), S.liftMs, "easeOut"),
        tween(lever, 0, S.liftMs, "easeOut"),
      ]);
      if (stop()) return;

      // 8 · swivel to the monitor: squeeze → show his back → open up
      sfx("squeak");
      await tween(swivel, 0.08, S.swivelMs / 2, "easeIn");
      const chairTop = FLOOR_Y - (CHAIR.BASE_H + CHAIR.POST_MIN + targetLift) - CHAIR.TOP_H;
      setBack({ x: finalX + CHAIR.W / 2 - HERO_W / 2, y: chairTop - S.backHeadAboveChair });
      await tween(swivel, 1, S.swivelMs / 2, "easeOut");
      if (stop()) return;

      // 9 · ready
      await new Promise((r) => setTimeout(r, S.holdMs));
      await tween(walker.fade, 0, S.fadeMs, "linear");
    },
    [wake, walker, chairX, chairUp, chairScale, chairRot, chairSquash, lift, lever, squash, swivel]
  );

  const skip = useCallback(() => {
    skipped.current = true;
  }, []);

  return {
    lay,
    layY,
    squash,
    chair: { x: chairX, y: chairY, scale: chairScale, rotate: chairRot, squash: chairSquash, lift, lever },
    swivel,
    back,
    inBed,
    eyes,
    blanketOff,
    asleep,
    alert,
    chairOn,
    sleepIn,
    wake,
    play,
    skip,
  };
}
