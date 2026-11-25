"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { ClassroomStatusSheet } from "@/components/layout/ClassroomStatusSheet";
import { FeedbackToast } from "@/components/ui/FeedbackToast";
import { HomeHub } from "@/components/HomeHub";
import { HangmanArena } from "@/components/HangmanArena";
import { MutatorQuizArena } from "@/components/MutatorQuizArena";
import { CyberCrewCanvasGame } from "@/components/crew/CyberCrewCanvasGame";
import { PeerHelpExchange } from "@/components/PeerHelpExchange";
import { TeacherTemplateHub } from "@/components/TeacherTemplateHub";
import { SanctumHub } from "@/components/SanctumHub";
import { ArcadeApp } from "@/components/arcade/ArcadeApp";
import { useHydrated } from "@/hooks/useHydrated";
import { useBitlynnStore } from "@/store/useBitlynnStore";

const VIEW_TRANSITION = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.16, ease: [0.22, 1, 0.36, 1] },
};

export default function BitlynnAppPage() {
  const hydrated = useHydrated();
  const { activeTab, sanctumSection, setActiveTab } = useBitlynnStore();
  const [classroomSheetOpen, setClassroomSheetOpen] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error" | "info";
  } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [hydrated, activeTab, sanctumSection]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = (
    message: string,
    tone: "success" | "error" | "info" = "info"
  ) => {
    setToast({ message, tone });
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  if (!hydrated) {
    return (
      <div className="relative flex min-h-dvh flex-col bg-abyss-950 text-slate-100">
        <header className="sticky top-0 z-40 h-14 min-h-[56px] w-full border-b border-white/[0.08] bg-abyss-950/95 backdrop-blur-md">
          <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
            <span className="font-display text-base font-bold text-white">
              Bitlynn
            </span>
            <span className="text-xs text-slate-400">Завантаження...</span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-24 sm:px-6 sm:py-8 md:pb-10">
          <div className="h-40 animate-pulse rounded-2xl border border-white/[0.06] bg-abyss-900/60" />
        </main>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-abyss-950 text-slate-100 selection:bg-cyan-500/30">
      {/* Minimal Subtle Top Surface Light */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.06),transparent_70%)]"
      />

      {/* Top Navigation & HUD */}
      <Navbar
        onOpenClassroomSheet={() => setClassroomSheetOpen(true)}
        isClassroomSheetOpen={classroomSheetOpen}
      />

      {/* Main Single-Focus Workspace (no z-index stacking context so child fixed z-50 modals cleanly cover Navbar & MobileBottomNav) */}
      <main className="relative mx-auto w-full max-w-6xl flex-1 px-3.5 pt-4 pb-24 sm:px-6 sm:py-7 md:pb-10">
        <AnimatePresence mode="wait">
          {activeTab === "home" && (
            <motion.section key="home" {...VIEW_TRANSITION}>
              <HomeHub
                onOpenClassroomSheet={() => setClassroomSheetOpen(true)}
              />
            </motion.section>
          )}

          {activeTab === "play-hangman" && (
            <motion.section key="play-hangman" {...VIEW_TRANSITION}>
              <HangmanArena />
            </motion.section>
          )}

          {activeTab === "play-mutator" && (
            <motion.section key="play-mutator" {...VIEW_TRANSITION}>
              <MutatorQuizArena />
            </motion.section>
          )}

          {activeTab === "cyber-crew" && (
            <motion.section key="cyber-crew" {...VIEW_TRANSITION}>
              <CyberCrewCanvasGame />
            </motion.section>
          )}

          {activeTab === "peer-exchange" && (
            <motion.section key="peer-exchange" {...VIEW_TRANSITION}>
              <PeerHelpExchange />
            </motion.section>
          )}

          {activeTab === "teacher-templates" && (
            <motion.section key="teacher-templates" {...VIEW_TRANSITION}>
              <TeacherTemplateHub />
            </motion.section>
          )}

          {activeTab === "sanctum" && (
            <motion.section key="sanctum" {...VIEW_TRANSITION}>
              <SanctumHub />
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {activeTab === "arcade" && <ArcadeApp onExit={() => setActiveTab("home")} />}

      <MobileBottomNav
        onOpenClassroomSheet={() => setClassroomSheetOpen(true)}
      />

      <ClassroomStatusSheet
        open={classroomSheetOpen}
        onClose={() => setClassroomSheetOpen(false)}
        onShowToast={showToast}
      />

      <FeedbackToast
        message={toast?.message ?? null}
        tone={toast?.tone ?? "info"}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
