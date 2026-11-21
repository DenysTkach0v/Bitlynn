"use client";

/* =========================================================
   Bitlynn underwater station — game sound & haptics kit
   ---------------------------------------------------------
   Everything is synthesised with Web Audio (zero asset files),
   so the single-file HTML build keeps working offline.
   Palette of sounds follows the design concept: soft "wet"
   plips, sonar pings, brass valves, bubbles, ice crackle.
========================================================= */

import {
  getSharedAudioContext,
  isSoundEnabled,
  onSoundEnabledChange,
} from "@/lib/feedback";

export type CrewSfx =
  | "step"
  | "stepBot"
  | "uiTap"
  | "uiOpen"
  | "uiClose"
  | "proximity"
  | "roomEnter"
  | "taskOpen"
  | "taskStep"
  | "taskWrong"
  | "taskDone"
  | "coin"
  | "wireSelect"
  | "wireZap"
  | "sonarTick"
  | "bugSquash"
  | "bitOn"
  | "bitOff"
  | "padTone0"
  | "padTone1"
  | "padTone2"
  | "padTone3"
  | "sabotageStart"
  | "alarmTick"
  | "sabotageFixed"
  | "freeze"
  | "freezeFar"
  | "unfreeze"
  | "ventIn"
  | "ventOut"
  | "meeting"
  | "report"
  | "voteCast"
  | "ejectRight"
  | "ejectWrong"
  | "roleEngineer"
  | "roleSaboteur"
  | "victory"
  | "defeat"
  | "cooldownReady"
  | "denied"
  | "mapOpen"
  | "cameraSwap";

/* ---------------------------------------------------------
   Audio graph: sources -> master -> compressor -> out
--------------------------------------------------------- */
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let graphCtx: AudioContext | null = null;

function ctxReady(): AudioContext | null {
  if (!isSoundEnabled()) return null;
  const ctx = getSharedAudioContext();
  if (!ctx) return null;
  if (graphCtx !== ctx || !master) {
    graphCtx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 10;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;
    master = ctx.createGain();
    master.gain.value = 0.85;
    master.connect(comp).connect(ctx.destination);
    noiseBuf = null;
  }
  if (!noiseBuf) {
    const len = Math.floor(ctx.sampleRate * 1.2);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  return ctx;
}

interface ToneOpts {
  type?: OscillatorType;
  f0: number;
  f1?: number;
  t?: number;
  dur: number;
  vol: number;
  attack?: number;
  filter?: { type: BiquadFilterType; freq: number; q?: number };
  pan?: number;
  dest?: AudioNode;
}

function tone(ctx: AudioContext, o: ToneOpts) {
  const t0 = ctx.currentTime + (o.t ?? 0);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(Math.max(20, o.f0), t0);
  if (o.f1 !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t0 + o.dur);
  }
  const a = o.attack ?? 0.008;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(o.vol, t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  let node: AudioNode = osc;
  node.connect(g);
  node = g;
  if (o.filter) {
    const f = ctx.createBiquadFilter();
    f.type = o.filter.type;
    f.frequency.value = o.filter.freq;
    f.Q.value = o.filter.q ?? 1;
    node.connect(f);
    node = f;
  }
  if (o.pan !== undefined && typeof ctx.createStereoPanner === "function") {
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, o.pan));
    node.connect(p);
    node = p;
  }
  node.connect(o.dest ?? master!);
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.03);
}

interface NoiseOpts {
  t?: number;
  dur: number;
  vol: number;
  type?: BiquadFilterType;
  freq: number;
  freq1?: number;
  q?: number;
  attack?: number;
  pan?: number;
}

