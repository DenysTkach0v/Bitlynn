"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Zap,
  CheckCircle2,
  X,
  Cpu,
  Cable,
  Bug,
  Gauge,
  Grid,
  Snowflake,
  BookOpen,
  MessageSquareHeart,
} from "lucide-react";
import { TaskMiniGameKind } from "@/data/crewShipData";
import {
  mgFeedback,
  onCrewUiPulse,
  playCrewSfx,
  type CrewSfx,
} from "@/components/crew/crewAudio";

const PAD_SFX: CrewSfx[] = ["padTone0", "padTone1", "padTone2", "padTone3"];

export interface CrewLessonTerm {
  word: string;
  clue: string;
  subjectTitle: string;
}

interface CrewMiniGameModalProps {
  kind: TaskMiniGameKind | "rescue" | "sabotage-fix";
  roomName: string;
  targetName?: string;
  lessonTerm?: CrewLessonTerm;
  onAskPeers?: () => void;
  onSuccess: () => void;
  onClose: () => void;
}

/* Tiny inline pixel icons (no emoji) */
const PixelGlyph: React.FC<{ kind: "bug" | "check" }> = ({ kind }) => (
  <svg
    aria-hidden
    width="14"
    height="14"
    viewBox="0 0 7 7"
    shapeRendering="crispEdges"
    className="shrink-0"
  >
    {kind === "bug" ? (
      <g fill="#F6A5C0">
        <rect x="2" y="0" width="1" height="1" />
        <rect x="4" y="0" width="1" height="1" />
        <rect x="2" y="1" width="3" height="1" />
        <rect x="1" y="2" width="5" height="3" />
        <rect x="0" y="3" width="1" height="1" />
        <rect x="6" y="3" width="1" height="1" />
        <rect x="2" y="5" width="3" height="1" />
        <rect x="1" y="6" width="1" height="1" />
        <rect x="5" y="6" width="1" height="1" />
        <rect x="3" y="2" width="1" height="3" fill="#3D1422" />
      </g>
    ) : (
      <g fill="#2FA37A">
        <rect x="0" y="3" width="1" height="1" />
        <rect x="1" y="4" width="1" height="1" />
        <rect x="2" y="5" width="1" height="1" />
        <rect x="3" y="4" width="1" height="1" />
        <rect x="4" y="3" width="1" height="1" />
        <rect x="5" y="2" width="1" height="1" />
        <rect x="6" y="1" width="1" height="1" />
      </g>
    )}
  </svg>
);

/* =========================================================
   1. CABLE MATCHING MINI-GAME
========================================================= */
interface WirePair {
  id: string;
  left: string;
  right: string;
  color: string;
}

const WIRE_SETS: WirePair[][] = [
  [
    { id: "w1", left: "1 Байт", right: "8 бітів", color: "#6FB8FF" },
    { id: "w2", left: "1 Кілобайт", right: "1024 байти", color: "#F6A5C0" },
    { id: "w3", left: "1 Біт", right: "0 або 1", color: "#FFD36B" },
    { id: "w4", left: "UTF-16 (символ)", right: "2 байти", color: "#2FA37A" },
  ],
  [
    { id: "w1", left: "2 Байти", right: "16 бітів", color: "#6FB8FF" },
    { id: "w2", left: "Цикл FOR", right: "Повтор дій", color: "#F6A5C0" },
    { id: "w3", left: "Ромб у схемі", right: "Умова Так/Ні", color: "#FFD36B" },
    { id: "w4", left: "2FA Захист", right: "Пароль + Код", color: "#2FA37A" },
  ],
];

