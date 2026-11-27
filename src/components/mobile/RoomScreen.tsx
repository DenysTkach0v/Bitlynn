"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useReducedMotion } from "framer-motion";
import { C, RANKS, fmt, rankIndexFor } from "@/components/arcade/tokens";
import { useArcadeStore } from "@/components/arcade/useArcadeStore";
import { FONT_MONO, FONT_PIXEL, LockIcon } from "@/components/arcade/ui";
import { sfx, haptic } from "@/components/arcade/arcadeAudio";
import { Art, At, BitsChip, Cta } from "./kit";
import { ITEM_NAMES } from "./ShopProfileScreens";
import { OFFSTAGE, ROOM_MOTION as M } from "./roomMotion";
import { useRoomWalker, wait } from "./useRoomWalker";
import { useSitScene } from "./useSitScene";
import { BED, FLOOR_Y, SIT_SCENE } from "./sitScene";
import { Sleeper } from "./Sleeper";
import { Ambience } from "./Ambience";
import { IdleActor, useIdle } from "./IdleActor";
import { HERO_PAL } from "./idleConfig";
import { loop } from "./loop";
import { PixelChair } from "./PixelChair";
import { HERO_THEMES } from "@/components/arcade/tokens";

export interface RoomInfo {
  id: number;
  name: string;
  items: string[];
  opens: string;
  hero: { x: number; y: number };
}

/** Чотири кімнати з канвасу: ранг відкриває кімнату й нові ігри. */
export const ROOMS: RoomInfo[] = [
  { id: 1, name: "Капсула", items: ["Старий ноутбук", "Матрац", "Ілюмінатор"], opens: "Змійка, Лови", hero: { x: 78, y: 277 } }, // y 277 = on the floor (see sitScene.ts)
  { id: 2, name: "Студія", items: ["Робочий ПК", "Рибка", "Книжкова полиця"], opens: "Підводний лабіринт", hero: { x: 120, y: 277 } },
  { id: 3, name: "Dev-лофт", items: ["Два монітори", "Міні-сервер", "Краб"], opens: "Доставка, сервер", hero: { x: 210, y: 277 } },
  { id: 4, name: "Купол", items: ["Дата-центр", "Голо-стіл", "Медуза"], opens: "Фабрика, дата-центр", hero: { x: 156, y: 277 } },
];

