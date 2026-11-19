import type { IdLivello } from "../config/livelli.ts";
import type { TipoOstacolo, VarianteOstacolo } from "../config/ostacoli.ts";
import type { IdLocomotiva } from "../preferenze.ts";
import { RAMPA_MAGENTA } from "./palette.ts";

// Grafica segnaposto disegnata a codice, con le misure e le convenzioni degli sprite veri (fase 6 della
// roadmap): stessi formati, carrozzeria nella rampa magenta, appoggio sul bordo basso. Quando arriveranno i
// PNG, cambia solo da dove vengono le immagini, non chi le usa.

const CONTORNO = "#2b2133";
const [M_LUCE, M_PIENO, M_OMBRA, M_SCURO] = RAMPA_MAGENTA;

class Pennello {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;

  constructor(larghezza: number, altezza: number) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = larghezza;
    this.canvas.height = altezza;
    this.ctx = this.canvas.getContext("2d")!;
    this.ctx.imageSmoothingEnabled = false;
  }

  rett(x: number, y: number, l: number, a: number, colore: string): this {
    this.ctx.fillStyle = colore;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(l), Math.round(a));
    return this;
  }

  /** Rettangolo con il contorno scuro di 1 px attorno. */
  blocco(x: number, y: number, l: number, a: number, colore: string): this {
    return this.rett(x - 1, y - 1, l + 2, a + 2, CONTORNO).rett(x, y, l, a, colore);
  }

  disco(cx: number, cy: number, r: number, colore: string): this {
    this.ctx.fillStyle = colore;
    for (let y = -r; y <= r; y++) {
      const mezza = Math.floor(Math.sqrt(r * r - y * y) + 0.5);
      this.ctx.fillRect(cx - mezza, cy + y, mezza * 2, 1);
    }
    return this;
  }

  ruota(cx: number, cy: number, r: number, angolo: number, mozzo = "#d63c3c"): this {
    this.disco(cx, cy, r + 1, CONTORNO).disco(cx, cy, r, "#5b5466");
    // Un raggio che gira: è lui a far vedere il movimento.
    for (let t = 0; t < r; t++) {
      this.rett(cx + Math.round(Math.cos(angolo) * t), cy + Math.round(Math.sin(angolo) * t), 1, 1, "#9a93a6");
      this.rett(cx - Math.round(Math.cos(angolo) * t), cy - Math.round(Math.sin(angolo) * t), 1, 1, "#9a93a6");
    }
    return this.rett(cx - 1, cy - 1, 2, 2, mozzo);
  }

  /** Carrozzeria a tre toni della rampa magenta: luce sopra, ombra sotto. */
  carrozzeria(x: number, y: number, l: number, a: number): this {
    this.blocco(x, y, l, a, M_PIENO).rett(x, y, l, 2, M_LUCE);
    return this.rett(x, y + a - 3, l, 3, M_OMBRA);
  }
}

// --- Locomotive: foglio di 4 fotogrammi da 64×40, guardano a destra, ruote sul bordo basso. ---

export const FOTOGRAMMA_LOCOMOTIVA = { larghezza: 64, altezza: 40, numero: 4 };

const disegnaVapore = (p: Pennello, ox: number, angolo: number) => {
  p.carrozzeria(ox + 22, 14, 32, 15); // caldaia
  p.carrozzeria(ox + 6, 6, 18, 23); // cabina
  p.blocco(ox + 4, 3, 22, 3, M_SCURO); // tetto
  p.blocco(ox + 10, 10, 8, 6, "#9be3ff"); // finestrino
  p.blocco(ox + 44, 4, 6, 10, "#3a3340"); // ciminiera
  p.rett(ox + 43, 3, 8, 2, "#3a3340");
  p.blocco(ox + 34, 10, 4, 4, "#f2c230"); // campana
  p.blocco(ox + 54, 26, 6, 6, M_OMBRA); // cacciapietre
  p.rett(ox + 60, 30, 2, 3, M_OMBRA);
  p.rett(ox + 2, 29, 56, 2, CONTORNO); // telaio
  for (const cx of [16, 30, 44]) p.ruota(ox + cx, 33, 5, angolo + cx);
  // Biella: segue la rotazione delle ruote.
  const dx = Math.round(Math.cos(angolo) * 3);
  const dy = Math.round(Math.sin(angolo) * 2);
  p.rett(ox + 16 + dx, 33 + dy, 29, 2, "#c9c3d1");
};

