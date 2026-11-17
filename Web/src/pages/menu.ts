import type { IdLivello } from "../config/livelli.ts";
import { foglioLocomotiva } from "../grafica/locomotive.ts";
import { FOTOGRAMMA_LOCOMOTIVA, disegnaMiniatura } from "../grafica/segnaposto.ts";
import {
  COLORI,
  LIVELLI_IN_ORDINE,
  LOCOMOTIVE,
  leggiPreferenze,
  salvaPreferenze,
  type IdColore,
  type IdLocomotiva,
  type Preferenze,
} from "../preferenze.ts";
import { unlockHowler } from "../services/AudioUnlocker.ts";
import { SoundManagerInstance } from "../services/SoundInstance.ts";
import { TESTI } from "../testi.ts";
import { ICONE } from "../ui/icone.ts";
import router from "./router.ts";

/** Fotogrammi al secondo dell'anteprima: le ruote girano come a velocità moderata. */
const FOTOGRAMMI_AL_SECONDO = 10;

// Menu illustrato, usabile da chi non legge: tre righe di figure e un grande bottone ▶. Le parole sono
// didascalie. Ogni scelta si salva subito, così la prossima visita riparte da lì.
export function renderMenuPage(container: HTMLElement): void {
  const preferenze = leggiPreferenze();
  const { larghezza, altezza } = FOTOGRAMMA_LOCOMOTIVA;

  const scelta = (riga: string, valore: string, etichetta: string, figura: string, selezionata: boolean) => `
    <button class="scelta" data-riga="${riga}" data-valore="${valore}" aria-pressed="${selezionata}" aria-label="${etichetta}">
      ${figura}
      <span class="didascalia">${etichetta}</span>
    </button>`;

  container.innerHTML = `
    <main class="menu">
      <section class="menu__anteprima">
        <h1 class="titolo">${TESTI.titolo}</h1>
        <canvas id="anteprima" class="pixel anteprima" width="${larghezza}" height="${altezza}"></canvas>
        <button id="btn-gioca" class="tasto-grande" aria-label="${TESTI.menu.gioca}">${ICONE.gioca}</button>
        <button id="btn-audio" class="tasto-piccolo" aria-pressed="${preferenze.audio}"></button>
      </section>
      <section class="menu__scelte">
        <div class="riga" role="group" aria-label="${TESTI.menu.locomotive}">
          ${LOCOMOTIVE.map((id) =>
            scelta("locomotiva", id, TESTI.locomotive[id], `<canvas class="pixel figura-locomotiva" data-locomotiva="${id}" width="${larghezza}" height="${altezza}"></canvas>`, id === preferenze.locomotiva),
          ).join("")}
        </div>
        <div class="riga riga--colori" role="group" aria-label="${TESTI.menu.colori}">
          ${(Object.keys(COLORI) as IdColore[]).map((id) =>
            scelta("colore", id, TESTI.colori[id], `<span class="campione" style="background:${COLORI[id]}"></span>`, id === preferenze.colore),
          ).join("")}
        </div>
        <div class="riga" role="group" aria-label="${TESTI.menu.scenari}">
          ${LIVELLI_IN_ORDINE.map((id) =>
            scelta("livello", id, `${TESTI.scenari[id]} · ${TESTI.livelli[id]}`, `<span class="figura-scenario" data-scenario="${id}"></span>`, id === preferenze.livello),
          ).join("")}
        </div>
      </section>
    </main>
  `;

  for (const segnaposto of container.querySelectorAll<HTMLElement>(".figura-scenario")) {
    const miniatura = disegnaMiniatura(segnaposto.dataset["scenario"] as IdLivello);
    miniatura.classList.add("pixel");
    segnaposto.replaceWith(miniatura);
  }

  const anteprima = container.querySelector<HTMLCanvasElement>("#anteprima")!;

  // Le figure delle locomotive si ridipingono col colore scelto: l'anteprima dal vivo è la stessa
  // sostituzione di palette della partita.
  const ridipingi = () => {
    for (const figura of container.querySelectorAll<HTMLCanvasElement>(".figura-locomotiva")) {
      const ctx = figura.getContext("2d")!;
      ctx.clearRect(0, 0, larghezza, altezza);
      ctx.drawImage(foglioLocomotiva(figura.dataset["locomotiva"] as IdLocomotiva, preferenze.colore), 0, 0, larghezza, altezza, 0, 0, larghezza, altezza);
    }
  };
  ridipingi();

  const ctxAnteprima = anteprima.getContext("2d")!;
  const anima = (ora: number) => {
    // Si ferma da solo quando il menu lascia il posto a un'altra pagina.
    if (!anteprima.isConnected) return;
    const fotogramma = Math.floor((ora / 1000) * FOTOGRAMMI_AL_SECONDO) % FOTOGRAMMA_LOCOMOTIVA.numero;
    ctxAnteprima.clearRect(0, 0, larghezza, altezza);
    ctxAnteprima.drawImage(foglioLocomotiva(preferenze.locomotiva, preferenze.colore), fotogramma * larghezza, 0, larghezza, altezza, 0, 0, larghezza, altezza);
    requestAnimationFrame(anima);
  };
  requestAnimationFrame(anima);

  for (const bottone of container.querySelectorAll<HTMLButtonElement>(".scelta")) {
    bottone.addEventListener("click", () => {
      const { riga, valore } = bottone.dataset as { riga: keyof Preferenze; valore: string };
      (preferenze as unknown as Record<string, string>)[riga] = valore;
      salvaPreferenze(preferenze);
      for (const altro of container.querySelectorAll<HTMLButtonElement>(`.scelta[data-riga="${riga}"]`)) {
        altro.setAttribute("aria-pressed", String(altro === bottone));
      }
      if (riga === "colore") ridipingi();
    });
  }

  container.querySelector("#btn-gioca")?.addEventListener("click", () => router.navigate("/game"));

  const audio = container.querySelector<HTMLButtonElement>("#btn-audio")!;
  const mostraAudio = () => {
    audio.innerHTML = preferenze.audio ? ICONE.audioAcceso : ICONE.audioSpento;
    audio.setAttribute("aria-label", preferenze.audio ? TESTI.menu.audioAcceso : TESTI.menu.audioSpento);
    audio.setAttribute("aria-pressed", String(preferenze.audio));
  };
  mostraAudio();
  audio.addEventListener("click", () => {
    preferenze.audio = !preferenze.audio;
    salvaPreferenze(preferenze);
    SoundManagerInstance.impostaAudio(preferenze.audio);
    mostraAudio();
    if (preferenze.audio) {
      // Nello stack del gesto, prima di ogni await: Safari sblocca solo così. Il fischio conferma che si sente.
      void unlockHowler().then(() => SoundManagerInstance.play("fischio"));
    }
  });
}