function noise(ctx: AudioContext, o: NoiseOpts) {
  if (!noiseBuf) return;
  const t0 = ctx.currentTime + (o.t ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = o.type ?? "bandpass";
  f.frequency.setValueAtTime(o.freq, t0);
  if (o.freq1 !== undefined) {
    f.frequency.exponentialRampToValueAtTime(Math.max(30, o.freq1), t0 + o.dur);
  }
  f.Q.value = o.q ?? 1;
  const g = ctx.createGain();
  const a = o.attack ?? 0.005;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(o.vol, t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  let node: AudioNode = src;
  node.connect(f);
  f.connect(g);
  node = g;
  if (o.pan !== undefined && typeof ctx.createStereoPanner === "function") {
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, o.pan));
    node.connect(p);
    node = p;
  }
  node.connect(master!);
  src.start(t0, Math.random() * 0.8);
  src.stop(t0 + o.dur + 0.03);
}

function arp(
  ctx: AudioContext,
  notes: number[],
  gap: number,
  dur: number,
  vol: number,
  type: OscillatorType = "triangle",
  start = 0
) {
  notes.forEach((f, i) =>
    tone(ctx, { type, f0: f, t: start + i * gap, dur, vol, attack: 0.006 })
  );
}

/** A few rising water bubbles — the signature "Bitlynn" garnish. */
function bubbles(ctx: AudioContext, count: number, start = 0, vol = 0.05, base = 420) {
  for (let i = 0; i < count; i++) {
    const f = base + Math.random() * base * 0.9;
    tone(ctx, {
      f0: f,
      f1: f * 2.3,
      t: start + i * (0.045 + Math.random() * 0.05),
      dur: 0.07 + Math.random() * 0.04,
      vol: vol * (0.6 + Math.random() * 0.5),
      attack: 0.004,
    });
  }
}

/* ---------------------------------------------------------
   Throttling so loops / bots never stack into mush
--------------------------------------------------------- */
const lastPlayed: Partial<Record<CrewSfx, number>> = {};
const MIN_GAP: Partial<Record<CrewSfx, number>> = {
  step: 0.07,
  stepBot: 0.11,
  proximity: 0.25,
  roomEnter: 0.5,
  coin: 0.04,
  freezeFar: 0.4,
  denied: 0.2,
};

let stepFlip = false;

export interface PlayOpts {
  /** -1 (left) .. 1 (right) */
  pan?: number;
  /** 0..1 loudness scale (used for distance attenuation) */
  gain?: number;
}

