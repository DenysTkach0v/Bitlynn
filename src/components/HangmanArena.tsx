"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  ShieldAlert,
  Search,
  Sparkles,
  ArrowRight,
  Volume2,
  VolumeX,
  BookOpen,
  RotateCcw,
  MessageSquareHeart,
  SlidersHorizontal,
} from "lucide-react";
import { LynnHoloCompanion } from "@/components/LynnHoloCompanion";
import { CyberGallows } from "@/components/visuals/CyberGallows";
import { AnswerVfxOverlay } from "@/components/ui/AnswerVfxOverlay";
import { triggerTapFeedback } from "@/lib/feedback";
import {
  ANSWER_VFX_ITEMS,
  useBitlynnStore,
} from "@/store/useBitlynnStore";

const UKRAINIAN_ROWS: string[][] = [
  ["А", "Б", "В", "Г", "Ґ", "Д", "Е", "Є", "Ж"],
  ["З", "И", "І", "Ї", "Й", "К", "Л", "М", "Н"],
  ["О", "П", "Р", "С", "Т", "У", "Ф", "Х", "Ц"],
  ["Ч", "Ш", "Щ", "Ь", "Ю", "Я"],
];

const ALL_UKR_LETTERS = new Set(UKRAINIAN_ROWS.flat());
const MAX_SHIELDS = 6;

