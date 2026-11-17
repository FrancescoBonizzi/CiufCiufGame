import { Howl, Howler } from "howler";
import { ASSETS_ROOT } from "../assets/paths.ts";

interface SoundDefinition {
  // Percorso sotto public/assets/sounds/.
  file: string;
  music?: boolean;
  volume?: number;
}

// Effetti segnaposto sintetizzati da strumenti/genera-suoni.py; le musiche arrivano con la fase 7.
const SOUNDS = {
  salto: { file: "effects/salto.wav", volume: 0.5 },
  atterraggio: { file: "effects/atterraggio.wav", volume: 0.5 },
  urto: { file: "effects/urto.wav", volume: 0.8 },
  schianto: { file: "effects/schianto.wav" },
  fischio: { file: "effects/fischio.wav", volume: 0.7 },
} satisfies Record<string, SoundDefinition>;

export type SoundName = keyof typeof SOUNDS;

const MUSIC_VOLUME = 0.4;

class SoundManager {
  private readonly _howls = new Map<SoundName, Howl>();
  private _music: { name: SoundName; id: number } | null = null;
  private _musicPausedByHiddenPage = false;

  constructor() {
    // NOTE: le Howl si creano tutte subito. Howler crea l'AudioContext alla prima Howl: con la creazione
    // pigra, al primo gesto dell'utente lo sblocco non trova nessun contesto da riprendere.
    for (const [name, definition] of Object.entries(SOUNDS) as [SoundName, SoundDefinition][]) {
      this._howls.set(
        name,
        new Howl({
          src: [`${ASSETS_ROOT}sounds/${definition.file}`],
          loop: definition.music ?? false,
          volume: definition.volume ?? (definition.music ? MUSIC_VOLUME : 1),
          onloaderror: (_id, error) => console.error(`Suono "${name}" non caricato`, error),
        }),
      );
    }
  }

  // Una sola musica alla volta; richiamarla mentre suona già non la fa ripartire da capo.
  playMusic(name: SoundName): void {
    const howl = this._howls.get(name);
    if (!howl) return;
    if (this._music?.name === name && howl.playing(this._music.id)) return;

    this.stopMusic();
    this._music = { name, id: howl.play() };
  }

  stopMusic(): void {
    if (!this._music) return;
    this._howls.get(this._music.name)?.stop(this._music.id);
    this._music = null;
  }

  /** La preferenza del menu: spento vuol dire muto, musica compresa. */
  impostaAudio(acceso: boolean): void {
    Howler.mute(!acceso);
  }

  play(name: SoundName): void {
    this._howls.get(name)?.play();
  }

  stopAll(): void {
    for (const howl of this._howls.values()) howl.stop();
    this._music = null;
  }

  // Scheda nascosta: la musica si mette in pausa e riparte da dove era; gli effetti, brevi, si fermano.
  pauseForHiddenPage(): void {
    for (const [name, howl] of this._howls) {
      if (name !== this._music?.name) howl.stop();
    }
    if (this._music && this._howls.get(this._music.name)?.playing(this._music.id)) {
      this._howls.get(this._music.name)?.pause(this._music.id);
      this._musicPausedByHiddenPage = true;
    }
  }

  resumeAfterHiddenPage(): void {
    if (this._music && this._musicPausedByHiddenPage) {
      this._howls.get(this._music.name)?.play(this._music.id);
    }
    this._musicPausedByHiddenPage = false;
  }
}

export default SoundManager;
