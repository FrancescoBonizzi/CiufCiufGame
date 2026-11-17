import { defineConfig } from "vite";

export default defineConfig({
  // NOTE: la sottocartella in cui il sito pubblica il gioco (public/ciufciuf-play/ di imagine-software).
  // La "/" finale serve: i percorsi a runtime si compongono come `${BASE_URL}assets/...`.
  base: "/ciufciuf-play/",
});
