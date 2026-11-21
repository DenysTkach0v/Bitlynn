"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import {
  buildAxoPalette,
  getAxoGrid,
  getHeadGrid,
  gridToRects,
} from "@/components/crew/axolotlSprite";

interface MeetingSplashSceneProps {
  kind: "meeting" | "report";
  reason: string;
  primaryHex: string;
  gillHex: string;
  onSkip: () => void;
}

/** One pixel sprite as a list of <rect>s (P = svg units per sprite pixel). */
const PixelSprite: React.FC<{
  rects: { x: number; y: number; w: number; fill: string }[];
  P: number;
  x: number;
  y: number;
  opacity?: number;
}> = ({ rects, P, x, y, opacity = 1 }) => (
  <g transform={`translate(${x} ${y})`} opacity={opacity}>
    {rects.map((r, i) => (
      <rect key={i} x={r.x * P} y={r.y * P} width={r.w * P} height={P} fill={r.fill} />
    ))}
  </g>
);

/**
 * Council splash in the underwater "Купол": the player's axolotl programmer
 * (in their hoodie colour) hits the sonar table, the Bitlynn hologram lights up,
 * two surprised classmates look on. Pure pixel art, concept palette.
 */
export const MeetingSplashScene: React.FC<MeetingSplashSceneProps> = ({
  kind,
  reason,
  primaryHex,
  gillHex,
  onSkip,
}) => {
  const isReport = kind === "report";

  const hero = useMemo(
    () => gridToRects(getAxoGrid("stepA", "normal", 1), buildAxoPalette(primaryHex)),
    [primaryHex]
  );
  const left = useMemo(
    () => gridToRects(getAxoGrid("idle", "normal", 1), buildAxoPalette("#1F6F6B")),
    []
  );
  const right = useMemo(
    () => gridToRects(getAxoGrid("idle", "blink", -1), buildAxoPalette("#FF9F43")),
    []
  );
  const holo = useMemo(() => {
    const pal = buildAxoPalette("#000000");
    pal.G = gillHex;
    return gridToRects(getHeadGrid(), pal);
  }, [gillHex]);

  const bannerTitle = isReport ? "Скан: знайдено баг" : "Рада в Куполі";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: "linear" }}
      onClick={onSkip}
      className="bl-panel relative w-full max-w-xl cursor-pointer overflow-hidden select-none"
    >
      <div className="space-y-4 px-4 py-5 text-center sm:px-6 sm:py-6">
        <div className="relative mx-auto w-full max-w-[480px] overflow-hidden rounded-[4px] border-2 border-bl-line">
          <svg
            viewBox="0 0 240 120"
            className="block h-auto w-full"
            shapeRendering="crispEdges"
            aria-hidden="true"
          >
            {/* Dome wall + window to the sea */}
            <rect x="0" y="0" width="240" height="120" fill="#0A0C12" />
            <rect x="0" y="0" width="240" height="70" fill="#18253B" />
            {Array.from({ length: 12 }).map((_, i) => (
              <rect key={i} x={i * 20} y="0" width="1" height="70" fill="#152238" />
            ))}
            <rect x="0" y="0" width="240" height="2" fill="#5D6B8A" />
            {/* Big round window */}
            <rect x="84" y="6" width="72" height="54" fill="#3E4A66" />
            <rect x="88" y="10" width="64" height="46" fill="#0F3D66" />
            <rect x="92" y="14" width="6" height="2" fill="#9ED8FF" />
            <rect x="92" y="16" width="2" height="4" fill="#9ED8FF" />
            {/* fish passing behind glass */}
            <motion.g
              initial={{ x: 0 }}
              animate={{ x: [0, 44] }}
              transition={{ duration: 2.4, ease: "linear", repeat: Infinity }}
            >
              <rect x="100" y="40" width="8" height="4" fill="#FF9F43" />
              <rect x="96" y="39" width="2" height="6" fill="#FF9F43" />
              <rect x="106" y="41" width="1" height="1" fill="#2A1B2E" />
            </motion.g>
            <rect x="0" y="66" width="240" height="2" fill="#5D6B8A" />
            <rect x="0" y="68" width="240" height="2" fill="#3E4A66" />
            {/* Plank floor */}
            <rect x="0" y="70" width="240" height="50" fill="#262D45" />
            {[76, 82, 88, 94, 100, 106, 112].map((y) => (
              <rect key={y} x="0" y={y} width="240" height="1" fill="#1F2539" />
            ))}

            {/* Sonar table */}
            <rect x="96" y="86" width="48" height="8" fill="#C9A66B" />
            <rect x="98" y="88" width="44" height="4" fill="#0B2A4A" />
            <rect x="114" y="94" width="12" height="14" fill="#3E4A66" />
            <rect x="106" y="108" width="28" height="3" fill="#2B3550" />

            {/* Light cone + hologram */}
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.75, 1] }}
              transition={{ duration: 0.5, times: [0, 0.3, 0.6, 1] }}
            >
              <polygon points="110,88 130,88 140,58 100,58" fill="#F6A5C0" opacity="0.14" />
              <PixelSprite rects={holo} P={2.5} x={100} y={50} opacity={0.9} />
              {/* scanlines */}
              {[52, 57, 62, 67].map((y) => (
                <rect key={y} x="100" y={y} width="40" height="1" fill="#0E0F13" opacity="0.5" />
              ))}
            </motion.g>

            {/* Surprised classmates */}
            <motion.g
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.08, ease: "linear" }}
            >
              <PixelSprite rects={left} P={2} x={18} y={66} />
              <rect x="26" y="54" width="16" height="10" fill="#0A0C12" />
              <rect x="27" y="55" width="14" height="8" fill="#FFD36B" />
              <text x="34" y="62" fontSize="7" fontWeight="700" textAnchor="middle" fill="#2A1B2E" className="font-pixel">
                ?!
              </text>
            </motion.g>
            <motion.g
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.14, ease: "linear" }}
            >
              <PixelSprite rects={right} P={2} x={190} y={66} />
              <rect x="198" y="54" width="16" height="10" fill="#0A0C12" />
              <rect x="199" y="55" width="14" height="8" fill="#6FB8FF" />
              <text x="206" y="62" fontSize="7" fontWeight="700" textAnchor="middle" fill="#0A0C12" className="font-pixel">
                !
              </text>
            </motion.g>

            {/* Hero slams the table */}
            <motion.g
              initial={{ x: -20 }}
              animate={{ x: 0 }}
              transition={{ duration: 0.22, ease: "linear" }}
            >
              <PixelSprite rects={hero} P={2.4} x={58} y={60} />
              {/* impact pixels */}
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.4, delay: 0.2 }}
                fill="#FFD3E2"
              >
                <rect x="98" y="80" width="3" height="3" />
                <rect x="104" y="76" width="2" height="2" />
                <rect x="94" y="76" width="2" height="2" />
              </motion.g>
            </motion.g>

            {/* Rising bubbles */}
            {[30, 70, 170, 214].map((bx, i) => (
              <motion.rect
                key={bx}
                x={bx}
                y={110}
                width="2"
                height="2"
                fill="#9ED8FF"
                initial={{ y: 0, opacity: 0 }}
                animate={{ y: -50, opacity: [0, 0.8, 0] }}
                transition={{ duration: 2 + i * 0.3, repeat: Infinity, ease: "linear", delay: i * 0.2 }}
              />
            ))}
          </svg>
        </div>

        <motion.div
          initial={{ y: 4, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.06, duration: 0.15 }}
          className="space-y-2"
        >
          <span className="bl-tag">{reason}</span>
          <h2 className="bl-title text-2xl sm:text-3xl">{bannerTitle}</h2>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-bl-muted">
            Перевір формули в логах учасників і відправ Саботажника в Карантин.
          </p>
        </motion.div>

        <div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSkip();
            }}
            className="bl-btn bl-btn-primary px-4"
          >
            До логів
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
