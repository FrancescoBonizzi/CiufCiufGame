import { Application, TextureSource } from "pixi.js";
import { loadAssets } from "../assets/AssetsLoader.ts";
import { GAME } from "../config.ts";
import Game from "../Game.ts";
import { leggiPreferenze } from "../preferenze.ts";
import { SoundManagerInstance } from "../services/SoundInstance.ts";
import { TESTI } from "../testi.ts";
import { ICONE } from "../ui/icone.ts";
import LoadingText from "../ui/LoadingText.ts";
import router from "./router.ts";

// Ogni ingresso in /game crea un'Application nuova e ogni uscita la distrugge: niente stato che passa
// da una partita all'altra. Le texture restano nella cache di Assets, quindi la seconda partita non ricarica.
let app: Application | null = null;
let game: Game | null = null;
let gameContainer: HTMLDivElement | null = null;
let orientationOverlay: HTMLDivElement | null = null;
let pauseOverlay: HTMLDivElement | null = null;
let resizeObserver: ResizeObserver | null = null;

// Pause indipendenti: il ticker gira solo se nessuna è attiva.
let pausedByOrientation = false;
let pausedByHiddenPage = false;
let pausedByPlayer = false;

// WARNING: initGame attende più volte (init, caricamento). Se nel frattempo si esce da /game, destroyGame
// ha già fatto pulizia: ogni ripresa dopo un await controlla di essere ancora la sessione corrente,
// altrimenti la partita partirebbe in un contenitore staccato, con la musica sopra il menu.
let session = 0;

export async function initGame(container: HTMLElement) {
  destroyGame();
  const mySession = session;

  container.innerHTML = `
    <div id="game-wrapper">
      <div id="game-container"></div>
      <button id="btn-pausa" class="tasto-pausa" aria-label="${TESTI.partita.pausa}">${ICONE.pausa}</button>
      <div id="pause-overlay" class="overlay-pausa">
        <button id="btn-riprendi" class="tasto-grande" aria-label="${TESTI.partita.riprendi}">${ICONE.gioca}</button>
        <button id="btn-pausa-menu" class="tasto-medio" aria-label="${TESTI.partita.menu}">${ICONE.casa}</button>
      </div>
      <div id="orientation-overlay">
        <!-- Lucide rotate-cw, licenza ISC. Un SVG e non un carattere Unicode: il glifo ha un riquadro
             asimmetrico e la rotazione animata viene storta. -->
        <svg class="rotate-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
        <p>${TESTI.ruotaDispositivo}</p>
      </div>
    </div>
  `;
  gameContainer = container.querySelector<HTMLDivElement>("#game-container");
  orientationOverlay = container.querySelector<HTMLDivElement>("#orientation-overlay");
  pauseOverlay = container.querySelector<HTMLDivElement>("#pause-overlay");
  const wrapper = container.querySelector<HTMLDivElement>("#game-wrapper");
  if (!gameContainer || !wrapper) return;

  // Un tocco sui bottoni della pausa non arriva all'area di gioco, quindi non fa saltare.
  for (const elemento of container.querySelectorAll("#btn-pausa, #pause-overlay")) {
    elemento.addEventListener("pointerdown", (e) => e.stopPropagation());
  }
  container.querySelector("#btn-pausa")?.addEventListener("click", (e) => {
    // Il fuoco resta sul bottone: lo spazio dopo la ripresa lo riattiverebbe.
    (e.currentTarget as HTMLElement).blur();
    setPausedByPlayer(true);
  });
  container.querySelector("#btn-riprendi")?.addEventListener("click", () => setPausedByPlayer(false));
  container.querySelector("#btn-pausa-menu")?.addEventListener("click", () => router.navigate("/"));

  if (GAME.pixelArt) {
    // Globale e letto alla creazione delle texture: va impostato prima di caricarne qualunque.
    TextureSource.defaultOptions.scaleMode = "nearest";
  }

  try {
    const newApp = new Application();
    // Lancia senza WebGL né WebGPU (accelerazione hardware spenta): finisce nel catch sotto.
    await newApp.init({
      width: GAME.width,
      height: GAME.height,
      background: GAME.background,
      antialias: !GAME.pixelArt,
      autoDensity: true,
      // Oltre 2x la memoria del canvas cresce col quadrato senza differenza visibile.
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });
    if (mySession !== session) {
      newApp.destroy(true, { children: true });
      return;
    }
    app = newApp;
    app.canvas.classList.toggle("pixel-art", GAME.pixelArt);
    gameContainer.appendChild(app.canvas);

    // Esiste su Android Chrome; iOS Safari non la implementa, e lì resta l'overlay. Non si attende:
    // ogni await in più è un punto in cui l'uscita dalla partita può arrivare a metà.
    (screen.orientation as unknown as { lock(o: string): Promise<void> }).lock?.(GAME.orientation)?.catch(() => {});

    // ResizeObserver e non window.resize: su mobile la barra degli indirizzi che compare e scompare
    // non sempre emette resize, ma cambia la misura del contenitore.
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(gameContainer);
    resize();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("keydown", onKeyDown);

    // Il font prima di qualunque Text, anche la scritta di caricamento.
    await document.fonts.load(`32px ${GAME.fontFamily}`);
    if (mySession !== session) return;
    const loadingText = new LoadingText(app, TESTI.caricamento);
    loadingText.show();
    const assets = await loadAssets();
    if (mySession !== session) return;
    loadingText.hide();

    // replaceState: con "indietro" dalla fine si torna al menu, non in una partita nuova.
    game = new Game(app, assets, SoundManagerInstance, leggiPreferenze(), wrapper, {
      onVittoria: () => router.navigate("/vittoria", { historyAPIMethod: "replaceState" }),
      onSconfitta: () => router.navigate("/gameover", { historyAPIMethod: "replaceState" }),
    });
    app.ticker.add((ticker) => game?.update(ticker));
  } catch (e) {
    console.error(e);
    alert(TESTI.erroreCaricamento);
    router.navigate("/");
  }
}