export function RoomScreen({
  onSit,
  onShop,
}: {
  onSit: () => void;
  onShop: (tab: number) => void;
}) {
  const reducedPref = useReducedMotion();
  const reduce = M.respectReducedMotion && !!reducedPref;
  const xp = useArcadeStore((s) => s.xp);
  const hero = useArcadeStore((s) => s.hero);
  const ownedItems = useArcadeStore((s) => s.ownedItems);
  const myRoom = rankIndexFor(xp); // 0..3
  const [view, setView] = useState(myRoom);
  /** while the camera pans, both rooms sit side by side on one strip */
  const [pair, setPair] = useState<{ from: number; to: number; dir: 1 | -1 } | null>(null);
  /** which room the hero is standing in (null = he is off-screen) */
  const [heroRoom, setHeroRoom] = useState<number | null>(myRoom);
  const busy = useRef(false);
  const touch = useRef<number | null>(null);
  const walker = useRoomWalker(ROOMS[myRoom].hero.x);
  const scene = useSitScene(walker);
  const [sceneOn, setSceneOn] = useState(false);
  const [travelling, setTravelling] = useState(false);
  // idle moves only while he simply stands in the room he is shown in
  const idle = useIdle(heroRoom !== null && heroRoom === view && !scene.inBed && !sceneOn && !travelling && !pair);

  // he starts the day asleep in bed (only in a room that has one)
  useEffect(() => {
    if (!reduce) scene.sleepIn(myRoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const room = ROOMS[view];
  const locked = view > myRoom;
  const rank = RANKS[view];
  const next = RANKS[view + 1];
  const nextRoom = ROOMS[view + 1];
  // room items + what the child bought in the shop (one line: extra ones fold into «+N»)
  const bought = view === myRoom ? ownedItems.map((id) => ITEM_NAMES[id]).filter((n) => n && !room.items.includes(n) && n !== "Старий ноутбук" && n !== "Матрац") : [];
  const allChips = [...bought, ...room.items];
  const chips = allChips.length > 3 ? [...allChips.slice(0, 2), `+${allChips.length - 2} ще`] : allChips;
  const pct = next ? Math.max(0, Math.min(100, ((xp - rank.xp) / (next.xp - rank.xp)) * 100)) : 100;

  /**
   * Room → room: walk out → camera pans → walk in.
   * All timings live in roomMotion.ts.
   */
  const go = async (d: number) => {
    const n = view + d;
    if (n < 0 || n >= ROOMS.length || busy.current) return;
    const step = d as 1 | -1;
    const heroHere = view <= myRoom;
    const heroThere = n <= myRoom;

    if (reduce) {
      setView(n);
      setHeroRoom(heroThere ? n : null);
      walker.heroX.set(ROOMS[n].hero.x);
      return;
    }

    busy.current = true;
    setTravelling(true);
    haptic(6);
    await scene.wake();

    // 1 · walk to the edge; the camera starts a bit before he gets there
    if (heroHere) {
      walker.startSteps(step);
      walker.walkTo(step > 0 ? OFFSTAGE.right : OFFSTAGE.left, M.walkOutMs, M.easeWalkOut);
      await wait(M.walkOutMs * M.panOverlap);
    }

    // 2 · camera pan to the next room
    setPair({ from: view, to: n, dir: step });
    if (M.panSound) sfx("swish");
    walker.artX.set(0);
    await new Promise<void>((resolve) =>
      animate(walker.artX, -step * 390, { duration: M.panMs / 1000, ease: M.easePan, onComplete: resolve })
    );
    setView(n);
    setPair(null);
    walker.artX.set(0);

    // 3 · walk in from the opposite side (not into a locked room)
    if (heroThere) {
      setHeroRoom(n);
      walker.heroX.set(step > 0 ? OFFSTAGE.left : OFFSTAGE.right);
      walker.startSteps(step);
      await walker.walkTo(ROOMS[n].hero.x, M.walkInMs, M.easeWalkIn);
    } else {
      setHeroRoom(null);
    }
    walker.stopSteps();
    busy.current = false;
    setTravelling(false);
  };

  /** «Сісти за комп’ютер»: the cartoon from sitScene.ts, then the desk view. Tap skips it. */
  const sit = async () => {
    if (locked || busy.current) return;
    busy.current = true;
    haptic(8);
    if (!reduce) {
      setSceneOn(true);
      await scene.play(view);
    }
    finishSit();
  };
  const sitDone = useRef(false);
  const finishSit = () => {
    if (sitDone.current) return;
    sitDone.current = true;
    onSit();
  };

  const renderRoom = (i: number) => {
    const r = ROOMS[i];
    const isLocked = i > myRoom;
    const rk = RANKS[i];
    return (
      <>
        <Art name={`room${r.id}`} style={{ filter: isLocked ? "grayscale(0.7) brightness(0.45)" : undefined }} />
        <Ambience room={i} still={isLocked} />
        {isLocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "rgba(14,15,19,.8)", border: `1px solid ${C.line}` }}>
              <LockIcon size={20} />
            </span>
            <b className="text-[15px]">Відкривається на ранзі {rk.label}</b>
            <span className="text-[13px]" style={{ color: C.muted, fontFamily: FONT_MONO }}>
              {fmt(rk.xp)} XP · у тебе {fmt(xp)}
            </span>
          </div>
        )}
      </>
    );
  };

  return (
    <div
      className="absolute inset-0"
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touch.current = null;
      }}
    >
      {/* top: rank + bits */}
      <At x={12} r={12} y={12} h={48} className="flex items-center justify-between">
        <span
          className="flex h-10 items-center rounded-[10px] px-3 text-[17px] font-bold"
          style={{ fontFamily: FONT_PIXEL, background: "var(--acc-soft)", border: "1px solid var(--acc)", color: "var(--acc-ring)" }}
        >
          {RANKS[myRoom].label}
        </span>
        <BitsChip />
      </At>

      {/* room art (camera strip) + hero layer */}
      <div className="absolute left-0 top-[64px] h-[330px] w-[390px] overflow-hidden">
        <motion.div className="absolute inset-0" style={{ x: walker.artX }}>
          <div className="absolute inset-0">{renderRoom(pair ? pair.from : view)}</div>
          {pair && (
            <div className="absolute top-0 h-full w-full" style={{ left: pair.dir * 390 }}>
              {renderRoom(pair.to)}
            </div>
          )}
        </motion.div>

        {/* asleep: body under the blanket, head on the pillow */}
        {heroRoom !== null && scene.inBed && BED[heroRoom] && (
          <Sleeper bed={BED[heroRoom]!} accent={HERO_THEMES[hero].acc} eyes={scene.eyes} blanketOff={scene.blanketOff} />
        )}

        {/* back view after the swivel: drawn behind the chair, so the chair back hides his body */}
        {heroRoom !== null && scene.back && (
          <motion.div aria-hidden="true" className="absolute left-0 top-0" style={{ x: scene.back.x, y: scene.back.y, scaleX: scene.swivel, opacity: walker.fade }}>
            <Art name={`heroDesk_${hero}`} />
          </motion.div>
        )}

        {/* the chair from the pocket */}
        {heroRoom !== null && scene.chairOn && (
          <motion.div
            aria-hidden="true"
            className="absolute left-0"
            style={{
              top: FLOOR_Y, // the chair is anchored at the floor and draws upwards
              x: scene.chair.x,
              y: scene.chair.y,
              scale: scene.chair.scale,
              rotate: scene.chair.rotate,
              transformOrigin: "50% -28px",
            }}
          >
            <motion.div style={{ scaleY: scene.chair.squash, scaleX: scene.swivel, transformOrigin: "50% 0" }}>
              <PixelChair accent={HERO_THEMES[hero].acc} lift={scene.chair.lift} lever={scene.chair.lever} />
            </motion.div>
          </motion.div>
        )}

        {heroRoom !== null && (
          <motion.button
            type="button"
            aria-label="Твій аксолотль — торкнись"
            className="absolute left-0 outline-none"
            style={{ top: ROOMS[heroRoom].hero.y - 64, x: walker.heroX, y: walker.bob, rotate: walker.lean, opacity: walker.fade }}
            onClick={() => {
              if (busy.current) return;
              if (scene.asleep) {
                scene.wake();
                return;
              }
              sfx("pearl");
              walker.hop();
            }}
          >
            <motion.span
              className="block"
              style={{ y: scene.layY, scaleY: scene.squash, scaleX: scene.swivel, originX: 0.5, originY: 1, opacity: scene.inBed || scene.back ? 0 : 1 }}
            >
              <span className="block" style={{ transform: `scaleX(${walker.facing})`, transition: "transform 80ms" }}>
                <IdleActor move={idle.move} palette={HERO_PAL[hero]} onDone={idle.done}>
                  <Art name={`hero${ROOMS[heroRoom].id}_${hero}`} />
                </IdleActor>
              </span>
            </motion.span>
            {/* Z z while asleep, «!» on waking */}
            <AnimatePresence>
              {scene.asleep && (
                <motion.span
                  key="zzz"
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-5 left-10 text-[13px] font-bold"
                  style={{ fontFamily: FONT_PIXEL, color: "#B9B8FF" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: loop([0, 1, 1, 0]), y: [6, -4, -12, -18], x: [0, 4, 8, 12] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: SIT_SCENE.zzzEveryMs / 1000, repeat: Infinity }}
                >
                  Z<span className="text-[10px]">z</span>
                </motion.span>
              )}
              {scene.alert && (
                <motion.span
                  key="alert"
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-7 left-5 flex h-6 w-6 items-center justify-center rounded-md text-[15px] font-bold"
                  style={{ fontFamily: FONT_PIXEL, background: "#ECEEF4", color: "#0E0F13" }}
                  initial={{ scale: 0, y: 6 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 600, damping: 18 }}
                >
                  !
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        )}

        {/* tap anywhere skips the cartoon */}
        {sceneOn && SIT_SCENE.skipOnTap && (
          <button
            type="button"
            aria-label="Пропустити анімацію"
            className="absolute inset-0 z-10 cursor-pointer outline-none"
            onClick={() => {
              scene.skip();
              finishSit();
            }}
          />
        )}
      </div>

      {view > 0 && (
        <button
          type="button"
          aria-label="Попередня кімната"
          onClick={() => go(-1)}
          className="arc-icon absolute left-2 top-[205px] flex h-12 w-12 items-center justify-center rounded-full border outline-none"
          style={{ borderColor: C.line, background: "rgba(14,15,19,0.78)", color: C.text }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}
      {view < ROOMS.length - 1 && (
        <button
          type="button"
          aria-label="Наступна кімната"
          onClick={() => go(1)}
          className="arc-icon absolute right-2 top-[205px] flex h-12 w-12 items-center justify-center rounded-full border outline-none"
          style={{ borderColor: C.line, background: "rgba(14,15,19,0.78)", color: C.text }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}

      {/* dots */}
      <At x={0} r={0} y={404} className="flex justify-center gap-1.5">
        {ROOMS.map((r, i) => (
          <motion.span
            key={r.id}
            className="h-2 rounded-full"
            animate={{ width: i === view ? 22 : 8 }}
            style={{ background: i === view ? "var(--acc)" : "#3A3D4C" }}
          />
        ))}
      </At>

      <At x={20} r={20} y={420} className="flex items-baseline justify-between">
        <h2 className="m-0 text-[26px] font-bold">{room.name}</h2>
        <span className="text-[13px]" style={{ fontFamily: FONT_MONO, color: C.muted }}>
          кімната {room.id} з 4{view === myRoom ? " · ти тут" : ""}
        </span>
      </At>

      <At x={20} r={20} y={460} className="flex flex-wrap gap-2">
        {chips.map((it) => (
          <span key={it} className="rounded-lg border px-2.5 py-[5px] text-[13px]" style={{ background: C.card, borderColor: C.line, opacity: locked ? 0.6 : 1 }}>
            {it}
          </span>
        ))}
      </At>

      <At x={20} r={20} y={498} className="flex flex-col gap-2 rounded-xl border px-3.5 py-2.5 leading-[18px]" style={{ background: C.card, borderColor: C.line }}>
        <div className="flex justify-between gap-2 text-[14px]">
          <span style={{ color: C.muted }}>Відкриває</span>
          <b>{room.opens}</b>
        </div>
        <div className="h-px" style={{ background: C.line }} />
        {next && nextRoom ? (
          <>
            <div className="flex justify-between gap-2 text-[14px]">
              <span>
                <b>Далі: {nextRoom.name}</b> <span style={{ color: C.muted }}>· ранг {next.label}</span>
              </span>
              <span className="text-[13px]" style={{ fontFamily: FONT_MONO, color: "var(--acc-ring)" }}>
                {xp >= next.xp ? "відкрито" : `ще ${fmt(next.xp - xp)} XP`}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full" style={{ background: C.line }}>
              <motion.div className="h-full" style={{ background: "var(--acc)" }} initial={false} animate={{ width: `${view < myRoom ? 100 : locked ? 0 : pct}%` }} />
            </div>
          </>
        ) : (
          <div className="flex justify-between gap-2 text-[14px]">
            <b>Усі кімнати відкриті</b>
            <span style={{ color: C.muted }}>Далі — титул «Легенда».</span>
          </div>
        )}
      </At>

      <At x={20} r={20} y={594} className="grid grid-cols-2 gap-3">
        {["Улюбленці", "Декор"].map((t, i) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              sfx("tap");
              onShop(i === 0 ? 1 : 2);
            }}
            className="arc-secondary h-12 rounded-xl border text-[15px] font-semibold outline-none"
            style={{ borderColor: C.line, background: "transparent", color: C.text }}
          >
            {t}
          </button>
        ))}
      </At>

      <Cta onClick={sit} disabled={locked}>
        {locked ? "Кімната ще закрита" : "Сісти за комп’ютер"}
      </Cta>
      <span className="absolute left-0 right-0 top-[744px] text-center text-[12px]" style={{ color: C.muted }}>
        свайп ← → по кімнатах
      </span>
    </div>
  );
}
