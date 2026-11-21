"use client";

import { useMemo } from "react";
import { ANSWER_VFX_ITEMS, useBitlynnStore } from "@/store/useBitlynnStore";

export type TapFeedbackKind = "tap" | "success" | "error";
export type SoundEffectKind =
  | "tap"
  | "success"
  | "error"
  | "meeting"
  | "report"
  | "vent";

export interface AnswerVfxConfig {
  id: string;
  emoji: string;
  colors: string[];
  accentHex: string;
  label: string;
}

const VFX_PALETTES: Record<string, string[]> = {
  "vfx-cyber-spark": ["#00F2FE", "#4FACFE", "#38BDF8", "#FF6AD5"],
  "vfx-sakura-wave": ["#FF6AD5", "#F472B6", "#00F2FE", "#FDE047"],
  "vfx-matrix-rain": ["#38EF7D", "#10B981", "#00F2FE", "#A7F3D0"],
  "vfx-supernova": ["#FFB800", "#FF5E62", "#00F2FE", "#FFF099"],
};

let sharedAudioCtx: AudioContext | null = null;
let soundEnabled = true;

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

const soundListeners = new Set<(enabled: boolean) => void>();

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  soundListeners.forEach((cb) => cb(enabled));
}

/** Subscribe to sound on/off changes (used by looping game ambience). */
export function onSoundEnabledChange(cb: (enabled: boolean) => void): () => void {
  soundListeners.add(cb);
  return () => {
    soundListeners.delete(cb);
  };
}

/** Shared AudioContext so every Bitlynn module plays through one graph. */
export function getSharedAudioContext(): AudioContext | null {
  return getAudioContext();
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new Ctx();
  }
  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

/**
 * Custom Web Audio synthesizer (zero external assets):
 * - "meeting": Futuristic Hydro-Crystal Gong + Axolotl Bubble Arpeggio
 * - "report": Triple Cyber-Sonar Radar Ping + Shimmer
 * - "vent": Holographic quantum portal whoosh
 */
export function playSoundEffect(kind: SoundEffectKind): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (kind === "meeting") {
      // 1. Sub-hydro portal resonance drop (420Hz -> 110Hz)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = "triangle";
      subOsc.frequency.setValueAtTime(420, now);
      subOsc.frequency.exponentialRampToValueAtTime(110, now + 0.42);
      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.linearRampToValueAtTime(0.26, now + 0.03);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      subOsc.connect(subGain).connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.58);

      // 2. Sparkling Bioluminescent Crystal Arpeggio (C5 - G5 - B5 - D6)
      const notes = [523.25, 783.99, 987.77, 1174.66];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t0 = now + 0.04 + idx * 0.07;
        osc.type = idx % 2 === 0 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(freq, t0);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.015, t0 + 0.25);
        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(0.14, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.48);
      });

      // 3. Cute Axolotl Water-Bubble "bloop-pop" signature at the end
      const pop = ctx.createOscillator();
      const popGain = ctx.createGain();
      const tp = now + 0.28;
      pop.type = "sine";
      pop.frequency.setValueAtTime(540, tp);
      pop.frequency.exponentialRampToValueAtTime(1380, tp + 0.11);
      popGain.gain.setValueAtTime(0.001, tp);
      popGain.gain.linearRampToValueAtTime(0.15, tp + 0.02);
      popGain.gain.exponentialRampToValueAtTime(0.001, tp + 0.14);
      pop.connect(popGain).connect(ctx.destination);
      pop.start(tp);
      pop.stop(tp + 0.16);
      return;
    }

    if (kind === "report") {
      // Triple ascending Sonar Radar Ping
      const pings = [880, 1174.66, 1567.98];
      pings.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t0 = now + idx * 0.085;
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, t0);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.08, t0 + 0.16);
        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(0.16, t0 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.24);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.26);
      });
      return;
    }

    if (kind === "vent") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.24);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.28);
      return;
    }

    if (kind === "success") {
      [587.33, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t0 = now + i * 0.06;
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(0.1, t0 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.22);
      });
      return;
    }

    if (kind === "error") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.exponentialRampToValueAtTime(135, now + 0.16);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
      return;
    }

    // Soft crystal UI tap
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.045);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  } catch {
    // Ignore Web Audio failures in restricted browser environments
  }
}

export function triggerTapFeedback(kind: TapFeedbackKind = "tap"): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      if (kind === "success") {
        navigator.vibrate([18, 30, 24]);
      } else if (kind === "error") {
        navigator.vibrate([35, 25, 35]);
      } else {
        navigator.vibrate(10);
      }
    } catch {
      // Ignore vibration errors in restricted browser contexts
    }
  }
}

export function getAnswerVfxConfig(vfxId: string): AnswerVfxConfig {
  const item =
    ANSWER_VFX_ITEMS.find((v) => v.id === vfxId) ?? ANSWER_VFX_ITEMS[0];
  return {
    id: item.id,
    emoji: item.emoji,
    colors: VFX_PALETTES[item.id] ?? VFX_PALETTES["vfx-cyber-spark"],
    accentHex: item.accentHex,
    label: item.name,
  };
}

export function useAnswerVfx(): AnswerVfxConfig {
  const equippedVfx = useBitlynnStore((state) => state.equippedVfx);
  return useMemo(() => getAnswerVfxConfig(equippedVfx), [equippedVfx]);
}
