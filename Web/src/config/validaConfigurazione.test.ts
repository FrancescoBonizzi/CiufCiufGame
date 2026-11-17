import { describe, expect, it } from "vitest";
import { LIVELLI } from "./livelli.ts";
import { validaConfigurazione, validaLivello } from "./validaConfigurazione.ts";

describe("validaConfigurazione", () => {
  it("la configurazione rilasciata non ha ostacoli impossibili", () => {
    expect(validaConfigurazione(LIVELLI)).toEqual([]);
  });

  // Il controllo non deve essere vuoto: un salto più basso dell'ostacolo va segnalato.
  it("segnala un ostacolo più alto del salto", () => {
    const basso = { ...LIVELLI.medio, salto: { ...LIVELLI.medio.salto, altezza: 20 } };
    expect(validaLivello("prova", basso).some((e) => e.includes("finestra di salto"))).toBe(true);
  });
});
