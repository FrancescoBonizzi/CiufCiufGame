import { BLEND_MODES, ColorSource, Container, Sprite, Texture } from "pixi.js";

// Parametri di un lancio. ParticleSystem ne riusa uno solo per tutte le particelle: launch() li copia.
export interface ParticleLaunch {
  x: number;
  y: number;
  speedX: number;
  speedY: number;
  accelerationX: number;
  accelerationY: number;
  rotationSpeed: number;
  color: ColorSource;
  scale: number;
  lifetimeSeconds: number;
  randomizedSpawnAngle: boolean;
  /** Da 0,75 a 1 della scala lungo la vita. */
  crescita: boolean;
  /** 0 = nessuna prospettiva */
  focalLength: number;
  z0: number;
  vz: number;
}

class Particle {
  private readonly _sprite: Sprite;

  private _speedX = 0;
  private _speedY = 0;
  private _accelerationX = 0;
  private _accelerationY = 0;
  private _rotationSpeed = 0;
  private _ageSeconds = 0;
  private _lifetimeSeconds = 0;
  private _initialScale = 1;
  private _crescita = true;
  private _focalLength = 0;
  private _z = 0;
  private _vz = 0;

  constructor(texture: Texture, parent: Container, blendMode: BLEND_MODES) {
    this._sprite = new Sprite({ texture, blendMode });
    this._sprite.anchor.set(0.5);
    // Il pool nasce intero: una particella mai lanciata non deve comparire nell'origine del mondo.
    this._sprite.visible = false;
    parent.addChild(this._sprite);
  }

  get isActive(): boolean {
    return this._ageSeconds < this._lifetimeSeconds;
  }

  launch(launch: ParticleLaunch): void {
    this._speedX = launch.speedX;
    this._speedY = launch.speedY;
    this._accelerationX = launch.accelerationX;
    this._accelerationY = launch.accelerationY;
    this._rotationSpeed = launch.rotationSpeed;
    this._lifetimeSeconds = launch.lifetimeSeconds;
    this._ageSeconds = 0;
    this._initialScale = launch.scale;
    this._crescita = launch.crescita;
    this._focalLength = launch.focalLength;
    this._z = launch.z0;
    this._vz = launch.vz;

    this._sprite.position.set(launch.x, launch.y);
    this._sprite.rotation = launch.randomizedSpawnAngle ? Math.random() * Math.PI * 2 : 0;
    this._sprite.tint = launch.color;
    this._sprite.scale.set(launch.scale);
    this._sprite.alpha = 0;
    this._sprite.visible = true;
  }

  update(dtSeconds: number): void {
    this._speedX += this._accelerationX * dtSeconds;
    this._speedY += this._accelerationY * dtSeconds;
    this._sprite.x += this._speedX * dtSeconds;
    this._sprite.y += this._speedY * dtSeconds;
    this._sprite.rotation += this._rotationSpeed * dtSeconds;
    this._ageSeconds += dtSeconds;

    const t = Math.min(1, this._ageSeconds / this._lifetimeSeconds);
    // Parabola 4t(1-t): compare e svanisce senza scatti, al massimo a metà vita.
    this._sprite.alpha = 4 * t * (1 - t);
    let scale = this._crescita ? this._initialScale * (0.75 + 0.25 * t) : this._initialScale;

    if (this._focalLength > 0) {
      // Uno Z finto con proiezione prospettica: sprite piatti che sembrano una nuvola con volume, senza shader.
      this._z += this._vz * dtSeconds;
      const z = Math.max(-this._focalLength * 0.8, Math.min(this._z, 5000));
      scale *= this._focalLength / (this._focalLength + z);
      // WARNING: uno zIndex diverso da 0 accende sortableChildren sul genitore, che da quel momento
      // riordina tutti i suoi figli a ogni cambio. Dai a questi sistemi un Container tutto loro.
      this._sprite.zIndex = (this._focalLength - z) | 0;
    }

    this._sprite.scale.set(scale);
    if (!this.isActive) this._sprite.visible = false;
  }

  destroy(): void {
    this._sprite.destroy();
  }
}

export default Particle;
