import type Interval from "../primitives/Interval.ts";

const randomBetween = (min: number, max: number) => {
  if (min === max) return min;
  if (min > max) [min, max] = [max, min];
  return min + Math.random() * (max - min);
};

export default {
  randomBetween,

  randomBetweenInterval: (interval: Interval) => randomBetween(interval.min, interval.max),

  headOrTail: () => Math.random() > 0.5,

  toRadians: (degrees: number) => (degrees * Math.PI) / 180,

  lerp: (start: number, end: number, t: number): number => start + t * (end - start),

  /**
   * Fattore di lerp indipendente dal frame rate: `lerp(a, b, damp(k, dt))` converge alla stessa velocità
   * a 60 e a 120 Hz, mentre un `lerp(a, b, 0.1)` per frame va al doppio sugli schermi a 120 Hz.
   * @param sharpness quanto in fretta si avvicina (1/s)
   * @param dtSeconds tempo del frame in secondi
   */
  damp: (sharpness: number, dtSeconds: number) => 1 - Math.exp(-sharpness * dtSeconds),

  clamp: (n: number, min: number, max: number) => Math.max(min, Math.min(max, n)),

  clamp01: (n: number) => Math.max(0, Math.min(1, n)),

  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),

  easeInCubic: (t: number) => t * t * t,

  /** Oscillazione fra min e max: per fluttuare, pulsare, respirare. */
  sinBetween: (x: number, min: number, max: number): number =>
    min + ((Math.sin(x) + 1) / 2) * (max - min),
};
