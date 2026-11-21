"use client";

import React, { useId } from "react";
import { motion } from "framer-motion";
import { CrewmateGlyph } from "@/components/visuals/Crewmate";

export interface MapSector {
  id: string;
  name: string;
  shortTag: string;
  integrity: number;
  hasSabotageBug: boolean;
}

export interface MapCrew {
  id: string;
  color: string;
  sectorId: string;
  isFrozen: boolean;
  isSaboteur: boolean;
  isExposed?: boolean;
  label: string;
}

interface StationMapProps {
  sectors: MapSector[];
  crew: MapCrew[];
  selectedId: string;
  onSelect: (id: string) => void;
  onEmergency?: () => void;
  revealSaboteurs?: boolean;
  orientation?: "landscape" | "portrait";
  playerId?: string;
}

interface Layout {
  viewBox: string;
  width: number;
  height: number;
  roomW: number;
  roomH: number;
  slots: { x: number; y: number }[];
  hub: { x: number; y: number };
  hull: { x: number; y: number; w: number; h: number; r: number };
}

const LAYOUTS: Record<"landscape" | "portrait", Layout> = {
  landscape: {
    viewBox: "0 0 660 400",
    width: 660,
    height: 400,
    roomW: 180,
    roomH: 132,
    slots: [
      { x: 40, y: 34 },
      { x: 240, y: 22 },
      { x: 440, y: 34 },
      { x: 40, y: 234 },
      { x: 240, y: 246 },
      { x: 440, y: 234 },
    ],
    hub: { x: 330, y: 200 },
    hull: { x: 18, y: 10, w: 624, h: 380, r: 70 },
  },
  portrait: {
    viewBox: "0 0 380 640",
    width: 380,
    height: 640,
    roomW: 166,
    roomH: 150,
    slots: [
      { x: 16, y: 22 },
      { x: 198, y: 22 },
      { x: 16, y: 230 },
      { x: 198, y: 230 },
      { x: 16, y: 438 },
      { x: 198, y: 438 },
    ],
    hub: { x: 190, y: 305 },
    hull: { x: 6, y: 6, w: 368, h: 600, r: 60 },
  },
};

const STARS = Array.from({ length: 28 }).map((_, i) => ({
  x: (i * 137) % 660,
  y: (i * 89) % 640,
  r: i % 4 === 0 ? 1.6 : 0.9,
  d: 1.5 + (i % 5) * 0.5,
}));

function integrityColor(v: number) {
  if (v >= 85) return "#38EF7D";
  if (v >= 60) return "#00F2FE";
  if (v >= 40) return "#FFB800";
  return "#FF4D6D";
}

/**
 * Interactive top-down map of the "Orbita-Lynn" cyber station for the 15–18 player
 * Cyber-Crew mode. Sectors glow when sabotaged, Cyber-Rangers work at consoles,
 * and the Holographic Crystal Sonar Core sits in the central hub.
 */
