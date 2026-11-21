"use client";

import React, { useId } from "react";
import { motion } from "framer-motion";
import {
  AXO_H,
  AXO_W,
  buildAxoPalette,
  getAxoGrid,
  gridToRects,
} from "@/components/crew/axolotlSprite";

export interface CrewmateLook {
  /** Hoodie colour of the axolotl programmer. */
  color: string;
  isFrozen?: boolean;
  /** Saboteur caught and sent to quarantine (X eyes). */
  isExposed?: boolean;
  /** Show the pink saboteur marker (only in the saboteur's own view). */
  showSaboteurMark?: boolean;
  facing?: "left" | "right";
  walking?: boolean;
}

/**
 * Bitlynn axolotl-programmer pixel sprite (16×22 grid from the design concept),
 * drawn inside the legacy 44×50 box so existing layouts keep their spacing.
 */
export const CrewmateGlyph: React.FC<
  CrewmateLook & { x?: number; y?: number; scale?: number; idPrefix: string }
> = ({
  color,
  isFrozen,
  isExposed,
  showSaboteurMark,
  facing = "right",
  walking = false,
  x = 0,
  y = 0,
  scale = 1,
}) => {
  const isMoving = Boolean(walking && !isFrozen);
  const grid = getAxoGrid(
    isMoving ? "stepA" : "idle",
    isExposed ? "x" : showSaboteurMark ? "sly" : "normal",
    isMoving ? (facing === "left" ? -1 : 1) : 0
  );
  const rects = gridToRects(grid, buildAxoPalette(color, isFrozen));
  const P = 2; // svg units per sprite pixel → 32×44
  const ox = (44 - AXO_W * P) / 2;
  const oy = 50 - AXO_H * P - 3;

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} shapeRendering="crispEdges">
      {/* pixel shadow */}
      <rect x="11" y="47" width="22" height="3" fill="rgba(5, 7, 12, 0.55)" />

      <g transform={`translate(${ox} ${oy})`}>
        {rects.map((r, i) => (
          <rect
            key={i}
            x={r.x * P}
            y={r.y * P}
            width={r.w * P}
            height={P}
            fill={r.fill}
          />
        ))}
      </g>

      {isFrozen && (
        <g>
          <rect
            x={ox - 3}
            y={oy - 2}
            width={AXO_W * P + 6}
            height={AXO_H * P + 4}
            fill="rgba(158, 216, 255, 0.22)"
            stroke="#9ED8FF"
            strokeWidth="1.5"
          />
          <rect x={ox + 1} y={oy + 2} width="6" height="2" fill="rgba(255,255,255,0.8)" />
          <rect x={ox + 1} y={oy + 4} width="2" height="4" fill="rgba(255,255,255,0.8)" />
        </g>
      )}

      {showSaboteurMark && !isExposed && (
        <g fill="#E0457B">
          <rect x="17" y="-6" width="10" height="2" />
          <rect x="19" y="-4" width="6" height="2" />
          <rect x="21" y="-2" width="2" height="2" />
        </g>
      )}
    </g>
  );
};

interface CrewmateProps extends CrewmateLook {
  size?: number;
  label?: string;
  animate?: boolean;
  className?: string;
}

/**
 * Standalone pixel avatar used in voting cards, role reveal and quarantine banner.
 */
export const Crewmate: React.FC<CrewmateProps> = ({
  size = 44,
  label,
  animate = true,
  className = "",
  ...look
}) => {
  const uid = useId().replace(/:/g, "");
  const h = Math.round(size * 1.14);

  return (
    <motion.svg
      width={size}
      height={h}
      viewBox="0 0 44 50"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`overflow-visible ${className}`}
      animate={animate && !look.isFrozen ? { y: [0, -2, 0] } : undefined}
      transition={
        animate && !look.isFrozen
          ? { duration: 1.2, repeat: Infinity, ease: "linear", times: [0, 0.5, 1] }
          : undefined
      }
    >
      <CrewmateGlyph {...look} idPrefix={`cm-${uid}`} />
    </motion.svg>
  );
};
