# Componenti di terze parti

Ciò che il gioco pubblicato contiene e non è prodotto in questo repository. Icone dei bottoni
(`Web/src/ui/icone.ts`) ed effetti sonori (`Web/strumenti/genera-suoni.py`) sono prodotti qui, sotto la
licenza del repository. La pixel art (`Web/public/assets/images`) è generata con l'API di OpenAI
(`gpt-image-2.6-sunburst`, i cui termini lasciano l'output a chi lo genera) e ripulita qui da
`Web/strumenti/pulisci-immagini.py`, che disegna anche ruote e bielle: anch'essa sotto la licenza del
repository.

| Componente | Uso | Licenza |
| --- | --- | --- |
| [PixiJS](https://github.com/pixijs/pixijs) | rendering della partita | MIT |
| [howler.js](https://github.com/goldfire/howler.js) | audio | MIT |
| [Navigo](https://github.com/krasimir/navigo) | router delle pagine | MIT |
| [Lucide](https://lucide.dev) `rotate-cw` | icona «Ruota il dispositivo» | ISC |

Gli strumenti di sviluppo (Vite, TypeScript, Vitest) non finiscono nel build.
