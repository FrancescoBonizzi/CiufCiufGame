import { Container, Graphics, Sprite, Texture } from "pixi.js";
import Numbers from "../services/Numbers.ts";

// L'elettrica si riconosce dal pantografo che fa contatto: un arco a zigzag che lampeggia per un attimo, e
// scintille di uno o due pixel che schizzano sparse e ricadono. Tutto sulla griglia dei pixel di gioco: niente
// sprite ingranditi né ruotati, posizioni intere.

const CONFIG = {
  /** Testa del pantografo, rispetto alla base al centro dello sprite (misurata su locomotive/elettrica.png). */
  /** La riga più alta della barra nera: il lampo del contatto la copre per metà. */
  origine: { x: -6, y: -20 },
  arco: {
    /** px percorsi fra un arco e il successivo: il ritmo segue la velocità, come il fumo. */
    ogniPx: { min: 30, max: 100 },
    durataSecondi: { min: 0.08, max: 0.16 },
    /** Ogni quanto l'arco cambia forma mentre è acceso. */
    ridisegnoSecondi: 0.03,
    altezza: { min: 9, max: 16 },
    /** Spostamento laterale massimo di ogni zigzag. */
    scarto: 2,
    probabilitaRamo: 0.4,
  },
  scintille: {
    /** Quelle sparse lungo la corsa, fra un arco e l'altro. */
    ogniPx: 14,
    probabilita: 0.6,
    perArco: { min: 8, max: 14 },
    /** 0° avanti, 90° in alto, 180° indietro: schizzano soprattutto all'indietro e in alto. */
    angoloGradi: { min: 25, max: 175 },
    velocita: { min: 50, max: 150 },
    /** px/s² verso il basso: le scintille vere ricadono. */
    gravita: 320,
    vitaSecondi: { min: 0.25, max: 0.55 },
    /** Frazione di scintille da 2×2 invece che da 1×1. */
    quotaGrandi: 0.6,
    pool: 64,
  },
  // Saturi e con un bordo blu: su muri e cieli chiari un bianco puro sparirebbe.
  colori: { nucleo: 0xffffff, alone: 0x5fd8ff, bordo: 0x1f5fff, scintille: [0xfff04a, 0x5fd8ff, 0x2f8bff, 0xffffff] },
} as const;

interface Scintilla {
  sprite: Sprite;
  /** Un pixel più tenue dov'era la scintilla al frame prima: la scarica lascia una riga, non un punto. */
  scia: Sprite;
  /** Posizione esatta; lo sprite sta sul pixel intero più vicino. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  vita: number;
  eta: number;
}

class Scintille {
  /** Scorre col binario: le scintille restano indietro alla velocità del terreno. */
  private readonly _scorre = new Container();
  private readonly _arco = new Graphics();
  private readonly _pool: Scintilla[];
  private _distanzaScintille = 0;
  private _prossimoArco = Numbers.randomBetweenInterval(CONFIG.arco.ogniPx);
  private _arcoResiduo = 0;
  private _ridisegno = 0;

  constructor(parent: Container) {
    parent.addChild(this._scorre);
    parent.addChild(this._arco);
    this._pool = Array.from({ length: CONFIG.scintille.pool }, () => {
      const scia = new Sprite(Texture.WHITE);
      scia.visible = false;
      this._scorre.addChild(scia);
      const sprite = new Sprite(Texture.WHITE);
      sprite.visible = false;
      this._scorre.addChild(sprite);
      return { sprite, scia, x: 0, y: 0, vx: 0, vy: 0, vita: 0, eta: 0 };
    });
  }

  /** Ogni frame, anche a locomotiva ferma: le scintille già partite finiscono di cadere. */
  update(dt: number): void {
    for (const s of this._pool) {
      if (!s.sprite.visible) continue;
      s.eta += dt;
      if (s.eta >= s.vita) {
        s.sprite.visible = false;
        s.scia.visible = false;
        continue;
      }
      s.scia.position.copyFrom(s.sprite.position);
      s.scia.visible = true;
      s.vy += CONFIG.scintille.gravita * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.sprite.position.set(Math.round(s.x), Math.round(s.y));
      // Sfarfallio: ogni frame una scintilla può spegnersi a metà, come una scarica.
      s.sprite.alpha = Math.random() < 0.25 ? 0.35 : 1;
    }

    if (this._arcoResiduo > 0) {
      this._arcoResiduo -= dt;
      this._ridisegno -= dt;
      if (this._arcoResiduo <= 0) this._arco.clear();
      else if (this._ridisegno <= 0) this.disegnaArco();
    }
  }

