// Ciò che cambia da un gioco all'altro, in un posto solo. Fuori da qui: index.html (testi, SEO) e la `base` di vite.config.ts.
// Il bilanciamento del gioco sta in config/livelli.ts.
export const GAME = {
  // Prefisso delle chiavi di localStorage: due giochi sullo stesso dominio non devono pestarsi le preferenze.
  storagePrefix: "ciufciuf",
  // Risoluzione logica: il mondo di gioco non cambia mai, a schermo si scala solo il canvas.
  // 480×270 inchioda la misura di tutti gli asset prodotti da strumenti/pulisci-immagini.py.
  width: 480,
  height: 270,
  orientation: "landscape" as "landscape" | "portrait",
  // true: texture in "nearest", niente antialias e scala intera quando lo spazio basta per 2x o più.
  pixelArt: true,
  background: "#2b2133",
  // Lo stesso font serve il DOM (styles.css) e i Text di Pixi: va dichiarato in @font-face o caricato da index.html.
  // Sintassi di font-family CSS: i nomi vanno tra virgolette ('"Press Start 2P", monospace'). Con una parola
  // che comincia con una cifra, senza virgolette document.fonts.load lancia e la partita non parte.
  fontFamily: "system-ui, sans-serif",
};
