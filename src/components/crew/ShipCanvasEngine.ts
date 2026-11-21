import {
  HUB_TABLE,
  SHIP_CORRIDORS,
  SHIP_ROOMS,
  SHIP_PORTALS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  Rect,
} from "@/data/crewShipData";
import {
  AXO_H,
  AXO_W,
  AxoEyes,
  AxoFrame,
  buildAxoPalette,
  buildPetRects,
  getAxoGrid,
  getHeadGrid,
  gridToRects,
  mixHex,
} from "@/components/crew/axolotlSprite";

/* =========================================================
   BITLYNN UNDERWATER STATION — Canvas2D pixel renderer
   Visual language from the "підводна квартира" concept:
   riveted steel pods (#2B3550), plank floors (#262D45),
   portholes (#0F3D66 + #9ED8FF glint), pink axolotl crew,
   Pixelify Sans labels, hard pixel edges, no gradients on UI.
========================================================= */

export interface SimCrewMember {
  id: string;
  name: string;
  anonHandle: string;
  avatarColor: string;
  x: number;
  y: number;
  facing: "left" | "right";
  walking: boolean;
  walkPhase: number;
  idleOffset: number;
  isSaboteur: boolean;
  isFrozen: boolean;
  isExposed: boolean;
  lastCommitLog: string;
  hasBugInCommit: boolean;
  wasNearSabotage: boolean;
  path: { x: number; y: number }[];
  waitTimer: number;
  bubbleIcon?: string | null;
}

export interface WorldParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface WorldPopupBurst {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  /** Show the pixel coin before the text (default true) */
  coin?: boolean;
}

/** Expanding pixel shock-ring (sonar ping style) in world space. */
export interface WorldRingWave {
  x: number;
  y: number;
  color: string;
  life: number;
  maxLife: number;
  maxR: number;
}

/** Screen-level "juice" driven by gameplay events. */
export interface ScreenFxState {
  /** Camera shake amplitude in CSS px (decays in the game loop) */
  shake: number;
  flashColor: string;
  /** 0..1 full-screen flash opacity (decays in the game loop) */
  flashAlpha: number;
  /** Red pulsing frame while a sabotage is active */
  alarm: boolean;
  alarmUrgent: boolean;
  rings: WorldRingWave[];
  /** Per-crew squash & stretch bounce, 0..1 (decays in the game loop) */
  hitPulse: Record<string, number>;
}

export interface CameraViewRect {
  vx: number;
  vy: number;
  vw: number;
  vh: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface RenderFrameParams {
  crew: SimCrewMember[];
  lobbySize: number;
  roleMode: "engineer" | "saboteur";
  privacyScope: "class-named" | "interschool-anon";
  playerCrewColor: string;
  petPrimaryHex: string;
  petGillHex: string;
  petPos: { x: number; y: number; facing: "left" | "right" };
  cameraMode: "follow" | "overview";
  cameraCenter: { x: number; y: number };
  assignedTaskIds: string[];
  completedTaskIds: string[];
  sabotagedRoomId: string | null;
  nearbyConsoleRoomId: string | null;
  nearbyPortalId: string | null;
  isNearHubTable: boolean;
  tapTargetBeacon: { x: number; y: number } | null;
  nextObjective: { x: number; y: number; color: string; label: string } | null;
  objectiveArrowAngle: number | null;
  particles: WorldParticle[];
  popups: WorldPopupBurst[];
  portalPulseTimers: Record<string, number>;
  timeSec: number;
  fx?: ScreenFxState;
}

/* ---------------------------------------------------------
   Palette (from the design concept canvas)
--------------------------------------------------------- */
const C = {
  deep: "#0A0C12",
  ink: "#0E0F13",
  wall: "#2B3550",
  wallDark: "#232B42",
  rivet: "#2F4C75",
  panelA: "#18253B",
  panelB: "#1B2A42",
  seam: "#152238",
  trim: "#5D6B8A",
  trimDark: "#3E4A66",
  frame: "#8A97B5",
  plank: "#262D45",
  plankSeam: "#1F2539",
  glass: "#0F3D66",
  glassDeep: "#0B2A4A",
  glint: "#9ED8FF",
  pink: "#F6A5C0",
  rose: "#E0457B",
  blush: "#FFD3E2",
  gill: "#EC7FA3",
  plum: "#2A1B2E",
  lamp: "#FFD36B",
  brass: "#C9A66B",
  wood: "#8A5A3C",
  woodDark: "#6B4430",
  box: "#B98A55",
  boxDark: "#8C6438",
  fish: "#FF9F43",
  kelp: "#1F6F6B",
  kelpLight: "#2FA37A",
  aqua: "#6FE3FF",
  sky: "#6FB8FF",
  sand: "#16233A",
  text: "#F3F4F8",
  muted: "#A9AEC0",
  white: "#EDEFF5",
};

/* ---------------------------------------------------------
   Low-level pixel helpers
--------------------------------------------------------- */
function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Filled pixel disc built from horizontal rows of height `step`. */
function pxDisc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  step = 2
) {
  ctx.fillStyle = color;
  for (let dy = -r; dy < r; dy += step) {
    const yMid = dy + step / 2;
    const half = Math.sqrt(Math.max(0, r * r - yMid * yMid));
    const hw = Math.round(half / step) * step;
    if (hw <= 0) continue;
    ctx.fillRect(Math.round(cx - hw), Math.round(cy + dy), hw * 2, step);
  }
}

/** Pixel ring (true annulus, transparent centre) built from row segments. */
function pxRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  color: string,
  step = 2
) {
  ctx.fillStyle = color;
  for (let dy = -rOuter; dy < rOuter; dy += step) {
    const yMid = dy + step / 2;
    const ho = Math.round(Math.sqrt(Math.max(0, rOuter * rOuter - yMid * yMid)) / step) * step;
    const hi =
      Math.abs(yMid) < rInner
        ? Math.round(Math.sqrt(rInner * rInner - yMid * yMid) / step) * step
        : 0;
    if (ho <= 0) continue;
    if (hi <= 0) {
      ctx.fillRect(Math.round(cx - ho), Math.round(cy + dy), ho * 2, step);
    } else {
      ctx.fillRect(Math.round(cx - ho), Math.round(cy + dy), ho - hi, step);
      ctx.fillRect(Math.round(cx + hi), Math.round(cy + dy), ho - hi, step);
    }
  }
}

function pxOutline(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  t = 2
) {
  px(ctx, x, y, w, t, color);
  px(ctx, x, y + h - t, w, t, color);
  px(ctx, x, y, t, h, color);
  px(ctx, x + w - t, y, t, h, color);
}

/** Deterministic pseudo-random for static decor (same every load). */
function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

let cachedPixelFont: string | null = null;
function pixelFont(size: number, weight = 700): string {
  if (cachedPixelFont === null && typeof document !== "undefined") {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue("--font-pixel")
      .trim();
    cachedPixelFont = v ? `${v}, ui-monospace, monospace` : "ui-monospace, monospace";
  }
  return `${weight} ${size}px ${cachedPixelFont ?? "ui-monospace, monospace"}`;
}

/* ---------------------------------------------------------
   Pods (rooms + tunnels) geometry helpers
--------------------------------------------------------- */
const ROOM_SHELL = 9;
const TUNNEL_SHELL = 7;
const WALL_H = 20;

function inflate(r: Rect, by: number): Rect {
  return { x: r.x - by, y: r.y - by, w: r.w + by * 2, h: r.h + by * 2 };
}

function insideRect(x: number, y: number, r: Rect) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function insideAnyPod(x: number, y: number, margin: number) {
  for (const room of SHIP_ROOMS) {
    if (insideRect(x, y, inflate(room.rect, ROOM_SHELL + margin))) return true;
  }
  for (const cor of SHIP_CORRIDORS) {
    if (insideRect(x, y, inflate(cor, TUNNEL_SHELL + margin))) return true;
  }
  return false;
}

/**
 * Computes exact camera transform for both rendering and mouse/tap world projection.
 */
export function computeCameraViewRect(
  canvasCssW: number,
  canvasCssH: number,
  cameraMode: "follow" | "overview",
  cameraCenter: { x: number; y: number }
): CameraViewRect {
  const safeW = Math.max(1, canvasCssW);
  const safeH = Math.max(1, canvasCssH);
  const aspect = safeW / safeH;

  if (cameraMode === "overview") {
    const scale = Math.min(safeW / WORLD_WIDTH, safeH / WORLD_HEIGHT);
    const drawW = WORLD_WIDTH * scale;
    const drawH = WORLD_HEIGHT * scale;
    return {
      vx: 0,
      vy: 0,
      vw: WORLD_WIDTH,
      vh: WORLD_HEIGHT,
      scale,
      offsetX: (safeW - drawW) / 2,
      offsetY: (safeH - drawH) / 2,
    };
  }

  const targetVh = aspect >= 1.35 ? 320 : 350;
  const vh = Math.min(WORLD_HEIGHT, targetVh);
  const vw = Math.min(WORLD_WIDTH, vh * aspect);
  const scale = safeW / vw;
  const drawH = vh * scale;

  const vx = Math.max(0, Math.min(WORLD_WIDTH - vw, cameraCenter.x - vw / 2));
  const vy = Math.max(0, Math.min(WORLD_HEIGHT - vh, cameraCenter.y - vh / 2));

  return {
    vx,
    vy,
    vw,
    vh,
    scale,
    offsetX: 0,
    offsetY: (safeH - drawH) / 2,
  };
}

