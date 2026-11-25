import { Application, Container, Sprite, Ticker } from "pixi.js";
import type GameAssets from "./assets/GameAssets.ts";
import { COMUNE, LIVELLI, type Livello } from "./config/livelli.ts";
import AudioPartita from "./gioco/AudioPartita.ts";
import Fumo from "./gioco/Fumo.ts";
import Generatore from "./gioco/Generatore.ts";
import Pezzi from "./gioco/Pezzi.ts";
import Locomotiva from "./gioco/Locomotiva.ts";
import Scenario from "./gioco/Scenario.ts";
import { altezzaSagoma, pxPerFotogramma } from "./grafica/locomotive.ts";
import { texturePezzo, texturesLocomotiva, textureStazione } from "./grafica/textures.ts";
import Controller from "./interaction/Controller.ts";
import ParticleSystem from "./particles/ParticleSystem.ts";
import type { Preferenze } from "./preferenze.ts";
import Numbers from "./services/Numbers.ts";
import SoundManager from "./services/SoundManager.ts";
import Camera from "./world/Camera.ts";

// viaggio → arrivo (la stazione entra, la locomotiva frena) → fermo (fischio, attesa) → vittoria.
// viaggio → schianto (medio e difficile) → sconfitta.
type Stato = "viaggio" | "arrivo" | "fermo" | "schianto" | "finita";

/** La riga del binario sta a questa distanza dal bordo basso dello schermo. */
const BINARIO_DAL_BASSO = 36;

export interface EsitiPartita {
  onVittoria: () => void;
  onSconfitta: () => void;
}

class Game {
  private readonly _livello: Livello;
  private readonly _camera: Camera;
  private readonly _controller: Controller;
  private readonly _scenario: Scenario;
  private readonly _generatore: Generatore;
  private readonly _locomotiva: Locomotiva;
  private readonly _stazione: Sprite;
  private readonly _polvere: ParticleSystem;
  private readonly _fumo: Fumo;
  private readonly _pezzi: Pezzi;
  private readonly _audio: AudioPartita;

  private _stato: Stato = "viaggio";
  private _tempo = 0;
  /** Moltiplica la velocità: scende all'urto nel facile e risale in recuperoSecondi. */
  private _fattoreUrto = 1;
  private _attesa = 0;

