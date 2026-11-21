"use client";

import React, { useId } from "react";
import { motion } from "framer-motion";

interface CyberGallowsProps {
  /** Number of wrong guesses so far (0..maxParts). */
  wrongCount: number;
  maxParts?: number;
  isWon: boolean;
  isLost: boolean;
  className?: string;
}

const POP = { type: "spring", stiffness: 260, damping: 20 } as const;

/**
 * Polished Neon Cyber-Gallows illustration.
 * Displays a sci-fi holographic containment gantry + stasis beam + 6-segment base meter.
 * Each wrong guess materializes an articulated part of the Cyber-Bot
 * (1: Helmet & Gills, 2: Armored Core, 3: Left Arm, 4: Right Arm, 5: Left Boot, 6: Right Boot).
 * On win, the stasis beam releases and the rescued bot lands cheering on the platform.
 */
export const CyberGallows: React.FC<CyberGallowsProps> = ({
  wrongCount,
  maxParts = 6,
  isWon,
  isLost,
  className = "",
}) => {
  const uid = useId().replace(/:/g, "");
  const glowId = `cg-glow-${uid}`;
  const pillarGradId = `cg-pillar-${uid}`;
  const armorGradId = `cg-armor-${uid}`;
  const beamGradId = `cg-beam-${uid}`;
  const auraGradId = `cg-aura-${uid}`;

  const parts = Math.min(wrongCount, maxParts);
  const danger = parts / maxParts;

  const accent = isWon
    ? "#38EF7D"
    : isLost
    ? "#FF4D6D"
    : danger >= 0.8
    ? "#FF6AD5"
    : danger >= 0.5
    ? "#FFB800"
    : "#00F2FE";

  const show = (n: number) => isWon || parts >= n;
  const armsUp = isWon;

  return (
    <div className={`relative select-none ${className}`}>
      <svg
        viewBox="0 0 240 240"
        className="h-full w-full overflow-visible"
        role="img"
        aria-label={`Кібер-шибениця: помилок ${parts} з ${maxParts}`}
      >
        <defs>
          <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id={pillarGradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>

          <linearGradient id={armorGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1B2E5E" />
            <stop offset="100%" stopColor="#09122B" />
          </linearGradient>

          <linearGradient id={beamGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.32" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
          </linearGradient>

          <radialGradient id={auraGradId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
            <stop offset="70%" stopColor={accent} stopOpacity="0.06" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Soft ambient radial backlight behind character */}
        <circle cx="152" cy="126" r="76" fill={`url(#${auraGradId})`} />

        {/* Subtle twinkling cyber-stars */}
        {[
          [22, 28],
          [116, 16],
          [214, 48],
          [26, 144],
          [222, 162],
        ].map(([x, y], i) => (
          <motion.circle
            key={i}
            cx={x}
            cy={y}
            r={i % 2 === 0 ? 1.5 : 1.1}
            fill={i % 2 === 0 ? "#7DD3FC" : "#F472B6"}
            animate={{ opacity: [0.2, 0.9, 0.2] }}
            transition={{ duration: 2.2 + i * 0.45, repeat: Infinity }}
          />
        ))}

        {/* Stasis energy cone under emitter */}
        {!isWon && (
          <polygon
            points="142,38 162,38 196,204 108,204"
            fill={`url(#${beamGradId})`}
          />
        )}

        {/* ---------- HOLOGRAPHIC GANTRY / PORTAL FRAME ---------- */}
        <g>
          {/* Base shadow & platform */}
          <rect
            x="22"
            y="204"
            width="196"
            height="22"
            rx="9"
            fill="#0A132D"
            stroke="rgba(99,102,241,0.45)"
            strokeWidth="2"
          />
          {/* Top rim highlight on base */}
          <line
            x1="32"
            y1="205"
            x2="208"
            y2="205"
            stroke="#38BDF8"
            strokeWidth="2"
            strokeOpacity="0.7"
            strokeLinecap="round"
          />

          {/* 6-segment status LED bar embedded in pedestal */}
          {Array.from({ length: maxParts }).map((_, idx) => {
            const tripped = idx < parts;
            const ledX = 76 + idx * 21;
            const ledColor = isWon
              ? "#38EF7D"
              : tripped
              ? "#FF4D6D"
              : "rgba(0,242,254,0.28)";
            return (
              <rect
                key={idx}
                x={ledX}
                y="212"
                width="15"
                height="6"
                rx="3"
                fill={ledColor}
                filter={tripped || isWon ? `url(#${glowId})` : undefined}
              />
            );
          })}

          {/* Vertical pillar */}
          <rect
            x="44"
            y="20"
            width="14"
            height="186"
            rx="6"
            fill="#0D1938"
            stroke={`url(#${pillarGradId})`}
            strokeWidth="2.5"
          />
          <line
            x1="51"
            y1="32"
            x2="51"
            y2="196"
            stroke="#38BDF8"
            strokeWidth="2"
            strokeOpacity="0.45"
            strokeLinecap="round"
          />

          {/* Base support bracket */}
          <path
            d="M34 204 L44 186 L44 204 Z M58 204 L58 186 L68 204 Z"
            fill="#1D3366"
            stroke="#38BDF8"
            strokeWidth="1.2"
          />

          {/* Horizontal top beam */}
          <rect
            x="40"
            y="18"
            width="126"
            height="13"
            rx="6"
            fill="#0D1938"
            stroke={`url(#${pillarGradId})`}
            strokeWidth="2.5"
          />
          {/* Corner diagonal brace */}
          <line
            x1="58"
            y1="62"
            x2="92"
            y2="31"
            stroke={`url(#${pillarGradId})`}
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          {/* Decorative bolts */}
          <circle cx="51" cy="24.5" r="2.2" fill="#38BDF8" />
          <circle cx="152" cy="24.5" r="2.2" fill="#A855F7" />

          {/* Emitter nozzle */}
          <path
            d="M140 31 L164 31 L159 40 L145 40 Z"
            fill="#1E293B"
            stroke={accent}
            strokeWidth="1.8"
          />
        </g>

        {/* Hologram scan ring on the platform */}
        <motion.ellipse
          cx="152"
          cy="198"
          rx={33.5}
          ry={5.5}
          fill="none"
          stroke={accent}
          strokeWidth="1.8"
          strokeOpacity="0.6"
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
          initial={{ scaleX: 0.92, strokeOpacity: 0.35 }}
          animate={{ scaleX: [0.92, 1.07, 0.92], strokeOpacity: [0.35, 0.85, 0.35] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Energy tether from emitter to bot */}
        {!isWon ? (
          <g>
            <motion.line
              x1="152"
              y1="40"
              x2="152"
              y2="54"
              stroke={accent}
              strokeWidth="2.5"
              strokeLinecap="round"
              filter={`url(#${glowId})`}
              animate={{ strokeOpacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            <circle cx="152" cy="40" r="2.5" fill={accent} />
          </g>
        ) : (
          <motion.circle
            cx="152"
            cy="42"
            r="6"
            fill="#38EF7D"
            initial={{ scale: 1.4, opacity: 0.9 }}
            animate={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        )}

        {/* Subtle translucent hologram silhouette when waiting for parts */}
        {!isWon && parts < maxParts && (
          <g opacity="0.14" stroke="#7DD3FC" strokeWidth="1.5" strokeDasharray="3 3" fill="none">
            {!show(1) && <rect x="128" y="60" width="48" height="38" rx="16" />}
            {!show(2) && <rect x="134" y="102" width="36" height="42" rx="13" />}
            {!show(3) && <path d="M132 108 Q116 118 116 134" />}
            {!show(4) && <path d="M172 108 Q188 118 188 134" />}
            {!show(5) && <path d="M142 144 L140 182" />}
            {!show(6) && <path d="M162 144 L164 182" />}
          </g>
        )}

        {/* ---------- ARTICULATED CYBER-BOT CHARACTER ---------- */}
        <motion.g
          style={{ transformOrigin: "152px 40px" }}
          animate={
            isWon
              ? { y: 18, rotate: 0, x: 0 }
              : isLost
              ? { x: [0, -3, 3, -2, 0], opacity: [1, 0.72, 1] }
              : parts > 0
              ? { y: [0, -3, 0], rotate: [-1.5, 1.5, -1.5] }
              : { y: 0, rotate: 0 }
          }
          transition={
            isWon
              ? { type: "spring", stiffness: 150, damping: 12 }
              : isLost
              ? { duration: 0.55, repeat: Infinity, repeatDelay: 0.6 }
              : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }
          }
        >
          {/* 5. Left Cyber-Leg & Boot */}
          {show(5) && (
            <motion.g
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={POP}
              style={{ transformOrigin: "142px 144px" }}
            >
              <rect
                x="136"
                y="142"
                width="12"
                height="26"
                rx="5"
                fill={`url(#${armorGradId})`}
                stroke={accent}
                strokeWidth="2.2"
              />
              {/* Boot */}
              <path
                d="M132 166 L149 166 L149 178 Q149 182 144 182 L130 182 Q126 182 126 177 Q126 168 132 166 Z"
                fill="#112047"
                stroke={accent}
                strokeWidth="2.2"
              />
              <line x1="130" y1="178" x2="146" y2="178" stroke={accent} strokeWidth="1.5" strokeOpacity="0.6" />
            </motion.g>
          )}

          {/* 6. Right Cyber-Leg & Boot */}
          {show(6) && (
            <motion.g
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={POP}
              style={{ transformOrigin: "162px 144px" }}
            >
              <rect
                x="156"
                y="142"
                width="12"
                height="26"
                rx="5"
                fill={`url(#${armorGradId})`}
                stroke={accent}
                strokeWidth="2.2"
              />
              {/* Boot */}
              <path
                d="M155 166 L172 166 Q178 168 178 177 Q178 182 174 182 L160 182 Q155 182 155 178 Z"
                fill="#112047"
                stroke={accent}
                strokeWidth="2.2"
              />
              <line x1="158" y1="178" x2="174" y2="178" stroke={accent} strokeWidth="1.5" strokeOpacity="0.6" />
            </motion.g>
          )}

          {/* 3. Left Articulated Arm */}
          {show(3) && (
            <motion.g
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={POP}
              style={{ transformOrigin: "132px 108px" }}
            >
              <path
                d={
                  armsUp
                    ? "M133 108 Q116 98 112 80"
                    : "M133 108 Q115 116 114 134"
                }
                stroke={accent}
                strokeWidth="8"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d={
                  armsUp
                    ? "M133 108 Q116 98 112 80"
                    : "M133 108 Q115 116 114 134"
                }
                stroke="#112047"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
              <circle
                cx={armsUp ? 112 : 114}
                cy={armsUp ? 78 : 135}
                r="5.5"
                fill="#162957"
                stroke={accent}
                strokeWidth="2"
              />
            </motion.g>
          )}

          {/* 4. Right Articulated Arm */}
          {show(4) && (
            <motion.g
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={POP}
              style={{ transformOrigin: "172px 108px" }}
            >
              <path
                d={
                  armsUp
                    ? "M171 108 Q188 98 192 80"
                    : "M171 108 Q189 116 190 134"
                }
                stroke={accent}
                strokeWidth="8"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d={
                  armsUp
                    ? "M171 108 Q188 98 192 80"
                    : "M171 108 Q189 116 190 134"
                }
                stroke="#112047"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
              <circle
                cx={armsUp ? 192 : 190}
                cy={armsUp ? 78 : 135}
                r="5.5"
                fill="#162957"
                stroke={accent}
                strokeWidth="2"
              />
            </motion.g>
          )}

          {/* 2. Armored Torso & Reactor Core */}
          {show(2) && (
            <motion.g
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={POP}
              style={{ transformOrigin: "152px 122px" }}
            >
              <rect
                x="133"
                y="101"
                width="38"
                height="44"
                rx="13"
                fill={`url(#${armorGradId})`}
                stroke={accent}
                strokeWidth="2.5"
                filter={`url(#${glowId})`}
              />
              {/* Chest armor trim */}
              <path
                d="M138 110 L166 110"
                stroke={accent}
                strokeWidth="1.5"
                strokeOpacity="0.4"
              />
              {/* Belt */}
              <rect
                x="135"
                y="134"
                width="34"
                height="6"
                rx="3"
                fill="#070D20"
                stroke={accent}
                strokeWidth="1.2"
                strokeOpacity="0.55"
              />
              {/* Glowing Diamond Core */}
              <motion.polygon
                points="152,113 159,122 152,131 145,122"
                fill={accent}
                animate={{ opacity: [0.65, 1, 0.65], scale: [0.95, 1.06, 0.95] }}
                style={{ transformOrigin: "152px 122px" }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </motion.g>
          )}

          {/* 1. Cyber-Helmet Head & Axolotl Gill Fins */}
          {show(1) && (
            <motion.g
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={POP}
              style={{ transformOrigin: "152px 78px" }}
            >
              {/* Antenna */}
              <line
                x1="152"
                y1="52"
                x2="152"
                y2="59"
                stroke={accent}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle
                cx="152"
                cy="50"
                r="3.5"
                fill={accent}
                filter={`url(#${glowId})`}
              />

              {/* Cute Axolotl Cyber-Gill Fins on sides of helmet */}
              <g stroke="#FF6AD5" strokeWidth="3.5" strokeLinecap="round">
                <line x1="126" y1="70" x2="117" y2="64" />
                <line x1="125" y1="78" x2="114" y2="78" />
                <line x1="126" y1="86" x2="117" y2="91" />
                <line x1="178" y1="70" x2="187" y2="64" />
                <line x1="179" y1="78" x2="190" y2="78" />
                <line x1="178" y1="86" x2="187" y2="91" />
              </g>

              {/* Helmet Shell */}
              <rect
                x="126"
                y="58"
                width="52"
                height="41"
                rx="18"
                fill={`url(#${armorGradId})`}
                stroke={accent}
                strokeWidth="2.6"
                filter={`url(#${glowId})`}
              />

              {/* Visor Screen */}
              <rect
                x="133"
                y="65"
                width="38"
                height="26"
                rx="11"
                fill="#050914"
                stroke={accent}
                strokeWidth="1.4"
                strokeOpacity="0.65"
              />
              {/* Subtle visor glass sheen */}
              <path
                d="M138 69 Q146 67 154 68"
                stroke="#ffffff"
                strokeWidth="1.4"
                strokeOpacity="0.3"
                strokeLinecap="round"
                fill="none"
              />

              {/* Visor Face Expression */}
              {isLost ? (
                <g stroke="#FF4D6D" strokeWidth="2.4" strokeLinecap="round">
                  <line x1="140" y1="73" x2="146" y2="79" />
                  <line x1="146" y1="73" x2="140" y2="79" />
                  <line x1="158" y1="73" x2="164" y2="79" />
                  <line x1="164" y1="73" x2="158" y2="79" />
                  <path d="M145 86 Q149 82 152 85 Q155 88 159 84" fill="none" strokeWidth="2" />
                </g>
              ) : isWon ? (
                <g>
                  <g stroke="#38EF7D" strokeWidth="2.6" strokeLinecap="round" fill="none">
                    <path d="M139 77 Q143 71 147 77" />
                    <path d="M157 77 Q161 71 165 77" />
                    <path d="M145 83 Q152 89 159 83" />
                  </g>
                  <circle cx="138" cy="82" r="2" fill="#FF6AD5" opacity="0.8" />
                  <circle cx="166" cy="82" r="2" fill="#FF6AD5" opacity="0.8" />
                </g>
              ) : (
                <g>
                  <motion.circle
                    cx="143"
                    cy="76"
                    r={danger >= 0.65 ? 2.4 : 3.1}
                    fill={accent}
                    animate={{ scaleY: [1, 1, 0.15, 1] }}
                    transition={{
                      duration: 3.2,
                      repeat: Infinity,
                      times: [0, 0.9, 0.95, 1],
                    }}
                  />
                  <motion.circle
                    cx="161"
                    cy="76"
                    r={danger >= 0.65 ? 2.4 : 3.1}
                    fill={accent}
                    animate={{ scaleY: [1, 1, 0.15, 1] }}
                    transition={{
                      duration: 3.2,
                      repeat: Infinity,
                      times: [0, 0.9, 0.95, 1],
                    }}
                  />
                  <circle cx="142" cy="74.8" r="1" fill="#ffffff" />
                  <circle cx="160" cy="74.8" r="1" fill="#ffffff" />

                  <path
                    d={
                      danger >= 0.5
                        ? "M146 86 Q152 82 158 86"
                        : "M147 84 Q152 87 157 84"
                    }
                    stroke={accent}
                    strokeWidth="2.1"
                    strokeLinecap="round"
                    fill="none"
                  />

                  {danger >= 0.5 && (
                    <motion.path
                      d="M174 64 Q177 69 174 72 Q171 69 174 64 Z"
                      fill="#7DD3FC"
                      animate={{ y: [0, 7], opacity: [1, 0] }}
                      transition={{ duration: 1.1, repeat: Infinity }}
                    />
                  )}
                </g>
              )}
            </motion.g>
          )}
        </motion.g>

        {/* Win celebration sparkles */}
        {isWon &&
          [
            [112, 96],
            [194, 96],
            [106, 152],
            [198, 152],
            [152, 56],
          ].map(([x, y], i) => (
            <motion.text
              key={i}
              x={x}
              y={y}
              fontSize="14"
              textAnchor="middle"
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0.5, 1.2, 0.7],
                y: [0, -10, -16],
              }}
              transition={{
                duration: 1.6,
                delay: 0.25 + i * 0.12,
                repeat: Infinity,
                repeatDelay: 0.6,
              }}
            >
              ✨
            </motion.text>
          ))}

        {/* Loss regeneration scanline */}
        {isLost && (
          <motion.rect
            x="110"
            y="54"
            width="84"
            height="4"
            rx="2"
            fill="#FF4D6D"
            opacity="0.45"
            animate={{ y: [54, 186, 54] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        )}
      </svg>
    </div>
  );
};
