import { ASSETS_ROOT } from "../assets/paths.ts";
import { OSTACOLI, type TipoOstacolo } from "../config/ostacoli.ts";
import { LOCOMOTIVE } from "../preferenze.ts";

// La pixel art (public/assets/images, prodotta da strumenti/pulisci-immagini.py) si carica una volta sola,
// prima del menu: chi disegna (menu, partita, fine partita) la trova pronta e resta sincrono.

// Un file per variante di ostacolo: ostacoli/<tipo>-<indice>, come le varianti di OSTACOLI.
const NOMI = [
  ...LOCOMOTIVE.map((tipo) => `locomotive/${tipo}`),
  ...(Object.keys(OSTACOLI) as TipoOstacolo[]).flatMap((tipo) => OSTACOLI[tipo].map((_, i) => `ostacoli/${tipo}-${i}`)),
  "stazione",
  "icona-stazione",
  "effetti/fumo",
  "effetti/scarico",
  "effetti/scintilla",
  ...(["facile", "medio", "difficile"] as const).flatMap((livello) =>
    ["cielo", "lontano", "vicino", "binario", "miniatura"].map((quale) => `scenari/${livello}-${quale}`),
  ),
];

export type NomeImmagine = string;

const caricate = new Map<NomeImmagine, HTMLImageElement>();

const carica = (nome: NomeImmagine) =>
  new Promise<void>((risolvi, rifiuta) => {
    const img = new Image();
    img.onload = () => {
      caricate.set(nome, img);
      risolvi();
    };
    img.onerror = () => rifiuta(new Error(`Immagine non caricata: ${nome}`));
    img.src = `${ASSETS_ROOT}images/${nome}.png`;
  });

export const caricaImmagini = async (): Promise<void> => {
  await Promise.all(NOMI.map(carica));
};

/** Copia su canvas, da ricolorare o ritagliare senza toccare l'originale. */
export const canvasDa = (nome: NomeImmagine): HTMLCanvasElement => {
  const img = caricate.get(nome);
  if (!img) throw new Error(`Immagine "${nome}" usata prima di caricaImmagini()`);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  canvas.getContext("2d")!.drawImage(img, 0, 0);
  return canvas;
};
