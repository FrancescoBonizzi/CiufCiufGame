import { LIVELLI } from "./config/livelli.ts";
import { validaConfigurazione } from "./config/validaConfigurazione.ts";
import { caricaImmagini } from "./grafica/immagini.ts";
import { initializeRouter } from "./pages/router.ts";
import { leggiPreferenze } from "./preferenze.ts";
import { wireAudioUnlockOnce } from "./services/AudioUnlocker.ts";
import { SoundManagerInstance } from "./services/SoundInstance.ts";
import { TESTI } from "./testi.ts";

// In sviluppo un ostacolo impossibile blocca l'avvio: chi cambia livelli.ts lo vede subito. In produzione
// la stessa verifica gira nel test sulla configurazione rilasciata.
const errori = import.meta.env.DEV ? validaConfigurazione(LIVELLI) : [];

if (errori.length > 0) {
  console.error(errori);
  const app = document.getElementById("app")!;
  app.innerHTML = `<main class="page"><h1>${TESTI.configurazioneNonValida}</h1><ul class="errori"></ul></main>`;
  const lista = app.querySelector(".errori")!;
  for (const errore of errori) lista.appendChild(document.createElement("li")).textContent = errore;
} else {
  SoundManagerInstance.impostaAudio(leggiPreferenze().audio);
  // Prima lo sblocco audio: il router disegna subito il menu.
  wireAudioUnlockOnce();
  // Le immagini prima del router: menu e partita le disegnano senza attese.
  caricaImmagini().then(initializeRouter, (e) => {
    console.error(e);
    document.getElementById("app")!.innerHTML = `<main class="page"><h1>${TESTI.erroreCaricamento}</h1></main>`;
  });
}
