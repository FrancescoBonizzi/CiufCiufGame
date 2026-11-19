import type { Container } from "pixi.js";
import type { TipoOstacolo } from "../config/ostacoli.ts";
import type { Pezzo } from "../grafica/immagini.ts";
import { texturePezzo } from "../grafica/textures.ts";
import ParticleSystem from "../particles/ParticleSystem.ts";

/** Di che cosa è fatto ciò che si urta nel facile, l'unico livello in cui gli ostacoli volano via. */
const MATERIALE: Partial<Record<TipoOstacolo, Pezzo>> = { legna: "legna", fieno: "paglia", staccionata: "asse" };

// Pezzi dell'ostacolo sbalzato e una stellina d'urto: l'urto si vede e fa ridere, non spaventa.
class Pezzi {
  private readonly _schegge = new Map<Pezzo, ParticleSystem>();
  private readonly _stelle: ParticleSystem;

  constructor(parent: Container) {
    for (const pezzo of new Set(Object.values(MATERIALE))) {
      this._schegge.set(
        pezzo,
        new ParticleSystem(parent, {
          texture: texturePezzo(pezzo),
          density: 2,
          numParticles: { min: 4, max: 6 },
          speed: { min: 70, max: 140 },
          acceleration: { min: -160, max: -100 },
          rotationSpeed: { min: -8, max: 8 },
          lifetimeSeconds: { min: 0.45, max: 0.7 },
          scale: { min: 1, max: 1 },
          spawnAngleDegrees: { min: 20, max: 160 },
        }),
      );
    }
    this._stelle = new ParticleSystem(parent, {
      texture: texturePezzo("stella"),
      density: 2,
      numParticles: { min: 2, max: 3 },
      speed: { min: 30, max: 60 },
      acceleration: { min: -60, max: -30 },
      rotationSpeed: { min: -3, max: 3 },
      lifetimeSeconds: { min: 0.5, max: 0.7 },
      scale: { min: 1, max: 1 },
      spawnAngleDegrees: { min: 60, max: 120 },
    });
  }

  /** x, y: il centro dell'ostacolo urtato. */
  emit(tipo: TipoOstacolo, x: number, y: number): void {
    const materiale = MATERIALE[tipo];
    if (materiale) this._schegge.get(materiale)!.emit(x, y);
    this._stelle.emit(x, y);
  }

  update(dt: number): void {
    for (const sistema of this._schegge.values()) sistema.update(dt);
    this._stelle.update(dt);
  }

  destroy(): void {
    for (const sistema of this._schegge.values()) sistema.destroy();
    this._stelle.destroy();
  }
}

export default Pezzi;
