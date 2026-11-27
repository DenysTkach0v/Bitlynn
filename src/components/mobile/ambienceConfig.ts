/**
 * ─────────────────────────────────────────────────────────────────────────
 *  AMBIENCE — живий фон кімнат: бульбашки у вікнах і світло лампи.
 *  Усі числа редагуються тут. Координати — пікселі картинки кімнати 390×330
 *  (виміряні з піксель-арту, масштаб ×3).
 * ─────────────────────────────────────────────────────────────────────────
 */

export type WindowShape =
  | { shape: "circle"; cx: number; cy: number; r: number }
  | { shape: "rect"; x: number; y: number; w: number; h: number };

export interface RoomAmbience {
  /** вікна з водою, де піднімаються бульбашки */
  windows: WindowShape[];
  /** скільки бульбашок у кожному вікні */
  bubbles: number;
  /** лампи: центр світла, радіус ореолу, колір */
  lamps: { x: number; y: number; r: number; color: string }[];
}

export const AMBIENCE: RoomAmbience[] = [
  // 1 · Капсула — круглий ілюмінатор і лампа під стелею
  {
    windows: [{ shape: "circle", cx: 216, cy: 108, r: 33 }],
    bubbles: 7,
    lamps: [{ x: 103, y: 62, r: 46, color: "#FFD36B" }],
  },
  // 2 · Студія — ілюмінатор праворуч угорі
  {
    windows: [{ shape: "circle", cx: 330, cy: 99, r: 38 }],
    bubbles: 7,
    lamps: [],
  },
  // 3 · Dev-лофт — велике прямокутне вікно ліворуч
  {
    windows: [{ shape: "rect", x: 24, y: 54, w: 108, h: 114 }],
    bubbles: 10,
    lamps: [],
  },
  // 4 · Купол — скляний купол над кімнатою
  {
    windows: [{ shape: "rect", x: 0, y: 18, w: 390, h: 150 }],
    bubbles: 16,
    lamps: [],
  },
];

export const BUBBLES = {
  /** розмір бульбашки — кратний 3, щоб лягати в піксельну сітку */
  sizes: [3, 3, 6, 6, 9],
  /** скільки секунд бульбашка піднімається через усе вікно */
  riseSecMin: 3.2,
  riseSecMax: 6.5,
  /** наскільки вона хитається вбік (px) */
  wobblePx: 6,
  opacity: 0.55,
  color: "#C6F6FF",
};

export const LAMP_GLOW = {
  /** світло лампи «дихає»: мінімальна й максимальна яскравість */
  min: 0.22,
  max: 0.4,
  periodSec: 3.6,
};