const disegnaDiesel = (p: Pennello, ox: number, angolo: number) => {
  p.carrozzeria(ox + 4, 11, 54, 18);
  p.rett(ox + 57, 13, 2, 14, M_PIENO); // muso arrotondato
  p.blocco(ox + 8, 6, 20, 5, M_SCURO); // cabina rialzata
  p.blocco(ox + 10, 14, 7, 6, "#9be3ff");
  p.blocco(ox + 20, 14, 7, 6, "#9be3ff");
  p.blocco(ox + 40, 7, 6, 4, "#8a8494"); // scarico
  for (let i = 0; i < 4; i++) p.rett(ox + 52 + i * 2, 21, 1, 6, i % 2 ? "#2b2133" : "#f2c230");
  p.rett(ox + 2, 29, 58, 2, CONTORNO);
  for (const cx of [12, 22, 42, 52]) p.ruota(ox + cx, 34, 4, angolo + cx, "#5b5466");
};

const disegnaElettrica = (p: Pennello, ox: number, angolo: number) => {
  p.carrozzeria(ox + 4, 12, 48, 17);
  // Muso inclinato: gradini sempre più bassi.
  for (let i = 0; i < 8; i++) p.blocco(ox + 52 + i, 12 + i * 2, 1, 17 - i * 2, i < 3 ? M_PIENO : M_OMBRA);
  p.blocco(ox + 44, 14, 9, 6, "#9be3ff"); // parabrezza
  p.blocco(ox + 10, 15, 6, 5, "#9be3ff");
  p.blocco(ox + 20, 15, 6, 5, "#9be3ff");
  p.blocco(ox + 30, 15, 6, 5, "#9be3ff");
  // Pantografo ripiegato sul tetto.
  p.rett(ox + 18, 10, 22, 1, "#8a8494").rett(ox + 22, 6, 1, 4, "#8a8494").rett(ox + 22, 6, 14, 1, "#8a8494");
  p.rett(ox + 59, 24, 2, 2, "#ffffff"); // faro
  p.rett(ox + 2, 29, 58, 2, CONTORNO);
  for (const cx of [12, 22, 40, 50]) p.ruota(ox + cx, 34, 4, angolo + cx, "#5b5466");
};

const DISEGNI_LOCOMOTIVE: Record<IdLocomotiva, (p: Pennello, ox: number, angolo: number) => void> = {
  vapore: disegnaVapore,
  diesel: disegnaDiesel,
  elettrica: disegnaElettrica,
};

export const disegnaLocomotiva = (tipo: IdLocomotiva): HTMLCanvasElement => {
  const { larghezza, altezza, numero } = FOTOGRAMMA_LOCOMOTIVA;
  const p = new Pennello(larghezza * numero, altezza);
  for (let f = 0; f < numero; f++) DISEGNI_LOCOMOTIVE[tipo](p, f * larghezza, (f * Math.PI) / 2);
  return p.canvas;
};

// --- Ostacoli: una figura per variante, appoggiata al bordo basso. ---

type DisegnoOstacolo = (p: Pennello, l: number, a: number, indice: number) => void;