  /** px percorsi in questo frame; x, y: la base della locomotiva. */
  avanza(passo: number, x: number, y: number): void {
    this._scorre.x -= passo;
    const ox = Math.round(x + CONFIG.origine.x);
    const oy = Math.round(y + CONFIG.origine.y);
    // L'arco segue il pantografo anche in salto, a differenza delle scintille che restano indietro.
    this._arco.position.set(ox, oy);

    this._distanzaScintille += passo;
    while (this._distanzaScintille >= CONFIG.scintille.ogniPx) {
      this._distanzaScintille -= CONFIG.scintille.ogniPx;
      if (Math.random() < CONFIG.scintille.probabilita) this.lancia(ox, oy, 1);
    }

    this._prossimoArco -= passo;
    if (this._prossimoArco <= 0) {
      this._prossimoArco = Numbers.randomBetweenInterval(CONFIG.arco.ogniPx);
      this._arcoResiduo = Numbers.randomBetweenInterval(CONFIG.arco.durataSecondi);
      this.disegnaArco();
      this.lancia(ox, oy, Math.round(Numbers.randomBetweenInterval(CONFIG.scintille.perArco)));
    }
  }

  destroy(): void {
    this._arco.destroy();
    this._scorre.destroy({ children: true });
  }

  private lancia(ox: number, oy: number, quante: number): void {
    const c = CONFIG.scintille;
    for (let i = 0; i < quante; i++) {
      let s: Scintilla | undefined;
      for (const p of this._pool) {
        if (!p.sprite.visible) {
          s = p;
          break;
        }
      }
      if (!s) return;
      const angolo = Numbers.toRadians(Numbers.randomBetweenInterval(c.angoloGradi));
      const velocita = Numbers.randomBetweenInterval(c.velocita);
      s.vx = Math.cos(angolo) * velocita;
      s.vy = -Math.sin(angolo) * velocita;
      s.vita = Numbers.randomBetweenInterval(c.vitaSecondi);
      s.eta = 0;
      const lato = Math.random() < c.quotaGrandi ? 2 : 1;
      s.sprite.width = lato;
      s.sprite.height = lato;
      s.sprite.tint = CONFIG.colori.scintille[Math.floor(Math.random() * CONFIG.colori.scintille.length)]!;
      s.scia.width = lato;
      s.scia.height = lato;
      s.scia.tint = s.sprite.tint;
      s.scia.alpha = 0.5;
      s.scia.visible = false;
      s.sprite.alpha = 1;
      s.x = ox - this._scorre.x;
      s.y = oy;
      s.sprite.position.set(Math.round(s.x), s.y);
      s.sprite.visible = true;
    }
  }

  /**
   * Un fulmine di pixel che sale dal pantografo: vertici ogni 3-4 px di salita, spostati di lato di 2-3 px,
   * uniti da tratti diagonali. Nucleo bianco con alone azzurro a destra e bordo blu a sinistra; a volte un ramo.
   */
  private disegnaArco(): void {
    const a = CONFIG.arco;
    this._ridisegno = a.ridisegnoSecondi;
    const g = this._arco;
    g.clear();
    const altezza = Math.round(Numbers.randomBetweenInterval(a.altezza));
    const punto = (x: number, y: number) => {
      g.rect(x - 1, y, 1, 1).fill(CONFIG.colori.bordo);
      g.rect(x + 1, y, 1, 1).fill(CONFIG.colori.alone);
      g.rect(x, y, 1, 1).fill(CONFIG.colori.nucleo);
    };
    let x = 0;
    let y = 0;
    let verso = Math.random() < 0.5 ? -1 : 1;
    let ramoFatto = false;
    while (-y < altezza) {
      const salita = Math.round(Numbers.randomBetween(3, 4));
      const scarto = verso * Math.round(Numbers.randomBetween(2, a.scarto + 1));
      // Tratto diagonale fino al vertice successivo, un pixel per riga.
      for (let k = 1; k <= salita; k++) punto(x + Math.round((scarto * k) / salita), y - k);
      x += scarto;
      y -= salita;
      verso = -verso;
      if (!ramoFatto && -y > altezza / 3 && Math.random() < a.probabilitaRamo) {
        ramoFatto = true;
        for (let k = 1; k <= 4; k++) g.rect(x + verso * k, y - k, 1, 1).fill(k === 4 ? CONFIG.colori.alone : CONFIG.colori.nucleo);
      }
    }
    // Lampo nel punto di contatto.
    g.rect(-2, -1, 5, 1).fill(CONFIG.colori.alone);
    g.rect(-1, -2, 3, 3).fill(CONFIG.colori.nucleo);
  }
}

export default Scintille;
