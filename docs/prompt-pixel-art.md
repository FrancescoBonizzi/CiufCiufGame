# Prompt per la pixel art

Un prompt per ogni immagine del gioco, da dare a un generatore di pixel art. I prompt sono in inglese
perché i generatori rendono meglio così; ognuno va incollato **dopo** il blocco di stile comune.

Risoluzione logica del gioco: **480×270**. Le misure qui sotto sono quelle **finali** in pixel di gioco: se il
generatore produce immagini più grandi, si riportano alla misura con un ridimensionamento *nearest* e si
riduce la palette (fase 6 della roadmap). Nessun generatore produce pixel perfetti: la pulizia è prevista.

## Blocco di stile comune

```
Pixel art game asset, 16-bit era style, clean and readable for a 4-year-old child.
Side view, orthographic, no perspective. Thick 1-pixel dark outline (#2b2133) around every object.
Flat shading with at most 3 tones per material, light coming from the top-left.
Limited palette, no gradients, no dithering, no anti-aliasing, no blur, no text, no watermark.
Friendly, rounded, cartoon shapes. Single object centered on a fully transparent background,
nothing else in the image, no ground shadow unless asked.
```

## Locomotive

Tutte guardano a **destra**, ruote appoggiate al bordo inferiore dell'immagine. La carrozzeria (il colore che
il giocatore sceglie) va disegnata **solo** con la rampa magenta qui sotto, che nessun'altra parte deve
usare: il gioco la sostituisce col colore scelto.

