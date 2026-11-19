import type Interval from "../primitives/Interval.ts";
import type { TipoOstacolo } from "./ostacoli.ts";

// Tutto il bilanciamento: la logica non contiene numeri di gioco. Valori di partenza della ROADMAP, da
// calibrare in fase 5 giocando; ogni cambio va riletto da validaConfigurazione, che gira all'avvio.

export type IdLivello = "facile" | "medio" | "difficile";

export type Urto =
  // Facile: l'ostacolo vola via, il treno frena e riprende; la partita non si interrompe.
  | { effetto: "sbalzo"; fattoreVelocita: number; recuperoSecondi: number }
  | { effetto: "gameOver" };

export interface Livello {
  durataSecondi: number;
  /** Secondi prima della fine in cui il generatore smette: l'ultimo ostacolo deve uscire prima della stazione. */
  chiusuraSecondi: number;
  velocita: {
    /** px/s */
    iniziale: number;
    massima: number;
    /** Frazione della durata a cui si raggiunge la massima; la stessa curva fa stringere le distanze. */
    quotaDurataAlMassimo: number;
  };
  salto: {
    durataSecondi: number;
    /** px sopra il binario */
    altezza: number;
    /** Una pressione arrivata in volo fa saltare all'atterraggio, se è più recente di così. */
    pressioneRicordataSecondi: number;
  };
  hitboxLocomotiva: { larghezza: number; altezza: number };
  ostacoliPerSequenza: Interval;
  /** In secondi di percorrenza: con la velocità che sale la giocabilità regge da sola. */
  distanzaFraOstacoliSecondi: { inizio: number; fine: number };
  /** Schermo vuoto fra l'uscita dell'ultimo ostacolo di una sequenza e la nascita del primo della successiva. */
  pausaFraSequenzeSecondi: number;
  tipi: { tipo: TipoOstacolo; peso: number }[];
  /** Lo stesso tipo non compare in due sequenze di fila. */
  nonRipetereTipo: boolean;
  /** Il prossimo ostacolo nasce solo dopo che il precedente è uscito dallo schermo (validaConfigurazione). */
  unoAllaVolta: boolean;
  urto: Urto;
  /** Soglie di validaConfigurazione. */
  verifica: {
    /** Tempo minimo in cui una pressione supera l'ostacolo, alla velocità più bassa. */
    finestraMinimaSecondi: number;
    /** Tempo minimo fra la comparsa di un ostacolo a destra e l'arrivo alla locomotiva, alla velocità massima. */
    anticipoMinimoSecondi: number;
  };
}

export const COMUNE = {
  /** Centro della locomotiva: davanti restano circa 400 px di vista. */
  locomotivaX: 80,
  /** Tempo a terra fra un atterraggio e il salto successivo, in validaConfigurazione. */
  recuperoDopoSaltoSecondi: 0.15,
  /** 1/s: quanto in fretta la locomotiva frena verso il marciapiede (Numbers.damp). */
  frenataInStazione: 1.6,
  /** Sotto questa distanza dal punto d'arrivo la locomotiva è ferma. */
  tolleranzaArrivoPx: 0.5,
  attesaDopoArrivoSecondi: 1.4,
  attesaDopoSchiantoSecondi: 1,
  /** Primo ostacolo: lo schermo resta vuoto quanto fra due sequenze, più questo. */
  attesaInizialeSecondi: 1,
  /** px/s e px/s² dell'ostacolo sbalzato via nel facile. */
  sbalzo: { velocitaX: 140, velocitaY: -260, gravita: 700, rotazione: 9 },
};

export const LIVELLI: Record<IdLivello, Livello> = {
  facile: {
    durataSecondi: 40,
    chiusuraSecondi: 6,
    velocita: { iniziale: 110, massima: 140, quotaDurataAlMassimo: 0.8 },
    salto: { durataSecondi: 1.3, altezza: 80, pressioneRicordataSecondi: 0.25 },
    hitboxLocomotiva: { larghezza: 40, altezza: 28 },
    ostacoliPerSequenza: { min: 1, max: 3 },
    // Un ostacolo alla volta: 4,8 s × 110 px/s = 528 px e 3,8 s × 140 px/s = 532 px, oltre schermo + ostacolo (520 px).
    distanzaFraOstacoliSecondi: { inizio: 4.8, fine: 3.8 },
    pausaFraSequenzeSecondi: 3,
    tipi: [
      { tipo: "legna", peso: 1 },
      { tipo: "fieno", peso: 1 },
      { tipo: "staccionata", peso: 1 },
    ],
    nonRipetereTipo: true,
    unoAllaVolta: true,
    urto: { effetto: "sbalzo", fattoreVelocita: 0.4, recuperoSecondi: 2 },
    verifica: { finestraMinimaSecondi: 0.35, anticipoMinimoSecondi: 2.5 },
  },
  medio: {
    durataSecondi: 60,
    chiusuraSecondi: 4,
    velocita: { iniziale: 200, massima: 300, quotaDurataAlMassimo: 0.8 },
    salto: { durataSecondi: 0.8, altezza: 64, pressioneRicordataSecondi: 0.12 },
    hitboxLocomotiva: { larghezza: 48, altezza: 32 },
    ostacoliPerSequenza: { min: 2, max: 5 },
    distanzaFraOstacoliSecondi: { inizio: 2, fine: 1.2 },
    pausaFraSequenzeSecondi: 2,
    tipi: [
      { tipo: "cassa", peso: 1 },
      { tipo: "carrello", peso: 1 },
      { tipo: "sbarra", peso: 1 },
      { tipo: "segnale", peso: 1 },
    ],
    nonRipetereTipo: true,
    unoAllaVolta: false,
    urto: { effetto: "gameOver" },
    verifica: { finestraMinimaSecondi: 0.2, anticipoMinimoSecondi: 1.2 },
  },
  difficile: {
    durataSecondi: 80,
    chiusuraSecondi: 3.5,
    velocita: { iniziale: 260, massima: 380, quotaDurataAlMassimo: 0.8 },
    salto: { durataSecondi: 0.7, altezza: 64, pressioneRicordataSecondi: 0.08 },
    hitboxLocomotiva: { larghezza: 48, altezza: 32 },
    ostacoliPerSequenza: { min: 3, max: 6 },
    // 0,9 s supera di poco 0,7 s di salto + recupero: il primo valore da provare in calibrazione.
    distanzaFraOstacoliSecondi: { inizio: 1.4, fine: 0.9 },
    pausaFraSequenzeSecondi: 1.5,
    tipi: [
      { tipo: "pallet", peso: 1 },
      { tipo: "barili", peso: 1 },
      { tipo: "container", peso: 1 },
      { tipo: "trave", peso: 0.7 },
    ],
    nonRipetereTipo: true,
    unoAllaVolta: false,
    urto: { effetto: "gameOver" },
    verifica: { finestraMinimaSecondi: 0.12, anticipoMinimoSecondi: 1 },
  },
};
