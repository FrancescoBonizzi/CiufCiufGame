"""Effetti sonori segnaposto sintetizzati a codice: nessuna licenza di terzi.

Uso: python3 strumenti/genera-suoni.py  (dalla cartella Web/)
Scrive i WAV in public/assets/sounds/effects/. Il seme fisso rende il risultato riproducibile.
Restano finché la fase 7 della roadmap non li sostituisce con effetti veri.
"""
import math
import random
import struct
import wave
from pathlib import Path

FREQ = 22050
CARTELLA = Path(__file__).resolve().parent.parent / "public" / "assets" / "sounds" / "effects"
random.seed(7)


def scrivi(nome, campioni):
    CARTELLA.mkdir(parents=True, exist_ok=True)
    picco = max(1e-9, max(abs(c) for c in campioni))
    with wave.open(str(CARTELLA / f"{nome}.wav"), "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(FREQ)
        f.writeframes(b"".join(struct.pack("<h", int(c / picco * 0.85 * 32767)) for c in campioni))


def durata(secondi):
    return range(int(secondi * FREQ))


def inviluppo(i, n, attacco=0.01):
    t = i / FREQ
    a = min(1.0, t / attacco) if attacco > 0 else 1.0
    return a * (1 - i / n) ** 2


def salto():
    n = int(0.2 * FREQ)
    fase, out = 0.0, []
    for i in durata(0.2):
        f = 320 + 520 * (i / n)
        fase += 2 * math.pi * f / FREQ
        out.append((1 if math.sin(fase) > 0 else -1) * 0.5 * inviluppo(i, n))
    return out


def atterraggio():
    n = int(0.14 * FREQ)
    rumore, out = 0.0, []
    for i in durata(0.14):
        rumore = 0.9 * rumore + 0.1 * random.uniform(-1, 1)
        out.append((math.sin(2 * math.pi * 85 * i / FREQ) * 0.8 + rumore * 3) * inviluppo(i, n, 0.002))
    return out


def urto():
    n = int(0.45 * FREQ)
    fase, out = 0.0, []
    for i in durata(0.45):
        t = i / n
        f = (520 - 340 * t) * (1 + 0.12 * math.sin(2 * math.pi * 18 * i / FREQ))
        fase += 2 * math.pi * f / FREQ
        out.append(math.sin(fase) * inviluppo(i, n, 0.003))
    return out


def schianto():
    n = int(0.6 * FREQ)
    rumore, out = 0.0, []
    for i in durata(0.6):
        rumore = 0.6 * rumore + 0.4 * random.uniform(-1, 1)
        basso = math.sin(2 * math.pi * (70 - 30 * i / n) * i / FREQ)
        out.append((rumore + basso * 0.7) * (1 - i / n) ** 3)
    return out


def fischio():
    n = int(1.1 * FREQ)
    out = []
    for i in durata(1.1):
        t = i / FREQ
        a = min(1.0, t / 0.08) * min(1.0, (n - i) / (0.25 * FREQ))
        accordo = sum(math.sin(2 * math.pi * f * t) for f in (523, 659, 784)) / 3
        out.append((accordo + random.uniform(-1, 1) * 0.12) * a)
    return out


for nome, genera in [("salto", salto), ("atterraggio", atterraggio), ("urto", urto), ("schianto", schianto), ("fischio", fischio)]:
    scrivi(nome, genera())
    print(nome)
