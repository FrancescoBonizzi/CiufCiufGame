// Misure degli ostacoli, le stesse di docs/prompt-pixel-art.md: quando arriveranno gli sprite veri le hitbox
// si rileggono su di loro (fase 6) e validaConfigurazione deve restare verde.

export type TipoOstacolo =
  | "legna"
  | "fieno"
  | "staccionata"
  | "cassa"
  | "carrello"
  | "sbarra"
  | "segnale"
  | "pallet"
  | "barili"
  | "casse"
  | "trave";

export interface VarianteOstacolo {
  /** Misura della figura, in px di gioco. */
  larghezza: number;
  altezza: number;
  /** Hitbox centrata in orizzontale e appoggiata al bordo basso della figura: più piccola, perché un urto di striscio non conti. */
  hitbox: { larghezza: number; altezza: number };
  /** Distanza del bordo basso dal binario: 0 per tutto ciò che sta a terra. */
  sollevamento: number;
}

const aTerra = (larghezza: number, altezza: number, hitboxL: number, hitboxA: number): VarianteOstacolo => ({
  larghezza,
  altezza,
  hitbox: { larghezza: hitboxL, altezza: hitboxA },
  sollevamento: 0,
});

// Più varianti per tipo solo nel difficile: la varietà di dimensioni sta dentro il tipo, così una sequenza resta omogenea.
export const OSTACOLI: Record<TipoOstacolo, VarianteOstacolo[]> = {
  legna: [aTerra(36, 28, 30, 24)],
  fieno: [aTerra(32, 32, 26, 28)],
  staccionata: [aTerra(40, 24, 34, 20)],
  cassa: [aTerra(28, 28, 24, 24)],
  carrello: [aTerra(40, 28, 34, 22)],
  sbarra: [aTerra(44, 24, 38, 18)],
  segnale: [aTerra(20, 32, 10, 28)],
  pallet: [aTerra(36, 16, 32, 12)],
  barili: [aTerra(18, 26, 14, 22), aTerra(36, 26, 32, 22)],
  casse: [aTerra(20, 20, 16, 16), aTerra(20, 40, 16, 36), aTerra(40, 40, 36, 36)],
  // Da terra la locomotiva ci passa sotto, in salto la colpisce: si supera non premendo niente.
  trave: [{ larghezza: 96, altezza: 12, hitbox: { larghezza: 92, altezza: 12 }, sollevamento: 48 }],
};
