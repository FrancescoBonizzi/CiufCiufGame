# Ciuf Ciuf

**Una locomotiva corre lungo i binari: salta gli ostacoli e arriva in stazione.**

Gioco web 2D per tutti, pensato perché il livello facile sia giocabile anche da una bambina di quattro anni:
un solo comando (spazio, o un tocco sullo schermo), partite brevi con un traguardo, nessun punteggio.

In sviluppo: decisioni e fasi di lavoro in [ROADMAP.md](ROADMAP.md). Le meccaniche sono giocabili con
grafica ed effetti segnaposto; pixel art, musiche e calibrazione arrivano nelle fasi successive.

## Sviluppo

Il gioco web sta in `Web/` (PixiJS 8, Vite, TypeScript).

```sh
cd Web
npm install
npm run dev     # http://localhost:5173/ciufciuf-play/
npm test        # validaConfigurazione sulla configurazione rilasciata
npm run build
```

Il bilanciamento dei tre livelli sta in `Web/src/config/livelli.ts`. In sviluppo una configurazione con
un ostacolo impossibile blocca l'avvio e mostra cosa non va.

Componenti di terze parti: [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## Licenza

[MIT](LICENSE).