export function playCrewSfx(kind: CrewSfx, opts: PlayOpts = {}): void {
  const ctx = ctxReady();
  if (!ctx) return;
  const now = ctx.currentTime;
  const gap = MIN_GAP[kind];
  if (gap !== undefined) {
    const prev = lastPlayed[kind];
    if (prev !== undefined && now - prev < gap) return;
  }
  lastPlayed[kind] = now;
  const k = Math.max(0, Math.min(1, opts.gain ?? 1));
  const pan = opts.pan;

  try {
    switch (kind) {
      /* ---- Movement ---- */
      case "step": {
        // Soft wet "plip" on wooden planks, alternating feet
        stepFlip = !stepFlip;
        const f = (stepFlip ? 230 : 205) * (0.94 + Math.random() * 0.12);
        tone(ctx, { f0: f, f1: f * 0.62, dur: 0.07, vol: 0.075 * k, attack: 0.003, pan });
        noise(ctx, { dur: 0.045, vol: 0.03 * k, freq: 1700, q: 1.4, pan });
        if (Math.random() < 0.12) bubbles(ctx, 1, 0.03, 0.025 * k, 600);
        break;
      }
      case "stepBot": {
        const f = 190 * (0.9 + Math.random() * 0.2);
        tone(ctx, { f0: f, f1: f * 0.65, dur: 0.06, vol: 0.05 * k, attack: 0.003, pan });
        noise(ctx, { dur: 0.035, vol: 0.016 * k, freq: 1400, q: 1.2, pan });
        break;
      }

      /* ---- UI ---- */
      case "uiTap":
        tone(ctx, { f0: 640, f1: 860, dur: 0.06, vol: 0.06 });
        break;
      case "uiOpen":
        tone(ctx, { f0: 380, f1: 760, dur: 0.12, vol: 0.07, type: "triangle" });
        noise(ctx, { dur: 0.12, vol: 0.02, freq: 900, freq1: 2600, q: 0.8 });
        break;
      case "uiClose":
        tone(ctx, { f0: 700, f1: 340, dur: 0.11, vol: 0.06, type: "triangle" });
        break;
      case "mapOpen":
        noise(ctx, { dur: 0.18, vol: 0.035, freq: 600, freq1: 3000, q: 0.6, attack: 0.04 });
        tone(ctx, { f0: 520, dur: 0.14, vol: 0.05, t: 0.06 });
        break;
      case "cameraSwap":
        tone(ctx, { f0: 300, f1: 520, dur: 0.1, vol: 0.05, type: "square", filter: { type: "lowpass", freq: 1200 } });
        break;
      case "denied":
        tone(ctx, { f0: 180, f1: 150, dur: 0.12, vol: 0.06, type: "square", filter: { type: "lowpass", freq: 900 } });
        break;

      /* ---- World awareness ---- */
      case "proximity":
        // gentle double blip when a terminal / friend / hatch is in reach
        tone(ctx, { f0: 1046, dur: 0.07, vol: 0.05 });
        tone(ctx, { f0: 1568, dur: 0.09, vol: 0.04, t: 0.06 });
        break;
      case "roomEnter":
        // airlock door hiss + tiny brass clunk
        noise(ctx, { dur: 0.22, vol: 0.035, type: "highpass", freq: 2400, freq1: 900, attack: 0.02 });
        tone(ctx, { f0: 140, f1: 90, dur: 0.09, vol: 0.06, type: "triangle", t: 0.02 });
        break;

      /* ---- Tasks & mini-games ---- */
      case "taskOpen":
        // terminal boot: rising square chirps
        arp(ctx, [523, 659, 784], 0.05, 0.08, 0.05, "square");
        noise(ctx, { dur: 0.08, vol: 0.02, freq: 4000, q: 2 });
        break;
      case "taskStep":
        tone(ctx, { f0: 880, f1: 1320, dur: 0.09, vol: 0.07, type: "triangle" });
        break;
      case "taskWrong":
        tone(ctx, { f0: 220, f1: 140, dur: 0.2, vol: 0.075, type: "sawtooth", filter: { type: "lowpass", freq: 1100 } });
        tone(ctx, { f0: 233, f1: 147, dur: 0.2, vol: 0.05, type: "sawtooth", filter: { type: "lowpass", freq: 1100 } });
        break;
      case "taskDone":
        // bright arpeggio + coin + bubbles
        arp(ctx, [523.25, 659.25, 783.99, 1046.5], 0.07, 0.22, 0.09, "triangle");
        tone(ctx, { f0: 1318.5, dur: 0.35, vol: 0.06, t: 0.3 });
        bubbles(ctx, 5, 0.25, 0.045, 500);
        break;
      case "coin":
        tone(ctx, { f0: 988, dur: 0.06, vol: 0.07, type: "square", filter: { type: "lowpass", freq: 4000 } });
        tone(ctx, { f0: 1319, dur: 0.16, vol: 0.06, type: "square", t: 0.06, filter: { type: "lowpass", freq: 4000 } });
        break;
      case "wireSelect":
        tone(ctx, { f0: 520, dur: 0.05, vol: 0.05, type: "square", filter: { type: "lowpass", freq: 2000 } });
        break;
      case "wireZap":
        noise(ctx, { dur: 0.12, vol: 0.06, freq: 3200, freq1: 900, q: 3 });
        tone(ctx, { f0: 1200, f1: 600, dur: 0.1, vol: 0.05, type: "sawtooth", filter: { type: "lowpass", freq: 3000 } });
        tone(ctx, { f0: 784, dur: 0.12, vol: 0.06, type: "triangle", t: 0.08 });
        break;
      case "sonarTick":
        tone(ctx, { f0: 1500, f1: 1460, dur: 0.18, vol: 0.06 });
        break;
      case "bugSquash":
        noise(ctx, { dur: 0.08, vol: 0.07, type: "lowpass", freq: 1200 });
        tone(ctx, { f0: 300, f1: 90, dur: 0.1, vol: 0.08, type: "square", filter: { type: "lowpass", freq: 1500 } });
        break;
      case "bitOn":
        tone(ctx, { f0: 660, dur: 0.04, vol: 0.06, type: "square", filter: { type: "lowpass", freq: 2400 } });
        noise(ctx, { dur: 0.02, vol: 0.04, freq: 5000, q: 2 });
        break;
      case "bitOff":
        tone(ctx, { f0: 440, dur: 0.04, vol: 0.05, type: "square", filter: { type: "lowpass", freq: 1800 } });
        noise(ctx, { dur: 0.02, vol: 0.03, freq: 3500, q: 2 });
        break;
      case "padTone0":
      case "padTone1":
      case "padTone2":
      case "padTone3": {
        const f = [392, 523.25, 659.25, 783.99][Number(kind.slice(-1))];
        tone(ctx, { f0: f, dur: 0.32, vol: 0.09, type: "triangle", attack: 0.01 });
        tone(ctx, { f0: f * 2, dur: 0.2, vol: 0.025, attack: 0.01 });
        break;
      }

      /* ---- Sabotage ---- */
      case "sabotageStart":
        // power-down groan + klaxon stab
        tone(ctx, { f0: 520, f1: 70, dur: 0.6, vol: 0.09, type: "sawtooth", filter: { type: "lowpass", freq: 1400 } });
        tone(ctx, { f0: 660, dur: 0.18, vol: 0.07, type: "square", t: 0.45, filter: { type: "lowpass", freq: 2200 } });
        tone(ctx, { f0: 494, dur: 0.18, vol: 0.07, type: "square", t: 0.65, filter: { type: "lowpass", freq: 2200 } });
        noise(ctx, { dur: 0.4, vol: 0.05, type: "lowpass", freq: 600, attack: 0.02 });
        break;
      case "alarmTick":
        tone(ctx, { f0: 1760, dur: 0.05, vol: 0.05 * k + 0.02, type: "square", filter: { type: "lowpass", freq: 3000 } });
        break;
      case "sabotageFixed":
        // power-up sweep + bright chord
        tone(ctx, { f0: 120, f1: 880, dur: 0.45, vol: 0.07, type: "sawtooth", filter: { type: "lowpass", freq: 2400 } });
        arp(ctx, [659.25, 830.6, 987.8, 1318.5], 0.06, 0.3, 0.07, "triangle", 0.35);
        bubbles(ctx, 6, 0.4, 0.04, 520);
        break;

      /* ---- Freeze / rescue ---- */
      case "freeze":
        // ice crackle + glassy descending shimmer
        noise(ctx, { dur: 0.35, vol: 0.08, type: "highpass", freq: 3500, freq1: 6000 });
        for (let i = 0; i < 5; i++) {
          noise(ctx, { t: 0.03 + i * 0.05, dur: 0.03, vol: 0.06, freq: 4000 + Math.random() * 3000, q: 6 });
        }
        arp(ctx, [1975, 1568, 1318, 1046], 0.06, 0.28, 0.05, "sine", 0.05);
        tone(ctx, { f0: 160, f1: 90, dur: 0.3, vol: 0.06, type: "triangle" });
        break;
      case "freezeFar":
        noise(ctx, { dur: 0.25, vol: 0.05 * k, type: "highpass", freq: 3000, freq1: 5000, pan });
        tone(ctx, { f0: 1568, f1: 1046, dur: 0.3, vol: 0.035 * k, pan });
        break;
      case "unfreeze":
        // ice shatters then warm "heart" chime
        for (let i = 0; i < 7; i++) {
          noise(ctx, { t: i * 0.025, dur: 0.05, vol: 0.06, freq: 2500 + Math.random() * 4500, q: 5 });
        }
        arp(ctx, [523.25, 783.99, 1046.5], 0.08, 0.3, 0.08, "triangle", 0.15);
        bubbles(ctx, 4, 0.2, 0.04, 480);
        break;

      /* ---- Hatches ---- */
      case "ventIn":
        // valve creak + gulp down the pipe
        tone(ctx, { f0: 260, f1: 210, dur: 0.12, vol: 0.06, type: "sawtooth", filter: { type: "bandpass", freq: 700, q: 4 } });
        tone(ctx, { f0: 520, f1: 120, dur: 0.25, vol: 0.09, t: 0.08 });
        bubbles(ctx, 6, 0.1, 0.05, 300);
        break;
      case "ventOut":
        tone(ctx, { f0: 140, f1: 620, dur: 0.2, vol: 0.08 });
        bubbles(ctx, 4, 0.05, 0.05, 520);
        break;

      /* ---- Council ---- */
      case "meeting":
        tone(ctx, { f0: 420, f1: 110, dur: 0.55, vol: 0.12, type: "triangle" });
        arp(ctx, [523.25, 783.99, 987.77, 1174.66], 0.07, 0.45, 0.07, "sine", 0.04);
        tone(ctx, { f0: 220, dur: 1.1, vol: 0.06, attack: 0.01, t: 0.02 });
        bubbles(ctx, 3, 0.3, 0.05, 540);
        break;
      case "report":
        arp(ctx, [880, 1174.66, 1567.98], 0.09, 0.26, 0.08, "sine");
        tone(ctx, { f0: 196, dur: 0.5, vol: 0.06, type: "triangle", t: 0.02 });
        break;
      case "voteCast":
        // brass stamp "thunk"
        tone(ctx, { f0: 130, f1: 70, dur: 0.14, vol: 0.12, type: "triangle" });
        noise(ctx, { dur: 0.06, vol: 0.06, type: "lowpass", freq: 900 });
        tone(ctx, { f0: 880, dur: 0.06, vol: 0.03, t: 0.03, type: "square", filter: { type: "lowpass", freq: 2000 } });
        break;
      case "ejectRight":
        // drum roll ticks then triumphant chord
        for (let i = 0; i < 6; i++) {
          noise(ctx, { t: i * 0.06, dur: 0.04, vol: 0.04 + i * 0.006, type: "lowpass", freq: 1800 });
        }
        arp(ctx, [523.25, 659.25, 783.99], 0.0, 0.7, 0.07, "triangle", 0.38);
        tone(ctx, { f0: 1046.5, dur: 0.6, vol: 0.06, t: 0.5 });
        bubbles(ctx, 6, 0.5, 0.04, 500);
        break;
      case "ejectWrong":
        // sad trombone, underwater edition
        [392, 370, 349, 294].forEach((f, i) =>
          tone(ctx, {
            f0: f,
            f1: i === 3 ? f * 0.9 : f,
            t: i * 0.22,
            dur: i === 3 ? 0.6 : 0.2,
            vol: 0.08,
            type: "sawtooth",
            filter: { type: "lowpass", freq: 900 },
          })
        );
        break;

      /* ---- Match flow ---- */
      case "roleEngineer":
        arp(ctx, [392, 523.25, 659.25, 783.99], 0.09, 0.4, 0.08, "triangle");
        bubbles(ctx, 4, 0.35, 0.04, 480);
        break;
      case "roleSaboteur":
        // sly minor descent with a low thump
        tone(ctx, { f0: 98, dur: 0.6, vol: 0.12, type: "triangle" });
        arp(ctx, [622.25, 587.33, 466.16, 392], 0.12, 0.35, 0.07, "square", 0.05);
        break;
      case "victory":
        arp(ctx, [523.25, 659.25, 783.99, 1046.5, 1318.5], 0.1, 0.4, 0.09, "triangle");
        tone(ctx, { f0: 1568, dur: 0.9, vol: 0.06, t: 0.5 });
        tone(ctx, { f0: 261.6, dur: 1.2, vol: 0.06, t: 0.5, type: "triangle" });
        bubbles(ctx, 10, 0.5, 0.045, 500);
        break;
      case "defeat":
        tone(ctx, { f0: 330, f1: 60, dur: 1.4, vol: 0.1, type: "sawtooth", filter: { type: "lowpass", freq: 800 } });
        arp(ctx, [440, 415.3, 349.2, 293.7], 0.24, 0.4, 0.07, "triangle", 0.1);
        noise(ctx, { dur: 1.2, vol: 0.04, type: "lowpass", freq: 400, attack: 0.2 });
        break;
      case "cooldownReady":
        tone(ctx, { f0: 1318.5, dur: 0.1, vol: 0.05, type: "square", filter: { type: "lowpass", freq: 3500 } });
        tone(ctx, { f0: 1760, dur: 0.14, vol: 0.045, type: "square", t: 0.08, filter: { type: "lowpass", freq: 3500 } });
        break;
    }
  } catch {
    // Web Audio failures must never break the game loop
  }
}

