import { Assets, Spritesheet, Texture } from "pixi.js";
import type GameAssets from "./GameAssets.ts";
import { ASSETS_ROOT } from "./paths.ts";

// Atlas JSON (formato hash di TexturePacker) in public/assets/images/spriteSheets, senza estensione.
// Vuoto: la pixel art sono PNG singoli caricati prima del menu da grafica/immagini.ts (vedi la fase 6 della
// roadmap). getTexture/getAnimation restano pronti se un giorno servirà un atlas.
const SPRITESHEETS: string[] = [];

export const loadAssets = async (): Promise<GameAssets> => {
  // Assets tiene in cache ciò che ha caricato: dalla seconda partita in poi queste promesse si risolvono subito.
  const sheets = await Promise.all(
    SPRITESHEETS.map((name) => Assets.load<Spritesheet>(`${ASSETS_ROOT}images/spriteSheets/${name}.json`)),
  );

  return { sheets };
};

export const getTexture = (assets: GameAssets, name: string): Texture => {
  for (const sheet of assets.sheets) {
    const texture = sheet.textures[name];
    if (texture) return texture;
  }
  throw new Error(`Texture "${name}" non trovata in nessuno spritesheet`);
};

export const getAnimation = (assets: GameAssets, name: string): Texture[] => {
  for (const sheet of assets.sheets) {
    const frames = sheet.animations[name];
    if (frames) return frames;
  }
  throw new Error(`Animazione "${name}" non trovata in nessuno spritesheet`);
};
