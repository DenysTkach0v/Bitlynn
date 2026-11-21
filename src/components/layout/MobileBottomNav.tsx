"use client";

import React, { useState } from "react";
import {
  Home,
  Target,
  Zap,
  Radio,
  MessageSquareHeart,
  LayoutGrid,
  BookOpenCheck,
  Sparkles,
  SmilePlus,
  Trophy,
  GraduationCap,
} from "lucide-react";
import { AppView, useBitlynnStore } from "@/store/useBitlynnStore";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { triggerTapFeedback } from "@/lib/feedback";

export interface MobileBottomNavProps {
  onOpenClassroomSheet: () => void;
}

interface PrimaryTab {
  id: Exclude<AppView, "teacher-templates" | "sanctum">;
  label: string;
  ariaLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY_TABS: PrimaryTab[] = [
  {
    id: "home",
    label: "Головна",
    ariaLabel: "Головна панель",
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
    ariaLabel: "Екіпаж 15–18",
    icon: Radio,
  },
  {
    id: "peer-exchange",
    label: "Біржа",
    ariaLabel: "P2P Біржа допомоги",
    icon: MessageSquareHeart,
  },
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenClassroomSheet,
}) => {
  const { activeTab, setActiveTab, openSanctumSection, roomPin } =
    useBitlynnStore();
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive =
    activeTab === "teacher-templates" || activeTab === "sanctum";

  return (
    <>
      <nav
        aria-label="Мобільна навігація"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-abyss-950/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl md:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-6 gap-0.5 px-1 py-1">
          {PRIMARY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerTapFeedback("tap");
                  setActiveTab(tab.id);
                }}
                aria-label={tab.ariaLabel}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                  isActive
                    ? "bg-white/[0.08] text-white"
                    : "text-slate-400 hover:text-slate-100"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? "text-cyan-300" : "text-slate-400"
                  }`}
                />
                <span className="max-w-full truncate">{tab.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              triggerTapFeedback("tap");
              setMoreOpen(true);
            }}
            aria-label="Ще режими та налаштування класу"
            aria-expanded={moreOpen}
            className={`flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              isMoreActive || moreOpen
                ? "bg-white/[0.08] text-white"
                : "text-slate-400 hover:text-slate-100"
            }`}
          >
            <LayoutGrid
              className={`h-4 w-4 shrink-0 ${
                isMoreActive || moreOpen ? "text-cyan-300" : "text-slate-400"
              }`}
            />
            <span className="max-w-full truncate">Ще</span>
          </button>
        </div>
      </nav>

      <BottomSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="Усі режими та клас"
        subtitle="Швидкий перехід у додаткові режими Bitlynn"
      >
        <div className="grid grid-cols-1 gap-2.5">
          <button
            type="button"
            onClick={() => {
              triggerTapFeedback("tap");
              setActiveTab("teacher-templates");
              setMoreOpen(false);
            }}
            className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl border border-white/10 bg-abyss-950/90 px-4 py-3 text-left transition-colors hover:border-cyan-400/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <BookOpenCheck className="h-5 w-5 shrink-0 text-cyan-300" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-white">Хаб вчителя</div>
              <div className="text-xs text-slate-400">
                Шаблони занять, шумомір, анти-булінг модерація
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerTapFeedback("tap");
              openSanctumSection("market");
              setMoreOpen(false);
            }}
            className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl border border-white/10 bg-abyss-950/90 px-4 py-3 text-left transition-colors hover:border-pink-400/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <Sparkles className="h-5 w-5 shrink-0 text-pink-300" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-white">
                Маркет скінів / VFX
              </div>
              <div className="text-xs text-slate-400">
                Синтез байтів, голограми Лінн та ефекти відповідей
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerTapFeedback("tap");
              openSanctumSection("blitz");
              setMoreOpen(false);
            }}
            className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl border border-white/10 bg-abyss-950/90 px-4 py-3 text-left transition-colors hover:border-pink-400/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <SmilePlus className="h-5 w-5 shrink-0 text-emerald-300" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-white">
                60-сек смішні тести
              </div>
              <div className="text-xs text-slate-400">
                Швидкі жартівливі бліци класу з модерацією
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerTapFeedback("tap");
              openSanctumSection("tournaments");
              setMoreOpen(false);
            }}
            className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl border border-white/10 bg-abyss-950/90 px-4 py-3 text-left transition-colors hover:border-amber-400/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <Trophy className="h-5 w-5 shrink-0 text-amber-300" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-white">
                Командні турніри
              </div>
              <div className="text-xs text-slate-400">
                Рейтинг команд 1–3 міс. за знижку на навчання
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerTapFeedback("tap");
              setMoreOpen(false);
              onOpenClassroomSheet();
            }}
            className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl border border-cyan-400/35 bg-cyan-500/10 px-4 py-3 text-left transition-colors hover:bg-cyan-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <GraduationCap className="h-5 w-5 shrink-0 text-cyan-300" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-white">
                Клас, Роль &amp; PIN (#{roomPin})
              </div>
              <div className="text-xs text-cyan-200/80">
                Змінити роль Учень/Вчитель, PIN кімнати, шум та профіль
              </div>
            </div>
          </button>
        </div>
      </BottomSheet>
    </>
  );
};
