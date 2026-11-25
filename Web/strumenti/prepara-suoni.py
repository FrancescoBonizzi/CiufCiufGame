"""Suoni e musiche del gioco: scarica le registrazioni, taglia, mette in loop, normalizza, codifica in MP3.

Uso: python3 strumenti/prepara-suoni.py  (dalla cartella Web/, serve ffmpeg nel PATH)

Le fonti sono registrazioni vere: effetti CC0 da Freesound (anteprime HQ, nessun login) e musiche di
Kevin MacLeod (incompetech.com, CC-BY 4.0, attribuzione in THIRD-PARTY-NOTICES.md). Gli originali restano
in strumenti/.sorgenti-audio/, ignorata da git. Per provare un'altra registrazione basta cambiare la sua
riga in SUONI e rilanciare.

Scrive public/assets/sounds/*.mp3 e src/audio/loop.ts, con la durata del ciclo di ogni loop.

Un loop in MP3 non si può ripetere dall'inizio del file: il decoder aggiunge silenzio in testa e in coda, e
si sentirebbe un buco. Il ciclo quindi sta in mezzo al file, con MARGINE secondi di audio continuo per lato,
e il gioco lo ripete come sprite di Howler (loopStart/loopEnd della Web Audio), che salta quel silenzio.
"""
import math
import struct
import subprocess
import urllib.request
from pathlib import Path

WEB = Path(__file__).resolve().parent.parent
SORGENTI = WEB / "strumenti" / ".sorgenti-audio"
USCITA = WEB / "public" / "assets" / "sounds"
LOOP_TS = WEB / "src" / "audio" / "loop.ts"

FREQ = 44100
MARGINE = 0.1


def freesound(id_suono, anteprima):
    return {"url": f"https://cdn.freesound.org/previews/{anteprima}-hq.mp3", "file": f"freesound-{id_suono}.mp3"}


def incompetech(titolo):
    nome = urllib.request.quote(titolo)
    return {"url": f"https://incompetech.com/music/royalty-free/mp3-royaltyfree/{nome}.mp3",
            "file": f"incompetech-{titolo.replace(' ', '-')}.mp3"}


# inizio e durata in secondi nella registrazione; dB è il livello RMS d'arrivo (il picco resta sotto -1 dBFS).
# ciclo: durata del loop, ricavata dal ritmo misurato; dissolvenza: secondi di incrocio fra coda e testa.
SUONI = {
    # Jacobite (Fort William - Mallaig): sbuffi regolari ogni 0,58 s fra 0,5 e 5,1 s; il ciclo ne tiene 7.
    "marcia-vapore": dict(fonte=freesound(203175, "203/203175_3794199"), inizio=0.42, ciclo=4.05, dissolvenza=0.12, dB=-20),
    # Treno diesel ad Aarhus: motore stazionario da 6 s in poi.
    "marcia-diesel": dict(fonte=freesound(163431, "163/163431_1868374"), inizio=10.0, ciclo=6.0, dissolvenza=0.5, dB=-22),
    # Motore elettrico al minimo (Queensland Rail), già registrato come loop.
    "marcia-elettrica": dict(fonte=freesound(700034, "700/700034_14219512"), inizio=0.1, ciclo=2.0, dissolvenza=0.3, dB=-22),
    "fischio-vapore": dict(fonte=freesound(71778, "71/71778_706955"), inizio=0.0, durata=3.2, coda=0.3, dB=-16),
    # Fischio corto di una macchina a vapore stradale: il secondo fischio durante la corsa.
    "fischio-vapore-corto": dict(fonte=freesound(407394, "407/407394_5385809"), inizio=4.7, durata=0.75, coda=0.2, dB=-16),
    # Tromba di una diesel ferma: il colpo è fra 11,4 e 12,4 s, sopra il motore al minimo.
    "fischio-diesel": dict(fonte=freesound(278176, "278/278176_1728127"), inizio=11.3, durata=1.5, coda=0.3, dB=-16),
    # Treno elettrico estone (Elron) in arrivo: il colpo di tromba è fra 34,4 e 34,9 s.
    "fischio-elettrica": dict(fonte=freesound(471063, "471/471063_2200015"), inizio=34.3, durata=1.1, coda=0.4, dB=-16),
    "salto": dict(fonte=freesound(623817, "623/623817_12923717"), inizio=0.0, durata=0.5, coda=0.15, dB=-20),
    # Ferro su legno: le ruote che ricadono sulle traversine.
    "atterraggio": dict(fonte=freesound(372877, "372/372877_6944346"), inizio=0.0, durata=0.8, coda=0.3, dB=-24),
    "urto": dict(fonte=freesound(464484, "464/464484_4814007"), inizio=0.05, durata=0.8, coda=0.2, dB=-16),
    "schianto": dict(fonte=freesound(562198, "562/562198_12618935"), inizio=0.0, durata=1.5, coda=0.4, dB=-15),
    # Musiche: i primi 105 s bastano alla partita più lunga (80 s più l'arrivo); poi riparte da capo.
    "musica-campagna": dict(fonte=incompetech("Hillbilly Swing"), inizio=0.0, durata=105, coda=4, dB=-22, stereo=True),
    "musica-cittadina": dict(fonte=incompetech("Life of Riley"), inizio=0.0, durata=105, coda=4, dB=-22, stereo=True),
    "musica-porto": dict(fonte=incompetech("Fiddles McGinty"), inizio=0.0, durata=105, coda=4, dB=-22, stereo=True),
}


