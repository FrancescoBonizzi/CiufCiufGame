# Roadmap – Ciuf Ciuf

Gioco web 2D in cui una locomotiva corre da sola lungo i binari e salta gli ostacoli con un solo comando.
Ispirato al dinosauro di Chrome, ma ogni partita ha una durata e finisce in stazione con «Hai vinto!».
Pensato perché il livello facile sia davvero giocabile da una bambina di quattro anni.

Questo file raccoglie le decisioni prese prima di scrivere codice e le fasi di lavoro. Le specifiche
funzionali di partenza restano la fonte del *cosa*; qui c'è il *come* e ciò che le specifiche lasciavano
aperto. Ogni fase si chiude con le sue voci spuntate e una partita giocata davvero.

## Decisioni

### Prodotto

| Tema | Decisione | Perché |
| --- | --- | --- |
| Nome | **Ciuf Ciuf**: repo `CiufCiufGame`, URL `imaginesoftware.it/ciufciuf-play/`, prefisso `ciufciuf.` in `localStorage` | L'onomatopea che una bambina sa dire da sola. Cambiarlo dopo il rilascio rompe link e preferenze salvate. |
| Comandi | **Spazio** su PC, **tocco ovunque** su tablet e telefono. Nient'altro. | Il comando resta uno, ma una bambina di 4 anni gioca su tablet. |
| Salto | **Durata e altezza fisse** per livello: più velocità, più terreno coperto | Il ritmo della pressione non cambia mai e ogni ostacolo resta saltabile a ogni velocità (come Chrome Dino). |
| Treno | **Solo la locomotiva**, nessun vagone | Una hitbox corta e leggibile; i vagoni allungherebbero salti e distanze contro l'obiettivo del facile. |
| Urto nel facile | L'ostacolo **viene sbalzato via** (parabola, rotazione, suono buffo); il treno frena e riprende velocità in circa 2 s | L'urto si capisce e non spaventa; la partita non si interrompe. |
| HUD | **Barra del percorso**: una piccola locomotiva del colore scelto va dalla partenza alla stazione | Il traguardo si vede senza saper leggere; niente timer né punteggi. |
| Menu | **Illustrato, usabile da chi non legge**: tre righe di figure (locomotive, colori, scenari) e un grande bottone ▶; parole solo come didascalia; anteprima dal vivo della locomotiva colorata | La bambina sceglie e parte da sola. |
| Pausa | Esc o bottone in alto a destra; pausa automatica a scheda nascosta (già nello starter) | Il tocco sul bottone di pausa non fa saltare. |
| Scenari | **Campagna**, **cittadina con stazione**, **porto** con gru, navi e container, ispirati alle ferrovie dei cartoni per bambini senza nomi né personaggi | Ambienti che un bambino riconosce, sempre più fitti mentre il gioco accelera. Il porto rende colorato il livello difficile, che l'industria faceva grigio. |
| Grafica | **Segnaposto** finché le meccaniche non sono calibrate, poi **pixel art** generata con AI e ripulita (prompt in [`docs/prompt-pixel-art.md`](docs/prompt-pixel-art.md)) | Si calibra sul comportamento, non sull'aspetto. |
| Audio | Effetti e una musica per scenario, in una fase a parte; bottone audio nel menu | Il fischio del treno è metà del divertimento. |
| Testi | Italiano, tutti in un modulo `src/testi.ts` | Una traduzione futura tocca un file solo. |

### Tecnica

- **Base**: lo starter della skill `giochi-pixijs` (PixiJS 8, Vite, TypeScript, Howler, Navigo in modalità hash),
  copiato in `Web/` come negli altri giochi. Menu, vittoria e game over in HTML; Pixi solo in `#/game`.
- **Risoluzione logica 480×270**, ingrandita di un fattore intero (`nearest`, `image-rendering: pixelated`),
  letterbox in CSS. Inchioda la misura di tutti gli asset.
- **Tempo solo da `ticker.deltaMS`**: velocità in px/s, durate in secondi.
- **Mondo con origine sul binario**, salire è y negativa. Locomotiva ferma a x ≈ 80; scorrono scenario e ostacoli.
- **Distanze fra ostacoli in secondi di percorrenza**, non in pixel: con la velocità che sale la giocabilità
  regge da sola. Il generatore converte con la velocità di crociera del momento, senza il rallentamento
  dell'urto del facile: con quella gli ostacoli nascerebbero vicini e, a treno ripartito, arriverebbero fitti.
- **Colore della locomotiva per sostituzione di palette**: negli sprite la carrozzeria è disegnata in una
  rampa di magenta che nient'altro usa; al caricamento quei pixel prendono la rampa del colore scelto,
  mantenendo la luminosità. Un'immagine per locomotiva, nessuno strato separato.
- **Tutto il bilanciamento in `src/config/livelli.ts`**, un oggetto per livello; la logica non contiene numeri
  di gioco.