/* ---------------------------------------------------------
   Haptics (phones) — mapped per gameplay meaning
--------------------------------------------------------- */
const HAPTICS: Partial<Record<CrewSfx, number | number[]>> = {
  uiTap: 8,
  proximity: 6,
  taskStep: 12,
  taskWrong: [30, 30, 30],
  taskDone: [16, 40, 24, 40, 40],
  sabotageStart: [80, 60, 80, 60, 120],
  alarmTick: 10,
  sabotageFixed: [20, 40, 60],
  freeze: [60, 30, 20],
  unfreeze: [20, 30, 50],
  ventIn: 35,
  meeting: [40, 60, 90],
  report: [30, 40, 30],
  voteCast: 25,
  ejectRight: [20, 40, 20, 40, 80],
  ejectWrong: [90, 50, 120],
  victory: [30, 50, 30, 50, 140],
  defeat: [140, 80, 200],
  denied: 15,
};

export function crewHaptic(kind: CrewSfx): void {
  const pattern = HAPTICS[kind];
  if (pattern === undefined) return;
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // ignore
  }
}

/** Sound + haptic in one call (what most gameplay events want). */
export function crewFeedback(kind: CrewSfx, opts?: PlayOpts): void {
  playCrewSfx(kind, opts);
  crewHaptic(kind);
}

