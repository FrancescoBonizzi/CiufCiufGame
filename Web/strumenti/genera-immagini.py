"""Genera le immagini grezze della pixel art con l'API di OpenAI.

Uso (dalla cartella Web/):
  python3 strumenti/genera-immagini.py elenco
  python3 strumenti/genera-immagini.py <id> [quante]
  python3 strumenti/genera-immagini.py ripetibile <id> <file>   (serve Pillow)

«ripetibile» rende uno sfondo ripetibile in orizzontale: gira l'immagine di mezza larghezza, così i bordi
sinistro e destro diventano colonne vicine, e fa ridipingere al modello solo la fascia centrale dove ora
cade la giuntura. Scrive <file>-rip.png accanto all'originale.

La chiave si legge da ~/.config/ciufciuf/openai.key e non si stampa mai. Le immagini grezze finiscono in
strumenti/.grezze/<id>/ (esclusa da git): le riporta alla griglia vera strumenti/pulisci-immagini.py.
Ogni chiamata aggiunge i token consumati a strumenti/.grezze/consumi.jsonl.

I prompt stanno qui e non in docs/prompt-pixel-art.md, che tiene le regole di stile: un solo posto da
cui partono le immagini.
"""
import base64
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

MODELLO = "gpt-image-2.6-sunburst"
CHIAVE = Path.home() / ".config" / "ciufciuf" / "openai.key"
GREZZE = Path(__file__).resolve().parent / ".grezze"

STILE_BASE = (
    "Pixel art game asset, 16-bit era style, clean and readable for a 4-year-old child. "
    "Side view, orthographic, no perspective. Thick dark outline (#2b2133) around every object. "
    "Flat shading with at most 3 tones per material, light coming from the top-left. "
    "Limited palette, no gradients, no dithering, no anti-aliasing, no blur, no glow, no text, no watermark. "
    "Friendly, rounded, cartoon shapes. "
)
# Sprite piccoli: pixel grossi, che ridotti a 64 px diventano comunque un pixel di gioco. Una sola istruzione di
# grana per prompt: STILE per gli sprite, GRANA_FINE o GRANA_FINISSIMA per gli sfondi.
STILE = STILE_BASE + "Big chunky pixels on a coarse, perfectly regular pixel grid. "
OGGETTO = "A single object, centered, on a fully transparent background, nothing else in the image, no ground shadow. "
# Grana degli sfondi: il generatore di suo disegna "pixel" di circa 16 px, che ridotti a 480 di larghezza
# diventano 5 pixel di gioco, cinque volte quelli degli sprite. Gli si chiede la griglia di 480.
GRANA_FINE = (
    "VERY FINE pixel art: draw it exactly as if the whole image were only 480 pixels wide and 320 pixels tall, "
    "then scaled up: every single pixel is a tiny square about 3 image pixels wide, with lots of small detail. "
    "Small clouds, small trees, small houses: nothing drawn with big chunky blocks. "
)
# I cieli coprono lo schermo a scala 1 e non si possono ridurre: griglia ancora più fine.
GRANA_FINISSIMA = (
    "EXTREMELY FINE pixel art: draw it exactly as if the whole image were 960 pixels wide and 640 pixels tall, "
    "then scaled up: every pixel is a tiny square under 2 image pixels wide. Clouds are small and detailed, "
    "made of many tiny pixels. "
)
STRATO = (
    "Pixel art game background layer, 16-bit era style, for a cheerful children's side-scrolling train game. "
    "Side view, orthographic. NO dark outlines anywhere: soft flat color shapes only. "
    "Flat shading, limited palette, no gradients, no dithering, no anti-aliasing, no text, no people, no vehicles. "
    "The image is a wide horizontal strip. "
)
VICINO = (
    "ONLY this foreground strip: nothing behind it, no houses, no trees, no hills, no buildings, no sea, no "
    "horizon; everything above it is fully transparent (no sky). "
)

MAGENTA = (
    "Painted ONLY in these exact flat magenta shades: #ff9cff (highlight), #ff3dff (main), #c400c4 (shadow), "
    "#7a007a (darkest). No magenta or pink anywhere else in the image. "
)
SOLO_EFFETTO = (
    "ONLY the effect itself, floating alone in the middle of a fully transparent background. NO locomotive, no "
    "train, no vehicle, no machine, no chimney, no object producing it, no ground, nothing else at all. "
)
SENZA_RUOTE = (
    "IMPORTANT: draw the locomotive WITHOUT ANY WHEELS, without connecting rods, without bogies. "
    "Its bottom edge is one straight horizontal dark-grey running board (chassis beam) along the whole length; "
    "absolutely nothing below it. Every part is solidly attached to the body: one compact connected silhouette. "
)

