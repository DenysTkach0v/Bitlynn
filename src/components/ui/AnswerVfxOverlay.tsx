"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ConfettiBurst } from "@/components/visuals/ConfettiBurst";
import { getAnswerVfxConfig, useAnswerVfx } from "@/lib/feedback";

export interface AnswerVfxOverlayProps {
  trigger: number;
  vfxId?: string;
  count?: number;
  mode?: "container" | "viewport";
  bannerText?: string | null;
}

export const AnswerVfxOverlay: React.FC<AnswerVfxOverlayProps> = ({
  trigger,
  vfxId,
  count = 36,
  mode = "container",
  bannerText,
}) => {
  const activeVfx = useAnswerVfx();
  const vfx = vfxId ? getAnswerVfxConfig(vfxId) : activeVfx;
  const [bannerVisible, setBannerVisible] = useState(false);

  useEffect(() => {
    if (trigger <= 0 || !bannerText) {
      setBannerVisible(false);
      return;
    }
    setBannerVisible(true);
    const id = window.setTimeout(() => {
      setBannerVisible(false);
    }, 2200);
    return () => window.clearTimeout(id);
  }, [trigger, bannerText]);

  const cleanBannerText = bannerText?.trim() ?? "";
  const alreadyHasEmoji =
    Boolean(vfx.emoji) && cleanBannerText.startsWith(vfx.emoji);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none ${
        mode === "viewport" ? "fixed" : "absolute"
      } inset-0 z-30 overflow-hidden`}
    >
      <ConfettiBurst
        trigger={trigger}
        emoji={vfx.emoji}
        colors={vfx.colors}
        count={count}
      />
      <AnimatePresence>
        {bannerVisible && cleanBannerText && (
          <motion.div
            key={trigger}
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-4"
          >
            <div
              className="rounded-full border border-white/15 bg-abyss-950/90 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md"
              style={{ borderColor: `${vfx.accentHex}66` }}
            >
              {alreadyHasEmoji ? cleanBannerText : `${vfx.emoji} ${cleanBannerText}`}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
