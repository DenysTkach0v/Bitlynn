"use client";

import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ART } from "./art.generated";
import { C, fmt } from "@/components/arcade/tokens";
import { BitIcon, FONT_MONO, FONT_UI } from "@/components/arcade/ui";
import { sfx, haptic } from "@/components/arcade/arcadeAudio";
import { useArcadeStore } from "@/components/arcade/useArcadeStore";

/** Pixel art taken 1:1 from the «Мобільна версія 4.0» canvas (sanitized SVG). */
export function Art({
  name,
  className = "",
  style,
  recolor,
}: {
  name: string;
  className?: string;
  style?: React.CSSProperties;
  /** swap exact fill colours, e.g. paint the desk chair in the hero colour */
  recolor?: Record<string, string>;
}) {
  let svg = ART[name];
  if (!svg) return null;
  if (recolor) for (const [from, to] of Object.entries(recolor)) svg = svg.split(`fill="${from}"`).join(`fill="${to}"`);
  return (
    <span
      aria-hidden="true"
      className={`block leading-none [&>svg]:block [&>svg]:[image-rendering:pixelated] ${className}`}
      style={style}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export const W = 390;
export const H = 844;

/**
 * The whole app is drawn on the 390×844 phone the canvas uses, then scaled to
 * fit the real screen. Every position from the design stays exact.
 */
export function Stage({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / W, window.innerHeight / H));
    fit();
    window.addEventListener("resize", fit);
    const ro = new ResizeObserver(fit);
    ro.observe(document.documentElement);
    return () => {
      window.removeEventListener("resize", fit);
      ro.disconnect();
    };
  }, []);
  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden" style={{ background: "#08090C" }}>
      <div style={{ width: W * scale, height: H * scale }} className="relative">
        <div
          className="arcade-root absolute left-0 top-0 overflow-hidden"
          style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left", background: C.bg, color: C.text, ...style }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** Absolute box in design coordinates. */
export function At({
  x,
  y,
  w,
  h,
  r,
  children,
  className = "",
  style,
}: {
  x?: number;
  y: number;
  w?: number;
  h?: number;
  r?: number;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`absolute ${className}`} style={{ left: x, top: y, width: w, height: h, right: r, ...style }}>
      {children}
    </div>
  );
}

export function BitsChip() {
  const bits = useArcadeStore((s) => s.bits);
  return (
    <span
      className="flex h-10 items-center gap-1.5 rounded-[10px] border px-3 text-[15px] font-bold"
      style={{ fontFamily: FONT_MONO, background: C.card, borderColor: C.line }}
      aria-label={`${bits} біт`}
    >
      <BitIcon size={14} />
      {fmt(bits)}
      <span className="text-[13px] font-medium" style={{ color: C.muted }}>
        біт
      </span>
    </span>
  );
}

export function SquareButton({
  label,
  onClick,
  children,
  x = 12,
  y = 12,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  x?: number;
  y?: number;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        sfx("tap");
        onClick();
      }}
      className="arc-icon absolute flex h-12 w-12 items-center justify-center rounded-xl border outline-none"
      style={{ left: x, top: y, borderColor: C.line, background: C.card, color: C.text }}
    >
      {children}
    </button>
  );
}

export function BackChevron() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function PowerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v9" />
      <path d="M6.4 6.4a8 8 0 1 0 11.2 0" />
    </svg>
  );
}

/** The one primary action of a screen: hero colour, 214×56 at x 88, y 676 (outside thumb corners). */
export function Cta({
  children,
  onClick,
  disabled,
  y = 676,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        sfx("tap");
        haptic(6);
        onClick();
      }}
      whileTap={reduce || disabled ? undefined : { scale: 0.96 }}
      className="arc-primary absolute flex h-14 w-[214px] items-center justify-center rounded-[14px] text-[17px] font-bold outline-none disabled:cursor-not-allowed"
      style={{ left: 88, top: y, fontFamily: FONT_UI }}
    >
      {children}
    </motion.button>
  );
}

export function Toast({ text }: { text: string | null }) {
  const reduce = useReducedMotion();
  if (!text) return null;
  return (
    <motion.div
      key={text}
      role="status"
      className="absolute left-5 right-5 top-[620px] z-50 rounded-xl border px-4 py-3 text-center text-[14px]"
      style={{ background: C.card, borderColor: C.line, color: C.text }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {text}
    </motion.div>
  );
}
