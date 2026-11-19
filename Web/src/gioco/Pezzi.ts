import { Container } from "pixi.js";
import type { TipoOstacolo } from "../config/ostacoli.ts";
import type { Pezzo } from "../grafica/immagini.ts";
import { texturePezzo } from "../grafica/textures.ts";
import ParticleSystem from "../particles/ParticleSystem.ts";

/** Di che cosa è fatto ciò che si urta nel facile, l'unico livello in cui gli ostacoli volano via. */
const MATERIALE: Partial<Record<TipoOstacolo, Pezzo>> = { legna: "legna", fieno: "paglia", staccionata: "asse" };

// Pezzi dell'ostacolo sbalzato e una stellina d'urto: l'urto si vede e fa ridere, non spaventa. Nascono in
// un contenitore che scorre col binario, come il fumo: restano indietro con l'ostacolo, non sul muso del treno.
// WARNING: ParticleSystem non ferma la frenata a zero: la vita non supera mai velocità / decelerazione minime,
// o i pezzi tornerebbero indietro prima di sparire.
class Pezzi {
  private readonly _scorre = new Container();
  private readonly _schegge = new Map<Pezzo, ParticleSystem>();
  private readonly _stelle: ParticleSystem;

  constructor(parent: Container) {
    parent.addChild(this._scorre);
    for (const pezzo of new Set(Object.values(MATERIALE))) {
      this._schegge.set(
        pezzo,
        new ParticleSystem(this._scorre, {
          texture: texturePezzo(pezzo),
          density: 2,
          numParticles: { min: 4, max: 6 },
          speed: { min: 70, max: 140 },
          acceleration: { min: -120, max: -60 },
          rotationSpeed: { min: -8, max: 8 },
          lifetimeSeconds: { min: 0.4, max: 0.55 },
          scale: { min: 1, max: 1 },
          spawnAngleDegrees: { min: 20, max: 160 },
        }),
      );
    }
    this._stelle = new ParticleSystem(this._scorre, {
      texture: texturePezzo("stella"),
      density: 2,
      numParticles: { min: 2, max: 3 },
      speed: { min: 30, max: 60 },
      acceleration: { min: -40, max: -20 },
      rotationSpeed: { min: -3, max: 3 },
      lifetimeSeconds: { min: 0.5, max: 0.7 },
      scale: { min: 1, max: 1 },
      spawnAngleDegrees: { min: 60, max: 120 },
    });
  }

  /** x, y: il centro dell'ostacolo urtato. */
  emit(tipo: TipoOstacolo, x: number, y: number): void {
    const materiale = MATERIALE[tipo];
    if (materiale) this._schegge.get(materiale)!.emit(x - this._scorre.x, y);
    this._stelle.emit(x - this._scorre.x, y);
  }

  /** px percorsi dal terreno in questo frame. */
  scorri(passo: number): void {
    this._scorre.x -= passo;
  }

  update(dt: number): void {
    for (const sistema of this._schegge.values()) sistema.update(dt);
    this._stelle.update(dt);
  }

  destroy(): void {
    for (const sistema of this._schegge.values()) sistema.destroy();
    this._stelle.destroy();
    this._scorre.destroy();
  }
}

export default Pezzi;
