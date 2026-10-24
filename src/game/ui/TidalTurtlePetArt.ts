/** Shared turtle silhouette for the Tidal Turtle shop and collection cards. */
export const tidalTurtlePetArt = (): string =>
  `<svg class="tidal-turtle-pet-art" viewBox="0 0 120 100" role="img" aria-label="Tartaruga marinha turquesa">
    <defs>
      <linearGradient id="turtle-shell" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#75e5c5"/><stop offset=".55" stop-color="#168f87"/><stop offset="1" stop-color="#155777"/></linearGradient>
      <linearGradient id="turtle-skin" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#a2f0d7"/><stop offset="1" stop-color="#42bda9"/></linearGradient>
    </defs>
    <ellipse cx="59" cy="84" rx="36" ry="7" fill="#47cfc1" opacity=".2"/>
    <path d="M38 53 17 42Q12 40 14 47L28 64 43 67M79 53l21-12q5-2 3 5L89 64 74 67M39 70 27 83q-4 4 2 5l21-10M77 70l13 13q4 4-2 5L67 79" fill="url(#turtle-skin)" stroke="#287b7d" stroke-width="3" stroke-linejoin="round"/>
    <path d="M47 38Q44 25 51 20Q59 14 67 20Q74 26 70 39L62 46 53 44Z" fill="url(#turtle-skin)" stroke="#287b7d" stroke-width="3"/>
    <path d="M51 29q3-5 6-2M63 27q4-3 6 2" fill="none" stroke="#e8fff4" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="55" cy="31" r="1.5" fill="#173f54"/><circle cx="66" cy="31" r="1.5" fill="#173f54"/>
    <circle cx="55.5" cy="30.5" r=".5" fill="#fff"/><circle cx="66.5" cy="30.5" r=".5" fill="#fff"/>
    <path d="M57 38q3 2 6 0" fill="none" stroke="#287b7d" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M38 55Q39 34 60 32Q82 33 83 56L79 68Q60 77 42 68Z" fill="url(#turtle-shell)" stroke="#155b68" stroke-width="4"/>
    <path d="M60 35 60 71M42 47 78 47M43 62 77 62M48 38 43 47M72 38 78 47" fill="none" stroke="#b1f1dc" stroke-width="2.3" opacity=".8"/>
    <path d="M40 55Q60 47 81 55M44 68Q60 74 77 68" fill="none" stroke="#e1fff3" stroke-width="2" opacity=".8"/>
    <circle cx="99" cy="65" r="2.5" fill="#173f54"/><circle cx="99.7" cy="64.2" r=".8" fill="#fff"/>
  </svg>`;