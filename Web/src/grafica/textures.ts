import { Rectangle, Texture } from "pixi.js";
import type { IdLivello } from "../config/livelli.ts";
import type { TipoOstacolo } from "../config/ostacoli.ts";
import type { IdColore, IdLocomotiva } from "../preferenze.ts";
import { canvasDa } from "./immagini.ts";
import { FOTOGRAMMA_LOCOMOTIVA, foglioLocomotiva } from "./locomotive.ts";
import { disegnaCavo } from "./cavo.ts";

// Le texture si creano una volta e restano per le partite successive, come quelle nella cache di Assets:
// ogni partita nuova crea solo le Sprite. Va chiamato dopo aver impostato lo scaleMode "nearest".
const cache = new Map<string, Texture>();

const daCanvas = (chiave: string, crea: () => HTMLCanvasElement): Texture => {
  let texture = cache.get(chiave);
  if (!texture) {
    texture = Texture.from(crea());
    cache.set(chiave, texture);
  }
  return texture;
};

const fotogrammi = (foglio: Texture, larghezza: number, altezza: number, numero: number): Texture[] =>
  Array.from(
    { length: numero },
    (_, i) => new Texture({ source: foglio.source, frame: new Rectangle(i * larghezza, 0, larghezza, altezza) }),
  );

const cacheFotogrammi = new Map<string, Texture[]>();

export const texturesLocomotiva = (tipo: IdLocomotiva, colore: IdColore): Texture[] => {
  const chiave = `locomotiva:${tipo}:${colore}`;
  let frames = cacheFotogrammi.get(chiave);
  if (!frames) {
    const foglio = daCanvas(chiave, () => foglioLocomotiva(tipo, colore));
    const { larghezza, altezza, numero } = FOTOGRAMMA_LOCOMOTIVA;
    frames = fotogrammi(foglio, larghezza, altezza, numero);
    cacheFotogrammi.set(chiave, frames);
  }
  return frames;
};

export const textureOstacolo = (tipo: TipoOstacolo, indice: number): Texture =>
  daCanvas(`ostacolo:${tipo}:${indice}`, () => canvasDa(`ostacoli/${tipo}-${indice}`));

export const textureCavo = () => daCanvas("cavo", disegnaCavo);
// Il cielo è fermo e largo quanto lo schermo; strati e binario si ripetono in orizzontale (TilingSprite).
export const textureCielo = (livello: IdLivello) => daCanvas(`cielo:${livello}`, () => canvasDa(`scenari/${livello}-cielo`));
export const textureStrato = (livello: IdLivello, quale: "lontano" | "vicino") =>
  daCanvas(`strato:${livello}:${quale}`, () => canvasDa(`scenari/${livello}-${quale}`));
/** La cima delle rotaie è la riga 0, dove poggiano le ruote. */
export const textureBinario = (livello: IdLivello) =>
  daCanvas(`binario:${livello}`, () => canvasDa(`scenari/${livello}-binario`));
export const textureStazione = () => daCanvas("stazione", () => canvasDa("stazione"));
export const textureEffetto = (nome: "fumo" | "scarico" | "scintilla") =>
  daCanvas(`effetto:${nome}`, () => canvasDa(`effetti/${nome}`));
export const textureIconaStazione = () => daCanvas("icona-stazione", () => canvasDa("icona-stazione"));
