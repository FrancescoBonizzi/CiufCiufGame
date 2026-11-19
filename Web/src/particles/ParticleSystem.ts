import { BLEND_MODES, ColorSource, Container, Texture } from "pixi.js";
import type Interval from "../primitives/Interval.ts";
import Numbers from "../services/Numbers.ts";
import Particle, { type ParticleLaunch } from "./Particle.ts";

export interface ParticleSystemOptions {
  texture: Texture;
  /** Quante esplosioni contemporanee servire senza allocare: il pool vale density × numParticles.max. */
  density: number;
  numParticles: Interval;
  /** px/s */
  speed: Interval;
  /** px/s², nella stessa direzione della velocità */
  acceleration: Interval;
  /** rad/s */
  rotationSpeed: Interval;
  lifetimeSeconds: Interval;
  scale: Interval;
  /** 0° a destra, 90° in alto */
  spawnAngleDegrees: Interval;
  blendMode?: BLEND_MODES;
  randomizedSpawnAngle?: boolean;
  colors?: ColorSource[];
  /** false per gli sprite pixel art: ingranditi di una frazione salterebbero righe e colonne. */
  crescita?: boolean;
  /** towardsCamera null: metà delle particelle verso la camera, metà lontano. */
  perspective?: { z0: number; vz: number; focalLength: number; towardsCamera: boolean | null };
}

// Un pool fisso creato una volta: durante la partita nessuna allocazione, e quindi niente scatti del GC.
// Un sistema concreto è solo una configurazione: new ParticleSystem(container, { ... }).
class ParticleSystem {
  private readonly _particles: Particle[];
  private readonly _free: Particle[];
  private readonly _launch: ParticleLaunch = {
    x: 0, y: 0, speedX: 0, speedY: 0, accelerationX: 0, accelerationY: 0, rotationSpeed: 0,
    color: 0xffffff, scale: 1, lifetimeSeconds: 0, randomizedSpawnAngle: false, crescita: true, focalLength: 0, z0: 0, vz: 0,
  };

  constructor(
    parent: Container,
    private readonly _options: ParticleSystemOptions,
  ) {
    const poolSize = _options.density * _options.numParticles.max;
    this._particles = Array.from(
      { length: poolSize },
      () => new Particle(_options.texture, parent, _options.blendMode ?? "normal"),
    );
    this._free = [...this._particles];
  }

  /** true finché almeno una particella è in volo. */
  get isActive(): boolean {
    return this._free.length !== this._particles.length;
  }

  emit(x: number, y: number): void {
    const count = Math.round(Numbers.randomBetweenInterval(this._options.numParticles));
    for (let i = 0; i < count; i++) {
      const particle = this._free.pop();
      if (!particle) return;
      this.fillLaunch(x, y);
      particle.launch(this._launch);
    }
  }

  update(dtSeconds: number): void {
    for (const particle of this._particles) {
      if (!particle.isActive) continue;
      particle.update(dtSeconds);
      if (!particle.isActive) this._free.push(particle);
    }
  }

  destroy(): void {
    for (const particle of this._particles) particle.destroy();
    this._particles.length = 0;
    this._free.length = 0;
  }

  private fillLaunch(x: number, y: number): void {
    const o = this._options;
    const l = this._launch;
    const angle = Numbers.toRadians(Numbers.randomBetweenInterval(o.spawnAngleDegrees));
    // y verso il basso sullo schermo: l'angolo cresce in senso antiorario, quindi il seno va negato.
    const directionX = Math.cos(angle);
    const directionY = -Math.sin(angle);
    const speed = Numbers.randomBetweenInterval(o.speed);
    const acceleration = Numbers.randomBetweenInterval(o.acceleration);
    const colors = o.colors ?? [];

    l.x = x;
    l.y = y;
    l.speedX = directionX * speed;
    l.speedY = directionY * speed;
    l.accelerationX = directionX * acceleration;
    l.accelerationY = directionY * acceleration;
    l.rotationSpeed = Numbers.randomBetweenInterval(o.rotationSpeed);
    l.color = colors[Math.floor(Math.random() * colors.length)] ?? 0xffffff;
    l.scale = Numbers.randomBetweenInterval(o.scale);
    l.lifetimeSeconds = Numbers.randomBetweenInterval(o.lifetimeSeconds);
    l.randomizedSpawnAngle = o.randomizedSpawnAngle ?? false;
    l.crescita = o.crescita ?? true;

    if (o.perspective) {
      const towardsCamera = o.perspective.towardsCamera ?? Numbers.headOrTail();
      l.focalLength = o.perspective.focalLength;
      l.z0 = towardsCamera ? o.perspective.z0 : 0;
      l.vz = towardsCamera ? -o.perspective.vz : o.perspective.vz;
    } else {
      l.focalLength = 0;
      l.z0 = 0;
      l.vz = 0;
    }
  }
}

export default ParticleSystem;