  constructor(
    app: Application,
    _assets: GameAssets,
    private readonly _sounds: SoundManager,
    preferenze: Preferenze,
    areaInput: HTMLElement,
    // Callback e non il router: Game non sa in quale pagina vive.
    private readonly _esiti: EsitiPartita,
  ) {
    this._livello = LIVELLI[preferenze.livello];
    this._controller = new Controller(areaInput);
    this._camera = new Camera(app);
    this._camera.y = BINARIO_DAL_BASSO;
    const mondo = this._camera.world;
    const { width, height } = app.screen;

    this._scenario = new Scenario(app.stage, mondo, preferenze.livello, width, height);

    this._stazione = new Sprite(textureStazione());
    this._stazione.anchor.set(0, 1);
    this._stazione.visible = false;
    mondo.addChild(this._stazione);

    const strato = new Container();
    mondo.addChild(strato);
    this._generatore = new Generatore(strato, this._livello, width, COMUNE.attesaInizialeSecondi);

    const fotogrammi = texturesLocomotiva(preferenze.locomotiva, preferenze.colore);
    // Prima della locomotiva, quindi dietro: ricadendo dopo un salto passa attraverso il fumo, non sotto.
    const fumo = new Container();
    mondo.addChild(fumo);
    this._fumo = new Fumo(fumo, preferenze.locomotiva);
    this._locomotiva = new Locomotiva(
      mondo,
      fotogrammi,
      this._livello,
      pxPerFotogramma(preferenze.locomotiva),
      altezzaSagoma(preferenze.locomotiva),
    );

    // Container proprio: lo zIndex della prospettiva riordinerebbe tutto il mondo (vedi Particle).
    const particelle = new Container();
    mondo.addChild(particelle);
    this._polvere = new ParticleSystem(particelle, {
      texture: texturePezzo("polvere"),
      density: 2,
      numParticles: { min: 4, max: 6 },
      speed: { min: 20, max: 60 },
      acceleration: { min: -40, max: -10 },
      rotationSpeed: { min: 0, max: 0 },
      lifetimeSeconds: { min: 0.25, max: 0.45 },
      scale: { min: 1, max: 1 },
      crescita: false,
      spawnAngleDegrees: { min: 100, max: 170 },
    });

    this._pezzi = new Pezzi(particelle);
    this._audio = new AudioPartita(_sounds, preferenze.locomotiva, preferenze.livello);

    // Solo in sviluppo (Vite lo toglie dal build): lo stato che legge il bot della prova automatica.
    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>)["__ciufciuf"] = () => ({
        stato: this._stato,
        tempo: this._tempo,
        velocita: this.velocitaCurva * this._fattoreUrto,
        aTerra: this._locomotiva.aTerra,
        locomotiva: {
          x: this._locomotiva.hitbox.x,
          larghezza: this._locomotiva.hitbox.width,
          altezza: this._locomotiva.hitbox.height,
        },
        salto: this._livello.salto,
        ostacoli: this._generatore.ostacoli
          .filter((o) => o.stato === "in-corsa")
          .map((o) => ({ tipo: o.tipo, x: o.hitbox.x, larghezza: o.hitbox.width, sollevamento: o.variante.sollevamento })),
      });
    }
  }

  /** Alla ripresa dalla pausa: una pressione fatta mentre il gioco era fermo non deve far saltare. */
  dimenticaPressioni(): void {
    this._controller.reset();
  }

  update(ticker: Ticker): void {
    // NOTE: sempre deltaMS. elapsedMS non è limitato: dopo una scheda rimasta nascosta vale minuti.
    const dt = ticker.deltaMS / 1000;
    this._camera.update(dt);
    this._polvere.update(dt);
    this._fumo.update(dt);
    this._pezzi.update(dt);
    if (this._stato === "finita") return;
    this._tempo += dt;

    switch (this._stato) {
      case "viaggio":
        this.viaggia(dt);
        break;
      case "arrivo":
        this.arriva(dt);
        break;
      case "fermo":
        this.aspettaEPoi(dt, COMUNE.attesaDopoArrivoSecondi, this._esiti.onVittoria);
        break;
      case "schianto":
        this.aspettaEPoi(dt, COMUNE.attesaDopoSchiantoSecondi, this._esiti.onSconfitta);
        break;
    }
  }

  /** 0 → 1 lungo la curva della velocità; la stessa fa stringere le distanze fra ostacoli. */
  private get progressoCurva(): number {
    const { durataSecondi, velocita } = this._livello;
    return Numbers.clamp01(this._tempo / (durataSecondi * velocita.quotaDurataAlMassimo));
  }

  private get velocitaCurva(): number {
    const { iniziale, massima } = this._livello.velocita;
    return Numbers.lerp(iniziale, massima, this.progressoCurva);
  }

  private viaggia(dt: number): void {
    const { durataSecondi, chiusuraSecondi, urto } = this._livello;
    if (urto.effetto === "sbalzo" && this._fattoreUrto < 1) {
      this._fattoreUrto = Math.min(1, this._fattoreUrto + ((1 - urto.fattoreVelocita) / urto.recuperoSecondi) * dt);
    }
    const velocita = this.velocitaCurva * this._fattoreUrto;

    this.muoviLocomotiva(dt, velocita, this._controller.consumePress());
    const generazioneAttiva = this._tempo < durataSecondi - chiusuraSecondi;
    this._generatore.update(dt, this._tempo, velocita, this.velocitaCurva, this.progressoCurva, generazioneAttiva);
    this._scenario.update(dt, velocita);
    this._audio.aggiorna(this._tempo, velocita, generazioneAttiva);
    this.controllaUrti();

    if (this._stato === "viaggio" && this._tempo >= durataSecondi) {
      this._stato = "arrivo";
      this._stazione.x = this._camera.width;
      this._stazione.visible = true;
    }
  }

  private arriva(dt: number): void {
    // Il centro della stazione si ferma sotto la locomotiva.
    const distanza = this._stazione.x - (COMUNE.locomotivaX - this._stazione.width / 2);
    // Frenata dolce e indipendente dal frame rate: il passo si accorcia con la distanza che resta.
    const passo = Math.min(this.velocitaCurva * dt, distanza * Numbers.damp(COMUNE.frenataInStazione, dt));
    const velocita = dt > 0 ? passo / dt : 0;
    this._stazione.x -= passo;

    // Le pressioni durante l'arrivo si scartano, anche quella ricordata in volo: niente salti in stazione.
    this._controller.consumePress();
    this._locomotiva.dimenticaPressioneInVolo();
    this.muoviLocomotiva(dt, velocita, false);
    this._generatore.update(dt, this._tempo, velocita, velocita, 1, false);
    this._scenario.update(dt, velocita);
    this._audio.aggiorna(this._tempo, velocita, false);

    if (distanza - passo <= COMUNE.tolleranzaArrivoPx && this._locomotiva.aTerra) {
      this._stato = "fermo";
      this._attesa = 0;
      this._audio.arrivo();
    }
  }

  private muoviLocomotiva(dt: number, velocita: number, premuto: boolean): void {
    const evento = this._locomotiva.update(dt, velocita, premuto, this._tempo);
    this._fumo.avanza(velocita * dt, this._locomotiva.sprite.x, this._locomotiva.sprite.y);
    this._pezzi.scorri(velocita * dt);
    if (evento === "salto") this._sounds.play("salto");
    if (evento === "atterraggio") {
      this._sounds.play("atterraggio");
      // Mezzo sbuffo (8×8) sopra la rotaia, che altrimenti coprirebbe per un attimo.
      this._polvere.emit(this._locomotiva.sprite.x - 8, -4);
    }
  }

  private controllaUrti(): void {
    const urto = this._livello.urto;
    for (const ostacolo of this._generatore.ostacoli) {
      if (ostacolo.stato !== "in-corsa" || !this._locomotiva.hitbox.intersects(ostacolo.hitbox)) continue;
      if (urto.effetto === "sbalzo") {
        ostacolo.sbalza();
        this._pezzi.emit(ostacolo.tipo, ostacolo.hitbox.x + ostacolo.hitbox.width / 2, ostacolo.hitbox.y + ostacolo.hitbox.height / 2);
        this._fattoreUrto = urto.fattoreVelocita;
        this._sounds.play("urto");
        this._camera.shake(3);
      } else {
        this._stato = "schianto";
        this._attesa = 0;
        this._audio.schianto();
        this._camera.shake(8);
        return;
      }
    }
  }

  // I ritardi si contano qui e non con setTimeout: la pausa li ferma, e l'uscita non lascia timer appesi.
  private aspettaEPoi(dt: number, secondi: number, poi: () => void): void {
    this._attesa += dt;
    if (this._attesa < secondi) return;
    // Una volta sola: se l'uscita dalla pagina non è immediata, update gira ancora qualche frame.
    this._stato = "finita";
    poi();
  }

  destroy(): void {
    if (import.meta.env.DEV) delete (window as unknown as Record<string, unknown>)["__ciufciuf"];
    this._controller.dispose();
    this._polvere.destroy();
    this._fumo.destroy();
    this._pezzi.destroy();
  }
}

export default Game;