/* ---------------------------------------------------------
   Looping layers: station ambience + sabotage siren
--------------------------------------------------------- */
interface Loop {
  nodes: AudioScheduledSourceNode[];
  gain: GainNode;
}

let ambience: Loop | null = null;
let ambienceBubbleTimer: number | null = null;
let siren: Loop | null = null;
let sirenLfo: OscillatorNode | null = null;
let duck = 1;

function stopLoop(loop: Loop | null, fade = 0.25) {
  if (!loop) return;
  const ctx = graphCtx;
  if (!ctx) return;
  const t = ctx.currentTime;
  try {
    loop.gain.gain.cancelScheduledValues(t);
    loop.gain.gain.setValueAtTime(loop.gain.gain.value, t);
    loop.gain.gain.linearRampToValueAtTime(0.0001, t + fade);
    loop.nodes.forEach((n) => n.stop(t + fade + 0.05));
  } catch {
    // ignore
  }
}

const AMB_LEVEL = 0.05;

export function startAmbience(): void {
  if (ambience) return;
  const ctx = ctxReady();
  if (!ctx || !noiseBuf) return;
  try {
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    out.gain.linearRampToValueAtTime(AMB_LEVEL * duck, ctx.currentTime + 1.5);
    out.connect(master!);

    // deep water rumble: looping noise through a slowly breathing lowpass
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 260;
    lp.Q.value = 0.7;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 120;
    lfo.connect(lfoGain).connect(lp.frequency);
    src.connect(lp).connect(out);

    // machinery hum (station generator)
    const hum = ctx.createOscillator();
    hum.type = "triangle";
    hum.frequency.value = 55;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.22;
    hum.connect(humGain).connect(out);

    src.start();
    lfo.start();
    hum.start();
    ambience = { nodes: [src, lfo, hum], gain: out };

    const scheduleBubble = () => {
      ambienceBubbleTimer = window.setTimeout(() => {
        const c = ctxReady();
        if (c && ambience && duck > 0.5) {
          bubbles(c, 2 + Math.floor(Math.random() * 3), 0, 0.018, 380 + Math.random() * 300);
        }
        scheduleBubble();
      }, 2200 + Math.random() * 3800);
    };
    scheduleBubble();
  } catch {
    ambience = null;
  }
}