const WiringGame: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [pairs] = useState<WirePair[]>(
    () => WIRE_SETS[Math.floor(Math.random() * WIRE_SETS.length)]
  );
  const [rightOrder] = useState<WirePair[]>(() => {
    // Fixed deterministic scramble so it never stays identical to left order
    return [pairs[2], pairs[0], pairs[3], pairs[1]];
  });

  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [wrongFlash, setWrongFlash] = useState<string | null>(null);

  const handleRightTap = (rightPair: WirePair) => {
    if (!selectedLeftId) return;
    if (connectedIds.includes(rightPair.id)) return;

    if (selectedLeftId === rightPair.id) {
      mgFeedback("step", "wireZap");
      const next = [...connectedIds, rightPair.id];
      setConnectedIds(next);
      setSelectedLeftId(null);
      if (next.length === pairs.length) {
        setTimeout(onDone, 380);
      }
    } else {
      mgFeedback("wrong");
      setWrongFlash(rightPair.id);
      setSelectedLeftId(null);
      setTimeout(() => setWrongFlash(null), 450);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bl-inset p-3 text-sm leading-relaxed text-bl-muted">
        <span className="font-pixel font-medium text-bl-pink">Як грати:</span>{" "}
        Натисни роз&apos;єм зліва, а потім з&apos;єднай його з правильною парою
        справа{" "}
        <span className="font-pixel text-bl-pink">
          ({connectedIds.length}/4)
        </span>
      </div>

      <div className="relative grid grid-cols-2 gap-6 sm:gap-10 items-center py-2">
        {/* SVG Optical Laser Data Channels connecting matched pairs */}
        <svg
          viewBox="0 0 200 220"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full z-10"
        >
          {connectedIds.map((id) => {
            const leftIdx = pairs.findIndex((p) => p.id === id);
            const rightIdx = rightOrder.findIndex((p) => p.id === id);
            const wire = pairs[leftIdx];
            if (leftIdx === -1 || rightIdx === -1) return null;
            const y1 = 27 + leftIdx * 56;
            const y2 = 27 + rightIdx * 56;
            const d = `M 88 ${y1} C 100 ${y1}, 100 ${y2}, 112 ${y2}`;
            return (
              <g key={id}>
                <motion.path
                  d={d}
                  fill="none"
                  stroke={wire.color}
                  strokeOpacity="0.28"
                  strokeWidth="6"
                  strokeLinecap="square"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.25 }}
                />
                <motion.path
                  d={d}
                  fill="none"
                  stroke={wire.color}
                  strokeWidth="2.4"
                  strokeDasharray="4 4"
                  strokeLinecap="square"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.25 }}
                />
              </g>
            );
          })}
        </svg>

        {/* Left Ports */}
        <div className="space-y-3 relative z-20">
          {pairs.map((p) => {
            const isConn = connectedIds.includes(p.id);
            const isSel = selectedLeftId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={isConn}
                onClick={() => {
                  mgFeedback("tap", "wireSelect");
                  setSelectedLeftId(p.id);
                }}
                style={{
                  borderColor: isConn || isSel ? p.color : undefined,
                }}
                className={`bl-btn min-h-[46px] w-full justify-between px-3 text-xs ${
                  isConn ? "bl-btn-ok" : isSel ? "bl-btn-primary" : "bl-btn-ghost"
                }`}
              >
                <span className="truncate">{p.left}</span>
                <span
                  aria-hidden
                  className="ml-1.5 h-3 w-3 shrink-0 border-2 border-bl-deep"
                  style={{ backgroundColor: p.color }}
                />
              </button>
            );
          })}
        </div>

        {/* Right Ports */}
        <div className="space-y-3 relative z-20">
          {rightOrder.map((p) => {
            const isConn = connectedIds.includes(p.id);
            const isWrong = wrongFlash === p.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={isConn}
                onClick={() => handleRightTap(p)}
                style={{
                  borderColor: isConn ? p.color : undefined,
                }}
                className={`bl-btn min-h-[46px] w-full justify-between px-3 text-xs ${
                  isConn
                    ? "bl-btn-ok"
                    : isWrong
                    ? "bl-btn-danger"
                    : selectedLeftId
                    ? "bl-btn-sea"
                    : "bl-btn-ghost"
                }`}
              >
                <span
                  aria-hidden
                  className="mr-1.5 h-3 w-3 shrink-0 border-2 border-bl-deep"
                  style={{
                    backgroundColor: isConn ? p.color : "#3E4A66",
                  }}
                />
                <span className="truncate">{p.right}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   2. WAVE CALIBRATION MINI-GAME
========================================================= */
const TimingLockGame: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [stage, setStage] = useState(0); // 0, 1, 2 -> 3 locks
  const [pos, setPos] = useState(10);
  const [missMsg, setMissMsg] = useState(false);
  const dirRef = useRef(1);

  const zones = [
    { min: 45, max: 75 },
    { min: 25, max: 52 },
    { min: 62, max: 86 },
  ];
  const zone = zones[stage] ?? zones[0];

  useEffect(() => {
    let animId = 0;
    let last = performance.now();
    const speed = 78 + stage * 28; // % per second

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setPos((prev) => {
        let next = prev + dirRef.current * speed * dt;
        if (next >= 96) {
          next = 96;
          dirRef.current = -1;
        } else if (next <= 4) {
          next = 4;
          dirRef.current = 1;
        }
        return next;
      });
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [stage]);

  const handleLock = () => {
    if (pos >= zone.min && pos <= zone.max) {
      mgFeedback("step", "sonarTick");
      setMissMsg(false);
      if (stage >= 2) {
        onDone();
      } else {
        setStage((s) => s + 1);
      }
    } else {
      mgFeedback("wrong");
      setMissMsg(true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bl-inset p-3 text-sm leading-relaxed text-bl-muted">
        <span className="font-pixel font-medium text-bl-pink">Сонар:</span>{" "}
        Зупини сигнал у зеленій зоні 3 рази поспіль{" "}
        <span className="font-pixel text-bl-pink">({stage}/3)</span>
      </div>

      {/* 3 stage progress indicators */}
      <div className="flex justify-center gap-2.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-3 w-12 border-2 transition-colors ${
              i < stage
                ? "border-bl-kelp bg-bl-kelp"
                : i === stage
                ? "border-bl-pink bg-bl-pink/25"
                : "border-bl-line bg-bl-deep"
            }`}
          />
        ))}
      </div>

      {/* Moving Slider Track */}
      <div className="bl-inset relative h-12 w-full overflow-hidden">
        {/* Green Target Zone */}
        <div
          style={{
            left: `${zone.min}%`,
            width: `${zone.max - zone.min}%`,
          }}
          className="absolute inset-y-0 border-x-2 border-bl-kelp bg-bl-kelp/25"
        />

        {/* Moving Needle */}
        <div
          style={{ left: `calc(${pos}% - 5px)` }}
          className="absolute top-1.5 bottom-1.5 w-2.5 bg-bl-pink shadow-[0_0_0_2px_#2A1B2E]"
        />
      </div>

      {missMsg && (
        <p className="text-center text-sm text-bl-pink">
          Трохи повз зелену зону — спробуй ще раз.
        </p>
      )}

      <button
        type="button"
        onClick={handleLock}
        className="bl-btn bl-btn-ok min-h-[48px] w-full text-sm"
      >
        Зловити сигнал
      </button>
    </div>
  );
};

/* =========================================================
   3. VIRUS ZAP MINI-GAME (TAP RED BUGS, AVOID GREEN DATA)
========================================================= */
interface PacketItem {
  id: string;
  label: string;
  isVirus: boolean;
  x: number;
  y: number;
}

const INITIAL_PACKETS: PacketItem[] = [
  { id: "p1", label: "1КБ = 1000Б", isVirus: true, x: 0, y: 0 },
  { id: "p2", label: "1Б = 8 біт", isVirus: false, x: 0, y: 0 },
  { id: "p3", label: "1Б = 10 біт", isVirus: true, x: 0, y: 0 },
  { id: "p4", label: "1КБ = 1024Б", isVirus: false, x: 0, y: 0 },
  { id: "p5", label: "2FA захист", isVirus: false, x: 0, y: 0 },
  { id: "p6", label: "Пароль: 123", isVirus: true, x: 0, y: 0 },
];

const VirusZapGame: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [clearedIds, setClearedIds] = useState<string[]>([]);
  const [warn, setWarn] = useState<string | null>(null);

  const virusesTotal = INITIAL_PACKETS.filter((p) => p.isVirus).length;

  const handlePacketTap = (pkt: PacketItem) => {
    if (clearedIds.includes(pkt.id)) return;
    if (pkt.isVirus) {
      mgFeedback("step", "bugSquash");
      setWarn(null);
      const next = [...clearedIds, pkt.id];
      setClearedIds(next);
      if (next.length === virusesTotal) {
        setTimeout(onDone, 320);
      }
    } else {
      mgFeedback("wrong");
      setWarn(`Обережно! «${pkt.label}» — це правильні дані. Лови лише баги.`);
    }
  };

  return (
    <div className="space-y-3">
      <div className="bl-inset p-3 text-sm leading-relaxed text-bl-muted">
        <span className="font-pixel font-medium text-bl-pink">Вилов багів:</span>{" "}
        Прибери 3 помилкові факти, не чіпаючи правильних{" "}
        <span className="font-pixel text-bl-pink">
          ({clearedIds.length}/{virusesTotal})
        </span>
      </div>

      <div className="bl-inset grid grid-cols-2 gap-2.5 p-3">
        {INITIAL_PACKETS.map((pkt) => {
          const isCleared = clearedIds.includes(pkt.id);
          return (
            <button
              key={pkt.id}
              type="button"
              disabled={isCleared}
              onClick={() => handlePacketTap(pkt)}
              className={`bl-btn min-h-[52px] w-full justify-start px-3 text-xs ${
                isCleared ? "bl-btn-off" : pkt.isVirus ? "bl-btn-danger" : "bl-btn-ok"
              }`}
            >
              {isCleared ? (
                "Виловлено"
              ) : (
                <>
                  <PixelGlyph kind={pkt.isVirus ? "bug" : "check"} />
                  <span>{pkt.label}</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {warn && <p className="text-center text-sm text-bl-pink">{warn}</p>}
    </div>
  );
};

/* =========================================================
   4. QUANTUM MATRIX SEQUENCE
========================================================= */
const PAD_CONFIG = [
  { id: 0, label: "00", color: "#6FB8FF" },
  { id: 1, label: "01", color: "#F6A5C0" },
  { id: 2, label: "10", color: "#2FA37A" },
  { id: 3, label: "11", color: "#FFD36B" },
];

const SimonReactorGame: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [sequence] = useState<number[]>(() => [
    Math.floor(Math.random() * 4),
    Math.floor(Math.random() * 4),
    Math.floor(Math.random() * 4),
    Math.floor(Math.random() * 4),
  ]);
  const [playingDemo, setPlayingDemo] = useState(true);
  const [litPad, setLitPad] = useState<number | null>(null);
  const [userStep, setUserStep] = useState(0);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const playSequence = React.useCallback(() => {
    setPlayingDemo(true);
    setUserStep(0);
    setErrMsg(null);
    sequence.forEach((padId, idx) => {
      setTimeout(() => {
        setLitPad(padId);
        playCrewSfx(PAD_SFX[padId]);
        setTimeout(() => {
          setLitPad(null);
          if (idx === sequence.length - 1) {
            setPlayingDemo(false);
          }
        }, 360);
      }, idx * 560 + 250);
    });
  }, [sequence]);

  useEffect(() => {
    playSequence();
  }, [playSequence]);

  const handlePadTap = (padId: number) => {
    if (playingDemo) return;
    setLitPad(padId);
    setTimeout(() => setLitPad(null), 200);

    if (sequence[userStep] === padId) {
      mgFeedback("step", PAD_SFX[padId]);
      const nextStep = userStep + 1;
      setUserStep(nextStep);
      if (nextStep >= sequence.length) {
        // final step already rewarded above; the modal closes on success
        setTimeout(onDone, 300);
      }
    } else {
      mgFeedback("wrong");
      setErrMsg("Збій послідовності! Дивись ще раз...");
      setTimeout(playSequence, 800);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bl-inset flex items-center justify-between gap-2 p-3 text-sm text-bl-muted">
        <span>
          {playingDemo ? (
            "Запам'ятай порядок спалахів..."
          ) : (
            <>
              Твоя черга — повтори послідовність{" "}
              <span className="font-pixel text-bl-pink">
                ({userStep}/{sequence.length})
              </span>
            </>
          )}
        </span>
        {!playingDemo && (
          <button
            type="button"
            onClick={playSequence}
            className="bl-btn bl-btn-ghost shrink-0 text-xs"
          >
            Повторити
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
        {PAD_CONFIG.map((pad) => {
          const active = litPad === pad.id;
          return (
            <button
              key={pad.id}
              type="button"
              disabled={playingDemo}
              onClick={() => handlePadTap(pad.id)}
              style={{
                borderColor: active ? "#FFD3E2" : pad.color,
                backgroundColor: active ? pad.color : `${pad.color}22`,
                color: active ? "#0A0C12" : "#F3F4F8",
              }}
              className={`min-h-[72px] rounded-[4px] border-2 font-pixel text-xl font-bold shadow-[0_3px_0_0_#0A0C12] transition-colors active:translate-y-[2px] active:shadow-[0_1px_0_0_#0A0C12] ${
                active ? "outline outline-2 outline-offset-2 outline-bl-blush" : ""
              }`}
            >
              {pad.label}
            </button>
          );
        })}
      </div>

      {errMsg && <p className="text-center text-sm text-bl-pink">{errMsg}</p>}
    </div>
  );
};

/* =========================================================
   5. 8-BIT SWITCHBOARD MINI-GAME
========================================================= */
const BitSwitchGame: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [targetType] = useState<"byte" | "13">(() =>
    Math.random() > 0.5 ? "byte" : "13"
  );
  const [bits, setBits] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);
  const [err, setErr] = useState<string | null>(null);

  const weights = [128, 64, 32, 16, 8, 4, 2, 1];
  const activeCount = bits.reduce((a, b) => a + b, 0);
  const binaryVal = bits.reduce((acc, b, i) => acc + b * weights[i], 0);

  const handleSubmit = () => {
    const ok = targetType === "byte" ? activeCount === 8 : binaryVal === 13;
    if (ok) {
      mgFeedback("step");
      onDone();
    } else {
      mgFeedback("wrong");
      setErr(
        targetType === "byte"
          ? `Увімкнено ${activeCount} бітів — для 1 Байта потрібно всі 8!`
          : `Зараз число ${binaryVal} — увімкни перемикачі під 8, 4 і 1 (8+4+1 = 13)!`
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="bl-inset p-3 text-sm leading-relaxed text-bl-muted">
        {targetType === "byte" ? (
          <>
            <strong className="font-semibold text-bl-text">Увімкни 1 байт:</strong> переведи всі
            8 бітових перемикачів у стан <strong className="font-semibold text-bl-text">1</strong>.
          </>
        ) : (
          <>
            <strong className="font-semibold text-bl-text">Двійковий код 13:</strong> увімкни
            перемикачі так, щоб сума їхніх ваг дорівнювала{" "}
            <strong className="font-semibold text-bl-text">13</strong>.
          </>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {bits.map((b, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              playCrewSfx(b === 1 ? "bitOff" : "bitOn");
              setBits((prev) => prev.map((v, idx) => (idx === i ? 1 - v : v)));
            }}
            aria-pressed={b === 1}
            className={`bl-btn min-h-[54px] flex-col gap-0.5 px-1 ${
              b === 1 ? "bl-btn-primary" : "bl-btn-ghost"
            }`}
          >
            <span className="text-lg font-bold">{b}</span>
            {targetType === "13" && (
              <span className="text-[11px] opacity-80">
                +{weights[i]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between px-0.5 text-sm text-bl-muted">
        <span>
          {targetType === "byte" ? "Активовано бітів" : "Поточна сума"}
        </span>
        <span className="font-pixel text-base text-bl-pink">
          {targetType === "byte" ? `${activeCount}/8` : binaryVal}
        </span>
      </div>

      {err && <p className="text-sm text-bl-pink">{err}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        className="bl-btn bl-btn-ok min-h-[46px] w-full text-sm"
      >
        Увімкнути живлення
      </button>
    </div>
  );
};

/* =========================================================
   6. RESCUE / SABOTAGE QUICK FIX
========================================================= */
const RescueQuickTask: React.FC<{
  targetName: string;
  isSabotage?: boolean;
  onDone: () => void;
}> = ({ targetName, isSabotage, onDone }) => {
  const [err, setErr] = useState(false);

  return (
    <div className="space-y-4">
      <div className="bl-inset p-3 text-sm leading-relaxed text-bl-muted">
        {isSabotage ? (
          <>
            <strong className="font-semibold text-bl-text">Аварія у «{targetName}»:</strong>{" "}
            обери правильне співвідношення, щоб зупинити кризу.
          </>
        ) : (
          <>
            <strong className="font-semibold text-bl-text">Розморозка {targetName}:</strong>{" "}
            обери правильний код, щоб повернути друга в гру.
          </>
        )}
      </div>

      <p className="bl-title text-center text-lg">
        {isSabotage
          ? "Скільки байтів у 1 Кілобайті (КБ)?"
          : "Скільки бітів міститься у 2 Байтах?"}
      </p>

      <div className="grid grid-cols-1 gap-2">
        {(isSabotage
          ? [
              { label: "1024 байти (2¹⁰)", ok: true },
              { label: "1000 байтів рівно", ok: false },
              { label: "512 байтів", ok: false },
            ]
          : [
              { label: "16 бітів (2 × 8)", ok: true },
              { label: "20 бітів (2 × 10)", ok: false },
              { label: "10 бітів (2 + 8)", ok: false },
            ]
        ).map((opt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              if (opt.ok) {
                mgFeedback("step");
                onDone();
              } else {
                mgFeedback("wrong");
                setErr(true);
              }
            }}
            className="bl-btn bl-btn-ghost min-h-[46px] w-full px-4 text-sm"
          >
            {opt.label}
          </button>
        ))}
      </div>

      {err && (
        <p className="text-center text-sm text-bl-pink">
          Помилка коду. Підказка:{" "}
          {isSabotage ? "2¹⁰ = 1024 байти" : "1 Байт = 8 бітів, отже 2 × 8 = 16"}.
        </p>
      )}
    </div>
  );
};

/* =========================================================
   UNIFIED MODAL WRAPPER
========================================================= */
export const CrewMiniGameModal: React.FC<CrewMiniGameModalProps> = ({
  kind,
  roomName,
  targetName,
  lessonTerm,
  onAskPeers,
  onSuccess,
  onClose,
}) => {
  const headerMeta: Record<
    CrewMiniGameModalProps["kind"],
    { title: string; icon: React.ReactNode; badge: string }
  > = {
    wiring: {
      title: "З'єднай кабелі",
      icon: <Cable className="h-5 w-5 text-bl-sky" />,
      badge: roomName,
    },
    "timing-lock": {
      title: "Налаштуй сонар",
      icon: <Gauge className="h-5 w-5 text-bl-kelp" />,
      badge: roomName,
    },
    "virus-zap": {
      title: "Вилови баги",
      icon: <Bug className="h-5 w-5 text-bl-pink" />,
      badge: roomName,
    },
    "simon-reactor": {
      title: "Кодовий замок",
      icon: <Grid className="h-5 w-5 text-bl-brass" />,
      badge: roomName,
    },
    "bit-switches": {
      title: "Перемикачі байта",
      icon: <Cpu className="h-5 w-5 text-bl-aqua" />,
      badge: roomName,
    },
    rescue: {
      title: "Розморозь друга",
      icon: <Snowflake className="h-5 w-5 text-bl-glint" />,
      badge: targetName ?? "Друг",
    },
    "sabotage-fix": {
      title: "Зупини аварію",
      icon: <Zap className="h-5 w-5 text-bl-rose" />,
      badge: roomName,
    },
  };

  const meta = headerMeta[kind];

  // Reinforcement: shake on a mistake, green pixel glow on a correct step
  const panelRef = useRef<HTMLDivElement | null>(null);
  useEffect(
    () =>
      onCrewUiPulse((p) => {
        const el = panelRef.current;
        if (!el || typeof el.animate !== "function") return;
        if (p === "wrong") {
          el.animate(
            [
              { transform: "translateX(0)", boxShadow: "0 0 0 0 rgba(224,69,123,0)" },
              { transform: "translateX(-8px)", boxShadow: "0 0 0 4px rgba(224,69,123,0.9)" },
              { transform: "translateX(7px)" },
              { transform: "translateX(-5px)" },
              { transform: "translateX(4px)" },
              { transform: "translateX(-2px)" },
              { transform: "translateX(0)", boxShadow: "0 0 0 0 rgba(224,69,123,0)" },
            ],
            { duration: 360, easing: "steps(12, end)" }
          );
        } else {
          el.animate(
            [
              { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(47,163,122,0)" },
              { transform: "scale(1.015)", boxShadow: "0 0 0 4px rgba(47,163,122,0.85)" },
              { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(47,163,122,0)" },
            ],
            { duration: 280, easing: "steps(8, end)" }
          );
        }
      }),
    []
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bl-deep/85 p-3">
      <div ref={panelRef} className="w-full max-w-md rounded-[6px]">
      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 8, opacity: 0 }}
        transition={{ duration: 0.15, ease: "linear" }}
        className="bl-panel max-h-[90dvh] w-full max-w-md space-y-3.5 overflow-y-auto p-4 sm:p-5"
      >
        <div className="flex items-center justify-between border-b-2 border-bl-line pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-[4px] border-2 border-bl-line bg-bl-ink">
              {meta.icon}
            </span>
            <div>
              <div className="text-xs text-bl-muted">{meta.badge}</div>
              <h3 className="bl-title text-lg sm:text-xl">
                {meta.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Закрити міні-гру"
            className="bl-btn bl-btn-ghost min-w-[44px] px-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {lessonTerm && kind !== "rescue" && (
          <div className="bl-inset space-y-0.5 px-3 py-2 text-sm">
            <div className="flex items-center gap-1.5 font-pixel text-bl-pink">
              <BookOpen className="h-3.5 w-3.5 shrink-0" />
              <span>Термін уроку: {lessonTerm.word}</span>
            </div>
            <p className="text-sm leading-snug text-bl-muted">
              {lessonTerm.clue}
            </p>
          </div>
        )}

        {kind === "wiring" && <WiringGame onDone={onSuccess} />}
        {kind === "timing-lock" && <TimingLockGame onDone={onSuccess} />}
        {kind === "virus-zap" && <VirusZapGame onDone={onSuccess} />}
        {kind === "simon-reactor" && <SimonReactorGame onDone={onSuccess} />}
        {kind === "bit-switches" && <BitSwitchGame onDone={onSuccess} />}
        {kind === "rescue" && (
          <RescueQuickTask targetName={targetName ?? "Друг"} onDone={onSuccess} />
        )}
        {kind === "sabotage-fix" && (
          <RescueQuickTask
            targetName={roomName}
            isSabotage
            onDone={onSuccess}
          />
        )}

        <div className="flex flex-col gap-2 border-t-2 border-bl-line pt-3 text-sm text-bl-muted">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 font-pixel text-bl-lamp">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> +30..45 монет за
              виконання
            </span>
          </div>

          {onAskPeers && kind !== "rescue" && (
            <button
              type="button"
              onClick={onAskPeers}
              className="bl-btn bl-btn-ghost w-full text-xs"
            >
              <MessageSquareHeart className="h-4 w-4 shrink-0 text-bl-pink" />
              <span>Не зрозумів? Запитати клас на Біржі</span>
            </button>
          )}
        </div>
      </motion.div>
      </div>
    </div>
  );
};
