# Áudio desta fase

AudioService mantém SFX programáticos, sem downloads de assets. Moedas têm alturas distintas e pequena variação; combo eleva o pitch. Foram adicionados turbo_start, turbo_end, loop discreto de turbo, shrink e shield_break. Loop para em pausa/morte/shutdown. musicVolume e sfxVolume persistem separadamente.

Não há trilha pronta. setMusic(url) permite adicionar arquivo original/licenciado em public/assets/audio. Falha de asset não interrompe o jogo e registra aviso somente em DEV. musicVolume e sfxVolume persistem separadamente. Candy Coin usa o tom sintetizado `candy_coin`; não há asset de tema/trilha Candy incluído.

Ocean possui SFX sintetizados `pearl_coin`, `bubble_pop`, `clam_open` e `current_flow` como IDs disponíveis; não há arquivos de música Ocean, Kraken ou loops ambientais. O tema oceânico, áudio espacial por distância, aviso/tentáculo do Kraken, fades e fanfarra continuam pendentes. Nenhum arquivo externo é exigido e falhas permanecem opcionais.
