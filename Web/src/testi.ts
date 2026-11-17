import type { IdLivello } from "./config/livelli.ts";
import type { IdColore, IdLocomotiva } from "./preferenze.ts";

// Tutti i testi visibili, in un modulo solo: una traduzione futura tocca questo file.
// Nel menu le parole sono didascalie: chi non legge sceglie dalle figure.
export const TESTI = {
  titolo: "Ciuf Ciuf",
  caricamento: "Caricamento…",
  erroreCaricamento: "Ooops! Il gioco non è riuscito a caricarsi.",
  ruotaDispositivo: "Ruota il dispositivo",

  menu: {
    locomotive: "Locomotiva",
    colori: "Colore",
    scenari: "Viaggio",
    gioca: "Parti!",
    audioAcceso: "Audio acceso",
    audioSpento: "Audio spento",
  },

  locomotive: {
    vapore: "A vapore",
    diesel: "Diesel",
    elettrica: "Elettrica",
  } satisfies Record<IdLocomotiva, string>,

  colori: {
    rosso: "Rosso",
    arancione: "Arancione",
    giallo: "Giallo",
    verde: "Verde",
    azzurro: "Azzurro",
    blu: "Blu",
    viola: "Viola",
    rosa: "Rosa",
  } satisfies Record<IdColore, string>,

  scenari: {
    facile: "Campagna",
    medio: "Stazione",
    difficile: "Ferrovia industriale",
  } satisfies Record<IdLivello, string>,

  livelli: {
    facile: "Facile",
    medio: "Medio",
    difficile: "Difficile",
  } satisfies Record<IdLivello, string>,

  partita: {
    pausa: "Pausa",
    riprendi: "Riprendi",
    menu: "Menu",
  },

  vittoria: {
    titolo: "Hai vinto!",
    ancora: "Ancora",
    menu: "Menu",
  },

  gameOver: {
    titolo: "Oh no!",
    riprova: "Riprova",
    menu: "Menu",
  },

  configurazioneNonValida: "Configurazione dei livelli non valida",
};
