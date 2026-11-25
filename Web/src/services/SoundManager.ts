import { Howl, Howler } from "howler";
import { ASSETS_ROOT } from "../assets/paths.ts";
import { LOOP } from "../audio/loop.ts";

interface SoundDefinition {
  // Percorso sotto public/assets/sounds/.
  file: string;
  volume?: number;
  /** Ripetuto dall'inizio alla fine del file. I suoni in LOOP si ripetono invece solo nel loro ciclo. */
  loop?: boolean;
}

// Registrazioni vere preparate da strumenti/prepara-suoni.py (fonti e licenze in THIRD-PARTY-NOTICES.md).
// I file escono tutti a -18 LUFS (gli impatti un po' sotto, limitati dal picco): il mix sta qui. La musica
// suona a circa -20 LUFS, i fischi al suo livello, la marcia 11 dB sotto perché non la copra.
const SOUNDS = {
  "marcia-vapore": { file: "marcia-vapore.mp3", volume: 0.22 },
  "marcia-diesel": { file: "marcia-diesel.mp3", volume: 0.22 },
  "marcia-elettrica": { file: "marcia-elettrica.mp3", volume: 0.22 },
  "fischio-vapore": { file: "fischio-vapore.mp3", volume: 0.9 },
  "fischio-vapore-corto": { file: "fischio-vapore-corto.mp3", volume: 1 },
  "fischio-diesel": { file: "fischio-diesel.mp3", volume: 0.85 },
  "fischio-elettrica": { file: "fischio-elettrica.mp3", volume: 0.9 },
  salto: { file: "salto.mp3", volume: 0.41 },
  atterraggio: { file: "atterraggio.mp3", volume: 0.3 },
  urto: { file: "urto.mp3", volume: 0.85 },
  schianto: { file: "schianto.mp3", volume: 0.85 },
  "musica-campagna": { file: "musica-campagna.mp3", volume: 0.75, loop: true },
  "musica-cittadina": { file: "musica-cittadina.mp3", volume: 0.75, loop: true },
  "musica-porto": { file: "musica-porto.mp3", volume: 0.75, loop: true },
} satisfies Record<string, SoundDefinition>;

export type SoundName = keyof typeof SOUNDS;

/** I suoni continui: uno per canale, che si mettono in pausa e riprendono insieme alla partita. */
export type Canale = "musica" | "marcia";

/** Partita ferma (pausa, schermo da ruotare) o scheda del browser nascosta, anche fuori dalla partita. */
export type MotivoSospensione = "partita" | "scheda";

/** Lo sprite che ripete solo il ciclo: il file ha un margine per lato contro il silenzio dell'MP3. */
const SPRITE_CICLO = "ciclo";

/** Variazione minima di ritmo o volume di un suono continuo che vale la pena applicare. */
const SOGLIA_REGOLAZIONE = 0.01;

class SoundManager {
  private readonly _howls = new Map<SoundName, Howl>();
  private readonly _canali = new Map<Canale, { name: SoundName; id: number; volume: number; rate: number; quota: number }>();
  private readonly _conCiclo = new Set<SoundName>();
  /** Chi ha chiesto di fermare i suoni continui: ripartono solo quando nessuno lo chiede più. */
  private readonly _sospensioni = new Set<MotivoSospensione>();

  private get sospeso(): boolean {
    return this._sospensioni.size > 0;
  }

  constructor() {
    // NOTE: le Howl si creano tutte subito. Howler crea l'AudioContext alla prima Howl: con la creazione
    // pigra, al primo gesto dell'utente lo sblocco non trova nessun contesto da riprendere.
    for (const [name, definition] of Object.entries(SOUNDS) as [SoundName, SoundDefinition][]) {
      const ciclo = (LOOP as Record<string, { inizioMs: number; durataMs: number }>)[name];
      if (ciclo) this._conCiclo.add(name);
      this._howls.set(
        name,
        new Howl({
          src: [`${ASSETS_ROOT}sounds/${definition.file}`],
          loop: definition.loop ?? false,
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
    if (attuale?.name === name && (this.sospeso || howl.playing(attuale.id))) return;

    this.fermaLoop(canale);
    const id = this._conCiclo.has(name) ? howl.play(SPRITE_CICLO) : howl.play();
    this._canali.set(canale, { name, id, volume: howl.volume(), rate: 1, quota: 1 });
    // Una partita che parte in pausa (scheda nascosta, schermo da ruotare) non deve suonare sotto l'overlay.
    if (this.sospeso) howl.pause(id);
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
    // Solo quando il valore cambia davvero: Howler a ogni rate() ricrea il timer di fine suono.
    if (Math.abs(velocitaRiproduzione - attuale.rate) >= SOGLIA_REGOLAZIONE) {
      attuale.rate = velocitaRiproduzione;
      howl.rate(velocitaRiproduzione, attuale.id);
    }
    if (Math.abs(quotaVolume - attuale.quota) >= SOGLIA_REGOLAZIONE) {
      attuale.quota = quotaVolume;
      howl.volume(attuale.volume * quotaVolume, attuale.id);
    }
  }

  fermaLoop(canale: Canale, dissolvenzaMs = 0): void {
    const attuale = this._canali.get(canale);
    if (!attuale) return;
    this._canali.delete(canale);
    const howl = this._howls.get(attuale.name);
    if (!howl) return;
    if (dissolvenzaMs > 0 && !this.sospeso) {
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
    if (this.sospeso) return;
    this._howls.get(name)?.play();
  }

  /**
   * Fine della partita: si ferma la marcia. La musica resta, perché menu, partita e fine partita suonano
   * quella dello scenario scelto; gli effetti finiscono da soli, così il fischio d'arrivo e lo schianto si
   * sentono interi anche nella schermata di fine.
   */
  fermaPartita(): void {
    this.fermaLoop("marcia");
    this.riprendi("partita");
  }

  /**
   * I suoni continui si fermano e riprenderanno da dove erano; gli effetti, brevi, si interrompono.
   * Ogni motivo si chiede e si toglie da sé: la pausa di gioco non sblocca la scheda nascosta, e viceversa.
   */
  sospendi(motivo: MotivoSospensione): void {
    const giaSospeso = this.sospeso;
    this._sospensioni.add(motivo);
    if (giaSospeso) return;
    const continui = new Set([...this._canali.values()].map((c) => c.name));
    for (const [name, howl] of this._howls) {
      if (!continui.has(name)) howl.stop();
    }
    for (const { name, id } of this._canali.values()) this._howls.get(name)?.pause(id);
  }

  riprendi(motivo: MotivoSospensione): void {
    if (!this._sospensioni.delete(motivo) || this.sospeso) return;
    for (const { name, id } of this._canali.values()) this._howls.get(name)?.play(id);
  }
}

export default SoundManager;
