# Componenti di terze parti

Ciò che il gioco pubblicato contiene e non è prodotto in questo repository. La pixel art
(`Web/public/assets/images`, bottoni e icone compresi) è generata con l'API di OpenAI
(`gpt-image-2.6-sunburst`) e ripulita qui da `Web/strumenti/pulisci-immagini.py`, che disegna anche
ruote, bielle, cornici e le icone dell'audio: la pubblichiamo sotto la licenza del repository. I
[termini d'uso di OpenAI](https://openai.com/policies/terms-of-use/) (versione europea del 16 gennaio 2026)
cedono l'output a chi lo genera («you own the Output») e vietano di presentarlo come opera umana: per
questo il README e la pagina del progetto dicono che la pixel art è generata con AI. Se e quanto
un'immagine generata sia tutelata dal diritto d'autore dipende dalla legge del paese, non dai termini.

| Componente | Uso | Licenza |
| --- | --- | --- |
| [PixiJS](https://github.com/pixijs/pixijs) | rendering della partita | MIT |
| [howler.js](https://github.com/goldfire/howler.js) | audio | MIT |
| [Navigo](https://github.com/krasimir/navigo) | router delle pagine | MIT |
| [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans) | font di menu, didascalie e scritte | SIL Open Font License 1.1 |

Gli strumenti di sviluppo (Vite, TypeScript, Vitest) non finiscono nel build.

## Suoni e musiche

Tagliati, messi in loop e normalizzati da `Web/strumenti/prepara-suoni.py`; i file sono in
`Web/public/assets/sounds/`.

Effetti: registrazioni da [Freesound](https://freesound.org), tutte in
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) (pubblico dominio, nessun obbligo di
attribuzione: gli autori sono citati per cortesia).

| File | Registrazione | Autore |
| --- | --- | --- |
| `marcia-vapore.mp3` | [Jacobite Steam Train](https://freesound.org/s/203175/) | BenNevis |
| `marcia-diesel.mp3` | [Diesel Train in Aarhus](https://freesound.org/s/163431/) | Denis Chapon |
| `marcia-elettrica.mp3` | [Electric Train Motor Idle - Loop](https://freesound.org/s/700034/) | JotrainG |
| `fischio-vapore.mp3` | [Steam Whistle](https://freesound.org/s/71778/) | Bidone |
| `fischio-vapore-corto.mp3` | [Steam Whistle](https://freesound.org/s/407394/) | mike_stranks |
| `fischio-diesel.mp3` | [Locomotive Horn (whistle)](https://freesound.org/s/278176/) | kangaroovindaloo |
| `fischio-elettrica.mp3` | [Elron](https://freesound.org/s/471063/) | Islabonita |
| `salto.mp3` | [single steam train chuff](https://freesound.org/s/623817/) | birdOfTheNorth |
| `atterraggio.mp3` | [Iron-Wood Slam](https://freesound.org/s/372877/) | Hakren |
| `urto.mp3` | [Brittle Wooden Box Landing On Floor 2](https://freesound.org/s/464484/) | elynch0901 |
| `schianto.mp3` | [snd_metal_smash](https://freesound.org/s/562198/) | gristi |

Musiche: di Kevin MacLeod ([incompetech.com](https://incompetech.com)), sotto
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), che chiede l'attribuzione qui sotto. Ne usiamo i
primi 105 secondi, con una dissolvenza in chiusura.

| File | Attribuzione |
| --- | --- |
| `musica-campagna.mp3` | "Hillbilly Swing" Kevin MacLeod (incompetech.com), Licensed under Creative Commons: By Attribution 4.0 License, http://creativecommons.org/licenses/by/4.0/ |
| `musica-cittadina.mp3` | "Life of Riley" Kevin MacLeod (incompetech.com), Licensed under Creative Commons: By Attribution 4.0 License, http://creativecommons.org/licenses/by/4.0/ |
| `musica-porto.mp3` | "Fiddles McGinty" Kevin MacLeod (incompetech.com), Licensed under Creative Commons: By Attribution 4.0 License, http://creativecommons.org/licenses/by/4.0/ |
