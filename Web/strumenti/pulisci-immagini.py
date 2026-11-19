"""Riporta le immagini grezze di genera-immagini.py alla griglia vera del gioco.

Uso (dalla cartella Web/, con Pillow installato):
  python3 strumenti/pulisci-immagini.py [id ...]     senza id: tutti (vedi PULITORI)
  python3 strumenti/pulisci-immagini.py anteprima    foglio di controllo ingrandito in .grezze/anteprima.png

Quale immagine grezza usare per ogni asset lo dice strumenti/scelte-immagini.json (id -> nome del file in
.grezze/<id>/). Le grezze non sono nel repository: il file delle scelte dice da dove viene ogni PNG.

Cosa fa: ritaglia, riduce alla misura finale, riduce i colori, ridipinge la carrozzeria sulla rampa magenta
esatta (che nient'altro può usare), rifà il contorno scuro di 1 px. Le ruote e le bielle delle locomotive
le disegna qui, a codice: un generatore non tiene ferma una biella fra un fotogramma e l'altro.
"""
import json
import math
import sys
from pathlib import Path

from PIL import Image

QUI = Path(__file__).resolve().parent
GREZZE = QUI / ".grezze"
IMMAGINI = QUI.parent / "public" / "assets" / "images"
SCELTE = QUI / "scelte-immagini.json"

CONTORNO = (0x2B, 0x21, 0x33)
# Le stesse tinte di src/grafica/palette.ts, dalla luce all'ombra.
RAMPA = [(0xFF, 0x9C, 0xFF), (0xFF, 0x3D, 0xFF), (0xC4, 0x00, 0xC4), (0x7A, 0x00, 0x7A)]

Rgb = tuple[int, int, int]


def luminanza(c: Rgb) -> float:
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def magentoso(c: Rgb) -> bool:
    r, g, b = c
    return r > 70 and b > 70 and g < min(r, b) - 50 and abs(r - b) < 90


def carica(id_asset: str) -> Image.Image:
    scelte = json.loads(SCELTE.read_text())
    return Image.open(GREZZE / id_asset / scelte[id_asset]).convert("RGBA")


def ritaglia(im: Image.Image) -> Image.Image:
    maschera = im.getchannel("A").point(lambda a: 255 if a >= 128 else 0)
    return im.crop(maschera.getbbox())


def raggruppa(im: Image.Image, alfa: Image.Image, distanza: float) -> tuple[list[int], list[Rgb]]:
    """Palette per distanza: ogni tinta lontana dalle altre resta, per quanto piccola (il vetro azzurro di un
    finestrino), mentre le sfumature di una stessa tinta si fondono. Restituisce l'indice di ogni pixel."""
    pixel = list(im.convert("RGB").getdata())
    pieni = list(alfa.getdata())
    # Canali a passi di 4: il rumore del generatore non moltiplica i colori da confrontare.
    ridotti = [((r >> 2) << 2, (g >> 2) << 2, (b >> 2) << 2) for r, g, b in pixel]
    conteggio: dict[Rgb, int] = {}
    for c, a in zip(ridotti, pieni):
        if a:
            conteggio[c] = conteggio.get(c, 0) + 1
    totale = sum(conteggio.values())
    centri: list[list[float]] = []  # somma pesata r, g, b e peso
    assegnati: dict[Rgb, int] = {}
    d2 = distanza * distanza
    for c, n in sorted(conteggio.items(), key=lambda kv: -kv[1]):
        migliore, dm = -1, d2
        for i, (sr, sg, sb, sn) in enumerate(centri):
            d = (c[0] - sr / sn) ** 2 + (c[1] - sg / sn) ** 2 + (c[2] - sb / sn) ** 2
            if d < dm:
                migliore, dm = i, d
        # Una tinta nuova nasce solo se pesa abbastanza: i pixel di passaggio fra due tinte non contano.
        if migliore < 0 and n * 4000 < totale and centri:
            migliore = min(range(len(centri)), key=lambda i: sum((c[k] - centri[i][k] / centri[i][3]) ** 2 for k in range(3)))
        if migliore < 0:
            centri.append([c[0] * n, c[1] * n, c[2] * n, n])
            migliore = len(centri) - 1
        else:
            centri[migliore] = [centri[migliore][0] + c[0] * n, centri[migliore][1] + c[1] * n,
                                centri[migliore][2] + c[2] * n, centri[migliore][3] + n]
        assegnati[c] = migliore
    tavolozza = [(round(r / n), round(g / n), round(b / n)) for r, g, b, n in centri]
    return [assegnati.get(c, 0) for c in ridotti], tavolozza


