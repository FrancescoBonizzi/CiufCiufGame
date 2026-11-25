import { Howl, Howler } from "howler";
import { ASSETS_ROOT } from "../assets/paths.ts";
import { LOOP } from "../audio/loop.ts";

interface SoundDefinition {
  // Percorso sotto public/assets/sounds/.
  file: string;
  volume?: number;
  /** Ripetuto senza fine: la musica, o il ciclo di un file di LOOP. */
  loop?: boolean;
}

// Registrazioni vere preparate da strumenti/prepara-suoni.py (fonti e licenze in THIRD-PARTY-NOTICES.md).
// Volumi tarati perché la marcia stia sotto la musica e i fischi sopra tutto.
const SOUNDS = {
  "marcia-vapore": { file: "marcia-vapore.mp3", volume: 0.45, loop: true },
  "marcia-diesel": { file: "marcia-diesel.mp3", volume: 0.35, loop: true },
  "marcia-elettrica": { file: "marcia-elettrica.mp3", volume: 0.35, loop: true },
  "fischio-vapore": { file: "fischio-vapore.mp3", volume: 0.7 },
  "fischio-vapore-corto": { file: "fischio-vapore-corto.mp3", volume: 0.6 },
  "fischio-diesel": { file: "fischio-diesel.mp3", volume: 0.6 },
  "fischio-elettrica": { file: "fischio-elettrica.mp3", volume: 0.6 },
  salto: { file: "salto.mp3", volume: 0.5 },
  atterraggio: { file: "atterraggio.mp3", volume: 0.5 },
  urto: { file: "urto.mp3", volume: 0.9 },
  schianto: { file: "schianto.mp3", volume: 0.9 },
  "musica-campagna": { file: "musica-campagna.mp3", volume: 0.4, loop: true },
  "musica-cittadina": { file: "musica-cittadina.mp3", volume: 0.4, loop: true },
  "musica-porto": { file: "musica-porto.mp3", volume: 0.4, loop: true },
} satisfies Record<string, SoundDefinition>;

export type SoundName = keyof typeof SOUNDS;

/** I suoni continui: uno per canale, che si mettono in pausa e riprendono insieme alla partita. */
export type Canale = "musica" | "marcia";

/** Lo sprite che ripete solo il ciclo: il file ha un margine per lato contro il silenzio dell'MP3. */
const SPRITE_CICLO = "ciclo";

class SoundManager {
  private readonly _howls = new Map<SoundName, Howl>();
  private readonly _canali = new Map<Canale, { name: SoundName; id: number; volume: number }>();
  private _sospeso = false;

  constructor() {
    // NOTE: le Howl si creano tutte subito. Howler crea l'AudioContext alla prima Howl: con la creazione
    // pigra, al primo gesto dell'utente lo sblocco non trova nessun contesto da riprendere.
    for (const [name, definition] of Object.entries(SOUNDS) as [SoundName, SoundDefinition][]) {
      const ciclo = (LOOP as Record<string, { inizioMs: number; durataMs: number }>)[name];
      this._howls.set(
        name,
        new Howl({
          src: [`${ASSETS_ROOT}sounds/${definition.file}`],
          loop: (definition.loop ?? false) && !ciclo,
          volume: definition.volume ?? 1,
          ...(ciclo ? { sprite: { [SPRITE_CICLO]: [ciclo.inizioMs, ciclo.durataMs, true] } } : {}),
          onloaderror: (_id, error) => console.error(`Suono "${name}" non caricato`, error),
        }),
      );
    }
  }

  /** Un suono continuo sul suo canale; richiamarlo mentre suona già non lo fa ripartire da capo. */
  avviaLoop(canale: Canale, name: SoundName): void {
    const howl = this._howls.get(name);
    if (!howl) return;
    const attuale = this._canali.get(canale);
    if (attuale?.name === name) return;

    this.fermaLoop(canale);
    const id = name in LOOP ? howl.play(SPRITE_CICLO) : howl.play();
    this._canali.set(canale, { name, id, volume: howl.volume() });
    // Una partita che parte in pausa (scheda nascosta, schermo da ruotare) non deve suonare sotto l'overlay.
    if (this._sospeso) howl.pause(id);
  }

  /**
   * Ritmo e volume del suono continuo: la marcia segue la velocità del treno.
   * @param velocitaRiproduzione 1 è la registrazione com'è; cambia anche l'altezza, come un motore vero.
   * @param quotaVolume 0 → 1, moltiplica il volume del registro.
   */
  regolaLoop(canale: Canale, velocitaRiproduzione: number, quotaVolume = 1): void {
    const attuale = this._canali.get(canale);
    const howl = attuale && this._howls.get(attuale.name);
    if (!attuale || !howl) return;
    howl.rate(velocitaRiproduzione, attuale.id);
    howl.volume(attuale.volume * quotaVolume, attuale.id);
  }

  fermaLoop(canale: Canale, dissolvenzaMs = 0): void {
    const attuale = this._canali.get(canale);
    if (!attuale) return;
    this._canali.delete(canale);
    const howl = this._howls.get(attuale.name);
    if (!howl) return;
    if (dissolvenzaMs > 0 && !this._sospeso) {
      howl.once("fade", () => howl.stop(attuale.id), attuale.id);
      howl.fade(howl.volume(attuale.id) as number, 0, dissolvenzaMs, attuale.id);
    } else {
      howl.stop(attuale.id);
    }
  }

  /** La preferenza del menu: spento vuol dire muto, musica compresa. */
  impostaAudio(acceso: boolean): void {
    Howler.mute(!acceso);
  }

  play(name: SoundName): void {
    if (this._sospeso) return;
    this._howls.get(name)?.play();
  }

  stopAll(): void {
    for (const howl of this._howls.values()) howl.stop();
    this._canali.clear();
    this._sospeso = false;
  }

  /**
   * Partita ferma (pausa, scheda nascosta, schermo da ruotare): i suoni continui si fermano e riprendono
   * da dove erano; gli effetti, brevi, si interrompono. Richiamarla due volte non cambia niente.
   */
  sospendi(): void {
    if (this._sospeso) return;
    this._sospeso = true;
    const continui = new Set([...this._canali.values()].map((c) => c.name));
    for (const [name, howl] of this._howls) {
      if (!continui.has(name)) howl.stop();
    }
    for (const { name, id } of this._canali.values()) this._howls.get(name)?.pause(id);
  }

  riprendi(): void {
    if (!this._sospeso) return;
    this._sospeso = false;
    for (const { name, id } of this._canali.values()) this._howls.get(name)?.play(id);
  }
}

export default SoundManager;
