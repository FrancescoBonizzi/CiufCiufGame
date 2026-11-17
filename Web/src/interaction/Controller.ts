// Il comando è uno solo: spazio su PC, tocco ovunque nell'area di gioco su tablet e telefono.
class Controller {
  private _pressed = false;
  private _justPressed = false;

  /**
   * @param _pointerTarget l'area in cui un tocco vale come salto. I bottoni sopra di lei (pausa) fermano
   * la propagazione del loro pointerdown, così toccarli non fa saltare.
   */
  constructor(private readonly _pointerTarget: EventTarget) {
    window.addEventListener("keydown", this.keyDownHandler);
    window.addEventListener("keyup", this.keyUpHandler);
    _pointerTarget.addEventListener("pointerdown", this.downHandler);
    _pointerTarget.addEventListener("pointerup", this.upHandler);
    // Un tocco annullato dal sistema (gesto di navigazione, notifica) non manda pointerup.
    _pointerTarget.addEventListener("pointercancel", this.upHandler);

    // Senza reset, un tasto rilasciato mentre la finestra non ha il fuoco resta "premuto" per sempre.
    window.addEventListener("blur", this.reset);
    document.addEventListener("visibilitychange", this.reset);
  }

  private keyDownHandler = (e: KeyboardEvent) => {
    if (e.code !== "Space") return;
    // Su un bottone col fuoco (Riprendi, Menu raggiunti con Tab) lo spazio lo attiva e non fa saltare.
    if (e.target instanceof HTMLButtonElement) return;
    e.preventDefault();
    // L'autorepeat della tastiera non è una nuova pressione.
    if (e.repeat) return;
    this.downHandler();
  };

  private keyUpHandler = (e: KeyboardEvent) => {
    if (e.code === "Space") this.upHandler();
  };

  private downHandler = () => {
    if (!this._pressed) {
      this._pressed = true;
      this._justPressed = true;
    }
  };

  private upHandler = () => {
    this._pressed = false;
  };

  /** Dimentica le pressioni in sospeso: alla ripresa dalla pausa non deve partire un salto. */
  reset = () => {
    this._pressed = false;
    this._justPressed = false;
  };

  /** true una volta sola per pressione. */
  consumePress(): boolean {
    if (this._justPressed) {
      this._justPressed = false;
      return true;
    }
    return false;
  }

  // WARNING: senza dispose ogni partita lascia i suoi listener sulla finestra, e restano vivi per sempre.
  dispose(): void {
    window.removeEventListener("keydown", this.keyDownHandler);
    window.removeEventListener("keyup", this.keyUpHandler);
    this._pointerTarget.removeEventListener("pointerdown", this.downHandler);
    this._pointerTarget.removeEventListener("pointerup", this.upHandler);
    this._pointerTarget.removeEventListener("pointercancel", this.upHandler);
    window.removeEventListener("blur", this.reset);
    document.removeEventListener("visibilitychange", this.reset);
  }
}

export default Controller;
