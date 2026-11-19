import { Container, Rectangle, Sprite, type Texture } from "pixi.js";
import { COMUNE, type Livello } from "../config/livelli.ts";

// Ferma in orizzontale: scorrono scenario e ostacoli. Il salto ha durata e altezza fisse, quindi il ritmo
// della pressione non cambia con la velocità.
class Locomotiva {
  readonly sprite: Sprite;
  readonly hitbox = new Rectangle();

  private _tempoInSalto: number | null = null;
  /** Tempo di gioco dell'ultima pressione arrivata in volo. */
  private _pressioneInVolo = -Infinity;
  private _fotogramma = 0;
  private _distanzaRuote = 0;

  constructor(
    parent: Container,
    private readonly _fotogrammi: Texture[],
    private readonly _livello: Livello,
    /** Ogni quanti px percorsi le ruote passano al fotogramma successivo. */
    private readonly _pxPerFotogramma: number,
    /** Altezza della sagoma disegnata: un treno basso non urta una trave che a schermo non tocca. */
    private readonly _altezzaSagoma: number,
  ) {
    this.sprite = new Sprite(_fotogrammi[0]);
    this.sprite.anchor.set(0.5, 1);
    this.sprite.x = COMUNE.locomotivaX;
    parent.addChild(this.sprite);
    this.aggiornaHitbox();
  }

  get aTerra(): boolean {
    return this._tempoInSalto === null;
  }

  /** @returns quello che è successo in questo frame, per suoni e particelle. */
  update(dt: number, velocita: number, premuto: boolean, tempo: number): "salto" | "atterraggio" | null {
    this._distanzaRuote += velocita * dt;
    while (this._distanzaRuote >= this._pxPerFotogramma) {
      this._distanzaRuote -= this._pxPerFotogramma;
      this._fotogramma = (this._fotogramma + 1) % this._fotogrammi.length;
      this.sprite.texture = this._fotogrammi[this._fotogramma]!;
    }

    let evento: "salto" | "atterraggio" | null = null;
    if (premuto) {
      if (this.aTerra) {
        this._tempoInSalto = 0;
        evento = "salto";
      } else {
        this._pressioneInVolo = tempo;
      }
    }
    if (this._tempoInSalto !== null && evento !== "salto") {
      this._tempoInSalto += dt;
      if (this._tempoInSalto >= this._livello.salto.durataSecondi) {
        // Pressione anticipata ricordata: chi preme un attimo prima di toccare terra salta lo stesso.
        if (tempo - this._pressioneInVolo <= this._livello.salto.pressioneRicordataSecondi) {
          this._tempoInSalto = 0;
          this._pressioneInVolo = -Infinity;
          evento = "salto";
        } else {
          this._tempoInSalto = null;
          evento = "atterraggio";
        }
      }
    }

    this.sprite.y = this.quota;
    this.aggiornaHitbox();
    return evento;
  }

  dimenticaPressioneInVolo(): void {
    this._pressioneInVolo = -Infinity;
  }

  /** y della base: 0 sul binario, negativa in salto. */
  private get quota(): number {
    if (this._tempoInSalto === null) return 0;
    const s = this._tempoInSalto / this._livello.salto.durataSecondi;
    return -4 * this._livello.salto.altezza * s * (1 - s);
  }

  private aggiornaHitbox(): void {
    const { larghezza } = this._livello.hitboxLocomotiva;
    const altezza = Math.min(this._livello.hitboxLocomotiva.altezza, this._altezzaSagoma);
    this.hitbox.x = this.sprite.x - larghezza / 2;
    this.hitbox.y = this.sprite.y - altezza;
    this.hitbox.width = larghezza;
    this.hitbox.height = altezza;
  }
}

export default Locomotiva;