const DISEGNI_OSTACOLI: Record<TipoOstacolo, DisegnoOstacolo> = {
  legna: (p, l, a) => {
    for (const [x, y] of [[1, 15], [12, 15], [23, 15], [6, 5], [17, 5]] as const) {
      p.disco(x + 6, y + 6, 6, CONTORNO).disco(x + 6, y + 6, 5, "#a0612b").disco(x + 6, y + 6, 2, "#e8b878");
    }
    p.rett(l / 2 - 1, 1, 2, a - 2, "#c8322f");
  },
  fieno: (p, l, a) => {
    p.disco(l / 2, a / 2, l / 2 - 1, CONTORNO).disco(l / 2, a / 2, l / 2 - 2, "#e8c13a");
    p.disco(l / 2 - 3, a / 2 - 3, 6, "#f7dc6f");
    p.rett(l / 2 - 8, 2, 1, a - 4, "#8a5a2b").rett(l / 2 + 7, 2, 1, a - 4, "#8a5a2b");
  },
  staccionata: (p, l, a) => {
    for (const x of [2, l / 2 - 2, l - 6]) p.blocco(x, 1, 4, a - 1, "#f4f1ea");
    p.blocco(1, 6, l - 2, 3, "#e3ddd0").blocco(1, 14, l - 2, 3, "#e3ddd0");
  },
  cassa: (p, l, a) => {
    p.blocco(1, 1, l - 2, a - 2, "#a86b34").rett(1, 1, l - 2, 2, "#c98a4b");
    p.rett(1, 1, 4, 4, "#8a8494").rett(l - 5, 1, 4, 4, "#8a8494").rett(1, a - 5, 4, 4, "#8a8494").rett(l - 5, a - 5, 4, 4, "#8a8494");
    p.rett(l / 2 - 1, 8, 2, 12, CONTORNO).rett(l / 2 - 4, 8, 8, 2, CONTORNO);
  },
  carrello: (p, l, a) => {
    p.blocco(4, 6, 14, 10, "#3d6fd1").blocco(18, 2, 16, 14, "#d64545");
    p.blocco(2, 16, l - 8, 3, "#6b4a2b");
    p.rett(l - 6, 6, 2, 12, CONTORNO); // maniglia
    p.ruota(10, a - 6, 5, 0.5).ruota(28, a - 6, 5, 2);
  },
  sbarra: (p, l, a) => {
    p.blocco(2, 2, 5, a - 2, "#3a3340");
    for (let x = 7; x < l - 1; x += 6) p.rett(x, 6, 6, 4, (x / 6) % 2 < 1 ? "#d63c3c" : "#ffffff");
    p.rett(7, 5, l - 8, 1, CONTORNO).rett(7, 10, l - 8, 1, CONTORNO);
    p.disco(l - 6, 4, 2, "#ff3030");
  },
  segnale: (p, l, a) => {
    p.blocco(l / 2 - 2, 10, 4, a - 14, "#8a8494");
    p.blocco(3, a - 4, l - 6, 4, "#5b5466");
    p.disco(l / 2, 6, 6, CONTORNO).disco(l / 2, 6, 5, "#3a3340").disco(l / 2, 6, 3, "#ff3030");
  },
  pallet: (p, l, a) => {
    for (const y of [1, a / 2 + 1]) {
      p.blocco(1, y, l - 2, 2, "#e6c98f");
      for (const x of [1, l / 2 - 2, l - 6]) p.blocco(x, y + 3, 4, a / 2 - 5, "#c9a86a");
    }
  },
  barili: (p, l, a) => {
    for (let x = 0; x < l; x += 18) {
      p.blocco(x + 1, 1, 16, a - 2, "#2f6fb5").rett(x + 1, 1, 16, 2, "#5a9be0");
      p.rett(x + 1, 7, 16, 1, "#1d4a7a").rett(x + 1, a - 8, 16, 1, "#1d4a7a");
      p.rett(x + 6, 11, 6, 5, "#f2c230");
    }
  },
  container: (p, _l, _a, indice) => {
    // Visti di testa: lamiera ondulata e le due sbarre di chiusura delle porte.
    const container = (x: number, y: number, colore: string, ombra: string) => {
      p.blocco(x + 1, y + 1, 18, 18, colore);
      for (let i = x + 3; i < x + 18; i += 3) p.rett(i, y + 3, 1, 14, ombra);
      p.rett(x + 7, y + 3, 1, 14, CONTORNO).rett(x + 12, y + 3, 1, 14, CONTORNO);
    };
    const rosso = ["#e0483d", "#a93228"] as const;
    const giallo = ["#f2b632", "#bf8a1c"] as const;
    const verde = ["#2f9e5b", "#21744a"] as const;
    const blu = ["#2f74c0", "#21558f"] as const;
    const posizioni = [
      [[0, 0, rosso]],
      [[0, 0, giallo], [0, 20, verde]],
      [[0, 20, rosso], [20, 20, blu], [10, 0, giallo]],
    ] as const;
    for (const [x, y, [colore, ombra]] of posizioni[indice] ?? []) container(x, y, colore, ombra);
  },
  trave: (p, l, a) => {
    p.blocco(1, 1, l - 2, a - 2, "#d4572a").rett(1, 1, l - 2, 2, "#f07a48");
    for (let x = 8; x < l - 8; x += 10) p.rett(x, a / 2 - 1, 2, 2, "#8a3418");
    for (let i = 0; i < 3; i++) {
      p.rett(2 + i * 3, 1, 2, a - 2, i % 2 ? CONTORNO : "#f2c230");
      p.rett(l - 4 - i * 3, 1, 2, a - 2, i % 2 ? CONTORNO : "#f2c230");
    }
  },
};

