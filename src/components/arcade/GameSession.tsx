"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { GameId, HERO_THEMES, gameById, plural } from "./tokens";
import { DIRECTIONS, Question, bankFor, idOf, materialize, shuffleQuestion, sourceById } from "./questions";
import { SessionSummary, StepResult, daysBetween, dateKey, dueReviews, useArcadeStore } from "./useArcadeStore";
import { QuietHud, Sheet } from "./ui";
import { QuestionSheetBody } from "./QuestionSheet";
import { PauseSheetBody } from "./PauseSheet";
import { StartScreen } from "./StartScreen";
import { ResultScreen } from "./ResultScreen";
import { SnakeGame } from "./games/SnakeGame";
import { MazeGame } from "./games/MazeGame";
import { CatchGame } from "./games/CatchGame";
import type { GameProps } from "./games/types";
import { sfx } from "./arcadeAudio";

interface Prepared {
  q: Question;
  reviewDaysAgo: number | null;
}

const MAX_REVIEWS_PER_ROUND = 2;

/** Mistakes come back first (up to 2 a round), the rest are fresh questions. */
function prepareQuestions(count: number): Prepared[] {
  const bank = bankFor(useArcadeStore.getState().direction);
  const bankIds = new Set(bank.map(idOf));
  const { reviews } = useArcadeStore.getState();
  const today = dateKey();
  const due = dueReviews(reviews, today)
    .filter((r) => bankIds.has(r.id))
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, MAX_REVIEWS_PER_ROUND);

  const out: Prepared[] = [];
  for (const r of due) {
    const src = sourceById(r.id);
    if (src) out.push({ q: shuffleQuestion(materialize(src)), reviewDaysAgo: daysBetween(r.lastSeen, today) });
  }
  const used = new Set(out.map((p) => p.q.id));
  const fresh = bank.filter((s) => !used.has(idOf(s))).sort(() => Math.random() - 0.5);
  for (const s of fresh) {
    if (out.length >= count) break;
    out.push({ q: shuffleQuestion(materialize(s)), reviewDaysAgo: null });
  }
  // spread reviews out instead of front-loading them
  return out.sort(() => Math.random() - 0.5);
}

const GAME_COMPONENTS: Partial<Record<GameId, React.ComponentType<GameProps>>> = {
  snake: SnakeGame,
  maze: MazeGame,
  catch: CatchGame,
};

type Phase = "start" | "play" | "result";

export function GameSession({ game, onExit, onRoom }: { game: GameId; onExit: () => void; onRoom?: () => void }) {
  const reduce = useReducedMotion();
  const baseMeta = gameById(game);
  const hero = useArcadeStore((s) => s.hero);
  const reviews = useArcadeStore((s) => s.reviews);
  const direction = useArcadeStore((s) => s.direction);
  // the learning mode picked on the PC decides the questions (and the tag shown)
  const meta =
    game === "snake" || game === "maze"
      ? { ...baseMeta, tag: DIRECTIONS.find((d) => d.id === direction)?.tag ?? baseMeta.tag }
      : baseMeta;
  const finishSession = useArcadeStore((s) => s.finishSession);
  const accent = HERO_THEMES[hero].acc;

  const [phase, setPhase] = useState<Phase>("start");
  const [sheet, setSheet] = useState<null | "question" | "pause">(null);
  const [steps, setSteps] = useState<StepResult[]>([]);
  const [questions, setQuestions] = useState<Prepared[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [runId, setRunId] = useState(0);
  const stepsRef = useRef<StepResult[]>([]);

  const questionGame = game === "snake" || game === "maze";
  const total = meta.steps;
  const dueCount = questionGame
    ? dueReviews(reviews).filter((r) => new Set(bankFor(direction).map(idOf)).has(r.id)).length
    : 0;

  const begin = useCallback(() => {
    stepsRef.current = [];
    setSteps([]);
    setSummary(null);
    setSheet(null);
    if (game === "snake" || game === "maze") setQuestions(prepareQuestions(total));
    setRunId((n) => n + 1);
    setPhase("play");
  }, [game, total]);

  const complete = useCallback(
    (all: StepResult[]) => {
      setSheet(null);
      setSummary(finishSession(game, all));
      setPhase("result");
    },
    [finishSession, game]
  );

  const pushStep = useCallback(
    (r: StepResult) => {
      // a double tap on «Далі» while the sheet slides away must not count twice
      if (stepsRef.current.length >= total) return;
      const all = [...stepsRef.current, r];
      stepsRef.current = all;
      setSteps(all);
      if (all.length >= total) complete(all);
      else setSheet(null);
    },
    [complete, total]
  );

  const ask = useCallback(() => {
    sfx("sheet");
    setSheet("question");
  }, []);

  // pause when the tab is hidden; Escape opens pause
  useEffect(() => {
    if (phase !== "play") return;
    const vis = () => {
      if (document.hidden) setSheet((s) => s ?? "pause");
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheet((s) => (s === "pause" ? null : s ?? "pause"));
    };
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("keydown", key);
    };
  }, [phase]);

  const Game = GAME_COMPONENTS[game];
  const current = questions[steps.length];
  const label = `${meta.stepForms[0][0].toUpperCase()}${meta.stepForms[0].slice(1)} ${Math.min(steps.length + 1, total)} з ${total}`;

  return (
    <div className="relative h-full">
      <AnimatePresence mode="wait" initial={false}>
        {phase === "start" && (
          <motion.div key="start" className="absolute inset-0" initial={reduce ? false : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.18 }}>
            <StartScreen meta={meta} accent={accent} reviewsDue={dueCount} onBack={onExit} onPlay={begin} />
          </motion.div>
        )}

        {phase === "play" && Game && (
          <motion.div key={`play-${runId}`} className="absolute inset-0 flex flex-col" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
            <QuietHud total={total} done={steps.length} label={label} onPause={() => setSheet("pause")} />
            <Game
              paused={sheet !== null}
              accent={accent}
              stepsDone={steps.length}
              stepsLeft={total - steps.length}
              onAsk={ask}
              onStep={pushStep}
            />
            {/* нижній буфер 64 px: тут лежать пальці, тут нічого немає */}
            <div aria-hidden="true" className="shrink-0" style={{ height: "calc(64px + env(safe-area-inset-bottom))" }} />
          </motion.div>
        )}

        {phase === "result" && summary && (
          <motion.div key="result" className="absolute inset-0" initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
            <ResultScreen meta={meta} summary={summary} accent={accent} onAgain={begin} onRoom={onRoom ?? onExit} />
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={phase === "play" && sheet === "question" && !!current} label="Питання">
        {current && (
          <QuestionSheetBody
            key={`${runId}-${steps.length}`}
            question={current.q}
            index={steps.length}
            total={total}
            reviewDaysAgo={current.reviewDaysAgo}
            onDone={({ firstTry }) =>
              pushStep({
                firstTry,
                questionId: current.q.id,
                questionText: current.q.text,
                code: current.q.code,
                answerText: current.q.options[current.q.correct],
                wasReview: current.reviewDaysAgo !== null,
              })
            }
          />
        )}
      </Sheet>

      <Sheet open={phase === "play" && sheet === "pause"} label="Пауза" onBackdrop={() => setSheet(null)}>
        <PauseSheetBody
          progressLabel={`${steps.length} / ${total} ${plural(total, ...meta.stepForms)} пройдено`}
          onResume={() => setSheet(null)}
          onRestart={() => {
            if (stepsRef.current.length > 0) finishSession(game, stepsRef.current, { partial: true });
            begin();
          }}
          onQuit={onExit}
        />
      </Sheet>
    </div>
  );
}

