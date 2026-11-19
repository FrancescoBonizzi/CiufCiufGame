import { Container, Graphics, Sprite, type Texture } from "pixi.js";
import { textureIconaStazione } from "../grafica/textures.ts";
import Numbers from "../services/Numbers.ts";

const MARGINE = 40;
// La miniatura (32×20) poggia sulla barra: a 22 px dal bordo alto ci sta intera, ciminiera e pantografo compresi.
const Y = 22;

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
    this._miniatura.anchor.set(0.5, 1);
    this._miniatura.position.set(this._inizio, Y + 2);
    barra.addChild(this._miniatura);
    stage.addChild(barra);
  }

  set progresso(valore: number) {
    this._miniatura.x = Math.round(this._inizio + (this._fine - this._inizio) * Numbers.clamp01(valore));
  }
}

export default BarraPercorso;
