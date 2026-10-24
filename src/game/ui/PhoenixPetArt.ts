/** Detailed Solar Phoenix illustration shared by the shop and collection. */
export const phoenixPetArt = (): string =>
  `<svg class="phoenix-pet-art" viewBox="0 0 120 100" role="img" aria-label="Fênix Solar com asas flamejantes">
    <defs>
      <linearGradient id="phoenix-wing" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff2a1"/><stop offset=".45" stop-color="#ffad36"/><stop offset="1" stop-color="#e74732"/></linearGradient>
      <linearGradient id="phoenix-body" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff0a0"/><stop offset=".48" stop-color="#ff9e32"/><stop offset="1" stop-color="#dc3b42"/></linearGradient>
      <radialGradient id="phoenix-halo"><stop stop-color="#ffd45c" stop-opacity=".55"/><stop offset="1" stop-color="#ff7040" stop-opacity="0"/></radialGradient>
    </defs>
    <circle cx="60" cy="52" r="46" fill="url(#phoenix-halo)"/>
    <path d="M51 51Q27 28 8 19Q15 42 35 55Q17 54 8 43Q13 67 42 70Q27 77 20 75Q36 94 56 77Z" fill="url(#phoenix-wing)" stroke="#c94735" stroke-width="2" stroke-linejoin="round"/>
    <path d="M69 51Q93 28 112 19Q105 42 85 55Q103 54 112 43Q107 67 78 70Q93 77 100 75Q84 94 64 77Z" fill="url(#phoenix-wing)" stroke="#c94735" stroke-width="2" stroke-linejoin="round"/>
    <path d="M47 67Q35 85 27 94Q46 91 57 79L60 94 65 79Q78 92 96 94L75 66Z" fill="#e84b38" stroke="#bc3a3c" stroke-width="2" stroke-linejoin="round"/>
    <path d="M60 25Q47 34 46 54Q46 72 60 82Q74 72 74 54Q73 34 60 25Z" fill="url(#phoenix-body)" stroke="#bd4935" stroke-width="2"/>
    <path d="M54 34Q48 20 55 10Q60 22 61 29Q66 19 74 17Q72 31 66 37Z" fill="#ffdf67" stroke="#d95232" stroke-width="2" stroke-linejoin="round"/>
    <path d="M54 44Q60 39 66 44" fill="none" stroke="#73383a" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="54" cy="48" r="2" fill="#352e39"/><circle cx="66" cy="48" r="2" fill="#352e39"/>
    <path d="M58 51Q63 50 69 53L63 59Q61 61 59 58L56 55Z" fill="#ffdb58" stroke="#a94332" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M58 53 66 54 62 57Q60 58 58 56Z" fill="#fff0a0"/>
    <path d="M62 56 66 54" fill="none" stroke="#c65a35" stroke-width="1" stroke-linecap="round"/>
    <circle cx="57" cy="54" r="1.2" fill="#b73d35"/>
    <path d="M43 54Q31 49 22 35M77 54Q89 49 98 35" fill="none" stroke="#fff4bd" stroke-width="2" stroke-linecap="round" opacity=".9"/>
  </svg>`;