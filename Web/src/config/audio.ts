import type Interval from "../primitives/Interval.ts";
import type { IdLocomotiva } from "../preferenze.ts";
import type { SoundName } from "../services/SoundManager.ts";
import type { IdLivello } from "./livelli.ts";

// Quale suono per quale locomotiva e scenario, e come la marcia segue la velocità. I volumi stanno nel
// registro di SoundManager.

export const SUONI_LOCOMOTIVA: Record<IdLocomotiva, { marcia: SoundName; fischi: SoundName[] }> = {
  // Il primo fischio è quello di partenza e d'arrivo; durante la corsa se ne sceglie uno a caso.
  vapore: { marcia: "marcia-vapore", fischi: ["fischio-vapore", "fischio-vapore-corto"] },
  diesel: { marcia: "marcia-diesel", fischi: ["fischio-diesel"] },
  elettrica: { marcia: "marcia-elettrica", fischi: ["fischio-elettrica"] },
};

export const MUSICA_SCENARIO: Record<IdLivello, SoundName> = {
  facile: "musica-campagna",
  medio: "musica-cittadina",
  difficile: "musica-porto",
};

export const AUDIO = {
  marcia: {
    /** px/s a cui la registrazione suona com'è; la velocità più bassa di partenza dei livelli. */
    velocitaRiferimento: 110,
    /** Aumento della velocità di riproduzione per px/s in più: a 380 px/s (massima del difficile) fa 1,25. */
    pendenza: 0.4 / 270,
    /** Limiti della velocità di riproduzione: oltre, il motore suona finto. */
    riproduzione: { min: 0.6, max: 1.25 },
    /** Sotto questa velocità (px/s) la marcia sfuma verso il silenzio, fino al treno fermo. */
    velocitaSilenzio: 60,
    dissolvenzaArrestoMs: 400,
  },
  /** Fischi durante la corsa, in secondi fra uno e il successivo. */
  intervalloFischi: { min: 10, max: 18 } satisfies Interval,
  dissolvenzaMusicaSchiantoMs: 800,
};