def scarica(fonte):
    SORGENTI.mkdir(parents=True, exist_ok=True)
    percorso = SORGENTI / fonte["file"]
    if not percorso.exists():
        richiesta = urllib.request.Request(fonte["url"], headers={"User-Agent": "Mozilla/5.0"})
        percorso.write_bytes(urllib.request.urlopen(richiesta).read())
    return percorso


def leggi(percorso, inizio, durata, canali):
    pcm = subprocess.run(
        ["ffmpeg", "-v", "error", "-ss", str(inizio), "-t", str(durata), "-i", str(percorso),
         "-ac", str(canali), "-ar", str(FREQ), "-f", "f32le", "-"],
        capture_output=True, check=True).stdout
    campioni = list(struct.unpack(f"<{len(pcm) // 4}f", pcm))
    # Un canale per lista: le operazioni sotto lavorano per canale.
    return [campioni[c::canali] for c in range(canali)]


def ciclo_senza_giunture(canale, n_ciclo, n_dissolvenza):
    """Il ciclo dura n_ciclo campioni; la testa è incrociata con ciò che nella registrazione la seguiva."""
    assert len(canale) >= n_ciclo + n_dissolvenza, "registrazione troppo corta per ciclo e dissolvenza"
    uscita = canale[:n_ciclo]
    for i in range(n_dissolvenza):
        # Potenza costante: il rumore di una locomotiva non è correlato fra i due punti.
        a = math.sin(0.5 * math.pi * i / n_dissolvenza)
        b = math.cos(0.5 * math.pi * i / n_dissolvenza)
        uscita[i] = canale[i] * a + canale[n_ciclo + i] * b
    return uscita


def sfuma(canale, testa, coda):
    n_testa, n_coda = int(testa * FREQ), int(coda * FREQ)
    for i in range(min(n_testa, len(canale))):
        canale[i] *= i / n_testa
    for i in range(min(n_coda, len(canale))):
        canale[-1 - i] *= i / n_coda


def normalizza(canali, dB):
    tutti = [v for c in canali for v in c]
    rms = math.sqrt(sum(v * v for v in tutti) / len(tutti))
    picco = max(abs(v) for v in tutti)
    guadagno = min(10 ** (dB / 20) / rms, 10 ** (-1 / 20) / picco)
    return [[v * guadagno for v in c] for c in canali], 20 * math.log10(rms * guadagno)


def scrivi_mp3(nome, canali, stereo):
    intercalati = [v for gruppo in zip(*canali) for v in gruppo]
    USCITA.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(FREQ), "-ac", str(len(canali)), "-i", "-",
         "-c:a", "libmp3lame", "-b:a", "112k" if stereo else "80k", str(USCITA / f"{nome}.mp3")],
        input=struct.pack(f"<{len(intercalati)}f", *intercalati), check=True)


def main():
    cicli = {}
    for nome, s in SUONI.items():
        sorgente = scarica(s["fonte"])
        n_canali = 2 if s.get("stereo") else 1
        if "ciclo" in s:
            n_ciclo, n_diss = int(s["ciclo"] * FREQ), int(s["dissolvenza"] * FREQ)
            grezzo = leggi(sorgente, s["inizio"], s["ciclo"] + s["dissolvenza"] + 0.05, n_canali)
            ciclo = [ciclo_senza_giunture(c, n_ciclo, n_diss) for c in grezzo]
            ciclo, livello = normalizza(ciclo, s["dB"])
            m = int(MARGINE * FREQ)
            # Coda del ciclo, ciclo, testa del ciclo: ai due lati l'audio continua come nel loop.
            canali = [c[-m:] + c + c[:m] for c in ciclo]
            cicli[nome] = s["ciclo"]
        else:
            canali = leggi(sorgente, s["inizio"], s["durata"], n_canali)
            for c in canali:
                sfuma(c, 0.005, s["coda"])
            canali, livello = normalizza(canali, s["dB"])
        scrivi_mp3(nome, canali, s.get("stereo", False))
        print(f"{nome:22} {len(canali[0]) / FREQ:6.2f} s  {livello:6.1f} dBFS RMS")

    righe = "\n".join(f'  "{n}": {{ inizioMs: {MARGINE * 1000:.0f}, durataMs: {d * 1000:.0f} }},' for n, d in cicli.items())
    LOOP_TS.parent.mkdir(parents=True, exist_ok=True)
    LOOP_TS.write_text(
        "// Generato da strumenti/prepara-suoni.py: non modificare a mano.\n"
        "// Dove sta il ciclo dentro ogni file di loop (il resto è margine per il silenzio dell'MP3).\n"
        f"export const LOOP = {{\n{righe}\n}} as const;\n", encoding="utf-8")


if __name__ == "__main__":
    main()
