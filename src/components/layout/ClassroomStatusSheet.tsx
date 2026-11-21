"use client";

import React, { useEffect, useRef, useState } from "react";
import { RefreshCw, Volume2, VolumeX, UserCheck, KeyRound } from "lucide-react";
import { useBitlynnStore } from "@/store/useBitlynnStore";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { triggerTapFeedback } from "@/lib/feedback";

export interface ClassroomStatusSheetProps {
  open: boolean;
  onClose: () => void;
  onShowToast?: (
    message: string,
    tone?: "success" | "error" | "info"
  ) => void;
}

export const ClassroomStatusSheet: React.FC<ClassroomStatusSheetProps> = ({
  open,
  onClose,
  onShowToast,
}) => {
  const {
    userRole,
    setUserRole,
    roomPin,
    joinRoomByPin,
    regenerateRoomPin,
    noiseLevelDb,
    setNoiseLevelDb,
    templates,
    activeTemplateId,
    studentProfile,
    updateStudentProfile,
    setActiveTab,
  } = useBitlynnStore();

  const [pinInput, setPinInput] = useState("");
  const [pinFeedback, setPinFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const [draftName, setDraftName] = useState(studentProfile.name);
  const [draftGrade, setDraftGrade] = useState(studentProfile.grade);
  const [draftCallsign, setDraftCallsign] = useState(studentProfile.callsign);
  const [profileSaved, setProfileSaved] = useState(false);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;
    if (justOpened) {
      setDraftName(studentProfile.name);
      setDraftGrade(studentProfile.grade);
      setDraftCallsign(studentProfile.callsign);
      setPinFeedback(null);
      setProfileSaved(false);
    }
  }, [open, studentProfile]);

  const activeTemplate =
    templates.find((t) => t.id === activeTemplateId) ?? templates[0];
  const isNoisy = noiseLevelDb >= 65;

  const handleJoinPin = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = joinRoomByPin(pinInput);
    if (ok) {
      triggerTapFeedback("success");
      setPinFeedback({
        ok: true,
        text: `Підключено до кімнати #${pinInput.trim()}!`,
      });
      setPinInput("");
      onShowToast?.(`Підключено до кімнати #${pinInput.trim()}`, "success");
    } else {
      triggerTapFeedback("error");
      setPinFeedback({
        ok: false,
        text: "Введи рівно 4 цифри PIN-коду кімнати.",
      });
    }
  };

  const handleRegeneratePin = () => {
    const next = regenerateRoomPin();
    triggerTapFeedback("success");
    setPinFeedback({
      ok: true,
      text: `Новий PIN кімнати згенеровано: #${next}`,
    });
    onShowToast?.(`Новий PIN кімнати: #${next}`, "info");
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateStudentProfile({
      name: draftName,
      grade: draftGrade,
      callsign: draftCallsign,
    });
    triggerTapFeedback("success");
    setProfileSaved(true);
    onShowToast?.("Профіль учня збережено!", "success");
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Класна кімната та профіль"
      subtitle="Керування роллю, PIN-кодом, тишею в класі та профілем"
    >
      <div className="space-y-4">
        {/* 1. Role Switcher */}
        <section className="space-y-2">
          <div className="text-xs font-medium text-slate-400">
            Режим роботи
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                triggerTapFeedback("tap");
                setUserRole("student");
              }}
              aria-pressed={userRole === "student"}
              className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                userRole === "student"
                  ? "border-cyan-400/45 bg-cyan-500/15 text-white"
                  : "border-white/[0.08] bg-abyss-950/70 text-slate-400 hover:text-white"
              }`}
            >
              Учень
            </button>
            <button
              type="button"
              onClick={() => {
                triggerTapFeedback("tap");
                setUserRole("teacher");
              }}
              aria-pressed={userRole === "teacher"}
              className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                userRole === "teacher"
                  ? "border-cyan-400/45 bg-cyan-500/15 text-white"
                  : "border-white/[0.08] bg-abyss-950/70 text-slate-400 hover:text-white"
              }`}
            >
              Вчитель
            </button>
          </div>

          {userRole === "teacher" && (
            <button
              type="button"
              onClick={() => {
                triggerTapFeedback("tap");
                setActiveTab("teacher-templates");
                onClose();
              }}
              className="min-h-[44px] w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-cyan-200 transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              Відкрити Хаб вчителя →
            </button>
          )}
        </section>

        {/* 2. Room PIN */}
        <section className="space-y-2.5 rounded-2xl border border-white/[0.07] bg-abyss-950/60 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
              <KeyRound className="h-3.5 w-3.5 text-cyan-300" />
              <span>Кімната</span>
              <span className="font-mono text-cyan-300">#{roomPin}</span>
            </div>
            <span className="truncate text-xs text-slate-400">
              {activeTemplate?.title ?? "Базовий урок"}
            </span>
          </div>

          <form onSubmit={handleJoinPin} className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pinInput}
              onChange={(e) =>
                setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              placeholder="PIN (4 цифри)"
              aria-label="4-значний PIN кімнати"
              className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-white/10 bg-abyss-900 px-3 py-2 font-mono text-base tracking-[0.2em] text-white placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:text-sm"
            />
            <button
              type="submit"
              className="min-h-[44px] shrink-0 rounded-xl bg-cyan-500/20 border border-cyan-400/40 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-cyan-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              Увійти
            </button>
          </form>

          {pinFeedback && (
            <p
              className={`text-xs ${
                pinFeedback.ok ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {pinFeedback.text}
            </p>
          )}

          <button
            type="button"
            onClick={handleRegeneratePin}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-abyss-900 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
            Згенерувати новий PIN кімнати
          </button>
        </section>

        {/* 3. Noise Quick-Status */}
        <section className="space-y-2.5 rounded-2xl border border-white/[0.07] bg-abyss-950/60 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white">
              {isNoisy ? (
                <Volume2 className="h-3.5 w-3.5 text-rose-300" />
              ) : (
                <VolumeX className="h-3.5 w-3.5 text-emerald-300" />
              )}
              Шум у класі
            </span>
            <span
              className={`font-mono text-xs font-semibold ${
                isNoisy ? "text-rose-300" : "text-emerald-300"
              }`}
            >
              {noiseLevelDb} дБ · {isNoisy ? "Шумно" : "Тиша x1.5"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Тихо (38)", db: 38 },
              { label: "Норма (52)", db: 52 },
              { label: "Шум (74)", db: 74 },
            ].map((preset) => {
              const selected = Math.abs(noiseLevelDb - preset.db) <= 4;
              return (
                <button
                  key={preset.db}
                  type="button"
                  onClick={() => {
                    triggerTapFeedback("tap");
                    setNoiseLevelDb(preset.db);
                  }}
                  className={`min-h-[44px] rounded-xl border px-2 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                    selected
                      ? "border-cyan-400/45 bg-cyan-500/15 text-white"
                      : "border-white/[0.08] bg-abyss-900 text-slate-300 hover:border-white/20"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              triggerTapFeedback("tap");
              setActiveTab("teacher-templates");
              onClose();
            }}
            className="min-h-[44px] w-full rounded-xl border border-white/[0.08] bg-abyss-900 px-3 py-2 text-center text-xs font-medium text-slate-200 transition-colors hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            Відкрити шумомір у Хабі вчителя →
          </button>
        </section>

        {/* 4. Student Profile Editor */}
        <form
          onSubmit={handleSaveProfile}
          className="space-y-3 rounded-2xl border border-white/[0.07] bg-abyss-950/60 p-3.5"
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <UserCheck className="h-3.5 w-3.5 text-emerald-300" />
            Профіль учня
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <label className="space-y-1 text-xs text-slate-400">
              <span>Ім&apos;я</span>
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Олександр"
                className="min-h-[44px] w-full rounded-xl border border-white/10 bg-abyss-900 px-3 py-2 text-base text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:text-sm"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-400">
              <span>Клас</span>
              <input
                type="text"
                value={draftGrade}
                onChange={(e) => setDraftGrade(e.target.value)}
                placeholder="7-А"
                className="min-h-[44px] w-full rounded-xl border border-white/10 bg-abyss-900 px-3 py-2 text-base text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:text-sm"
              />
            </label>
          </div>

          <label className="block space-y-1 text-xs text-slate-400">
            <span>Анонімний позивний (для міжшкільної біржі)</span>
            <input
              type="text"
              value={draftCallsign}
              onChange={(e) => setDraftCallsign(e.target.value)}
              placeholder="Кібер-Аксолотль #901"
              className="min-h-[44px] w-full rounded-xl border border-white/10 bg-abyss-900 px-3 py-2 text-base text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:text-sm"
            />
          </label>

          <button
            type="submit"
            className="min-h-[44px] w-full rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            Зберегти профіль
          </button>

          {profileSaved && (
            <p className="text-xs text-emerald-300">
              Профіль оновлено: {studentProfile.name} ({studentProfile.grade})
            </p>
          )}
        </form>
      </div>
    </BottomSheet>
  );
};
