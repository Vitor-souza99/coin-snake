# Áudio desta fase

AudioService mantém SFX programáticos, sem downloads de assets. Moedas têm alturas distintas e pequena variação; combo eleva o pitch. Foram adicionados turbo_start, turbo_end, loop discreto de turbo, shrink e shield_break. Loop para em pausa/morte/shutdown. musicVolume e sfxVolume persistem separadamente.

A trilha original `public/assets/audio/coin-snake-theme.wav` é uma composição instrumental chiptune leve e animada, gerada localmente, em mono PCM 16-bit/22.05 kHz: 32 compassos, 96 BPM e aproximadamente 80 segundos, em loop. O arranjo novo combina acordes suaves sustentados, baixo pulsante, percussão discreta e melodia pentatônica simples com variações entre trechos. Não requer dependência de geração de áudio em runtime. BootScene configura a faixa; AudioService aplica o volume persistido, repete a faixa e aguarda/desbloqueia reprodução via interação para compatibilidade com autoplay. A música toca nas telas de menu e navegação (incluindo loja, missões e configurações), para durante gameplay e resultado de partida, e retoma ao sair da partida. Também pausa quando a página fica oculta e respeita “Silenciar áudio”. Falha do arquivo não interrompe o jogo e registra aviso somente em DEV. musicVolume e sfxVolume persistem separadamente.

Candy Coin usa o tom sintetizado `candy_coin`; não há asset de tema/trilha Candy incluído.

Ocean possui SFX sintetizados `pearl_coin`, `bubble_pop`, `clam_open` e `current_flow` como IDs disponíveis; não há arquivos de música Ocean, Kraken ou loops ambientais. O tema oceânico, áudio espacial por distância, aviso/tentáculo do Kraken, fades e fanfarra continuam pendentes. Nenhum arquivo externo é exigido e falhas permanecem opcionais.
