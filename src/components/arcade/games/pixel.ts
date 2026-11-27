/**
 * Pixel helpers for the game fields. One rule from the 4.0 game sheet:
 * every field is a single pixel grid with an integer scale, three tones lit
 * from the top-left, and a coloured (not black) outline.
 */
import { mixHex, shadeHex } from "../axolotlSprite";

type Dir = "up" | "down" | "left" | "right";
const DV: Record<Dir, { x: number; y: number }> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

export const FIELD = {
  water: "#0B1D22",
  waterAlt: "#0D2228",
  wall: "#1E3C45",
  wallLight: "#2E5A66",
  wallDark: "#101820",
  wallEdge: "#4E8A96",
  cube: "#E0A030",
  cubeLight: "#FFC857",
  cubeDark: "#A86E1C",
  cubeEdge: "#4A3010",
  pearl: "#C6F6FF",
  pearlShade: "#6FE3FF",
  jelly: "#7C7BFF",
  jellyLight: "#B9B8FF",
  jellyDark: "#4A49B8",
};

/** Three tones + outline for any accent (hero colour). */
export function tones(acc: string) {
  return {
    light: mixHex(acc, "#FFFFFF", 0.35),
    base: acc,
    dark: shadeHex(acc, -55),
    edge: mixHex(shadeHex(acc, -110), "#0B1D22", 0.3),
  };
}

/** p = one art pixel in screen px. cell = 5 art pixels. */
export function drawBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  t: { light: string; base: string; dark: string; edge: string },
  p: number
) {
  ctx.fillStyle = t.edge;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = t.dark;
  ctx.fillRect(x + p, y + p, size - 2 * p, size - 2 * p);
  ctx.fillStyle = t.base;
  ctx.fillRect(x + p, y + p, size - 3 * p, size - 3 * p);
  ctx.fillStyle = t.light;
  ctx.fillRect(x + p, y + p, size - 3 * p, p);
  ctx.fillRect(x + p, y + p, p, size - 3 * p);
}

export function drawCube(ctx: CanvasRenderingContext2D, cx: number, cy: number, cell: number) {
  const p = Math.max(1, Math.floor(cell / 5));
  const size = p * 5;
  const x = Math.round(cx + (cell - size) / 2);
  const y = Math.round(cy + (cell - size) / 2);
  drawBlock(ctx, x, y, size, { light: FIELD.cubeLight, base: FIELD.cube, dark: FIELD.cubeDark, edge: FIELD.cubeEdge }, p);
  // tiny «?» glint — two pixels, readable at any scale
  ctx.fillStyle = FIELD.cubeEdge;
  ctx.fillRect(x + 2 * p, y + 2 * p, p, p);
}

export function drawPearl(ctx: CanvasRenderingContext2D, cx: number, cy: number, cell: number, small = false) {
  const p = Math.max(1, Math.floor(cell / 5));
  if (small) {
    ctx.fillStyle = FIELD.pearlShade;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(Math.round(cx + cell / 2 - p / 2), Math.round(cy + cell / 2 - p / 2), p, p);
    ctx.globalAlpha = 1;
    return;
  }
  const x = Math.round(cx + cell / 2 - p);
  const y = Math.round(cy + cell / 2 - p);
  ctx.fillStyle = FIELD.pearlShade;
  ctx.fillRect(x, y, 2 * p, 2 * p);
  ctx.fillStyle = FIELD.pearl;
  ctx.fillRect(x, y, p, p);
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  c: string;
  s: number;
}

export function burst(list: Particle[], x: number, y: number, colors: string[], n: number, size: number) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
    const sp = 40 + Math.random() * 70;
    list.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0,
      max: 0.35 + Math.random() * 0.2,
      c: colors[i % colors.length],
      s: size,
    });
  }
}

export function stepParticles(ctx: CanvasRenderingContext2D, list: Particle[], dt: number) {
  for (let i = list.length - 1; i >= 0; i--) {
    const q = list[i];
    q.life += dt;
    if (q.life >= q.max) {
      list.splice(i, 1);
      continue;
    }
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.vx *= 0.9;
    q.vy *= 0.9;
    ctx.globalAlpha = 1 - q.life / q.max;
    ctx.fillStyle = q.c;
    ctx.fillRect(Math.round(q.x), Math.round(q.y), q.s, q.s);
  }
  ctx.globalAlpha = 1;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Axolotl head block: hero colour, pink gills, eyes looking where it swims. */
export function drawHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cell: number,
  p: number,
  tn: ReturnType<typeof tones>,
  dir: Dir,
  gulp: number
) {
  const grow = Math.round(gulp * p);
  const X = Math.round(x) - grow;
  const Y = Math.round(y) - grow;
  const S = cell + grow * 2;
  drawBlock(ctx, X, Y, S, tn, p);
  // axolotl gills on the sides of the head
  ctx.fillStyle = "#E0457B";
  const side = dir === "left" || dir === "right";
  if (side) {
    ctx.fillRect(X + p, Y - p, p, p);
    ctx.fillRect(X + S - 2 * p, Y - p, p, p);
    ctx.fillRect(X + p, Y + S, p, p);
    ctx.fillRect(X + S - 2 * p, Y + S, p, p);
  } else {
    ctx.fillRect(X - p, Y + p, p, p);
    ctx.fillRect(X - p, Y + S - 2 * p, p, p);
    ctx.fillRect(X + S, Y + p, p, p);
    ctx.fillRect(X + S, Y + S - 2 * p, p, p);
  }
  // eyes look where we go
  ctx.fillStyle = "#1A0B12";
  const e = p;
  const v = DV[dir];
  const cx = X + S / 2 + v.x * p;
  const cy = Y + S / 2 + v.y * p;
  if (side) {
    ctx.fillRect(Math.round(cx - e / 2), Math.round(Y + p * 1.2), e, e);
    ctx.fillRect(Math.round(cx - e / 2), Math.round(Y + S - p * 2.2), e, e);
  } else {
    ctx.fillRect(Math.round(X + p * 1.2), Math.round(cy - e / 2), e, e);
    ctx.fillRect(Math.round(X + S - p * 2.2), Math.round(cy - e / 2), e, e);
  }
}
