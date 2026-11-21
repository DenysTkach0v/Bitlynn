"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  LYNN_SKINS,
  LynnMood,
  useBitlynnStore,
} from "@/store/useBitlynnStore";

interface LynnHoloCompanionProps {
  size?: "sm" | "md" | "lg";
  overrideMood?: LynnMood;
  overrideSkin?: string;
  interactive?: boolean;
  showCaption?: boolean;
}

const MOOD_CAPTIONS: Record<
  LynnMood,
  { badge: string; message: string; badgeClass: string }
> = {
  sleeping: {
    badge: "Спить у кеші",
    message: "Натисни на Лінн або почни гру, щоб розбудити.",
    badgeClass: "text-slate-300 border-white/10 bg-white/[0.04]",
  },
  curious: {
    badge: "Готова до гри",
    message: "Обирай режим або шукай підказки в Радарі.",
    badgeClass: "text-cyan-200 border-cyan-400/25 bg-cyan-500/10",
  },
  coding: {
    badge: "У процесі",
    message: "Кожна спроба допомагає краще зрозуміти тему.",
    badgeClass: "text-sky-200 border-sky-400/25 bg-sky-500/10",
  },
  debugging: {
    badge: "Шукає рішення",
    message: "Перевір формулу ще раз — ти близько!",
    badgeClass: "text-pink-200 border-pink-400/25 bg-pink-500/10",
  },
  triumph: {
    badge: "Чудовий результат",
    message: "Коїни нараховано — так тримати!",
    badgeClass: "text-emerald-200 border-emerald-400/25 bg-emerald-500/10",
  },
};