export const StationMap: React.FC<StationMapProps> = ({
  sectors,
  crew,
  selectedId,
  onSelect,
  onEmergency,
  revealSaboteurs = false,
  orientation = "landscape",
  playerId = "p1",
}) => {
  const uid = useId().replace(/:/g, "");
  const L = LAYOUTS[orientation];
  const glow = `map-glow-${uid}`;
  const hullGrad = `map-hull-${uid}`;

  // Precompute smoothly animated positions for every crewmate keyed by id
  const crewPositions = React.useMemo(() => {
    const perRoomCounter: Record<string, number> = {};
    const perRow = Math.max(1, Math.floor((L.roomW - 20) / 24));
    const maxRows = Math.max(1, Math.floor((L.roomH - 72) / 26));

    return crew.map((c) => {
      const secIdx = Math.max(
        0,
        sectors.slice(0, 6).findIndex((s) => s.id === c.sectorId)
      );
      const slot = L.slots[secIdx] ?? L.slots[0];
      const idxInRoom = perRoomCounter[c.sectorId] ?? 0;
      perRoomCounter[c.sectorId] = idxInRoom + 1;

      const capped = idxInRoom % (perRow * maxRows);
      const col = capped % perRow;
      const row = Math.floor(capped / perRow);

      // Exposed impostors float outside the hull in space!
      if (c.isExposed) {
        return {
          crew: c,
          x: orientation === "landscape" ? 605 : 338,
          y: 12 + (idxInRoom % 3) * 32,
        };
      }

      return {
        crew: c,
        x: slot.x + 12 + col * 24,
        y: slot.y + 48 + row * 26,
      };
    });
  }, [crew, sectors, L.roomW, L.roomH, L.slots, orientation]);

  return (
    <svg
      viewBox={L.viewBox}
      className="h-auto w-full select-none"
      role="group"
      aria-label="Карта станції Орбіта-Лінн"
    >
      <defs>
        <filter id={glow} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id={hullGrad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0E1A3A" />
          <stop offset="100%" stopColor="#070C1C" />
        </linearGradient>
      </defs>

      {/* Space backdrop */}
      {STARS.filter((s) => s.x < L.width && s.y < L.height).map((s, i) => (
        <motion.circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.r}
          fill="#fff"
          animate={{ opacity: [0.15, 0.9, 0.15] }}
          transition={{ duration: s.d, repeat: Infinity }}
        />
      ))}

      {/* Engine flames */}
      {orientation === "landscape" ? (
        [140, 260].map((y) => (
          <motion.path
            key={y}
            d={`M20 ${y - 14} L0 ${y} L20 ${y + 14} Z`}
            fill="#FFB800"
            filter={`url(#${glow})`}
            animate={{ scaleX: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
            style={{ transformOrigin: `20px ${y}px` }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
        ))
      ) : (
        [120, 260].map((x) => (
          <motion.path
            key={x}
            d={`M${x - 14} 604 L${x} 636 L${x + 14} 604 Z`}
            fill="#FFB800"
            filter={`url(#${glow})`}
            animate={{ scaleY: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
            style={{ transformOrigin: `${x}px 604px` }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
        ))
      )}

      {/* Hull */}
      <rect
        x={L.hull.x}
        y={L.hull.y}
        width={L.hull.w}
        height={L.hull.h}
        rx={L.hull.r}
        fill={`url(#${hullGrad})`}
        stroke="rgba(79,172,254,0.35)"
        strokeWidth="3"
      />

      {/* Corridors to the central hub */}
      {sectors.slice(0, 6).map((sec, i) => {
        const s = L.slots[i];
        const cx = s.x + L.roomW / 2;
        const cy = s.y + L.roomH / 2;
        return (
          <g key={`cor-${sec.id}`}>
            <line x1={cx} y1={cy} x2={L.hub.x} y2={L.hub.y} stroke="#0B1530" strokeWidth="22" strokeLinecap="round" />
            <motion.line
              x1={cx}
              y1={cy}
              x2={L.hub.x}
              y2={L.hub.y}
              stroke={sec.hasSabotageBug ? "#FF4D6D" : "#4FACFE"}
              strokeWidth="2"
              strokeDasharray="6 10"
              opacity="0.7"
              animate={{ strokeDashoffset: [0, -32] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
            />
          </g>
        );
      })}

      {/* Rooms */}
      {sectors.slice(0, 6).map((sec, i) => {
        const s = L.slots[i];
        const isSel = sec.id === selectedId;
        const barW = L.roomW - 28;
        const iColor = integrityColor(sec.integrity);

        return (
          <g
            key={sec.id}
            role="button"
            tabIndex={0}
            aria-label={`${sec.name}, цілісність ${sec.integrity}%${sec.hasSabotageBug ? ", вірус" : ""}`}
            aria-pressed={isSel}
            onClick={() => onSelect(sec.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(sec.id);
              }
            }}
            className="cursor-pointer outline-none"
          >
            <motion.rect
              x={s.x}
              y={s.y}
              width={L.roomW}
              height={L.roomH}
              rx="18"
              fill={
                sec.hasSabotageBug
                  ? "rgba(255,77,109,0.14)"
                  : isSel
                  ? "rgba(0,242,254,0.12)"
                  : "rgba(16,27,56,0.92)"
              }
              stroke={
                isSel ? "#00F2FE" : sec.hasSabotageBug ? "#FF4D6D" : "rgba(255,255,255,0.14)"
              }
              strokeWidth={isSel ? 3 : 2}
              filter={isSel || sec.hasSabotageBug ? `url(#${glow})` : undefined}
              animate={sec.hasSabotageBug ? { opacity: [1, 0.65, 1] } : { opacity: 1 }}
              transition={{ duration: 1, repeat: sec.hasSabotageBug ? Infinity : 0 }}
            />

            {/* floor tiles */}
            <g opacity="0.08">
              {Array.from({ length: Math.floor(L.roomW / 30) }).map((_, k) => (
                <line
                  key={k}
                  x1={s.x + 15 + k * 30}
                  y1={s.y + 50}
                  x2={s.x + 15 + k * 30}
                  y2={s.y + L.roomH - 26}
                  stroke="#fff"
                />
              ))}
            </g>

            <text x={s.x + 14} y={s.y + 26} fontSize={orientation === "portrait" ? 13 : 15} fontWeight="700" fill="#ffffff">
              {sec.name}
            </text>
            <text x={s.x + 14} y={s.y + 43} fontSize="11" fill="#7DD3FC" fontFamily="monospace">
              {sec.shortTag}
            </text>

            {sec.hasSabotageBug && (
              <motion.g
                animate={{ scale: [1, 1.2, 1] }}
                style={{ transformOrigin: `${s.x + L.roomW - 22}px ${s.y + 40}px` }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                <circle cx={s.x + L.roomW - 22} cy={s.y + 40} r="12" fill="#FF4D6D" />
                <text
                  x={s.x + L.roomW - 22}
                  y={s.y + 45}
                  fontSize="15"
                  fontWeight="900"
                  textAnchor="middle"
                  fill="#fff"
                >
                  !
                </text>
              </motion.g>
            )}

            {/* Integrity bar */}
            <rect x={s.x + 14} y={s.y + L.roomH - 18} width={barW} height="7" rx="3.5" fill="rgba(255,255,255,0.08)" />
            <motion.rect
              x={s.x + 14}
              y={s.y + L.roomH - 18}
              height="7"
              rx="3.5"
              fill={iColor}
              initial={false}
              animate={{ width: (barW * Math.max(0, Math.min(100, sec.integrity))) / 100 }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
            />
            <text
              x={s.x + L.roomW - 14}
              y={s.y + L.roomH - 24}
              fontSize="10"
              textAnchor="end"
              fill={iColor}
              fontFamily="monospace"
            >
              {sec.integrity}%
            </text>
          </g>
        );
      })}

      {/* Live Moving Crewmates Layer (Glides smoothly between rooms!) */}
      <g className="pointer-events-none">
        {crewPositions.map(({ crew: c, x, y }, k) => {
          const isPlayer = c.id === playerId;
          return (
            <motion.g
              key={c.id}
              initial={false}
              animate={{
                x,
                y: c.isFrozen ? y : [y, y - 2, y],
                opacity: c.isExposed ? 0.55 : 1,
                rotate: c.isExposed ? 28 : 0,
              }}
              transition={{
                x: { type: "spring", stiffness: 65, damping: 16 },
                y: {
                  duration: 1.5 + (k % 3) * 0.25,
                  repeat: c.isFrozen ? 0 : Infinity,
                  ease: "easeInOut",
                },
              }}
            >
              <title>{c.label}</title>
              {isPlayer && !c.isExposed && (
                <g>
                  <circle
                    cx={11}
                    cy={14}
                    r={14}
                    fill="none"
                    stroke="#00F2FE"
                    strokeWidth="1.6"
                    strokeDasharray="3 2"
                  />
                  <rect
                    x={1}
                    y={-12}
                    width={20}
                    height={10}
                    rx={4}
                    fill="#00F2FE"
                  />
                  <text
                    x={11}
                    y={-4.5}
                    fontSize="7"
                    fontWeight="900"
                    textAnchor="middle"
                    fill="#050914"
                    fontFamily="monospace"
                  >
                    ТИ
                  </text>
                </g>
              )}
              <CrewmateGlyph
                idPrefix={`${uid}-${c.id}`}
                x={0}
                y={0}
                scale={isPlayer ? 0.62 : 0.54}
                color={c.color}
                isFrozen={c.isFrozen}
                isExposed={c.isExposed}
                showSaboteurMark={revealSaboteurs && c.isSaboteur}
              />
            </motion.g>
          );
        })}
      </g>

      {/* Central Holographic Byte-Crystal Sonar Core */}
      <g
        role="button"
        tabIndex={0}
        aria-label="Скликати Кібер-Раду аудиту логів"
        onClick={onEmergency}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && onEmergency) {
            e.preventDefault();
            onEmergency();
          }
        }}
        className={onEmergency ? "cursor-pointer outline-none" : ""}
      >
        <circle cx={L.hub.x} cy={L.hub.y} r="34" fill="#0B1530" stroke="rgba(0,242,254,0.4)" strokeWidth="2.6" />
        <motion.polygon
          points={`${L.hub.x},${L.hub.y - 22} ${L.hub.x + 18},${L.hub.y} ${L.hub.x},${L.hub.y + 22} ${L.hub.x - 18},${L.hub.y}`}
          fill="#00F2FE"
          filter={`url(#${glow})`}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.14, 1] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
        <polygon
          points={`${L.hub.x},${L.hub.y - 12} ${L.hub.x + 9},${L.hub.y} ${L.hub.x},${L.hub.y + 12} ${L.hub.x - 9},${L.hub.y}`}
          fill="#E0F7FF"
          opacity="0.7"
        />
        <text x={L.hub.x} y={L.hub.y + 54} fontSize="11" textAnchor="middle" fill="#67E8F9" fontFamily="monospace" fontWeight="700">
          РАДА
        </text>
      </g>
    </svg>
  );
};
