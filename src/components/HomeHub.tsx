"use client";

import React, { useState } from "react";
import {
  Target,
  Zap,
  Radio,
  MessageSquareHeart,
  BookOpenCheck,
  Sparkles,
  SmilePlus,
  Trophy,
  UserCog,
  CheckCircle2,
  Gift,
  Volume2,
  ArrowUpRight,
  ArrowLeftRight,
  KeyRound,
} from "lucide-react";
import {
  AppView,
  SanctumSection,
  useBitlynnStore,
} from "@/store/useBitlynnStore";
import { LynnHoloCompanion } from "@/components/LynnHoloCompanion";
import { triggerTapFeedback } from "@/lib/feedback";

export interface HomeHubProps {
  onOpenClassroomSheet: () => void;
}

interface LauncherModeCard {
  id: string;
  title: string;
  subtitle: string;
  iconBg: string;
  iconClass: string;
  icon: React.ComponentType<{ className?: string }>;
  targetTab?: AppView;
  targetSanctum?: SanctumSection;
}

const PLAY_MODES: LauncherModeCard[] = [
  {
    id: "mode-hangman",
    title: "Кібер-Шибениця",
    subtitle: "Слова з теми уроку та Радар",
    iconBg: "bg-cyan-500/12 text-cyan-300",
    iconClass: "text-cyan-300",
    icon: Target,
    targetTab: "play-hangman",
  },
  {
    id: "mode-mutator",
    title: "Zero-Repeat Бліц",
    subtitle: "Нові числа щоразу + пояснення",
    iconBg: "bg-sky-500/12 text-sky-300",
    iconClass: "text-sky-300",
    icon: Zap,
    targetTab: "play-mutator",
  },
  {
    id: "mode-crew",
    title: "Екіпаж 15–18",
    subtitle: "Станція, ролі та Кібер-Рада",
    iconBg: "bg-pink-500/12 text-pink-300",
    iconClass: "text-pink-300",
    icon: Radio,
    targetTab: "cyber-crew",
  },
  {
    id: "mode-fun-blitz",
    title: "60-сек смішні тести",
    subtitle: "Короткі тести класу з модерацією",
    iconBg: "bg-teal-500/12 text-teal-300",
    iconClass: "text-teal-300",
    icon: SmilePlus,
    targetSanctum: "blitz",
  },
];

const CLASS_MODES: LauncherModeCard[] = [
  {
    id: "mode-peer",
    title: "P2P Біржа",
    subtitle: "Взаємодопомога за коїни й задачі учнів",
    iconBg: "bg-emerald-500/12 text-emerald-300",
    iconClass: "text-emerald-300",
    icon: MessageSquareHeart,
    targetTab: "peer-exchange",
  },
  {
    id: "mode-teacher",
    title: "Хаб вчителя",
    subtitle: "PIN, шумомір, шаблони й модерація",
    iconBg: "bg-indigo-500/12 text-indigo-300",
    iconClass: "text-indigo-300",
    icon: BookOpenCheck,
    targetTab: "teacher-templates",
  },
  {
    id: "mode-market",
    title: "Маркет скінів / VFX",
    subtitle: "Байти, скіни Лінн та ефекти",
    iconBg: "bg-fuchsia-500/12 text-fuchsia-300",
    iconClass: "text-fuchsia-300",
    icon: Sparkles,
    targetSanctum: "market",
  },
  {
    id: "mode-tournaments",
    title: "Турніри",
    subtitle: "Командний рейтинг і знижка на рік",
    iconBg: "bg-amber-500/12 text-amber-300",
    iconClass: "text-amber-300",
    icon: Trophy,
    targetSanctum: "tournaments",
  },
];

