"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Trophy,
  ShieldCheck,
  Wand2,
  Play,
  AlertTriangle,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { LynnHoloCompanion } from "@/components/LynnHoloCompanion";
import { AnswerVfxOverlay } from "@/components/ui/AnswerVfxOverlay";
import {
  ANSWER_VFX_ITEMS,
  LYNN_SKINS,
  LynnMood,
  SanctumSection,
  useBitlynnStore,
} from "@/store/useBitlynnStore";
import { triggerTapFeedback } from "@/lib/feedback";

const SANCTUM_TABS: { id: SanctumSection; label: string }[] = [
  { id: "market", label: "Маркет і Лінн" },
  { id: "blitz", label: "60-сек тести" },
  { id: "tournaments", label: "Турніри" },
];

const MOOD_OPTIONS: { id: LynnMood; label: string }[] = [
  { id: "sleeping", label: "Спить" },
  { id: "curious", label: "Цікавиться" },
  { id: "coding", label: "Кодить" },
  { id: "debugging", label: "Дебаг" },
  { id: "triumph", label: "Тріумф" },
];

export const SanctumHub: React.FC = () => {
  const {
    sanctumSection,
    setSanctumSection,
    bits,
    bytes,
    lynnMood,
    equippedSkin,
    unlockedSkins,
    equippedVfx,
    unlockedVfx,
    regenerationCount,
    masteryRank,
    funBlitzList,
    completedBlitzIds,
    tournamentSquads,
    squadFeed,
    tournamentCadence,
    setTournamentCadence,
    synthesizeByte,
    setLynnMood,
    unlockSkin,
    unlockAndEquipVfx,
    submitFunBlitz,
    recordFunBlitzPlay,
    contributeSquadPoints,
    createTournamentSquad,
    joinTournamentSquad,
    setActiveTab,
  } = useBitlynnStore();

  const [synthPulse, setSynthPulse] = useState(false);
  const synthTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewSkinId, setPreviewSkinId] = useState<string | null>(null);
  const [vfxTrigger, setVfxTrigger] = useState(0);
  const [previewVfxId, setPreviewVfxId] = useState<string | null>(null);

  // Fun 60-sec Blitz player & creator state
  const [activeBlitzId, setActiveBlitzId] = useState<string | null>(null);
  const [blitzQuestionIdx, setBlitzQuestionIdx] = useState(0);
  const [blitzOutcomeText, setBlitzOutcomeText] = useState<string | null>(null);
  const [newBlitzTitle, setNewBlitzTitle] = useState("");
  const [newBlitzQ, setNewBlitzQ] = useState("");
  const [newBlitzOpt1, setNewBlitzOpt1] = useState("");
  const [newBlitzOpt2, setNewBlitzOpt2] = useState("");
  const [newBlitzFeedback, setNewBlitzFeedback] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  const [tournamentBoostMsg, setTournamentBoostMsg] = useState<string | null>(
    null
  );
  const [showSquadCreator, setShowSquadCreator] = useState(false);
  const [newSquadName, setNewSquadName] = useState("");
  const [newSquadMotto, setNewSquadMotto] = useState("");

  useEffect(() => {
    return () => {
      if (synthTimerRef.current) {
        clearTimeout(synthTimerRef.current);
      }
    };
  }, []);

  const handleSynthesize = () => {
    const ok = synthesizeByte();
    if (ok) {
      triggerTapFeedback("success");
      setSynthPulse(true);
      if (synthTimerRef.current) {
        clearTimeout(synthTimerRef.current);
      }
      synthTimerRef.current = setTimeout(() => {
        setSynthPulse(false);
      }, 600);
    }
  };

  const handleSubmitFunBlitz = (e: React.FormEvent) => {
    e.preventDefault();
    const res = submitFunBlitz({
      title: newBlitzTitle,
      questionText: newBlitzQ,
      options: [newBlitzOpt1, newBlitzOpt2],
      funOutcome: "Легенда позитивного настрою класу! ✨",
    });

    if (res.ok) {
      triggerTapFeedback("success");
      setNewBlitzTitle("");
      setNewBlitzQ("");
      setNewBlitzOpt1("");
      setNewBlitzOpt2("");
      setNewBlitzFeedback({
        ok: true,
        msg: "Тест надіслано вчителю на перевірку (50 коїнів списано).",
      });
    } else {
      triggerTapFeedback("error");
      setNewBlitzFeedback({
        ok: false,
        msg: res.reason ?? "Помилка відправлення тесту.",
      });
    }
  };

  const handleBoostSquad = () => {
    const userSquad = tournamentSquads.find((s) => s.isUserSquad);
    const ok = contributeSquadPoints(25);
    if (ok) {
      triggerTapFeedback("success");
      setTournamentBoostMsg(
        `+75 турнірних очок додано команді «${
          userSquad?.name ?? "Кібер-Козаки 7-А"
        }»!`
      );
    } else {
      triggerTapFeedback("error");
      setTournamentBoostMsg("Потрібно щонайменше 25 коїнів для внеску.");
    }
  };

  const handleCreateSquad = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSquadName.trim()) return;
    const ok = createTournamentSquad(newSquadName, newSquadMotto);
    if (ok) {
      triggerTapFeedback("success");
      setTournamentBoostMsg(
        `Команду «${newSquadName.trim()}» створено та додано до рейтингу.`
      );
      setNewSquadName("");
      setNewSquadMotto("");
      setShowSquadCreator(false);
    }
  };

  const approvedBlitzes = funBlitzList.filter((b) => b.status === "approved");
  const activeBlitz =
    approvedBlitzes.find((b) => b.id === activeBlitzId) ?? approvedBlitzes[0];
  const currentBlitzQuestion =
    activeBlitz?.questions[blitzQuestionIdx] ?? activeBlitz?.questions[0];

  return (
    <div className="relative overflow-hidden space-y-6">
      <AnswerVfxOverlay
        trigger={vfxTrigger}
        vfxId={previewVfxId ?? undefined}
      />

      {/* Clean 3-Tab Segmented Switcher */}
      <div
        role="tablist"
        aria-label="Розділи Маркету Bitlynn"
        className="grid grid-cols-3 gap-1 rounded-xl border border-white/[0.08] bg-abyss-900/75 p-1"
      >
        {SANCTUM_TABS.map((tab) => {
          const isSelected = sanctumSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => {
                triggerTapFeedback("tap");
                setSanctumSection(tab.id);
              }}
              className={`min-h-[44px] min-w-0 truncate rounded-lg px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:text-sm ${
                isSelected
                  ? "bg-white/[0.10] text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* =========================================================
          SECTION 1: МАРКЕТ СКІНІВ / VFX & МАСКОТ ЛІНН
      ========================================================= */}
      {sanctumSection === "market" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          {/* Left Column: Self-sized Sticky Lynn Showcase */}
          <div className="flex flex-col items-center rounded-2xl border border-white/[0.08] bg-abyss-900/75 p-5 space-y-5 lg:col-span-4 lg:sticky lg:top-20">
            <div className="flex w-full items-start justify-between gap-2">
              <div>
                <h1 className="font-display text-lg font-bold text-white">
                  Лінн і скіни
                </h1>
                <div className="text-xs text-slate-400">
                  Ранг: <span className="text-slate-200">{masteryRank}</span>
                </div>
              </div>
              <span className="font-mono text-xs text-slate-400">
                Регенерацій: {regenerationCount}
              </span>
            </div>

            <div className="flex flex-col items-center gap-2.5 py-2">
              <LynnHoloCompanion
                size="lg"
                overrideSkin={previewSkinId ?? undefined}
              />
              {previewSkinId && previewSkinId !== equippedSkin && (
                <button
                  type="button"
                  onClick={() => setPreviewSkinId(null)}
                  className="min-h-[44px] rounded-xl border border-white/10 bg-abyss-950/75 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:border-white/25"
                >
                  Повернути одягнений скін
                </button>
              )}
            </div>

            {/* Clean Ukrainian Mood Switcher (even wrap without orphan cell) */}
            <div className="w-full space-y-2 border-t border-white/[0.06] pt-4">
              <div className="text-xs text-slate-400">Емоція Лінн</div>
              <div className="flex flex-wrap gap-1.5">
                {MOOD_OPTIONS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      triggerTapFeedback("tap");
                      setLynnMood(m.id);
                    }}
                    className={`min-h-[44px] flex-1 basis-[45%] rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:basis-[30%] lg:basis-[45%] ${
                      lynnMood === m.id
                        ? "border-cyan-400/45 bg-cyan-500/15 text-white"
                        : "border-white/[0.08] bg-abyss-950/65 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Byte Synthesizer, Skins & Answer VFX */}
          <div className="space-y-5 lg:col-span-8">
            {/* Byte Synthesizer */}
            <section className="rounded-2xl border border-white/[0.08] bg-abyss-900/75 p-5 space-y-4">
              <div>
                <h2 className="font-display text-base font-semibold text-white">
                  Синтезатор байтів
                </h2>
                <p className="text-xs text-slate-400">
                  Обміняй 100 коїнів на 1 байт для відкриття скінів.
                </p>
              </div>

              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <div className="flex-1 space-y-1.5 rounded-xl border border-white/[0.06] bg-abyss-950/70 p-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Заряд</span>
                    <span className="font-mono font-semibold text-slate-200">
                      {bits} / 100
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-abyss-900">
                    <motion.div
                      className="h-full rounded-full bg-cyan-400"
                      animate={{
                        width: `${Math.min(100, (bits / 100) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  animate={synthPulse ? { scale: [1, 1.04, 1] } : undefined}
                  disabled={bits < 100}
                  onClick={handleSynthesize}
                  className={`inline-flex min-h-[46px] shrink-0 items-center justify-center gap-2 rounded-xl border px-5 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                    bits >= 100
                      ? "border-cyan-400/45 bg-cyan-500/20 text-white hover:bg-cyan-500/30"
                      : "cursor-not-allowed border-white/[0.06] bg-abyss-950/40 text-slate-500"
                  }`}
                >
                  <Sparkles className="h-4 w-4 text-cyan-300" />
                  Синтезувати байт
                </motion.button>
              </div>
            </section>

            {/* Skin Wardrobe */}
            <section className="rounded-2xl border border-white/[0.08] bg-abyss-900/75 p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-base font-semibold text-white">
                  Скіни Лінн (за байти)
                </h2>
                <span className="font-mono text-xs text-slate-400">
                  {unlockedSkins.length}/{LYNN_SKINS.length}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {LYNN_SKINS.map((skin) => {
                  const isUnlocked = unlockedSkins.includes(skin.id);
                  const isEquipped = equippedSkin === skin.id;
                  const canAfford = bytes >= skin.byteCost;

                  return (
                    <div
                      key={skin.id}
                      className={`flex flex-col justify-between rounded-xl border p-4 transition-colors ${
                        isEquipped
                          ? "border-cyan-400/40 bg-abyss-950/90"
                          : "border-white/[0.07] bg-abyss-950/60"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/20"
                              style={{
                                background: `linear-gradient(135deg, ${skin.primaryHex}, ${skin.gillHex})`,
                              }}
                            />
                            <h3 className="font-display text-sm font-semibold text-white">
                              {skin.name}
                            </h3>
                          </div>
                          <span className="font-mono text-xs text-slate-400">
                            {skin.byteCost === 0
                              ? "Базовий"
                              : `${skin.byteCost} Б`}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                          {skin.tagline}
                        </p>
                      </div>

                      <div className="mt-3.5 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            triggerTapFeedback("tap");
                            setPreviewSkinId(skin.id);
                          }}
                          className={`min-h-[44px] shrink-0 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                            previewSkinId === skin.id
                              ? "border-cyan-400/45 bg-cyan-500/15 text-white"
                              : "border-white/[0.08] bg-abyss-900 text-slate-300 hover:text-white"
                          }`}
                        >
                          Приміряти
                        </button>

                        <button
                          type="button"
                          disabled={!isUnlocked && !canAfford}
                          onClick={() => {
                            triggerTapFeedback("success");
                            setPreviewSkinId(null);
                            unlockSkin(skin.id, skin.byteCost);
                          }}
                          className={`min-h-[44px] flex-1 rounded-xl border py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                            isEquipped
                              ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                              : isUnlocked
                              ? "border-cyan-400/35 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25"
                              : canAfford
                              ? "border-white/15 bg-white/[0.08] text-white hover:bg-white/[0.14]"
                              : "cursor-not-allowed border-white/[0.05] bg-abyss-900/40 text-slate-500"
                          }`}
                        >
                          {isEquipped
                            ? "Одягнено"
                            : isUnlocked
                            ? "Одягнути"
                            : canAfford
                            ? `Відкрити (${skin.byteCost} Б)`
                            : `Закрито (${skin.byteCost} Б)`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Answer Animation VFX Market */}
            <section className="rounded-2xl border border-white/[0.08] bg-abyss-900/75 p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 shrink-0 text-pink-300" />
                  <h2 className="font-display text-base font-semibold text-white">
                    Ефекти відповідей (за коїни)
                  </h2>
                </div>
                <span className="font-mono text-xs text-slate-400">
                  {unlockedVfx.length}/{ANSWER_VFX_ITEMS.length}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {ANSWER_VFX_ITEMS.map((vfx) => {
                  const isUnlocked = unlockedVfx.includes(vfx.id);
                  const isEquipped = equippedVfx === vfx.id;
                  const canAfford = bits >= vfx.coinCost;

                  return (
                    <div
                      key={vfx.id}
                      className={`flex flex-col justify-between rounded-xl border p-4 transition-colors ${
                        isEquipped
                          ? "border-cyan-400/40 bg-abyss-950/90"
                          : "border-white/[0.07] bg-abyss-950/60"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display text-sm font-semibold text-white">
                            {vfx.emoji} {vfx.name}
                          </span>
                          <span className="font-mono text-xs text-slate-400">
                            {vfx.coinCost === 0
                              ? "Базовий"
                              : `${vfx.coinCost}`}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                          {vfx.tagline}
                        </p>
                      </div>

                      <div className="mt-3.5 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            triggerTapFeedback("tap");
                            setPreviewVfxId(vfx.id);
                            setVfxTrigger((v) => v + 1);
                          }}
                          className="min-h-[44px] shrink-0 rounded-xl border border-white/[0.08] bg-abyss-900 px-3 py-2 text-xs font-medium text-slate-200 hover:border-white/25"
                        >
                          Тест
                        </button>

                        <button
                          type="button"
                          disabled={!isUnlocked && !canAfford}
                          onClick={() => {
                            triggerTapFeedback("success");
                            setPreviewVfxId(vfx.id);
                            setVfxTrigger((v) => v + 1);
                            unlockAndEquipVfx(vfx.id);
                          }}
                          className={`min-h-[44px] flex-1 rounded-xl border py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                            isEquipped
                              ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                              : isUnlocked
                              ? "border-cyan-400/35 bg-cyan-500/15 text-cyan-100"
                              : canAfford
                              ? "border-white/15 bg-white/[0.08] text-white hover:bg-white/[0.14]"
                              : "cursor-not-allowed border-white/[0.05] bg-abyss-900/40 text-slate-500"
                          }`}
                        >
                          {isEquipped
                            ? "Активний"
                            : isUnlocked
                            ? "Увімкнути"
                            : canAfford
                            ? `Купити (${vfx.coinCost})`
                            : `Треба ${vfx.coinCost}`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* =========================================================
          SECTION 2: 60-СЕК СМІШНІ ТЕСТИ
      ========================================================= */}
      {sanctumSection === "blitz" && (
        <div className="mx-auto max-w-4xl space-y-5">
          <div>
            <h1 className="font-display text-xl font-bold text-white sm:text-2xl">
              60-сек смішні тести
            </h1>
            <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
              Короткі жартівливі бліци класу — кожен тест проходить перевірку
              вчителя.
            </p>
          </div>

          {approvedBlitzes.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {approvedBlitzes.map((b) => {
                const selected = activeBlitz?.id === b.id;
                const isDone = completedBlitzIds.includes(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      triggerTapFeedback("tap");
                      setActiveBlitzId(b.id);
                      setBlitzQuestionIdx(0);
                      setBlitzOutcomeText(null);
                    }}
                    className={`min-h-[44px] rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                      selected
                        ? "border-cyan-400/45 bg-cyan-500/15 text-white"
                        : "border-white/[0.08] bg-abyss-900/70 text-slate-300 hover:text-white"
                    }`}
                  >
                    {b.title}
                    {isDone ? " ✓" : ""}
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Approved Blitz */}
          {activeBlitz && (
            <section className="rounded-2xl border border-white/[0.08] bg-abyss-900/75 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                <span className="font-display text-base font-semibold text-white">
                  {activeBlitz.title}
                </span>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="font-mono">
                    {blitzQuestionIdx + 1}/{activeBlitz.questions.length} ·
                    Зіграно: {activeBlitz.playsCount}
                  </span>
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">
                    Перевірено
                  </span>
                </div>
              </div>

              {currentBlitzQuestion && (
                <>
                  <p className="text-sm font-medium leading-relaxed text-slate-100 sm:text-base">
                    {currentBlitzQuestion.q}
                  </p>
                  <div className="space-y-2">
                    {currentBlitzQuestion.options.map((opt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          triggerTapFeedback("success");
                          setPreviewVfxId(null);
                          setVfxTrigger((v) => v + 1);
                          const isLast =
                            blitzQuestionIdx + 1 >=
                            activeBlitz.questions.length;
                          if (!isLast) {
                            setBlitzQuestionIdx((prev) => prev + 1);
                            setBlitzOutcomeText(
                              `Питання ${blitzQuestionIdx + 1} пройдено: ${
                                currentBlitzQuestion.funOutcome
                              }. Відповідай на наступне:`
                            );
                          } else {
                            const firstTime = recordFunBlitzPlay(
                              activeBlitz.id
                            );
                            setBlitzQuestionIdx(0);
                            setBlitzOutcomeText(
                              firstTime
                                ? `Бліц завершено! Титул: ${currentBlitzQuestion.funOutcome} (+25 коїнів)`
                                : `Титул: ${currentBlitzQuestion.funOutcome} (повторне проходження)`
                            );
                          }
                        }}
                        className="min-h-[46px] w-full rounded-xl border border-white/10 bg-abyss-950/75 px-4 py-3 text-left text-xs font-medium text-slate-100 transition-colors hover:border-white/25 hover:bg-abyss-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:text-sm"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {blitzOutcomeText && (
                <div className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                  {blitzOutcomeText}
                </div>
              )}
            </section>
          )}

          {/* Submit New Fun Blitz Form */}
          <form
            onSubmit={handleSubmitFunBlitz}
            className="rounded-2xl border border-white/[0.08] bg-abyss-900/70 p-5 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-sm font-semibold text-white">
                Запропонувати свій тест (50 коїнів)
              </h2>
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" />
            </div>

            <input
              type="text"
              value={newBlitzTitle}
              onChange={(e) => setNewBlitzTitle(e.target.value)}
              placeholder="Назва (напр. Який ти кіт після контрольної?)"
              aria-label="Назва нового смішного тесту"
              className="min-h-[44px] w-full rounded-xl border border-white/10 bg-abyss-950/80 px-3.5 py-2 text-base text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:text-sm"
            />

            <input
              type="text"
              value={newBlitzQ}
              onChange={(e) => setNewBlitzQ(e.target.value)}
              placeholder="Питання для однокласників (добрий гумор, без образ)..."
              aria-label="Текст питання"
              className="min-h-[44px] w-full rounded-xl border border-white/10 bg-abyss-950/80 px-3.5 py-2 text-base text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:text-sm"
            />

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="text"
                value={newBlitzOpt1}
                onChange={(e) => setNewBlitzOpt1(e.target.value)}
                placeholder="Варіант 1"
                aria-label="Варіант відповіді 1"
                className="min-h-[44px] rounded-xl border border-white/10 bg-abyss-950/80 px-3.5 py-2 text-base text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:text-sm"
              />
              <input
                type="text"
                value={newBlitzOpt2}
                onChange={(e) => setNewBlitzOpt2(e.target.value)}
                placeholder="Варіант 2"
                aria-label="Варіант відповіді 2"
                className="min-h-[44px] rounded-xl border border-white/10 bg-abyss-950/80 px-3.5 py-2 text-base text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:text-sm"
              />
            </div>

            <button
              type="submit"
              className="min-h-[44px] w-full rounded-xl border border-cyan-400/40 bg-cyan-500/20 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-cyan-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              Надіслати на перевірку вчителю (50 коїнів)
            </button>

            {newBlitzFeedback && (
              <div
                className={`flex items-center gap-2 rounded-xl border p-3 text-xs ${
                  newBlitzFeedback.ok
                    ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-200"
                    : "border-rose-400/35 bg-rose-500/10 text-rose-200"
                }`}
              >
                {newBlitzFeedback.ok ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                )}
                <span>{newBlitzFeedback.msg}</span>
              </div>
            )}
          </form>
        </div>
      )}

      {/* =========================================================
          SECTION 3: КОМАНДНІ ТУРНІРИ
      ========================================================= */}
      {sanctumSection === "tournaments" && (
        <div className="mx-auto max-w-4xl space-y-5">
          {/* Clean Header + Cadence Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 font-display text-xl font-bold text-white sm:text-2xl">
                <Trophy className="h-5 w-5 text-amber-300" />
                Командні турніри
              </h1>
              <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
                Ігри та допомога на Біржі приносять очки команді за знижку на
                навчання.
              </p>
            </div>

            <div className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-abyss-900/75 p-1">
              <button
                type="button"
                onClick={() => {
                  triggerTapFeedback("tap");
                  setTournamentCadence("monthly");
                }}
                className={`min-h-[44px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  tournamentCadence === "monthly"
                    ? "bg-white/[0.10] text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                1 міс
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerTapFeedback("tap");
                  setTournamentCadence("quarterly");
                }}
                className={`min-h-[44px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  tournamentCadence === "quarterly"
                    ? "bg-white/[0.10] text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                3 міс
              </button>
            </div>
          </div>

          {/* Progress toward 1st place */}
          {(() => {
            const userSquad = tournamentSquads.find((s) => s.isUserSquad);
            const topThreshold = Math.max(
              5000,
              tournamentSquads[0]?.scorePoints ?? 5000
            );
            const userScore = userSquad?.scorePoints ?? 0;
            const progressPct = Math.min(
              100,
              Math.round((userScore / topThreshold) * 100)
            );
            return (
              <div className="rounded-2xl border border-white/[0.08] bg-abyss-900/75 p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-white">
                    Шлях до 1-го місця (-30% знижка)
                  </span>
                  <span className="font-mono font-semibold text-amber-300">
                    {userScore} / {topThreshold} ({progressPct}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-abyss-950">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Clean Ranked Squads */}
          <div className="space-y-2.5">
            {tournamentSquads.map((sq, index) => (
              <div
                key={sq.id}
                className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                  sq.isUserSquad
                    ? "border-amber-400/40 bg-abyss-900"
                    : "border-white/[0.08] bg-abyss-900/65"
                }`}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-amber-300">
                      #{index + 1}
                    </span>
                    <h2 className="font-display text-sm font-semibold text-white sm:text-base">
                      {sq.name}
                    </h2>
                    {sq.isUserSquad && (
                      <span className="rounded-md bg-cyan-500/15 px-2 py-0.5 text-[11px] font-medium text-cyan-200">
                        Твоя команда
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    «{sq.motto}» · {sq.membersCount}/{sq.maxMembers} учасників
                  </p>
                  <p className="text-xs text-amber-200/90">
                    {sq.discountReward}
                  </p>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
                  <span className="font-mono text-sm font-bold text-white">
                    {sq.scorePoints} очок
                  </span>
                  {!sq.isUserSquad && (
                    <button
                      type="button"
                      disabled={sq.membersCount >= sq.maxMembers}
                      onClick={() => {
                        const joined = joinTournamentSquad(sq.id);
                        if (joined) {
                          triggerTapFeedback("success");
                          setTournamentBoostMsg(
                            `Ти приєднався(-лася) до команди «${sq.name}».`
                          );
                        }
                      }}
                      className="min-h-[44px] rounded-xl border border-white/10 bg-abyss-950/75 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-white/25 hover:text-white disabled:opacity-40"
                    >
                      Приєднатися
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Actions Row */}
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleBoostSquad}
                className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl border border-amber-400/45 bg-amber-500/20 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-amber-500/30"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Вкласти 25 коїнів (+75 очок)
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerTapFeedback("tap");
                  setShowSquadCreator((prev) => !prev);
                }}
                className="min-h-[46px] rounded-xl border border-white/10 bg-abyss-900/75 px-4 py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white"
              >
                {showSquadCreator ? "Скасувати" : "+ Створити команду"}
              </button>
            </div>

            {showSquadCreator && (
              <form
                onSubmit={handleCreateSquad}
                className="space-y-2.5 rounded-2xl border border-white/[0.08] bg-abyss-900/75 p-4"
              >
                <div className="text-xs font-semibold text-white">
                  Нова команда (до 18 учасників)
                </div>
                <input
                  type="text"
                  required
                  value={newSquadName}
                  onChange={(e) => setNewSquadName(e.target.value)}
                  placeholder="Назва команди (напр. Кібер-Титани 8-Б)"
                  aria-label="Назва нової команди"
                  className="min-h-[44px] w-full rounded-xl border border-white/10 bg-abyss-950/80 px-3 py-2 text-base text-white placeholder:text-slate-500 sm:text-sm"
                />
                <input
                  type="text"
                  value={newSquadMotto}
                  onChange={(e) => setNewSquadMotto(e.target.value)}
                  placeholder="Девіз команди..."
                  aria-label="Девіз команди"
                  className="min-h-[44px] w-full rounded-xl border border-white/10 bg-abyss-950/80 px-3 py-2 text-base text-white placeholder:text-slate-500 sm:text-sm"
                />
                <button
                  type="submit"
                  className="min-h-[44px] w-full rounded-xl border border-emerald-400/45 bg-emerald-500/20 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500/30"
                >
                  Зареєструвати команду
                </button>
              </form>
            )}

            {tournamentBoostMsg && (
              <p className="text-xs text-emerald-300">{tournamentBoostMsg}</p>
            )}
          </div>

          {/* Compact Squad Activity Feed */}
          <section className="rounded-2xl border border-white/[0.08] bg-abyss-900/70 p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <Zap className="h-3.5 w-3.5 text-amber-300" />
                Стрічка внесків команди
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerTapFeedback("tap");
                  setActiveTab("teacher-templates");
                }}
                className="min-h-[44px] px-2 text-xs text-slate-400 hover:text-cyan-300"
              >
                Черга модерації вчителя →
              </button>
            </div>

            <div className="divide-y divide-white/[0.06] max-h-48 overflow-y-auto">
              {squadFeed.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-white">
                      {item.memberName}
                    </span>{" "}
                    <span className="text-slate-400">— {item.actionText}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 font-mono text-[11px]">
                    <span className="font-semibold text-emerald-300">
                      +{item.points}
                    </span>
                    <span className="text-slate-500">{item.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
