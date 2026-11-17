import { Application, Container } from "pixi.js";

// Il mondo di gioco è un Container sullo stage: ciò che deve muoversi con la telecamera va nel mondo,
// HUD e sfondi fissi direttamente sullo stage.
//
// NOTE: convenzione dei giochi con gravità: l'origine del mondo è il terreno, e salire vuol dire y negativa.
// Con camera.y = 0 l'origine sta sul bordo basso dello schermo. Così la gravità è positiva e un salto è
// un impulso negativo, senza segni invertiti sparsi nel codice.
class Camera {
  private readonly _world = new Container();
  private readonly _screenWidth: number;
  private readonly _screenHeight: number;

  private _x = 0;
  private _y = 0;
  private _zoom = 1;

  private _shakeIntensity = 0;
  private _shakeAngle = 0;
  private _shakeOffsetX = 0;
  private _shakeOffsetY = 0;

  constructor(app: Application) {
    this._screenWidth = app.screen.width;
    this._screenHeight = app.screen.height;
    app.stage.addChild(this._world);
    this._applyTransform();
  }

  get x() {
    return this._x;
  }

  set x(value: number) {
    this._x = value;
    this._applyTransform();
  }

  get y() {
    return this._y;
  }

  set y(value: number) {
    this._y = value;
    this._applyTransform();
  }

  get zoom() {
    return this._zoom;
  }

  set zoom(value: number) {
    this._zoom = value;
    this._world.scale.set(value);
    this._applyTransform();
  }

  /** Larghezza visibile in unità del mondo. */
  get width() {
    return this._screenWidth / this._zoom;
  }

  get height() {
    return this._screenHeight / this._zoom;
  }

  /** Il contenitore a cui aggiungere ciò che vive nel mondo. */
  get world(): Container {
    return this._world;
  }

  isOutOfCameraLeft(object: { x: number; width: number }) {
    return (object.x - this._x) * this._zoom + object.width * this._zoom <= 0;
  }

  shake(intensity: number): void {
    this._shakeIntensity = intensity;
    this._shakeAngle = Math.PI;
  }

  update(dtSeconds: number): void {
    if (this._shakeIntensity <= 0) return;

    this._shakeIntensity = Math.max(0, this._shakeIntensity - SHAKE_DECAY_PER_SECOND * dtSeconds);
    this._shakeAngle += 150 + Math.random() * 60;
    this._shakeOffsetX = Math.sin(this._shakeAngle) * this._shakeIntensity * this._zoom;
    this._shakeOffsetY = Math.cos(this._shakeAngle) * this._shakeIntensity * this._zoom;
    this._applyTransform();
  }

  private _applyTransform(): void {
    // Lo stato vero è (x, y, zoom): la trasformazione del Container si ricava sempre da lì, così cambiare
    // zoom non sposta l'inquadratura. Math.round evita lo sfarfallio di sprite su mezzo pixel.
    const offsetX = this._shakeIntensity > 0 ? this._shakeOffsetX : 0;
    const offsetY = this._shakeIntensity > 0 ? this._shakeOffsetY : 0;
    this._world.x = Math.round(-this._x * this._zoom + offsetX);
    this._world.y = Math.round(-this._y * this._zoom + this._screenHeight + offsetY);
  }
}

const SHAKE_DECAY_PER_SECOND = 15;

export default Camera;
