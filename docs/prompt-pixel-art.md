# Pixel art: come si produce

Le immagini del gioco si generano con l'API di OpenAI e si ripuliscono a codice. I prompt stanno in
[`Web/strumenti/genera-immagini.py`](../Web/strumenti/genera-immagini.py), la pulizia in
[`Web/strumenti/pulisci-immagini.py`](../Web/strumenti/pulisci-immagini.py): questo file tiene le regole che
entrambi seguono.

Risoluzione logica del gioco: **480×270**. Nessun generatore produce pixel perfetti: produce immagini grandi
(1536×1024) disegnate su una griglia grossa ma irregolare, con decine di migliaia di colori. La pulizia è
sempre prevista.

## Il giro

Dalla cartella `Web/`, con Pillow installato e la chiave in `~/.config/ciufciuf/openai.key`:

1. `python3 strumenti/genera-immagini.py <id> [quante]`: le grezze vanno in `strumenti/.grezze/<id>/`,
   esclusa da git, e i token consumati in `strumenti/.grezze/consumi.jsonl`.
2. Per gli sfondi: `python3 strumenti/genera-immagini.py ripetibile <id> <file>` per renderli ripetibili in
   orizzontale.
3. Si sceglie la grezza migliore in `strumenti/scelte-immagini.json`.
4. `python3 strumenti/pulisci-immagini.py [id ...]` scrive i PNG in `public/assets/images/`, poi
   `python3 strumenti/pulisci-immagini.py anteprima` dà un foglio ingrandito di tutto per controllarli.

Modello: `gpt-image-2.6-sunburst`, qualità alta. Delle due varianti 2.6 è quella pensata per il dettaglio e
per gli asset finali (Flare è quella veloce).

## Cosa fa la pulizia

- Riduce la palette a piena risoluzione raggruppando le tinte per distanza, poi riduce la misura dando a ogni
  pixel il colore **prevalente** del suo blocco. Una media (ridimensionamento BOX) trasforma una campana dorata
  piccola in una macchia beige.
- Rifà il contorno scuro `#2b2133` di 1 px su locomotive e ostacoli. Gli sfondi restano senza contorno.
- Riporta ogni ostacolo alla misura esatta di `src/config/ostacoli.ts`, da cui dipendono le hitbox.

## Locomotive

Il generatore disegna **solo la carrozzeria, senza ruote né bielle**: non tiene ferma una biella fra un
fotogramma e l'altro. Ruote, biella d'accoppiamento e, nel vapore, cilindro e biella motrice le disegna
`pulisci-immagini.py`, in un foglio di **8 fotogrammi da 64×40**. Tutte guardano a **destra**, con le ruote
sull'ultima riga.

La carrozzeria (il colore che il giocatore sceglie) usa **solo** la rampa magenta, che nient'altro può usare:
il gioco la sostituisce col colore scelto. La pulizia porta su questa rampa ogni tinta magenta della
carrozzeria e sposta di un'unità ogni altro pixel che ci cadesse sopra per caso.

Rampa magenta (dalla luce all'ombra): `#ff9cff`, `#ff3dff`, `#c400c4`, `#7a007a`.

## Stile comune

16-bit, leggibile da una bambina di 4 anni: vista laterale ortogonale, forme tonde da cartone, al massimo 3
toni per materiale, luce dall'alto a sinistra, niente sfumature, retini o testo.

Le tre ambientazioni (campagna, cittadina con stazione, porto) si ispirano alle ferrovie dei cartoni per
bambini, senza copiarle: nei prompt niente nomi di serie, personaggi o luoghi, niente facce sulle
locomotive. Un generatore che legge un nome noto tende a riprodurne i personaggi.

## Leggibilità: ostacoli contro sfondo

- Il contorno scuro spetta solo a locomotiva e ostacoli. Gli strati di sfondo non ne hanno: ciò che si tocca
  si stacca da ciò che si guarda.
- Ogni strato di sfondo sfuma verso il colore dell'orizzonte, di più quanto è lontano; gli ostacoli restano
  saturi.
- Nello strato vicino al binario niente che somigli a un ostacolo dello stesso livello: niente staccionate o
  balle di fieno in campagna, niente casse o segnali sul marciapiede in cittadina, nessun container né barile
  sulla banchina al porto. Negli strati lontani ciò che gli somiglia (le pile di container dietro le gru) è
  ammesso solo attenuato verso il cielo.
- Il cavo che regge la trave è scenografia, disegnato a codice: acciaio grigio, senza contorno scuro.
