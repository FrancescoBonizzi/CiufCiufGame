// Icone dei bottoni, disegnate qui: chi non legge riconosce la figura. SVG e non glifi Unicode, che
// cambiano da un sistema all'altro e non si centrano.
const svg = (contenuto: string) =>
  `<svg class="icona" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${contenuto}</svg>`;

export const ICONE = {
  gioca: svg(`<path d="M7 4.5v15l12.5-7.5z"/>`),
  pausa: svg(`<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>`),
  casa: svg(`<path d="M3.5 11.5 12 4l8.5 7.5" fill="none"/><path d="M6 10v10h4.5v-6h3v6H18V10" />`),
  ancora: svg(`<path d="M19.5 12a7.5 7.5 0 1 1-2.6-5.7" fill="none"/><path d="M20 3.5v5h-5z"/>`),
  audioAcceso: svg(
    `<path d="M4 9.5h4L13 5v14l-5-4.5H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" fill="none"/>`,
  ),
  audioSpento: svg(`<path d="M4 9.5h4L13 5v14l-5-4.5H4z"/><path d="m16.5 9.5 5 5m0-5-5 5" fill="none"/>`),
};
