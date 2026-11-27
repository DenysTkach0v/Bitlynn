import { GAMES, GameId, RANKS, rankIndexFor } from "@/components/arcade/tokens";
import { useArcadeStore } from "@/components/arcade/useArcadeStore";

export type { GameId };

/** «Гра дня»: одна з відкритих рангом ігор, однакова протягом дня. */
export function gameOfTheDayFallback(): GameId {
  const xp = useArcadeStore.getState().xp;
  const open = GAMES.filter((g) => g.ready && rankIndexFor(xp) >= RANKS.findIndex((r) => r.id === g.unlockRank));
  const d = new Date();
  const seed = d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate();
  return open[seed % open.length]?.id ?? "snake";
}
