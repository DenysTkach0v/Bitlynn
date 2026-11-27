"use client";

import React, { useEffect, useState } from "react";
import { C, HERO_ORDER, RANKS, fmt, rankFor } from "@/components/arcade/tokens";
import { useArcadeStore } from "@/components/arcade/useArcadeStore";
import { FONT_MONO } from "@/components/arcade/ui";
import { sfx } from "@/components/arcade/arcadeAudio";
import { ITEM_NAMES } from "./ShopProfileScreens";

/**
 * Developer test panel (not for kids). Opens with `?dev=1` in the address,
 * or with 5 quick taps on the rank badge in the room. Stays on until «Сховати».
 */
const KEY = "bitlynn-dev";

export function useDevMode() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("dev") === "1";
    if (fromUrl) localStorage.setItem(KEY, "1");
    setOn(fromUrl || localStorage.getItem(KEY) === "1");
  }, []);
  const set = (v: boolean) => {
    if (v) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
    setOn(v);
  };
  return { on, set };
}

/** 5 taps within 1.5 s → toggles the panel. */
export function useSecretTaps(onUnlock: () => void, taps = 5, windowMs = 1500) {
  const [hits, setHits] = useState<number[]>([]);
  return () => {
    const now = Date.now();
    const recent = [...hits.filter((t) => now - t < windowMs), now];
    if (recent.length >= taps) {
      setHits([]);
      onUnlock();
    } else setHits(recent);
  };
}

export function DevPanel({ onClose }: { onClose: () => void }) {
  const xp = useArcadeStore((s) => s.xp);
  const bits = useArcadeStore((s) => s.bits);
  const [open, setOpen] = useState(true);

  const set = (patch: Partial<ReturnType<typeof useArcadeStore.getState>>) => {
    sfx("tap");
    useArcadeStore.setState(patch);
  };
  const btn = "h-11 rounded-xl border px-3 text-[13px] font-semibold outline-none";
  const btnStyle = { borderColor: C.line, background: C.bg, color: C.text } as const;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute bottom-3 left-1/2 z-[80] h-9 -translate-x-1/2 rounded-full border px-4 text-[12px] font-bold outline-none"
        style={{ fontFamily: FONT_MONO, borderColor: "#FFB86B", background: "#2A2116", color: "#FFB86B" }}
      >
        DEV
      </button>
    );
  }

  return (
    <div className="absolute inset-x-3 bottom-3 z-[80] flex flex-col gap-2.5 rounded-2xl border p-3" style={{ background: C.card, borderColor: "#FFB86B" }}>
      <div className="flex items-center justify-between">
        <b className="text-[13px]" style={{ fontFamily: FONT_MONO, color: "#FFB86B" }}>
          РЕЖИМ РОЗРОБНИКА
        </b>
        <span className="text-[12px]" style={{ fontFamily: FONT_MONO, color: C.muted }}>
          {fmt(xp)} XP · {rankFor(xp).label} · {fmt(bits)} біт
        </span>
      </div>

      <span className="text-[12px]" style={{ color: C.muted }}>
        Ранг (відкриває кімнати й ігри)
      </span>
      <div className="grid grid-cols-4 gap-2">
        {RANKS.map((r) => (
          <button key={r.id} type="button" className={btn} style={{ ...btnStyle, borderColor: rankFor(xp).id === r.id ? "var(--acc)" : C.line }} onClick={() => set({ xp: r.xp })}>
            {r.label}
          </button>
        ))}
      </div>

      <span className="text-[12px]" style={{ color: C.muted }}>
        Біти
      </span>
      <div className="grid grid-cols-4 gap-2">
        <button type="button" className={btn} style={btnStyle} onClick={() => set({ bits: bits + 100 })}>
          +100
        </button>
        <button type="button" className={btn} style={btnStyle} onClick={() => set({ bits: bits + 1000 })}>
          +1 000
        </button>
        <button type="button" className={btn} style={btnStyle} onClick={() => set({ bits: bits + 10000 })}>
          +10 000
        </button>
        <button type="button" className={btn} style={btnStyle} onClick={() => set({ bits: 0 })}>
          0
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={btn}
          style={btnStyle}
          onClick={() => set({ xp: Math.max(xp, RANKS[RANKS.length - 1].xp), ownedHeroes: [...HERO_ORDER], ownedItems: Object.keys(ITEM_NAMES), bits: Math.max(bits, 99999) })}
        >
          Відкрити все
        </button>
        <button
          type="button"
          className={btn}
          style={{ ...btnStyle, color: C.danger }}
          onClick={() => {
            sfx("tap");
            localStorage.removeItem("bitlynn-mobile-v1");
            localStorage.removeItem(KEY);
            window.location.href = window.location.pathname;
          }}
        >
          Скинути прогрес
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={btn} style={btnStyle} onClick={() => setOpen(false)}>
          Згорнути
        </button>
        <button
          type="button"
          className={btn}
          style={btnStyle}
          onClick={() => {
            sfx("tap");
            onClose();
          }}
        >
          Вимкнути режим
        </button>
      </div>
    </div>
  );
}
