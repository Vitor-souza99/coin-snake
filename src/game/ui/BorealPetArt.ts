/** Shared original aurora-spirit artwork for the Boreal pet's collection views. */
export const borealPetArt = (className = "boreal-pet-art"): string =>
  `<svg class="${className}" viewBox="0 0 120 100" role="img" aria-label="Criatura Boreal, espírito de gelo e aurora">
    <defs>
      <linearGradient id="boreal-body" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d9fbff"/><stop offset=".55" stop-color="#7cdaed"/><stop offset="1" stop-color="#6289df"/></linearGradient>
      <linearGradient id="boreal-crest" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#56e6c2"/><stop offset=".55" stop-color="#75caff"/><stop offset="1" stop-color="#c18cff"/></linearGradient>
      <radialGradient id="boreal-glow"><stop stop-color="#8cf9e3" stop-opacity=".62"/><stop offset="1" stop-color="#8cf9e3" stop-opacity="0"/></radialGradient>
    </defs>
    <circle cx="60" cy="54" r="43" fill="url(#boreal-glow)"/>
    <path d="M34 37Q26 22 39 16L51 31Q60 26 69 31L83 17Q94 29 84 42Q94 53 89 69Q84 85 61 87Q37 86 30 70Q25 52 34 37Z" fill="url(#boreal-body)" stroke="#397bb4" stroke-width="3" stroke-linejoin="round"/>
    <path d="M43 31Q47 12 61 8Q60 22 71 28Q79 20 86 21Q82 34 75 39Q60 32 48 40Z" fill="url(#boreal-crest)" stroke="#e8ffff" stroke-width="2" stroke-linejoin="round"/>
    <path d="M43 57Q49 51 55 57M66 57Q72 51 78 57" fill="none" stroke="#28466f" stroke-width="3.5" stroke-linecap="round"/>
    <ellipse cx="61" cy="68" rx="13" ry="8" fill="#efffff" opacity=".9"/><path d="M57 67Q61 64 65 67L61 71Z" fill="#4774aa"/>
    <path d="M40 74Q60 82 81 73" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="3" stroke-linecap="round"/>
    <path d="M29 45l4 2-4 2-2 4-2-4-4-2 4-2 2-4ZM91 48l3 1-3 2-1 3-2-3-3-2 3-1 2-3Z" fill="#fff"/>
  </svg>`;