def riduci(im: Image.Image, larghezza: int, altezza: int, distanza: float = 40, magenta: bool = False,
           contorno: bool = True, buchi: bool = False) -> Image.Image:
    """Ridimensiona a (larghezza, altezza): ogni pixel prende il colore prevalente del suo blocco.

    La palette si riduce prima, a piena risoluzione: una media fra pixel (ridimensionamento BOX) trasforma
    una campana dorata piccola in una macchia beige, il colore prevalente no.
    """
    alfa_grande = im.getchannel("A").point(lambda a: 255 if a >= 128 else 0)
    indici, tavolozza = raggruppa(im, alfa_grande, distanza)
    finali: list[Rgb] = []
    for c in tavolozza:
        if magenta and magentoso(c):
            c = min(RAMPA, key=lambda m: abs(luminanza(m) - luminanza(c)))
        elif c in RAMPA:
            c = (c[0], c[1] - 1 if c[1] else 1, c[2])  # la rampa resta riservata alla carrozzeria
        elif contorno and luminanza(c) < 50:
            c = CONTORNO
        finali.append(c)

    pa = alfa_grande.load()
    lg = im.width
    out = Image.new("RGBA", (larghezza, altezza), (0, 0, 0, 0))
    po = out.load()
    sx, sy = im.width / larghezza, im.height / altezza
    for y in range(altezza):
        y0, y1 = int(y * sy), max(int(y * sy) + 1, int((y + 1) * sy))
        for x in range(larghezza):
            x0, x1 = int(x * sx), max(int(x * sx) + 1, int((x + 1) * sx))
            conti: dict[int, int] = {}
            pieni = 0
            for yy in range(y0, y1):
                for xx in range(x0, x1):
                    if pa[xx, yy]:
                        pieni += 1
                        k = indici[yy * lg + xx]
                        conti[k] = conti.get(k, 0) + 1
            if pieni * 2 < (x1 - x0) * (y1 - y0):
                continue
            po[x, y] = (*finali[max(conti, key=conti.get)], 255)
    if buchi:
        chiudi_buchi(out, im.getchannel("A").resize((larghezza, altezza), Image.BOX))
    if contorno:
        rifai_contorno(out)
    return out


def chiudi_buchi(im: Image.Image, velo: Image.Image) -> Image.Image:
    """Riempie i vuoti chiusi dentro la figura: il generatore a volte lascia il centro semitrasparente.

    Buco è un pixel vuoto che dal bordo non si raggiunge passando per pixel vuoti e che nella grezza aveva un
    velo di colore (alfa media in velo > 10): l'interno di una freccia circolare, davvero vuoto, resta vuoto.
    Ogni buco prende il colore pieno più frequente fra i vicini, dall'esterno verso l'interno.
    """
    l, a = im.size
    p, pv = im.load(), velo.load()
    fuori = [[False] * l for _ in range(a)]
    coda = [(x, y) for x in range(l) for y in (0, a - 1)] + [(x, y) for y in range(a) for x in (0, l - 1)]
    while coda:
        x, y = coda.pop()
        if not (0 <= x < l and 0 <= y < a) or fuori[y][x] or p[x, y][3]:
            continue
        fuori[y][x] = True
        coda += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    buchi = {(x, y) for y in range(a) for x in range(l) if not p[x, y][3] and not fuori[y][x] and pv[x, y] > 10}
    while buchi:
        riempiti = {}
        for x, y in buchi:
            vicini = [p[x + dx, y + dy] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                      if 0 <= x + dx < l and 0 <= y + dy < a and p[x + dx, y + dy][3]]
            if vicini:
                riempiti[(x, y)] = max(set(vicini), key=vicini.count)
        if not riempiti:
            break
        for xy, c in riempiti.items():
            p[xy] = c
        buchi -= riempiti.keys()
    return im


def rifai_contorno(im: Image.Image) -> None:
    """Ogni pixel pieno che confina col vuoto diventa contorno: 1 px, uguale dappertutto."""
    l, a = im.size
    p = im.load()
    pieno = [[p[x, y][3] > 0 for x in range(l)] for y in range(a)]
    for y in range(a):
        for x in range(l):
            if not pieno[y][x]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if not (0 <= nx < l and 0 <= ny < a) or not pieno[ny][nx]:
                    p[x, y] = (*CONTORNO, 255)
                    break


def adatta(im: Image.Image, larghezza: int, altezza: int) -> tuple[int, int]:
    """Misura che entra in (larghezza, altezza) mantenendo le proporzioni."""
    s = min(larghezza / im.width, altezza / im.height)
    return max(1, round(im.width * s)), max(1, round(im.height * s))


def salva(im: Image.Image, percorso: str) -> None:
    file = IMMAGINI / percorso
    file.parent.mkdir(parents=True, exist_ok=True)
    im.save(file)
    print(f"{percorso}: {im.width}×{im.height}")


# --- Locomotive: carrozzeria generata + ruote e bielle a codice -------------------------------------------

FOTOGRAMMA = (64, 40)
FOTOGRAMMI = 8
GRIGIO_RUOTA = (0x5B, 0x54, 0x66)
GRIGIO_CHIARO = (0x9A, 0x93, 0xA6)
ACCIAIO = (0xC9, 0xC3, 0xD1)
ACCIAIO_SCURO = (0x8A, 0x84, 0x94)
RAGGIO_FONDO = (0x47, 0x40, 0x52)
RAGGIO = (0x6A, 0x62, 0x78)
CONTRAPPESO = (0xA9, 0xA2, 0xB6)

