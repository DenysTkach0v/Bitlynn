"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shuffle,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Volume2,
  VolumeX,
  ArrowRight,
  MessageSquareHeart,
} from "lucide-react";
import { LynnHoloCompanion } from "@/components/LynnHoloCompanion";
import { AnswerVfxOverlay } from "@/components/ui/AnswerVfxOverlay";
import { triggerTapFeedback } from "@/lib/feedback";
import {
  ANSWER_VFX_ITEMS,
  MutatorBlueprint,
  useBitlynnStore,
} from "@/store/useBitlynnStore";

type BlueprintType = MutatorBlueprint["type"];

interface MutatedOption {
  id: string;
  label: string;
  isCorrect: boolean;
}

interface ReasoningOption {
  id: string;
  label: string;
  isCorrect: boolean;
}

interface MutatedQuestion {
  seed: number;
  type: BlueprintType;
  badge: string;
  questionText: string;
  formulaHint: string;
  options: MutatedOption[];
  reasoningPrompt: string;
  reasoningOptions: ReasoningOption[];
  explanation: string;
}

// Deterministic seeded PRNG (Mulberry32) so SSR matches CSR cleanly and seeds can be mutated
function createRng(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithRng<T>(arr: T[], rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function ensureUniqueNumbers(
  correct: number,
  candidates: number[],
  minVal = 1
): number[] {
  const set = new Set<number>([correct]);
  for (const c of candidates) {
    if (c >= minVal && !set.has(c)) {
      set.add(c);
    }
    if (set.size === 4) break;
  }
  let offset = 1;
  while (set.size < 4) {
    const fallback = correct + offset * 2;
    if (!set.has(fallback)) set.add(fallback);
    offset++;
  }
  return Array.from(set);
}

export function generateMutatedQuestion(
  seed: number,
  forcedType?: BlueprintType
): MutatedQuestion {
  const rng = createRng(seed);
  const allTypes: BlueprintType[] = [
    "bytes-to-bits",
    "bits-to-bytes",
    "word-encoding",
    "unit-compare",
  ];
  const type =
    forcedType ?? allTypes[Math.floor(rng() * allTypes.length)];

  if (type === "bytes-to-bits") {
    const n = 2 + Math.floor(rng() * 14); // [2..15]
    const correct = n * 8;
    const vals = ensureUniqueNumbers(correct, [n * 10, n + 8, n * 4]);
    const options = shuffleWithRng(
      vals.map((v, idx) => ({
        id: `opt-${idx}`,
        label: `${v} біт(ів)`,
        isCorrect: v === correct,
      })),
      rng
    );

    const reasons = shuffleWithRng(
      [
        {
          id: "r-ok",
          label: `Тому що 1 байт = 8 бітів, отже ${n} × 8 = ${correct}.`,
          isCorrect: true,
        },
        {
          id: "r-wrong-1",
          label: `Тому що в системі СІ приставка означає множення на 10 (${n} × 10).`,
          isCorrect: false,
        },
        {
          id: "r-wrong-2",
          label: `Тому що до кількості байтів просто додається 8 (${n} + 8).`,
          isCorrect: false,
        },
      ],
      rng
    );

    return {
      seed,
      type,
      badge: "Байти → Біти",
      questionText: `Скільки бітів міститься у повідомленні обсягом ${n} байт(ів)?`,
      formulaHint: "Згадай базове співвідношення між байтом і бітом.",
      options,
      reasoningPrompt: "Крок 2: Чому ця відповідь правильна?",
      reasoningOptions: reasons,
      explanation: `${n} байт × 8 бітів = ${correct} бітів.`,
    };
  }

  if (type === "bits-to-bytes") {
    const bytes = 3 + Math.floor(rng() * 14); // [3..16]
    const bits = bytes * 8;
    const vals = ensureUniqueNumbers(bytes, [
      bytes * 2,
      bytes + 4,
      Math.max(1, Math.round(bits / 10)),
    ]);
    const options = shuffleWithRng(
      vals.map((v, idx) => ({
        id: `opt-${idx}`,
        label: `${v} байт(ів)`,
        isCorrect: v === bytes,
      })),
      rng
    );

    const reasons = shuffleWithRng(
      [
        {
          id: "r-ok",
          label: `Ми ділимо ${bits} бітів на 8, бо кожен байт складається з 8 бітів.`,
          isCorrect: true,
        },
        {
          id: "r-wrong-1",
          label: `Ми ділимо ${bits} на 10, бо кіло- і байти кратні десятці.`,
          isCorrect: false,
        },
        {
          id: "r-wrong-2",
          label: `Ми множимо ${bits} на 2, бо система двійкова.`,
          isCorrect: false,
        },
      ],
      rng
    );

    return {
      seed,
      type,
      badge: "Біти → Байти",
      questionText: `Канал передав рівно ${bits} бітів. Скільки це цілих байтів?`,
      formulaHint: "Подумай, скільки груп по 8 бітів уміщується в цьому потоці.",
      options,
      reasoningPrompt: "Крок 2: Яке правило ти використав?",
      reasoningOptions: reasons,
      explanation: `${bits} бітів / 8 = ${bytes} байтів.`,
    };
  }

  if (type === "word-encoding") {
    const wordsPool = [
      "ШКОЛА",
      "МОНІТОР",
      "АЛГОРИТМ",
      "МЕРЕЖА",
      "ПРОЦЕСОР",
      "ПІКСЕЛЬ",
    ];
    const word = wordsPool[Math.floor(rng() * wordsPool.length)];
    const bytesPerChar = rng() > 0.5 ? 2 : 1;
    const askBits = rng() > 0.5;

    const totalBytes = word.length * bytesPerChar;
    const correct = askBits ? totalBytes * 8 : totalBytes;
    const unitLabel = askBits ? "біт(ів)" : "байт(ів)";

    const vals = ensureUniqueNumbers(correct, [
      askBits ? word.length * 8 : word.length + bytesPerChar,
      askBits ? totalBytes * 10 : totalBytes * 2,
      askBits ? totalBytes : word.length * 8,
    ]);

    const options = shuffleWithRng(
      vals.map((v, idx) => ({
        id: `opt-${idx}`,
        label: `${v} ${unitLabel}`,
        isCorrect: v === correct,
      })),
      rng
    );

    const encodingLabel =
      bytesPerChar === 1
        ? "1 байт на символ (однобайтове кодування)"
        : "2 байти на символ (Unicode UTF-16)";

    const reasons = shuffleWithRng(
      [
        {
          id: "r-ok",
          label: `У слові ${word.length} літер × ${bytesPerChar} байт(и)${
            askBits ? " × 8 бітів" : ""
          } = ${correct}.`,
          isCorrect: true,
        },
        {
          id: "r-wrong-1",
          label: `Кожне слово незалежно від довжини займає фіксовано 8 байтів.`,
          isCorrect: false,
        },
        {
          id: "r-wrong-2",
          label: `Кількість літер потрібно поділити на 8, щоб отримати вагу.`,
          isCorrect: false,
        },
      ],
      rng
    );

    return {
      seed,
      type,
      badge: "Вага слова",
      questionText: `Скільки ${unitLabel} займає слово «${word}» (без лапок), якщо використовується кодування ${encodingLabel}?`,
      formulaHint:
        "Порахуй кількість літер у слові, помнож на вагу одного символу та за потреби переведи в біти.",
      options,
      reasoningPrompt: "Крок 2: Підтвердь формулу розрахунку:",
      reasoningOptions: reasons,
      explanation: `Слово «${word}» має ${word.length} символів → ${totalBytes} байт(ів) (${
        totalBytes * 8
      } бітів).`,
    };
  }

  // Type 4: unit-compare
  const scenarios = [
    {
      left: "2 КБ",
      right: "2000 байтів",
      correct: "Перше більше (2 КБ > 2000 Б)",
      okReason: "1 КБ = 1024 байти, тому 2 КБ = 2048 байтів > 2000.",
      wrong1: "1 КБ дорівнює рівно 1000 байтів, як кілограм грамів.",
      wrong2: "Байт завжди більший за кілобайт.",
    },
    {
      left: "4 байти",
      right: "32 біти",
      correct: "Вони абсолютно рівні",
      okReason: "4 байти × 8 = 32 біти — це однаковий обсяг інформації.",
      wrong1: "У 1 байті 10 бітів, тому 4 байти = 40 бітів.",
      wrong2: "32 біти менше, бо біт і байт мають однаковий розмір.",
    },
    {
      left: "1 КБ",
      right: "1000 байтів",
      correct: "Перше більше (1 КБ > 1000 Б)",
      okReason: "У двійковій пам'яті 1 КБ = 2¹⁰ = 1024 байти.",
      wrong1: "1 КБ завжди менший за 1000 байтів (512 Б).",
      wrong2: "1 КБ дорівнює 1000 бітам, а не байтам.",
    },
    {
      left: "5 байтів",
      right: "48 бітів",
      correct: "Друге більше (48 бітів > 5 байтів)",
      okReason: "5 байтів = 40 бітів, а 40 < 48 бітів.",
      wrong1: "5 байтів = 50 бітів, отже перше більше.",
      wrong2: "Порівнювати біти й байти неможливо.",
    },
  ];
  const sc = scenarios[Math.floor(rng() * scenarios.length)];
  const rawOptions = [
    sc.correct,
    sc.correct.includes("Перше")
      ? "Друге більше"
      : "Перше більше",
    sc.correct.includes("рівні")
      ? "Перше більше на 8 одиниць"
      : "Вони абсолютно рівні",
    "Неможливо порівняти без процесора",
  ];
  const options = shuffleWithRng(
    rawOptions.map((label, idx) => ({
      id: `opt-${idx}`,
      label,
      isCorrect: label === sc.correct,
    })),
    rng
  );

  const reasons = shuffleWithRng(
    [
      { id: "r-ok", label: sc.okReason, isCorrect: true },
      { id: "r-wrong-1", label: sc.wrong1, isCorrect: false },
      { id: "r-wrong-2", label: sc.wrong2, isCorrect: false },
    ],
    rng
  );

  return {
    seed,
    type,
    badge: "Порівняння величин",
    questionText: `Порівняй два обсяги даних: «${sc.left}» та «${sc.right}». Що більше?`,
    formulaHint:
      "Зведи обидві величини до однієї одиниці вимірювання (напр. до бітів або байтів).",
    options,
    reasoningPrompt: "Крок 2: Який аргумент це доводить?",
    reasoningOptions: reasons,
    explanation: sc.okReason,
  };
}

export const MutatorQuizArena: React.FC = () => {
  const {
    templates,
    activeTemplateId,
    noiseLevelDb,
    equippedVfx,
    privacyScope,
    rewardCoins,
    triggerMistake,
    setLynnMood,
    askPeersAboutTask,
  } = useBitlynnStore();

  const activeVfx =
    ANSWER_VFX_ITEMS.find((v) => v.id === equippedVfx) ?? ANSWER_VFX_ITEMS[0];

  const activeTemplate =
    templates.find((t) => t.id === activeTemplateId) ?? templates[0];

  const [mutationCounter, setMutationCounter] = useState(1);
  const [question, setQuestion] = useState<MutatedQuestion>(() =>
    generateMutatedQuestion(101)
  );

  const [step1SelectedId, setStep1SelectedId] = useState<string | null>(null);
  const [step1Passed, setStep1Passed] = useState(false);
  const [step1Error, setStep1Error] = useState<string | null>(null);

  const [step2SelectedId, setStep2SelectedId] = useState<string | null>(null);
  const [step2Passed, setStep2Passed] = useState(false);
  const [step2Error, setStep2Error] = useState<string | null>(null);
  const [vfxTrigger, setVfxTrigger] = useState(0);

  const isNoisy = noiseLevelDb >= 65;
  const baseReward = 50;
  const finalReward = isNoisy ? baseReward : Math.round(baseReward * 1.5); // 75 in quiet mode

  const handleMutateQuestion = (forcedType?: BlueprintType) => {
    triggerTapFeedback("tap");
    const nextSeed = question.seed + 7919 + mutationCounter * 37;
    const nextQ = generateMutatedQuestion(nextSeed, forcedType);
    setQuestion(nextQ);
    setMutationCounter((c) => c + 1);
    setStep1SelectedId(null);
    setStep1Passed(false);
    setStep1Error(null);
    setStep2SelectedId(null);
    setStep2Passed(false);
    setStep2Error(null);
    setLynnMood("coding");
  };

  const handleStep1Select = (opt: MutatedOption) => {
    if (step1Passed) return;
    setStep1SelectedId(opt.id);
    if (opt.isCorrect) {
      triggerTapFeedback("tap");
      setStep1Passed(true);
      setStep1Error(null);
      setLynnMood("curious");
    } else {
      triggerTapFeedback("error");
      setStep1Error(
        "Сигнал відхилено! Не вгадуй наосліп — перевір формулу й спробуй ще або згенеруй нову мутацію."
      );
      triggerMistake();
    }
  };

  const handleStep2Select = (reason: ReasoningOption) => {
    if (step2Passed) return;
    setStep2SelectedId(reason.id);
    if (reason.isCorrect) {
      triggerTapFeedback("success");
      setVfxTrigger((v) => v + 1);
      setStep2Passed(true);
      setStep2Error(null);
      rewardCoins(finalReward);
    } else {
      triggerTapFeedback("error");
      setStep2Error(
        "Сліпий клік зупинено! Відповідь вірна, але обери саме логічне пояснення «Чому»."
      );
      triggerMistake();
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Clean Flat Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold text-white sm:text-2xl">
            Zero-Repeat Бліц
          </h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400 sm:text-sm">
            <span className="text-slate-300">{activeTemplate.title}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">Завдання #{mutationCounter}</span>
            <span aria-hidden="true">·</span>
            <span
              className={`inline-flex items-center gap-1 ${
                isNoisy ? "text-rose-300" : "text-emerald-300"
              }`}
            >
              {isNoisy ? (
                <>
                  <Volume2 className="h-3.5 w-3.5" />
                  Шум {noiseLevelDb} дБ ({finalReward} коїнів)
                </>
              ) : (
                <>
                  <VolumeX className="h-3.5 w-3.5" />
                  Тиша x1.5 (+{finalReward} коїнів)
                </>
              )}
            </span>
          </p>
        </div>
      </div>

      {/* Compact Horizontal Task-Type Switcher (scrollable row on mobile, balanced grid on desktop) */}
      <div
        className={`-m-1 flex flex-nowrap gap-1.5 overflow-x-auto p-1 [scrollbar-width:none] sm:m-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:p-0 [&::-webkit-scrollbar]:hidden ${
          activeTemplate.mutatorBlueprints.length >= 4 ? "lg:grid-cols-4" : ""
        }`}
      >
        {activeTemplate.mutatorBlueprints.map((bp) => {
          const active = question.type === bp.type;
          return (
            <button
              key={bp.id}
              type="button"
              onClick={() => handleMutateQuestion(bp.type)}
              aria-pressed={active}
              className={`min-h-[44px] shrink-0 whitespace-nowrap rounded-xl border px-3 py-2 text-left text-xs font-medium leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:whitespace-normal ${
                active
                  ? "border-cyan-400/45 bg-cyan-500/15 text-white"
                  : "border-white/[0.08] bg-abyss-900/60 text-slate-400 hover:border-white/20 hover:text-slate-200"
              }`}
            >
              {bp.title}
            </button>
          );
        })}
      </div>

      {/* Main Dynamic Question Card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-abyss-900/75 p-4 sm:p-6 space-y-4 sm:space-y-5">
        <AnswerVfxOverlay
          trigger={vfxTrigger}
          bannerText={
            step2Passed ? `${activeVfx.name}: логіку доведено!` : null
          }
        />

        {/* Card Toolbar: Reward + Compact Lynn + Actions (single row on mobile) */}
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-3 sm:flex-wrap sm:gap-3 sm:pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden sm:block">
              <LynnHoloCompanion size="sm" showCaption={false} />
            </div>
            <div className="min-w-0">
              {/* Badge only when no highlighted blueprint tab above already names it */}
              {!activeTemplate.mutatorBlueprints.some(
                (bp) => bp.type === question.type
              ) && (
                <span className="block truncate text-xs font-semibold text-cyan-300">
                  {question.badge}
                </span>
              )}
              <div className="font-mono text-[11px] text-slate-400">
                +{finalReward}
                <span className="sm:hidden"> коїнів</span>
                <span className="hidden sm:inline"> коїнів за доведену відповідь</span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:flex-wrap sm:gap-2">
            <button
              type="button"
              onClick={() => handleMutateQuestion()}
              aria-label="Новий варіант"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/10 bg-abyss-950/70 px-2.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:px-3"
            >
              <Shuffle className="h-3.5 w-3.5 text-cyan-300" />
              <span className="sm:hidden">Новий</span>
              <span className="hidden sm:inline">Новий варіант</span>
            </button>

            <button
              type="button"
              onClick={() =>
                askPeersAboutTask(
                  question.badge,
                  `Друзі, не зрозумів задачу в Zero-Repeat Бліці: «${question.questionText}». Поясніть, як правильно порахувати!`
                )
              }
              aria-label={
                privacyScope === "class-named"
                  ? "Спитати клас"
                  : "Спитати анонімно"
              }
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/10 bg-abyss-950/70 px-2.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:px-3"
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

        {/* Question Text */}
        <AnimatePresence mode="wait">
          <motion.div
            key={question.seed}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="space-y-1.5"
          >
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white leading-snug">
              {question.questionText}
            </h2>
            <p className="text-xs text-slate-400 sm:text-sm">
              {question.formulaHint}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Calm Visual Helper Diagram */}
        <div className="rounded-xl border border-white/[0.07] bg-abyss-950/65 p-3.5 sm:p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span className="font-medium text-slate-300">Підказка-схема</span>
            <span className="font-mono text-[11px]">
              1 Байт = 8 біт · 1 КБ = 1024 Б
            </span>
          </div>

          {(question.type === "bytes-to-bits" ||
            question.type === "bits-to-bytes") &&
            (() => {
              const numMatch = question.questionText.match(/\d+/);
              const rawNum = numMatch ? Number(numMatch[0]) : 4;
              const byteCount =
                question.type === "bytes-to-bits"
                  ? rawNum
                  : Math.max(1, Math.round(rawNum / 8));
              const shownCubes = Math.min(byteCount, 6);

              return (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {Array.from({ length: shownCubes }).map((_, i) => (
                      <div
                        key={`${question.seed}-cube-${i}`}
                        className="flex flex-col items-center rounded-lg border border-white/10 bg-abyss-900/90 px-2.5 py-1.5 font-mono"
                      >
                        <span className="text-[11px] font-semibold text-white">
                          Байт {i + 1}
                        </span>
                        <span className="text-[10px] text-cyan-300/80">
                          8 біт
                        </span>
                      </div>
                    ))}
                    {byteCount > shownCubes && (
                      <span className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-2 text-xs text-slate-400">
                        + ще {byteCount - shownCubes}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    {question.type === "bytes-to-bits"
                      ? `Усього ${byteCount} байт-блоків, у кожному по 8 бітів.`
                      : `Потік із ${rawNum} бітів ділиться на групи по 8 бітів.`}
                  </p>
                </div>
              );
            })()}

          {question.type === "word-encoding" &&
            (() => {
              const wordMatch = question.questionText.match(/«([^»]+)»/);
              const word = wordMatch ? wordMatch[1] : "КОД";
              const isUnicode = question.questionText.includes("2 байти");

              return (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {Array.from(word).map((ch, idx) => (
                      <div
                        key={`${question.seed}-ch-${idx}`}
                        className="flex min-w-[44px] flex-col items-center rounded-lg border border-white/10 bg-abyss-900/90 px-2.5 py-1.5"
                      >
                        <span className="font-display text-sm font-bold text-white">
                          {ch}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {isUnicode ? "2 Б" : "1 Б"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">
                    У слові {word.length} символів ×{" "}
                    {isUnicode ? "2 байти" : "1 байт"}.
                  </p>
                </div>
              );
            })()}

          {question.type === "unit-compare" &&
            (() => {
              const matches = Array.from(
                question.questionText.matchAll(/«([^»]+)»/g)
              ).map((m) => m[1]);
              const leftLabel = matches[0] ?? "Величина A";
              const rightLabel = matches[1] ?? "Величина B";

              return (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-abyss-900/90 px-3 py-2 text-xs">
                    <span className="text-slate-400">Перша величина</span>
                    <span className="font-mono font-semibold text-white">
                      {leftLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-abyss-900/90 px-3 py-2 text-xs">
                    <span className="text-slate-400">Друга величина</span>
                    <span className="font-mono font-semibold text-white">
                      {rightLabel}
                    </span>
                  </div>
                </div>
              );
            })()}
        </div>

        {/* STEP 1: Answer Options */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span className="font-medium">Крок 1: Обери правильне значення</span>
            {step1Passed && (
              <span className="inline-flex items-center gap-1 font-medium text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Правильно — тепер обери пояснення нижче
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {question.options.map((opt) => {
              const isSelected = step1SelectedId === opt.id;
              const showCorrect = isSelected && opt.isCorrect;
              const showWrong = isSelected && !opt.isCorrect;

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={step1Passed}
                  onClick={() => handleStep1Select(opt)}
                  className={`flex min-h-[52px] items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                    showCorrect
                      ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100"
                      : showWrong
                      ? "border-rose-400/50 bg-rose-500/15 text-rose-100"
                      : step1Passed
                      ? "cursor-not-allowed border-white/[0.04] bg-abyss-950/40 text-slate-500"
                      : "border-white/10 bg-abyss-950/75 text-white hover:border-white/25 hover:bg-abyss-950"
                  }`}
                >
                  <span>{opt.label}</span>
                  {showCorrect && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                  )}
                </button>
              );
            })}
          </div>

          {step1Error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-400/35 bg-rose-500/10 p-3 text-xs text-rose-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-300" />
              <span>{step1Error}</span>
            </div>
          )}
        </div>

        {/* STEP 2: Reasoning Verification */}
        <AnimatePresence>
          {step1Passed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden rounded-xl border border-white/12 bg-abyss-950/75 p-4 sm:p-5 space-y-3"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-200 sm:text-sm">
                <ShieldCheck className="h-4 w-4 shrink-0 text-cyan-300" />
                <span>{question.reasoningPrompt}</span>
              </div>

              <div className="space-y-2">
                {question.reasoningOptions.map((r) => {
                  const isSelected = step2SelectedId === r.id;
                  const showOk = isSelected && r.isCorrect;
                  const showErr = isSelected && !r.isCorrect;

                  return (
                    <button
                      key={r.id}
                      type="button"
                      disabled={step2Passed}
                      onClick={() => handleStep2Select(r)}
                      className={`min-h-[46px] w-full rounded-xl border px-3.5 py-3 text-left text-xs leading-relaxed transition-colors sm:text-sm ${
                        showOk
                          ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100"
                          : showErr
                          ? "border-rose-400/50 bg-rose-500/15 text-rose-100"
                          : step2Passed
                          ? "border-white/[0.04] bg-abyss-900/40 text-slate-500"
                          : "border-white/10 bg-abyss-900/80 text-slate-200 hover:border-white/25 hover:text-white"
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>

              {step2Error && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-400/35 bg-rose-500/10 p-3 text-xs text-rose-200">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-300" />
                  <span>{step2Error}</span>
                </div>
              )}

              {step2Passed && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-400/35 bg-emerald-500/10 p-4"
                >
                  <div className="space-y-0.5 text-xs">
                    <div className="inline-flex items-center gap-1.5 font-semibold text-emerald-200">
                      <Sparkles className="h-4 w-4" />
                      +{finalReward} коїнів нараховано!
                    </div>
                    <p className="text-slate-300">{question.explanation}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleMutateQuestion()}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-400/45 bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500/30"
                  >
                    Наступне завдання
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