export const disegnaOstacolo = (tipo: TipoOstacolo, variante: VarianteOstacolo, indice: number): HTMLCanvasElement => {
  const p = new Pennello(variante.larghezza, variante.altezza);
  DISEGNI_OSTACOLI[tipo](p, variante.larghezza, variante.altezza, indice);
  return p.canvas;
};

/** Il cavo della gru che regge la trave, 96×200: scenografia, non ostacolo. Il bordo basso è la cima della trave. */
export const disegnaCavo = (): HTMLCanvasElement => {
  const p = new Pennello(96, 200);
  const gancio = 48;
  // Dalla trave il cavo sale oltre il bordo alto dello schermo: la gru resta fuori campo.
  for (const da of [18, 78]) {
    for (let t = 0; t <= 20; t++) p.rett(Math.round(da + ((gancio - da) * t) / 20), 199 - t, 1, 1, CONTORNO);
  }
  p.rett(gancio - 1, 0, 2, 175, CONTORNO);
  p.blocco(gancio - 3, 175, 6, 3, "#f2c230");
  return p.canvas;
};

// --- Scenari: cielo a schermo intero, due strati in parallasse ripetibili in orizzontale, binario. ---

interface Scenario {
  cielo: [string, string];
  nuvole: string;
  lontano: [string, string];
  vicino: [string, string];
  dettaglio: string;
}

const SCENARI: Record<IdLivello, Scenario> = {
  facile: { cielo: ["#7fd3ff", "#c8eeff"], nuvole: "#ffffff", lontano: ["#8cc7a0", "#6fae85"], vicino: ["#5cc85c", "#3fa64a"], dettaglio: "#ff7eb6" },
  medio: { cielo: ["#a9c6f0", "#f3dcc6"], nuvole: "#f7f2ea", lontano: ["#b08870", "#8e6a58"], vicino: ["#a7a29a", "#88837c"], dettaglio: "#f2c230" },
  difficile: { cielo: ["#8cc6ec", "#e2f0f4"], nuvole: "#ffffff", lontano: ["#a3b4c4", "#8597aa"], vicino: ["#a9b0b6", "#8d959c"], dettaglio: "#e5733a" },
};

/** Onde ripetibili: periodi che dividono 480, così il bordo sinistro continua il destro. */
const profilo = (x: number, base: number, ampiezze: [number, number, number]) =>
  base +
  ampiezze[0] * Math.sin((x / 480) * Math.PI * 2 * 2) +
  ampiezze[1] * Math.sin((x / 480) * Math.PI * 2 * 5 + 1) +
  ampiezze[2] * Math.sin((x / 480) * Math.PI * 2 * 12 + 2);

export const disegnaCielo = (livello: IdLivello, larghezza: number, altezza: number): HTMLCanvasElement => {
  const s = SCENARI[livello];
  const p = new Pennello(larghezza, altezza);
  // Bande piatte invece di un gradiente: niente sfumature nella pixel art.
  const bande = 6;
  for (let i = 0; i < bande; i++) {
    const t = i / (bande - 1);
    p.ctx.globalAlpha = 1;
    p.rett(0, (i * altezza) / bande, larghezza, altezza / bande + 1, i < bande / 2 ? s.cielo[0] : s.cielo[1]);
    p.ctx.globalAlpha = t * 0.5;
    p.rett(0, (i * altezza) / bande, larghezza, altezza / bande + 1, s.cielo[1]);
  }
  p.ctx.globalAlpha = 1;
  for (const [x, y, r] of [[70, 40, 12], [200, 25, 9], [330, 50, 14], [430, 30, 8]] as const) {
    p.disco(x, y, r, s.nuvole).disco(x - r, y + 3, r - 3, s.nuvole).disco(x + r, y + 3, r - 3, s.nuvole);
  }
  return p.canvas;
};

