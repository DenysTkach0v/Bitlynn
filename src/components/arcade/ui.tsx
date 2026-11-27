"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { buildAxoPalette, getAxoGrid, gridToRects, AxoEyes, AxoFrame } from "./axolotlSprite";
import { C, HERO_THEMES, HeroColorId } from "./tokens";
import { sfx, haptic } from "./arcadeAudio";

/* ───────────────────────── theme ───────────────────────── */

export function themeVars(hero: HeroColorId): React.CSSProperties {
  const t = HERO_THEMES[hero];
  return {
    ["--acc" as string]: t.acc,
    ["--acc-pr" as string]: t.pressed,
    ["--acc-on" as string]: t.on,
    ["--acc-soft" as string]: t.soft,
    ["--acc-ring" as string]: t.ring,
  };
}

export const FONT_UI = "var(--font-inter), Inter, system-ui, sans-serif";
export const FONT_MONO = "var(--font-mono), 'JetBrains Mono', monospace";
export const FONT_PIXEL = "var(--font-pixel), 'Pixelify Sans', monospace";

/* ───────────────────────── buttons ───────────────────────── */

type BtnProps = {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  autoFocus?: boolean;
};

/**
 * Одна головна кнопка на екрані: колір героя, 214×56, по центру —
 * між 88 і 302 px по ширині телефона, тобто поза зонами хвату.
 */
export function PrimaryButton({ children, onClick, disabled, ariaLabel, className = "", autoFocus }: BtnProps) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      autoFocus={autoFocus}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        sfx("tap");
        haptic(6);
        onClick?.();
      }}
      whileTap={reduce || disabled ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      className={`arc-primary mx-auto flex h-14 w-[214px] shrink-0 items-center justify-center rounded-2xl text-[16px] font-semibold leading-[22px] outline-none transition-colors disabled:cursor-not-allowed ${className}`}
      style={{ fontFamily: FONT_UI }}
    >
      {children}
    </motion.button>
  );
}

export function SecondaryButton({ children, onClick, disabled, ariaLabel, className = "" }: BtnProps) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        sfx("tap");
        onClick?.();
      }}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      className={`arc-secondary mx-auto flex h-12 w-[214px] shrink-0 items-center justify-center rounded-2xl border text-[16px] font-semibold outline-none ${className}`}
      style={{ fontFamily: FONT_UI, borderColor: C.line, background: C.card, color: C.text }}
    >
      {children}
    </motion.button>
  );
}

export function TextButton({ children, onClick, ariaLabel, className = "", danger }: BtnProps & { danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={() => {
        sfx("tap");
        onClick?.();
      }}
      className={`arc-text mx-auto flex min-h-[48px] items-center justify-center rounded-xl px-4 text-[15px] font-semibold outline-none ${className}`}
      style={{ fontFamily: FONT_UI, color: danger ? C.danger : C.muted }}
    >
      {children}
    </button>
  );
}

export function IconButton({
  children,
  onClick,
  ariaLabel,
  className = "",
  style,
}: BtnProps & { style?: React.CSSProperties }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={() => {
        sfx("tap");
        onClick?.();
      }}
      className={`arc-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border outline-none ${className}`}
      style={{ borderColor: C.line, background: C.card, color: C.text, ...style }}
    >
      {children}
    </button>
  );
}

/* ───────────────────────── quiet HUD ───────────────────────── */

/**
 * Тихий HUD: під час гри — лише пауза по центру й прогрес. Без сердець,
 * таймерів і монет. Сегмент «зроблено» — колір героя незалежно від спроби.
 */
