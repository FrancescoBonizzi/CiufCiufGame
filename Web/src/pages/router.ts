import Navigo from "navigo";
import { destroyGame, initGame } from "./gamebootstrap.ts";
import { renderEsitoPage } from "./esito.ts";
import { renderMenuPage } from "./menu.ts";

// NOTE: modalità hash (#/game). Il gioco è un sito statico in una sottocartella del sito che lo ospita:
// con l'hash nessuna rotta arriva al server, quindi non servono regole di rewrite.
const router = new Navigo("/", { hash: true });

export function initializeRouter() {
  const appElement = document.getElementById("app");
  if (!appElement) {
    console.error("Elemento #app non trovato");
    return;
  }

  router
    .on("/", () => renderMenuPage(appElement))
    .on("/game", () => initGame(appElement), {
      // Unico punto di uscita dalla partita, qualunque sia la strada: fine, menu dalla pausa, tasto indietro.
      leave: (done) => {
        destroyGame();
        done();
      },
    })
    .on("/vittoria", () => renderEsitoPage(appElement, "vittoria"))
    .on("/gameover", () => renderEsitoPage(appElement, "sconfitta"))
    .notFound(() => renderMenuPage(appElement))
    .resolve();
}

export default router;
