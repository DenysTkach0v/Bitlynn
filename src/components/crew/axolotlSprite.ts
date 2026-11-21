/**
 * Bitlynn axolotl-programmer pixel sprite (16×22), taken pixel-for-pixel from the
 * "Головний герой" concept: head from the Bitlynn icon (16×9) + human body (16×13).
 *
 * Legend:
 *   G gill · S skin · H highlight · C cheek · E eye/mouth
 *   B hoodie · b hoodie shade · T hoodie strings · P pants · W shoes · . empty
 *
 * Shared by the Canvas2D world renderer and the SVG avatars (voting cards, splash).
 */
export const AXO_W = 16;
export const AXO_H = 22;

export const AXO_HEAD_ROWS = 9;

const BASE: string[] = [
  "GG............GG",
  ".G............G.",
  "..G.SHHSSSSS.G..",
  "GGGSSSSSSSSSSGGG",
  "GGGSSESSSSESSGGG",
  "...SSSSSSSSSS...",
  "..GSCSEEEESCSG..",
  ".G.SSSSSSSSSS.G.",
  "GG..SSSSSSSS..GG",
  "....BBBBBBBB....",
  "...BBBTBBTBBB...",
  "..BBBBTBBTBBBB..",
  "..BbBBBBBBBBbB..",
  "..BbBBBBBBBBbB..",
  "..BbBBbbbbBBbB..",
  "..BbBBbbbbBBbB..",
  "..SS.BBBBBB.SS..",
  "....PPPPPPPP....",
  "....PPP..PPP....",
  "....PPP..PPP....",
  "....PPP..PPP....",
  "...WWWW..WWWW...",
];

export type AxoFrame = "idle" | "stepA" | "stepB";
export type AxoEyes = "normal" | "blink" | "sly" | "x";

/** The 16×9 Bitlynn icon head on its own (pet, hub hologram). */
export function getHeadGrid(): string[][] {
  return BASE.slice(0, AXO_HEAD_ROWS).map((r) => r.split(""));
}

/** Returns the 16×22 char grid for a walk frame + eye state + gaze. */
export function getAxoGrid(
  frame: AxoFrame,
  eyes: AxoEyes,
  gaze: -1 | 0 | 1 = 0
): string[][] {
  const g = BASE.map((r) => r.split(""));


  // Eyes (row 4: cols 5 and 10)
  if (eyes === "blink") {
    g[4][5] = "S";
    g[4][10] = "S";
    g[5][5] = "E";
    g[5][10] = "E";
  } else if (eyes === "sly") {
    // glowing narrowed saboteur eyes
    g[4][5] = "Y";
    g[4][10] = "Y";
    g[4][4] = "Y";
    g[4][11] = "Y";
  } else if (eyes === "x") {
    g[3][4] = "R";
    g[3][6] = "R";
    g[4][5] = "R";
    g[5][4] = "R";
    g[5][6] = "R";
    g[3][9] = "R";
    g[3][11] = "R";
    g[4][10] = "R";
    g[5][9] = "R";
    g[5][11] = "R";
  }

  // Gaze: slide eyes, mouth and cheeks one pixel toward the walking direction
  if (gaze !== 0 && eyes !== "x") {
    for (const row of [3, 4, 5, 6]) {
      const inner = g[row].slice(4, 12);
      const shifted =
        gaze > 0 ? ["S", ...inner.slice(0, 7)] : [...inner.slice(1), "S"];
      for (let i = 0; i < 8; i++) g[row][4 + i] = shifted[i];
    }
  }

  if (frame === "idle") return g;

  // Walk cycle: one leg lifts by a pixel, the opposite hand swings up.
  const lift = (cols: number[]) => {
    for (const c of cols) {
      // the shoe moves up one pixel: the leg reads as bent mid-stride
      g[20][c] = g[21][c] === "W" ? "W" : g[20][c];
      g[21][c] = ".";
    }
  };

  // Opposite arm swings: its sleeve reaches one pixel lower.
  if (frame === "stepA") {
    lift([3, 4, 5, 6]);
    g[16][12] = "b";
    g[16][13] = "B";
    g[17][12] = "S";
    g[17][13] = "S";
  } else {
    lift([9, 10, 11, 12]);
    g[16][2] = "B";
    g[16][3] = "b";
    g[17][2] = "S";
    g[17][3] = "S";
  }
  return g;
}

export function shadeHex(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean.slice(0, 6);
  const num = parseInt(full, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(((num >> 16) & 0xff) + amount);
  const g = clamp(((num >> 8) & 0xff) + amount);
  const b = clamp((num & 0xff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export interface AxoPalette {
  [key: string]: string;
}

/** Fixed axolotl head palette from the icon; hoodie colour = crew colour. */
export function buildAxoPalette(hoodie: string, frozen = false): AxoPalette {
  const p: AxoPalette = {
    G: "#E0457B",
    S: "#F6A5C0",
    H: "#FFD3E2",
    C: "#EC7FA3",
    E: "#2A1B2E",
    B: hoodie,
    b: shadeHex(hoodie, -34),
    T: shadeHex(hoodie, 80),
    P: "#1C2233",
    W: "#EDEFF5",
    Y: "#FFD36B",
    R: "#E0457B",
  };
  if (frozen) {
    for (const k of Object.keys(p)) {
      p[k] = mixHex(p[k], "#9ED8FF", 0.55);
    }
  }
  return p;
}

export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.replace("#", "").slice(0, 6), 16);
  const pb = parseInt(b.replace("#", "").slice(0, 6), 16);
  const ch = (n: number, s: number) => (n >> s) & 0xff;
  const m = (s: number) =>
    Math.round(ch(pa, s) * (1 - t) + ch(pb, s) * t);
  return `#${((m(16) << 16) | (m(8) << 8) | m(0)).toString(16).padStart(6, "0")}`;
}

/** Run-length rows → rects, so SVG / canvas draw few shapes per sprite. */
export function gridToRects(
  grid: string[][],
  palette: AxoPalette
): { x: number; y: number; w: number; fill: string }[] {
  const out: { x: number; y: number; w: number; fill: string }[] = [];
  for (let y = 0; y < grid.length; y++) {
    let x = 0;
    while (x < grid[y].length) {
      const ch = grid[y][x];
      if (ch === ".") {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < grid[y].length && grid[y][x + w] === ch) w++;
      const fill = palette[ch];
      if (fill) out.push({ x, y, w, fill });
      x += w;
    }
  }
  return out;
}

/**
 * Mini "Lynn" pet = the Bitlynn icon head only (16×9), tinted by the equipped skin.
 */
export function buildPetRects(primaryHex: string, gillHex: string) {
  const grid = BASE.slice(0, AXO_HEAD_ROWS).map((r) => r.split(""));
  const palette: AxoPalette = {
    G: gillHex,
    S: mixHex(primaryHex, "#FFFFFF", 0.35),
    H: mixHex(primaryHex, "#FFFFFF", 0.75),
    C: shadeHex(primaryHex, -30),
    E: "#2A1B2E",
  };
  return gridToRects(grid, palette);
}
