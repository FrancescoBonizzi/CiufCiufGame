import type { IdLivello } from "../config/livelli.ts";
import { FOTOGRAMMA_LOCOMOTIVA, foglioLocomotiva, pxPerFotogramma } from "../grafica/locomotive.ts";
import { rampaDa } from "../grafica/palette.ts";
import { canvasDa } from "../grafica/immagini.ts";
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

/** px/s dell'anteprima: le ruote girano come a velocità moderata, ognuna secondo il suo raggio. */
const VELOCITA_ANTEPRIMA = 120;

/** Campione di colore 12×12 disegnato a pixel, coi toni della stessa rampa che ricolora la locomotiva. */
const campione = (colore: string): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = 12;
  canvas.height = 12;
  canvas.className = "pixel campione";
  const ctx = canvas.getContext("2d")!;
  const [luce, pieno, ombra] = rampaDa(colore).map(([r, g, b]) => `rgb(${r} ${g} ${b})`);
  // Righe del disco: c contorno, l luce, p pieno, o ombra.
  const disco = [
    "....cccc....",
    "..ccllllcc..",
    ".clllpppppc.",
    ".cllppppppc.",
    "cllppppppppc",
    "clpppppppppc",
    "cppppppppooc",
    "cppppppppooc",
    ".cppppppoooc",
    ".cppppooooc.",
    "..ccooooocc.",
    "....cccc....",
  ];
  const tinte: Record<string, string> = { c: "#2b2133", l: luce!, p: pieno!, o: ombra! };
  disco.forEach((riga, y) =>
    [...riga].forEach((k, x) => {
      if (k === ".") return;
      ctx.fillStyle = tinte[k]!;
      ctx.fillRect(x, y, 1, 1);
    }),
  );
  return canvas;
};

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
        <h1 class="titolo-logo" aria-label="${TESTI.titolo}">${ICONE.titolo}</h1>
        <canvas id="anteprima" class="pixel anteprima" width="${larghezza}" height="${altezza}"></canvas>
        <div class="azioni">
          <button id="btn-gioca" class="tasto-grande" aria-label="${TESTI.menu.gioca}">${ICONE.gioca}</button>
          <button id="btn-audio" class="tasto-medio" aria-pressed="${preferenze.audio}"></button>
        </div>
      </section>
      <section class="menu__scelte">
        <div class="riga" role="group" aria-label="${TESTI.menu.locomotive}">
          ${LOCOMOTIVE.map((id) =>
            scelta("locomotiva", id, TESTI.locomotive[id], `<canvas class="pixel figura-locomotiva" data-locomotiva="${id}" width="${larghezza}" height="${altezza}"></canvas>`, id === preferenze.locomotiva),
          ).join("")}
        </div>
        <div class="riga riga--colori" role="group" aria-label="${TESTI.menu.colori}">
          ${(Object.keys(COLORI) as IdColore[]).map((id) =>
            scelta("colore", id, TESTI.colori[id], `<span class="segnaposto-campione" data-colore="${id}"></span>`, id === preferenze.colore),
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

  for (const segnaposto of container.querySelectorAll<HTMLElement>(".segnaposto-campione")) {
    segnaposto.replaceWith(campione(COLORI[segnaposto.dataset["colore"] as IdColore]));
  }

  for (const segnaposto of container.querySelectorAll<HTMLElement>(".figura-scenario")) {
    const miniatura = canvasDa(`scenari/${segnaposto.dataset["scenario"] as IdLivello}-miniatura`);
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
  // La strada si accumula come in Locomotiva: cambiando locomotiva il giro continua da dov'era.
  let strada = 0;
  let prima: number | null = null;
  const anima = (ora: number) => {
    // Si ferma da solo quando il menu lascia il posto a un'altra pagina.
    if (!anteprima.isConnected) return;
    strada += prima === null ? 0 : (VELOCITA_ANTEPRIMA * Math.min(ora - prima, 100)) / 1000;
    prima = ora;
    const passi = Math.floor(strada / pxPerFotogramma(preferenze.locomotiva));
    const fotogramma = passi % FOTOGRAMMA_LOCOMOTIVA.numero;
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
      void unlockHowler().then(() => SoundManagerInstance.play("fischio-vapore"));
    }
  });
}
