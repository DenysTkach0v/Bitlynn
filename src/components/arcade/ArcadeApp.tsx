"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { setSoundEnabled } from "@/lib/feedback";
import { C, GameId } from "./tokens";
import { useArcadeStore } from "./useArcadeStore";
import { themeVars } from "./ui";
import { ArcadeHub, gameOfTheDay } from "./ArcadeHub";
import { GameSession } from "./GameSession";
import { RulesScreen, WaveScreen } from "./InfoScreens";

type Route = { name: "hub" } | { name: "game"; game: GameId; key: number } | { name: "wave" } | { name: "rules" };

/**
 * Bitlynn Аркади 4.0 — full-screen, phone-shaped app (390×844 reference).
 * On a wide screen it sits in a centred phone column so every ergonomics
 * rule (thumb zones, 64 px bottom buffer, centred actions) still holds.
 */
export function ArcadeApp({ onExit }: { onExit: () => void }) {
  const reduce = useReducedMotion();
  const hero = useArcadeStore((s) => s.hero);
  const soundOn = useArcadeStore((s) => s.soundOn);
  const xp = useArcadeStore((s) => s.xp);
  const [route, setRoute] = useState<Route>({ name: "hub" });

  useEffect(() => setSoundEnabled(soundOn), [soundOn]);

  // lock page scroll behind the overlay
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const openGame = (game: GameId) => setRoute({ name: "game", game, key: Date.now() });
  const routeKey = route.name === "game" ? `game-${route.key}` : route.name;

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch justify-center sm:items-center" style={{ background: "#08090C" }}>
      <div
        className="arcade-root relative h-full w-full overflow-hidden sm:h-[min(100dvh_-_32px,880px)] sm:max-w-[420px] sm:rounded-[36px] sm:outline sm:outline-[6px] sm:outline-[#1E1F27]"
        style={{ ...themeVars(hero), background: C.bg, color: C.text }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={routeKey}
            className="absolute inset-0"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            {route.name === "hub" && (
              <ArcadeHub
                onExit={onExit}
                onOpenGame={openGame}
                onOpenWave={() => setRoute({ name: "wave" })}
                onOpenRules={() => setRoute({ name: "rules" })}
              />
            )}
            {route.name === "game" && <GameSession game={route.game} onExit={() => setRoute({ name: "hub" })} />}
            {route.name === "wave" && (
              <WaveScreen onBack={() => setRoute({ name: "hub" })} onPlay={openGame} dailyGame={gameOfTheDay(xp)} />
            )}
            {route.name === "rules" && <RulesScreen onBack={() => setRoute({ name: "hub" })} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