export const LynnHoloCompanion: React.FC<LynnHoloCompanionProps> = ({
  size = "md",
  overrideMood,
  overrideSkin,
  interactive = true,
  showCaption = true,
}) => {
  const { lynnMood, equippedSkin, setLynnMood } = useBitlynnStore();
  const mood = overrideMood ?? lynnMood;
  const skinId = overrideSkin ?? equippedSkin;

  const skin =
    LYNN_SKINS.find((s) => s.id === skinId) ?? LYNN_SKINS[0];
  const moodMeta = MOOD_CAPTIONS[mood];

  const dimensions =
    size === "sm"
      ? "w-16 h-16"
      : size === "lg"
      ? "w-44 h-44"
      : "w-28 h-28";

  const cycleMood = () => {
    if (!interactive) return;
    const order: LynnMood[] = [
      "curious",
      "coding",
      "debugging",
      "triumph",
      "sleeping",
    ];
    const next = order[(order.indexOf(mood) + 1) % order.length];
    setLynnMood(next);
  };

  const avatarInner = (
    <>
      {/* Subtle Static Aura */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full blur-md opacity-30"
        style={{
          background: `radial-gradient(circle, ${skin.primaryHex}55 0%, ${skin.gillHex}22 65%, transparent 100%)`,
        }}
      />

      {/* Clean Pedestal Circle */}
      <div className="relative z-10 w-full h-full flex items-center justify-center rounded-full border border-white/10 bg-abyss-950/90 overflow-hidden">
        <motion.svg
          viewBox="0 0 160 160"
            className="w-4/5 h-4/5 overflow-visible"
            animate={{
              y: mood === "sleeping" ? [0, 3, 0] : [0, -5, 0],
              rotate:
                mood === "debugging"
                  ? [-2, 2, -2, 2, 0]
                  : mood === "triumph"
                  ? [0, -3, 3, 0]
                  : 0,
            }}
            transition={{
              duration: mood === "debugging" ? 1.4 : 3.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <defs>
              <linearGradient id={`bodyGrad-${skin.id}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={skin.primaryHex} />
                <stop offset="100%" stopColor={skin.secondaryHex} />
              </linearGradient>
              <linearGradient id={`gillGrad-${skin.id}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={skin.gillHex} />
                <stop offset="100%" stopColor={skin.primaryHex} />
              </linearGradient>
            </defs>

            {/* Left 3 Cyber-Feathered Gills (Regeneration stalks) */}
            <motion.g
              animate={{
                rotate: mood === "triumph" ? [-6, 6, -6] : [-3, 3, -3],
              }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformOrigin: "45px 75px" }}
            >
              <path
                d="M44 64 C22 50, 14 56, 26 68"
                stroke={`url(#gillGrad-${skin.id})`}
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M40 76 C15 72, 12 82, 28 84"
                stroke={`url(#gillGrad-${skin.id})`}
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M45 88 C24 94, 22 104, 36 98"
                stroke={`url(#gillGrad-${skin.id})`}
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
              />
              {/* Bioluminescent Gill Nodes */}
              <circle cx="21" cy="56" r="3" fill={skin.gillHex} />
              <circle cx="17" cy="76" r="3" fill={skin.gillHex} />
              <circle cx="25" cy="97" r="2.5" fill={skin.gillHex} />
            </motion.g>

            {/* Right 3 Cyber-Feathered Gills */}
            <motion.g
              animate={{
                rotate: mood === "triumph" ? [6, -6, 6] : [3, -3, 3],
              }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformOrigin: "115px 75px" }}
            >
              <path
                d="M116 64 C138 50, 146 56, 134 68"
                stroke={`url(#gillGrad-${skin.id})`}
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M120 76 C145 72, 148 82, 132 84"
                stroke={`url(#gillGrad-${skin.id})`}
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M115 88 C136 94, 138 104, 124 98"
                stroke={`url(#gillGrad-${skin.id})`}
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="139" cy="56" r="3" fill={skin.gillHex} />
              <circle cx="143" cy="76" r="3" fill={skin.gillHex} />
              <circle cx="135" cy="97" r="2.5" fill={skin.gillHex} />
            </motion.g>

            {/* Translucent Aquatic Tail Fin */}
            <path
              d="M65 118 Q80 144 98 128 Q88 118 88 112"
              fill={`url(#bodyGrad-${skin.id})`}
              opacity="0.45"
            />

            {/* Axolotl Head & Holographic Visor Shell */}
            <rect
              x="38"
              y="44"
              width="84"
              height="68"
              rx="34"
              fill={`url(#bodyGrad-${skin.id})`}
              opacity="0.92"
            />
            <rect
              x="46"
              y="54"
              width="68"
              height="46"
              rx="22"
              fill="#060B19"
              stroke={skin.primaryHex}
              strokeWidth="1.5"
              strokeOpacity="0.6"
            />

            {/* Forehead Bit Crystal Emblem */}
            <polygon
              points="80,34 86,42 80,50 74,42"
              fill={skin.gillHex}
              stroke="#ffffff"
              strokeWidth="1"
            />

            {/* Mood-Reactive Eyes */}
            {mood === "sleeping" ? (
              <g stroke={skin.primaryHex} strokeWidth="3" strokeLinecap="round" fill="none">
                <path d="M58 75 Q64 80 70 75" />
                <path d="M90 75 Q96 80 102 75" />
              </g>
            ) : mood === "debugging" ? (
              <g>
                {/* Regenerating Spark Eyes */}
                <circle cx="64" cy="74" r="6" fill={skin.gillHex} />
                <circle cx="96" cy="74" r="6" fill={skin.primaryHex} />
                <circle cx="62" cy="72" r="2" fill="#fff" />
                <circle cx="94" cy="72" r="2" fill="#fff" />
                <path
                  d="M56 64 L70 67"
                  stroke={skin.gillHex}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M104 64 L90 67"
                  stroke={skin.primaryHex}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </g>
            ) : mood === "triumph" ? (
              <g stroke={skin.primaryHex} strokeWidth="3.5" strokeLinecap="round" fill="none">
                <path d="M57 77 Q64 67 71 77" />
                <path d="M89 77 Q96 67 103 77" />
              </g>
            ) : (
              <g>
                <circle cx="64" cy="74" r="6.5" fill={skin.primaryHex} />
                <circle cx="96" cy="74" r="6.5" fill={skin.primaryHex} />
                <circle cx="62" cy="71.5" r="2.2" fill="#ffffff" />
                <circle cx="94" cy="71.5" r="2.2" fill="#ffffff" />
                {mood === "coding" && (
                  <>
                    <rect
                      x="54"
                      y="66"
                      width="20"
                      height="16"
                      rx="4"
                      fill="none"
                      stroke={skin.gillHex}
                      strokeWidth="1.5"
                      strokeDasharray="3 2"
                    />
                    <rect
                      x="86"
                      y="66"
                      width="20"
                      height="16"
                      rx="4"
                      fill="none"
                      stroke={skin.gillHex}
                      strokeWidth="1.5"
                      strokeDasharray="3 2"
                    />
                  </>
                )}
              </g>
            )}

            {/* Axolotl Smile / Expression */}
            {mood === "debugging" ? (
              <path
                d="M73 89 Q80 85 87 89"
                stroke={skin.gillHex}
                strokeWidth="2.8"
                strokeLinecap="round"
                fill="none"
              />
            ) : (
              <path
                d="M71 86 Q76 92 80 87 Q84 92 89 86"
                stroke={skin.primaryHex}
                strokeWidth="2.8"
                strokeLinecap="round"
                fill="none"
              />
            )}

            {/* Bioluminescent Cheek Speckles */}
            <circle cx="53" cy="83" r="2.5" fill={skin.gillHex} opacity="0.8" />
            <circle cx="107" cy="83" r="2.5" fill={skin.gillHex} opacity="0.8" />
          </motion.svg>
        </div>
    </>
  );

  return (
    <div className="flex flex-col items-center">
      {interactive ? (
        <motion.button
          type="button"
          onClick={cycleMood}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          title="Натисни, щоб змінити емоційний стан голограми Лінн"
          className={`relative flex items-center justify-center rounded-full select-none cursor-pointer ${dimensions}`}
        >
          {avatarInner}
        </motion.button>
      ) : (
        <div
          title="Лінн — Кібер-Аксолотль Напарник"
          className={`relative flex items-center justify-center rounded-full select-none ${dimensions}`}
        >
          {avatarInner}
        </div>
      )}

      {size !== "sm" && showCaption && (
        <div className="mt-3 flex flex-col items-center text-center max-w-xs space-y-1.5">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${moodMeta.badgeClass}`}
          >
            {moodMeta.badge}
          </span>
          <p className="text-xs text-slate-400 leading-relaxed">
            {moodMeta.message}
          </p>
        </div>
      )}
    </div>
  );
};