ICONA = (
    "Pixel art user-interface icon for a children's game, drawn as if on a 16x16 pixel grid scaled up: very few, "
    "very big, bold shapes. Pure white fill with one light grey shading tone, thick dark outline (#2b2133). "
    "Centered, filling most of the image, on a fully transparent background. No text, no background, no button "
    "around it. The icon shows: "
)
PEZZO = (STILE + "One single tiny debris piece flying off a hit obstacle, drawn as if on an 8x8 pixel grid scaled "
         "up: one simple bold shape filling the image, centered, fully transparent background, nothing else. ")
BOTTONE = (
    "Pixel art round push button for a children's game menu, seen from the front, drawn as if on a 32x32 pixel "
    "grid scaled up: a perfect circle face with a lighter highlight at the top-left, a darker thicker rim at the "
    "bottom giving thickness, thick dark outline (#2b2133). Completely EMPTY face: no symbol, no icon, no text. "
    "Centered, filling the image, fully transparent background. Color: "
)

# id: (prompt, formato di generazione)
ASSET = {
    # --- Locomotive: solo carrozzeria, le ruote e le bielle le aggiunge pulisci-immagini.py ---
    "vapore": (STILE + OGGETTO + SENZA_RUOTE +
               "A cute small old-fashioned steam locomotive, side view facing right, short and stubby, about twice "
               "as long as tall. Cab at the back (left) with a small round window with light-blue glass and a flat "
               "roof; long round boiler in front, with a black smokestack near the front and a small golden bell "
               "sitting directly on top of the boiler; a small cowcatcher at the front bottom. Boiler, cab and "
               "cowcatcher " + MAGENTA + "Smokestack black and dark grey. No smoke.", "1536x1024"),
    # Una diesel vera, non una vapore squadrata: niente comignolo né caldaia, ruote su due carrelli senza bielle.
    "diesel": (STILE + OGGETTO + SENZA_RUOTE +
               "A cute small modern diesel-electric locomotive, side view facing right, like a classic European "
               "mainline diesel: one long rectangular box body with a flat roof and slightly rounded corners, a "
               "driver's cab at the front (right) end with a big sloped light-blue windshield and a side window, a "
               "smaller cab window at the rear end too, rows of vertical ventilation grilles and louvres along "
               "the side, a small horn and a low flat exhaust grille on the roof, round headlights on the front, "
               "a yellow-and-black warning-striped buffer beam at the front bottom. Absolutely NO chimney, NO "
               "smokestack, NO boiler, NO round steam-engine shapes. The body " + MAGENTA + "No smoke.",
               "1536x1024"),
    "elettrica": (STILE + OGGETTO + SENZA_RUOTE +
                  "A cute bullet train power car inspired by the Japanese Shinkansen, side view facing right: LOW and "
                  "very aerodynamic, much longer than tall (about 3.5 times as long as tall), the front is a long "
                  "smooth tapered duck-bill nose that slopes gently down almost to the rails, with a small "
                  "light-blue cockpit windshield set far back on top of the nose, a white headlight low on the nose "
                  "tip, a continuous row of small square passenger windows along the side, a contrasting white "
                  "stripe along the lower body, a smooth rounded roof with a small low grey pantograph in the "
                  "middle, smooth skirts covering the bottom edge. Not a boxy locomotive, no cab bulge, no "
                  "grilles. The body "
                  + MAGENTA, "1536x1024"),

    # --- Ostacoli ---
    "legna": (STILE + OGGETTO + "A big bundle of firewood logs stacked in a pyramid (three logs at the bottom, two on "
              "top) tied with a red rope, side view showing the round log ends with light rings, warm browns. "
              "About 1.3 times wider than tall.", "1024x1024"),
    "fieno": (STILE + OGGETTO + "A round golden hay bale seen from the side as a circle, warm yellow straw texture "
              "with a few loose straws sticking out, two thin brown bands around it.", "1024x1024"),
    "staccionata": (STILE + OGGETTO + "A short wooden countryside fence section, side view, three white-painted "
                    "vertical posts with pointed tops and two horizontal rails, slightly rustic. About 1.7 times "
                    "wider than tall.", "1536x1024"),
    "cassa": (STILE + OGGETTO + "A square wooden railway freight crate, side view, brown wooden planks, grey metal "
              "corner brackets and a dark stencilled arrow pointing up. Perfectly square.", "1024x1024"),
    "carrello": (STILE + OGGETTO + "A vintage railway station luggage trolley, side view, flat wooden deck on two "
                 "big spoked wheels, a long handle rising on the right, loaded with two suitcases (a blue one and a "
                 "taller red one). About 1.4 times wider than tall.", "1536x1024"),
    "sbarra": (STILE + OGGETTO + "A lowered railway level crossing barrier, side view: a short dark-grey post with a "
               "rounded top on the left and a long horizontal red-and-white striped arm extending to the right at "
               "about three quarters of the post height, a small red lamp hanging under the arm tip. About 1.8 times "
               "wider than tall.", "1536x1024"),
    "segnale": (STILE + OGGETTO + "A small ground railway signal, side view: a grey pole on a square dark base, with "
                "a round black signal head on top showing one bright red light. Tall and narrow, about 1.6 times "
                "taller than wide.", "1024x1536"),
    "pallet": (STILE + OGGETTO + "A stack of two flat wooden shipping pallets, side view, pale wood planks with dark "
               "gaps between the blocks. More than twice as wide as tall.", "1536x1024"),
    "barile": (STILE + OGGETTO + "One blue steel oil barrel standing upright, side view, two raised metal rims, a "
               "small yellow hazard label in the middle. About 1.4 times taller than wide.", "1024x1536"),
    "container-rosso": (STILE + OGGETTO + "A small shipping container seen exactly from its door end, a perfect "
                        "square: corrugated steel painted bright red, two vertical dark locking bars on each of "
                        "the two doors.", "1024x1024"),
    "container-giallo": (STILE + OGGETTO + "A small shipping container seen exactly from its door end, a perfect "
                         "square: corrugated steel painted bright yellow, two vertical dark locking bars on each of "
                         "the two doors.", "1024x1024"),
    "container-verde": (STILE + OGGETTO + "A small shipping container seen exactly from its door end, a perfect "
                        "square: corrugated steel painted bright green, two vertical dark locking bars on each of "
                        "the two doors.", "1024x1024"),
    "container-blu": (STILE + OGGETTO + "A small shipping container seen exactly from its door end, a perfect "
                      "square: corrugated steel painted bright blue, two vertical dark locking bars on each of "
                      "the two doors.", "1024x1024"),
    "trave": (STILE + OGGETTO + "A long horizontal steel I-beam girder, side view, very long and thin (eight times "
              "wider than tall), orange-red painted steel with a row of rivets and yellow-black warning stripes at "
              "both ends.", "1536x1024"),

    # --- Arrivo ---
    # Al più 192×112 a schermo: si chiede una griglia vicina alla misura finale, perché una più fitta (260)
    # faceva fondere celle a caso nella riduzione. Il generatore la rispetta solo in parte.
    "stazione": (STILE_BASE + OGGETTO + "Pixel art drawn exactly as if the whole image were only 200 pixels wide, "
                 "then scaled up: every pixel is a crisp square about 8 image pixels wide. A small friendly railway station building for the finish line, side view: a "
                 "grey stone platform along the bottom with a yellow safety line, a cozy cream building with a "
                 "pitched red roof, a big round clock in the gable, two windows, a wooden door, and a green flag on "
                 "a pole on the roof. A blank sign board with no text. About 1.7 times wider than tall.",
                 "1536x1024"),
    "icona-stazione": (STILE + OGGETTO + "A tiny icon of a small railway station, designed to stay readable at 16x16 "
                       "pixels: very few, very big shapes. A cream square building with one dark door, a big bright "
                       "red triangular roof, and a green flag on a pole on top. No details, no windows, no text.",
                       "1024x1024"),

    # --- Pezzi che volano via all'urto nel facile ---
    "pezzo-legna": (PEZZO + "a small broken piece of a firewood log, brown bark with a light round ring on its end.",
                    "1024x1024"),
    "pezzo-paglia": (PEZZO + "a small tuft of golden straw, three or four straws crossing.", "1024x1024"),
    "pezzo-asse": (PEZZO + "a small broken piece of a white-painted wooden fence plank with a jagged end.",
                   "1024x1024"),
    "pezzo-polvere": (STILE + SOLO_EFFETTO + "A single small soft puff of light beige dust, like a tiny cartoon "
                      "cloud made of three round blobs, drawn as if on an 8x8 pixel grid scaled up. No rock, no "
                      "stone, no debris. Outline in a darker beige-brown instead of dark purple.", "1024x1024"),
    "pezzo-stella": (PEZZO + "a small bright yellow cartoon impact star with five points.", "1024x1024"),

    # --- Interfaccia: icone, bottoni, titolo, fondo del menu ---
    "icona-gioca": (ICONA + "a play symbol, a big right-pointing triangle with rounded corners.", "1024x1024"),
    "icona-pausa": (ICONA + "a pause symbol, two thick vertical bars with rounded corners.", "1024x1024"),
    "icona-casa": (ICONA + "a simple house: a triangular roof and a square body with a door.", "1024x1024"),
    "icona-ancora": (ICONA + "a 'play again' symbol: a thick circular arrow going clockwise.", "1024x1024"),
    "icona-audio": (ICONA + "a loudspeaker with two curved sound waves coming out to the right.", "1024x1024"),
    "icona-muto": (ICONA + "a loudspeaker with a small bold X to its right instead of sound waves.", "1024x1024"),
    "icona-ruota": (ICONA + "a smartphone lying horizontally with a curved arrow around it, meaning 'rotate "
                    "your device'.", "1024x1024"),
    "bottone-giallo": (BOTTONE + "warm golden yellow (#f2c230), rim darker ochre.", "1024x1024"),
    "bottone-crema": (BOTTONE + "warm cream white (#f4f1ea), rim light warm grey.", "1024x1024"),
    "bottone-prugna": (BOTTONE + "muted plum purple (#4d3d66), rim darker plum.", "1024x1024"),
    "titolo": (STILE + OGGETTO + "The game title logo reading exactly \"Ciuf Ciuf\" (two words, capital C, nothing "
               "else written), big chunky rounded pixel letters in warm golden yellow with a darker orange "
               "bottom shading and thick dark outline, slightly bouncy baseline, a small white steam puff "
               "rising from the dot of the letter i. Wide and short, about 3.5 times wider than tall. "
               "Correct spelling is essential.", "1536x1024"),
    "menu-sfondo": (STRATO + GRANA_FINISSIMA + "A cozy wide countryside railway landscape for a title screen, golden late "
                    "afternoon light: soft blue sky with a few fluffy clouds, rolling green hills, a small "
                    "red-roofed station far on the right, a railway track running horizontally along the "
                    "bottom, flowers in the grass. The left two thirds of the sky stay calm and simple. No "
                    "train, no people, no text.", "1536x1024"),

    # --- Sfondi (strisce larghe: le rende ripetibili pulisci-immagini.py) ---
    "facile-cielo": (STRATO + GRANA_FINISSIMA + "A bright clear blue sky with a few big fluffy white clouds spread across the width, "
                     "lighter near the bottom. Only sky, no ground, no hills.", "1536x1024"),
    "facile-lontano": (STRATO + GRANA_FINE + "Soft rolling green hills far away under a light-blue sky: a windmill, a patchwork of "
                       "fields, round trees, a small farmhouse with a red roof and a red barn. Muted colors, slightly "
                       "hazed toward light blue. The scenery fills the bottom 40% of the image; above it "
                       "the image is fully transparent (no sky).", "1536x1024"),
    "facile-vicino": (STRATO + GRANA_FINE + VICINO + "A low, close bright green grassy bank seen from the side, with small pink, yellow "
                      "and white flowers and tiny tufts of grass; only a few very low, small round bushes. No "
                      "fences, no hay, no rocks, no tall plants. The grass is a thin strip filling only the bottom "
                      "12% of the image; above it the image is fully transparent (no sky).", "1536x1024"),
    "medio-cielo": (STRATO + GRANA_FINISSIMA + "A light afternoon sky turning warm cream near the horizon, soft cream clouds, and far "
                    "away along the bottom the pale blue-grey silhouette of a small town: rooftops, a church spire "
                    "and a clock tower. No ground.", "1536x1024"),
    "medio-lontano": (STRATO + GRANA_FINE + "A row of colorful terraced houses (brick red, ochre, cream, teal) with pitched slate "
                      "roofs, chimneys and white windows, and a stone railway station with arched windows and a big "
                      "round clock. Slightly hazed colors. The buildings fill the bottom 45% of the image; above them "
                      "the image is fully transparent (no sky).", "1536x1024"),
    "medio-vicino": (STRATO + GRANA_FINE + VICINO + "A stone railway station platform seen from the side, with a yellow safety line along "
                     "its top edge, green lamp posts and wooden benches. No crates, no signals, no people. The "
                     "platform fills the bottom 20% of the image, lamp posts rise above it; behind and "
                     "above them the image is fully transparent (no sky).", "1536x1024"),
    "difficile-cielo": (STRATO + GRANA_FINISSIMA + "A clear light-blue sky with white clouds over a calm blue sea; on the sea far away "
                        "two small cargo ships loaded with tiny colorful containers, and a red-and-white lighthouse "
                        "on a stone breakwater. The sea fills the bottom third. Pale hazy colors for distance.",
                        "1536x1024"),
    "difficile-lontano": (STRATO + GRANA_FINE + "A harbour: tall ship-to-shore gantry cranes (one orange, one blue) with long "
                          "horizontal booms, and stacks of corrugated shipping containers in many colors. Colors "
                          "noticeably hazed toward light blue. The scenery fills the bottom 50% of the image; above "
                          "it the image is fully transparent (no sky).", "1536x1024"),
    "difficile-vicino": (STRATO + GRANA_FINE + VICINO + "A concrete harbour quay seen from the side, light grey concrete with vertical "
                         "expansion joints and a few small dark mooring bollards on top. No containers, no barrels. "
                         "The quay fills the bottom 20% of the image; above it the image is fully transparent (no sky).",
                         "1536x1024"),
    "binario-campagna": (STILE_BASE + GRANA_FINE + "A straight railway track seen exactly from the side, filling the whole width: "
                         "one shiny steel rail on top, the ends of wooden sleepers just below it, and brown-grey "
                         "gravel ballast underneath filling the bottom. Transparent above the rail. Uniform along "
                         "the width.", "1536x1024"),
    "binario-porto": (STILE_BASE + GRANA_FINE + "A straight railway track seen exactly from the side, filling the whole width: one "
                      "shiny steel rail on top, the ends of dark wooden sleepers just below it, and grey gravel "
                      "ballast underneath filling the bottom. Transparent above the rail. Uniform along the width.",
                      "1536x1024"),

    # --- Effetti: solo la nuvola, il generatore tende ad aggiungere chi la produce ---
    "fumo": (STILE + SOLO_EFFETTO + "A single soft round puff of white and very light grey steam, made of four "
             "overlapping round blobs, like a small cartoon cloud. Outline in light grey (#b8b2c0), not dark.",
             "1024x1024"),
    "scarico": (STILE + SOLO_EFFETTO + "A single small round puff of dark grey exhaust smoke, made of three "
                "overlapping round blobs, like a small dark cartoon cloud.", "1024x1024"),
}


