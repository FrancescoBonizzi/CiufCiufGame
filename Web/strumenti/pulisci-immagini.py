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
           contorno: bool = True) -> Image.Image:
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
        elif luminanza(c) < 50:
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
    if contorno:
        rifai_contorno(out)
    return out


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

# Per tipo: altezza della carrozzeria, ruote (centro x, raggio, colore del mozzo), se ha la biella
# d'accoppiamento e, per il vapore, il cilindro (x del bordo sinistro) da cui parte la biella motrice.
LOCOMOTIVE = {
    "vapore": {"altezza": 31, "ruote": [(17, 7, (0xD6, 0x3C, 0x3C)), (35, 7, (0xD6, 0x3C, 0x3C))],
               "piccole": [], "biella": True, "cilindro": 47},
    "diesel": {"altezza": 31, "ruote": [(15, 5, GRIGIO_RUOTA), (27, 5, GRIGIO_RUOTA), (39, 5, GRIGIO_RUOTA),
                                         (51, 5, GRIGIO_RUOTA)], "piccole": [], "biella": True},
    "elettrica": {"altezza": 32, "ruote": [(12, 4, GRIGIO_RUOTA), (22, 4, GRIGIO_RUOTA), (40, 4, GRIGIO_RUOTA),
                                            (50, 4, GRIGIO_RUOTA)], "piccole": [], "biella": False},
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


def ruota(p, l, a, cx, cy, r, angolo, mozzo) -> None:
    disco(p, l, a, cx, cy, r + 1, CONTORNO)
    disco(p, l, a, cx, cy, r, GRIGIO_RUOTA)
    if r >= 5:
        # Cerchione chiaro e raggi: sono i raggi a far vedere che gira.
        disco(p, l, a, cx, cy, r - 1, (0x47, 0x40, 0x52))
        for k in range(4):
            t = angolo + k * math.pi / 4
            for d in range(1, r):
                pixel(p, l, a, cx + math.cos(t) * d, cy + math.sin(t) * d, GRIGIO_CHIARO)
    else:
        for d in range(-r + 1, r):
            pixel(p, l, a, cx + math.cos(angolo) * d, cy + math.sin(angolo) * d, GRIGIO_CHIARO)
    disco(p, l, a, cx, cy, 1 if r >= 5 else 0, mozzo)


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
    lunghezza = 11
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
        fot.alpha_composite(corpo, (ox, a - 8 - ac if conf["ruote"][0][1] >= 7 else a - 6 - ac))
        p = fot.load()
        # Senso orario: guardando a destra, la locomotiva avanza e le ruote girano in avanti.
        angolo = f * 2 * math.pi / FOTOGRAMMI
        for cx, r in conf["piccole"]:
            ruota(p, l, a, cx, piano - r, r, angolo * 7 / r, GRIGIO_RUOTA)
        for cx, r, mozzo in conf["ruote"]:
            ruota(p, l, a, cx, piano - r, r, angolo, mozzo)
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
    salva(figura("stazione", 192, 112), "stazione.png")


def icona_stazione() -> None:
    salva(figura("icona-stazione", 16, 16), "icona-stazione.png")


# --- Scenari: strati ripetibili (le grezze scelte sono le versioni -rip di genera-immagini.py) -------------

LIVELLI = ("facile", "medio", "difficile")
BINARI = {"facile": "binario-campagna", "medio": "binario-porto", "difficile": "binario-porto"}
LARGHEZZA = 480
SCHERMO = 270
# Quanta larghezza dello schermo copre una grezza (1536 px). A 1 un pixel del generatore diventa circa 5 px di
# gioco, troppo grosso accanto agli sprite, e lo strato vicino copre quello lontano: a metà si ripete due
# volte per schermo, e scorrendo non si nota. Il vicino è più basso, così le colline restano in vista.
SCALA = {"lontano": 0.5, "vicino": 0.4, "binario": 0.5}
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
    # Massicciata ripetuta verso il basso finché il binario arriva al bordo dello schermo.
    pezzo = piccolo.crop((0, piccolo.height * 2 // 3, larghezza, piccolo.height))
    out = Image.new("RGBA", (larghezza, BINARIO_ALTEZZA), (0, 0, 0, 0))
    out.alpha_composite(piccolo, (0, 0))
    y = piccolo.height
    while y < BINARIO_ALTEZZA:
        out.alpha_composite(pezzo, (0, y))
        y += pezzo.height
    return out


def scenario(livello: str) -> None:
    livelli = {"cielo": cielo(f"{livello}-cielo"), "lontano": strato(f"{livello}-lontano", "lontano"),
               "vicino": strato(f"{livello}-vicino", "vicino"), "binario": binario(BINARI[livello])}
    for nome, im in livelli.items():
        salva(im, f"scenari/{livello}-{nome}.png")
    miniatura(livello, livelli)


ICONE_MINIATURA = {"facile": ("fieno", 14, 14), "medio": ("segnale", 9, 14), "difficile": ("container-rosso", 12, 12)}


def miniatura(livello: str, livelli: dict[str, Image.Image]) -> None:
    """La scena intera ridotta a 96×54 per il menu, con un ostacolo tipico: lo scenario si riconosce senza leggere."""
    binario_y = SCHERMO - BINARIO_ALTEZZA
    scena = livelli["cielo"].copy()
    for nome in ("lontano", "vicino", "binario"):
        im = livelli[nome]
        y = binario_y if nome == "binario" else binario_y - im.height
        for x in range(0, LARGHEZZA, im.width):
            scena.alpha_composite(im.crop((0, 0, im.width, min(im.height, SCHERMO - y))), (x, y))
    piccola = riduci(scena, 96, 54, distanza=20, contorno=False)
    id_icona, l, a = ICONE_MINIATURA[livello]
    icona = figura(id_icona, l, a)
    piccola.alpha_composite(icona, (56, binario_y // 5 - a + 1))
    salva(piccola, f"scenari/{livello}-miniatura.png")


# --- Effetti: un fotogramma, crescita e dissolvenza le fa il sistema di particelle -------------------------

EFFETTI = {"fumo": 16, "scarico": 12, "scintilla": 12}


def effetto(id_asset: str) -> None:
    im = ritaglia(carica(id_asset))
    salva(riduci(im, *adatta(im, EFFETTI[id_asset], EFFETTI[id_asset]), contorno=False), f"effetti/{id_asset}.png")


PULITORI = {**{t: (lambda t=t: locomotiva(t)) for t in LOCOMOTIVE},
            **{t: (lambda t=t: ostacolo(t)) for t in OSTACOLI},
            **{f"scenario-{l}": (lambda l=l: scenario(l)) for l in LIVELLI},
            **{e: (lambda e=e: effetto(e)) for e in EFFETTI},
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
