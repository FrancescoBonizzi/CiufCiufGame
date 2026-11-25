import { LIVELLI } from "./config/livelli.ts";
import { validaConfigurazione } from "./config/validaConfigurazione.ts";
import { ASSETS_ROOT } from "./assets/paths.ts";
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
  wireAudioUnlockOnce(() => SoundManagerInstance.audioSbloccato());
  // La musica suona anche nel menu: con la scheda nascosta si ferma ovunque. La partita in più si mette in pausa.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) SoundManagerInstance.sospendi("scheda");
    else SoundManagerInstance.riprendi("scheda");
  });
  // Font e immagini del CSS passano da ASSETS_ROOT come il resto: un url assoluto in styles.css ignorerebbe la
  // sottocartella in cui il gioco è pubblicato.
  const radice = document.documentElement.style;
  for (const nome of ["menu-sfondo", "interfaccia/cornice", "interfaccia/cornice-scelta"]) {
    radice.setProperty(`--img-${nome.replace("interfaccia/", "")}`, `url("${ASSETS_ROOT}images/${nome}.png")`);
  }
  // Il fondo di menu e pagine (480×270) si ingrandisce del fattore intero più piccolo che copre la finestra.
  const scalaSfondo = () =>
    radice.setProperty("--scala-sfondo", String(Math.ceil(Math.max(innerWidth / 480, innerHeight / 270))));
  scalaSfondo();
  addEventListener("resize", scalaSfondo);
  // Su mobile la barra degli indirizzi che compare e scompare non sempre emette resize sulla finestra.
  visualViewport?.addEventListener("resize", scalaSfondo);
  const font = new FontFace("Pixelify Sans", `url("${ASSETS_ROOT}fonts/pixelify-sans-latin.woff2")`, { weight: "400 700" });
  document.fonts.add(font);

  // Font e immagini prima del router: menu e partita le disegnano senza attese. Il font è un di più: se non
  // arriva, il CSS ricade su system-ui e il gioco parte lo stesso.
  const barra = document.querySelector<HTMLElement>(".avvio__barra");
  // Il font vale quanto un'immagine: la barra conta le immagini arrivate più il font.
  let immagini = { fatte: 0, totale: 1 };
  let fontPronto = 0;
  const aggiornaBarra = () => {
    const percentuale = Math.round(((immagini.fatte + fontPronto) / (immagini.totale + 1)) * 100);
    barra?.style.setProperty("--avanzamento", `${percentuale}%`);
    barra?.setAttribute("aria-valuenow", String(percentuale));
  };
  const caricaFont = font
    .load()
    .catch((e: unknown) => console.warn("Font non caricato, uso system-ui", e))
    .finally(() => {
      fontPronto = 1;
      aggiornaBarra();
    });
  const caricaTutteLeImmagini = caricaImmagini((fatte, totale) => {
    immagini = { fatte, totale };
    aggiornaBarra();
  });
  Promise.all([caricaFont, caricaTutteLeImmagini])
    .then(initializeRouter)
    .catch((e: unknown) => {
      console.error(e);
      document.getElementById("app")!.innerHTML = `<main class="page"><h1>${TESTI.erroreCaricamento}</h1></main>`;
    });
}
