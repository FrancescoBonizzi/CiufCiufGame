import { GAME } from "../config.ts";
import { COMUNE, type IdLivello, type Livello } from "./livelli.ts";
import { OSTACOLI, type VarianteOstacolo } from "./ostacoli.ts";

// Il guasto che previene: un ostacolo impossibile che nessuno nota giocando. In sviluppo blocca l'avvio,
// e un test lo esegue sulla configurazione rilasciata.

/**
 * Tempo in cui una pressione supera un ostacolo appoggiato a terra:
 * `T · √(1 − h / H) − (L + w) / v`. Negativo: non si supera nemmeno premendo al momento perfetto.
 * Rallentare stringe la finestra: la locomotiva resta sopra l'ostacolo più a lungo.
 */
export const finestraDiSalto = (livello: Livello, altezzaOstacolo: number, larghezzaOstacolo: number, velocita: number) => {
  const { durataSecondi: T, altezza: H } = livello.salto;
  if (altezzaOstacolo >= H) return -Infinity;
  return T * Math.sqrt(1 - altezzaOstacolo / H) - (livello.hitboxLocomotiva.larghezza + larghezzaOstacolo) / velocita;
};

const validaVariante = (livello: Livello, nome: string, v: VarianteOstacolo): string[] => {
  const errori: string[] = [];
  const { iniziale, massima } = livello.velocita;
  const altezzaLocomotiva = livello.hitboxLocomotiva.altezza;

  if (v.sollevamento === 0) {
    const finestra = finestraDiSalto(livello, v.hitbox.altezza, v.hitbox.larghezza, iniziale);
    if (finestra < livello.verifica.finestraMinimaSecondi) {
      errori.push(
        `${nome}: finestra di salto ${finestra.toFixed(3)} s a ${iniziale} px/s, sotto ${livello.verifica.finestraMinimaSecondi} s`,
      );
    }
    return errori;
  }

  if (v.sollevamento < altezzaLocomotiva) {
    errori.push(`${nome}: bordo a ${v.sollevamento} px, la locomotiva alta ${altezzaLocomotiva} px non ci passa sotto`);
  }
  if (livello.salto.altezza + altezzaLocomotiva <= v.sollevamento) {
    errori.push(`${nome}: in salto la locomotiva non arriva al bordo a ${v.sollevamento} px, il salto non è punito`);
  }
  // Alla velocità massima la finestra è la più larga: se lì non si scavalca, non si scavalca mai.
  const sopra = finestraDiSalto(livello, v.sollevamento + v.hitbox.altezza, v.hitbox.larghezza, massima);
  if (sopra > 0) {
    errori.push(`${nome}: si scavalca saltando (finestra ${sopra.toFixed(3)} s a ${massima} px/s)`);
  }
  return errori;
};

export const validaLivello = (id: string, livello: Livello): string[] => {
  const errori: string[] = [];
  const err = (messaggio: string) => errori.push(`${id}: ${messaggio}`);
  const { iniziale, massima, quotaDurataAlMassimo } = livello.velocita;

  if (iniziale <= 0 || massima < iniziale) err(`velocità ${iniziale} → ${massima} px/s non valida`);
  if (quotaDurataAlMassimo <= 0 || quotaDurataAlMassimo > 1) err(`quotaDurataAlMassimo ${quotaDurataAlMassimo} fuori da (0, 1]`);
  if (livello.tipi.length === 0) err("nessun tipo di ostacolo");
  if (livello.tipi.some((t) => t.peso <= 0)) err("un tipo ha peso ≤ 0 e non uscirebbe mai");
  if (livello.nonRipetereTipo && livello.tipi.length < 2) err("nonRipetereTipo con un tipo solo blocca il generatore");
  const { min, max } = livello.ostacoliPerSequenza;
  if (min < 1 || max < min || !Number.isInteger(min) || !Number.isInteger(max)) err(`ostacoliPerSequenza ${min}–${max} non valido`);

  for (const { tipo } of livello.tipi) {
    OSTACOLI[tipo].forEach((variante, i) => {
      for (const e of validaVariante(livello, `${tipo}[${i}]`, variante)) err(e);
    });
  }

  const distanzaMinima = Math.min(livello.distanzaFraOstacoliSecondi.inizio, livello.distanzaFraOstacoliSecondi.fine);
  const servePerSalto = livello.salto.durataSecondi + COMUNE.recuperoDopoSaltoSecondi;
  if (distanzaMinima < servePerSalto) {
    err(`distanza fra ostacoli ${distanzaMinima} s, sotto durata del salto + recupero (${servePerSalto.toFixed(2)} s)`);
  }

  const anticipo = (GAME.width - COMUNE.locomotivaX) / massima;
  if (anticipo < livello.verifica.anticipoMinimoSecondi) {
    err(`anticipo ${anticipo.toFixed(2)} s a ${massima} px/s, sotto ${livello.verifica.anticipoMinimoSecondi} s`);
  }

  const piuLargo = Math.max(...livello.tipi.flatMap(({ tipo }) => OSTACOLI[tipo].map((v) => v.larghezza)));
  const perUscire = (GAME.width + piuLargo) / iniziale;
  if (livello.chiusuraSecondi < perUscire) {
    err(`chiusura ${livello.chiusuraSecondi} s: l'ultimo ostacolo può servirne ${perUscire.toFixed(2)} per uscire prima della stazione`);
  }

  // Dopo un urto il treno è lento e la finestra si stringe: il prossimo ostacolo deve trovarlo già ripartito.
  if (livello.urto.effetto === "sbalzo" && livello.urto.recuperoSecondi > distanzaMinima) {
    err(`recupero dopo l'urto ${livello.urto.recuperoSecondi} s, più lungo della distanza fra ostacoli ${distanzaMinima} s`);
  }

  return errori;
};

export const validaConfigurazione = (livelli: Record<IdLivello, Livello>): string[] =>
  Object.entries(livelli).flatMap(([id, livello]) => validaLivello(id, livello));
