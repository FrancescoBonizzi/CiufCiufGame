import type Interval from "../primitives/Interval.ts";
import type { IdLocomotiva } from "../preferenze.ts";
import type { SoundName } from "../services/SoundManager.ts";
import { LIVELLI, type IdLivello } from "./livelli.ts";

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

const livelli = Object.values(LIVELLI);

export const AUDIO = {
  marcia: {
    /**
     * px/s fra cui la marcia va da com'è registrata a riproduzione.max: dalla partenza più lenta alla
     * velocità massima più alta dei livelli, letti dalla loro configurazione.
     */
    velocita: {
      min: Math.min(...livelli.map((l) => l.velocita.iniziale)),
      max: Math.max(...livelli.map((l) => l.velocita.massima)),
    } satisfies Interval,
    /** Limiti della velocità di riproduzione: oltre, il motore suona finto. Sotto la partenza si rallenta ancora. */
    riproduzione: { min: 0.6, max: 1.25 },
    /** Sotto questa velocità (px/s) la marcia sfuma verso il silenzio, fino al treno fermo. */
    velocitaSilenzio: 60,
    dissolvenzaArrestoMs: 400,
  },
  /** Fischi durante la corsa, in secondi fra uno e il successivo. */
  intervalloFischi: { min: 10, max: 18 } satisfies Interval,
  dissolvenzaMusicaSchiantoMs: 800,
};
