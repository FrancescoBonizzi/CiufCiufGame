import { Container, Rectangle, Sprite } from "pixi.js";
import { COMUNE } from "../config/livelli.ts";
import { OSTACOLI, type TipoOstacolo, type VarianteOstacolo } from "../config/ostacoli.ts";
import { textureOstacolo, texturePiloni } from "../grafica/textures.ts";

export type StatoOstacolo = "libero" | "in-corsa" | "sbalzato";

// Un oggetto riciclato dal pool: nasce fuori dallo schermo a destra, scorre col terreno, torna libero
// quando esce a sinistra (o, sbalzato via, quando cade fuori dallo schermo).
class Ostacolo {
  readonly vista = new Container();
  readonly hitbox = new Rectangle();
  readonly variante: VarianteOstacolo;

  private readonly _figura: Sprite;
  /** Quanto la scenografia (i piloni della trave) sporge ai lati della figura. */
  private readonly _sporgenza: number;
  private _stato: StatoOstacolo = "libero";
  private _velocitaX = 0;
  private _velocitaY = 0;

  constructor(
    parent: Container,
    readonly tipo: TipoOstacolo,
    indiceVariante: number,
  ) {
    this.variante = OSTACOLI[tipo][indiceVariante]!;
    this._sporgenza = 0;
    if (tipo === "trave") {
      // I piloni sono scenografia: reggono la trave ma non urtano.
      const piloni = new Sprite(texturePiloni());
      piloni.anchor.set(0, 1);
      this._sporgenza = (piloni.width - this.variante.larghezza) / 2;
      piloni.x = -this._sporgenza;
      this.vista.addChild(piloni);
    }
    this._figura = new Sprite(textureOstacolo(tipo, indiceVariante));
    // Il perno al centro fa ruotare la figura su se stessa quando vola via.
    this._figura.anchor.set(0.5);
    this._figura.position.set(this.variante.larghezza / 2, -this.variante.sollevamento - this.variante.altezza / 2);
    this.vista.addChild(this._figura);
    this.vista.visible = false;
    parent.addChild(this.vista);
  }

  get stato(): StatoOstacolo {
    return this._stato;
  }

  /** Bordo destro di ciò che si vede, scenografia compresa, in coordinate del mondo. */
  get destra(): number {
    return this.vista.x + this.variante.larghezza + this._sporgenza;
  }

  /** @param x dove comincia ciò che si vede, scenografia compresa: lo schermo lo vede entrare dal bordo. */
  nasci(x: number): void {
    this._stato = "in-corsa";
    this.vista.x = x + this._sporgenza;
    this.vista.y = 0;
    this.vista.visible = true;
    this._figura.rotation = 0;
    this._figura.position.set(this.variante.larghezza / 2, -this.variante.sollevamento - this.variante.altezza / 2);
    this.aggiornaHitbox();
  }

  /** Urto nel facile: vola via in avanti ruotando, e non urta più. */
  sbalza(): void {
    this._stato = "sbalzato";
    this._velocitaX = COMUNE.sbalzo.velocitaX;
    this._velocitaY = COMUNE.sbalzo.velocitaY;
  }

  /** @param velocitaMondo px/s con cui scorre il terreno. */
  update(dt: number, velocitaMondo: number, larghezzaSchermo: number): void {
    if (this._stato === "libero") return;
    this.vista.x -= velocitaMondo * dt;

    if (this._stato === "sbalzato") {
      this._velocitaY += COMUNE.sbalzo.gravita * dt;
      this._figura.x += this._velocitaX * dt;
      this._figura.y += this._velocitaY * dt;
      this._figura.rotation += COMUNE.sbalzo.rotazione * dt;
      const fuori = this._figura.y > this.variante.altezza * 2 + 60 || this.vista.x + this._figura.x > larghezzaSchermo + 40;
      if (fuori) this.libera();
      return;
    }

    this.aggiornaHitbox();
    if (this.destra < 0) this.libera();
  }

  libera(): void {
    this._stato = "libero";
    this.vista.visible = false;
  }

  private aggiornaHitbox(): void {
    const { larghezza, hitbox, sollevamento } = this.variante;
    this.hitbox.x = this.vista.x + (larghezza - hitbox.larghezza) / 2;
    this.hitbox.y = -sollevamento - hitbox.altezza;
    this.hitbox.width = hitbox.larghezza;
    this.hitbox.height = hitbox.altezza;
  }
}

export default Ostacolo;
