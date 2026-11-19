import { Container } from "pixi.js";
import type { Effetto as FileEffetto } from "../grafica/immagini.ts";
import { textureEffetto } from "../grafica/textures.ts";
import ParticleSystem, { type ParticleSystemOptions } from "../particles/ParticleSystem.ts";
import type { IdLocomotiva } from "../preferenze.ts";

interface Effetto {
  file: FileEffetto;
  /** Bocca della ciminiera o del pantografo, rispetto alla base al centro dello sprite (anchor 0.5, 1). */
  origine: { x: number; y: number };
  /** Ogni quanti px percorsi parte uno sbuffo: il ritmo segue la velocità, come il ciuf-ciuf. */
  ogniPx: number;
  /** Probabilità che uno sbuffo parta davvero: le scintille sono irregolari. */
  probabilita: number;
  /** Se lo sbuffo resta indietro col terreno invece di seguire la locomotiva. */
  segueIlTerreno: boolean;
  particelle: Omit<ParticleSystemOptions, "texture">;
}

// Origini misurate sui fogli di public/assets/images/locomotive (64×40, base al centro = 32, 40).
const EFFETTI: Record<IdLocomotiva, Effetto> = {
  vapore: {
    file: "fumo",
    origine: { x: 14, y: -38 },
    ogniPx: 48,
    probabilita: 1,
    segueIlTerreno: true,
    particelle: {
      density: 12,
      numParticles: { min: 1, max: 2 },
      speed: { min: 30, max: 55 },
      acceleration: { min: -30, max: -10 },
      rotationSpeed: { min: 0, max: 0 },
      lifetimeSeconds: { min: 0.7, max: 1.0 },
      scale: { min: 1, max: 1 },
      crescita: false,
      spawnAngleDegrees: { min: 80, max: 110 },
    },
  },
  diesel: {
    file: "scarico",
    origine: { x: -8, y: -32 },
    ogniPx: 28,
    probabilita: 1,
    segueIlTerreno: true,
    particelle: {
      density: 16,
      numParticles: { min: 1, max: 1 },
      speed: { min: 30, max: 50 },
      acceleration: { min: -40, max: -20 },
      rotationSpeed: { min: 0, max: 0 },
      lifetimeSeconds: { min: 0.4, max: 0.6 },
      scale: { min: 1, max: 1 },
      crescita: false,
      spawnAngleDegrees: { min: 85, max: 115 },
    },
  },
  elettrica: {
    file: "scintilla",
    origine: { x: -6, y: -20 },
    ogniPx: 30,
    probabilita: 0.8,
    segueIlTerreno: true,
    // Uno sprazzo di 3-5 scintille che schizzano dal pantografo e restano indietro col terreno, come il fumo.
    particelle: {
      density: 8,
      numParticles: { min: 3, max: 5 },
      // Vita massima sotto velocità minima / frenata massima (60 / 150 = 0,4 s): non tornano indietro.
      speed: { min: 60, max: 110 },
      acceleration: { min: -150, max: -100 },
      rotationSpeed: { min: 0, max: 0 },
      lifetimeSeconds: { min: 0.25, max: 0.4 },
      scale: { min: 1, max: 1 },
      crescita: false,
      spawnAngleDegrees: { min: 60, max: 150 },
    },
  },
};

// Fumo del vapore, scarico del diesel, scintille del pantografo: la locomotiva si riconosce anche così.
// Il mondo è fermo in orizzontale e scorre lo scenario: gli sbuffi nascono in un contenitore che scorre col
// binario, così restano indietro alla velocità del terreno invece di seguire la locomotiva.
class Fumo {
  private readonly _effetto: Effetto;
  private readonly _scorre = new Container();
  private readonly _particelle: ParticleSystem;
  private _distanza = 0;

  constructor(parent: Container, tipo: IdLocomotiva) {
    this._effetto = EFFETTI[tipo];
    parent.addChild(this._scorre);
    this._particelle = new ParticleSystem(this._scorre, { texture: textureEffetto(this._effetto.file), ...this._effetto.particelle });
  }

  /** Ogni frame, anche a locomotiva ferma: gli sbuffi già partiti finiscono di svanire. */
  update(dt: number): void {
    this._particelle.update(dt);
  }

  /** px percorsi in questo frame; x, y: la base della locomotiva. */
  avanza(passo: number, x: number, y: number): void {
    if (this._effetto.segueIlTerreno) this._scorre.x -= passo;
    this._distanza += passo;
    while (this._distanza >= this._effetto.ogniPx) {
      this._distanza -= this._effetto.ogniPx;
      if (Math.random() < this._effetto.probabilita) {
        this._particelle.emit(x + this._effetto.origine.x - this._scorre.x, y + this._effetto.origine.y);
      }
    }
  }

  destroy(): void {
    this._particelle.destroy();
    this._scorre.destroy();
  }
}

export default Fumo;
