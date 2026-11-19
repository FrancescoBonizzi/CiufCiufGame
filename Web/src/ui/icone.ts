import { ASSETS_ROOT } from "../assets/paths.ts";

// Bottoni e icone sono pixel art (strumenti/pulisci-immagini.py, TASTI): bottone e icona sono un'immagine
// sola, mostrata a ×3 come tutta l'interfaccia. Chi non legge riconosce la figura; l'etichetta resta
// nell'aria-label del bottone.
const immagine = (file: string) =>
  `<img class="pixel" src="${ASSETS_ROOT}images/${file}.png" alt="" draggable="false">`;

export const ICONE = {
  gioca: immagine("tasti/gioca"),
  pausa: immagine("tasti/pausa"),
  casa: immagine("tasti/casa"),
  ancora: immagine("tasti/ancora"),
  audioAcceso: immagine("tasti/audio"),
  audioSpento: immagine("tasti/muto"),
  ruota: immagine("icone/ruota"),
  titolo: immagine("titolo"),
};