- **Controllo della configurazione all'avvio** (`validaConfigurazione`): per ogni livello verifica che ogni
  ostacolo sia saltabile alla velocità minima con una finestra ≥ a una soglia, che la distanza minima sia
  ≥ durata del salto + recupero, che la trave sia passabile da terra e colpita in salto. In sviluppo blocca
  l'avvio; un test lo esegue sulla configurazione rilasciata. È l'unico test previsto in partenza: il guasto
  che previene è un ostacolo impossibile che nessuno nota giocando.

### Il conto che lega velocità, salto e hitbox

La finestra di tempo in cui premere spazio supera l'ostacolo è:

```
finestra = T · √(1 − h / H)  −  (L + w) / v
```

`T` durata del salto, `H` altezza massima, `h` altezza dell'ostacolo, `L` lunghezza della hitbox della
locomotiva, `w` larghezza della hitbox dell'ostacolo, `v` velocità.

Conseguenza che contraddice l'intuizione: **rallentare stringe la finestra**. Con locomotiva da 64 px, salto
da 0,9 s e 90 px/s una staccionata non si supera nemmeno premendo al momento perfetto (conto dedotto,
da verificare col prototipo). Il facile quindi non si ottiene con una velocità minima, ma con salto più
lungo e alto, hitbox ridotte, pressione anticipata ricordata e velocità moderata.

L'altro vincolo è l'anticipo: con la locomotiva a x ≈ 80 restano circa 400 px di vista, quindi
`anticipo = 400 / v`. La velocità massima di ogni livello si ricava dall'anticipo che si vuole garantire.

### Valori di partenza (ipotesi da calibrare in fase 5)

| Parametro | Facile – Campagna | Medio – Cittadina | Difficile – Porto |
| --- | --- | --- | --- |
| Durata partita | 60 s | 90 s | 120 s |
| Velocità iniziale → massima | 110 → 140 px/s | 200 → 300 px/s | 260 → 380 px/s |
| Velocità massima raggiunta a | 80 % della durata | 80 % | 80 % |
| Anticipo a velocità massima | ≈ 2,9 s | ≈ 1,3 s | ≈ 1,05 s |
| Salto: durata / altezza | 1,3 s / 80 px | 0,8 s / 64 px | 0,7 s / 64 px |
| Hitbox locomotiva | 40×28 | 48×32 | 48×32 |
| Pressione anticipata ricordata | 250 ms | 120 ms | 80 ms |
| Ostacoli per sequenza | 1–3 | 2–5 | 3–6 |
| Distanza fra ostacoli | ≥ larghezza schermo (uno alla volta) | da 2,0 s a 1,2 s col procedere | da 1,4 s a 0,9 s |
| Distanza fra sequenze | 3 s di schermo vuoto | 2 s | 1,5 s |
| Urto | velocità × 0,4, ritorno in ≈ 2 s | game over | game over |

Le distanze minime vanno sempre rilette contro `T` + recupero: nel difficile 0,9 s supera di poco 0,7 s di
salto ed è il primo valore da provare.

### Generazione degli ostacoli

- Il generatore sceglie un tipo con un peso configurabile, produce una sequenza di N ostacoli di quel tipo
  (N fra minimo e massimo del livello), e sceglie il tipo successivo **solo quando l'ultimo ostacolo della
  sequenza è uscito dallo schermo**. Due tipi diversi non sono mai visibili insieme.
- Lo stesso tipo non si ripete in due sequenze di fila (parametro, acceso di default): varietà controllata.
- Nel difficile la varietà di dimensioni sta **dentro il tipo** (container a 1, 2 o 3 piani; barili singoli o
  doppi), sempre entro l'altezza saltabile verificata all'avvio.
- **Trave metallica** (solo difficile): bordo inferiore a 48 px dal binario, locomotiva alta 40 px. Da
  terra passa, in salto la colpisce. Una sequenza di travi si supera non premendo niente.
- Gli ostacoli nascono fuori dallo schermo a destra e sono oggetti riciclati da un pool.

### Fine partita

- **Vittoria**: a `durata − anticipo di chiusura` il generatore smette di creare ostacoli, così l'ultimo esce
  prima dell'arrivo. Alla durata entra da destra la stazione, la locomotiva rallenta (`Numbers.damp`) e si
  ferma al marciapiede, fischio, poi la schermata «Hai vinto!» con «Ancora» e «Menu».
- **Sconfitta** (medio e difficile): il gioco si ferma, attesa breve contata in `update`, poi game over con
  «Riprova» e «Menu».
- Navigazione con `replaceState`: «indietro» non fa ripartire una partita.

### Preferenze

Tipo di locomotiva, colore, livello e audio acceso/spento in `localStorage` con chiave `ciufciuf.preferenze`,
in `try/catch`; un valore illeggibile torna ai default senza errori.

## Fasi

### 0. Repo e starter

- [x] Repo pubblico `FrancescoBonizzi/CiufCiufGame`, licenza MIT, questa roadmap
- [x] Starter copiato in `Web/`, versioni delle librerie confrontate con quelle correnti: pixi.js 8.23;
      Vite 8 e TypeScript 7 sono major nuove e restano fuori finché non se ne legge la migrazione (Vite 7.3, TS 5.9)
