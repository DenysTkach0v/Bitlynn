/**
 * framer-motion skips a keyframe animation whose last frame equals the value
 * the element already has (e.g. 0 → 24 → 0). Nudging the last frame by a
 * hair keeps such «there and back» loops running.
 */
export function loop(frames: number[]): number[] {
  const out = [...frames];
  out[out.length - 1] += 0.001;
  return out;
}