export const HomeHub: React.FC<HomeHubProps> = ({ onOpenClassroomSheet }) => {
  const {
    studentProfile,
    userRole,
    setUserRole,
    roomPin,
    joinRoomByPin,
    noiseLevelDb,
    templates,
    activeTemplateId,
    waveStreak,
    masteryRank,
    completedChallengesCount,
    dailyQuestSteps,
    claimDailyQuestBonus,
    setActiveTab,
    openSanctumSection,
  } = useBitlynnStore();

  const [pinInput, setPinInput] = useState("");
  const [pinOpen, setPinOpen] = useState(false);
  const [pinStatus, setPinStatus] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [questMsg, setQuestMsg] = useState<string | null>(null);

  const activeTemplate =
    templates.find((t) => t.id === activeTemplateId) ?? templates[0];
  const isNoisy = noiseLevelDb >= 65;

  const questDoneCount =
    Number(dailyQuestSteps.playedGame) +
    Number(dailyQuestSteps.helpedPeer) +
    Number(dailyQuestSteps.boostedOrCustomized);
  const allQuestsDone = questDoneCount === 3;

  const handleJoinPin = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = joinRoomByPin(pinInput);
    if (ok) {
      triggerTapFeedback("success");
      setPinStatus({
        ok: true,
        text: `Підключено до кімнати #${pinInput.trim()}`,
      });
      setPinInput("");
    } else {
      triggerTapFeedback("error");
      setPinStatus({
        ok: false,
        text: "Введи 4 цифри PIN-коду",
      });
    }
  };

  const handleLaunchMode = (card: LauncherModeCard) => {
    triggerTapFeedback("tap");
    if (card.targetSanctum) {
      openSanctumSection(card.targetSanctum);
    } else if (card.targetTab) {
      setActiveTab(card.targetTab);
    }
  };

  const renderModeCard = (card: LauncherModeCard) => {
    const Icon = card.icon;
    return (
      <button
        key={card.id}
        type="button"
        onClick={() => handleLaunchMode(card)}
        className="group flex min-h-[112px] min-w-0 flex-col justify-between rounded-2xl border border-white/[0.08] bg-abyss-900/75 p-4 text-left transition-colors hover:border-white/20 hover:bg-abyss-900 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        <div className="flex w-full items-center justify-between gap-2">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}
          >
            <Icon className={`h-4 w-4 ${card.iconClass}`} />
          </div>
          <ArrowUpRight className="h-4 w-4 text-slate-600 transition-colors group-hover:text-slate-300" />
        </div>

        <div className="mt-3 min-w-0">
          <div className="font-display text-sm font-semibold leading-snug text-white sm:text-[15px]">
            {card.title}
          </div>
          <p className="mt-0.5 text-xs leading-snug text-slate-400">
            {card.subtitle}
          </p>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-7">
      {/* Compact Welcome & Quick Classroom Bar */}
      <section className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              type="button"
              onClick={() => {
                triggerTapFeedback("tap");
                openSanctumSection("market");
              }}
              aria-label="Відкрити Маркет та скіни Лінн"
              className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <LynnHoloCompanion size="sm" interactive={false} />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
                Привіт, {studentProfile.name}
              </h1>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 sm:text-sm">
                <span>{studentProfile.grade}</span>
                <span aria-hidden="true">·</span>
                <span className="truncate text-slate-300">
                  {activeTemplate?.title ?? "Базовий урок"}
                </span>
                {isNoisy && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-1.5 py-0.5 font-mono text-[11px] text-rose-300">
                    <Volume2 className="h-3 w-3" />
                    {noiseLevelDb} дБ
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerTapFeedback("tap");
              onOpenClassroomSheet();
            }}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-abyss-900/80 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <UserCog className="h-4 w-4 text-slate-400" />
            Профіль і клас
          </button>
        </div>

        {/* Compact Status Strip: progress + role pill + expandable PIN */}
        <div className="space-y-2.5 rounded-2xl border border-white/[0.08] bg-abyss-900/70 px-3 py-1.5 sm:px-4">
          <div className="flex items-center justify-between gap-2">
            {/* Quiet Inline Progress */}
            <div className="flex min-w-0 items-center gap-2.5 text-[11px] text-slate-400 sm:gap-4">
              <div className="flex shrink-0 items-baseline gap-1.5">
                <span className="sm:hidden">Серія</span>
                <span className="hidden sm:inline">Серія хвиль</span>
                <span className="font-mono text-sm font-semibold text-white">
                  {waveStreak}
                </span>
              </div>
              <span aria-hidden className="h-3 w-px shrink-0 bg-white/10" />
              <div
                className="min-w-0 truncate"
                title={`Ранг · ${completedChallengesCount} завдань`}
              >
                <span className="font-display text-sm font-semibold text-white">
                  {masteryRank}
                </span>
                <span className="text-slate-400">
                  {" · "}
                  {completedChallengesCount}
                  <span className="hidden sm:inline"> завдань</span>
                </span>
              </div>
            </div>

            {/* Role Pill + PIN Toggle */}
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  triggerTapFeedback("tap");
                  setUserRole(userRole === "student" ? "teacher" : "student");
                }}
                aria-label={`Роль: ${
                  userRole === "student" ? "Учень" : "Вчитель"
                }. Перемкнути на ${
                  userRole === "student" ? "Вчитель" : "Учень"
                }`}
                title="Змінити роль"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                {userRole === "student" ? "Учень" : "Вчитель"}
                <ArrowLeftRight className="h-3.5 w-3.5 text-slate-500" />
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerTapFeedback("tap");
                  setPinOpen((open) => !open);
                }}
                aria-expanded={pinOpen}
                aria-controls="homehub-pin-form"
                aria-label="Швидкий вхід за PIN кімнати"
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                  pinOpen
                    ? "bg-cyan-500/15 text-cyan-100"
                    : "text-slate-200 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <KeyRound className="h-3.5 w-3.5 text-cyan-300" />
                <span className="font-mono">#{roomPin}</span>
              </button>
            </div>
          </div>

          {/* PIN Quick Join (expandable) */}
          {pinOpen && (
            <form
              id="homehub-pin-form"
              onSubmit={handleJoinPin}
              className="flex items-center gap-2 border-t border-white/[0.06] pt-2.5 md:ml-auto md:max-w-sm"
            >
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoFocus
                value={pinInput}
                onChange={(e) =>
                  setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="PIN кімнати (4 цифри)"
                aria-label="Швидкий вхід за 4-значним PIN кімнати"
                className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-white/10 bg-abyss-950/80 px-3 py-2 font-mono text-base tracking-[0.18em] text-white placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:text-sm"
              />
              <button
                type="submit"
                className="min-h-[44px] shrink-0 rounded-xl border border-cyan-400/40 bg-cyan-500/20 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-cyan-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                Увійти
              </button>
            </form>
          )}

          {pinStatus && (
            <p
              className={`pb-1.5 text-xs ${
                pinStatus.ok ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {pinStatus.text}
            </p>
          )}
        </div>
      </section>

      {/* Primary Section: Games & Practice */}
      <section aria-labelledby="play-modes-heading" className="space-y-3">
        <h2
          id="play-modes-heading"
          className="font-display text-base font-semibold text-white"
        >
          Ігри та завдання
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {PLAY_MODES.map(renderModeCard)}
        </div>
      </section>

      {/* Secondary Section: Class, Market & Tournaments */}
      <section aria-labelledby="class-modes-heading" className="space-y-3">
        <h2
          id="class-modes-heading"
          className="font-display text-base font-semibold text-white"
        >
          Спільнота та клас
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {CLASS_MODES.map(renderModeCard)}
        </div>
      </section>

      {/* Compact Daily Quest Bar */}
      <section
        aria-labelledby="daily-quest-heading"
        className="rounded-2xl border border-white/[0.08] bg-abyss-900/70 p-4 sm:p-5 space-y-3.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2
              id="daily-quest-heading"
              className="font-display text-base font-semibold text-white"
            >
              Квест дня
            </h2>
            <p className="text-xs text-slate-400">
              Виконай 3 кроки, щоб отримати +60 коїнів та +1 байт.
            </p>
          </div>
          <span className="font-mono text-xs font-semibold text-slate-300">
            {questDoneCount}/3
          </span>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-abyss-950">
          <div
            className="h-full rounded-full bg-cyan-400 transition-all duration-300"
            style={{ width: `${(questDoneCount / 3) * 100}%` }}
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            {
              key: "step-1",
              done: dailyQuestSteps.playedGame,
              title: "1. Зіграй гру за уроком",
              hint: "Екіпаж 15–18 або Шибениця",
              onClick: () => {
                triggerTapFeedback("tap");
                setActiveTab("cyber-crew");
              },
            },
            {
              key: "step-2",
              done: dailyQuestSteps.helpedPeer,
              title: "2. Допоможи або спитай на Біржі",
              hint: "Підтримка однолітків",
              onClick: () => {
                triggerTapFeedback("tap");
                setActiveTab("peer-exchange");
              },
            },
            {
              key: "step-3",
              done: dailyQuestSteps.boostedOrCustomized,
              title: "3. Онови скін або підтримай команду",
              hint: "Маркет чи Турнір",
              onClick: () => {
                triggerTapFeedback("tap");
                openSanctumSection("tournaments");
              },
            },
          ].map((step) => (
            <button
              key={step.key}
              type="button"
              onClick={step.onClick}
              className={`flex min-h-[52px] items-center justify-between gap-2.5 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                step.done
                  ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-100"
                  : "border-white/[0.07] bg-abyss-950/60 text-slate-200 hover:border-white/20"
              }`}
            >
              <div className="min-w-0">
                <div className="text-xs font-semibold leading-snug">
                  {step.title}
                </div>
                <div className="text-[11px] text-slate-400">{step.hint}</div>
              </div>
              <CheckCircle2
                className={`h-4 w-4 shrink-0 ${
                  step.done ? "text-emerald-300" : "text-slate-600"
                }`}
              />
            </button>
          ))}
        </div>

        {allQuestsDone && !dailyQuestSteps.claimedBonus && (
          <button
            type="button"
            onClick={() => {
              const ok = claimDailyQuestBonus();
              if (ok) {
                triggerTapFeedback("success");
                setQuestMsg(
                  "Нагороду зараховано: +60 коїнів, +1 байт та +60 очок команди!"
                );
              }
            }}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/45 bg-emerald-500/20 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500/30"
          >
            <Gift className="h-4 w-4 text-emerald-300" />
            Забрати нагороду дня (+60 коїнів та +1 байт)
          </button>
        )}

        {(dailyQuestSteps.claimedBonus || questMsg) && (
          <p className="text-xs text-emerald-300">
            {questMsg ?? "Нагороду дня забрано (+60 коїнів та +1 байт)."}
          </p>
        )}
      </section>
    </div>
  );
};
