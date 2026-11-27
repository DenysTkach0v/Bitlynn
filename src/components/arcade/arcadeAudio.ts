"use client";

import { useArcadeStore } from "./useArcadeStore";

let ctxRef: AudioContext | null = null;
function getSharedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!ctxRef) ctxRef = new Ctx();
  if (ctxRef.state === "suspended") ctxRef.resume().catch(() => {});
  return ctxRef;
}

/**
 * Soft, short UI sounds. No buzzers: «Майже!» is a gentle low «hm» note,
 * never an error alarm (психологічна безпека, версія 2.0).
 */
export type ArcadeSfx =
  | "tap"
  | "eat"
  | "pearl"
  | "sheet"
  | "right"
  | "almost"
  | "catch"
  | "hide"
  | "bump"
  | "count"
  | "rankup"
  | "wave"
  | "stepL"
  | "stepR"
  | "swish"
  | "wake"
  | "pat"
  | "pop"
  | "bonk"
  | "boing"
  | "plop";

interface Note {
  f: number;
  t: number; // start offset, s
  d: number; // duration, s
  type?: OscillatorType;
  v?: number;
  slideTo?: number;
}

const SFX: Record<ArcadeSfx, Note[]> = {
  tap: [{ f: 660, t: 0, d: 0.05, type: "triangle", v: 0.05 }],
  eat: [
    { f: 520, t: 0, d: 0.07, type: "square", v: 0.04 },
    { f: 780, t: 0.06, d: 0.09, type: "square", v: 0.04 },
  ],
  pearl: [{ f: 1200, t: 0, d: 0.06, type: "sine", v: 0.04, slideTo: 1600 }],
  sheet: [{ f: 300, t: 0, d: 0.18, type: "sine", v: 0.04, slideTo: 520 }],
  right: [
    { f: 660, t: 0, d: 0.1, type: "triangle", v: 0.07 },
    { f: 880, t: 0.09, d: 0.1, type: "triangle", v: 0.07 },
    { f: 1320, t: 0.18, d: 0.18, type: "triangle", v: 0.06 },
  ],
  almost: [{ f: 392, t: 0, d: 0.2, type: "sine", v: 0.06, slideTo: 349 }],
  catch: [
    { f: 880, t: 0, d: 0.06, type: "triangle", v: 0.06 },
    { f: 1175, t: 0.05, d: 0.1, type: "triangle", v: 0.06 },
  ],
  hide: [{ f: 440, t: 0, d: 0.12, type: "sine", v: 0.04, slideTo: 260 }],
  bump: [{ f: 180, t: 0, d: 0.12, type: "sine", v: 0.06, slideTo: 140 }],
  count: [{ f: 1500, t: 0, d: 0.025, type: "square", v: 0.018 }],
  rankup: [
    { f: 523, t: 0, d: 0.12, type: "square", v: 0.05 },
    { f: 659, t: 0.11, d: 0.12, type: "square", v: 0.05 },
    { f: 784, t: 0.22, d: 0.12, type: "square", v: 0.05 },
    { f: 1047, t: 0.33, d: 0.32, type: "triangle", v: 0.07 },
  ],
  // footsteps: two soft, slightly different thumps so walking sounds natural
  stepL: [{ f: 210, t: 0, d: 0.045, type: "triangle", v: 0.045, slideTo: 150 }],
  stepR: [{ f: 180, t: 0, d: 0.045, type: "triangle", v: 0.04, slideTo: 130 }],
  // camera pan between rooms: a quiet airy swish
  swish: [
    { f: 520, t: 0, d: 0.26, type: "sine", v: 0.022, slideTo: 260 },
    { f: 780, t: 0.02, d: 0.2, type: "sine", v: 0.012, slideTo: 390 },
  ],
  // ── sit scene (cartoon) ──
  wake: [
    { f: 520, t: 0, d: 0.08, type: "square", v: 0.03, slideTo: 880 },
    { f: 1046, t: 0.08, d: 0.07, type: "square", v: 0.025 },
  ],
  pat: [
    { f: 140, t: 0, d: 0.035, type: "triangle", v: 0.05 },
    { f: 160, t: 0.09, d: 0.035, type: "triangle", v: 0.05 },
  ],
  pop: [{ f: 300, t: 0, d: 0.09, type: "sine", v: 0.08, slideTo: 1400 }],
  bonk: [
    { f: 120, t: 0, d: 0.09, type: "triangle", v: 0.08, slideTo: 70 },
    { f: 660, t: 0, d: 0.05, type: "square", v: 0.02, slideTo: 440 },
  ],
  boing: [{ f: 220, t: 0, d: 0.28, type: "sine", v: 0.07, slideTo: 760 }],
  plop: [{ f: 260, t: 0, d: 0.08, type: "sine", v: 0.06, slideTo: 120 }],
  wave: [
    { f: 392, t: 0, d: 0.3, type: "sine", v: 0.05, slideTo: 523 },
    { f: 659, t: 0.2, d: 0.35, type: "sine", v: 0.05 },
  ],
};

export function sfx(kind: ArcadeSfx): void {
  if (!useArcadeStore.getState().soundOn) return;
  const ctx = getSharedAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    for (const n of SFX[kind]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.type ?? "sine";
      osc.frequency.setValueAtTime(n.f, now + n.t);
      if (n.slideTo) osc.frequency.exponentialRampToValueAtTime(n.slideTo, now + n.t + n.d);
      const v = n.v ?? 0.05;
      gain.gain.setValueAtTime(0.0001, now + n.t);
      gain.gain.exponentialRampToValueAtTime(v, now + n.t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d + 0.02);
    }
  } catch {
    /* audio is optional */
  }
}

export function haptic(ms = 8): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      /* noop */
    }
  }
}