export function destroyGame() {
  session++;
  document.removeEventListener("visibilitychange", onVisibilityChange);
  window.removeEventListener("keydown", onKeyDown);
  resizeObserver?.disconnect();
  resizeObserver = null;
  try {
    (screen.orientation as unknown as { unlock(): void }).unlock();
  } catch {}

  SoundManagerInstance.stopAll();
  game?.destroy();
  game = null;
  // children: true distrugge l'albero della scena; le texture no, perché restano in cache per la prossima partita.
  app?.destroy(true, { children: true });
  app = null;
  gameContainer = null;
  orientationOverlay = null;
  pauseOverlay = null;
  pausedByOrientation = false;
  pausedByHiddenPage = false;
  pausedByPlayer = false;
}

function resize() {
  if (!app || !gameContainer) return;

  const containerW = gameContainer.clientWidth;
  const containerH = gameContainer.clientHeight;
  if (containerW === 0 || containerH === 0) return;

  // Solo sui dispositivi touch: su desktop una finestra "sbagliata" si ridimensiona, non si ruota.
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  const isLandscape = containerW > containerH;
  const wrongOrientation = isTouch && isLandscape !== (GAME.orientation === "landscape");
  orientationOverlay?.classList.toggle("visible", wrongOrientation);
  // Senza pausa la partita andrebbe avanti sotto l'overlay, e al ritorno si troverebbe già al game over.
  pausedByOrientation = wrongOrientation;
  applyPause();

  // Letterbox: il renderer resta alla risoluzione logica, si scala solo la misura CSS del canvas.
  let scale = Math.min(containerW / GAME.width, containerH / GAME.height);
  if (GAME.pixelArt && scale >= 2) scale = Math.floor(scale);
  app.canvas.style.width = `${Math.floor(GAME.width * scale)}px`;
  app.canvas.style.height = `${Math.floor(GAME.height * scale)}px`;
}

function onVisibilityChange() {
  pausedByHiddenPage = document.hidden;
  applyPause();
  if (document.hidden) SoundManagerInstance.pauseForHiddenPage();
  else SoundManagerInstance.resumeAfterHiddenPage();
}

function onKeyDown(e: KeyboardEvent) {
  if (e.code === "Escape") setPausedByPlayer(!pausedByPlayer);
}

function setPausedByPlayer(paused: boolean) {
  pausedByPlayer = paused;
  pauseOverlay?.classList.toggle("visible", paused);
  applyPause();
}

function applyPause() {
  if (!app) return;
  // NOTE: il ticker ripartito non recupera il tempo passato in pausa, quindi nessun salto in avanti.
  const paused = pausedByOrientation || pausedByHiddenPage || pausedByPlayer;
  if (paused) {
    app.ticker.stop();
  } else if (!app.ticker.started) {
    // Spazio o tocchi arrivati durante la pausa non devono far saltare alla ripresa.
    game?.dimenticaPressioni();
    app.ticker.start();
  }
}
