import { COLORI, type IdColore, type IdLocomotiva } from "../preferenze.ts";
import { ricolora } from "./palette.ts";
import { canvasDa } from "./immagini.ts";

/**
 * Fotogrammi del foglio: le ruote fanno un giro in 8 passi. Carrozzeria generata, ruote e bielle disegnate da
 * strumenti/pulisci-immagini.py, che ne fissa le misure.
 */
export const FOTOGRAMMA_LOCOMOTIVA = { larghezza: 64, altezza: 40, numero: 8 };

/** Raggio delle ruote motrici in px. WARNING: copia di LOCOMOTIVE in strumenti/pulisci-immagini.py, che lo
 * disegna nello sprite: chi ne cambia uno cambia l'altro, o le ruote slittano sul terreno. */
const RAGGIO_RUOTE: Record<IdLocomotiva, number> = { vapore: 7, diesel: 4, elettrica: 3 };

/** px percorsi per fotogramma: le ruote rotolano senza strisciare, un giro per circonferenza. */
export const pxPerFotogramma = (tipo: IdLocomotiva): number =>
  (2 * Math.PI * RAGGIO_RUOTE[tipo]) / FOTOGRAMMA_LOCOMOTIVA.numero;

/** Righe dal primo pixel visibile al fondo del primo fotogramma: quanto è alta la sagoma disegnata. */
export const altezzaSagoma = (tipo: IdLocomotiva): number => {
  const { larghezza, altezza } = FOTOGRAMMA_LOCOMOTIVA;
  const alfa = canvasDa(`locomotive/${tipo}`).getContext("2d")!.getImageData(0, 0, larghezza, altezza).data;
  for (let y = 0; y < altezza; y++) {
    for (let x = 0; x < larghezza; x++) if (alfa[(y * larghezza + x) * 4 + 3]! > 0) return altezza - y;
  }
  // Una sagoma vuota darebbe una hitbox alta zero: la locomotiva non urterebbe più niente, senza errori.
  throw new Error(`Sagoma vuota: locomotive/${tipo}`);
};

// Unico punto da cui partita, menu e fine partita prendono il foglio della locomotiva colorata.
const colorati = new Map<string, HTMLCanvasElement>();

const colorata = (nome: `locomotive/${IdLocomotiva}`, colore: IdColore) => {
  const chiave = `${nome}:${colore}`;
  let canvas = colorati.get(chiave);
  if (!canvas) {
    canvas = ricolora(canvasDa(nome), COLORI[colore]);
    colorati.set(chiave, canvas);
  }
  return canvas;
};


/** Foglio di 8 fotogrammi (FOTOGRAMMA_LOCOMOTIVA) con la carrozzeria nel colore scelto. Non va modificato. */
export const foglioLocomotiva = (tipo: IdLocomotiva, colore: IdColore): HTMLCanvasElement =>
  colorata(`locomotive/${tipo}`, colore);
