"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";

export interface FeedbackToastProps {
  message: string | null;
  tone?: "success" | "error" | "info";
  emoji?: string;
  onDismiss?: () => void;
}

const TONE_CLASSES = {
  success:
    "border-emerald-400/35 bg-abyss-900/95 text-emerald-100 shadow-xl",
  error:
    "border-rose-400/35 bg-abyss-900/95 text-rose-100 shadow-xl",
  info: "border-white/15 bg-abyss-900/95 text-slate-100 shadow-xl",
};

export const FeedbackToast: React.FC<FeedbackToastProps> = ({
  message,
  tone = "info",
  emoji,
  onDismiss,
}) => {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className={`fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-1/2 z-50 flex w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 items-center justify-between gap-2.5 rounded-2xl border px-3.5 py-2.5 backdrop-blur-xl sm:bottom-6 ${TONE_CLASSES[tone]}`}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            {emoji ? (
              <span className="shrink-0 text-base leading-none" aria-hidden="true">
                {emoji}
              </span>
            ) : tone === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
            ) : tone === "error" ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-300" />
            ) : (
              <Sparkles className="h-4 w-4 shrink-0 text-cyan-300" />
            )}
            <p className="text-xs font-medium leading-snug sm:text-sm">
              {message}
            </p>
          </div>

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Приховати сповіщення"
              className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl text-current/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
