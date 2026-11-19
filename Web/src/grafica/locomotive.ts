import { COLORI, type IdColore, type IdLocomotiva } from "../preferenze.ts";
import { ricolora } from "./palette.ts";
import { canvasDa } from "./immagini.ts";

/**
 * Fotogrammi del foglio: le ruote fanno un giro in 8 passi. Carrozzeria generata, ruote e bielle disegnate da
 * strumenti/pulisci-immagini.py, che ne fissa le misure.
 */
export const FOTOGRAMMA_LOCOMOTIVA = { larghezza: 64, altezza: 40, numero: 8 };

// Unico punto da cui partita, menu e fine partita prendono il foglio della locomotiva colorata.
const colorati = new Map<string, HTMLCanvasElement>();

/** Foglio di 8 fotogrammi (FOTOGRAMMA_LOCOMOTIVA) con la carrozzeria nel colore scelto. Non va modificato. */
export const foglioLocomotiva = (tipo: IdLocomotiva, colore: IdColore): HTMLCanvasElement => {
  const chiave = `${tipo}:${colore}`;
  let foglio = colorati.get(chiave);
  if (!foglio) {
    foglio = ricolora(canvasDa(`locomotive/${tipo}`), COLORI[colore]);
    colorati.set(chiave, foglio);
  }
  return foglio;
};
