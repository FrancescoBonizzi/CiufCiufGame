import { COLORI, type IdColore, type IdLocomotiva } from "../preferenze.ts";
import { ricolora } from "./palette.ts";
import { disegnaLocomotiva } from "./segnaposto.ts";

// Unico punto da cui partita, menu e fine partita prendono il foglio della locomotiva colorata: con gli
// sprite veri (fase 6) cambia solo la sorgente qui.
const sorgenti = new Map<IdLocomotiva, HTMLCanvasElement>();
const colorati = new Map<string, HTMLCanvasElement>();

/** Foglio di 4 fotogrammi (FOTOGRAMMA_LOCOMOTIVA) con la carrozzeria nel colore scelto. Non va modificato. */
export const foglioLocomotiva = (tipo: IdLocomotiva, colore: IdColore): HTMLCanvasElement => {
  const chiave = `${tipo}:${colore}`;
  let foglio = colorati.get(chiave);
  if (!foglio) {
    let sorgente = sorgenti.get(tipo);
    if (!sorgente) {
      sorgente = disegnaLocomotiva(tipo);
      sorgenti.set(tipo, sorgente);
    }
    foglio = ricolora(sorgente, COLORI[colore]);
    colorati.set(chiave, foglio);
  }
  return foglio;
};