export const HangmanArena: React.FC = () => {
  const {
    templates,
    activeTemplateId,
    noiseLevelDb,
    equippedVfx,
    privacyScope,
    hangmanWordIndexByTemplate,
    advanceHangmanWord,
    recordHangmanSolvedWord,
    rewardCoins,
    triggerMistake,
    setLynnMood,
    setActiveTab,
    askPeersAboutTask,
  } = useBitlynnStore();

  const activeVfx =
    ANSWER_VFX_ITEMS.find((v) => v.id === equippedVfx) ?? ANSWER_VFX_ITEMS[0];

  const activeTemplate =
    templates.find((t) => t.id === activeTemplateId) ?? templates[0];
  const words = activeTemplate.hangmanWords;

  const wordIndex = hangmanWordIndexByTemplate[activeTemplate.id] ?? 0;
  const safeIndex = words.length > 0 ? wordIndex % words.length : 0;
  const currentItem = words[safeIndex];

  const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
  const [radarOpen, setRadarOpen] = useState(false);
  const [radarQuery, setRadarQuery] = useState("");
  const [radarUsedForCurrent, setRadarUsedForCurrent] = useState(false);
  const [roundRewarded, setRoundRewarded] = useState(false);
  const [vfxTrigger, setVfxTrigger] = useState(0);

  useEffect(() => {
    setGuessedLetters([]);
    setRadarQuery("");
    setRadarUsedForCurrent(false);
    setRoundRewarded(false);
  }, [activeTemplateId, currentItem?.id]);

  const targetWord = (currentItem?.word ?? "БІТ").toUpperCase();
  const uniqueTargetLetters = useMemo(() => {
    const chars = Array.from(targetWord).filter((ch) => ALL_UKR_LETTERS.has(ch));
    return Array.from(new Set(chars));
  }, [targetWord]);

  const wrongGuesses = useMemo(
    () => guessedLetters.filter((l) => !targetWord.includes(l)),
    [guessedLetters, targetWord]
  );

  const shieldsLeft = Math.max(0, MAX_SHIELDS - wrongGuesses.length);
  const isLost = shieldsLeft === 0;
  const isWon =
    uniqueTargetLetters.length > 0 &&
    uniqueTargetLetters.every((l) => guessedLetters.includes(l));

  const isNoisy = noiseLevelDb >= 65;

  useEffect(() => {
    if (isWon && !roundRewarded && currentItem) {
      const baseCoins = 40;
      const radarBonus = radarUsedForCurrent ? 5 : 0;
      const quietBonus = !isNoisy ? 15 : 0;
      rewardCoins(baseCoins + radarBonus + quietBonus);
      recordHangmanSolvedWord(`${activeTemplate.id}:${currentItem.id}`);
      triggerTapFeedback("success");
      setVfxTrigger((v) => v + 1);
      setRoundRewarded(true);
    }
  }, [
    isWon,
    roundRewarded,
    radarUsedForCurrent,
    isNoisy,
    rewardCoins,
    recordHangmanSolvedWord,
    activeTemplate.id,
    currentItem,
  ]);

  const handleLetterGuess = useCallback(
    (rawLetter: string) => {
      const letter = rawLetter.toUpperCase();
      if (!ALL_UKR_LETTERS.has(letter)) return;
      if (isWon || isLost) return;
      if (guessedLetters.includes(letter)) return;

      setGuessedLetters((prev) => [...prev, letter]);

      if (targetWord.includes(letter)) {
        triggerTapFeedback("tap");
        setLynnMood("coding");
      } else {
        triggerTapFeedback("error");
        triggerMistake();
      }
    },
    [guessedLetters, isWon, isLost, targetWord, setLynnMood, triggerMistake]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const upper = e.key.toUpperCase();
      if (ALL_UKR_LETTERS.has(upper)) {
        handleLetterGuess(upper);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleLetterGuess]);

  const handleNextWord = () => {
    triggerTapFeedback("tap");
    advanceHangmanWord(activeTemplate.id);
    setGuessedLetters([]);
    setRadarQuery("");
    setRadarUsedForCurrent(false);
    setRoundRewarded(false);
    setLynnMood("coding");
  };

  const handleRegenerateRound = () => {
    triggerTapFeedback("tap");
    setGuessedLetters([]);
    setRoundRewarded(false);
    setLynnMood("curious");
  };

  const handleOpenRadar = () => {
    triggerTapFeedback("tap");
    setRadarOpen((prev) => !prev);
    if (!radarUsedForCurrent) {
      setRadarUsedForCurrent(true);
    }
  };

  const filteredRadarCards = useMemo(() => {
    const q = radarQuery.trim().toLowerCase();
    if (!q) return words;
    return words.filter(
      (w) =>
        w.radarKeyword.toLowerCase().includes(q) ||
        w.radarFact.toLowerCase().includes(q) ||
        w.clue.toLowerCase().includes(q)
    );
  }, [words, radarQuery]);

  if (!currentItem) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Clean Flat Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold text-white sm:text-2xl">
            Кібер-Шибениця
          </h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400 sm:text-sm">
            <span className="text-slate-300">{activeTemplate.title}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">
              Слово {safeIndex + 1}/{words.length}
            </span>
            <span aria-hidden="true">·</span>
            <span
              className={`inline-flex items-center gap-1 ${
                isNoisy ? "text-rose-300" : "text-emerald-300"
              }`}
            >
              {isNoisy ? (
                <>
                  <Volume2 className="h-3.5 w-3.5" />
                  Шум {noiseLevelDb} дБ (без бонусу)
                </>
              ) : (
                <>
                  <VolumeX className="h-3.5 w-3.5" />
                  Бонус тиші +15
                </>
              )}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerTapFeedback("tap");
            setActiveTab("teacher-templates");
          }}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-abyss-900/75 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Змінити тему
        </button>
      </div>

      {/* Main Single-Focus Game Card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-abyss-900/75 p-4 sm:p-6 space-y-5">
        <AnswerVfxOverlay
          trigger={vfxTrigger}
          bannerText={isWon ? `${activeVfx.name}: слово розшифровано!` : null}
        />

        {/* Noise Warning (only when loud) */}
        {isNoisy && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-400/35 bg-rose-500/10 px-3.5 py-1 text-xs text-rose-200">
            <span>
              У класі шумно ({noiseLevelDb} дБ) — бонус +15 коїнів на паузі.
            </span>
            <button
              type="button"
              onClick={() => setActiveTab("teacher-templates")}
              className="min-h-[44px] shrink-0 px-2 font-medium text-rose-100 underline"
            >
              Шумомір →
            </button>
          </div>
        )}

        {/* Top Bar: Shields + Compact Lynn + Utility Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3 sm:gap-3 sm:pb-4">
          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <LynnHoloCompanion size="sm" showCaption={false} />
            </div>
            <div
              className="space-y-1"
              title={`Щити: ${shieldsLeft}/${MAX_SHIELDS}`}
              aria-label={`Щити: ${shieldsLeft}/${MAX_SHIELDS}`}
            >
              <div className="hidden text-xs text-slate-400 sm:block">
                Щити:{" "}
                <span className="font-mono font-semibold text-white">
                  {shieldsLeft}/{MAX_SHIELDS}
                </span>
              </div>
              <div className="flex items-center gap-0.5 sm:gap-1">
                {Array.from({ length: MAX_SHIELDS }).map((_, idx) => {
                  const active = idx < shieldsLeft;
                  return (
                    <motion.div
                      key={idx}
                      animate={{
                        scale: active ? 1 : 0.85,
                        opacity: active ? 1 : 0.25,
                      }}
                    >
                      {active ? (
                        <Shield className="h-3.5 w-3.5 text-cyan-300 fill-cyan-400/20 sm:h-4 sm:w-4" />
                      ) : (
                        <ShieldAlert className="h-3.5 w-3.5 text-rose-400 sm:h-4 sm:w-4" />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:flex-wrap sm:gap-2">
            <button
              type="button"
              onClick={handleOpenRadar}
              aria-label="Пошуковий Радар (+5)"
              className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:px-3 ${
                radarOpen
                  ? "border-amber-400/45 bg-amber-500/15 text-amber-100"
                  : "border-white/10 bg-abyss-950/70 text-slate-200 hover:border-white/25 hover:text-white"
              }`}
            >
              <Search className="h-3.5 w-3.5 text-amber-300" />
              <span className="sm:hidden">Радар +5</span>
              <span className="hidden sm:inline">Пошуковий Радар (+5)</span>
            </button>

            <button
              type="button"
              onClick={() =>
                askPeersAboutTask(
                  activeTemplate.title,
                  `Друзі, допоможіть із терміном у Кібер-Шибениці: «${currentItem.clue}» (${targetWord.length} літер). Що це за поняття і як його запам'ятати?`
                )
              }
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/10 bg-abyss-950/70 px-2.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:px-3"
              aria-label={
                privacyScope === "class-named"
                  ? "Спитати клас"
                  : "Спитати анонімно"
              }
            >
              <MessageSquareHeart className="h-3.5 w-3.5 text-pink-300" />
              <span className="sm:hidden">Спитати</span>
              <span className="hidden sm:inline">
                {privacyScope === "class-named"
                  ? "Спитати клас"
                  : "Спитати анонімно"}
              </span>
            </button>
          </div>
        </div>

        {/* Center Stage: Gallows Visual + Clue + Letter Slots */}
        <div className="flex flex-col items-center gap-3 py-0.5 md:flex-row md:items-center md:gap-6 md:py-1">
          <div className="w-full max-w-[150px] shrink-0 rounded-2xl border border-white/[0.07] bg-abyss-950/70 p-2 md:max-w-[210px] md:p-3">
            <CyberGallows
              wrongCount={wrongGuesses.length}
              maxParts={MAX_SHIELDS}
              isWon={isWon}
              isLost={isLost}
              className="mx-auto h-28 w-28 md:h-48 md:w-48"
            />
            <div className="mt-1 flex items-center justify-between px-1 font-mono text-[11px] text-slate-400">
              <span>
                Помилок: {wrongGuesses.length}/{MAX_SHIELDS}
              </span>
              <span
                className={
                  isWon
                    ? "font-semibold text-emerald-300"
                    : isLost
                    ? "font-semibold text-rose-300"
                    : "text-slate-300"
                }
              >
                {isWon
                  ? "Врятовано"
                  : isLost
                  ? "Спроба знову"
                  : `${Math.round((shieldsLeft / MAX_SHIELDS) * 100)}%`}
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-3 text-center md:space-y-5 md:text-left">
            <p className="text-base font-medium leading-relaxed text-white sm:text-lg">
              {currentItem.clue}
            </p>

            {/* Word Letter Slots */}
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
              {Array.from(targetWord).map((char, idx) => {
                const isLetter = ALL_UKR_LETTERS.has(char);
                const revealed =
                  !isLetter || guessedLetters.includes(char) || isLost;
                const missedReveal = isLost && !guessedLetters.includes(char);

                return (
                  <motion.div
                    key={`${currentItem.id}-${idx}-${revealed ? "1" : "0"}`}
                    initial={revealed ? { scale: 0.85, y: -3 } : { scale: 1 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ duration: 0.16 }}
                    className={`flex h-12 w-10 sm:h-13 sm:w-11 items-center justify-center rounded-xl border font-display text-lg sm:text-xl font-bold transition-colors ${
                      missedReveal
                        ? "border-rose-400/50 bg-rose-500/15 text-rose-200"
                        : revealed
                        ? "border-cyan-400/50 bg-cyan-500/15 text-white"
                        : "border-white/15 bg-abyss-950/90 text-slate-600"
                    }`}
                  >
                    {revealed ? char : "·"}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Info-Radar Drawer */}
        <AnimatePresence>
          {radarOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden rounded-xl border border-white/10 bg-abyss-950/80 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-amber-200">
                  <BookOpen className="h-4 w-4" />
                  Пошуковий Радар
                </span>
                <span className="text-emerald-300">
                  +5 коїнів за пошук підказки
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={radarQuery}
                    onChange={(e) => setRadarQuery(e.target.value)}
                    placeholder="Пошук за ключовим словом (напр. вісім, мінімум)..."
                    className="min-h-[44px] w-full rounded-xl border border-white/10 bg-abyss-900 py-2.5 pl-9 pr-3 text-base text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none sm:text-sm"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {words.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setRadarQuery(w.radarKeyword)}
                      className="min-h-[44px] rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 font-mono text-xs text-slate-300 transition-colors hover:border-white/25 hover:text-white"
                    >
                      #{w.radarKeyword}
                    </button>
                  ))}
                  {radarQuery && (
                    <button
                      type="button"
                      onClick={() => setRadarQuery("")}
                      className="min-h-[44px] rounded-xl px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                    >
                      Скинути
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {filteredRadarCards.map((card) => (
                  <div
                    key={card.id}
                    className="rounded-xl border border-white/[0.06] bg-abyss-900/70 p-3 text-xs space-y-1"
                  >
                    <div className="font-mono text-[11px] text-amber-300">
                      #{card.radarKeyword}
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {card.radarFact}
                    </p>
                  </div>
                ))}
                {filteredRadarCards.length === 0 && (
                  <p className="col-span-2 text-xs text-slate-400">
                    Нічого не знайдено за запитом «{radarQuery}».
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Win / Loss Banner OR Clean Keyboard */}
        {isWon ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 p-5 text-center space-y-3"
          >
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-200">
              <Sparkles className="h-4 w-4" />
              Слово розшифровано! +
              {40 + (radarUsedForCurrent ? 5 : 0) + (!isNoisy ? 15 : 0)} коїнів
            </div>
            <p className="mx-auto max-w-lg text-xs leading-relaxed text-slate-300">
              {currentItem.radarFact}
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={handleNextWord}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-emerald-400/45 bg-emerald-500/20 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500/30"
              >
                Наступне слово ({((safeIndex + 1) % words.length) + 1}/
                {words.length})
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ) : isLost ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-rose-400/35 bg-rose-500/10 p-5 text-center space-y-3"
          >
            <div className="font-display text-base font-bold text-rose-200">
              Щити розрядились — спробуємо ще раз!
            </div>
            <p className="mx-auto max-w-lg text-xs leading-relaxed text-slate-300">
              Загадане слово:{" "}
              <strong className="text-white">{targetWord}</strong>.{" "}
              {currentItem.radarFact}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleRegenerateRound}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/15 bg-abyss-950 px-4 py-2 text-xs font-semibold text-white hover:border-white/30"
              >
                <RotateCcw className="h-4 w-4" />
                Повторити слово
              </button>
              <button
                type="button"
                onClick={handleNextWord}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/20 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500/30"
              >
                Наступне слово
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between px-0.5 text-xs text-slate-400">
              <span>Натискай літери на екрані або клавіатурі</span>
              <span className="font-mono text-[11px]">
                +40 коїнів за слово
              </span>
            </div>
            <div className="grid grid-cols-12 gap-1.5 sm:grid-cols-11">
              {UKRAINIAN_ROWS.flat().map((letter, idx, allLetters) => {
                const used = guessedLetters.includes(letter);
                const hit = used && targetWord.includes(letter);
                const miss = used && !targetWord.includes(letter);
                // Mobile: 6 keys/row (each spans 2 of 12 cols). Center the
                // trailing partial row at uniform key width instead of stretching.
                const remainder = allLetters.length % 6;
                const isFirstOfLastRow =
                  remainder > 0 && idx === allLetters.length - remainder;
                const centerStart =
                  remainder === 3
                    ? "col-start-4"
                    : remainder === 1
                    ? "col-start-6"
                    : remainder === 5
                    ? "col-start-2"
                    : "";

                return (
                  <button
                    key={letter}
                    type="button"
                    disabled={used}
                    onClick={() => handleLetterGuess(letter)}
                    className={`col-span-2 flex min-h-[44px] w-full select-none items-center justify-center rounded-xl border font-display text-base font-semibold transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:col-span-1 ${
                      isFirstOfLastRow && centerStart
                        ? `${centerStart} sm:col-start-auto`
                        : ""
                    } ${
                      hit
                        ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-100"
                        : miss
                        ? "cursor-not-allowed border-white/[0.04] bg-abyss-950/40 text-slate-600"
                        : "border-white/[0.10] bg-abyss-950/80 text-slate-100 hover:border-white/25 hover:bg-white/[0.06]"
                    }`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
