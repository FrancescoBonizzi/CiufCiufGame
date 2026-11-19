/** Il cavo della gru che regge la trave, 96×200: scenografia, non ostacolo. Il bordo basso è la cima della trave. */
export const disegnaCavo = (): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 200;
  const ctx = canvas.getContext("2d")!;
  // Acciaio grigio e niente contorno: il contorno scuro spetta a ciò che si urta. Disegnato a codice perché
  // le funi devono arrivare esattamente agli attacchi sulla trave.
  ctx.fillStyle = "#5b5466";
  const gancio = 48;
  // Funi speculari, un pixel per colonna: dagli attacchi sulla trave (x 18 e 77) salgono al gancio.
  for (let i = 0; i <= 30; i++) {
    const y = 199 - Math.round((i * 20) / 30);
    ctx.fillRect(18 + i, y, 1, 1);
    ctx.fillRect(77 - i, y, 1, 1);
  }
  // WARNING: 200 px bastano perché il cavo esca dal bordo alto finché sollevamento + altezza della trave (60)
  // + BINARIO_DAL_BASSO di Game.ts (36) + 200 superano i 270 px dello schermo con margine per lo scossone.
  ctx.fillRect(gancio - 1, 0, 2, 176);
  ctx.fillStyle = "#f2c230";
  ctx.fillRect(gancio - 3, 176, 6, 3);
  return canvas;
};
