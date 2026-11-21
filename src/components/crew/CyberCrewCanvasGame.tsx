"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Map as MapIcon,
  Wrench,
  Bug,
  Snowflake,
  Siren,
  Vote,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Eye,
  Compass,
  Play,
  Radar,
  ShieldAlert,
  HelpCircle,
  X,
  Maximize2,
  Minimize2,
  Gamepad2,
  Navigation2,
  CircleDot,
} from "lucide-react";
import {
  CREW_SEED_18,
  HUB_TABLE,
  SABOTAGE_TRAPS,
  SHIP_CORRIDORS,
  SHIP_ROOMS,
  SHIP_PORTALS,
  TaskMiniGameKind,
  findCorridorPath,
  getRoomAt,
  getZoneLabelAt,
  isWalkable,
} from "@/data/crewShipData";
import { Crewmate } from "@/components/visuals/Crewmate";
import { VirtualJoystick } from "@/components/crew/VirtualJoystick";
import { CrewMiniGameModal } from "@/components/crew/CrewMiniGames";
import {
  crewFeedback,
  playCrewSfx,
  setLoopDuck,
  setSirenUrgency,
  startAmbience,
  startSiren,
  stopAllCrewLoops,
  stopSiren,
} from "@/components/crew/crewAudio";
import { MeetingSplashScene } from "@/components/crew/MeetingSplashScene";
import {
  CameraViewRect,
  SimCrewMember,
  WorldParticle,
  WorldPopupBurst,
  computeCameraViewRect,
  createStaticShipTextureCanvas,
  renderShipFrame,
  screenToWorld,
  type ScreenFxState,
} from "@/components/crew/ShipCanvasEngine";
import { AnswerVfxOverlay } from "@/components/ui/AnswerVfxOverlay";
import {
  isSoundEnabled,
  playSoundEffect,
  setSoundEnabled,
  triggerTapFeedback,
} from "@/lib/feedback";
import {
  LYNN_SKINS,
  useBitlynnStore,
} from "@/store/useBitlynnStore";

type CrewRoleMode = "engineer" | "saboteur";
type LobbyPresetSize = 15 | 16 | 17 | 18;
type CameraMode = "follow" | "overview";

interface ActiveMiniGameState {
  kind: TaskMiniGameKind | "rescue" | "sabotage-fix";
  roomId: string;
  roomName: string;
  targetMemberId?: string;
  targetMemberName?: string;
}

interface DiscreteHudState {
  zoneName: string;
  nearbyConsoleRoomId: string | null;
  nearbyFrozenId: string | null;
  nearbyFrozenName: string | null;
  nearbyFrozenAnon: string | null;
  nearbySaboteurTargetId: string | null;
  nearbySaboteurTargetName: string | null;
  nearbyPortalId: string | null;
  isNearHubTable: boolean;
}

const WORK_BUBBLE_ICONS = ["🔧", "💻", "⚡", "📡", "🛡️"];

function buildInitialRoster(): SimCrewMember[] {
  return CREW_SEED_18.map((seed, idx) => ({
    id: seed.id,
    name: seed.name,
    anonHandle: seed.anonHandle,
    avatarColor: seed.avatarColor,
    x: seed.startX,
    y: seed.startY,
    facing: idx % 2 === 0 ? "right" : "left",
    walking: false,
    walkPhase: idx * 0.85,
    idleOffset: idx * 0.73,
    isSaboteur: seed.isSaboteur,
    isFrozen: false,
    isExposed: false,
    lastCommitLog: seed.cleanLog,
    hasBugInCommit: false,
    wasNearSabotage: false,
    path: [],
    waitTimer: 0.4 + (idx % 4) * 0.55,
    bubbleIcon: idx === 0 ? null : WORK_BUBBLE_ICONS[idx % WORK_BUBBLE_ICONS.length],
  }));
}

const ALL_TASK_ROOM_IDS = SHIP_ROOMS.filter((r) => r.taskConsole).map(
  (r) => r.id
);

