"use client";

import React from "react";
import { TapFeedbackKind, triggerTapFeedback } from "@/lib/feedback";

export type TouchButtonVariant =
  | "primary"
  | "secondary"
  | "accent"
  | "success"
  | "danger"
  | "ghost";

export type TouchButtonSize = "md" | "lg" | "icon";

export interface TouchButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: TouchButtonVariant;
  size?: TouchButtonSize;
  haptic?: TapFeedbackKind | false;
}

const VARIANT_CLASSES: Record<TouchButtonVariant, string> = {
  primary:
    "border border-cyan-400/45 bg-cyan-500/20 text-white hover:bg-cyan-500/30",
  secondary:
    "border border-white/10 bg-abyss-900/90 text-slate-100 hover:border-white/25 hover:bg-abyss-900",
  accent:
    "border border-pink-400/45 bg-pink-500/20 text-white hover:bg-pink-500/30",
  success:
    "border border-emerald-400/45 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30",
  danger:
    "border border-rose-400/45 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30",
  ghost:
    "border border-transparent bg-transparent text-slate-300 hover:bg-white/[0.06] hover:text-white",
};

const SIZE_CLASSES: Record<TouchButtonSize, string> = {
  md: "min-h-[44px] min-w-[44px] px-4 py-2.5 text-sm",
  lg: "min-h-[50px] min-w-[44px] px-5 py-3 text-sm sm:text-base",
  icon: "min-h-[44px] min-w-[44px] h-11 w-11 p-0",
};

export const TouchButton = React.forwardRef<HTMLButtonElement, TouchButtonProps>(
  (
    {
      variant = "secondary",
      size = "md",
      haptic = "tap",
      type = "button",
      className = "",
      disabled,
      onClick,
      children,
      ...rest
    },
    ref
  ) => {
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && haptic !== false) {
        triggerTapFeedback(haptic);
      }
      onClick?.(event);
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        onClick={handleClick}
        className={`inline-flex touch-manipulation select-none items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
        {...rest}
      >
        {children}
      </button>
    );
  }
);

TouchButton.displayName = "TouchButton";
