"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Target,
  Zap,
  BookOpenCheck,
  Sparkles,
  Gem,
  Box,
  Radio,
  MessageSquareHeart,
  Clock,
  GraduationCap,
  User,
} from "lucide-react";
import { AppView, useBitlynnStore } from "@/store/useBitlynnStore";
import { triggerTapFeedback } from "@/lib/feedback";

export interface NavbarProps {
  onOpenClassroomSheet: () => void;
  isClassroomSheetOpen?: boolean;
}

interface DesktopNavItem {
  id: AppView;
  label: string;
  ariaLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const DESKTOP_NAV_ITEMS: DesktopNavItem[] = [
  {
    id: "home",
    label: "Головна",
    ariaLabel: "Головна панель режимів",
    icon: Home,
  },
  {
    id: "play-hangman",
    label: "Шибениця",
    ariaLabel: "Кібер-Шибениця",
    icon: Target,
  },
  {
    id: "play-mutator",
    label: "Бліц",
    ariaLabel: "Zero-Repeat Бліц",
    icon: Zap,
  },
  {
    id: "cyber-crew",
    label: "Екіпаж",
    ariaLabel: "Кібер-Екіпаж 15–18",
    icon: Radio,
  },
  {
    id: "peer-exchange",
    label: "Біржа",
    ariaLabel: "P2P Біржа допомоги",
    icon: MessageSquareHeart,
  },
  {
    id: "teacher-templates",
    label: "Вчитель",
    ariaLabel: "Хаб вчителя",
    icon: BookOpenCheck,
  },
  {
    id: "sanctum",
    label: "Маркет",
    ariaLabel: "Маркет скінів, 60-сек тести та Турніри",
    icon: Sparkles,
  },
];

export const Navbar: React.FC<NavbarProps> = ({
  onOpenClassroomSheet,
  isClassroomSheetOpen = false,
}) => {
  const {
    activeTab,
    setActiveTab,
    openSanctumSection,
    bits,
    bytes,
    roomPin,
    noiseLevelDb,
    userRole,
    classroomSession,
    tickClassroomSession,
  } = useBitlynnStore();

  useEffect(() => {
    if (!classroomSession.active) return;
    const id = window.setInterval(() => {
      tickClassroomSession();
    }, 1000);
    return () => window.clearInterval(id);
  }, [classroomSession.active, tickClassroomSession]);

  const isNoisy = noiseLevelDb >= 65;

  const sessionMin = String(
    Math.floor(classroomSession.remainingSeconds / 60)
  ).padStart(2, "0");
  const sessionSec = String(classroomSession.remainingSeconds % 60).padStart(
    2,
    "0"
  );

  const handleNavClick = (id: AppView) => {
    triggerTapFeedback("tap");
    if (id === "sanctum") {
      openSanctumSection("market");
    } else {
      setActiveTab(id);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-abyss-950/92 backdrop-blur-md">
      <div className="mx-auto flex h-14 min-h-[56px] max-w-6xl flex-nowrap items-center justify-between gap-1.5 px-2.5 sm:gap-2 sm:px-4 lg:px-5">
        {/* Left: Brand -> Home */}
        <button
          type="button"
          onClick={() => {
            triggerTapFeedback("tap");
            setActiveTab("home");
          }}
          aria-label="Bitlynn — На головну"
          className="group flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-2 rounded-xl pr-0.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:justify-start sm:pr-1"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-abyss-900">
            <svg
              viewBox="0 0 36 36"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <defs>
                <linearGradient
                  id="fluidBitGrad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#00F2FE" />
                  <stop offset="65%" stopColor="#4FACFE" />
                  <stop offset="100%" stopColor="#FF6AD5" />
                </linearGradient>
              </defs>
              <path
                d="M18 3 C18 3 29 14 29 22 C29 28.075 24.075 33 18 33 C11.925 33 7 28.075 7 22 C7 14 18 3 18 3 Z"
                fill="url(#fluidBitGrad)"
                fillOpacity="0.2"
                stroke="url(#fluidBitGrad)"
                strokeWidth="2.2"
              />
              <polygon
                points="18,12 24,20 18,28 12,20"
                fill="url(#fluidBitGrad)"
              />
            </svg>
          </div>
          <span
            className={`font-display text-base font-bold tracking-tight text-white transition-colors group-hover:text-cyan-300 ${
              classroomSession.active ? "hidden sm:inline" : ""
            }`}
          >
            Bitlynn
          </span>
        </button>

        {/* Center: Clean Desktop Navigation (>= md) */}
        <nav
          aria-label="Головна навігація Bitlynn"
          className="hidden items-center gap-0.5 md:flex"
        >
          {DESKTOP_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                aria-label={item.ariaLabel}
                title={item.label}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-xl px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 xl:gap-1.5 xl:px-3 xl:text-[13px] ${
                  isActive
                    ? "text-white"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="bitlynn-desktop-pill"
                    transition={{
                      type: "spring",
                      stiffness: 460,
                      damping: 36,
                    }}
                    className="absolute inset-x-0.5 inset-y-1 rounded-lg bg-white/[0.09]"
                  />
                )}
                <Icon
                  className={`relative z-10 h-3.5 w-3.5 shrink-0 xl:h-4 xl:w-4 ${
                    isActive ? "text-cyan-300" : "text-slate-400"
                  }`}
                />
                <span
                  className={`relative z-10 whitespace-nowrap ${
                    isActive ? "inline" : "hidden lg:inline"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Right: Calm Utility Chips */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          {classroomSession.active && (
            <button
              type="button"
              onClick={() => {
                triggerTapFeedback("tap");
                setActiveTab(classroomSession.mode);
              }}
              aria-label={`Таймер уроку: Раунд ${sessionMin}:${sessionSec}. Натисни, щоб перейти в гру`}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-2 font-mono text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 xl:px-2.5"
            >
              <Clock className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
              <span>
                {sessionMin}:{sessionSec}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              triggerTapFeedback("tap");
              onOpenClassroomSheet();
            }}
            aria-expanded={isClassroomSheetOpen}
            aria-label={`Статус класу: ${
              userRole === "teacher" ? "Вчитель" : "Учень"
            }, PIN ${roomPin}, шум ${noiseLevelDb} дБ. Відкрити налаштування`}
            className={`flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-xl border px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 xl:gap-1.5 xl:px-2.5 ${
              isNoisy
                ? "border-rose-400/40 bg-rose-500/10 text-rose-200"
                : "border-white/[0.08] bg-white/[0.03] text-slate-200 hover:border-white/20"
            }`}
          >
            {userRole === "teacher" ? (
              <GraduationCap className="h-3.5 w-3.5 shrink-0 text-slate-300" />
            ) : (
              <User className="h-3.5 w-3.5 shrink-0 text-slate-300" />
            )}
            <span className="font-mono font-semibold text-white">
              #{roomPin}
            </span>
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                isNoisy ? "bg-rose-400" : "bg-emerald-400"
              }`}
            />
            <span className="hidden font-mono text-[11px] text-slate-400 xl:inline">
              {noiseLevelDb} дБ
            </span>
          </button>

          {/* Coins Chip */}
          <button
            type="button"
            onClick={() => {
              triggerTapFeedback("tap");
              openSanctumSection("market");
            }}
            aria-label={`${bits} коїнів. Відкрити Маркет та синтез байтів`}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2 font-mono text-xs transition-colors hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 xl:gap-1.5 xl:px-2.5"
          >
            <Gem className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
            <AnimatePresence mode="popLayout">
              <motion.span
                key={bits}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="font-semibold text-white"
              >
                {bits}
              </motion.span>
            </AnimatePresence>
          </button>

          {/* Bytes Chip */}
          <button
            type="button"
            onClick={() => {
              triggerTapFeedback("tap");
              openSanctumSection("market");
            }}
            aria-label={`${bytes} байтів. Відкрити Маркет скінів Лінн`}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2 font-mono text-xs transition-colors hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 xl:gap-1.5 xl:px-2.5"
          >
            <Box className="h-3.5 w-3.5 shrink-0 text-pink-300" />
            <AnimatePresence mode="popLayout">
              <motion.span
                key={bytes}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="font-semibold text-white"
              >
                {bytes}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
      </div>
    </header>
  );
};