export function screenToWorld(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  view: CameraViewRect
): { x: number; y: number } {
  const lx = clientX - rect.left;
  const ly = clientY - rect.top;
  return {
    x: view.vx + (lx - view.offsetX) / view.scale,
    y: view.vy + (ly - view.offsetY) / view.scale,
  };
}

/* =========================================================
   STATIC LAYERS (baked once)
========================================================= */
const BAKE_SCALE = 2;

function makeLayer(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = WORLD_WIDTH * BAKE_SCALE;
  canvas.height = WORLD_HEIGHT * BAKE_SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.scale(BAKE_SCALE, BAKE_SCALE);
  return { canvas, ctx };
}

/** Sea floor: dark sand, pebbles, rocks, coral and kelp roots (under the pods). */
function bakeSeabed(): HTMLCanvasElement | null {
  const layer = makeLayer();
  if (!layer) return null;
  const { canvas, ctx } = layer;

  px(ctx, 0, 0, WORLD_WIDTH, WORLD_HEIGHT, C.sand);

  // Sand ripples
  for (let y = 6; y < WORLD_HEIGHT; y += 14) {
    for (let x = 0; x < WORLD_WIDTH; x += 22) {
      const off = (y / 14) % 2 === 0 ? 0 : 11;
      px(ctx, x + off, y, 8, 2, "#1A2A44");
    }
  }
  // Specks
  for (let i = 0; i < 900; i++) {
    const x = hash(i) * WORLD_WIDTH;
    const y = hash(i + 991) * WORLD_HEIGHT;
    px(ctx, x, y, 2, 2, hash(i + 7) > 0.5 ? "#1E3150" : "#101B2E");
  }

  // Rocks + coral clusters only where water is visible
  for (let i = 0; i < 60; i++) {
    const x = 10 + hash(i + 50) * (WORLD_WIDTH - 20);
    const y = 10 + hash(i + 150) * (WORLD_HEIGHT - 20);
    if (insideAnyPod(x, y, 6)) continue;
    const kind = hash(i + 250);
    if (kind < 0.45) {
      // rock
      px(ctx, x - 6, y - 2, 12, 6, "#243049");
      px(ctx, x - 4, y - 4, 8, 2, "#2E3A59");
      px(ctx, x - 6, y + 4, 12, 2, "#141D30");
      px(ctx, x - 2, y - 2, 2, 2, "#3E4A66");
    } else if (kind < 0.7) {
      // pink coral (axolotl colours)
      px(ctx, x - 1, y - 8, 2, 10, C.rose);
      px(ctx, x - 5, y - 6, 2, 6, C.rose);
      px(ctx, x + 3, y - 5, 2, 5, C.rose);
      px(ctx, x - 5, y - 1, 10, 2, "#B8325F");
      px(ctx, x - 1, y - 10, 2, 2, C.pink);
      px(ctx, x - 5, y - 8, 2, 2, C.pink);
      px(ctx, x + 3, y - 7, 2, 2, C.pink);
    } else {
      // shell / starfish
      px(ctx, x - 2, y - 2, 4, 4, C.fish);
      px(ctx, x - 4, y, 2, 2, C.fish);
      px(ctx, x + 2, y, 2, 2, C.fish);
      px(ctx, x, y - 4, 2, 2, C.fish);
      px(ctx, x, y + 2, 2, 2, "#D9822F");
    }
  }

  return canvas;
}

function drawPorthole(ctx: CanvasRenderingContext2D, cx: number, cy: number, r = 7) {
  pxDisc(ctx, cx, cy, r + 2, C.trimDark, 1);
  pxDisc(ctx, cx, cy, r + 1, C.frame, 1);
  pxDisc(ctx, cx, cy, r - 1, C.glass, 1);
  px(ctx, cx - r + 3, cy - r + 3, 2, 2, C.glint);
  px(ctx, cx - r + 5, cy - r + 2, 1, 1, C.glint);
  px(ctx, cx + 1, cy + 2, 3, 1, C.glassDeep);
}

function drawRivetRow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  len: number,
  vertical: boolean,
  spacing = 10
) {
  for (let i = 3; i < len - 2; i += spacing) {
    if (vertical) px(ctx, x, y + i, 2, 2, C.rivet);
    else px(ctx, x + i, y, 2, 2, C.rivet);
  }
}

