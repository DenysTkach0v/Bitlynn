"use client";

import React, { useEffect, useId } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { triggerTapFeedback } from "@/lib/feedback";

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidthClass = "max-w-lg",
}) => {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-abyss-950/80 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Sheet Panel */}
          <motion.div
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 36 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className={`relative z-10 w-full ${maxWidthClass} max-h-[85dvh] overflow-y-auto overflow-x-hidden rounded-t-3xl border border-white/15 bg-abyss-900 p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-2xl sm:rounded-3xl sm:p-6`}
          >
            {/* Mobile drag handle indicator */}
            <div
              aria-hidden="true"
              className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20 sm:hidden"
            />

            <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/[0.08] pb-3">
              <div className="min-w-0">
                <h2
                  id={titleId}
                  className="font-display text-lg font-bold text-white"
                >
                  {title}
                </h2>
                {subtitle && (
                  <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerTapFeedback("tap");
                  onClose();
                }}
                aria-label="Закрити вікно"
                className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-white/10 bg-abyss-950/80 text-slate-300 transition-colors hover:border-cyan-400/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-w-0">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
