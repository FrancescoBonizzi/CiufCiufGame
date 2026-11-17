import { Container, Sprite, TilingSprite } from "pixi.js";
import type { IdLivello } from "../config/livelli.ts";
import { textureBinario, textureCielo, textureStrato } from "../grafica/textures.ts";

/** Frazione della velocità del terreno con cui scorre ogni strato: più lontano, più lento. */
const PARALLASSE = { lontano: 0.15, vicino: 0.5 };

// Cielo fermo sullo stage, strati e binario nel mondo con la base sul binario (y = 0). Gli strati sono
// ripetibili in orizzontale: scorre solo la posizione della texture, nessun oggetto da riciclare.
class Scenario {
  private readonly _lontano: TilingSprite;
  private readonly _vicino: TilingSprite;
  private readonly _binario: TilingSprite;

  constructor(stage: Container, mondo: Container, livello: IdLivello, larghezza: number, altezza: number) {
    stage.addChildAt(new Sprite(textureCielo(livello, larghezza, altezza)), 0);

    const strato = (texture: ReturnType<typeof textureStrato>, y: number) => {
      const t = new TilingSprite({ texture, width: larghezza, height: texture.height });
      t.y = y;
      mondo.addChild(t);
      return t;
    };
    const lontano = textureStrato(livello, "lontano");
    const vicino = textureStrato(livello, "vicino");
    this._lontano = strato(lontano, -lontano.height);
    this._vicino = strato(vicino, -vicino.height);
    // Il binario scende sotto lo schermo: la cima delle rotaie è la riga 0 della texture.
    this._binario = strato(textureBinario(livello), 0);
  }

  update(dt: number, velocita: number): void {
    const passo = velocita * dt;
    this._lontano.tilePosition.x -= passo * PARALLASSE.lontano;
    this._vicino.tilePosition.x -= passo * PARALLASSE.vicino;
    this._binario.tilePosition.x -= passo;
  }
}

export default Scenario;
