import { GAME } from "./config.ts";
import type { IdLivello } from "./config/livelli.ts";

export type IdLocomotiva = "vapore" | "diesel" | "elettrica";
export type IdColore = "rosso" | "arancione" | "giallo" | "verde" | "azzurro" | "blu" | "viola" | "rosa";

export const LOCOMOTIVE: IdLocomotiva[] = ["vapore", "diesel", "elettrica"];
export const LIVELLI_IN_ORDINE: IdLivello[] = ["facile", "medio", "difficile"];

/** Colore base di ogni scelta: la rampa della carrozzeria si ricava da qui (grafica/palette.ts). */
export const COLORI: Record<IdColore, string> = {
  rosso: "#e83b3b",
  arancione: "#f28c28",
  giallo: "#f5d020",
  verde: "#3cb043",
  azzurro: "#38b6ff",
  blu: "#3557d6",
  viola: "#8e44c9",
  rosa: "#ff6fb5",
};

export interface Preferenze {
  locomotiva: IdLocomotiva;
  colore: IdColore;
  livello: IdLivello;
  audio: boolean;
}

const PREDEFINITE: Preferenze = { locomotiva: "vapore", colore: "rosso", livello: "facile", audio: true };

const CHIAVE = `${GAME.storagePrefix}.preferenze`;

const unoDi = <T extends string>(valore: unknown, ammessi: readonly T[], predefinito: T): T =>
  ammessi.includes(valore as T) ? (valore as T) : predefinito;

// Ogni campo si controlla da solo: un valore illeggibile (versione vecchia, mano sullo storage) torna al
// default senza buttare gli altri.
export const leggiPreferenze = (): Preferenze => {
  let salvate: Record<string, unknown> = {};
  try {
    const grezzo: unknown = JSON.parse(localStorage.getItem(CHIAVE) ?? "{}");
    if (grezzo && typeof grezzo === "object") salvate = grezzo as Record<string, unknown>;
  } catch {}
  return {
    locomotiva: unoDi(salvate["locomotiva"], LOCOMOTIVE, PREDEFINITE.locomotiva),
    colore: unoDi(salvate["colore"], Object.keys(COLORI) as IdColore[], PREDEFINITE.colore),
    livello: unoDi(salvate["livello"], LIVELLI_IN_ORDINE, PREDEFINITE.livello),
    audio: typeof salvate["audio"] === "boolean" ? salvate["audio"] : PREDEFINITE.audio,
  };
};

// localStorage lancia con lo storage bloccato (navigazione privata di alcuni browser): si gioca lo stesso.
export const salvaPreferenze = (preferenze: Preferenze): void => {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(preferenze));
  } catch {}
};
