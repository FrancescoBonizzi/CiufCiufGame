import { ASSETS_ROOT } from "../assets/paths.ts";
import type { IdLivello } from "../config/livelli.ts";
import { OSTACOLI, type TipoOstacolo } from "../config/ostacoli.ts";
import { LIVELLI_IN_ORDINE, LOCOMOTIVE, type IdLocomotiva } from "../preferenze.ts";

// La pixel art (public/assets/images, prodotta da strumenti/pulisci-immagini.py) si carica una volta sola,
// prima del menu: chi disegna (menu, partita, fine partita) la trova pronta e resta sincrono.

export type Effetto = "fumo" | "scarico" | "scintilla";
const EFFETTI: Effetto[] = ["fumo", "scarico", "scintilla"];
type StratoScenario = "cielo" | "lontano" | "vicino" | "binario" | "miniatura";
const STRATI: StratoScenario[] = ["cielo", "lontano", "vicino", "binario", "miniatura"];
export type Pezzo = "legna" | "paglia" | "asse" | "stella" | "polvere";
const PEZZI: Pezzo[] = ["legna", "paglia", "asse", "stella", "polvere"];
// Usate dal DOM (icone.ts, styles.css): precaricate anche loro, così il menu non compare a pezzi.
const INTERFACCIA = [
  "tasti/gioca", "tasti/pausa", "tasti/casa", "tasti/ancora", "tasti/audio", "tasti/muto", "icone/ruota",
  "titolo", "menu-sfondo", "interfaccia/cornice", "interfaccia/cornice-scelta",
] as const;

export type NomeImmagine =
  | `locomotive/${IdLocomotiva}`
  | `ostacoli/${TipoOstacolo}-${number}`
  | `effetti/${Effetto}`
  | `scenari/${IdLivello}-${StratoScenario}`
  | `pezzi/${Pezzo}`
  | (typeof INTERFACCIA)[number]
  | "stazione"
  | "icona-stazione";

// Un file per variante di ostacolo: ostacoli/<tipo>-<indice>, come le varianti di OSTACOLI.
const NOMI: NomeImmagine[] = [
  ...LOCOMOTIVE.map((tipo) => `locomotive/${tipo}` as const),
  ...(Object.keys(OSTACOLI) as TipoOstacolo[]).flatMap((tipo) =>
    OSTACOLI[tipo].map((_, i) => `ostacoli/${tipo}-${i}` as const),
  ),
  "stazione",
  "icona-stazione",
  ...EFFETTI.map((nome) => `effetti/${nome}` as const),
  ...PEZZI.map((nome) => `pezzi/${nome}` as const),
  ...INTERFACCIA,
  ...LIVELLI_IN_ORDINE.flatMap((livello) => STRATI.map((quale) => `scenari/${livello}-${quale}` as const)),
];

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
  // La hitbox si calcola dalla misura in ostacoli.ts: uno sprite di misura diversa farebbe urtare l'aria.
  // pulisci-immagini.py ne tiene una copia (OSTACOLI): chi cambia una misura rigenera lo sprite.
  const sbagliate = (Object.keys(OSTACOLI) as TipoOstacolo[]).flatMap((tipo) =>
    OSTACOLI[tipo].flatMap(({ larghezza, altezza }, i) => {
      const img = caricate.get(`ostacoli/${tipo}-${i}`)!;
      return img.width === larghezza && img.height === altezza
        ? []
        : [`ostacoli/${tipo}-${i}: ${img.width}×${img.height} invece di ${larghezza}×${altezza}`];
    }),
  );
  if (sbagliate.length > 0) throw new Error(`Sprite fuori misura: ${sbagliate.join("; ")}`);
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