/** Pods: riveted shells, glass tunnels, plank floors, wall panels, portholes, furniture. */
function bakePods(): HTMLCanvasElement | null {
  const layer = makeLayer();
  if (!layer) return null;
  const { canvas, ctx } = layer;

  // 1. Outer dark outline of every pod (so joints read as one structure)
  for (const cor of SHIP_CORRIDORS) {
    const r = inflate(cor, TUNNEL_SHELL + 2);
    px(ctx, r.x, r.y, r.w, r.h, C.deep);
  }
  for (const room of SHIP_ROOMS) {
    const r = inflate(room.rect, ROOM_SHELL + 2);
    px(ctx, r.x, r.y, r.w, r.h, C.deep);
  }

  // 2. Tunnel shells: steel frame with glass bands + ribs
  for (const cor of SHIP_CORRIDORS) {
    const r = inflate(cor, TUNNEL_SHELL);
    px(ctx, r.x, r.y, r.w, r.h, C.wall);
    const horizontal = cor.w > cor.h;
    if (horizontal) {
      px(ctx, r.x, r.y + 2, r.w, 4, C.glass);
      px(ctx, r.x, r.y + r.h - 6, r.w, 4, C.glass);
      for (let x = r.x + 6; x < r.x + r.w; x += 24) {
        px(ctx, x, r.y, 3, r.h, C.trimDark);
        px(ctx, x + 8, r.y + 2, 3, 1, C.glint);
        px(ctx, x + 14, r.y + r.h - 5, 2, 1, C.glint);
      }
    } else {
      px(ctx, r.x + 2, r.y, 4, r.h, C.glass);
      px(ctx, r.x + r.w - 6, r.y, 4, r.h, C.glass);
      for (let y = r.y + 6; y < r.y + r.h; y += 24) {
        px(ctx, r.x, y, r.w, 3, C.trimDark);
        px(ctx, r.x + 3, y + 8, 1, 3, C.glint);
        px(ctx, r.x + r.w - 5, y + 14, 1, 2, C.glint);
      }
    }
  }

  // 3. Room shells with rivet rows
  for (const room of SHIP_ROOMS) {
    const r = inflate(room.rect, ROOM_SHELL);
    px(ctx, r.x, r.y, r.w, r.h, C.wall);
    px(ctx, r.x, r.y + r.h - 3, r.w, 3, C.wallDark);
    drawRivetRow(ctx, r.x, r.y + 3, r.w, false);
    drawRivetRow(ctx, r.x, r.y + r.h - 5, r.w, false);
    drawRivetRow(ctx, r.x + 3, r.y, r.h, true);
    drawRivetRow(ctx, r.x + r.w - 5, r.y, r.h, true);
  }

  // 4. Tunnel floors: metal grate
  for (const cor of SHIP_CORRIDORS) {
    px(ctx, cor.x, cor.y, cor.w, cor.h, C.panelA);
    const horizontal = cor.w > cor.h;
    if (horizontal) {
      for (let x = cor.x; x < cor.x + cor.w; x += 8) {
        px(ctx, x, cor.y + 6, 1, cor.h - 12, C.seam);
      }
      px(ctx, cor.x, cor.y + 4, cor.w, 2, C.panelB);
      px(ctx, cor.x, cor.y + cor.h - 6, cor.w, 2, C.panelB);
      // centre guide strip in soft pink (lamp dots)
      for (let x = cor.x + 8; x < cor.x + cor.w - 4; x += 16) {
        px(ctx, x, cor.y + cor.h / 2 - 1, 4, 2, "#3A2A44");
      }
    } else {
      for (let y = cor.y; y < cor.y + cor.h; y += 8) {
        px(ctx, cor.x + 6, y, cor.w - 12, 1, C.seam);
      }
      px(ctx, cor.x + 4, cor.y, 2, cor.h, C.panelB);
      px(ctx, cor.x + cor.w - 6, cor.y, 2, cor.h, C.panelB);
      for (let y = cor.y + 8; y < cor.y + cor.h - 4; y += 16) {
        px(ctx, cor.x + cor.w / 2 - 1, y, 2, 4, "#3A2A44");
      }
    }
  }

  // 5. Room floors + top wall (2.5D) + portholes + accent rug
  for (const room of SHIP_ROOMS) {
    const { x, y, w, h } = room.rect;
    const isHub = room.id === "sec-hub";

    if (isHub) {
      for (let ty = y; ty < y + h; ty += 10) {
        for (let tx = x; tx < x + w; tx += 10) {
          const odd = ((tx - x) / 10 + (ty - y) / 10) % 2 === 1;
          px(ctx, tx, ty, Math.min(10, x + w - tx), Math.min(10, y + h - ty), odd ? C.panelB : C.panelA);
        }
      }
    } else {
      px(ctx, x, y, w, h, C.plank);
      let row = 0;
      for (let py = y; py < y + h; py += 6) {
        px(ctx, x, py, w, 1, C.plankSeam);
        const off = row % 2 === 0 ? 0 : 15;
        for (let jx = x + off; jx < x + w; jx += 30) {
          px(ctx, jx, py, 1, 6, C.plankSeam);
        }
        row++;
      }
      // a few lighter planks
      for (let i = 0; i < 6; i++) {
        const py = y + WALL_H + 6 * Math.floor(hash(i + x) * ((h - WALL_H) / 6 - 1));
        const pxx = x + Math.floor(hash(i + y) * (w - 30));
        px(ctx, pxx, py + 1, 28, 5, "#2B3350");
      }
    }

    // Top wall face: alternating panels, trim + baseboard
    for (let wx = x; wx < x + w; wx += 20) {
      const pw = Math.min(20, x + w - wx);
      px(ctx, wx, y, pw, WALL_H, ((wx - x) / 20) % 2 === 0 ? C.panelA : C.panelB);
      px(ctx, wx, y, 1, WALL_H, C.seam);
    }
    px(ctx, x, y, w, 1, C.trim);
    px(ctx, x, y + WALL_H - 3, w, 1, C.trim);
    px(ctx, x, y + WALL_H - 2, w, 2, C.trimDark);
    // accent lamp strip
    px(ctx, x + 6, y + 2, w - 12, 1, room.accent);

    // Doorways: tunnels that enter through the top wall cut an opening in it
    const cuts: [number, number][] = [];
    for (const cor of SHIP_CORRIDORS) {
      const top = Math.max(y, cor.y);
      const bottom = Math.min(y + WALL_H, cor.y + cor.h);
      const left = Math.max(x, cor.x);
      const right = Math.min(x + w, cor.x + cor.w);
      if (bottom - top > 4 && right - left > 8) {
        px(ctx, left, top, right - left, bottom - top, isHub ? C.panelA : C.plank);
        px(ctx, left - 3, y, 3, WALL_H, C.trimDark);
        px(ctx, right, y, 3, WALL_H, C.trimDark);
        cuts.push([left - 12, right + 12]);
      }
    }

    // Portholes along top wall, keeping the centre free for the nameplate
    const holes = [x + 18, x + w - 18];
    if (w > 190) holes.push(x + 44, x + w - 44);
    for (const hx of holes) {
      if (cuts.some(([a, b]) => hx > a && hx < b)) continue;
      drawPorthole(ctx, hx, y + 10, 6);
    }

    // Side wall shadow strips
    px(ctx, x, y + WALL_H, 3, h - WALL_H, "rgba(10, 12, 18, 0.45)");
    px(ctx, x + w - 3, y + WALL_H, 3, h - WALL_H, "rgba(10, 12, 18, 0.35)");
    px(ctx, x, y + WALL_H, w, 4, "rgba(10, 12, 18, 0.4)");

    // Accent rug (pixel border + dotted pattern)
    if (!isHub) {
      const rh = 34;
      let rw = Math.min(90, w - 70);
      let rx = x + w / 2 - rw / 2 + (room.id === "sec-crypto" ? 0 : 6);
      let ry = y + h - rh - 18;
      if (room.id === "sec-memory") rw = 80;
      if (room.id === "sec-radar") ry = y + WALL_H + 10;
      if (room.id === "sec-shield") {
        rx = x + 75;
        rw = 78;
        ry = y + WALL_H + 8;
      }
      if (room.id === "sec-reactor") {
        rx = x + 70;
        rw = 80;
        ry = y + WALL_H + 10;
      }
      px(ctx, rx, ry, rw, rh, mixHex(room.accent, C.plank, 0.72));
      pxOutline(ctx, rx, ry, rw, rh, mixHex(room.accent, C.plank, 0.35), 2);
      for (let dx = rx + 6; dx < rx + rw - 4; dx += 8) {
        for (let dy = ry + 6; dy < ry + rh - 4; dy += 8) {
          px(ctx, dx, dy, 2, 2, mixHex(room.accent, C.plank, 0.5));
        }
      }
    }
  }

  // 6. Door hatches between pods and tunnels (brass hazard stripes)
  const doors = [
    { x: 265, y: 90, w: 9, h: 50 },
    { x: 338, y: 90, w: 9, h: 50 },
    { x: 553, y: 90, w: 9, h: 50 },
    { x: 626, y: 90, w: 9, h: 50 },
    { x: 265, y: 460, w: 9, h: 50 },
    { x: 338, y: 460, w: 9, h: 50 },
    { x: 553, y: 460, w: 9, h: 50 },
    { x: 626, y: 460, w: 9, h: 50 },
    { x: 140, y: 194, w: 50, h: 9 },
    { x: 140, y: 396, w: 50, h: 9 },
    { x: 710, y: 194, w: 50, h: 9 },
    { x: 710, y: 396, w: 50, h: 9 },
    { x: 425, y: 160, w: 50, h: 9 },
    { x: 425, y: 214, w: 50, h: 9 },
    { x: 425, y: 376, w: 50, h: 9 },
    { x: 425, y: 430, w: 50, h: 9 },
    { x: 344, y: 275, w: 9, h: 50 },
    { x: 547, y: 275, w: 9, h: 50 },
  ];
  for (const d of doors) {
    px(ctx, d.x - 1, d.y - 1, d.w + 2, d.h + 2, C.deep);
    px(ctx, d.x, d.y, d.w, d.h, C.trimDark);
    const vertical = d.h > d.w;
    if (vertical) {
      for (let sy = d.y + 2; sy < d.y + d.h - 2; sy += 6) {
        px(ctx, d.x + 2, sy, d.w - 4, 3, C.brass);
      }
    } else {
      for (let sx = d.x + 2; sx < d.x + d.w - 2; sx += 6) {
        px(ctx, sx, d.y + 2, 3, d.h - 4, C.brass);
      }
    }
  }

  // 7. Furniture per room (static parts; animated bits are drawn per frame)
  drawCapsuleFurniture(ctx);
  drawStudioFurniture(ctx);
  drawLoftFurniture(ctx);
  drawHubFurniture(ctx);
  drawSonarFurniture(ctx);
  drawAirlockFurniture(ctx);
  drawEngineFurniture(ctx);

  return canvas;
}

/* ---------- Furniture (static) ---------- */

/** Капсула: matras, box with old laptop, leaking pipe + bucket. */
function drawCapsuleFurniture(ctx: CanvasRenderingContext2D) {
  // Mattress bottom-left
  px(ctx, 72, 156, 52, 20, "#9AA1B4");
  px(ctx, 72, 156, 52, 16, "#C9CEDA");
  px(ctx, 72, 156, 14, 16, C.white);
  px(ctx, 92, 160, 32, 12, C.rose);
  px(ctx, 92, 160, 32, 2, "#B8325F");
  // Cardboard box + laptop (screen animated)
  px(ctx, 214, 92, 40, 26, C.box);
  px(ctx, 214, 92, 40, 3, "#D4A56E");
  px(ctx, 233, 95, 2, 23, C.boxDark);
  px(ctx, 222, 80, 24, 14, "#3A3F4E");
  px(ctx, 218, 92, 32, 3, "#5A6070");
  // Leaky pipe on the wall + bucket
  px(ctx, 248, 60, 6, 18, C.trim);
  px(ctx, 246, 76, 10, 4, C.trimDark);
  px(ctx, 242, 168, 16, 14, C.trim);
  px(ctx, 242, 168, 16, 3, "#8A97B5");
  px(ctx, 245, 171, 10, 3, C.glass);
}

/** Студія: desk with working PC, bookshelf, plant. */
function drawStudioFurniture(ctx: CanvasRenderingContext2D) {
  // Bookshelf right
  px(ctx, 518, 56, 30, 48, C.woodDark);
  px(ctx, 520, 58, 26, 44, C.wood);
  const books = [C.rose, C.sky, C.lamp, C.kelpLight, C.pink, C.fish];
  for (let shelf = 0; shelf < 3; shelf++) {
    const sy = 60 + shelf * 14;
    px(ctx, 520, sy + 12, 26, 2, C.woodDark);
    for (let b = 0; b < 5; b++) {
      px(ctx, 522 + b * 5, sy + 2 + (b % 2), 4, 10 - (b % 2), books[(b + shelf) % books.length]);
    }
  }
  // Plant top-left under the wall
  px(ctx, 352, 72, 14, 12, "#9AA1B4");
  px(ctx, 352, 72, 14, 2, C.white);
  px(ctx, 358, 56, 2, 16, C.kelpLight);
  px(ctx, 352, 60, 6, 4, C.kelpLight);
  px(ctx, 360, 54, 6, 4, C.kelp);
  px(ctx, 360, 64, 6, 4, C.kelpLight);
  // Bean bag
  px(ctx, 520, 136, 24, 16, C.rose);
  px(ctx, 522, 134, 20, 4, C.pink);
  px(ctx, 520, 150, 24, 3, "#B8325F");
}