# WARNING: il raggio delle ruote motrici è copiato in RAGGIO_RUOTE di src/grafica/locomotive.ts, che ne ricava
# la velocità di rotolamento: chi lo cambia qui lo cambia anche lì.
# Per tipo: altezza della carrozzeria, ruote (centro x, raggio, colore del mozzo), se ha la biella
# d'accoppiamento, per il vapore il cilindro (x del bordo sinistro) da cui parte la biella motrice e, per la
# diesel, i carrelli (x della prima e dell'ultima ruota, raggio) di cui disegnare il telaio; "rialzo" sono le
# righe fra il fondo della carrozzeria e il fondo del fotogramma (8 con ruote grandi, 6 con piccole).
LOCOMOTIVE = {
    "vapore": {"altezza": 31, "ruote": [(17, 7, (0xD6, 0x3C, 0x3C)), (35, 7, (0xD6, 0x3C, 0x3C))],
               "piccole": [], "biella": True, "cilindro": 51},
    # Diesel: due carrelli a due assi, come le diesel vere; niente biella, che la farebbe sembrare una vapore.
    "diesel": {"altezza": 31, "ruote": [(12, 4, GRIGIO_RUOTA), (21, 4, GRIGIO_RUOTA), (42, 4, GRIGIO_RUOTA),
                                         (51, 4, GRIGIO_RUOTA)], "piccole": [], "biella": False,
               "carrelli": [(12, 21, 4), (42, 51, 4)]},
    # Elettrica: treno ad alta velocità basso e affusolato; ruote piccole che sbucano appena sotto le gonne.
    "elettrica": {"altezza": 32, "ruote": [(9, 3, GRIGIO_RUOTA), (16, 3, GRIGIO_RUOTA), (38, 3, GRIGIO_RUOTA),
                                            (45, 3, GRIGIO_RUOTA)], "piccole": [], "biella": False, "rialzo": 4},
}


def pixel(p, l: int, a: int, x: float, y: float, c: Rgb) -> None:
    x, y = int(round(x)), int(round(y))
    if 0 <= x < l and 0 <= y < a:
        p[x, y] = (*c, 255)


def disco(p, l, a, cx, cy, r, c) -> None:
    for y in range(-r, r + 1):
        for x in range(-r, r + 1):
            if x * x + y * y <= r * r + r * 0.8:
                pixel(p, l, a, cx + x, cy + y, c)


def ruota(p, l, a, cx, cy, r, angolo) -> None:
    """Ruota senza mozzo: il mozzo si disegna dopo le bielle, che altrimenti lo coprirebbero."""
    disco(p, l, a, cx, cy, r + 1, CONTORNO)
    disco(p, l, a, cx, cy, r, GRIGIO_RUOTA)
    if r >= 5:
        # WARNING: otto raggi a 45° che girano di 45° a fotogramma sembrano fermi. I raggi restano tenui e il
        # giro lo mostra il contrappeso a mezzaluna, opposto al perno di manovella come sulle ruote vere.
        disco(p, l, a, cx, cy, r - 1, RAGGIO_FONDO)
        for k in range(4):
            t = angolo + k * math.pi / 4
            for d in range(-r + 1, r):
                pixel(p, l, a, cx + math.cos(t) * d, cy + math.sin(t) * d, RAGGIO)
        opposto = angolo + math.pi
        for y in range(-r, r + 1):
            for x in range(-r, r + 1):
                d = math.hypot(x, y)
                scarto = (math.atan2(y, x) - opposto + math.pi) % (2 * math.pi) - math.pi
                if r * 0.45 <= d <= r - 1 and abs(scarto) <= 0.75:
                    pixel(p, l, a, cx + x, cy + y, CONTRAPPESO)
    else:
        # Un raggio solo, dal centro al cerchione: si ripete ogni 360°, così anche il passo di circa 120° per
        # frame dell'elettrica (raggio 3, 380 px/s, 60 fps) si legge in avanti; un diametro si ripeterebbe ogni
        # 180°. Sotto i 40 fps circa il passo supera i 180° e le ruote sembrano girare all'indietro.
        for d in range(0, r):
            pixel(p, l, a, cx + math.cos(angolo) * d, cy + math.sin(angolo) * d, GRIGIO_CHIARO)


def linea(p, l, a, x0, y0, x1, y1, c) -> None:
    passi = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for i in range(passi + 1):
        t = i / passi
        pixel(p, l, a, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, c)