def invia(percorso: str, dati: bytes, tipo: str) -> dict:
    richiesta = urllib.request.Request(
        f"https://api.openai.com/v1/{percorso}", data=dati,
        headers={"Authorization": f"Bearer {CHIAVE.read_text().strip()}", "Content-Type": tipo},
    )
    try:
        with urllib.request.urlopen(richiesta, timeout=300) as r:
            risposta = json.load(r)
    except urllib.error.HTTPError as e:
        errore = json.loads(e.read() or b"{}").get("error", {})
        # Credito finito: va riconosciuto, non ritentato.
        if errore.get("code") in ("insufficient_quota", "billing_hard_limit_reached"):
            sys.exit(f"CREDITO ESAURITO ({errore.get('code')}): {errore.get('message')}")
        sys.exit(f"Errore HTTP {e.code}: {errore.get('code')} {errore.get('message')}")
    return risposta


def registra(id_asset: str, file: Path, risposta: dict) -> None:
    with (GREZZE / "consumi.jsonl").open("a") as f:
        f.write(json.dumps({"id": id_asset, "file": file.name, "modello": MODELLO,
                            "usage": risposta.get("usage")}) + "\n")


def trasparente(id_asset: str) -> bool:
    # Cieli e fondo del menu coprono tutto lo schermo: senza trasparenza. Il resto la chiede.
    return not (id_asset.endswith("-cielo") or id_asset == "menu-sfondo")