/** Dev-лофт: monitor wall (animated), server rack, beanbag, cables. */
function drawLoftFurniture(ctx: CanvasRenderingContext2D) {
  // Long desk under the monitors
  px(ctx, 640, 96, 64, 8, C.wood);
  px(ctx, 640, 104, 64, 3, C.woodDark);
  px(ctx, 644, 107, 4, 14, C.woodDark);
  px(ctx, 696, 107, 4, 14, C.woodDark);
  // Server rack right (under the wall)
  px(ctx, 808, 62, 26, 50, "#14161D");
  pxOutline(ctx, 808, 62, 26, 50, C.trim, 2);
  for (let i = 0; i < 4; i++) {
    px(ctx, 812, 67 + i * 11, 18, 7, "#1F2331");
  }
  // Floor cables
  px(ctx, 704, 118, 116, 2, "#1A1D26");
  px(ctx, 818, 112, 2, 8, "#1A1D26");
  // Chair
  px(ctx, 664, 112, 16, 10, "#1A1A22");
  px(ctx, 666, 108, 12, 4, C.rose);
}

/** Купол: glass floor ring showing the sea + round sonar table. */
function drawHubFurniture(ctx: CanvasRenderingContext2D) {
  const { x, y, r } = HUB_TABLE;
  // Glass floor ring
  pxDisc(ctx, x, y, r + 26, C.trimDark, 2);
  pxDisc(ctx, x, y, r + 24, C.glass, 2);
  pxDisc(ctx, x, y, r + 14, C.trimDark, 2);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    px(ctx, x + Math.cos(a) * (r + 19), y + Math.sin(a) * (r + 19), 2, 2, C.glint);
  }
  // Table: brass rim, steel top, dark screen
  pxDisc(ctx, x, y + 3, r + 2, C.deep, 2);
  pxDisc(ctx, x, y, r + 2, C.brass, 2);
  pxDisc(ctx, x, y, r - 1, C.trimDark, 2);
  pxDisc(ctx, x, y, r - 5, C.glassDeep, 2);
  // Hub log terminal (top-left)
  px(ctx, 364, 230, 36, 18, C.deep);
  px(ctx, 366, 232, 32, 14, C.panelB);
  px(ctx, 368, 234, 28, 8, C.glass);
  // Lamps in corners
  for (const [lx, ly] of [
    [358, 362],
    [534, 362],
  ]) {
    px(ctx, lx, ly, 8, 10, C.trimDark);
    px(ctx, lx + 2, ly - 8, 4, 8, C.lamp);
  }
}

/** Сонарна: sonar desk (animated screen drawn later), chairs, headphones. */
function drawSonarFurniture(ctx: CanvasRenderingContext2D) {
  px(ctx, 196, 540, 60, 10, C.wood);
  px(ctx, 196, 548, 60, 3, C.woodDark);
  px(ctx, 74, 530, 14, 14, "#1A1A22");
  px(ctx, 76, 526, 10, 4, C.kelpLight);
  // Headphones on a hook
  px(ctx, 76, 430, 10, 2, "#1A1D26");
  px(ctx, 76, 430, 2, 8, "#1A1D26");
  px(ctx, 84, 430, 2, 8, "#1A1D26");
  px(ctx, 74, 436, 4, 4, C.rose);
  px(ctx, 84, 436, 4, 4, C.rose);
}

/** Шлюз: lockers, diving suit, pressure valve (animated wheel later). */
function drawAirlockFurniture(ctx: CanvasRenderingContext2D) {
  for (let i = 0; i < 3; i++) {
    const lx = 506 + i * 15;
    px(ctx, lx, 470, 13, 34, C.trimDark);
    px(ctx, lx + 1, 471, 11, 32, "#4A5672");
    px(ctx, lx + 3, 476, 7, 1, C.trimDark);
    px(ctx, lx + 3, 479, 7, 1, C.trimDark);
    px(ctx, lx + 9, 488, 2, 3, C.brass);
  }
  // Diving helmet on a stand
  px(ctx, 360, 540, 16, 4, C.trimDark);
  pxDisc(ctx, 368, 530, 9, C.brass, 2);
  pxDisc(ctx, 368, 530, 5, C.glass, 2);
  px(ctx, 365, 527, 2, 2, C.glint);
}

/** Машинна: boiler housing, pipes along walls, toolbox. */
function drawEngineFurniture(ctx: CanvasRenderingContext2D) {
  // Pipes
  px(ctx, 636, 432, 6, 120, C.trim);
  px(ctx, 636, 432, 2, 120, "#8A97B5");
  px(ctx, 636, 548, 60, 6, C.trim);
  for (let y = 444; y < 548; y += 22) px(ctx, 634, y, 10, 3, C.trimDark);
  // Boiler housing
  px(ctx, 648, 488, 52, 50, C.deep);
  px(ctx, 650, 490, 48, 46, C.trimDark);
  px(ctx, 650, 490, 48, 4, C.trim);
  // Toolbox
  px(ctx, 800, 540, 24, 12, C.rose);
  px(ctx, 800, 540, 24, 3, "#B8325F");
  px(ctx, 808, 536, 8, 4, C.trimDark);
}

/**
 * Bakes the static station once. Returned canvas holds the seabed AND the pods;
 * the renderer also caches the two layers separately for under-water effects.
 */
let bakedSeabed: HTMLCanvasElement | null = null;
let bakedPods: HTMLCanvasElement | null = null;

export function createStaticShipTextureCanvas(): HTMLCanvasElement | null {
  bakedSeabed = bakeSeabed();
  bakedPods = bakePods();
  return bakedPods;
}

/* =========================================================
   SPRITES (cached offscreen bitmaps)
========================================================= */
const SPRITE_RES = 6; // offscreen pixels per sprite pixel
const CREW_PX = 1.7; // world units per sprite pixel
const spriteCache = new Map<string, HTMLCanvasElement>();

function getAxoBitmap(
  hoodie: string,
  frame: AxoFrame,
  eyes: AxoEyes,
  gaze: -1 | 0 | 1,
  frozen: boolean
): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const key = `${hoodie}|${frame}|${eyes}|${gaze}|${frozen ? 1 : 0}`;
  const hit = spriteCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = AXO_W * SPRITE_RES;
  c.height = AXO_H * SPRITE_RES;
  const g = c.getContext("2d");
  if (!g) return null;
  const rects = gridToRects(getAxoGrid(frame, eyes, gaze), buildAxoPalette(hoodie, frozen));
  for (const r of rects) {
    g.fillStyle = r.fill;
    g.fillRect(r.x * SPRITE_RES, r.y * SPRITE_RES, r.w * SPRITE_RES, SPRITE_RES);
  }
  spriteCache.set(key, c);
  return c;
}

function getPetBitmap(primary: string, gill: string): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const key = `pet|${primary}|${gill}`;
  const hit = spriteCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = AXO_W * SPRITE_RES;
  c.height = 9 * SPRITE_RES;
  const g = c.getContext("2d");
  if (!g) return null;
  for (const r of buildPetRects(primary, gill)) {
    g.fillStyle = r.fill;
    g.fillRect(r.x * SPRITE_RES, r.y * SPRITE_RES, r.w * SPRITE_RES, SPRITE_RES);
  }
  spriteCache.set(key, c);
  return c;
}

function getHoloBitmap(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const hit = spriteCache.get("holo");
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = AXO_W * SPRITE_RES;
  c.height = 9 * SPRITE_RES;
  const g = c.getContext("2d");
  if (!g) return null;
  const rects = gridToRects(getHeadGrid(), buildAxoPalette("#000000"));
  for (const r of rects) {
    g.fillStyle = r.fill;
    g.fillRect(r.x * SPRITE_RES, r.y * SPRITE_RES, r.w * SPRITE_RES, SPRITE_RES);
  }
  // scanlines
  g.fillStyle = "rgba(14, 15, 19, 0.25)";
  for (let y = 0; y < 9 * SPRITE_RES; y += SPRITE_RES) {
    g.fillRect(0, y + SPRITE_RES - 2, c.width, 2);
  }
  spriteCache.set("holo", c);
  return c;
}

