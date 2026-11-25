import { AUDIO, MUSICA_SCENARIO, SUONI_LOCOMOTIVA } from "../config/audio.ts";
import type { IdLivello } from "../config/livelli.ts";
import type { IdLocomotiva } from "../preferenze.ts";
import Numbers from "../services/Numbers.ts";
import type SoundManager from "../services/SoundManager.ts";
import type { SoundName } from "../services/SoundManager.ts";

/** Il sonoro continuo della partita: la marcia che segue la velocità, i fischi lungo la corsa, la musica. */
export default class AudioPartita {
  private readonly _suoni: { marcia: SoundName; fischi: SoundName[] };
  private _prossimoFischio: number;

  constructor(
    private readonly _sounds: SoundManager,
    locomotiva: IdLocomotiva,
    livello: IdLivello,
  ) {
    this._suoni = SUONI_LOCOMOTIVA[locomotiva];
    this._sounds.avviaLoop("musica", MUSICA_SCENARIO[livello]);
    this._sounds.avviaLoop("marcia", this._suoni.marcia);
    this._sounds.play(this._suoni.fischi[0]!);
    this._prossimoFischio = Numbers.randomBetweenInterval(AUDIO.intervalloFischi);
  }

  /** A ogni frame di corsa o di frenata. */
  aggiorna(tempo: number, velocita: number, fischiAmmessi: boolean): void {
    const { marcia } = AUDIO;
    const riproduzione = Numbers.clamp(
      1 + (velocita - marcia.velocitaRiferimento) * marcia.pendenza,
      marcia.riproduzione.min,
      marcia.riproduzione.max,
    );
    this._sounds.regolaLoop("marcia", riproduzione, Numbers.clamp01(velocita / marcia.velocitaSilenzio));

    if (fischiAmmessi && tempo >= this._prossimoFischio) {
      const { fischi } = this._suoni;
      this._sounds.play(fischi[Math.floor(Math.random() * fischi.length)]!);
      this._prossimoFischio = tempo + Numbers.randomBetweenInterval(AUDIO.intervalloFischi);
    }
  }

  /** Il treno è fermo in stazione. */
  arrivo(): void {
    this._sounds.fermaLoop("marcia", AUDIO.marcia.dissolvenzaArrestoMs);
    this._sounds.play(this._suoni.fischi[0]!);
  }

  schianto(): void {
    this._sounds.fermaLoop("marcia");
    this._sounds.fermaLoop("musica", AUDIO.dissolvenzaMusicaSchiantoMs);
    this._sounds.play("schianto");
  }
}