def chiama(id_asset: str) -> Path:
    prompt, formato = ASSET[id_asset]
    corpo = {"model": MODELLO, "prompt": prompt, "size": formato, "quality": "high",
             "output_format": "png", "n": 1}
    if trasparente(id_asset):
        corpo["background"] = "transparent"
    risposta = invia("images/generations", json.dumps(corpo).encode(), "application/json")
    cartella = GREZZE / id_asset
    cartella.mkdir(parents=True, exist_ok=True)
    file = cartella / f"{time.strftime('%Y%m%d-%H%M%S')}.png"
    file.write_bytes(base64.b64decode(risposta["data"][0]["b64_json"]))
    registra(id_asset, file, risposta)
    return file


def multipart(campi: dict[str, str], file: dict[str, bytes]) -> tuple[bytes, str]:
    confine = f"----ciufciuf{time.time_ns()}"
    parti = []
    for nome, valore in campi.items():
        parti.append(f'--{confine}\r\nContent-Disposition: form-data; name="{nome}"\r\n\r\n{valore}\r\n'.encode())
    for nome, dati in file.items():
        parti.append(f'--{confine}\r\nContent-Disposition: form-data; name="{nome}"; filename="{nome}.png"\r\n'
                     f"Content-Type: image/png\r\n\r\n".encode() + dati + b"\r\n")
    parti.append(f"--{confine}--\r\n".encode())
    return b"".join(parti), f"multipart/form-data; boundary={confine}"