export const CyberCrewCanvasGame: React.FC = () => {
  const {
    noiseLevelDb,
    privacyScope,
    equippedSkin,
    templates,
    activeTemplateId,
    rewardCoins,
    triggerMistake,
    askPeersAboutTask,
    setActiveTab,
  } = useBitlynnStore();

  const activeSkin =
    LYNN_SKINS.find((s) => s.id === equippedSkin) ?? LYNN_SKINS[0];
  const activeTemplate =
    templates.find((t) => t.id === activeTemplateId) ?? templates[0];

  const [lobbySize, setLobbySize] = useState<LobbyPresetSize>(16);
  const [roleMode, setRoleMode] = useState<CrewRoleMode>("engineer");
  const [cameraMode, setCameraMode] = useState<CameraMode>("follow");
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [showDesktopJoystick, setShowDesktopJoystick] = useState(false);
  const [showRoleSplash, setShowRoleSplash] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [miniMapOpen, setMiniMapOpen] = useState(false);

  // Assigned tasks for the player (5 rooms)
  const [assignedTaskIds, setAssignedTaskIds] = useState<string[]>([
    "sec-memory",
    "sec-crypto",
    "sec-algo",
    "sec-radar",
    "sec-shield",
  ]);
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);

  // Live Sabotage Crisis & Cooldowns
  const [sabotagedRoomId, setSabotagedRoomId] = useState<string | null>(null);
  const [crisisTimer, setCrisisTimer] = useState<number>(0);
  const [freezeCooldown, setFreezeCooldown] = useState<number>(0);
  const [sabotageCooldown, setSabotageCooldown] = useState<number>(0);

  // Modals & Overlays
  const [activeMiniGame, setActiveMiniGame] =
    useState<ActiveMiniGameState | null>(null);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingKind, setMeetingKind] = useState<"meeting" | "report">(
    "meeting"
  );
  const [meetingIntroActive, setMeetingIntroActive] = useState(false);
  const meetingIntroTimerRef = useRef<number | null>(null);
  const [sfxOn, setSfxOn] = useState<boolean>(() => isSoundEnabled());
  const [meetingReason, setMeetingReason] = useState<string>(
    "Рада біля сонар-столу"
  );
  const [meetingFilter, setMeetingFilter] = useState<"alibi" | "all">("alibi");
  const [quarantineVerdict, setQuarantineVerdict] = useState<{
    name: string;
    color: string;
    wasSaboteur: boolean;
    remainingSaboteurs: number;
    commitLog: string;
  } | null>(null);
  const [actionBanner, setActionBanner] = useState<string | null>(null);
  const [vfxTrigger, setVfxTrigger] = useState(0);

  // Roster snapshot updated ONLY on discrete game events (NOT per-frame!)
  const worldCrewRef = useRef<SimCrewMember[]>(buildInitialRoster());
  const [rosterSnapshot, setRosterSnapshot] = useState<SimCrewMember[]>(
    () => worldCrewRef.current
  );

  // Discrete proximity HUD updated ONLY when zone / nearby interactive changes
  const [hud, setHud] = useState<DiscreteHudState>({
    zoneName: "Купол",
    nearbyConsoleRoomId: null,
    nearbyFrozenId: null,
    nearbyFrozenName: null,
    nearbyFrozenAnon: null,
    nearbySaboteurTargetId: null,
    nearbySaboteurTargetName: null,
    nearbyPortalId: null,
    isNearHubTable: true,
  });

  // High-FPS Mutable Canvas Engine Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const staticMapRef = useRef<HTMLCanvasElement | null>(null);
  const cameraCenterRef = useRef<{ x: number; y: number }>({
    x: worldCrewRef.current[0].x,
    y: worldCrewRef.current[0].y,
  });
  const viewRectRef = useRef<CameraViewRect>({
    vx: 0,
    vy: 0,
    vw: 480,
    vh: 320,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const petPosRef = useRef<{ x: number; y: number; facing: "left" | "right" }>({
    x: worldCrewRef.current[0].x - 22,
    y: worldCrewRef.current[0].y + 4,
    facing: "right",
  });
  const tapBeaconRef = useRef<{ x: number; y: number } | null>(null);
  const particlesRef = useRef<WorldParticle[]>([]);
  const popupsRef = useRef<WorldPopupBurst[]>([]);
  const portalPulseRef = useRef<Record<string, number>>({});
  const joystickRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const keysRef = useRef<Set<string>>(new Set());

  // Gameplay "juice": camera shake, flashes, shock-rings, squash & stretch
  const fxRef = useRef<ScreenFxState>({
    shake: 0,
    flashColor: "#FFFFFF",
    flashAlpha: 0,
    alarm: false,
    alarmUrgent: false,
    rings: [],
    hitPulse: {},
  });
  const juice = useCallback(
    (o: {
      shake?: number;
      flash?: [string, number];
      ring?: { x: number; y: number; color: string; maxR?: number; life?: number };
      rings?: { x: number; y: number; color: string; maxR?: number; life?: number }[];
      pulseIds?: string[];
      text?: { x: number; y: number; text: string; color: string };
    }) => {
      const fx = fxRef.current;
      const calm =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (o.shake && !calm) fx.shake = Math.max(fx.shake, o.shake);
      if (o.flash && !calm) {
        fx.flashColor = o.flash[0];
        fx.flashAlpha = Math.max(fx.flashAlpha, o.flash[1]);
      }
      const rings = [...(o.ring ? [o.ring] : []), ...(o.rings ?? [])];
      for (const r of rings) {
        const life = r.life ?? 0.7;
        fx.rings.push({ x: r.x, y: r.y, color: r.color, maxR: r.maxR ?? 70, life, maxLife: life });
      }
      for (const id of o.pulseIds ?? []) fx.hitPulse[id] = 1;
      if (o.text) {
        popupsRef.current.push({ ...o.text, life: 1.3, maxLife: 1.3, coin: false });
      }
    },
    []
  );

  const playerCrewColor =
    roleMode === "engineer" ? activeSkin.primaryHex : activeSkin.gillHex;

  const miniGameLessonTerm = useMemo(() => {
    if (!activeMiniGame || activeMiniGame.kind === "rescue") return undefined;
    const words = activeTemplate?.hangmanWords ?? [];
    if (words.length === 0) return undefined;
    const roomIdx = Math.max(
      0,
      SHIP_ROOMS.findIndex((r) => r.id === activeMiniGame.roomId)
    );
    const term = words[roomIdx % words.length];
    return {
      word: term.word,
      clue: term.clue,
      subjectTitle: activeTemplate.title,
    };
  }, [activeMiniGame, activeTemplate]);

  const activeCrew = useMemo(
    () => rosterSnapshot.slice(0, lobbySize),
    [rosterSnapshot, lobbySize]
  );

  const saboteursTotal = useMemo(
    () => activeCrew.filter((m) => m.isSaboteur).length,
    [activeCrew]
  );
  const exposedSaboteursCount = useMemo(
    () => activeCrew.filter((m) => m.isSaboteur && m.isExposed).length,
    [activeCrew]
  );
  const frozenCount = useMemo(
    () => activeCrew.filter((m) => m.isFrozen).length,
    [activeCrew]
  );

  const saboteurCrisisWon =
    roleMode === "saboteur" &&
    ((sabotagedRoomId !== null && crisisTimer === 0) || frozenCount >= 3);

  const isVictory =
    roleMode === "engineer"
      ? completedTaskIds.length >= assignedTaskIds.length ||
        exposedSaboteursCount >= saboteursTotal
      : saboteurCrisisWon;
  const isDefeat =
    roleMode === "engineer" && sabotagedRoomId !== null && crisisTimer === 0;
  const isMatchOver = isVictory || isDefeat;
  const isNoisy = noiseLevelDb >= 65;

  const canUseTask =
    roleMode === "engineer" &&
    hud.nearbyConsoleRoomId !== null &&
    (hud.nearbyConsoleRoomId === sabotagedRoomId ||
      (assignedTaskIds.includes(hud.nearbyConsoleRoomId) &&
        !completedTaskIds.includes(hud.nearbyConsoleRoomId)));

  // Nearest objective for canvas arrow & top-left HUD pill
  const nextObjective = useMemo(() => {
    if (sabotagedRoomId) {
      const r = SHIP_ROOMS.find((rm) => rm.id === sabotagedRoomId);
      if (r?.taskConsole) {
        return {
          x: r.taskConsole.x,
          y: r.taskConsole.y,
          color: "#E0457B",
          label: `Аварія: ${r.name}`,
        };
      }
    }
    const frozen = activeCrew.find((m) => m.isFrozen && m.id !== "p1");
    if (frozen && roleMode === "engineer") {
      return {
        x: frozen.x,
        y: frozen.y,
        color: "#9ED8FF",
        label: `Розморозь: ${frozen.name}`,
      };
    }
    const nextRoomId = assignedTaskIds.find(
      (id) => !completedTaskIds.includes(id)
    );
    const nextRoom = SHIP_ROOMS.find((rm) => rm.id === nextRoomId);
    if (nextRoom?.taskConsole && roleMode === "engineer") {
      return {
        x: nextRoom.taskConsole.x,
        y: nextRoom.taskConsole.y,
        color: "#FFD36B",
        label: nextRoom.name,
      };
    }
    return null;
  }, [sabotagedRoomId, activeCrew, roleMode, assignedTaskIds, completedTaskIds]);

  const spawnBurstParticles = useCallback(
    (x: number, y: number, color: string, count = 14) => {
      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
        const speed = 28 + Math.random() * 68;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed - 12,
          radius: 2.2 + Math.random() * 2.2,
          color,
          life: 0.45 + Math.random() * 0.35,
          maxLife: 0.8,
        });
      }
    },
    []
  );

  // Trigger a sabotage crisis in a room
  const triggerSabotageInRoom = useCallback(
    (targetRoomId: string, culpritId?: string) => {
      const room = SHIP_ROOMS.find((r) => r.id === targetRoomId);
      if (!room) return;
      const traps = SABOTAGE_TRAPS[targetRoomId] ?? [
        "1 КБ = 1000 байтів рівно",
      ];
      const trapText = traps[Math.floor(Math.random() * traps.length)];

      crewFeedback("sabotageStart");
      const cx = room.taskConsole?.x ?? room.rect.x + room.rect.w / 2;
      const cy = room.taskConsole?.y ?? room.rect.y + room.rect.h / 2;
      juice({
        shake: 6,
        flash: ["#E0457B", 0.35],
        rings: [
          { x: cx, y: cy, color: "#E0457B", maxR: 110, life: 0.9 },
          { x: cx, y: cy, color: "#FFD36B", maxR: 70, life: 0.6 },
        ],
        text: { x: cx, y: cy - 26, text: "АВАРІЯ!", color: "#E0457B" },
      });

      setSabotagedRoomId(targetRoomId);
      setCrisisTimer(35);

      const crew = worldCrewRef.current;
      const culprit =
        (culpritId ? crew.find((m) => m.id === culpritId) : undefined) ??
        crew.find((m) => m.isSaboteur && !m.isExposed && m.id !== "p1") ??
        crew.find((m) => m.isSaboteur);

      const bystanders = crew
        .filter(
          (m) =>
            m.id !== "p1" &&
            !m.isSaboteur &&
            !m.isExposed &&
            m.id !== culprit?.id
        )
        .slice(0, 2);

      const victimToFreeze = bystanders[0];

      worldCrewRef.current = crew.map((m) => {
        if (culprit && m.id === culprit.id) {
          return {
            ...m,
            x: room.rect.x + room.rect.w * 0.55,
            y: room.rect.y + room.rect.h * 0.65,
            path: [],
            waitTimer: 2.5,
            lastCommitLog: trapText,
            hasBugInCommit: true,
            wasNearSabotage: true,
          };
        }
        if (bystanders.some((b) => b.id === m.id)) {
          const frozenNow =
            victimToFreeze && m.id === victimToFreeze.id ? true : m.isFrozen;
          if (frozenNow) {
            spawnBurstParticles(m.x, m.y, "#9ED8FF", 14);
            const me = worldCrewRef.current[0];
            const d = me ? Math.hypot(me.x - m.x, me.y - m.y) : 999;
            playCrewSfx("freezeFar", {
              gain: Math.max(0.25, 1 - d / 600),
              pan: me ? (m.x - me.x) / 300 : 0,
            });
            juice({
              ring: { x: m.x, y: m.y, color: "#9ED8FF", maxR: 50 },
              pulseIds: [m.id],
            });
          }
          return {
            ...m,
            x: room.rect.x + room.rect.w * 0.35 + ((m.id.charCodeAt(1) % 3) * 14),
            y: room.rect.y + room.rect.h * 0.55,
            path: [],
            waitTimer: 3,
            isFrozen: frozenNow,
            bubbleIcon: frozenNow ? "❄️" : m.bubbleIcon,
            wasNearSabotage: true,
          };
        }
        return { ...m, wasNearSabotage: false };
      });
      setRosterSnapshot([...worldCrewRef.current]);
      setActionBanner(
        `Тривога! Аварія у «${room.name}» (35с). Біжи лагодити або скликай Раду в Куполі.`
      );
    },
    [spawnBurstParticles, juice]
  );

  // Reset / Start a fresh round
  const startNewRound = useCallback((nextRole: CrewRoleMode) => {
    crewFeedback("uiOpen");
    stopSiren();
    const fresh = buildInitialRoster().map((m) =>
      nextRole === "saboteur"
        ? m.id === "p1"
          ? { ...m, isSaboteur: true }
          : m.id === "p11"
          ? { ...m, isSaboteur: false }
          : m
        : m
    );
    worldCrewRef.current = fresh;
    setRosterSnapshot(fresh);
    cameraCenterRef.current = { x: fresh[0].x, y: fresh[0].y };
    petPosRef.current = {
      x: fresh[0].x - 22,
      y: fresh[0].y + 4,
      facing: "right",
    };
    particlesRef.current = [];
    popupsRef.current = [];
    fxRef.current.rings = [];
    fxRef.current.hitPulse = {};
    fxRef.current.shake = 0;
    fxRef.current.flashAlpha = 0;
    tapBeaconRef.current = null;
    setRoleMode(nextRole);
    setAssignedTaskIds(ALL_TASK_ROOM_IDS.slice(0, 5));
    setCompletedTaskIds([]);
    setSabotagedRoomId(null);
    setCrisisTimer(0);
    setFreezeCooldown(0);
    setSabotageCooldown(0);
    setActiveMiniGame(null);
    if (meetingIntroTimerRef.current !== null) {
      window.clearTimeout(meetingIntroTimerRef.current);
      meetingIntroTimerRef.current = null;
    }
    setMeetingIntroActive(false);
    setMeetingOpen(false);
    setQuarantineVerdict(null);
    setShowRoleSplash(true);
    setActionBanner(
      nextRole === "engineer"
        ? "Ти Інженер. Обійди 5 терміналів [!] або знайди 3 Саботажників."
        : "Ти Саботажник. Заморожуй гравців, пірнай у люки [V] і влаштовуй аварії."
    );
  }, []);

  useEffect(() => {
    return () => {
      if (meetingIntroTimerRef.current !== null) {
        window.clearTimeout(meetingIntroTimerRef.current);
      }
    };
  }, []);

  const skipMeetingIntro = useCallback(() => {
    if (meetingIntroTimerRef.current !== null) {
      window.clearTimeout(meetingIntroTimerRef.current);
      meetingIntroTimerRef.current = null;
    }
    setMeetingIntroActive(false);
  }, []);

  // Action handlers wrapped cleanly in refs/callbacks for keyboard + buttons
  const handleOpenMeeting = useCallback(
    (reason: string, kind: "meeting" | "report" = "meeting") => {
      crewFeedback(kind);

      const p1 = worldCrewRef.current[0];
      if (kind === "meeting") {
        spawnBurstParticles(HUB_TABLE.x, HUB_TABLE.y, "#6FE3FF", 24);
        spawnBurstParticles(HUB_TABLE.x, HUB_TABLE.y, "#F6A5C0", 16);
        juice({
          shake: 4,
          flash: ["#6FE3FF", 0.3],
          rings: [
            { x: HUB_TABLE.x, y: HUB_TABLE.y, color: "#6FE3FF", maxR: 140, life: 1 },
            { x: HUB_TABLE.x, y: HUB_TABLE.y, color: "#F6A5C0", maxR: 90, life: 0.8 },
          ],
          pulseIds: ["p1"],
        });
      } else if (p1) {
        spawnBurstParticles(p1.x, p1.y, "#FFD36B", 20);
        juice({
          shake: 3,
          flash: ["#FFD36B", 0.25],
          rings: [
            { x: p1.x, y: p1.y, color: "#FFD36B", maxR: 120, life: 0.9 },
            { x: p1.x, y: p1.y, color: "#FFD36B", maxR: 80, life: 0.7 },
          ],
          pulseIds: ["p1"],
        });
      }

      if (meetingIntroTimerRef.current !== null) {
        window.clearTimeout(meetingIntroTimerRef.current);
      }
      setMeetingKind(kind);
      setMeetingReason(reason);
      setMeetingFilter((prev) => (sabotagedRoomId ? "alibi" : prev));
      setQuarantineVerdict(null);
      setMeetingIntroActive(true);
      setMeetingOpen(true);

      meetingIntroTimerRef.current = window.setTimeout(() => {
        setMeetingIntroActive(false);
        meetingIntroTimerRef.current = null;
      }, 1250);
    },
    [sabotagedRoomId, spawnBurstParticles, juice]
  );

  const handleUseButton = useCallback(() => {
    if (hud.nearbyFrozenId && roleMode === "engineer") {
      crewFeedback("taskOpen");
      setActiveMiniGame({
        kind: "rescue",
        roomId: "rescue",
        roomName: hud.zoneName,
        targetMemberId: hud.nearbyFrozenId,
        targetMemberName:
          privacyScope === "interschool-anon"
            ? hud.nearbyFrozenAnon ?? hud.nearbyFrozenName ?? "Друг"
            : hud.nearbyFrozenName ?? "Друг",
      });
      return;
    }

    if (canUseTask && hud.nearbyConsoleRoomId) {
      const room = SHIP_ROOMS.find((r) => r.id === hud.nearbyConsoleRoomId);
      if (!room?.taskConsole) return;
      const isCrisisFix = room.id === sabotagedRoomId;
      crewFeedback("taskOpen");
      setActiveMiniGame({
        kind: isCrisisFix ? "sabotage-fix" : room.taskConsole.miniGame,
        roomId: room.id,
        roomName: room.name,
      });
      return;
    }
    crewFeedback("denied");
  }, [
    hud.nearbyFrozenId,
    hud.zoneName,
    hud.nearbyFrozenAnon,
    hud.nearbyFrozenName,
    hud.nearbyConsoleRoomId,
    roleMode,
    privacyScope,
    canUseTask,
    sabotagedRoomId,
  ]);

  const handleSaboteurFreeze = useCallback(() => {
    if (!hud.nearbySaboteurTargetId || freezeCooldown > 0) {
      crewFeedback("denied");
      return;
    }
    crewFeedback("freeze");
    rewardCoins(20);
    setFreezeCooldown(12);
    const targetId = hud.nearbySaboteurTargetId;
    worldCrewRef.current = worldCrewRef.current.map((m) => {
      if (m.id !== targetId) return m;
      spawnBurstParticles(m.x, m.y, "#9ED8FF", 16);
      juice({
        shake: 4,
        flash: ["#9ED8FF", 0.3],
        rings: [
          { x: m.x, y: m.y, color: "#9ED8FF", maxR: 70 },
          { x: m.x, y: m.y, color: "#FFFFFF", maxR: 40, life: 0.45 },
        ],
        pulseIds: [m.id, "p1"],
        text: { x: m.x, y: m.y - 34, text: "ЗАМОРОЖЕНО", color: "#9ED8FF" },
      });
      popupsRef.current.push({
        x: m.x,
        y: m.y - 8,
        text: "+20",
        color: "#F6A5C0",
        life: 1.2,
        maxLife: 1.2,
      });
      window.setTimeout(() => playCrewSfx("coin"), 260);
      return { ...m, isFrozen: true, bubbleIcon: "❄️" };
    });
    setRosterSnapshot([...worldCrewRef.current]);
    setActionBanner(
      `Ти заморозив(-ла) ${
        hud.nearbySaboteurTargetName ?? "гравця"
      }. Тікай тунелем або в люк (+20 монет).`
    );
  }, [
    hud.nearbySaboteurTargetId,
    hud.nearbySaboteurTargetName,
    freezeCooldown,
    rewardCoins,
    spawnBurstParticles,
    juice,
  ]);

  const handleSaboteurCrisis = useCallback(() => {
    if (sabotageCooldown > 0) {
      crewFeedback("denied");
      return;
    }
    setSabotageCooldown(18);
    const p1 = worldCrewRef.current[0];
    const currentRoom = getRoomAt(p1.x, p1.y);
    const targetId =
      currentRoom && currentRoom.id !== "sec-hub"
        ? currentRoom.id
        : "sec-crypto";
    triggerSabotageInRoom(targetId, "p3");
  }, [sabotageCooldown, triggerSabotageInRoom]);

  const handlePortalHop = useCallback(() => {
    if (roleMode !== "saboteur" || !hud.nearbyPortalId) return;
    const fromPortal = SHIP_PORTALS.find((p) => p.id === hud.nearbyPortalId);
    const toPortal = fromPortal
      ? SHIP_PORTALS.find((p) => p.id === fromPortal.targetPortalId)
      : undefined;
    if (!fromPortal || !toPortal) return;

    crewFeedback("ventIn");
    window.setTimeout(() => playCrewSfx("ventOut"), 230);
    const p1 = worldCrewRef.current[0];
    spawnBurstParticles(fromPortal.x, fromPortal.y, "#9ED8FF", 14);
    juice({
      shake: 2,
      flash: ["#0F3D66", 0.35],
      rings: [
        { x: fromPortal.x, y: fromPortal.y, color: "#6FE3FF", maxR: 60, life: 0.6 },
        { x: toPortal.x, y: toPortal.y, color: "#6FE3FF", maxR: 70, life: 0.8 },
      ],
      pulseIds: ["p1"],
    });
    portalPulseRef.current[fromPortal.id] = 1;
    portalPulseRef.current[toPortal.id] = 1;

    p1.x = toPortal.x;
    p1.y = toPortal.y;
    p1.path = [];
    p1.walking = false;
    cameraCenterRef.current = { x: toPortal.x, y: toPortal.y };
    petPosRef.current = {
      x: toPortal.x - 16,
      y: toPortal.y + 4,
      facing: p1.facing,
    };
    tapBeaconRef.current = null;
    spawnBurstParticles(toPortal.x, toPortal.y, "#9ED8FF", 16);
    setActionBanner(`Проплив трубою → «${toPortal.roomName}»`);
  }, [roleMode, hud.nearbyPortalId, spawnBurstParticles, juice]);

  // Pre-bake Static High-DPI Ship Canvas once on mount
  useEffect(() => {
    staticMapRef.current = createStaticShipTextureCanvas();
  }, []);

  // Latest state mirror ref so the 60fps requestAnimationFrame loop NEVER needs to restart
  const frameConfigRef = useRef({
    lobbySize,
    roleMode,
    privacyScope,
    playerCrewColor,
    petPrimaryHex: activeSkin.primaryHex,
    petGillHex: activeSkin.gillHex,
    cameraMode,
    assignedTaskIds,
    completedTaskIds,
    sabotagedRoomId,
    nextObjective,
    paused:
      meetingOpen ||
      activeMiniGame !== null ||
      showRoleSplash ||
      miniMapOpen ||
      isMatchOver,
  });

  useEffect(() => {
    frameConfigRef.current = {
      lobbySize,
      roleMode,
      privacyScope,
      playerCrewColor,
      petPrimaryHex: activeSkin.primaryHex,
      petGillHex: activeSkin.gillHex,
      cameraMode,
      assignedTaskIds,
      completedTaskIds,
      sabotagedRoomId,
      nextObjective,
      paused:
        meetingOpen ||
        activeMiniGame !== null ||
        showRoleSplash ||
        miniMapOpen ||
        isMatchOver,
    };
  }, [
    lobbySize,
    roleMode,
    privacyScope,
    playerCrewColor,
    activeSkin.primaryHex,
    activeSkin.gillHex,
    cameraMode,
    assignedTaskIds,
    completedTaskIds,
    sabotagedRoomId,
    nextObjective,
    meetingOpen,
    activeMiniGame,
    showRoleSplash,
    miniMapOpen,
    isMatchOver,
  ]);

  // Keep Canvas Backing Resolution matched with Display Size & devicePixelRatio
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const updateSize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [isTheaterMode]);

  // Desktop Keyboard Controls (WASD / Arrows + Action Hotkeys)
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const k = e.key.toLowerCase();

      if (
        [
          "w",
          "a",
          "s",
          "d",
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
        ].includes(k)
      ) {
        if (k.startsWith("arrow")) e.preventDefault();
        keysRef.current.add(k);
        worldCrewRef.current[0].path = [];
        tapBeaconRef.current = null;
        return;
      }

      if (showRoleSplash || meetingOpen || activeMiniGame || isMatchOver) {
        return;
      }

      if (k === "e" || k === " ") {
        e.preventDefault();
        if (roleMode === "engineer") {
          handleUseButton();
        } else {
          handleSaboteurFreeze();
        }
      } else if (k === "v" && roleMode === "saboteur") {
        handlePortalHop();
      } else if (k === "c" || k === "tab") {
        e.preventDefault();
        playCrewSfx("cameraSwap");
        setCameraMode((c) => (c === "follow" ? "overview" : "follow"));
      } else if (k === "m") {
        playCrewSfx("mapOpen");
        setMiniMapOpen((o) => !o);
      } else if (k === "r") {
        if (hud.nearbyFrozenId || sabotagedRoomId) {
          handleOpenMeeting(
            hud.nearbyFrozenName
              ? `${hud.nearbyFrozenName} замерз(-ла) — скануємо, хто був поруч`
              : "Знайдено баг у кімнаті",
            "report"
          );
        } else if (hud.isNearHubTable) {
          handleOpenMeeting("Скликано Раду біля сонар-столу", "meeting");
        } else {
          crewFeedback("denied");
        }
      }
    };

    const onUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [
    showRoleSplash,
    meetingOpen,
    activeMiniGame,
    isMatchOver,
    roleMode,
    hud.nearbyFrozenId,
    hud.nearbyFrozenName,
    hud.isNearHubTable,
    sabotagedRoomId,
    handleUseButton,
    handleSaboteurFreeze,
    handlePortalHop,
    handleOpenMeeting,
  ]);

  // Main 60-120fps Canvas2D Physics & Render Loop (ZERO per-frame React state!)
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let sparkAccum = 0;

    const PLAYER_SPEED = 156;
    const BOT_SPEED = 88;

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const timeSec = now / 1000;
      const cfg = frameConfigRef.current;
      const list = worldCrewRef.current;
      const p1 = list[0];

      // A. Simulate Physics & Animations when not paused by modal
      if (!cfg.paused && p1) {
        // 1. Move Player ("p1")
        if (!p1.isFrozen && !p1.isExposed) {
          let vx = joystickRef.current.dx;
          let vy = joystickRef.current.dy;

          const keys = keysRef.current;
          if (keys.has("w") || keys.has("arrowup")) vy -= 1;
          if (keys.has("s") || keys.has("arrowdown")) vy += 1;
          if (keys.has("a") || keys.has("arrowleft")) vx -= 1;
          if (keys.has("d") || keys.has("arrowright")) vx += 1;

          const prevStep = Math.floor(p1.walkPhase / Math.PI);
          const mag = Math.hypot(vx, vy);

          if (mag > 0.05) {
            const nx = vx / Math.max(1, mag);
            const ny = vy / Math.max(1, mag);
            const stepX = nx * PLAYER_SPEED * dt;
            const stepY = ny * PLAYER_SPEED * dt;

            if (isWalkable(p1.x + stepX, p1.y)) p1.x += stepX;
            if (isWalkable(p1.x, p1.y + stepY)) p1.y += stepY;
            p1.walking = true;
            p1.walkPhase += dt * 16;
            if (Math.abs(stepX) > 0.15) {
              p1.facing = stepX < 0 ? "left" : "right";
            }
          } else if (p1.path.length > 0) {
            const target = p1.path[0];
            const dx = target.x - p1.x;
            const dy = target.y - p1.y;
            const dist = Math.hypot(dx, dy);

            if (dist < 6) {
              p1.path.shift();
              if (p1.path.length === 0) {
                tapBeaconRef.current = null;
              }
            } else {
              const stepX = (dx / dist) * PLAYER_SPEED * dt;
              const stepY = (dy / dist) * PLAYER_SPEED * dt;
              if (isWalkable(p1.x + stepX, p1.y)) p1.x += stepX;
              if (isWalkable(p1.x, p1.y + stepY)) p1.y += stepY;
              p1.walking = true;
              p1.walkPhase += dt * 16;
              if (Math.abs(stepX) > 0.15) {
                p1.facing = stepX < 0 ? "left" : "right";
              }
            }
          } else {
            p1.walking = false;
          }

          // Footstep dust puff each half-cycle of stride
          const nextStep = Math.floor(p1.walkPhase / Math.PI);
          if (p1.walking && nextStep !== prevStep) {
            playCrewSfx("step", { gain: 0.9 });
            particlesRef.current.push({
              x: p1.x + (p1.facing === "right" ? -6 : 6),
              y: p1.y + 8,
              vx: (Math.random() - 0.5) * 6,
              vy: -18 - Math.random() * 10,
              radius: 1.8,
              color: "rgba(158, 216, 255, 0.7)",
              life: 0.6,
              maxLife: 0.6,
            });
          }
        }

        // 2. Smooth Mini-Axolotl Pet trailing spring behind Player
        const targetPetX = p1.x + (p1.facing === "right" ? -23 : 23);
        const targetPetY = p1.y + 3;
        const petLerp = 1 - Math.exp(-6.5 * dt);
        petPosRef.current.x += (targetPetX - petPosRef.current.x) * petLerp;
        petPosRef.current.y += (targetPetY - petPosRef.current.y) * petLerp;
        if (Math.abs(p1.x - petPosRef.current.x) > 4) {
          petPosRef.current.facing = p1.x >= petPosRef.current.x ? "right" : "left";
        }

        // 3. Patrol AI Classmates (p2..p18) + occasional footstep dust
        for (let i = 1; i < cfg.lobbySize && i < list.length; i++) {
          const bot = list[i];
          if (bot.isFrozen || bot.isExposed) {
            bot.walking = false;
            continue;
          }
          if (bot.waitTimer > 0) {
            bot.waitTimer -= dt;
            bot.walking = false;
            continue;
          }
          if (bot.path.length === 0) {
            const randRoom =
              SHIP_ROOMS[Math.floor(Math.random() * SHIP_ROOMS.length)];
            // Prefer walking right up near the console half the time so bots visibly "work"
            const goToConsole = randRoom.taskConsole && Math.random() < 0.55;
            const tx = goToConsole
              ? randRoom.taskConsole!.x + (Math.random() - 0.5) * 24
              : randRoom.rect.x + 36 + Math.random() * (randRoom.rect.w - 72);
            const ty = goToConsole
              ? randRoom.taskConsole!.y + 24
              : randRoom.rect.y + 36 + Math.random() * (randRoom.rect.h - 72);
            bot.path = findCorridorPath(
              bot.x,
              bot.y,
              isWalkable(tx, ty) ? tx : randRoom.rect.x + randRoom.rect.w / 2,
              isWalkable(tx, ty) ? ty : randRoom.rect.y + randRoom.rect.h / 2
            );
            bot.bubbleIcon = null;
          }

          if (bot.path.length > 0) {
            const target = bot.path[0];
            const dx = target.x - bot.x;
            const dy = target.y - bot.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 6) {
              bot.path.shift();
              if (bot.path.length === 0) {
                bot.waitTimer = 1.6 + Math.random() * 2.8;
                bot.walking = false;
                if (Math.random() < 0.65) {
                  bot.bubbleIcon = bot.isSaboteur && Math.random() < 0.35
                    ? "👀"
                    : WORK_BUBBLE_ICONS[i % WORK_BUBBLE_ICONS.length];
                }
              }
            } else {
              const sx = (dx / dist) * BOT_SPEED * dt;
              const sy = (dy / dist) * BOT_SPEED * dt;
              if (isWalkable(bot.x + sx, bot.y)) bot.x += sx;
              if (isWalkable(bot.x, bot.y + sy)) bot.y += sy;
              bot.walking = true;
              const botPrevStep = Math.floor(bot.walkPhase / Math.PI);
              bot.walkPhase += dt * 11.5;
              // Classmates' footsteps: audible only when close (spatial pan)
              if (Math.floor(bot.walkPhase / Math.PI) !== botPrevStep) {
                const bd = Math.hypot(bot.x - p1.x, bot.y - p1.y);
                if (bd < 170) {
                  playCrewSfx("stepBot", {
                    gain: (1 - bd / 170) * 0.8,
                    pan: (bot.x - p1.x) / 170,
                  });
                }
              }
              if (Math.abs(sx) > 0.12) {
                bot.facing = sx < 0 ? "left" : "right";
              }
            }
          }
        }

        // 4. Sabotage Console Sparkles + Particles/Popups lifetime update
        if (cfg.sabotagedRoomId) {
          sparkAccum += dt;
          if (sparkAccum >= 0.16) {
            sparkAccum = 0;
            const sabRoom = SHIP_ROOMS.find((r) => r.id === cfg.sabotagedRoomId);
            if (sabRoom?.taskConsole) {
              particlesRef.current.push({
                x: sabRoom.taskConsole.x + (Math.random() - 0.5) * 24,
                y: sabRoom.taskConsole.y - 4,
                vx: (Math.random() - 0.5) * 65,
                vy: -25 - Math.random() * 45,
                radius: 2 + Math.random() * 1.6,
                color: Math.random() < 0.5 ? "#E0457B" : "#FFD36B",
                life: 0.45,
                maxLife: 0.45,
              });
            }
          }
        }

        // 5. Compute discrete proximity HUD and ONLY call setHud when changed!
        let nearConsoleId: string | null = null;
        for (const room of SHIP_ROOMS) {
          if (!room.taskConsole) continue;
          if (
            Math.hypot(p1.x - room.taskConsole.x, p1.y - room.taskConsole.y) <= 68
          ) {
            nearConsoleId = room.id;
            break;
          }
        }

        let nearFrozen: SimCrewMember | null = null;
        let nearTarget: SimCrewMember | null = null;
        for (let i = 1; i < cfg.lobbySize && i < list.length; i++) {
          const m = list[i];
          if (m.isExposed) continue;
          const d = Math.hypot(p1.x - m.x, p1.y - m.y);
          if (d <= 74) {
            if (m.isFrozen && !nearFrozen) nearFrozen = m;
            if (cfg.roleMode === "saboteur" && !m.isFrozen && !m.isSaboteur && !nearTarget) {
              nearTarget = m;
            }
          }
        }

        let nearPortal: string | null = null;
        if (cfg.roleMode === "saboteur") {
          for (const portal of SHIP_PORTALS) {
            if (Math.hypot(p1.x - portal.x, p1.y - portal.y) <= 56) {
              nearPortal = portal.id;
              break;
            }
          }
        }

        const nearHub =
          Math.hypot(p1.x - HUB_TABLE.x, p1.y - HUB_TABLE.y) <= 78;
        const zone = getZoneLabelAt(p1.x, p1.y);

        setHud((prev) => {
          const nFId = nearFrozen?.id ?? null;
          const nTId = nearTarget?.id ?? null;
          if (
            prev.zoneName === zone &&
            prev.nearbyConsoleRoomId === nearConsoleId &&
            prev.nearbyFrozenId === nFId &&
            prev.nearbySaboteurTargetId === nTId &&
            prev.nearbyPortalId === nearPortal &&
            prev.isNearHubTable === nearHub
          ) {
            return prev;
          }
          return {
            zoneName: zone,
            nearbyConsoleRoomId: nearConsoleId,
            nearbyFrozenId: nFId,
            nearbyFrozenName: nearFrozen?.name ?? null,
            nearbyFrozenAnon: nearFrozen?.anonHandle ?? null,
            nearbySaboteurTargetId: nTId,
            nearbySaboteurTargetName: nearTarget?.name ?? null,
            nearbyPortalId: nearPortal,
            isNearHubTable: nearHub,
          };
        });
      }

      // B. Always step particles, popups & camera glide cleanly
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        if (pt.life <= 0) particlesRef.current.splice(i, 1);
      }

      for (let i = popupsRef.current.length - 1; i >= 0; i--) {
        popupsRef.current[i].life -= dt;
        if (popupsRef.current[i].life <= 0) popupsRef.current.splice(i, 1);
      }

      // Decay screen juice
      const fxs = fxRef.current;
      fxs.shake *= Math.exp(-dt * 9);
      if (fxs.shake < 0.15) fxs.shake = 0;
      fxs.flashAlpha = Math.max(0, fxs.flashAlpha - dt * 1.8);
      for (let i = fxs.rings.length - 1; i >= 0; i--) {
        fxs.rings[i].life -= dt;
        if (fxs.rings[i].life <= 0) fxs.rings.splice(i, 1);
      }
      for (const id of Object.keys(fxs.hitPulse)) {
        fxs.hitPulse[id] -= dt * 1.7;
        if (fxs.hitPulse[id] <= 0) delete fxs.hitPulse[id];
      }
      fxs.alarm = cfg.sabotagedRoomId !== null;

      for (const pid of Object.keys(portalPulseRef.current)) {
        portalPulseRef.current[pid] = Math.max(0, portalPulseRef.current[pid] - dt * 2.5);
      }

      if (p1) {
        const camLerp = 1 - Math.exp(-10 * dt);
        cameraCenterRef.current.x +=
          (p1.x - cameraCenterRef.current.x) * camLerp;
        cameraCenterRef.current.y +=
          (p1.y - cameraCenterRef.current.y) * camLerp;
      }

      // C. Draw Full 60-120fps Canvas Frame
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const cssW = canvas.clientWidth;
        const cssH = canvas.clientHeight;
        if (ctx && cssW > 0 && cssH > 0) {
          const dpr = canvas.width / cssW;
          const view = computeCameraViewRect(
            cssW,
            cssH,
            cfg.cameraMode,
            cameraCenterRef.current
          );
          viewRectRef.current = view;

          let arrowAngle: number | null = null;
          if (p1 && cfg.nextObjective) {
            const dx = cfg.nextObjective.x - p1.x;
            const dy = cfg.nextObjective.y - p1.y;
            if (Math.hypot(dx, dy) >= 65) {
              arrowAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
            }
          }

          renderShipFrame(
            ctx,
            cssW,
            cssH,
            dpr,
            view,
            {
              crew: list,
              lobbySize: cfg.lobbySize,
              roleMode: cfg.roleMode,
              privacyScope: cfg.privacyScope,
              playerCrewColor: cfg.playerCrewColor,
              petPrimaryHex: cfg.petPrimaryHex,
              petGillHex: cfg.petGillHex,
              petPos: petPosRef.current,
              cameraMode: cfg.cameraMode,
              cameraCenter: cameraCenterRef.current,
              assignedTaskIds: cfg.assignedTaskIds,
              completedTaskIds: cfg.completedTaskIds,
              sabotagedRoomId: cfg.sabotagedRoomId,
              nearbyConsoleRoomId: hud.nearbyConsoleRoomId,
              nearbyPortalId: hud.nearbyPortalId,
              isNearHubTable: hud.isNearHubTable,
              tapTargetBeacon: tapBeaconRef.current,
              nextObjective: cfg.nextObjective,
              objectiveArrowAngle: arrowAngle,
              particles: particlesRef.current,
              popups: popupsRef.current,
              portalPulseTimers: portalPulseRef.current,
              timeSec,
              fx: fxRef.current,
            },
            staticMapRef.current
          );
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [
    hud.nearbyConsoleRoomId,
    hud.nearbyPortalId,
    hud.isNearHubTable,
  ]);

  // Organic AI Sabotage event every ~15s in Engineer Mode if none active
  useEffect(() => {
    if (
      roleMode !== "engineer" ||
      sabotagedRoomId !== null ||
      meetingOpen ||
      showRoleSplash ||
      isMatchOver
    ) {
      return;
    }
    const timer = setTimeout(() => {
      const roomId =
        ALL_TASK_ROOM_IDS[Math.floor(Math.random() * ALL_TASK_ROOM_IDS.length)];
      triggerSabotageInRoom(roomId);
    }, 15000);
    return () => clearTimeout(timer);
  }, [
    roleMode,
    sabotagedRoomId,
    meetingOpen,
    showRoleSplash,
    isMatchOver,
    triggerSabotageInRoom,
  ]);

  // 1-second timers (Crisis countdown + Saboteur ability cooldowns)
  useEffect(() => {
    if (meetingOpen || showRoleSplash || isMatchOver) return;
    const t = setInterval(() => {
      if (sabotagedRoomId && crisisTimer > 0) {
        setCrisisTimer((c) => Math.max(0, c - 1));
      }
      if (freezeCooldown > 0) {
        setFreezeCooldown((c) => Math.max(0, c - 1));
      }
      if (sabotageCooldown > 0) {
        setSabotageCooldown((c) => Math.max(0, c - 1));
      }
    }, 1000);
    return () => clearInterval(t);
  }, [
    sabotagedRoomId,
    crisisTimer,
    freezeCooldown,
    sabotageCooldown,
    meetingOpen,
    showRoleSplash,
    isMatchOver,
  ]);

  /* ---------------------------------------------------------
     Reinforcement layer: sound, haptics & screen juice that
     react to discrete game-state changes
  --------------------------------------------------------- */

  // Looping sabotage siren
  useEffect(() => {
    if (sabotagedRoomId && !isMatchOver) {
      startSiren();
    } else {
      stopSiren();
    }
  }, [sabotagedRoomId, isMatchOver]);

  // Countdown urgency: faster siren + ticking in the last 10 seconds
  useEffect(() => {
    fxRef.current.alarmUrgent = sabotagedRoomId !== null && crisisTimer <= 10;
    if (!sabotagedRoomId || isMatchOver) return;
    setSirenUrgency(crisisTimer);
    if (crisisTimer > 0 && crisisTimer <= 10 && !meetingOpen) {
      crewFeedback("alarmTick", { gain: 1 - crisisTimer / 12 });
      if (crisisTimer <= 5) fxRef.current.shake = Math.max(fxRef.current.shake, 1.5);
    }
  }, [crisisTimer, sabotagedRoomId, isMatchOver, meetingOpen]);

  // Duck loops while a modal sits on top of the station
  useEffect(() => {
    setLoopDuck(meetingOpen || activeMiniGame !== null || miniMapOpen);
  }, [meetingOpen, activeMiniGame, miniMapOpen]);

  // Victory / defeat stingers
  const matchOverPlayedRef = useRef(false);
  useEffect(() => {
    if (!isMatchOver) {
      matchOverPlayedRef.current = false;
      return;
    }
    if (matchOverPlayedRef.current) return;
    matchOverPlayedRef.current = true;
    stopSiren();
    crewFeedback(isVictory ? "victory" : "defeat");
    const me = worldCrewRef.current[0];
    juice({
      shake: isVictory ? 3 : 7,
      flash: [isVictory ? "#FFD36B" : "#E0457B", 0.45],
      rings: me
        ? [
            { x: me.x, y: me.y, color: isVictory ? "#FFD36B" : "#E0457B", maxR: 160, life: 1.2 },
            { x: me.x, y: me.y, color: isVictory ? "#2FA37A" : "#2A1B2E", maxR: 110, life: 1 },
          ]
        : [],
      pulseIds: ["p1"],
    });
    if (isVictory && me) {
      spawnBurstParticles(me.x, me.y - 10, "#FFD36B", 26);
      spawnBurstParticles(me.x, me.y - 10, "#F6A5C0", 18);
    }
  }, [isMatchOver, isVictory, juice, spawnBurstParticles]);

  // Saboteur ability ready again
  const prevCooldownsRef = useRef({ freeze: 0, sabotage: 0 });
  useEffect(() => {
    const prev = prevCooldownsRef.current;
    if (roleMode === "saboteur") {
      if (prev.freeze > 0 && freezeCooldown === 0) crewFeedback("cooldownReady");
      else if (prev.sabotage > 0 && sabotageCooldown === 0) crewFeedback("cooldownReady");
    }
    prevCooldownsRef.current = { freeze: freezeCooldown, sabotage: sabotageCooldown };
  }, [freezeCooldown, sabotageCooldown, roleMode]);

  // Proximity blips (terminal / frozen friend / hatch / target / Council table)
  // and an airlock hiss whenever the player swims into a new room.
  const prevHudRef = useRef({
    zone: hud.zoneName,
    canUse: false,
    frozen: null as string | null,
    target: null as string | null,
    portal: null as string | null,
    hub: hud.isNearHubTable,
  });
  useEffect(() => {
    const prev = prevHudRef.current;
    const blocked = showRoleSplash || meetingOpen || activeMiniGame !== null || isMatchOver;
    const me = worldCrewRef.current[0];
    if (!blocked && me) {
      const gained =
        (canUseTask && !prev.canUse) ||
        (hud.nearbyFrozenId !== null && hud.nearbyFrozenId !== prev.frozen) ||
        (hud.nearbySaboteurTargetId !== null &&
          hud.nearbySaboteurTargetId !== prev.target &&
          freezeCooldown === 0) ||
        (hud.nearbyPortalId !== null && hud.nearbyPortalId !== prev.portal) ||
        (hud.isNearHubTable && !prev.hub);
      if (gained) {
        crewFeedback("proximity");
        juice({ ring: { x: me.x, y: me.y, color: "#FFD36B", maxR: 34, life: 0.45 } });
      }
      if (hud.zoneName !== prev.zone && !hud.zoneName.startsWith("Тунель")) {
        playCrewSfx("roomEnter");
      }
    }
    prevHudRef.current = {
      zone: hud.zoneName,
      canUse: canUseTask,
      frozen: hud.nearbyFrozenId,
      target: hud.nearbySaboteurTargetId,
      portal: hud.nearbyPortalId,
      hub: hud.isNearHubTable,
    };
  }, [
    hud,
    canUseTask,
    freezeCooldown,
    showRoleSplash,
    meetingOpen,
    activeMiniGame,
    isMatchOver,
    juice,
  ]);

  // Kill every loop when leaving the game tab
  useEffect(() => () => stopAllCrewLoops(), []);

  // Click / Tap anywhere on the 2D Canvas floor to walk there
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const worldPt = screenToWorld(
      e.clientX,
      e.clientY,
      rect,
      viewRectRef.current
    );

    let tx = worldPt.x;
    let ty = worldPt.y;

    if (!isWalkable(tx, ty)) {
      const room = getRoomAt(tx, ty);
      if (room) {
        tx = room.rect.x + room.rect.w / 2;
        ty = room.rect.y + room.rect.h / 2;
        if (!isWalkable(tx, ty)) {
          tx = HUB_TABLE.x - 58;
          ty = HUB_TABLE.y;
        }
      } else {
        return;
      }
    }

    const p1 = worldCrewRef.current[0];
    p1.path = findCorridorPath(p1.x, p1.y, tx, ty);
    tapBeaconRef.current = { x: tx, y: ty };
    playCrewSfx("uiTap");
    juice({ ring: { x: tx, y: ty, color: "#F6A5C0", maxR: 22, life: 0.4 } });
  };

  // Walk player automatically to any room selected from the Mini-Map
  const handleWalkToRoom = (roomId: string) => {
    const room = SHIP_ROOMS.find((r) => r.id === roomId);
    if (!room) return;
    const tx = room.taskConsole
      ? room.taskConsole.x
      : room.rect.x + room.rect.w / 2 - 58;
    const ty = room.taskConsole
      ? room.taskConsole.y + 26
      : room.rect.y + room.rect.h / 2;
    const p1 = worldCrewRef.current[0];
    p1.path = findCorridorPath(p1.x, p1.y, tx, ty);
    tapBeaconRef.current = { x: tx, y: ty };
    setMiniMapOpen(false);
    crewFeedback("uiTap");
    juice({ ring: { x: tx, y: ty, color: "#F6A5C0", maxR: 30, life: 0.6 } });
  };

  const handleMiniGameSuccess = () => {
    if (!activeMiniGame) return;
    const bonus = isNoisy ? 30 : 45;
    rewardCoins(bonus);
    crewFeedback(
      activeMiniGame.kind === "rescue"
        ? "unfreeze"
        : activeMiniGame.kind === "sabotage-fix"
        ? "sabotageFixed"
        : "taskDone"
    );
    window.setTimeout(() => playCrewSfx("coin"), 420);
    setVfxTrigger((v) => v + 1);

    const completedRoom = SHIP_ROOMS.find(
      (r) => r.id === activeMiniGame.roomId
    );
    const p1 = worldCrewRef.current[0];
    const burstX = completedRoom?.taskConsole?.x ?? p1.x;
    const burstY = (completedRoom?.taskConsole?.y ?? p1.y) - 10;
    const burstColor =
      activeMiniGame.kind === "sabotage-fix" ? "#F6A5C0" : "#2FA37A";

    spawnBurstParticles(burstX, burstY, burstColor, 18);
    const rescued =
      activeMiniGame.kind === "rescue" && activeMiniGame.targetMemberId
        ? worldCrewRef.current.find((m) => m.id === activeMiniGame.targetMemberId)
        : undefined;
    juice({
      shake: activeMiniGame.kind === "sabotage-fix" ? 4 : 2,
      flash: [
        activeMiniGame.kind === "sabotage-fix" ? "#2FA37A" : burstColor,
        activeMiniGame.kind === "sabotage-fix" ? 0.35 : 0.18,
      ],
      rings: [
        {
          x: rescued?.x ?? burstX,
          y: rescued?.y ?? burstY,
          color: activeMiniGame.kind === "rescue" ? "#F6A5C0" : burstColor,
          maxR: activeMiniGame.kind === "sabotage-fix" ? 130 : 80,
          life: 0.9,
        },
        {
          x: rescued?.x ?? burstX,
          y: rescued?.y ?? burstY,
          color: "#FFD36B",
          maxR: 50,
          life: 0.6,
        },
      ],
      pulseIds: rescued ? [rescued.id, "p1"] : ["p1"],
      text: {
        x: rescued?.x ?? burstX,
        y: (rescued?.y ?? burstY) - 36,
        text:
          activeMiniGame.kind === "rescue"
            ? "ВРЯТОВАНО"
            : activeMiniGame.kind === "sabotage-fix"
            ? "АВАРІЮ ЗУПИНЕНО"
            : "ГОТОВО",
        color: activeMiniGame.kind === "rescue" ? "#F6A5C0" : "#7BE0B0",
      },
    });
    popupsRef.current.push({
      x: burstX,
      y: burstY - 12,
      text: `+${bonus}`,
      color: burstColor,
      life: 1.25,
      maxLife: 1.25,
    });

    if (activeMiniGame.kind === "rescue" && activeMiniGame.targetMemberId) {
      worldCrewRef.current = worldCrewRef.current.map((m) =>
        m.id === activeMiniGame.targetMemberId
          ? { ...m, isFrozen: false, bubbleIcon: "❤️" }
          : m
      );
      setRosterSnapshot([...worldCrewRef.current]);
      setActionBanner(
        `Розморожено ${activeMiniGame.targetMemberName} (+${bonus} монет)`
      );
    } else if (activeMiniGame.kind === "sabotage-fix") {
      setSabotagedRoomId(null);
      setCrisisTimer(0);
      setActionBanner(
        `Аварію у «${activeMiniGame.roomName}» зупинено (+${bonus} монет)`
      );
    } else {
      setCompletedTaskIds((prev) =>
        prev.includes(activeMiniGame.roomId)
          ? prev
          : [...prev, activeMiniGame.roomId]
      );
      setActionBanner(
        `Завдання «${activeMiniGame.roomName}» виконано (+${bonus} монет)`
      );
    }

    setActiveMiniGame(null);
  };

  // Emergency Meeting Suspects
  const suspectsList = useMemo(() => {
    const others = activeCrew.filter((m) => m.id !== "p1");
    if (meetingFilter === "alibi") {
      const alibi = others.filter((m) => m.wasNearSabotage);
      if (alibi.length > 0) return alibi;
    }
    return others;
  }, [activeCrew, meetingFilter]);

  const handleVoteSuspect = (suspect: SimCrewMember) => {
    if (suspect.isExposed) return;
    const label =
      privacyScope === "interschool-anon" ? suspect.anonHandle : suspect.name;

    crewFeedback("voteCast");
    const caught = suspect.isSaboteur && suspect.hasBugInCommit;
    window.setTimeout(
      () => crewFeedback(caught ? "ejectRight" : "ejectWrong"),
      320
    );
    if (caught) {
      window.setTimeout(() => playCrewSfx("coin"), 1100);
    }

    if (caught) {
      const reward = isNoisy ? 40 : 60;
      rewardCoins(reward);
      setActionBanner(
        `Саботажника ${label} відправлено в Карантин (+${reward} монет)`
      );
      setVfxTrigger((v) => v + 1);

      worldCrewRef.current = worldCrewRef.current.map((m) =>
        m.id === suspect.id ? { ...m, isExposed: true } : m
      );
      setRosterSnapshot([...worldCrewRef.current]);
      const nowExposed = worldCrewRef.current
        .slice(0, lobbySize)
        .filter((m) => m.isSaboteur && m.isExposed).length;

      setQuarantineVerdict({
        name: label,
        color: suspect.avatarColor,
        wasSaboteur: true,
        remainingSaboteurs: Math.max(0, saboteursTotal - nowExposed),
        commitLog: suspect.lastCommitLog,
      });
    } else {
      triggerMistake();
      setQuarantineVerdict({
        name: label,
        color: suspect.avatarColor,
        wasSaboteur: false,
        remainingSaboteurs: Math.max(0, saboteursTotal - exposedSaboteursCount),
        commitLog: suspect.lastCommitLog,
      });
    }
  };

  const sabotagedRoom = sabotagedRoomId
    ? SHIP_ROOMS.find((r) => r.id === sabotagedRoomId)
    : undefined;
  const taskProgress =
    assignedTaskIds.length > 0
      ? (completedTaskIds.length / assignedTaskIds.length) * 100
      : 0;

  return (
    <div className="relative space-y-3 sm:space-y-4">
      {/* =========================================================
          HUD BAR — underwater station status
      ========================================================= */}
      <div className="bl-panel space-y-2.5 px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: location & progress */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="bl-title text-lg leading-none sm:text-xl">
              {hud.zoneName}
            </span>
            <span className="bl-tag">
              Завдання {completedTaskIds.length}/{assignedTaskIds.length}
            </span>
            <span className="bl-tag border-bl-wall text-bl-muted">
              Саботажники {exposedSaboteursCount}/{saboteursTotal}
            </span>
            {isNoisy && (
              <span className="bl-tag border-bl-brass text-bl-lamp">
                <Volume2 className="h-3.5 w-3.5" aria-hidden />
                {noiseLevelDb} дБ
              </span>
            )}
          </div>

          {/* Right: controls */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                startNewRound(roleMode === "engineer" ? "saboteur" : "engineer")
              }
              title={`Роль: ${
                roleMode === "engineer" ? "Інженер" : "Саботажник"
              } — натисни, щоб почати новий раунд як ${
                roleMode === "engineer" ? "Саботажник" : "Інженер"
              }`}
              aria-label={`Роль: ${
                roleMode === "engineer" ? "Інженер" : "Саботажник"
              }. Новий раунд як ${
                roleMode === "engineer" ? "Саботажник" : "Інженер"
              }`}
              className={`bl-btn text-xs ${
                roleMode === "engineer" ? "bl-btn-ghost" : "bl-btn-danger"
              }`}
            >
              {roleMode === "engineer" ? (
                <>
                  <Wrench className="h-4 w-4 text-bl-aqua" aria-hidden /> Інженер
                </>
              ) : (
                <>
                  <Bug className="h-4 w-4 text-bl-pink" aria-hidden /> Саботажник
                </>
              )}
              <RotateCcw className="h-3.5 w-3.5 opacity-60" aria-hidden />
            </button>

            <button
              type="button"
              onClick={() =>
                {
                  playCrewSfx("cameraSwap");
                  setCameraMode((c) => (c === "follow" ? "overview" : "follow"));
                }
              }
              className="bl-btn bl-btn-ghost text-xs"
            >
              {cameraMode === "follow" ? (
                <>
                  <Eye className="h-4 w-4 text-bl-muted" aria-hidden />
                  Поруч
                </>
              ) : (
                <>
                  <Compass className="h-4 w-4 text-bl-aqua" aria-hidden />
                  Вся станція
                </>
              )}
            </button>

            {/* Lobby size 15–18 */}
            <div
              role="group"
              aria-label="Кількість учнів в екіпажі"
              className="inline-flex items-center gap-0.5 rounded-[4px] border-2 border-bl-wall bg-bl-ink p-0.5"
            >
              {([15, 16, 17, 18] as LobbyPresetSize[]).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setLobbySize(sz)}
                  aria-pressed={lobbySize === sz}
                  className={`min-h-[40px] min-w-[40px] rounded-[2px] px-1.5 font-pixel text-sm transition-colors ${
                    lobbySize === sz
                      ? "bg-bl-pink text-bl-plum"
                      : "text-bl-muted hover:text-bl-text"
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                const next = !sfxOn;
                setSfxOn(next);
                setSoundEnabled(next);
                if (next) {
                  playSoundEffect("tap");
                  if (!showRoleSplash && !isMatchOver) startAmbience();
                  if (sabotagedRoomId && !isMatchOver) startSiren();
                }
              }}
              aria-label={sfxOn ? "Вимкнути звук гри" : "Увімкнути звук гри"}
              title={sfxOn ? "Звук увімкнено" : "Звук вимкнено"}
              className={`bl-btn min-w-[44px] px-0 ${sfxOn ? "bl-btn-ghost" : "bl-btn-off"}`}
            >
              {sfxOn ? (
                <Volume2 className="h-4 w-4" aria-hidden />
              ) : (
                <VolumeX className="h-4 w-4" aria-hidden />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsTheaterMode((t) => !t)}
              aria-label={isTheaterMode ? "Зменшити вікно гри" : "Розгорнути вікно гри"}
              title={isTheaterMode ? "Зменшити вікно" : "Великий екран"}
              className="bl-btn bl-btn-ghost hidden min-w-[44px] px-0 sm:inline-flex"
            >
              {isTheaterMode ? (
                <Minimize2 className="h-4 w-4" aria-hidden />
              ) : (
                <Maximize2 className="h-4 w-4" aria-hidden />
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowDesktopJoystick((v) => !v)}
              aria-label="Увімкнути або сховати екранний джойстик"
              aria-pressed={showDesktopJoystick}
              title="Екранний джойстик на ПК"
              className={`bl-btn hidden min-w-[44px] px-0 lg:inline-flex ${
                showDesktopJoystick ? "bl-btn-primary" : "bl-btn-ghost"
              }`}
            >
              <Gamepad2 className="h-4 w-4" aria-hidden />
            </button>

            <button
              type="button"
              onClick={() => setShowGuide((g) => !g)}
              aria-label="Як грати"
              aria-pressed={showGuide}
              className={`bl-btn min-w-[44px] px-0 ${
                showGuide ? "bl-btn-primary" : "bl-btn-ghost"
              }`}
            >
              <HelpCircle className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        {/* Pixel task progress bar */}
        <div
          className="bl-bar relative"
          role="progressbar"
          aria-label="Виконані завдання"
          aria-valuemin={0}
          aria-valuemax={assignedTaskIds.length}
          aria-valuenow={completedTaskIds.length}
        >
          <motion.div
            className="bl-bar-fill"
            animate={{ width: `${taskProgress}%` }}
            transition={{ duration: 0.3, ease: "linear" }}
          />
          {completedTaskIds.length > 0 && (
            <motion.div
              key={`bar-flash-${completedTaskIds.length}`}
              aria-hidden
              initial={{ opacity: 0.95 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="pointer-events-none absolute inset-0 bg-bl-lamp"
            />
          )}
        </div>

        {sabotagedRoomId && (
          <div
            className={`flex flex-wrap items-center justify-between gap-2 rounded-[4px] border-2 border-bl-rose px-3 py-2 text-sm text-bl-blush ${
              crisisTimer <= 10 ? "bl-alarm-strip-urgent" : "bl-alarm-strip"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Siren
                className={`h-4 w-4 shrink-0 text-bl-pink ${crisisTimer <= 10 ? "bl-wobble" : ""}`}
                aria-hidden
              />
              Аварія у «{sabotagedRoom?.name}» ·{" "}
              <motion.span
                key={crisisTimer}
                initial={{ scale: crisisTimer <= 10 ? 1.6 : 1.2 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={`inline-block font-pixel text-base ${crisisTimer <= 10 ? "text-bl-lamp" : ""}`}
              >
                {crisisTimer}с
              </motion.span>
            </span>
            <button
              type="button"
              onClick={() => handleWalkToRoom(sabotagedRoomId)}
              className="bl-btn bl-btn-primary text-xs"
            >
              Пливти туди
              <Navigation2 className="h-3.5 w-3.5 rotate-90" aria-hidden />
            </button>
          </div>
        )}

        {/* Quick 3-rule guide */}
        {showGuide && (
          <div className="bl-inset grid grid-cols-1 gap-3 p-3 text-sm text-bl-muted sm:grid-cols-3">
            <div>
              <strong className="font-pixel font-medium text-bl-pink">1. Рух</strong>
              <p className="mt-0.5">WASD, стрілки або клік по підлозі; на телефоні — джойстик.</p>
            </div>
            <div>
              <strong className="font-pixel font-medium text-bl-pink">2. Завдання</strong>
              <p className="mt-0.5">Підійди до термінала [!] і тисни «Виконати» або E / Пробіл.</p>
            </div>
            <div>
              <strong className="font-pixel font-medium text-bl-pink">3. Рада</strong>
              <p className="mt-0.5">Під час аварії скликай Раду в Куполі. Саботажник пірнає в люки [V].</p>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================
          GAME VIEWPORT (Canvas2D pixel station)
      ========================================================= */}
      <div
        className={`relative w-full select-none overflow-hidden rounded-[6px] border-2 bg-bl-deep shadow-[0_4px_0_0_#0A0C12] transition-colors duration-300 ${
          isTheaterMode
            ? "h-[78dvh] min-h-[540px]"
            : "h-[460px] sm:h-[520px] lg:h-[560px]"
        } ${sabotagedRoomId ? "border-bl-rose" : "border-bl-wall"}`}
      >
        <AnswerVfxOverlay trigger={vfxTrigger} bannerText={actionBanner} />
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          aria-label="Ігрова карта підводної станції Bitlynn"
          className="block h-full w-full cursor-crosshair touch-none"
        />

        {/* TOP-LEFT: current objective */}
        <div className="pointer-events-none absolute left-3 top-3 z-20 flex flex-col gap-1.5">
          {nextObjective && (
            <div className="flex items-center gap-2 rounded-[4px] border-2 border-bl-wall bg-bl-ink/90 px-2.5 py-1.5 text-xs text-bl-text">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 border-2 border-bl-deep"
                style={{ backgroundColor: nextObjective.color }}
              />
              <span className="text-bl-muted">Мета:</span>
              <strong className="font-pixel font-medium text-bl-text">
                {nextObjective.label}
              </strong>
            </div>
          )}
        </div>

        {/* TOP-RIGHT: station map */}
        <button
          type="button"
          onClick={() => {
            triggerTapFeedback("tap");
            playCrewSfx("mapOpen");
            setMiniMapOpen(true);
          }}
          className="bl-btn bl-btn-ghost absolute right-3 top-3 z-20 bg-bl-ink/90 text-xs"
        >
          <MapIcon className="h-4 w-4 text-bl-pink" aria-hidden />
          Карта
        </button>

        {/* BOTTOM-LEFT: joystick + key hints */}
        <div
          className={`absolute bottom-3 left-3 z-20 flex-col items-center gap-1 ${
            showDesktopJoystick ? "flex" : "flex lg:hidden"
          }`}
        >
          <VirtualJoystick
            size={96}
            onMove={(vec) => {
              joystickRef.current = vec;
              if (vec.dx !== 0 || vec.dy !== 0) {
                worldCrewRef.current[0].path = [];
                tapBeaconRef.current = null;
              }
            }}
          />
        </div>

        {!showDesktopJoystick && (
          <div className="pointer-events-none absolute bottom-3 left-3 z-20 hidden items-center gap-2 rounded-[4px] border-2 border-bl-wall bg-bl-ink/90 px-2.5 py-1.5 font-pixel text-xs text-bl-muted lg:flex">
            <span>
              <Kbd>WASD</Kbd> рух
            </span>
            <span>
              <Kbd>E</Kbd> дія
            </span>
            {roleMode === "saboteur" && (
              <span>
                <Kbd>V</Kbd> люк
              </span>
            )}
            <span>
              <Kbd>C</Kbd> камера
            </span>
            <span>
              <Kbd>M</Kbd> карта
            </span>
          </div>
        )}

        {/* BOTTOM-RIGHT: action cluster (stays ≤205px on phones so it never hits the joystick) */}
        <div className="absolute bottom-3 right-3 z-20 flex max-w-[205px] flex-col items-end gap-1.5 sm:max-w-none sm:gap-2">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              disabled={!hud.nearbyFrozenId && !sabotagedRoomId}
              onClick={() =>
                handleOpenMeeting(
                  hud.nearbyFrozenName
                    ? `${hud.nearbyFrozenName} замерз(-ла) — скануємо, хто був поруч`
                    : "Знайдено баг у кімнаті",
                  "report"
                )
              }
              className={`bl-btn min-h-[46px] min-w-[60px] flex-col gap-0.5 px-1.5 text-[11px] sm:min-w-[74px] ${
                hud.nearbyFrozenId || sabotagedRoomId
                  ? "bl-btn-warn flex"
                  : "bl-btn-off hidden sm:flex"
              }`}
            >
              <Radar className="h-4 w-4" aria-hidden />
              Скан
            </button>

            <button
              type="button"
              disabled={!hud.isNearHubTable}
              onClick={() =>
                handleOpenMeeting("Скликано Раду біля сонар-столу", "meeting")
              }
              className={`bl-btn min-h-[46px] min-w-[60px] flex-col gap-0.5 px-1.5 text-[11px] sm:min-w-[74px] ${
                hud.isNearHubTable ? "bl-btn-sea flex" : "bl-btn-off hidden sm:flex"
              }`}
            >
              <Vote className="h-4 w-4" aria-hidden />
              Рада
            </button>
          </div>

          {roleMode === "engineer" ? (
            <button
              type="button"
              disabled={!canUseTask && !hud.nearbyFrozenId}
              onClick={handleUseButton}
              className={`bl-btn min-h-[52px] min-w-[132px] px-3 text-sm sm:min-w-[160px] ${
                hud.nearbyFrozenId
                  ? "bl-btn-ice bl-ready"
                  : canUseTask
                  ? "bl-btn-primary bl-ready"
                  : "bl-btn-off"
              }`}
            >
              {hud.nearbyFrozenId ? (
                <>
                  <Snowflake className="h-4 w-4" aria-hidden />
                  Розморозити
                </>
              ) : hud.nearbyConsoleRoomId === sabotagedRoomId &&
                sabotagedRoomId !== null ? (
                <>
                  <Siren className="h-4 w-4" aria-hidden />
                  Полагодити
                </>
              ) : (
                <>
                  <Wrench className="h-4 w-4" aria-hidden />
                  Виконати
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                type="button"
                disabled={!hud.nearbyPortalId}
                onClick={handlePortalHop}
                className={`bl-btn min-h-[52px] min-w-[60px] flex-col gap-0.5 px-1.5 text-[11px] sm:min-w-[72px] ${
                  hud.nearbyPortalId ? "bl-btn-sea flex" : "bl-btn-off hidden sm:flex"
                }`}
              >
                <CircleDot className="h-4 w-4" aria-hidden />
                Люк
              </button>

              <button
                type="button"
                disabled={sabotageCooldown > 0}
                onClick={handleSaboteurCrisis}
                className={`bl-btn flex min-h-[52px] min-w-[60px] flex-col gap-0.5 px-1.5 text-[11px] sm:min-w-[74px] ${
                  sabotageCooldown === 0 ? "bl-btn-danger bl-ready" : "bl-btn-off"
                }`}
              >
                <Siren className="h-4 w-4" aria-hidden />
                {sabotageCooldown > 0 ? `${sabotageCooldown}с` : "Аварія"}
              </button>

              <button
                type="button"
                disabled={!hud.nearbySaboteurTargetId || freezeCooldown > 0}
                onClick={handleSaboteurFreeze}
                className={`bl-btn flex min-h-[52px] min-w-[64px] flex-col gap-0.5 px-1.5 text-[11px] sm:min-w-[82px] ${
                  hud.nearbySaboteurTargetId && freezeCooldown === 0
                    ? "bl-btn-ice bl-ready"
                    : "bl-btn-off"
                }`}
              >
                <Snowflake className="h-4 w-4" aria-hidden />
                {freezeCooldown > 0 ? `${freezeCooldown}с` : "Заморозити"}
              </button>
            </div>
          )}
        </div>

        {/* =====================================================
            ROLE REVEAL
        ===================================================== */}
        <AnimatePresence>
          {showRoleSplash && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "linear" }}
              className="absolute inset-0 z-30 flex items-center justify-center bg-bl-deep/85 p-4"
            >
              <div className="bl-panel w-full max-w-sm space-y-4 p-6 text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[4px] border-2 border-bl-line bg-bl-ink">
                  <Crewmate
                    size={64}
                    color={playerCrewColor}
                    showSaboteurMark={roleMode === "saboteur"}
                  />
                </div>
                <div className="space-y-2">
                  <span className="bl-tag">Матч на {lobbySize} учнів</span>
                  <h2
                    className={`bl-title text-3xl ${
                      roleMode === "engineer" ? "text-bl-text" : "text-bl-pink"
                    }`}
                  >
                    {roleMode === "engineer" ? "Ти — Інженер" : "Ти — Саботажник"}
                  </h2>
                  <p className="text-sm leading-relaxed text-bl-muted">
                    {roleMode === "engineer"
                      ? `Серед ${lobbySize} учасників є ${saboteursTotal} Саботажники. Виконуй завдання на терміналах [!] або знайди їх на Раді.`
                      : "Заморожуй гравців поруч, пірнай у люки [V] і влаштовуй аварії в кімнатах."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    crewFeedback(
                      roleMode === "engineer" ? "roleEngineer" : "roleSaboteur"
                    );
                    startAmbience();
                    const me = worldCrewRef.current[0];
                    if (me) {
                      juice({
                        rings: [
                          { x: me.x, y: me.y, color: playerCrewColor, maxR: 90, life: 0.9 },
                          { x: me.x, y: me.y, color: "#FFFFFF", maxR: 50, life: 0.5 },
                        ],
                        pulseIds: ["p1"],
                        flash: [roleMode === "engineer" ? "#6FE3FF" : "#E0457B", 0.2],
                      });
                    }
                    setShowRoleSplash(false);
                  }}
                  className="bl-btn bl-btn-primary min-h-[48px] w-full text-base"
                >
                  <Play className="h-4 w-4 fill-current" aria-hidden />
                  Почати гру
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* =====================================================
            VICTORY / DEFEAT
        ===================================================== */}
        <AnimatePresence>
          {isMatchOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "linear" }}
              className="absolute inset-0 z-30 flex items-center justify-center bg-bl-deep/90 p-4"
            >
              <div className="bl-panel w-full max-w-sm space-y-4 p-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[4px] border-2 border-bl-line bg-bl-ink">
                  <Trophy
                    className={`h-9 w-9 ${isVictory ? "text-bl-lamp" : "text-bl-pink"}`}
                    aria-hidden
                  />
                </div>
                <h2 className="bl-title text-2xl">
                  {roleMode === "saboteur" && isVictory
                    ? "Перемога Саботажників"
                    : isVictory
                    ? "Перемога екіпажу"
                    : "Станцію затопило"}
                </h2>
                <p className="font-pixel text-sm text-bl-muted">
                  Завдань: {completedTaskIds.length}/{assignedTaskIds.length} ·
                  Саботажників: {exposedSaboteursCount}/{saboteursTotal}
                </p>
                <button
                  type="button"
                  onClick={() => startNewRound(roleMode)}
                  className="bl-btn bl-btn-primary min-h-[48px] w-full text-base"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden />
                  Новий матч
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* =========================================================
          STATION MAP (tap a room to swim there)
      ========================================================= */}
      <AnimatePresence>
        {miniMapOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-bl-deep/85 p-3">
            <motion.div
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 8, opacity: 0 }}
              transition={{ duration: 0.15, ease: "linear" }}
              className="bl-panel w-full max-w-lg space-y-3.5 p-4 sm:p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="bl-title text-xl">Карта станції</h3>
                  <p className="text-sm text-bl-muted">
                    Натисни на кімнату — персонаж сам туди допливе.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playCrewSfx("uiClose");
                    setMiniMapOpen(false);
                  }}
                  aria-label="Закрити карту"
                  className="bl-btn bl-btn-ghost min-w-[44px] px-0"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>

              {/* Schematic */}
              <svg
                viewBox="0 0 900 600"
                className="block h-auto w-full rounded-[4px] border-2 border-bl-line bg-[#16233A]"
                shapeRendering="crispEdges"
                aria-hidden="true"
              >
                {SHIP_CORRIDORS.map((c, i) => (
                  <rect key={i} x={c.x} y={c.y} width={c.w} height={c.h} fill="#2B3550" />
                ))}
                {SHIP_ROOMS.map((room) => {
                  const isSab = room.id === sabotagedRoomId;
                  const isDone = completedTaskIds.includes(room.id);
                  const isAssigned = assignedTaskIds.includes(room.id);
                  return (
                    <g key={room.id}>
                      <rect
                        x={room.rect.x - 6}
                        y={room.rect.y - 6}
                        width={room.rect.w + 12}
                        height={room.rect.h + 12}
                        fill={isSab ? "#E0457B" : "#2B3550"}
                      />
                      <rect
                        x={room.rect.x}
                        y={room.rect.y}
                        width={room.rect.w}
                        height={room.rect.h}
                        fill="#262D45"
                      />
                      <rect
                        x={room.rect.x}
                        y={room.rect.y}
                        width={room.rect.w}
                        height="10"
                        fill={room.accent}
                      />
                      {room.taskConsole && (isAssigned || isSab) && (
                        <rect
                          x={room.taskConsole.x - 9}
                          y={room.taskConsole.y - 9}
                          width="18"
                          height="18"
                          fill={isSab ? "#E0457B" : isDone ? "#2FA37A" : "#FFD36B"}
                        />
                      )}
                    </g>
                  );
                })}
                {/* player */}
                <rect
                  x={(rosterSnapshot[0]?.x ?? 0) - 8}
                  y={(rosterSnapshot[0]?.y ?? 0) - 8}
                  width="16"
                  height="16"
                  fill="#F6A5C0"
                  stroke="#0A0C12"
                  strokeWidth="4"
                />
              </svg>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SHIP_ROOMS.map((room) => {
                  const isSab = room.id === sabotagedRoomId;
                  const isAssigned = assignedTaskIds.includes(room.id);
                  const isDone = completedTaskIds.includes(room.id);

                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => handleWalkToRoom(room.id)}
                      className={`bl-btn min-h-[60px] flex-col items-start justify-center gap-1 px-3 text-left ${
                        isSab
                          ? "bl-btn-danger"
                          : isAssigned && !isDone
                          ? "bl-btn-warn"
                          : "bl-btn-ghost"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-sm">
                        <span
                          aria-hidden
                          className="h-2.5 w-2.5 border-2 border-bl-deep"
                          style={{ backgroundColor: room.accent }}
                        />
                        {room.name}
                      </span>
                      <span className="font-sans text-xs opacity-80">
                        {isSab
                          ? "Аварія"
                          : isDone
                          ? "Виконано"
                          : isAssigned
                          ? "Є завдання"
                          : room.shortTag}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================
          TASK / RESCUE MINI-GAME
      ========================================================= */}
      <AnimatePresence>
        {activeMiniGame && (
          <CrewMiniGameModal
            kind={activeMiniGame.kind}
            roomName={activeMiniGame.roomName}
            targetName={activeMiniGame.targetMemberName}
            lessonTerm={miniGameLessonTerm}
            onAskPeers={() => {
              const termTitle =
                miniGameLessonTerm?.word ?? activeMiniGame.roomName;
              const termClue = miniGameLessonTerm?.clue ?? "";
              setActiveMiniGame(null);
              askPeersAboutTask(
                activeTemplate?.title ?? "Кібер-Екіпаж",
                `Не можу розібратися в завданні у кімнаті «${activeMiniGame.roomName}» (${termTitle}): ${termClue}`
              );
              setActiveTab("peer-exchange");
            }}
            onSuccess={handleMiniGameSuccess}
            onClose={() => {
              playCrewSfx("uiClose");
              setActiveMiniGame(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* =========================================================
          COUNCIL & ALIBI VOTING
      ========================================================= */}
      <AnimatePresence>
        {meetingOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-bl-deep/85 p-3">
            {meetingIntroActive ? (
              <MeetingSplashScene
                kind={meetingKind}
                reason={meetingReason}
                primaryHex={playerCrewColor}
                gillHex={activeSkin.gillHex}
                onSkip={skipMeetingIntro}
              />
            ) : (
              <motion.div
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 8, opacity: 0 }}
                transition={{ duration: 0.15, ease: "linear" }}
                className="bl-panel max-h-[90dvh] w-full max-w-3xl space-y-4 overflow-y-auto p-4 sm:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-bl-line pb-3">
                  <div className="space-y-1.5">
                    <span className="bl-tag">{meetingReason}</span>
                    <h2 className="bl-title text-xl sm:text-2xl">
                      Рада: знайди Саботажника за логом
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMeetingOpen(false)}
                    className="bl-btn bl-btn-ghost text-xs"
                  >
                    <X className="h-4 w-4" aria-hidden />
                    Назад на станцію
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Фільтр підозрюваних">
                  <button
                    type="button"
                    onClick={() => setMeetingFilter("alibi")}
                    aria-pressed={meetingFilter === "alibi"}
                    className={`bl-btn text-xs ${
                      meetingFilter === "alibi" ? "bl-btn-warn" : "bl-btn-ghost"
                    }`}
                  >
                    Були біля аварії
                  </button>
                  <button
                    type="button"
                    onClick={() => setMeetingFilter("all")}
                    aria-pressed={meetingFilter === "all"}
                    className={`bl-btn text-xs ${
                      meetingFilter === "all" ? "bl-btn-primary" : "bl-btn-ghost"
                    }`}
                  >
                    Усі гравці ({activeCrew.length - 1})
                  </button>
                </div>

                {/* Quarantine verdict */}
                {quarantineVerdict && (
                  <motion.div
                    initial={{ y: 4, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.15, ease: "linear" }}
                    className={`flex flex-col items-center justify-between gap-3 rounded-[4px] border-2 p-4 sm:flex-row ${
                      quarantineVerdict.wasSaboteur
                        ? "border-bl-kelp bg-[#123A30]"
                        : "border-bl-rose bg-[#3D1422]"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-[4px] border-2 border-dashed border-bl-steel bg-bl-ink">
                        <Crewmate
                          size={40}
                          animate={false}
                          color={quarantineVerdict.color}
                          isExposed={quarantineVerdict.wasSaboteur}
                        />
                        <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-[2px] border-2 border-bl-deep bg-bl-ink">
                          <ShieldAlert
                            className={`h-3.5 w-3.5 ${
                              quarantineVerdict.wasSaboteur ? "text-bl-kelp" : "text-bl-pink"
                            }`}
                            aria-hidden
                          />
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="bl-title text-base sm:text-lg">
                          {quarantineVerdict.wasSaboteur
                            ? `${quarantineVerdict.name} — у Карантин!`
                            : `Помилка: ${quarantineVerdict.name} — чесний Інженер`}
                        </div>
                        <p className="font-mono text-xs text-bl-muted">
                          Лог: «{quarantineVerdict.commitLog}» · Лишилось
                          Саботажників: {quarantineVerdict.remainingSaboteurs}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setQuarantineVerdict(null);
                        setMeetingOpen(false);
                      }}
                      className="bl-btn bl-btn-primary shrink-0 text-xs"
                    >
                      Грати далі
                    </button>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {suspectsList.map((suspect) => {
                    const label =
                      privacyScope === "interschool-anon"
                        ? suspect.anonHandle
                        : suspect.name;
                    return (
                      <div
                        key={suspect.id}
                        className={`flex flex-col justify-between gap-3 rounded-[4px] border-2 p-3.5 ${
                          suspect.isExposed
                            ? "border-bl-kelp bg-[#123A30]/60 opacity-80"
                            : suspect.wasNearSabotage
                            ? "border-bl-brass bg-[#2A2414]"
                            : "border-bl-line bg-bl-ink"
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[4px] border-2 border-bl-line bg-bl-panel">
                              <Crewmate
                                size={32}
                                animate={false}
                                color={suspect.avatarColor}
                                isFrozen={suspect.isFrozen}
                                isExposed={suspect.isExposed}
                              />
                            </div>
                            <div>
                              <div className="font-pixel text-base text-bl-text">
                                {label}
                              </div>
                              {suspect.wasNearSabotage && (
                                <span className="text-xs text-bl-lamp">
                                  Був(-ла) біля місця аварії
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="rounded-[2px] border-2 border-bl-line bg-bl-deep p-2.5 font-mono text-xs text-bl-text">
                            <span className="text-bl-pink">&gt; </span>
                            {suspect.lastCommitLog}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={suspect.isExposed}
                          onClick={() => handleVoteSuspect(suspect)}
                          className={`bl-btn w-full text-xs ${
                            suspect.isExposed ? "bl-btn-ok" : "bl-btn-sea"
                          }`}
                        >
                          {suspect.isExposed ? "Уже в Карантині" : "У Карантин: Саботажник"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

/** Pixel key-cap for desktop hints. */
const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="mr-1 inline-block rounded-[2px] border-2 border-bl-wall bg-bl-panel px-1 font-pixel text-[11px] leading-4 text-bl-text">
    {children}
  </kbd>
);
