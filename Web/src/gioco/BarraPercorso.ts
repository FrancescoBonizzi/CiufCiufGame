import { Container, Graphics, Sprite, type Texture } from "pixi.js";
import { textureIconaStazione } from "../grafica/textures.ts";

const MARGINE = 40;
const Y = 14;

// Il traguardo si vede senza saper leggere: una piccola locomotiva del colore scelto va dalla partenza
// alla stazione. Niente timer né punteggi.
class BarraPercorso {
  private readonly _miniatura: Sprite;
  private readonly _inizio: number;
  private readonly _fine: number;

  constructor(stage: Container, larghezza: number, locomotiva: Texture) {
    const barra = new Container();
    this._inizio = MARGINE;
    this._fine = larghezza - MARGINE - 12;
    barra.addChild(
      new Graphics()
        .rect(this._inizio - 1, Y - 2, this._fine - this._inizio + 2, 5)
        .fill(0x2b2133)
        .rect(this._inizio, Y - 1, this._fine - this._inizio, 3)
        .fill(0xf4f1ea),
    );
    const stazione = new Sprite(textureIconaStazione());
    stazione.anchor.set(0, 0.75);
    stazione.position.set(this._fine + 2, Y);
    barra.addChild(stazione);

    this._miniatura = new Sprite(locomotiva);
    // Mezza misura: 32×20, in scala intera per restare pixel art.
    this._miniatura.scale.set(0.5);
    this._miniatura.anchor.set(0.5, 1);
    this._miniatura.position.set(this._inizio, Y + 2);
    barra.addChild(this._miniatura);
    stage.addChild(barra);
  }

  set progresso(valore: number) {
    this._miniatura.x = Math.round(this._inizio + (this._fine - this._inizio) * Math.min(1, Math.max(0, valore)));
  }
}

export default BarraPercorso;
