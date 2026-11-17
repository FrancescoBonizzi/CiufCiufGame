// Colore della locomotiva per sostituzione di palette: negli sprite la carrozzeria è disegnata con questa
// rampa di magenta, che nient'altro usa. Al caricamento quei pixel prendono la rampa del colore scelto,
// con la stessa luminosità gradino per gradino. Un'immagine per locomotiva, nessuno strato separato.

/** Dalla luce all'ombra. Le stesse tinte dei prompt in docs/prompt-pixel-art.md. */
export const RAMPA_MAGENTA = ["#ff9cff", "#ff3dff", "#c400c4", "#7a007a"] as const;

type Rgb = [number, number, number];

const daHex = (hex: string): Rgb => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const aHsl = ([r, g, b]: Rgb): [number, number, number] => {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255];
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === rr ? (gg - bb) / d + (gg < bb ? 6 : 0) : max === gg ? (bb - rr) / d + 2 : (rr - gg) / d + 4;
  return [h / 6, s, l];
};

const daHsl = (h: number, s: number, l: number): Rgb => {
  if (s === 0) return [l * 255, l * 255, l * 255].map(Math.round) as Rgb;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const canale = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [canale(h + 1 / 3), canale(h), canale(h - 1 / 3)].map((c) => Math.round(c * 255)) as Rgb;
};

/** Quattro tinte del colore scelto, con la luminosità dei quattro gradini magenta. */
export const rampaDa = (coloreBase: string): Rgb[] => {
  const [h, s] = aHsl(daHex(coloreBase));
  return RAMPA_MAGENTA.map((m) => daHsl(h, s, aHsl(daHex(m))[2]));
};

/** Copia dell'immagine con la carrozzeria magenta ridipinta nel colore scelto. */
export const ricolora = (sorgente: HTMLCanvasElement, coloreBase: string): HTMLCanvasElement => {
  const copia = document.createElement("canvas");
  copia.width = sorgente.width;
  copia.height = sorgente.height;
  const ctx = copia.getContext("2d")!;
  ctx.drawImage(sorgente, 0, 0);
  const immagine = ctx.getImageData(0, 0, copia.width, copia.height);
  const dati = immagine.data;

  const sostituzioni = new Map<number, Rgb>();
  const rampa = rampaDa(coloreBase);
  RAMPA_MAGENTA.forEach((m, i) => {
    const [r, g, b] = daHex(m);
    sostituzioni.set((r << 16) | (g << 8) | b, rampa[i]!);
  });

  for (let i = 0; i < dati.length; i += 4) {
    // Solo pixel pieni: un bordo semitrasparente lasciato dal generatore non ha una tinta esatta.
    if (dati[i + 3] !== 255) continue;
    const nuovo = sostituzioni.get((dati[i]! << 16) | (dati[i + 1]! << 8) | dati[i + 2]!);
    if (!nuovo) continue;
    [dati[i], dati[i + 1], dati[i + 2]] = nuovo;
  }
  ctx.putImageData(immagine, 0, 0);
  return copia;
};