export function stopAmbience(): void {
  if (ambienceBubbleTimer !== null) {
    window.clearTimeout(ambienceBubbleTimer);
    ambienceBubbleTimer = null;
  }
  stopLoop(ambience, 0.6);
  ambience = null;
}

/** Two-tone underwater klaxon that loops while a sabotage is active. */
export function startSiren(): void {
  if (siren) return;
  const ctx = ctxReady();
  if (!ctx) return;
  try {
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    out.gain.linearRampToValueAtTime(0.045 * duck, ctx.currentTime + 0.4);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1400;
    out.connect(master!);
    lp.connect(out);

    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = 560;
    const lfo = ctx.createOscillator();
    lfo.type = "square";
    lfo.frequency.value = 1.3;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 110;
    lfo.connect(lfoGain).connect(osc.frequency);
    osc.connect(lp);
    osc.start();
    lfo.start();
    siren = { nodes: [osc, lfo], gain: out };
    sirenLfo = lfo;
  } catch {
    siren = null;
  }
}

/** Faster wail as the crisis timer runs out (secondsLeft 35 → 0). */
export function setSirenUrgency(secondsLeft: number): void {
  if (!sirenLfo || !graphCtx) return;
  const rate = secondsLeft <= 10 ? 3.2 : secondsLeft <= 20 ? 2 : 1.3;
  sirenLfo.frequency.setTargetAtTime(rate, graphCtx.currentTime, 0.2);
}

