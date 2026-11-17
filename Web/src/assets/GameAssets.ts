import type { Spritesheet } from "pixi.js";

// Solo dati: le Sprite e le AnimatedSprite le crea chi le usa, così ogni partita parte da oggetti nuovi.
interface GameAssets {
  sheets: Spritesheet[];
}

export default GameAssets;
