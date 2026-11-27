"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "framer-motion";
import { ROOM_MOTION } from "./roomMotion";
import { GameId, gameOfTheDayFallback } from "./route";
import { useArcadeStore } from "@/components/arcade/useArcadeStore";
import { themeVars } from "@/components/arcade/ui";
import { GameSession } from "@/components/arcade/GameSession";
import { RulesScreen, WaveScreen } from "@/components/arcade/InfoScreens";
import { Stage } from "./kit";
import { RoomScreen } from "./RoomScreen";
import { DeskScreen } from "./DeskScreen";
import { BitOSScreen } from "./BitOSScreen";
import { ArcadeScreen, LearnScreen } from "./LearnArcadeScreens";
import { ProfileScreen, ShopScreen } from "./ShopProfileScreens";
import { DevPanel, useDevMode, useSecretTaps } from "./DevPanel";

type Route =
  | { name: "room" }
  | { name: "desk" }
  | { name: "pc" }
  | { name: "learn" }
  | { name: "arcade" }
  | { name: "shop"; tab: number; from: "room" | "pc" }
  | { name: "profile" }
  | { name: "wave" }
  | { name: "rules" }
  | { name: "game"; game: GameId; key: number };

/** How each move feels: going deeper zooms in, coming back zooms out, side moves slide. */
const DEPTH: Record<Route["name"], number> = { room: 0, desk: 1, pc: 2, learn: 3, arcade: 3, shop: 3, profile: 3, wave: 3, rules: 4, game: 4 };

/**
 * Bitlynn mobile demo (canvas «Мобільна версія 4.0»):
 * лобі-кімната → сісти за комп’ютер → BitOS → обрати режим навчання → Аркади → гра → результат → кімната.
 */
export function MobileApp() {
  const reduce = useReducedMotion();
  const hero = useArcadeStore((s) => s.hero);
  const [route, setRoute] = useState<Route>({ name: "room" });
  const [prevDepth, setPrevDepth] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);
  const dev = useDevMode();
  const rankTap = useSecretTaps(() => dev.set(!dev.on));

  const go = (r: Route) => {
    setPrevDepth(DEPTH[route.name]);
    setRoute(r);
  };
  const deeper = DEPTH[route.name] >= prevDepth;
  const key = route.name === "game" ? `game-${route.key}` : route.name;
  const play = (game: GameId) => go({ name: "game", game, key: Date.now() });

  if (!hydrated) return <Stage style={themeVars(hero)}>{null}</Stage>;

  return (
    // «Зменшити рух» на пристрої: поважаємо лише якщо так задано в roomMotion.ts
    <MotionConfig reducedMotion={ROOM_MOTION.respectReducedMotion ? "user" : "never"}>
    <Stage style={themeVars(hero)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={key}
          className="absolute inset-0"
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: deeper ? 0.96 : 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: deeper ? 1.04 : 0.96 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          {route.name === "room" && <RoomScreen onSit={() => go({ name: "desk" })} onShop={(tab) => go({ name: "shop", tab, from: "room" })} onRankTap={rankTap} />}
          {route.name === "desk" && <DeskScreen onBack={() => go({ name: "room" })} onBooted={() => go({ name: "pc" })} />}
          {route.name === "pc" && (
            <BitOSScreen
              onOff={() => go({ name: "desk" })}
              onOpen={(app) => (app === "shop" ? go({ name: "shop", tab: 0, from: "pc" }) : go({ name: app }))}
            />
          )}
          {route.name === "learn" && <LearnScreen onBack={() => go({ name: "pc" })} onPlay={() => go({ name: "arcade" })} />}
          {route.name === "arcade" && <ArcadeScreen onBack={() => go({ name: "pc" })} onPlay={play} onLearn={() => go({ name: "learn" })} />}
          {route.name === "shop" && <ShopScreen initialTab={route.tab} onBack={() => go({ name: route.from })} />}
          {route.name === "profile" && (
            <ProfileScreen onBack={() => go({ name: "pc" })} onRules={() => go({ name: "rules" })} onWave={() => go({ name: "wave" })} />
          )}
          {route.name === "wave" && <WaveScreen onBack={() => go({ name: "pc" })} onPlay={play} dailyGame={gameOfTheDayFallback()} />}
          {route.name === "rules" && <RulesScreen onBack={() => go({ name: "profile" })} />}
          {route.name === "game" && <GameSession game={route.game} onExit={() => go({ name: "arcade" })} onRoom={() => go({ name: "room" })} />}
        </motion.div>
      </AnimatePresence>
      {dev.on && <DevPanel onClose={() => dev.set(false)} />}
    </Stage>
    </MotionConfig>
  );
}
