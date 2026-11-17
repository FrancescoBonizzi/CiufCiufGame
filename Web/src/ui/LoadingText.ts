import { Application, Text } from "pixi.js";
import { GAME } from "../config.ts";

// Mostrato sul canvas mentre gli asset si caricano: alla prima partita, con atlas da qualche MB, servono secondi.
class LoadingText {
  private readonly _text: Text;

  constructor(
    private readonly _app: Application,
    text: string,
  ) {
    this._text = new Text({
      text,
      style: { fontFamily: GAME.fontFamily, fontSize: 32, fontWeight: "bold", fill: 0xffffff },
    });
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
