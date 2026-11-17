import { Howler } from "howler";

// Gli eventi che contano come gesto dell'utente per l'autoplay: con il tocco lo sono la fine del tocco e il
// click, non pointerdown.
const GESTURES = ["pointerup", "touchend", "click", "keydown"] as const;

// I browser creano l'AudioContext sospeso finché non c'è un gesto dell'utente: i play prima di allora
// non danno errore, semplicemente non si sentono.
export const wireAudioUnlockOnce = () => {
  const unlock = async () => {
    try {
      await unlockHowler();
    } catch {}
    // Si smette di ascoltare solo a sblocco riuscito: un gesto che non è bastato lascia il posto al prossimo.
    if (isAudioUnlocked()) {
      for (const gesture of GESTURES) window.removeEventListener(gesture, unlock);
    }
  };

  for (const gesture of GESTURES) window.addEventListener(gesture, unlock, { passive: true });
};

// WARNING: va chiamata direttamente dal gestore del gesto. Safari sblocca solo se l'audio parte nello
// stack dell'evento: non dopo un await, non in un setTimeout.
export const unlockHowler = async () => {
  const audioContext = Howler.ctx;
  if (!audioContext) return;

  // Un buffer muto da un campione, avviato prima di qualunque await: alcuni Safari restano muti finché
  // non suona qualcosa dentro il gesto. Si scollega a fine riproduzione, non subito.
  if (Howler.usingWebAudio) {
    const source = audioContext.createBufferSource();
    source.buffer = audioContext.createBuffer(1, 1, audioContext.sampleRate);
    source.connect((Howler as unknown as Record<string, AudioNode>)["masterGain"] ?? audioContext.destination);
    source.onended = () => source.disconnect();
    source.start(0);
  }

  if (audioContext.state !== "running") {
    await audioContext.resume();
  }
  // Niente Howler.mute(false) qui: il muto è la preferenza "audio spento" del menu, e lo sblocco non la tocca.
};

export const isAudioUnlocked = (): boolean => Howler.ctx?.state === "running";