/* ---------- 7×7 pixel status icons (replace emoji bubbles) ---------- */
const ICONS: Record<string, { rows: string[]; color: string }> = {
  wrench: {
    color: "#C9CEDA",
    rows: ["...XX..", "..X..X.", "..XX.X.", ".XXX...", "XXX....", "XX.....", "X......"],
  },
  laptop: {
    color: C.aqua,
    rows: [".XXXXX.", ".X...X.", ".X.X.X.", ".X...X.", ".XXXXX.", "XXXXXXX", "......."],
  },
  bolt: {
    color: C.lamp,
    rows: ["...XX..", "..XX...", ".XXXXX.", "...XX..", "..XX...", ".XX....", "X......"],
  },
  sonar: {
    color: C.kelpLight,
    rows: ["X......", ".X..X..", "..X..X.", "X..X..X", "..X..X.", ".X..X..", "X......"],
  },
  shield: {
    color: C.sky,
    rows: ["XXXXXXX", "X.....X", "X..X..X", "X.XXX.X", ".X.X.X.", "..X.X..", "...X..."],
  },
  snow: {
    color: C.glint,
    rows: ["...X...", ".X.X.X.", "..XXX..", "XXXXXXX", "..XXX..", ".X.X.X.", "...X..."],
  },
  eyes: {
    color: C.lamp,
    rows: [".......", "XXX.XXX", "X.X.X.X", "XXX.XXX", ".......", ".......", "......."],
  },
  heart: {
    color: C.pink,
    rows: [".XX.XX.", "XXXXXXX", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."],
  },
};

const EMOJI_TO_ICON: Record<string, string> = {
  "🔧": "wrench",
  "💻": "laptop",
  "⚡": "bolt",
  "📡": "sonar",
  "🛡️": "shield",
  "❄️": "snow",
  "👀": "eyes",
  "❤️": "heart",
};

function drawIcon(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, s = 1.4) {
  const icon = ICONS[name];
  if (!icon) return;
  ctx.fillStyle = icon.color;
  for (let r = 0; r < icon.rows.length; r++) {
    for (let c = 0; c < icon.rows[r].length; c++) {
      if (icon.rows[r][c] === "X") ctx.fillRect(x + c * s, y + r * s, s, s);
    }
  }
}

function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number) {
  px(ctx, x + 2, y, 6, 10, C.brass);
  px(ctx, x, y + 2, 10, 6, C.brass);
  px(ctx, x + 2, y + 2, 6, 6, C.lamp);
  px(ctx, x + 4, y + 3, 2, 4, C.brass);
}

/* =========================================================
   CHARACTERS
========================================================= */
function drawCrewSprite(
  ctx: CanvasRenderingContext2D,
  member: SimCrewMember,
  options: {
    color: string;
    label: string;
    labelColor: string;
    isMe: boolean;
    showSaboteurMark: boolean;
    timeSec: number;
  }
) {
  const { color, label, labelColor, isMe, showSaboteurMark, timeSec } = options;
  const isMoving = member.walking && !member.isFrozen;
  const step = Math.floor(member.walkPhase / Math.PI) % 2 === 0;
  const frame: AxoFrame = isMoving ? (step ? "stepA" : "stepB") : "idle";

  const blinkCycle = (timeSec + member.idleOffset * 1.7) % 3.8;
  const eyes: AxoEyes = member.isExposed
    ? "x"
    : showSaboteurMark
    ? "sly"
    : !member.isFrozen && blinkCycle > 3.62
    ? "blink"
    : "normal";
  const gaze: -1 | 0 | 1 = isMoving ? (member.facing === "left" ? -1 : 1) : 0;

  const spriteW = AXO_W * CREW_PX;
  const spriteH = AXO_H * CREW_PX;
  const footY = member.y + 14;
  const bob = isMoving
    ? step
      ? -CREW_PX
      : 0
    : member.isFrozen
    ? 0
    : Math.floor((timeSec * 1.4 + member.idleOffset) % 2) === 0
    ? -CREW_PX * 0.5
    : 0;

  ctx.save();

  // Player marker: pink pixel brackets under the feet
  if (isMe) {
    const pulse = Math.floor(timeSec * 3) % 2 === 0 ? 0 : 1;
    const w = 26 + pulse * 2;
    const x0 = member.x - w / 2;
    const y0 = footY - 4;
    px(ctx, x0, y0, 6, 2, color);
    px(ctx, x0, y0, 2, 6, color);
    px(ctx, x0 + w - 6, y0, 6, 2, color);
    px(ctx, x0 + w - 2, y0, 2, 6, color);
    px(ctx, x0, y0 + 8, 6, 2, color);
    px(ctx, x0 + w - 6, y0 + 8, 6, 2, color);
  }

  // Pixel shadow
  const sw = isMoving && step ? 18 : 22;
  px(ctx, member.x - sw / 2, footY - 1, sw, 3, "rgba(5, 7, 12, 0.55)");
  px(ctx, member.x - sw / 2 + 3, footY + 2, sw - 6, 1, "rgba(5, 7, 12, 0.35)");

  // Sprite
  const bmp = getAxoBitmap(color, frame, eyes, gaze, member.isFrozen);
  if (bmp) {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(
      bmp,
      member.x - spriteW / 2,
      footY - spriteH + bob,
      spriteW,
      spriteH
    );
  }

  // Frozen: pixel ice block
  if (member.isFrozen) {
    const ix = member.x - spriteW / 2 - 3;
    const iy = footY - spriteH - 3;
    ctx.fillStyle = "rgba(158, 216, 255, 0.22)";
    ctx.fillRect(ix, iy, spriteW + 6, spriteH + 5);
    pxOutline(ctx, ix, iy, spriteW + 6, spriteH + 5, "#9ED8FF", 1.5);
    px(ctx, ix + 4, iy + 4, 6, 2, "rgba(255,255,255,0.8)");
    px(ctx, ix + 4, iy + 6, 2, 4, "rgba(255,255,255,0.8)");
    px(ctx, ix + spriteW - 4, iy + spriteH - 6, 4, 2, "rgba(255,255,255,0.55)");
  }

  // Saboteur ally marker: pink pixel triangle
  if (showSaboteurMark && !member.isExposed) {
    const tx = member.x;
    const ty = footY - spriteH - 16;
    px(ctx, tx - 5, ty, 10, 2, C.rose);
    px(ctx, tx - 3, ty + 2, 6, 2, C.rose);
    px(ctx, tx - 1, ty + 4, 2, 2, C.rose);
  }

  // Status bubble (pixel speech box + 7×7 icon)
  const iconName = member.bubbleIcon ? EMOJI_TO_ICON[member.bubbleIcon] : undefined;
  if (iconName && !isMoving) {
    const by = footY - spriteH - 8 + (Math.floor(timeSec * 2 + member.idleOffset) % 2);
    const bx = member.x + 9;
    px(ctx, bx, by - 12, 16, 14, C.deep);
    px(ctx, bx + 1, by - 11, 14, 12, C.ink);
    px(ctx, bx + 2, by + 2, 3, 2, C.deep);
    drawIcon(ctx, iconName, bx + 3, by - 9, 1.4);
  }

  // Nameplate (Pixelify Sans)
  ctx.font = pixelFont(8.5, 700);
  const tw = Math.min(76, Math.max(22, ctx.measureText(label).width + 8));
  const ny = footY - spriteH - 13;
  px(ctx, member.x - tw / 2, ny - 1, tw, 12, "rgba(10, 12, 18, 0.9)");
  px(ctx, member.x - tw / 2, ny + 10, tw, 1, isMe ? color : C.wall);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = labelColor;
  ctx.fillText(label, member.x, ny + 5);

  ctx.restore();
}

function drawPet(
  ctx: CanvasRenderingContext2D,
  petPos: { x: number; y: number; facing: "left" | "right" },
  primaryHex: string,
  gillHex: string,
  timeSec: number
) {
  const bmp = getPetBitmap(primaryHex, gillHex);
  if (!bmp) return;
  const hover = Math.floor(timeSec * 2.2) % 2 === 0 ? -1 : 0;
  const w = AXO_W * 1.05;
  const h = 9 * 1.05;
  px(ctx, petPos.x - 6, petPos.y + 8, 12, 2, "rgba(5,7,12,0.45)");
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(bmp, petPos.x - w / 2, petPos.y - h / 2 + hover - 2, w, h);
  // tiny bubbles from the pet
  if (Math.floor(timeSec * 1.5) % 3 === 0) {
    const t = (timeSec * 1.5) % 1;
    px(ctx, petPos.x + 6, petPos.y - 8 - t * 8, 2, 2, "rgba(158,216,255,0.7)");
  }
}

/* =========================================================
   AMBIENT SEA LIFE (deterministic, drawn under the pods)
========================================================= */
const FISH = Array.from({ length: 9 }).map((_, i) => ({
  y: 20 + hash(i + 400) * (WORLD_HEIGHT - 40),
  speed: 10 + hash(i + 401) * 18,
  phase: hash(i + 402) * WORLD_WIDTH,
  dir: hash(i + 403) > 0.5 ? 1 : -1,
  color: [C.fish, C.lamp, C.sky, C.pink][i % 4],
}));

