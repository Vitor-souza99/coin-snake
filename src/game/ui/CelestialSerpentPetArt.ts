/** Small emerald celestial serpent illustration shared by the shop and collection. */
export const celestialSerpentPetArt = (): string =>
  `<svg class="celestial-serpent-pet-art" viewBox="0 0 120 100" role="img" aria-label="Pequena serpente celestial verde-esmeralda">
    <defs>
      <linearGradient id="serpent-scales" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#c8ff9b"/><stop offset=".42" stop-color="#48d187"/><stop offset="1" stop-color="#087b68"/></linearGradient>
      <linearGradient id="serpent-belly" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#fff0a2"/><stop offset="1" stop-color="#b7ef9a"/></linearGradient>
      <radialGradient id="serpent-aura"><stop stop-color="#77ffd1" stop-opacity=".5"/><stop offset="1" stop-color="#77ffd1" stop-opacity="0"/></radialGradient>
    </defs>
    <circle cx="59" cy="51" r="46" fill="url(#serpent-aura)"/>
    <path d="M27 76Q17 69 24 59Q30 51 45 58Q62 66 73 57Q83 49 72 42Q64 37 56 43" fill="none" stroke="#075b50" stroke-width="18" stroke-linecap="round"/>
    <path d="M27 74Q18 68 25 60Q31 53 45 60Q62 68 73 57Q82 49 72 42Q65 37 57 43" fill="none" stroke="url(#serpent-scales)" stroke-width="14" stroke-linecap="round"/>
    <path d="M27 76Q22 70 26 65Q33 59 46 65Q62 72 74 61" fill="none" stroke="url(#serpent-belly)" stroke-width="4" stroke-linecap="round"/>
    <path d="M53 43Q50 31 59 25Q68 18 81 24L93 31Q97 35 92 40L84 47Q74 50 66 44Z" fill="url(#serpent-scales)" stroke="#075b50" stroke-width="3" stroke-linejoin="round"/>
    <path d="M59 28Q54 18 61 12Q68 18 67 25M73 25Q80 15 87 17Q87 25 82 30" fill="#58d797" stroke="#087b68" stroke-width="2" stroke-linejoin="round"/>
    <path d="M64 34Q69 29 74 34" fill="none" stroke="#194b45" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="66" cy="37" r="2" fill="#173e38"/><circle cx="66.6" cy="36.4" r=".7" fill="#fff"/>
    <path d="M91 34Q100 34 105 39Q98 41 91 39Z" fill="#f3d66f" stroke="#075b50" stroke-width="1.5"/>
    <path d="M40 55l2 3 3 .5-2.5 2-1 3-1.5-2.5-3-.5 2.5-2Z" fill="#fff1a3"/>
    <circle cx="83" cy="59" r="2" fill="#fff1a3"/><circle cx="31" cy="52" r="1.5" fill="#d7ffab"/>
  </svg>`;