export const disegnaStrato = (livello: IdLivello, quale: "lontano" | "vicino"): HTMLCanvasElement => {
  const s = SCENARI[livello];
  const altezza = quale === "lontano" ? 110 : 40;
  const p = new Pennello(480, altezza);
  const [chiaro, scuro] = s[quale];
  for (let x = 0; x < 480; x++) {
    const cima =
      quale === "lontano"
        ? livello === "facile"
          ? profilo(x, 60, [14, 8, 2])
          : 30 + (Math.floor(x / 40) % 3) * 18 + (x % 40 < 4 ? -10 : 0)
        : profilo(x, 18, [3, 2, 1]);
    p.rett(x, cima, 1, altezza - cima, chiaro);
    p.rett(x, cima, 1, 1, scuro);
  }
  for (let x = 12; x < 480; x += quale === "lontano" ? 96 : 32) {
    if (quale === "vicino") p.rett(x, 24, 3, 3, s.dettaglio);
    else p.rett(x, profilo(x, 60, [14, 8, 2]) - 8, 4, 8, s.dettaglio);
  }
  return p.canvas;
};

/** Binario 64×24: la cima delle rotaie è la riga 0, dove poggiano le ruote. */
export const disegnaBinario = (livello: IdLivello): HTMLCanvasElement => {
  const p = new Pennello(64, 36);
  p.rett(0, 6, 64, 30, livello === "facile" ? "#8f7a5c" : "#77706a");
  for (let x = 0; x < 64; x += 4) p.rett(x + ((x / 4) % 2), 9 + ((x / 4) % 3) * 6, 2, 2, "#5e5650");
  for (const x of [4, 36]) p.rett(x, 3, 20, 4, "#7a4f2b");
  p.rett(0, 0, 64, 3, "#c9c3d1").rett(0, 3, 64, 1, CONTORNO);
  return p.canvas;
};

/** Stazione d'arrivo 192×112, marciapiede sul bordo basso. */
export const disegnaStazione = (): HTMLCanvasElement => {
  const p = new Pennello(192, 112);
  p.blocco(24, 44, 144, 56, "#f1e3c6");
  for (let i = 0; i < 24; i++) p.rett(16 + i * 2, 44 - i, 160 - i * 4, 1, i === 0 ? CONTORNO : "#c8423a");
  p.disco(96, 60, 9, CONTORNO).disco(96, 60, 8, "#ffffff").rett(96, 54, 1, 6, CONTORNO).rett(96, 60, 4, 1, CONTORNO);
  for (const x of [40, 132]) p.blocco(x, 62, 18, 24, "#9be3ff");
  p.blocco(84, 72, 24, 28, "#7a4f2b");
  p.rett(95, 2, 2, 20, CONTORNO).blocco(97, 3, 14, 8, "#3cb043");
  p.blocco(0, 100, 192, 12, "#b8b2a8").rett(0, 100, 192, 2, "#f2c230");
  return p.canvas;
};

/** Miniature del menu, 96×54: lo scenario si riconosce senza leggere. */
export const disegnaMiniatura = (livello: IdLivello): HTMLCanvasElement => {
  const p = new Pennello(96, 54);
  p.ctx.drawImage(disegnaCielo(livello, 96, 54), 0, 0);
  const lontano = disegnaStrato(livello, "lontano");
  p.ctx.drawImage(lontano, 0, 0, 480, 110, 0, 14, 96 * 2.5, 110 / 2);
  p.rett(0, 44, 96, 10, SCENARI[livello].vicino[0]);
  p.rett(0, 44, 96, 2, "#c9c3d1");
  const icona: Record<IdLivello, () => void> = {
    facile: () => DISEGNI_OSTACOLI.fieno(sotto(p, 52, 28), 16, 16, 0),
    medio: () => DISEGNI_OSTACOLI.segnale(sotto(p, 60, 24), 12, 20, 0),
    difficile: () => DISEGNI_OSTACOLI.barili(sotto(p, 54, 30), 18, 14, 0),
  };
  icona[livello]();
  p.ctx.setTransform(1, 0, 0, 1, 0, 0);
  return p.canvas;
};

// Sposta l'origine per disegnare una figura piccola dentro un'altra.
const sotto = (p: Pennello, x: number, y: number): Pennello => {
  p.ctx.setTransform(1, 0, 0, 1, x, y);
  return p;
};

/** Icona della stazione per la barra del percorso, 16×16. */
export const disegnaIconaStazione = (): HTMLCanvasElement => {
  const p = new Pennello(16, 16);
  p.blocco(3, 8, 10, 7, "#f1e3c6");
  for (let i = 0; i < 5; i++) p.rett(2 + i, 7 - i, 12 - i * 2, 1, "#c8423a");
  p.rett(7, 0, 1, 4, CONTORNO).rett(8, 0, 4, 2, "#3cb043");
  p.rett(7, 11, 2, 4, "#7a4f2b");
  return p.canvas;
};