export function QuietHud({
  total,
  done,
  onPause,
  label,
}: {
  total: number;
  done: number;
  onPause: () => void;
  label: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="relative z-10 shrink-0 px-5 pt-3">
      <div className="flex justify-center">
        <IconButton ariaLabel="Пауза" onClick={onPause}>
          <PauseIcon />
        </IconButton>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="mt-[14px] flex gap-1"
      >
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className="relative h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: C.line }}>
            {i === done && <div className="absolute inset-0" style={{ background: C.text }} />}
            <motion.div
              className="absolute inset-0 origin-left"
              style={{ background: "var(--acc)" }}
              initial={false}
              animate={{ scaleX: i < done ? 1 : 0 }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 26 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── bottom sheet ───────────────────────── */

export function Sheet({
  open,
  children,
  label,
  onBackdrop,
  dim = 0.55,
}: {
  open: boolean;
  children: React.ReactNode;
  label: string;
  onBackdrop?: () => void;
  dim?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="dim"
            aria-hidden="true"
            className="absolute inset-0 z-30"
            style={{ background: `rgba(6,7,10,${dim})` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            onClick={onBackdrop}
          />
          <motion.section
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className="absolute inset-x-0 bottom-0 z-40 flex max-h-[92%] flex-col rounded-t-[24px] border-t"
            style={{ background: C.card, borderColor: C.line }}
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            transition={reduce ? { duration: 0.12 } : { type: "spring", stiffness: 380, damping: 36 }}
          >
            <div aria-hidden="true" className="mx-auto mt-2.5 h-1 w-11 shrink-0 rounded-full" style={{ background: C.line }} />
            {children}
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}

/* ───────────────────────── axolotl ───────────────────────── */

export function AxoAvatar({
  hoodie,
  px = 4,
  eyes = "normal",
  frame = "idle",
  className = "",
  title,
}: {
  hoodie: string;
  px?: number;
  eyes?: AxoEyes;
  frame?: AxoFrame;
  className?: string;
  title?: string;
}) {
  const rects = useMemo(() => gridToRects(getAxoGrid(frame, eyes), buildAxoPalette(hoodie)), [hoodie, eyes, frame]);
  return (
    <svg
      viewBox="0 0 16 22"
      width={16 * px}
      height={22 * px}
      shapeRendering="crispEdges"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}

/* ───────────────────────── icons ───────────────────────── */

export function PauseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="4" y="3" width="3.5" height="12" rx="1" fill="currentColor" />
      <rect x="10.5" y="3" width="3.5" height="12" rx="1" fill="currentColor" />
    </svg>
  );
}

export function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8.5 6.5 12 13 4.5" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RetryIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M12.5 6A5 5 0 1 0 13 9.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M13 2.5V6H9.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LockIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 8h3l4-3.5v11L6 12H3z" fill="currentColor" />
      {on ? (
        <path d="M13 7a4 4 0 0 1 0 6M15.5 5a7 7 0 0 1 0 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      ) : (
        <path d="m13 8 4 4m0-4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      )}
    </svg>
  );
}

/** Pixel coin = «біт». */
export function BitIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="2" y="0" width="4" height="1" fill="#F2C14E" />
      <rect x="1" y="1" width="6" height="6" fill="#F2C14E" />
      <rect x="0" y="2" width="8" height="4" fill="#F2C14E" />
      <rect x="2" y="7" width="4" height="1" fill="#F2C14E" />
      <rect x="2" y="2" width="3" height="4" fill="#FFD86B" />
      <rect x="4" y="2" width="1" height="4" fill="#C98B2E" />
    </svg>
  );
}

export function XpIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size * 0.72} height={size} viewBox="0 0 5 7" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="3" y="0" width="2" height="1" fill={C.xp} />
      <rect x="2" y="1" width="2" height="1" fill={C.xp} />
      <rect x="1" y="2" width="2" height="1" fill={C.xp} />
      <rect x="0" y="3" width="5" height="1" fill={C.xp} />
      <rect x="2" y="4" width="2" height="1" fill={C.xp} />
      <rect x="1" y="5" width="2" height="1" fill={C.xp} />
      <rect x="0" y="6" width="2" height="1" fill={C.xp} />
    </svg>
  );
}

export function WaveIcon({ size = 20, color = C.wave }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M2 12c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M2 16c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}

/* ───────────────────────── misc ───────────────────────── */

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex h-7 items-center rounded-lg px-2.5 text-[13px]"
      style={{ fontFamily: FONT_MONO, background: C.line, color: C.text }}
    >
      {children}
    </span>
  );
}

/** Animated count-up, started only after the child reaches the result (a response, not ambient motion). */
export function useCountUp(target: number, run: boolean, ms = 700, onTick?: () => void): number {
  const reduce = useReducedMotion();
  const [val, setVal] = useState(reduce ? target : 0);
  const tickRef = useRef(onTick);
  tickRef.current = onTick;
  useEffect(() => {
    if (!run) return;
    if (reduce) {
      setVal(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    let lastShown = -1;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - k, 3);
      const v = Math.round(target * eased);
      if (v !== lastShown) {
        lastShown = v;
        setVal(v);
        if (v % 3 === 0) tickRef.current?.();
      }
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, run, ms, reduce]);
  return val;
}

/** Pixel confetti — used only for a rank-up or the weekly wave goal. */
export function PixelBurst({ colors, count = 28, originY = "40%" }: { colors: string[]; count?: number; originY?: string }) {
  const reduce = useReducedMotion();
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 90 + Math.random() * 110;
        return {
          x: Math.cos(a) * dist,
          y: Math.sin(a) * dist - 40,
          c: colors[i % colors.length],
          s: 4 + Math.round(Math.random() * 2) * 2,
          r: Math.random() * 0.15,
        };
      }),
    [colors, count]
  );
  if (reduce) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute left-1/2 z-50" style={{ top: originY }}>
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute block"
          style={{ width: b.s, height: b.s, background: b.c, left: -b.s / 2, top: -b.s / 2 }}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{ x: b.x, y: [0, b.y, b.y + 120], opacity: [1, 1, 0] }}
          transition={{ duration: 1.3, delay: b.r, ease: "easeOut", times: [0, 0.45, 1] }}
        />
      ))}
    </div>
  );
}