def motrice(p, l, a, px: float, py: float, asse: int, cilindro: int) -> None:
    """Cilindro, testa a croce e biella motrice del vapore.

    La testa a croce scorre in orizzontale sulla linea dell'asse; la biella, di lunghezza fissa, la unisce
    al perno: quando il perno sale o scende la biella si inclina e la testa a croce va avanti e indietro.
    """
    # Al punto morto anteriore la testa a croce arriva a perno + raggio del perno + lunghezza: il cilindro
    # (LOCOMOTIVE["vapore"]["cilindro"]) comincia oltre, così la biella non ci entra mai.
    lunghezza = 10
    croce = px + math.sqrt(lunghezza ** 2 - (py - asse) ** 2)
    # Stelo del pistone, dalla testa a croce dentro il cilindro.
    linea(p, l, a, croce, asse, cilindro + 2, asse, ACCIAIO_SCURO)
    for y in range(asse - 3, asse + 4):
        for x in range(cilindro, cilindro + 8):
            bordo = y in (asse - 3, asse + 3) or x in (cilindro, cilindro + 7)
            pixel(p, l, a, x, y, CONTORNO if bordo else (0x3A, 0x33, 0x40) if y > asse else (0x5B, 0x54, 0x66))
    for y in (asse - 1, asse + 1):
        linea(p, l, a, px, py + (y - asse), croce, y, CONTORNO)
    linea(p, l, a, px, py, croce, asse, ACCIAIO)
    for dy in (-1, 0, 1):
        pixel(p, l, a, croce, asse + dy, ACCIAIO if dy == 0 else CONTORNO)
    pixel(p, l, a, px, py, ACCIAIO_SCURO)


