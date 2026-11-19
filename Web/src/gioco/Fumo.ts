import type { Container } from "pixi.js";
import { textureEffetto } from "../grafica/textures.ts";
import ParticleSystem, { type ParticleSystemOptions } from "../particles/ParticleSystem.ts";
import type { IdLocomotiva } from "../preferenze.ts";

interface Effetto {
  file: "fumo" | "scarico" | "scintilla";
  /** Bocca della ciminiera o del pantografo, rispetto alla base al centro dello sprite (anchor 0.5, 1). */
  origine: { x: number; y: number };
  /** Ogni quanti px percorsi parte uno sbuffo: il ritmo segue la velocità, come il ciuf-ciuf. */
  ogniPx: number;
  /** Probabilità che uno sbuffo parta davvero: le scintille sono rare e irregolari. */
  probabilita: number;
  particelle: Omit<ParticleSystemOptions, "texture">;
}

// Origini misurate sui fogli di public/assets/images/locomotive (64×40, base al centro = 32, 40).
const EFFETTI: Record<IdLocomotiva, Effetto> = {
  vapore: {
    file: "fumo",
    origine: { x: 14, y: -38 },
    ogniPx: 48,
    probabilita: 1,
    particelle: {
      density: 6,
      numParticles: { min: 1, max: 2 },
      speed: { min: 40, max: 70 },
      acceleration: { min: -30, max: -10 },
      rotationSpeed: { min: 0, max: 0 },
      lifetimeSeconds: { min: 0.7, max: 1.0 },
      scale: { min: 0.7, max: 1 },
      spawnAngleDegrees: { min: 110, max: 140 },
    },
  },
  diesel: {
    file: "scarico",
    origine: { x: 10, y: -34 },
    ogniPx: 28,
    probabilita: 1,
    particelle: {
      density: 8,
      numParticles: { min: 1, max: 1 },
      speed: { min: 50, max: 80 },
      acceleration: { min: -40, max: -20 },
      rotationSpeed: { min: 0, max: 0 },
      lifetimeSeconds: { min: 0.4, max: 0.6 },
      scale: { min: 0.6, max: 0.9 },
      spawnAngleDegrees: { min: 120, max: 150 },
    },
  },
  elettrica: {
    file: "scintilla",
    origine: { x: -2, y: -37 },
    ogniPx: 90,
    probabilita: 0.35,
    particelle: {
      density: 3,
      numParticles: { min: 1, max: 1 },
      speed: { min: 0, max: 10 },
      acceleration: { min: 0, max: 0 },
      rotationSpeed: { min: 0, max: 0 },
      lifetimeSeconds: { min: 0.12, max: 0.2 },
      scale: { min: 0.8, max: 1 },
      spawnAngleDegrees: { min: 0, max: 360 },
    },
  },
};

// Fumo del vapore, scarico del diesel, scintille del pantografo: la locomotiva si riconosce anche così.
class Fumo {
  private readonly _effetto: Effetto;
  private readonly _particelle: ParticleSystem;
  private _distanza = 0;

  constructor(parent: Container, tipo: IdLocomotiva) {
    this._effetto = EFFETTI[tipo];
    this._particelle = new ParticleSystem(parent, { texture: textureEffetto(this._effetto.file), ...this._effetto.particelle });
  }

  /** Ogni frame, anche a locomotiva ferma: gli sbuffi già partiti finiscono di svanire. */
  update(dt: number): void {
    this._particelle.update(dt);
  }

  /** px percorsi in questo frame; x, y: la base della locomotiva. */
  avanza(passo: number, x: number, y: number): void {
    this._distanza += passo;
    while (this._distanza >= this._effetto.ogniPx) {
      this._distanza -= this._effetto.ogniPx;
      if (Math.random() < this._effetto.probabilita) {
        this._particelle.emit(x + this._effetto.origine.x, y + this._effetto.origine.y);
      }
    }
  }

  destroy(): void {
    this._particelle.destroy();
  }
}

export default Fumo;
