# Áudio desta fase

AudioService mantém SFX programáticos, sem downloads de assets. Moedas têm alturas distintas e pequena variação; combo eleva o pitch. Foram adicionados turbo_start, turbo_end, loop discreto de turbo, shrink e shield_break. Loop para em pausa/morte/shutdown. musicVolume e sfxVolume persistem separadamente.

Não há trilha pronta. setMusic(url) permite adicionar arquivo original/licenciado em public/assets/audio. Falha de asset não interrompe o jogo e registra aviso somente em DEV. O slider Música está identificado como reservado a trilhas futuras.

Temas de Green Valley/Candy/Ocean/boss, fades entre mundos, fanfarra de vitória e sons de pets pertencem às próximas fases do master prompt. Não foram marcados como implementados.