export function stopSiren(): void {
  stopLoop(siren, 0.3);
  siren = null;
  sirenLfo = null;
}

/** Quieter loops while a modal (Council, mini-game) is on top. */
export function setLoopDuck(ducked: boolean): void {
  duck = ducked ? 0.35 : 1;
  const ctx = graphCtx;
  if (!ctx) return;
  const t = ctx.currentTime;
  if (ambience) ambience.gain.gain.setTargetAtTime(AMB_LEVEL * duck, t, 0.15);
  if (siren) siren.gain.gain.setTargetAtTime(0.045 * duck, t, 0.15);
}

export function stopAllCrewLoops(): void {
  stopAmbience();
  stopSiren();
}

// Muting from any Bitlynn sound toggle kills the loops immediately
if (typeof window !== "undefined") {
  onSoundEnabledChange((on) => {
    if (!on) stopAllCrewLoops();
  });
}

/* ---------------------------------------------------------
   Tiny event bus so the mini-game modal can shake / glow
   without prop-drilling through every mini-game.
--------------------------------------------------------- */
export type CrewUiPulse = "wrong" | "right";
const pulseListeners = new Set<(p: CrewUiPulse) => void>();

export function emitCrewUiPulse(p: CrewUiPulse): void {
  pulseListeners.forEach((cb) => cb(p));
}

export function onCrewUiPulse(cb: (p: CrewUiPulse) => void): () => void {
  pulseListeners.add(cb);
  return () => {
    pulseListeners.delete(cb);
  };
}

/** Mini-game helper: sound + haptic + modal shake/glow in one call. */
export function mgFeedback(kind: "tap" | "step" | "wrong", sfx?: CrewSfx): void {
  if (kind === "wrong") {
    crewFeedback(sfx ?? "taskWrong");
    emitCrewUiPulse("wrong");
  } else if (kind === "step") {
    crewFeedback(sfx ?? "taskStep");
    emitCrewUiPulse("right");
  } else {
    playCrewSfx(sfx ?? "uiTap");
    crewHaptic("uiTap");
  }
}