const BUBBLE_VENTS = Array.from({ length: 40 })
  .map((_, i) => ({
    x: 8 + hash(i + 600) * (WORLD_WIDTH - 16),
    y: 8 + hash(i + 601) * (WORLD_HEIGHT - 16),
    phase: hash(i + 602) * 10,
  }))
  .filter((v) => !insideAnyPod(v.x, v.y, 10))
  .slice(0, 14);

const KELP_SPOTS = Array.from({ length: 70 })
  .map((_, i) => ({
    x: 8 + hash(i + 700) * (WORLD_WIDTH - 16),
    y: 30 + hash(i + 701) * (WORLD_HEIGHT - 36),
    h: 4 + Math.floor(hash(i + 702) * 5),
    phase: hash(i + 703) * 6,
  }))
  .filter((k) => !insideAnyPod(k.x, k.y, 4) && !insideAnyPod(k.x, k.y - 20, 4))
  .slice(0, 22);

function drawFish(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, color: string, t: number) {
  const s = 2;
  const flap = Math.floor(t * 6) % 2;
  ctx.fillStyle = color;
  // body
  ctx.fillRect(x - 3 * s, y - s, 6 * s, 2 * s);
  ctx.fillRect(x - 2 * s, y - 2 * s, 4 * s, s);
  ctx.fillRect(x - 2 * s, y + s, 4 * s, s);
  // tail
  const tx = x - dir * 4 * s;
  ctx.fillRect(tx - s / 2, y - (flap ? 2 : 1) * s, s, (flap ? 4 : 2) * s);
  // eye
  ctx.fillStyle = C.plum;
  ctx.fillRect(x + dir * 1.5 * s - s / 2, y - s, s, s);
}

