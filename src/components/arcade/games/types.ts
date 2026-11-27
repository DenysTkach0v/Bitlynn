import type { StepResult } from "../useArcadeStore";

export interface GameProps {
  /** pause sheet or question sheet is open */
  paused: boolean;
  /** hero colour — the snake / the player wear it */
  accent: string;
  stepsDone: number;
  stepsLeft: number;
  /** question-based games: ask the next sheet question */
  onAsk: () => void;
  /** self-checking games (Лови): report a finished step */
  onStep: (r: StepResult) => void;
}
