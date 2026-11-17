import type { Container } from "pixi.js";
import type { Livello } from "../config/livelli.ts";
import { OSTACOLI, type TipoOstacolo } from "../config/ostacoli.ts";
import Numbers from "../services/Numbers.ts";
import Ostacolo from "./Ostacolo.ts";

// Sequenze omogenee: un tipo, N ostacoli di quel tipo, poi schermo vuoto. Il tipo successivo si sceglie
// solo quando l'ultimo ostacolo della sequenza è uscito, così due tipi diversi non sono mai visibili insieme.
class Generatore {
  /** Pool per tipo e variante: una sequenza intera di una variante sola non resta mai senza oggetti. */
  private readonly _pool = new Map<TipoOstacolo, Ostacolo[][]>();
  readonly ostacoli: Ostacolo[] = [];

  private _tipo: TipoOstacolo | null = null;
  private _rimanenti = 0;
  private _percorsoDallUltimo = 0;
  private _distanzaAlProssimo = 0;
  private _schermoVuotoDa: number;

  constructor(
    parent: Container,
    private readonly _livello: Livello,
    private readonly _larghezzaSchermo: number,
    attesaIniziale: number,
  ) {
    const perVariante = _livello.ostacoliPerSequenza.max;
    for (const { tipo } of _livello.tipi) {
      const varianti = OSTACOLI[tipo].map((_, indice) =>
        Array.from({ length: perVariante }, () => {
          const ostacolo = new Ostacolo(parent, tipo, indice);
          this.ostacoli.push(ostacolo);
          return ostacolo;
        }),
      );
      this._pool.set(tipo, varianti);
    }
    // Il primo ostacolo nasce dopo questa attesa più la pausa fra sequenze.
    this._schermoVuotoDa = attesaIniziale;
  }

  /**
   * @param velocita px/s del terreno in questo frame
   * @param velocitaDiCrociera px/s senza il rallentamento dell'urto: converte le distanze in secondi. Con la
   * velocità rallentata gli ostacoli nascerebbero vicini, e a treno ripartito arriverebbero troppo fitti.
   * @param progresso 0 → 1: la distanza fra ostacoli si stringe con la stessa curva della velocità
   * @param attivo false dopo la chiusura: gli ostacoli in corsa finiscono il loro giro, non ne nascono altri
   */
  update(dt: number, tempo: number, velocita: number, velocitaDiCrociera: number, progresso: number, attivo: boolean): void {
    for (const ostacolo of this.ostacoli) ostacolo.update(dt, velocita, this._larghezzaSchermo);
    if (!attivo) return;

    if (this._rimanenti > 0) {
      this._percorsoDallUltimo += velocita * dt;
      if (this._percorsoDallUltimo >= this._distanzaAlProssimo) {
        // L'eccedenza del frame resta: la distanza non dipende dal frame rate.
        const eccedenza = this._percorsoDallUltimo - this._distanzaAlProssimo;
        this.faiNascere(this._larghezzaSchermo - eccedenza);
        this._rimanenti--;
        this._percorsoDallUltimo = eccedenza;
        const { inizio, fine } = this._livello.distanzaFraOstacoliSecondi;
        // In secondi di percorrenza, convertiti con la velocità del momento.
        this._distanzaAlProssimo = Numbers.lerp(inizio, fine, progresso) * velocitaDiCrociera;
        if (this._rimanenti === 0) this._schermoVuotoDa = Infinity;
      }
      return;
    }

    if (this.ostacoli.some((o) => o.stato !== "libero")) return;
    if (this._schermoVuotoDa === Infinity) this._schermoVuotoDa = tempo;
    if (tempo - this._schermoVuotoDa < this._livello.pausaFraSequenzeSecondi) return;

    this._tipo = this.scegliTipo();
    const { min, max } = this._livello.ostacoliPerSequenza;
    this._rimanenti = Math.floor(Numbers.randomBetween(min, max + 1 - 1e-9));
    this._percorsoDallUltimo = 0;
    this._distanzaAlProssimo = 0;
  }

  private faiNascere(x: number): void {
    const varianti = this._pool.get(this._tipo!)!;
    const variante = varianti[Math.floor(Math.random() * varianti.length)]!;
    variante.find((o) => o.stato === "libero")?.nasci(x);
  }

  private scegliTipo(): TipoOstacolo {
    const candidati = this._livello.tipi.filter((t) => !(this._livello.nonRipetereTipo && t.tipo === this._tipo));
    const totale = candidati.reduce((s, t) => s + t.peso, 0);
    let estratto = Math.random() * totale;
    for (const candidato of candidati) {
      estratto -= candidato.peso;
      if (estratto < 0) return candidato.tipo;
    }
    return candidati[candidati.length - 1]!.tipo;
  }
}

export default Generatore;
