import { FOTOGRAMMA_LOCOMOTIVA, foglioLocomotiva } from "../grafica/locomotive.ts";
import { canvasDa } from "../grafica/immagini.ts";
import { leggiPreferenze } from "../preferenze.ts";
import { TESTI } from "../testi.ts";
import { ICONE } from "../ui/icone.ts";
import router from "./router.ts";

type Esito = "vittoria" | "sconfitta";

// Fine partita: la stessa pagina per vittoria e sconfitta, con il bottone grande per rigiocare.
// Nessun punteggio: il traguardo è arrivare.
export function renderEsitoPage(container: HTMLElement, esito: Esito): void {
  const testi = esito === "vittoria" ? TESTI.vittoria : TESTI.gameOver;
  const rigioca = esito === "vittoria" ? TESTI.vittoria.ancora : TESTI.gameOver.riprova;

  container.innerHTML = `
    <main class="page esito esito--${esito}">
      <div class="esito__figura"></div>
      <h1 class="titolo">${testi.titolo}</h1>
      <nav class="azioni">
        <button id="btn-ancora" class="tasto-grande" aria-label="${rigioca}">${ICONE.ancora}</button>
        <button id="btn-menu" class="tasto-medio" aria-label="${testi.menu}">${ICONE.casa}</button>
      </nav>
    </main>
  `;

  const preferenze = leggiPreferenze();
  const { larghezza, altezza } = FOTOGRAMMA_LOCOMOTIVA;
  const figura = container.querySelector(".esito__figura")!;
  const locomotiva = document.createElement("canvas");
  locomotiva.width = larghezza;
  locomotiva.height = altezza;
  locomotiva.className = "pixel anteprima";
  locomotiva
    .getContext("2d")!
    .drawImage(foglioLocomotiva(preferenze.locomotiva, preferenze.colore), 0, 0, larghezza, altezza, 0, 0, larghezza, altezza);
  figura.appendChild(locomotiva);
  if (esito === "vittoria") {
    const stazione = canvasDa("icona-stazione");
    stazione.className = "pixel esito__stazione";
    figura.appendChild(stazione);
  }

  container.querySelector("#btn-ancora")?.addEventListener("click", () => router.navigate("/game"));
  container.querySelector("#btn-menu")?.addEventListener("click", () => router.navigate("/"));
}