- [x] Rinomina (`nome-gioco` → `ciufciuf`), `base` di Vite con la `/` finale, risoluzione 480×270 pixel art
- [x] Demo dello starter giocata una volta: menu → partita → game over regge
- [x] `README.md`, `THIRD-PARTY-NOTICES.md`

### 1. La locomotiva che salta

- [x] Binario e terreno che scorrono (segnaposto, texture ripetute in `TilingSprite`)
- [x] Locomotiva segnaposto ferma a x ≈ 80, salto a durata e altezza fisse, pressione anticipata ricordata
- [x] Input unico: spazio e tocco sull'area di gioco, ignorato sul bottone di pausa
- [x] Un ostacolo segnaposto, collisione per hitbox, game over
- [x] `src/config/livelli.ts` con i valori della tabella, letti dalla logica

### 2. Livelli, generatore, durata

- [x] Curva di velocità configurabile (iniziale, massima, tempo per raggiungerla)
- [x] Generatore a sequenze omogenee con pesi, N per sequenza, distanze in secondi, attesa dello schermo vuoto
- [x] Ostacoli segnaposto di tutti gli 11 tipi, con le varianti di dimensione del difficile
- [x] `validaConfigurazione` e il suo test sulla configurazione rilasciata
- [x] Durata, fine generazione, stazione d'arrivo, frenata, schermata «Hai vinto!»
- [x] Game over con «Riprova» e «Menu»

### 3. Regole speciali

- [x] Facile: ostacolo sbalzato via, frenata e ripresa, nessun game over
- [x] Difficile: trave metallica, passabile da terra, letale in salto

### 4. Menu, HUD, mobile

- [x] Menu illustrato con anteprima dal vivo della locomotiva colorata (segnaposto fino alla fase 6)
- [x] Sostituzione di palette sulla carrozzeria
- [x] Preferenze salvate e ripristinate
- [x] Barra del percorso
- [x] Pausa (Esc, bottone, scheda nascosta)
- [ ] Prova su tablet e telefono: tocco, overlay di rotazione, letterbox (fatta su iPhone 13 emulato in
      Chrome; resta la prova su un dispositivo vero)

Come sono state provate le fasi 1–4: in sviluppo `Game` espone il suo stato in `window.__ciufciuf`
(Vite lo toglie dal build), e una prova Playwright fa giocare un bot che salta al centro della finestra.
Medio e difficile sono arrivati in stazione senza urti; il facile senza nessun input arriva in stazione
sbalzando gli ostacoli. Non prova che siano *divertenti*: quello è la fase 5.

Fatti in anticipo, perché costavano poco: polvere all'atterraggio (fase 6) e i meta SEO dello starter in
`index.html` (fase 8; canonical e immagine puntano a pagine del sito che ancora non esistono).

Grafica ed effetti segnaposto sono prodotti nel repository: le figure disegnate a codice in
`src/grafica/segnaposto.ts`, con le misure e la rampa magenta degli sprite veri, e gli effetti sintetizzati da
`strumenti/genera-suoni.py`. Le fasi 6 e 7 cambiano da dove vengono le immagini e i suoni, non chi li usa.

### 5. Calibrazione

- [ ] Partite del facile con la bambina: annotare urti per partita, dove esita, se capisce la fine
- [ ] Medio e difficile giocati da un adulto fino alla vittoria: nessun passaggio impossibile, nessun picco
- [ ] Valori aggiornati in `livelli.ts` e nella tabella di questo file, con cosa li ha fatti cambiare

### 6. Pixel art

- [ ] Generazione con i prompt di [`docs/prompt-pixel-art.md`](docs/prompt-pixel-art.md)
- [ ] Pulizia: riportare ogni immagine alla griglia vera (ridimensionamento nearest), ridurre alla palette,
      controllare che la rampa magenta compaia solo sulla carrozzeria
- [ ] Atlas, animazioni (ruote, fumo, scintille), sfondi in parallasse per i tre scenari
- [ ] Particelle: polvere all'atterraggio, pezzi dell'ostacolo sbalzato, fumo per tipo di locomotiva
- [ ] Hitbox rilette sugli sprite veri e `validaConfigurazione` ancora verde

### 7. Audio

- [ ] Effetti: salto, atterraggio, urto buffo, schianto, fischio di partenza e arrivo, ciuf-ciuf per tipo
- [ ] Una musica per scenario, volume 0,4
- [ ] Licenze in `THIRD-PARTY-NOTICES.md` per tutto ciò che non è prodotto nel repo

### 8. Pubblicazione

- [ ] SEO della pagina giocabile (`noindex, follow`, `canonical`, JSON-LD `VideoGame`)
- [ ] Import in `site-craft/apps/imagine-software` (`import-ciufciuf`), redirect di sviluppo in `next.config.ts`
- [ ] Pagina del progetto sul sito, screenshot nel README

## Fuori dallo scopo

Punteggi, record, classifiche, monete, collezionabili, bonus, potenziamenti, sblocchi: esclusi dalle
specifiche e da non reintrodurre. Vagoni, altri comandi oltre al salto, livelli scelti separatamente dallo
scenario.
