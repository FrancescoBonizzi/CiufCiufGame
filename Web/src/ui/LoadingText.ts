import { Application, Text } from "pixi.js";
import { GAME } from "../config.ts";

// Mostrato sul canvas mentre gli atlas si caricano. Oggi non ce ne sono (la pixel art si carica prima del
// menu, grafica/immagini.ts): resta a schermo un frame, e servirà se un giorno arriveranno atlas pesanti.
class LoadingText {
  private readonly _text: Text;

  constructor(
    private readonly _app: Application,
    text: string,
  ) {
    // Risoluzione 1: il testo si disegna sulla griglia del gioco e si ingrandisce coi suoi pixel, col contorno
    // scuro come le scritte delle pagine HTML.
    this._text = new Text({
      text,
      resolution: 1,
      style: {
        fontFamily: GAME.fontFamily,
        fontSize: 24,
        fontWeight: "bold",
        fill: 0xf2c230,
        stroke: { color: 0x2b2133, width: 4, join: "miter" },
      },
    });
    this._text.roundPixels = true;
    this._text.anchor.set(0.5);
    this._text.position.set(_app.screen.width / 2, _app.screen.height / 2);
  }

  show(): void {
    this._app.stage.addChild(this._text);
  }

  // Distrutto e non solo rimosso: staccato dallo stage, app.destroy non lo raggiungerebbe più.
  hide(): void {
    this._text.destroy();
  }
}

export default LoadingText;