/* =========================================================
   FRAME RENDERER
========================================================= */
export function renderShipFrame(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  dpr: number,
  view: CameraViewRect,
  state: RenderFrameParams,
  staticMap: HTMLCanvasElement | null
) {
  const { timeSec } = state;

  if (!bakedSeabed || !bakedPods) {
    // staticMap passed in is the pods layer; seabed is baked alongside it
    if (!bakedPods && staticMap) bakedPods = staticMap;
    if (!bakedSeabed) bakedSeabed = bakeSeabed();
  }
  const podsLayer = bakedPods ?? staticMap;

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = false;

  // 1. Deep water backdrop outside the world bounds
  const bg = ctx.createLinearGradient(0, 0, 0, cssH);
  bg.addColorStop(0, "#0B2238");
  bg.addColorStop(1, "#05070C");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cssW, cssH);

  const fx = state.fx;
  const shakeAmp = fx ? Math.min(8, fx.shake) : 0;
  const shakeX = shakeAmp > 0.2 ? Math.round((Math.random() * 2 - 1) * shakeAmp) : 0;
  const shakeY = shakeAmp > 0.2 ? Math.round((Math.random() * 2 - 1) * shakeAmp) : 0;

  ctx.save();
  ctx.translate(
    view.offsetX - view.vx * view.scale + shakeX,
    view.offsetY - view.vy * view.scale + shakeY
  );
  ctx.scale(view.scale, view.scale);

  // 2. Seabed
  if (bakedSeabed) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bakedSeabed, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  // 2a. Light rays drifting over the sand
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = C.glint;
  for (let i = 0; i < 7; i++) {
    const bx = ((i * 160 + timeSec * 6) % (WORLD_WIDTH + 200)) - 100;
    ctx.beginPath();
    ctx.moveTo(bx, 0);
    ctx.lineTo(bx + 40, 0);
    ctx.lineTo(bx + 140, WORLD_HEIGHT);
    ctx.lineTo(bx + 90, WORLD_HEIGHT);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 2b. Swaying kelp
  for (const k of KELP_SPOTS) {
    for (let seg = 0; seg < k.h; seg++) {
      const sway = Math.round(Math.sin(timeSec * 1.6 + k.phase + seg * 0.6) * (seg * 0.6));
      px(ctx, k.x + sway, k.y - seg * 4, 3, 4, seg % 2 === 0 ? C.kelp : C.kelpLight);
      if (seg % 2 === 1) px(ctx, k.x + sway + 3, k.y - seg * 4 + 1, 2, 2, C.kelpLight);
    }
  }

  // 2c. Fish
  for (let i = 0; i < FISH.length; i++) {
    const f = FISH[i];
    const span = WORLD_WIDTH + 60;
    const raw = (f.phase + timeSec * f.speed) % span;
    const fx = f.dir > 0 ? raw - 30 : WORLD_WIDTH + 30 - raw;
    const fy = f.y + Math.round(Math.sin(timeSec * 0.8 + i) * 4);
    drawFish(ctx, fx, fy, f.dir, f.color, timeSec + i);
  }

  // 2d. Bubble vents
  for (const v of BUBBLE_VENTS) {
    for (let b = 0; b < 3; b++) {
      const t = (timeSec * 0.45 + v.phase + b * 0.33) % 1;
      const by = v.y - t * 60;
      const bx = v.x + Math.round(Math.sin((timeSec + b) * 3 + v.phase) * 2);
      ctx.globalAlpha = 1 - t;
      px(ctx, bx, by, b === 0 ? 3 : 2, b === 0 ? 3 : 2, C.glint);
    }
  }
  ctx.globalAlpha = 1;

  // 3. Station pods
  if (podsLayer) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(podsLayer, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  // 3a. Animated porthole glints (fish passing by)
  for (const room of SHIP_ROOMS) {
    const hx = room.rect.x + 18;
    const t = (timeSec * 0.35 + room.rect.x * 0.01) % 4;
    if (t < 1) {
      const fx = hx - 4 + t * 8;
      px(ctx, fx, room.rect.y + 10, 3, 2, C.fish);
    }
  }

  // 4. Sabotage alarm + room nameplates
  const blinkOn = Math.floor(timeSec * 3) % 2 === 0;
  for (const room of SHIP_ROOMS) {
    const isSab = room.id === state.sabotagedRoomId;
    const { x, y, w, h } = room.rect;
    if (isSab) {
      const a = blinkOn ? 0.24 : 0.1;
      ctx.fillStyle = `rgba(224, 69, 123, ${a})`;
      ctx.fillRect(x, y, w, h);
      pxOutline(ctx, x - 2, y - 2, w + 4, h + 4, C.rose, 3);
      // red alarm lamps on the wall
      for (const lx of [x + 6, x + w - 14]) {
        px(ctx, lx, y + 4, 8, 8, C.deep);
        px(ctx, lx + 1, y + 5, 6, 6, blinkOn ? C.rose : "#5A1A30");
      }
    }

    ctx.font = pixelFont(9.5, 700);
    const tw = Math.max(64, ctx.measureText(room.name).width + 16);
    const cx = x + w / 2;
    const ly = y + 4;
    px(ctx, cx - tw / 2 - 1, ly - 1, tw + 2, 14, C.deep);
    px(ctx, cx - tw / 2, ly, tw, 12, C.ink);
    px(ctx, cx - tw / 2, ly + 10, tw, 2, isSab ? C.rose : room.accent);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isSab ? C.blush : C.text;
    ctx.fillText(room.name, cx, ly + 5.5);
  }

  // 5. Animated machinery
  // 5a. Капсула: cracked laptop screen flicker
  {
    const on = Math.sin(timeSec * 9) > -0.6;
    px(ctx, 224, 82, 20, 10, on ? C.glass : "#0A1A2A");
    if (on) {
      px(ctx, 226, 84, 10, 1, C.aqua);
      px(ctx, 226, 87, 6 + (Math.floor(timeSec * 2) % 3) * 3, 1, C.pink);
    }
    px(ctx, 236, 82, 1, 10, "#C9CEDA"); // crack
    // drip from the pipe into the bucket
    const d = (timeSec * 0.9) % 1;
    px(ctx, 250, 80 + d * 86, 2, 3, C.glint);
  }
  // 5b. Студія: PC monitor scrolling code (on the console desk) — drawn with consoles
  // 5c. Dev-лофт: monitor wall
  {
    for (let m = 0; m < 3; m++) {
      const mx = 642 + m * 21;
      px(ctx, mx, 70, 19, 24, C.deep);
      px(ctx, mx + 1, 71, 17, 18, C.glass);
      px(ctx, mx + 8, 89, 3, 7, C.trimDark);
      for (let l = 0; l < 4; l++) {
        const len = 4 + Math.floor((Math.sin(timeSec * 2 + l + m * 2) * 0.5 + 0.5) * 9);
        px(ctx, mx + 3, 73 + l * 4, len, 2, l % 2 === 0 ? C.aqua : C.pink);
      }
    }
    // rack LEDs
    for (let i = 0; i < 4; i++) {
      const on = Math.sin(timeSec * 3.5 + i * 1.9) > 0;
      px(ctx, 815, 69 + i * 11, 3, 3, on ? (i % 2 ? C.kelpLight : C.aqua) : "#1F3A44");
      px(ctx, 821, 69 + i * 11, 3, 3, Math.sin(timeSec * 5 + i) > 0.3 ? C.lamp : "#3A3320");
    }
  }
  // 5d. Сонарна: sonar screen sweep
  {
    const cx = 226;
    const cy = 514;
    pxDisc(ctx, cx, cy, 24, C.deep, 2);
    pxDisc(ctx, cx, cy, 22, "#0A2A3A", 2);
    pxRing(ctx, cx, cy, 15, 13, "#11485A", 2);
    pxRing(ctx, cx, cy, 8, 6, "#11485A", 2);
    const a = timeSec * 1.8;
    for (let r = 2; r < 21; r += 2) {
      for (let k = 0; k < 3; k++) {
        const aa = a - k * 0.18;
        ctx.globalAlpha = 1 - k * 0.3;
        px(ctx, cx + Math.cos(aa) * r, cy + Math.sin(aa) * r, 2, 2, C.kelpLight);
      }
    }
    ctx.globalAlpha = 1;
    // blip
    if (Math.floor(timeSec) % 3 === 0) px(ctx, cx + 9, cy - 7, 3, 3, C.pink);
  }
  // 5e. Шлюз: rotating brass pressure valve
  {
    const cx = 378;
    const cy = 500;
    pxDisc(ctx, cx, cy, 15, C.deep, 2);
    pxDisc(ctx, cx, cy, 13, C.trimDark, 2);
    pxRing(ctx, cx, cy, 11, 8, C.brass, 2);
    const a = timeSec * 1.2;
    for (let k = 0; k < 4; k++) {
      const aa = a + (k * Math.PI) / 2;
      for (let r = 0; r < 9; r += 2) {
        px(ctx, cx + Math.cos(aa) * r - 1, cy + Math.sin(aa) * r - 1, 2, 2, C.brass);
      }
    }
    pxDisc(ctx, cx, cy, 3, C.lamp, 1);
    // pressure gauge
    px(ctx, 400, 486, 16, 16, C.deep);
    px(ctx, 401, 487, 14, 14, "#C9CEDA");
    const ga = -2.4 + (Math.sin(timeSec * 0.7) * 0.5 + 0.5) * 2;
    for (let r = 0; r < 6; r++) px(ctx, 408 + Math.cos(ga) * r - 0.5, 494 + Math.sin(ga) * r - 0.5, 1.5, 1.5, C.rose);
  }
  // 5f. Машинна: boiler glow
  {
    const glow = Math.floor(timeSec * 4) % 2 === 0;
    px(ctx, 660, 500, 28, 22, C.deep);
    px(ctx, 662, 502, 24, 18, glow ? C.fish : "#D9822F");
    px(ctx, 666, 506, 16, 10, glow ? C.lamp : C.fish);
    for (let gx = 662; gx < 686; gx += 4) px(ctx, gx, 502, 2, 18, "rgba(10,12,18,0.55)");
    // steam puffs
    const t = (timeSec * 0.8) % 1;
    ctx.globalAlpha = 1 - t;
    px(ctx, 688 + t * 6, 482 - t * 18, 4, 4, "#C9CEDA");
    px(ctx, 684 - t * 4, 476 - t * 22, 3, 3, "#C9CEDA");
    ctx.globalAlpha = 1;
  }

  // 6. Pipe hatches ("люки") — saboteur shortcuts
  for (const portal of SHIP_PORTALS) {
    const isNear = portal.id === state.nearbyPortalId;
    const bounce = Math.max(0, state.portalPulseTimers[portal.id] ?? 0);
    const activeSab = isNear && state.roleMode === "saboteur";
    const r = 12 + Math.round(bounce * 3);

    if (activeSab) {
      const pr = r + 5 + (blinkOn ? 1 : 0);
      pxRing(ctx, portal.x, portal.y, pr, pr - 2, C.pink, 1);
    }
    pxDisc(ctx, portal.x, portal.y + 2, r + 1, C.deep, 2);
    pxDisc(ctx, portal.x, portal.y, r, C.trim, 2);
    pxDisc(ctx, portal.x, portal.y, r - 3, activeSab ? "#3A1A30" : C.deep, 2);
    const a = timeSec * (activeSab ? 3 : 0.8);
    for (let k = 0; k < 3; k++) {
      const aa = a + (k * Math.PI * 2) / 3;
      for (let rr = 0; rr < r - 4; rr += 2) {
        px(ctx, portal.x + Math.cos(aa) * rr - 1, portal.y + Math.sin(aa) * rr - 1, 2, 2, activeSab ? C.pink : C.brass);
      }
    }
    // bubbles escaping
    const t = (timeSec * 0.7 + portal.x * 0.01) % 1;
    ctx.globalAlpha = 1 - t;
    px(ctx, portal.x - 2, portal.y - r - t * 14, 2, 2, C.glint);
    ctx.globalAlpha = 1;
  }

  // 7. Hub sonar table: hologram of the Bitlynn head
  {
    const { x, y, r } = HUB_TABLE;
    if (state.isNearHubTable) {
      const rr = r + 6 + (blinkOn ? 2 : 0);
      pxRing(ctx, x, y, rr, rr - 2, C.pink, 1);
    }
    // sonar rings on the table screen
    const ringR = ((timeSec * 14) % (r - 6)) + 2;
    ctx.globalAlpha = 1 - ringR / (r - 4);
    pxRing(ctx, x, y, ringR + 2, ringR, C.aqua, 1);
    ctx.globalAlpha = 1;
    // light cone
    ctx.fillStyle = "rgba(246, 165, 192, 0.12)";
    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.lineTo(x + 10, y);
    ctx.lineTo(x + 20, y - 26);
    ctx.lineTo(x - 20, y - 26);
    ctx.closePath();
    ctx.fill();
    const holo = getHoloBitmap();
    if (holo) {
      const hw = AXO_W * 2.4;
      const hh = 9 * 2.4;
      const hover = Math.floor(timeSec * 2) % 2 === 0 ? -1 : 0;
      ctx.globalAlpha = 0.85 + (Math.sin(timeSec * 9) > 0.92 ? -0.4 : 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(holo, x - hw / 2, y - 34 + hover, hw, hh);
      ctx.globalAlpha = 1;
    }
    ctx.font = pixelFont(8, 700);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = C.blush;
    ctx.fillText("РАДА", x, y + 8);
    // terminal LEDs
    px(ctx, 370, 236, 4, 4, blinkOn ? C.kelpLight : C.aqua);
    px(ctx, 378, 236, 12, 2, C.pink);
    px(ctx, 378, 239, 8, 2, C.aqua);
  }

  // 8. Task consoles (pixel terminals)
  for (const room of SHIP_ROOMS) {
    if (!room.taskConsole) continue;
    const { x, y } = room.taskConsole;
    const isSab = room.id === state.sabotagedRoomId;
    const isAssigned = state.assignedTaskIds.includes(room.id);
    const isDone = state.completedTaskIds.includes(room.id);
    const needsAction = isSab || (isAssigned && !isDone);
    const isNear = state.nearbyConsoleRoomId === room.id;

    const stateColor = isSab ? C.rose : isDone ? C.kelpLight : needsAction ? C.lamp : C.trim;

    // Interaction pad on the floor
    if (needsAction) {
      const padW = isNear ? 52 + (blinkOn ? 2 : 0) : 44;
      const padColor = isNear ? C.pink : stateColor;
      const py = y + 16;
      for (let dx = -padW / 2; dx < padW / 2; dx += isNear ? 4 : 6) {
        px(ctx, x + dx, py, isNear ? 4 : 3, 2, padColor);
      }
    }

    // Desk + terminal
    px(ctx, x - 22, y + 8, 44, 6, C.wood);
    px(ctx, x - 22, y + 14, 44, 2, C.woodDark);
    px(ctx, x - 20, y + 16, 3, 4, C.woodDark);
    px(ctx, x + 17, y + 16, 3, 4, C.woodDark);

    px(ctx, x - 17, y - 14, 34, 22, C.deep);
    px(ctx, x - 16, y - 13, 32, 20, stateColor);
    px(ctx, x - 14, y - 11, 28, 15, "#0B1626");
    px(ctx, x - 3, y + 7, 6, 2, C.trimDark);
    // screen content
    const scr = isSab ? C.rose : isDone ? C.kelpLight : C.aqua;
    for (let l = 0; l < 3; l++) {
      const len = isSab
        ? (Math.floor(timeSec * 8 + l) % 2 === 0 ? 22 : 8)
        : 6 + ((Math.floor(timeSec * 2.5) + l * 3) % 4) * 4;
      px(ctx, x - 12, y - 9 + l * 4, len, 2, l === 1 ? C.pink : scr);
    }
    if (!isSab && !isDone && Math.floor(timeSec * 2) % 2 === 0) {
      px(ctx, x + 8, y - 1, 3, 2, C.text); // cursor
    }

    if (needsAction) {
      // Badge floats above the terminal, or beside it when that would cover the room nameplate
      const nearPlate = y - 32 < room.rect.y + 18;
      const bx = nearPlate ? x + 26 : x;
      const by =
        (nearPlate ? y - 14 : y - 32) + (Math.floor(timeSec * 2.6) % 2 === 0 ? 0 : -2);
      const fill = isSab ? C.rose : C.lamp;
      px(ctx, bx - 8, by - 1, 16, 18, C.deep);
      px(ctx, bx - 7, by, 14, 16, fill);
      if (nearPlate) px(ctx, bx - 11, by + 7, 4, 3, C.deep);
      else px(ctx, bx - 2, by + 15, 4, 3, C.deep);
      px(ctx, bx - 1, by + 3, 3, 7, C.plum);
      px(ctx, bx - 1, by + 11, 3, 3, C.plum);
    } else if (isDone) {
      px(ctx, x + 10, y - 22, 14, 14, C.deep);
      px(ctx, x + 11, y - 21, 12, 12, C.kelpLight);
      px(ctx, x + 13, y - 15, 2, 2, C.text);
      px(ctx, x + 15, y - 13, 2, 2, C.text);
      px(ctx, x + 17, y - 15, 2, 2, C.text);
      px(ctx, x + 19, y - 17, 2, 2, C.text);
    }
  }

  // 9. Tap-to-walk beacon: pulsing pixel diamond
  if (state.tapTargetBeacon) {
    const { x, y } = state.tapTargetBeacon;
    const s = 6 + (Math.floor(timeSec * 6) % 3) * 2;
    ctx.fillStyle = C.pink;
    for (let i = 0; i <= s; i += 2) {
      ctx.fillRect(Math.round(x - s + i), Math.round(y - i), 2, 2);
      ctx.fillRect(Math.round(x + s - i), Math.round(y - i), 2, 2);
      ctx.fillRect(Math.round(x - s + i), Math.round(y + i), 2, 2);
      ctx.fillRect(Math.round(x + s - i), Math.round(y + i), 2, 2);
    }
    px(ctx, x - 1, y - 1, 3, 3, C.blush);
  }

  // 10. Particles as square pixels / bubbles
  for (const p of state.particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    const s = Math.max(2, Math.round(p.radius * 1.2));
    px(ctx, p.x - s / 2, p.y - s / 2, s, s, p.color);
  }
  ctx.globalAlpha = 1;

  // 11. Crew (Y-sorted) + pet
  const visibleCrew = state.crew
    .slice(0, state.lobbySize)
    .filter((m) => !m.isExposed)
    .sort((a, b) => a.y - b.y);

  const player = state.crew[0];
  let petDrawn = false;

  for (const m of visibleCrew) {
    if (!petDrawn && state.petPos.y < m.y) {
      drawPet(ctx, state.petPos, state.petPrimaryHex, state.petGillHex, timeSec);
      petDrawn = true;
    }

    const isMe = m.id === "p1";
    const labelText = isMe
      ? "ТИ"
      : state.privacyScope === "interschool-anon"
      ? m.anonHandle.split(" ")[0]
      : m.name.split(" ")[0];

    const pulse = fx?.hitPulse[m.id] ?? 0;
    if (pulse > 0.01) {
      // springy squash & stretch anchored at the feet
      const w = Math.sin((1 - pulse) * Math.PI * 3) * pulse;
      ctx.save();
      ctx.translate(m.x, m.y + 12);
      ctx.scale(1 + w * 0.22, 1 - w * 0.22);
      ctx.translate(-m.x, -(m.y + 12));
    }
    drawCrewSprite(ctx, m, {
      color: isMe ? state.playerCrewColor : m.avatarColor,
      label: labelText,
      labelColor: isMe
        ? C.blush
        : state.roleMode === "saboteur" && m.isSaboteur
        ? C.pink
        : C.text,
      isMe,
      showSaboteurMark: state.roleMode === "saboteur" && m.isSaboteur,
      timeSec,
    });
    if (pulse > 0.01) ctx.restore();
  }

  if (!petDrawn) {
    drawPet(ctx, state.petPos, state.petPrimaryHex, state.petGillHex, timeSec);
  }

  // 11b. Shock-rings (task done, freeze, hatch, alarm, council...)
  if (fx) {
    for (const ring of fx.rings) {
      const prog = 1 - ring.life / ring.maxLife;
      const ease = 1 - (1 - prog) * (1 - prog);
      const r = Math.max(4, Math.round((6 + ease * ring.maxR) / 2) * 2);
      ctx.globalAlpha = Math.max(0, 1 - prog) * 0.9;
      pxRing(ctx, ring.x, ring.y, r, r - (prog < 0.5 ? 4 : 2), ring.color, 2);
      if (prog < 0.6) {
        ctx.globalAlpha = Math.max(0, 0.6 - prog) * 0.6;
        pxRing(ctx, ring.x, ring.y, Math.max(4, r - 10), Math.max(2, r - 12), C.text, 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  // 12. Deep-water vignette around the player in follow mode
  if (player && state.cameraMode === "follow") {
    const sightR = state.roleMode === "saboteur" ? 230 : 185;
    const fog = ctx.createRadialGradient(
      player.x,
      player.y,
      sightR * 0.5,
      player.x,
      player.y,
      sightR * 1.45
    );
    fog.addColorStop(0, "rgba(10, 34, 56, 0)");
    fog.addColorStop(0.6, "rgba(6, 14, 26, 0.0)");
    fog.addColorStop(1, "rgba(5, 8, 14, 0.5)");
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  // 13. Objective arrow (pixel chevron)
  if (player && state.objectiveArrowAngle !== null && state.nextObjective) {
    ctx.save();
    ctx.translate(Math.round(player.x), Math.round(player.y - 4));
    ctx.rotate((state.objectiveArrowAngle * Math.PI) / 180);
    const col = state.nextObjective.color;
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = C.deep;
      ctx.fillRect(34 + i * 2 - 1, -8 + i * 2 - 1, 4, 4);
      ctx.fillRect(34 + i * 2 - 1, 6 - i * 2 - 1, 4, 4);
    }
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = col;
      ctx.fillRect(34 + i * 2, -8 + i * 2, 2, 2);
      ctx.fillRect(34 + i * 2, 6 - i * 2, 2, 2);
    }
    ctx.restore();
  }

  // 14. Reward popups (pixel coin + Pixelify text)
  for (const pop of state.popups) {
    const progress = 1 - pop.life / pop.maxLife;
    const py = Math.round(pop.y - progress * 28);
    const alpha = pop.life < 0.25 ? pop.life / 0.25 : 1;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.font = pixelFont(11, 700);
    const text = pop.text.trim();
    const withCoin = pop.coin !== false;
    const tw = ctx.measureText(text).width + (withCoin ? 24 : 12);
    // little pop-in overshoot for the first 0.15s
    const born = pop.maxLife - pop.life;
    const sc = born < 0.15 ? 0.6 + (born / 0.15) * 0.55 : born < 0.25 ? 1.15 - ((born - 0.15) / 0.1) * 0.15 : 1;
    ctx.translate(pop.x, py);
    ctx.scale(sc, sc);
    ctx.translate(-pop.x, -py);
    px(ctx, pop.x - tw / 2 - 2, py - 12, tw + 4, 22, C.deep);
    px(ctx, pop.x - tw / 2, py - 10, tw, 18, C.ink);
    px(ctx, pop.x - tw / 2, py + 6, tw, 2, pop.color);
    if (withCoin) drawCoin(ctx, pop.x - tw / 2 + 4, py - 6);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = pop.color;
    ctx.fillText(text, pop.x - tw / 2 + (withCoin ? 18 : 6), py - 1);
    ctx.restore();
  }

  ctx.restore(); // world transform

  // 15. Screen-space juice: alarm frame + event flash
  if (fx) {
    if (fx.alarm) {
      const speed = fx.alarmUrgent ? 9 : 4.5;
      const pulse = 0.5 + 0.5 * Math.sin(timeSec * speed);
      const t = 4 + Math.round(pulse * 2) * 2;
      ctx.globalAlpha = 0.35 + pulse * 0.45;
      px(ctx, 0, 0, cssW, t, C.rose);
      px(ctx, 0, cssH - t, cssW, t, C.rose);
      px(ctx, 0, 0, t, cssH, C.rose);
      px(ctx, cssW - t, 0, t, cssH, C.rose);
      // hazard ticks along the top & bottom edges
      ctx.globalAlpha = 0.25 + pulse * 0.35;
      const off = Math.floor(timeSec * 40) % 24;
      for (let x = -24 + off; x < cssW; x += 24) {
        px(ctx, x, t, 12, 4, C.lamp);
        px(ctx, x, cssH - t - 4, 12, 4, C.lamp);
      }
      ctx.globalAlpha = (fx.alarmUrgent ? 0.1 : 0.05) * pulse;
      px(ctx, 0, 0, cssW, cssH, C.rose);
      ctx.globalAlpha = 1;
    }
    if (fx.flashAlpha > 0.01) {
      ctx.globalAlpha = Math.min(0.8, fx.flashAlpha);
      px(ctx, 0, 0, cssW, cssH, fx.flashColor);
      ctx.globalAlpha = 1;
    }
  }

  ctx.restore(); // dpr scale
}