def ripetibile(id_asset: str, nome: str) -> Path:
    import io

    from PIL import Image

    sorgente = Image.open(GREZZE / id_asset / nome).convert("RGBA")
    l, a = sorgente.size
    girata = Image.new("RGBA", (l, a))
    girata.paste(sorgente.crop((l // 2, 0, l, a)), (0, 0))
    girata.paste(sorgente.crop((0, 0, l // 2, a)), (l - l // 2, 0))
    fascia = (l // 2 - l // 10, 0, l // 2 + l // 10, a)
    # Nella maschera l'alfa a zero segna ciò che il modello può ridipingere.
    maschera = Image.new("RGBA", (l, a), (0, 0, 0, 255))
    maschera.paste((0, 0, 0, 0), fascia)

    def png(im: Image.Image) -> bytes:
        b = io.BytesIO()
        im.save(b, "PNG")
        return b.getvalue()

    prompt = (ASSET[id_asset][0] + " Repaint ONLY the transparent masked vertical band in the middle so that the "
              "left and right halves join into one continuous, seamless scene: same style, colors, horizon and "
              "ground height. Nothing else changes.")
    campi = {"model": MODELLO, "prompt": prompt, "size": f"{l}x{a}", "quality": "high", "n": "1"}
    if trasparente(id_asset):
        campi["background"] = "transparent"
    dati, tipo = multipart(campi, {"image": png(girata), "mask": png(maschera)})
    risposta = invia("images/edits", dati, tipo)
    ridipinta = Image.open(io.BytesIO(base64.b64decode(risposta["data"][0]["b64_json"]))).convert("RGBA")
    if ridipinta.size != girata.size:
        ridipinta = ridipinta.resize(girata.size, Image.LANCZOS)
    # Fuori dalla fascia restano i pixel originali: il modello ridisegna tutto, e i bordi devono combaciare.
    girata.paste(ridipinta.crop(fascia), fascia[:2])
    file = GREZZE / id_asset / f"{Path(nome).stem}-rip.png"
    girata.save(file)
    registra(id_asset, file, risposta)
    return file


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] == "elenco":
        print("\n".join(ASSET))
        sys.exit()
    if sys.argv[1] == "ripetibile":
        print(ripetibile(sys.argv[2], sys.argv[3]))
        sys.exit()
    id_asset = sys.argv[1]
    if id_asset not in ASSET:
        sys.exit(f"Asset sconosciuto: {id_asset}")
    for _ in range(int(sys.argv[2]) if len(sys.argv) > 2 else 1):
        print(chiama(id_asset))
