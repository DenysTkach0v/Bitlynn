"use client";

import React from "react";
import { C } from "./tokens";
import { FONT_UI, PrimaryButton, SecondaryButton, SoundIcon, TextButton } from "./ui";
import { useArcadeStore } from "./useArcadeStore";
import { setSoundEnabled } from "@/lib/feedback";

/** Спільний екран №3 — пауза. Червоний — лише на «Вийти без збереження». */
export function PauseSheetBody({
  progressLabel,
  onResume,
  onRestart,
  onQuit,
}: {
  progressLabel: string;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}) {
  const soundOn = useArcadeStore((s) => s.soundOn);
  const setSound = useArcadeStore((s) => s.setSound);

  return (
    <div className="flex flex-col px-5 pt-4" style={{ fontFamily: FONT_UI, paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>
      <h2 className="text-[24px] font-bold leading-[30px]" style={{ color: C.text }}>
        Пауза
      </h2>
      <span className="mt-1 text-[14px]" style={{ color: C.muted }}>
        {progressLabel}
      </span>

      {/* увесь рядок 64 px — ціль натискання, а не маленький тумблер */}
      <button
        type="button"
        role="switch"
        aria-checked={soundOn}
        onClick={() => {
          setSound(!soundOn);
          setSoundEnabled(!soundOn);
        }}
        className="arc-card mt-4 flex h-16 items-center gap-3 rounded-2xl border px-4 text-left outline-none"
        style={{ borderColor: C.line, background: C.bg, color: C.text }}
      >
        <SoundIcon on={soundOn} />
        <span className="flex-1 text-[16px] font-semibold">Звук</span>
        <span className="relative h-8 w-14 rounded-full transition-colors" style={{ background: soundOn ? "var(--acc)" : C.line }}>
          <span
            className="absolute top-1 h-6 w-6 rounded-full transition-all"
            style={{ left: soundOn ? 28 : 4, background: soundOn ? "var(--acc-on)" : C.muted }}
          />
        </span>
      </button>

      <p className="mt-3 text-[14px] leading-[21px]" style={{ color: C.muted }}>
        Прогрес раунду збережеться, якщо ти продовжиш або почнеш знову.
      </p>

      <div className="mt-5 flex flex-col gap-3">
        <PrimaryButton autoFocus onClick={onResume}>
          Продовжити
        </PrimaryButton>
        <SecondaryButton onClick={onRestart}>Почати знову</SecondaryButton>
        <TextButton danger onClick={onQuit}>
          Вийти без збереження
        </TextButton>
      </div>
    </div>
  );
}