def foglio_locomotiva(tipo: str) -> Image.Image:
    conf = LOCOMOTIVE[tipo]
    l, a = FOTOGRAMMA
    corpo = ritaglia(carica(tipo))
    lc, ac = adatta(corpo, l - 2, conf["altezza"])
    corpo = riduci(corpo, lc, ac, magenta=True)
    ox = (l - lc) // 2
    piano = a - 1  # le ruote poggiano sull'ultima riga

    foglio = Image.new("RGBA", (l * FOTOGRAMMI, a), (0, 0, 0, 0))
    for f in range(FOTOGRAMMI):
        fot = Image.new("RGBA", (l, a), (0, 0, 0, 0))
        fot.alpha_composite(corpo, (ox, a - conf.get("rialzo", 8 if conf["ruote"][0][1] >= 7 else 6) - ac))
        p = fot.load()
        # Senso orario: guardando a destra, la locomotiva avanza e le ruote girano in avanti.
        angolo = f * 2 * math.pi / FOTOGRAMMI
        for x0, x1, r in conf.get("carrelli", []):
            # Telaio del carrello all'altezza degli assi, dietro le ruote: davanti coprirebbe il raggio che
            # mostra la rotazione. Sporge di 3 px oltre il contorno delle ruote, la parte che resta visibile.
            asse = piano - r
            sporge = r + 4
            for y in range(asse - 2, asse + 1):
                for x in range(x0 - sporge, x1 + sporge + 1):
                    bordo = y in (asse - 2, asse) or x in (x0 - sporge, x1 + sporge)
                    pixel(p, l, a, x, y, CONTORNO if bordo else ACCIAIO_SCURO)
        for cx, r in conf["piccole"]:
            ruota(p, l, a, cx, piano - r, r, angolo * 7 / r)
        for cx, r, _ in conf["ruote"]:
            ruota(p, l, a, cx, piano - r, r, angolo)
        if conf["biella"]:
            # Biella: unisce i perni di manovella, tutti alla stessa fase, quindi resta orizzontale e
            # descrive un cerchio. Ruote motrici piccole o grandi, il perno sta a metà raggio.
            ruote = conf["ruote"]
            rm = ruote[0][1]
            raggio_perno = max(2, rm // 2 + (1 if rm >= 7 else 0))
            dx, dy = math.cos(angolo) * raggio_perno, math.sin(angolo) * raggio_perno
            y = piano - rm + dy
            x0, x1 = ruote[0][0] + dx, ruote[-1][0] + dx
            linea(p, l, a, x0, y - 1, x1, y - 1, CONTORNO)
            linea(p, l, a, x0, y + 1, x1, y + 1, CONTORNO)
            linea(p, l, a, x0, y, x1, y, ACCIAIO)
            for cx, _, _ in ruote:
                pixel(p, l, a, cx + dx, y, ACCIAIO_SCURO)
            if "cilindro" in conf:
                motrice(p, l, a, ruote[-1][0] + dx, y, piano - rm, conf["cilindro"])
        for cx, r, mozzo in conf["ruote"]:
            disco(p, l, a, cx, piano - r, 1 if r >= 5 else 0, mozzo)
        foglio.alpha_composite(fot, (f * l, 0))
    return foglio


def locomotiva(tipo: str) -> None:
    salva(foglio_locomotiva(tipo), f"locomotive/{tipo}.png")


# --- Ostacoli: misura esatta di src/config/ostacoli.ts, appoggiati al bordo basso ----------------------------

# Misure delle figure, le stesse di OSTACOLI in src/config/ostacoli.ts (che ne ricava le hitbox).
OSTACOLI = {
    "legna": (36, 28), "fieno": (32, 32), "staccionata": (40, 24), "cassa": (28, 28), "carrello": (40, 28),
    "sbarra": (44, 24), "segnale": (20, 32), "pallet": (36, 16), "trave": (96, 12),
}


def figura(id_asset: str, larghezza: int, altezza: int) -> Image.Image:
    """Riduce alla misura esatta: le proporzioni si piegano un poco, perché la hitbox dipende dalla misura."""
    im = ritaglia(carica(id_asset))
    scarto = (im.width / im.height) / (larghezza / altezza)
    if not 0.8 <= scarto <= 1.25:
        print(f"ATTENZIONE {id_asset}: proporzioni lontane dalla misura ({scarto:.2f})")
    return riduci(im, larghezza, altezza)


def ostacolo(tipo: str) -> None:
    salva(figura(tipo, *OSTACOLI[tipo]), f"ostacoli/{tipo}-0.png")


def barili() -> None:
    uno = figura("barile", 18, 26)
    salva(uno, "ostacoli/barili-0.png")
    due = Image.new("RGBA", (36, 26), (0, 0, 0, 0))
    due.alpha_composite(uno, (0, 0))
    due.alpha_composite(uno, (18, 0))
    salva(due, "ostacoli/barili-1.png")


def container() -> None:
    c = {colore: figura(f"container-{colore}", 20, 20) for colore in ("rosso", "giallo", "verde", "blu")}
    salva(c["rosso"], "ostacoli/container-0.png")
    pila = Image.new("RGBA", (20, 40), (0, 0, 0, 0))
    pila.alpha_composite(c["giallo"], (0, 0))
    pila.alpha_composite(c["verde"], (0, 20))
    salva(pila, "ostacoli/container-1.png")
    piramide = Image.new("RGBA", (40, 40), (0, 0, 0, 0))
    piramide.alpha_composite(c["rosso"], (0, 20))
    piramide.alpha_composite(c["blu"], (20, 20))
    piramide.alpha_composite(c["giallo"], (10, 0))
    salva(piramide, "ostacoli/container-2.png")


def stazione() -> None:
    # Niente hitbox: le proporzioni restano quelle disegnate (l'orologio resta tondo), dentro 192×112.
    im = ritaglia(carica("stazione"))
    salva(riduci(im, *adatta(im, 192, 112)), "stazione.png")


def icona_stazione() -> None:
    salva(figura("icona-stazione", 16, 16), "icona-stazione.png")


# --- Scenari: strati ripetibili (le grezze scelte sono le versioni -rip di genera-immagini.py) -------------

LIVELLI = ("facile", "medio", "difficile")
BINARI = {"facile": "binario-campagna", "medio": "binario-porto", "difficile": "binario-porto"}
LARGHEZZA = 480
SCHERMO = 270
# Quanta larghezza dello schermo copre una grezza (1536 px). Gli sfondi si generano con GRANA_FINE: ridotti a
# qualunque scala fino a 1, ogni pixel resta un pixel di gioco, come negli sprite (senza, il generatore disegna
# pixel di circa 16 px, che a scala 1 diventano 5 pixel di gioco). La scala la decide quindi la misura degli
# oggetti accanto alla locomotiva: a 1 una panchina è lunga quanto lei.
SCALA = {"lontano": 0.6, "vicino": 0.5, "binario": 0.7}
# Il binario scende fino al bordo basso: almeno BINARIO_DAL_BASSO di src/Game.ts.
BINARIO_ALTEZZA = 36


def strato(id_asset: str, quale: str) -> Image.Image:
    """Tutta la larghezza, alta quanto il contenuto: la base dello strato poggia sul binario."""
    im = carica(id_asset)
    _, alto, _, basso = im.getchannel("A").point(lambda a: 255 if a >= 128 else 0).getbbox()
    im = im.crop((0, alto, im.width, basso))
    larghezza = round(LARGHEZZA * SCALA[quale])
    # Distanza larga: la fascia ridipinta lascia tinte appena diverse, che così si fondono con le vicine.
    return riduci(im, larghezza, round(im.height * larghezza / im.width), distanza=32, contorno=False)


def cielo(id_asset: str) -> Image.Image:
    """Lo schermo intero, fermo: non serve ripetibile. Si tiene la parte bassa, con mare e profili lontani."""
    im = Image.open(GREZZE / id_asset / json.loads(SCELTE.read_text())[id_asset]).convert("RGBA")
    altezza = round(im.height * LARGHEZZA / im.width)
    piena = riduci(im, LARGHEZZA, altezza, distanza=16, contorno=False)
    return piena.crop((0, altezza - SCHERMO, LARGHEZZA, altezza))


def binario(id_asset: str) -> Image.Image:
    im = carica(id_asset)
    # Sopra la rotaia la fascia ridipinta lascia sporco semitrasparente: vale il bordo alto dell'originale.
    originale = Image.open(GREZZE / id_asset / json.loads(SCELTE.read_text())[id_asset].replace("-rip", ""))
    alto = originale.getchannel("A").point(lambda a: 255 if a >= 128 else 0).getbbox()[1]
    _, _, _, basso = im.getchannel("A").point(lambda a: 255 if a >= 128 else 0).getbbox()
    im = im.crop((0, alto, im.width, basso))
    larghezza = round(LARGHEZZA * SCALA["binario"])
    piccolo = riduci(im, larghezza, round(im.height * larghezza / im.width), contorno=False)
    if piccolo.height >= BINARIO_ALTEZZA:
        return piccolo
    # Massicciata allungata verso il basso fino al bordo dello schermo, specchiata a ogni ripetizione: una
    # fascia ripetuta uguale disegna righe regolari, come un muro di mattoni.
    # Senza le ultime righe di solo contorno: specchiate, farebbero una striscia scura in mezzo alla ghiaia.
    fondo = piccolo.height
    while fondo > piccolo.height // 2 and all(
            piccolo.getpixel((x, fondo - 1))[:3] == CONTORNO for x in range(0, larghezza, 7)):
        fondo -= 1
    pezzo = piccolo.crop((0, piccolo.height // 2, larghezza, fondo))
    out = Image.new("RGBA", (larghezza, BINARIO_ALTEZZA), (0, 0, 0, 0))
    out.alpha_composite(piccolo.crop((0, 0, larghezza, fondo)), (0, 0))
    y, specchio = fondo, True
    while y < BINARIO_ALTEZZA:
        out.alpha_composite(pezzo.transpose(Image.FLIP_TOP_BOTTOM) if specchio else pezzo, (0, y))
        y, specchio = y + pezzo.height, not specchio
    return out


# Quanto lo strato lontano sfuma verso il cielo dietro di lui: ciò che si urta resta saturo, ciò che si guarda
# si attenua. Il porto di più, perché le sue pile di container somigliano agli ostacoli.
FOSCHIA = {"facile": 0.15, "medio": 0.2, "difficile": 0.25}


def foschia(im: Image.Image, cielo_im: Image.Image, quota: float) -> Image.Image:
    """Mescola ogni pixel col colore del cielo all'altezza in cui lo strato si vede."""
    binario_y = SCHERMO - BINARIO_ALTEZZA
    out = im.copy()
    p, pc = out.load(), cielo_im.load()
    for y in range(im.height):
        cr, cg, cb, _ = pc[LARGHEZZA // 2, min(SCHERMO - 1, binario_y - im.height + y)]
        for x in range(im.width):
            r, g, b, a = p[x, y]
            if a:
                p[x, y] = (round(r + (cr - r) * quota), round(g + (cg - g) * quota), round(b + (cb - b) * quota), a)
    return out


# Strato vicino di cittadina e porto: muri e banchine pieni di dettaglio dietro ostacoli dello stesso tono.
# Desaturato e schiarito verso un grigio caldo, lascia gli ostacoli come unici oggetti saturi.
ATTENUA_VICINO = {"medio": 0.35, "difficile": 0.35}
GRIGIO_CALDO = (238, 234, 226)


def attenua(im: Image.Image, quota: float) -> Image.Image:
    out = im.copy()
    p = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = p[x, y]
            if a:
                grigio = (r * 30 + g * 59 + b * 11) // 100
                spento = [c * 0.6 + grigio * 0.4 for c in (r, g, b)]
                p[x, y] = tuple(round(c * (1 - quota) + t * quota) for c, t in zip(spento, GRIGIO_CALDO)) + (a,)
    return out


def scenario(livello: str) -> None:
    livelli = {"cielo": cielo(f"{livello}-cielo"), "lontano": strato(f"{livello}-lontano", "lontano"),
               "vicino": strato(f"{livello}-vicino", "vicino"), "binario": binario(BINARI[livello])}
    livelli["lontano"] = foschia(livelli["lontano"], livelli["cielo"], FOSCHIA[livello])
    if livello in ATTENUA_VICINO:
        livelli["vicino"] = attenua(livelli["vicino"], ATTENUA_VICINO[livello])
    for nome, im in livelli.items():
        salva(im, f"scenari/{livello}-{nome}.png")
    miniatura(livello, livelli)


# 64×36: nel menu si mostra allo stesso ingrandimento dei bottoni (a ×3, tre per riga da 1040 px in su).
MINIATURA = (64, 36)
ICONE_MINIATURA = {"facile": ("fieno", 10, 10), "medio": ("segnale", 6, 10), "difficile": ("container-rosso", 8, 8)}


def miniatura(livello: str, livelli: dict[str, Image.Image]) -> None:
    """La scena intera ridotta a 64×36 per il menu, con un ostacolo tipico: lo scenario si riconosce senza leggere."""
    binario_y = SCHERMO - BINARIO_ALTEZZA
    scena = livelli["cielo"].copy()
    for nome in ("lontano", "vicino", "binario"):
        im = livelli[nome]
        y = binario_y if nome == "binario" else binario_y - im.height
        for x in range(0, LARGHEZZA, im.width):
            scena.alpha_composite(im.crop((0, 0, im.width, min(im.height, SCHERMO - y))), (x, y))
    piccola = riduci(scena, *MINIATURA, distanza=20, contorno=False)
    id_icona, l, a = ICONE_MINIATURA[livello]
    icona = figura(id_icona, l, a)
    scala = MINIATURA[1] / SCHERMO
    piccola.alpha_composite(icona, (round(MINIATURA[0] * 0.58), round(binario_y * scala) - a + 1))
    salva(piccola, f"scenari/{livello}-miniatura.png")


# --- Effetti: un fotogramma, crescita e dissolvenza le fa il sistema di particelle -------------------------

EFFETTI = {"fumo": 16, "scarico": 12, "scintilla": 12}


def effetto(id_asset: str) -> None:
    im = ritaglia(carica(id_asset))
    salva(riduci(im, *adatta(im, EFFETTI[id_asset], EFFETTI[id_asset]), contorno=False), f"effetti/{id_asset}.png")


# --- Interfaccia e pezzi dell'urto -----------------------------------------------------------------------

# Tutta l'interfaccia si mostra a ×3 (styles.css, --pixel): bottoni e icone sono composti qui alla misura
# nativa, così ogni pixel dello schermo ha la stessa grana. Bottone: (colore, lato, icona, lato dell'icona).
PEZZI = ("pezzo-legna", "pezzo-paglia", "pezzo-asse", "pezzo-stella", "pezzo-polvere")
TASTI = {
    "gioca": ("giallo", 32, "icona-gioca", 16),
    "ancora": ("giallo", 32, "icona-ancora", 16),
    "casa": ("crema", 24, "icona-casa", 13),
    "pausa": ("prugna", 16, "icona-pausa", 9),
    # Altoparlante e onde non si leggono sotto i 14 px: il tasto dell'audio è medio, non piccolo.
    "audio": ("prugna", 24, "disegno-audio", 15),
    "muto": ("prugna", 24, "disegno-muto", 15),
}


def figura_quadrata(id_asset: str, lato: int, contorno: bool = True) -> Image.Image:
    im = ritaglia(carica(id_asset))
    l, a = adatta(im, lato, lato)
    out = Image.new("RGBA", (lato, lato), (0, 0, 0, 0))
    out.alpha_composite(riduci(im, l, a, contorno=contorno, buchi=True), ((lato - l) // 2, (lato - a) // 2))
    return out


def pezzo(id_asset: str) -> None:
    # La polvere è un effetto, come il fumo: niente contorno scuro, che la farebbe sembrare un sasso.
    salva(figura_quadrata(id_asset, 8, contorno=id_asset != "pezzo-polvere"), f"pezzi/{id_asset.split('-', 1)[1]}.png")


BIANCO, GRIGIO_ICONA = (0xFF, 0xFF, 0xFF), (0xC9, 0xC6, 0xD1)


def altoparlante(lato: int, muto: bool) -> Image.Image:
    """Altoparlante con onde, o con la X, disegnato pixel per pixel: ridotte dalla grezza, a 15 px onde e X
    diventano macchie. Stessi bianco, grigio e contorno delle icone generate."""
    im = Image.new("RGBA", (lato, lato), (0, 0, 0, 0))
    p = im.load()
    centro = lato // 2
    for y in range(centro - 2, centro + 3):  # corpo
        for x in range(1, 4):
            pixel(p, lato, lato, x, y, BIANCO)
    for x in range(4, 8):  # cono, che si allarga verso destra
        for y in range(centro - 2 - (x - 3), centro + 3 + (x - 3)):
            pixel(p, lato, lato, x, y, BIANCO)
    for y in range(centro + 1, lato):  # ombra sotto
        for x in range(lato):
            if p[x, y][3]:
                p[x, y] = (*GRIGIO_ICONA, 255)
    if muto:
        for d in range(-2, 3):
            pixel(p, lato, lato, 11 + d, centro + d, BIANCO)
            pixel(p, lato, lato, 11 + d, centro - d, BIANCO)
    else:
        for raggio in (3, 6):
            for gradi in range(-50, 51, 5):
                t = math.radians(gradi)
                pixel(p, lato, lato, 7 + raggio * math.cos(t), centro + raggio * math.sin(t), BIANCO)
    # Contorno attorno a ogni pixel pieno, verso l'esterno.
    pieni = {(x, y) for y in range(lato) for x in range(lato) if p[x, y][3]}
    for x, y in pieni:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if (x + dx, y + dy) not in pieni and 0 <= x + dx < lato and 0 <= y + dy < lato:
                p[x + dx, y + dy] = (*CONTORNO, 255)
    return im


def tasto(nome: str) -> None:
    colore, lato, icona, lato_icona = TASTI[nome]
    fondo = figura_quadrata(f"bottone-{colore}", lato)
    segno = (altoparlante(lato_icona, icona == "disegno-muto") if icona.startswith("disegno-")
             else figura_quadrata(icona, lato_icona))
    # L'icona sta sulla faccia del bottone, un poco sopra il centro: sotto c'è lo spessore del bordo.
    fondo.alpha_composite(segno, ((lato - lato_icona) // 2, (lato - lato_icona) // 2 - max(1, lato // 16)))
    salva(fondo, f"tasti/{nome}.png")


def icona_ruota() -> None:
    salva(figura_quadrata("icona-ruota", 24), "icone/ruota.png")


def titolo() -> None:
    im = ritaglia(carica("titolo"))
    salva(riduci(im, *adatta(im, 104, 40), buchi=True), "titolo.png")


def menu_sfondo() -> None:
    """Fondo di menu e fine partita: 480×270 come il canvas, quindi a schermo ha la grana della partita."""
    im = carica("menu-sfondo")
    altezza = round(im.height * LARGHEZZA / im.width)
    salva(riduci(im, LARGHEZZA, altezza, distanza=16, contorno=False).crop(
        (0, altezza - SCHERMO, LARGHEZZA, altezza)), "menu-sfondo.png")


# Cornici dei pannelli del menu, 12×12 per il border-image di styles.css (4 px di bordo, angoli smussati).
CORNICI = {"cornice": ((0x3D, 0x31, 0x50), (0x5A, 0x4A, 0x72)), "cornice-scelta": ((0x4D, 0x3D, 0x66), (0xF2, 0xC2, 0x30))}


def cornici() -> None:
    for nome, (fondo, luce) in CORNICI.items():
        im = Image.new("RGBA", (12, 12), (0, 0, 0, 0))
        p = im.load()
        for y in range(12):
            for x in range(12):
                angolo = (x in (0, 11) and y in (0, 1, 10, 11)) or (y in (0, 11) and x in (0, 1, 10, 11))
                if angolo:
                    continue
                bordo = x in (0, 11) or y in (0, 11) or (x in (1, 10) and y in (1, 10))
                if bordo:
                    p[x, y] = (*CONTORNO, 255)
                elif x in (1, 10) or y in (1, 10) or (nome == "cornice-scelta" and (x in (2, 9) or y in (2, 9))):
                    p[x, y] = (*luce, 255)
                else:
                    p[x, y] = (*fondo, 255)
        salva(im, f"interfaccia/{nome}.png")


def favicon() -> None:
    """La locomotiva a vapore rossa, primo fotogramma, su 64×64: la scheda del browser la riconosce."""
    import colorsys

    # Dal foglio ricostruito, non dal PNG già scritto: lanciata da sola resterebbe allo sprite di prima.
    loco = foglio_locomotiva("vapore").crop((0, 0, *FOTOGRAMMA))
    # Stessa sostituzione di palette di src/grafica/palette.ts: tinta del rosso, luminosità della rampa.
    h, _, s_ = colorsys.rgb_to_hls(0xE8 / 255, 0x3B / 255, 0x3B / 255)
    rossa = {m: tuple(round(c * 255) for c in colorsys.hls_to_rgb(h, colorsys.rgb_to_hls(*(v / 255 for v in m))[1], s_))
             for m in RAMPA}
    p = loco.load()
    for y in range(loco.height):
        for x in range(loco.width):
            r, g, b, a = p[x, y]
            if a and (r, g, b) in rossa:
                p[x, y] = (*rossa[(r, g, b)], a)
    out = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    out.alpha_composite(loco, (0, 12))
    out.save(QUI.parent / "public" / "favicon.png")
    print("favicon.png: 64×64")


PULITORI = {**{t: (lambda t=t: locomotiva(t)) for t in LOCOMOTIVE},
            **{t: (lambda t=t: ostacolo(t)) for t in OSTACOLI},
            **{f"scenario-{l}": (lambda l=l: scenario(l)) for l in LIVELLI},
            **{e: (lambda e=e: effetto(e)) for e in EFFETTI},
            **{t: (lambda t=t: pezzo(t)) for t in PEZZI},
            **{f"tasto-{t}": (lambda t=t: tasto(t)) for t in TASTI},
            "icona-ruota": icona_ruota, "titolo": titolo, "menu-sfondo": menu_sfondo, "cornici": cornici,
            "favicon": favicon,
            "barili": barili, "container": container, "stazione": stazione, "icona-stazione": icona_stazione}


def anteprima() -> None:
    """Tutti i PNG prodotti, ingranditi 4 volte su sfondo chiaro, in .grezze/anteprima.png."""
    file = sorted(IMMAGINI.rglob("*.png"))
    z, margine, larghezza_max = 4, 8, 1600
    righe, x, y, h = [], 0, 0, 0
    for f in file:
        im = Image.open(f)
        l, a = im.width * z, im.height * z
        if x + l > larghezza_max:
            x, y, h = 0, y + h + margine, 0
        righe.append((f, x, y))
        x, h = x + l + margine, max(h, a)
    out = Image.new("RGBA", (larghezza_max, y + h), (205, 232, 250, 255))
    for f, x, y in righe:
        im = Image.open(f).convert("RGBA")
        out.alpha_composite(im.resize((im.width * z, im.height * z), Image.NEAREST), (x, y))
    out.save(GREZZE / "anteprima.png")


if __name__ == "__main__":
    richiesti = sys.argv[1:] or list(PULITORI)
    if richiesti == ["anteprima"]:
        anteprima()
        sys.exit()
    for id_asset in richiesti:
        PULITORI[id_asset]()
