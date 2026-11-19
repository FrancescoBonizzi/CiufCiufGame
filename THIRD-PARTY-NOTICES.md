# Componenti di terze parti

Ciò che il gioco pubblicato contiene e non è prodotto in questo repository. Gli effetti sonori
(`Web/strumenti/genera-suoni.py`) sono prodotti qui, sotto la licenza del repository. La pixel art
(`Web/public/assets/images`, bottoni e icone compresi) è generata con l'API di OpenAI
(`gpt-image-2.6-sunburst`) e ripulita qui da `Web/strumenti/pulisci-immagini.py`, che disegna anche
ruote, bielle, cornici e le icone dell'audio: la pubblichiamo sotto la licenza del repository. Da
verificare sui termini d'uso di OpenAI prima della pubblicazione (fase 8).

| Componente | Uso | Licenza |
| --- | --- | --- |
| [PixiJS](https://github.com/pixijs/pixijs) | rendering della partita | MIT |
| [howler.js](https://github.com/goldfire/howler.js) | audio | MIT |
| [Navigo](https://github.com/krasimir/navigo) | router delle pagine | MIT |
| [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans) | font di menu, didascalie e scritte | SIL Open Font License 1.1 |

Gli strumenti di sviluppo (Vite, TypeScript, Vitest) non finiscono nel build.