Rampa magenta (dalla luce all'ombra): `#ff9cff`, `#ff3dff`, `#c400c4`, `#7a007a`.

Ogni locomotiva: foglio orizzontale di **4 fotogrammi da 64×40**, cioè 256×40, in cui cambia solo la
posizione delle ruote e delle bielle (ciclo di rotazione).

### Locomotiva a vapore

```
A cute small steam locomotive, side view facing right, 64x40 pixels per frame,
horizontal sprite sheet of 4 frames (256x40 total) showing a wheel rotation cycle.
Boiler, cab and cowcatcher painted ONLY in these magenta shades: #ff9cff, #ff3dff, #c400c4, #7a007a.
Black smokestack, dark grey wheels with red hubs, golden bell, small round window with light-blue glass.
No magenta anywhere else. No smoke (smoke is a separate sprite).
```

### Locomotiva diesel

```
A cute small diesel locomotive, side view facing right, 64x40 pixels per frame,
horizontal sprite sheet of 4 frames (256x40 total) showing a wheel rotation cycle.
Boxy body with rounded front, cab with two light-blue windows, painted ONLY in these magenta shades:
#ff9cff, #ff3dff, #c400c4, #7a007a. Yellow-black warning stripes on the front, dark grey bogies,
a small grey exhaust on the roof. No magenta anywhere else. No smoke.
```

### Locomotiva elettrica

```
A cute small electric locomotive, side view facing right, 64x40 pixels per frame,
horizontal sprite sheet of 4 frames (256x40 total) showing a wheel rotation cycle.
Sleek streamlined body with a sloped nose and wide light-blue windshield, painted ONLY in these
magenta shades: #ff9cff, #ff3dff, #c400c4, #7a007a. Grey pantograph folded on the roof,
dark grey bogies, white headlight. No magenta anywhere else.
```

### Effetti delle locomotive

```
Pixel art puff of white-grey steam smoke, 4 frames of 16x16 pixels in a horizontal strip (64x16),
growing and fading from a small dense puff to a large soft cloud. Transparent background.
```

```
Pixel art small dark-grey diesel exhaust puff, 4 frames of 12x12 pixels in a horizontal strip (48x12),
growing and fading. Transparent background.
```

```
Pixel art electric spark from a train pantograph, 3 frames of 12x12 pixels in a horizontal strip (36x12),
bright white-yellow and light-blue zigzag sparks. Transparent background.
```

## Ostacoli – Facile, campagna

Grandi, colori caldi, riconoscibili al primo sguardo. Appoggiati al bordo inferiore dell'immagine.

```
A big bundle of firewood logs tied with a red rope, side view, 36x28 pixels, warm browns,
log ends showing light rings. Transparent background.
```

```
A round golden hay bale seen from the side, 32x32 pixels, warm yellow straw texture with a few
loose straws sticking out, two thin brown bands around it. Transparent background.
```

```
A short wooden countryside fence section, side view, 40x24 pixels, three white-painted vertical posts
and two horizontal rails, slightly rustic. Transparent background.
```

## Ostacoli – Medio, stazione

```
A wooden railway freight crate with metal corners and a stencilled arrow, side view, 28x28 pixels,
brown wood and grey metal. Transparent background.
```

```
A vintage railway station luggage trolley with two big spoked wheels and a long handle,
loaded with two suitcases (one blue, one red), side view, 40x28 pixels. Transparent background.
```

```
A lowered railway level crossing barrier, side view, 44x24 pixels: a short dark post on the left
and a horizontal red-and-white striped arm extending to the right at about 18 pixels height,
a small red lamp on the arm. Transparent background.
```

```
A small ground railway signal, side view, 20x32 pixels: grey pole on a square base,
round head with one red light on. Transparent background.
```

## Ostacoli – Difficile, ferrovia industriale

Colori più freddi e saturi meno, ma sempre col contorno scuro: devono staccarsi dallo sfondo industriale.

```
A stack of two wooden industrial pallets, side view, 36x16 pixels, pale wood planks with dark gaps.
Transparent background.
```

```
Industrial oil barrels, side view: sprite sheet with two variants side by side —
a single blue steel barrel 18x26 pixels and two barrels side by side 36x26 pixels —
with metal rims and a small hazard label. Transparent background, 56x26 total.
```

```
Stacked wooden cargo crates, side view: sprite sheet with three variants side by side —
one crate (20x20), two crates stacked (20x40), three crates in a pyramid (40x40) —
dark brown wood with lighter edges and metal corners. Transparent background, 80x40 total.
```

```
A horizontal steel I-beam girder, side view, 96x12 pixels, orange-red painted steel with rivets
and a yellow-black warning stripe at both ends. Transparent background.
```

```
Two tall steel gantry pillars that hold an overhead girder, side view, each 8x64 pixels,
grey-blue steel with rivets and cross bracing, placed as a pair 96 pixels apart (112x64 total).
Transparent background.
```

## Sfondi in parallasse

Ogni scenario ha 3 strati larghi **480 px** e **ripetibili orizzontalmente senza giunture visibili**
(il bordo sinistro deve continuare il destro), più il binario. Strati senza trasparenza tranne dove indicato.

### Campagna

```
Seamless horizontally tileable pixel art background, 480x270 pixels, bright clear blue sky
with a few big fluffy white clouds, no ground. Cheerful, simple, for a children's game.
```

```
Seamless horizontally tileable pixel art layer, 480x110 pixels, transparent top: soft rolling green hills
far away with a few tiny trees and a small farmhouse with a red roof, muted colors for distance.
```

```
Seamless horizontally tileable pixel art layer, 480x70 pixels, transparent top: close bright green meadow
with flowers, bushes and a few wooden fence posts, saturated colors.
```

### Stazione

```
Seamless horizontally tileable pixel art background, 480x270 pixels, light afternoon sky
with soft clouds and the silhouette of a city skyline far away. No ground.
```

```
Seamless horizontally tileable pixel art layer, 480x130 pixels, transparent top: a railway station
building facade with arched windows, a big round clock, and a canopy roof on iron columns.
```

```
Seamless horizontally tileable pixel art layer, 480x50 pixels, transparent top: a stone station platform
edge with a yellow safety line, benches and lamp posts.
```

### Ferrovia industriale

```
Seamless horizontally tileable pixel art background, 480x270 pixels, hazy orange-grey sky at dusk,
distant factory chimneys with thin smoke. No ground.
```

```
Seamless horizontally tileable pixel art layer, 480x140 pixels, transparent top: freight warehouses
with corrugated metal walls, stacked shipping containers and a tall crane silhouette.
```

```
Seamless horizontally tileable pixel art layer, 480x60 pixels, transparent top: gravel yard with
rusty metal fences, spare rails and concrete blocks.
```

### Binario

```
Seamless horizontally tileable pixel art railway track, side view, 64x24 pixels:
two steel rails seen from the side on wooden sleepers over grey gravel ballast. Transparent above the rails.
```

## Arrivo

```
A small friendly railway station building for the finish line, side view, 192x112 pixels:
platform at the bottom, a cozy building with a pitched red roof, a clock, a flag on top,
and a sign board with no text. Transparent background.
```

## Interfaccia

Nel menu le figure si mostrano ingrandite con `image-rendering: pixelated`.

```
Three pixel art thumbnails side by side, each 96x54 pixels (288x54 total), for a level select menu:
1) green countryside with blue sky and a hay bale, 2) a railway station platform with a clock,
3) an industrial rail yard with a crane and barrels. Bright, simple, no text.
```

```
Small pixel art icons on transparent background, each 16x16 pixels, in a horizontal strip (64x16):
a pause icon, a play triangle, a speaker with sound waves, a speaker crossed out. Dark outline, white fill.
```

```
A tiny pixel art railway station icon, 16x16 pixels, red roof and a flag, for a progress bar destination.
Transparent background.
```

## Particelle

```
Pixel art particle sprites on transparent background, horizontal strip of 8x8 pixel cells (48x8 total):
a dust puff, a wood chip, a straw piece, a small splinter, a metal bolt, a star sparkle.
```
