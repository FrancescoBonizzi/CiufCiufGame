import { Rectangle, Texture } from "pixi.js";
import type { IdLivello } from "../config/livelli.ts";
import { OSTACOLI, type TipoOstacolo } from "../config/ostacoli.ts";
import { COLORI, type IdColore, type IdLocomotiva } from "../preferenze.ts";
import { ricolora } from "./palette.ts";
import {
  FOTOGRAMMA_LOCOMOTIVA,
  disegnaBinario,
  disegnaCielo,
  disegnaIconaStazione,
  disegnaLocomotiva,
  disegnaOstacolo,
  disegnaPiloni,
  disegnaStazione,
  disegnaStrato,
} from "./segnaposto.ts";

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
    const foglio = daCanvas(chiave, () => ricolora(disegnaLocomotiva(tipo), COLORI[colore]));
    const { larghezza, altezza, numero } = FOTOGRAMMA_LOCOMOTIVA;
    frames = fotogrammi(foglio, larghezza, altezza, numero);
    cacheFotogrammi.set(chiave, frames);
  }
  return frames;
};

export const textureOstacolo = (tipo: TipoOstacolo, indice: number): Texture =>
  daCanvas(`ostacolo:${tipo}:${indice}`, () => disegnaOstacolo(tipo, OSTACOLI[tipo][indice]!, indice));

export const texturePiloni = () => daCanvas("piloni", disegnaPiloni);
export const textureCielo = (livello: IdLivello, l: number, a: number) =>
  daCanvas(`cielo:${livello}`, () => disegnaCielo(livello, l, a));
export const textureStrato = (livello: IdLivello, quale: "lontano" | "vicino") =>
  daCanvas(`strato:${livello}:${quale}`, () => disegnaStrato(livello, quale));
export const textureBinario = (livello: IdLivello) => daCanvas(`binario:${livello}`, () => disegnaBinario(livello));
export const textureStazione = () => daCanvas("stazione", disegnaStazione);
export const textureIconaStazione = () => daCanvas("icona-stazione", disegnaIconaStazione);
