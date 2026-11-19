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
const RAGGIO_RUOTE: Record<IdLocomotiva, number> = { vapore: 7, diesel: 5, elettrica: 4 };

/** px percorsi per fotogramma: le ruote rotolano senza strisciare, un giro per circonferenza. */
export const pxPerFotogramma = (tipo: IdLocomotiva): number =>
  (2 * Math.PI * RAGGIO_RUOTE[tipo]) / FOTOGRAMMA_LOCOMOTIVA.numero;

// Unico punto da cui partita, menu e fine partita prendono il foglio della locomotiva colorata.
const colorati = new Map<string, HTMLCanvasElement>();

const colorata = (nome: `locomotive/${IdLocomotiva}` | `locomotive/${IdLocomotiva}-mini`, colore: IdColore) => {
  const chiave = `${nome}:${colore}`;
  let canvas = colorati.get(chiave);
  if (!canvas) {
    canvas = ricolora(canvasDa(nome), COLORI[colore]);
    colorati.set(chiave, canvas);
  }
  return canvas;
};

/** La locomotiva 32×20 della barra del percorso, col colore scelto: disegnata a quella misura, non rimpicciolita. */
export const miniaturaLocomotiva = (tipo: IdLocomotiva, colore: IdColore): HTMLCanvasElement =>
  colorata(`locomotive/${tipo}-mini`, colore);

/** Foglio di 8 fotogrammi (FOTOGRAMMA_LOCOMOTIVA) con la carrozzeria nel colore scelto. Non va modificato. */
export const foglioLocomotiva = (tipo: IdLocomotiva, colore: IdColore): HTMLCanvasElement =>
  colorata(`locomotive/${tipo}`, colore);
