# Design 1.1 — Próxima fase: controle

Objetivo: manter o loop de coletar/crescer/combos/skins/missões, com controles confortáveis nas duas orientações e progressão de mundos desbloqueável. Mundos premium permanecem como conteúdo futuro, sem compra real.

Progressão: Green Valley é o hub inicial. Candy World requer nível 5 e King Snake derrotado; Ocean World requer nível 10 e Candy Monster derrotado. Cada mundo de progressão exige também o mundo anterior desbloqueado. O jogador pode escolher qualquer mundo desbloqueado no menu; portais oferecem destinos elegíveis ponderados e o retorno leva a Green Valley. Ver `WORLDS.md` para catálogo, requisitos e previews.

O mundo Green Valley é uma arena com câmera móvel. A cobra se move a 230 unidades/s inicialmente; giro máximo 4,4 rad/s, interpolação exponencial do alvo, corpo por histórico espacial. Joystick usa raio 54px e dead zone 9px.

Candy World tem mapa pastel regional: Candy Plaza aberta, Lollipop Forest, Syrup Swamp, Gummy Garden, Chocolate River e praça visual do boss. Sticky Zones aplicam multiplicador 0,75 com recuperação exponencial (1,4 s); Turbo multiplica separadamente, portanto 230 × 1,4 × 0,75 = 241,5 antes de outros modificadores. Chocolate é terreno lento atravessável, com duas pontes largas de wafer; não há parede que force rota estreita. Candy Coin rara vale 25 MatchCoins/1000 pontos e usa a economia, combo e Magnet existentes.

Ocean World usa Coral Lagoon, Coral Reef, Current Channel, Bubble Garden, Deep Trench opcional e Kraken Arena. Correntes locais somam força vetorial (12/25/36 unidades/s para SOFT/STRONG/RAPID) ao movimento controlado pelo jogador; velocidade efetiva limitada a 350. Deep Trench dá +4% de chance de Blue/Diamond em reposição de Coins e bônus de Pearl, mantendo Golden rara. Pearl Coin vale 30 MatchCoins/1500 pontos, sem carteira separada. Kraken continua acessível exclusivamente pelo Boss Portal/BossSystem.

Turbo manual: 40% mais rápido, curvas 16% mais difíceis, barra 100, custo 24/s, regen 11/s após 0,6s. Esgotar exige soltar e recuperar 15. Recargas de moedas: 1,3,8,15. Power-up Turbo de 5s preserva score dobrado e energia; nunca dobra duas vezes velocidade.

Shrink Fruit surge após 20–35s quando comprimento >=8 e há posição livre próxima; vida 10s. Reduz 25%, mínimo cinco. Não gera/gasta Coins, score ou combo e não é magnetizável. Serve para aliviar o manejo de corpo comprido; não é punição.

Moedas: 1/5/20/50; pesos75/18/6/1, score10/50/200/500. Combo até ×5 com janela de2,5s. Arena maior usa18 moedas iniciais (cap30),8 obstáculos iniciais (cap16). Spawn exclui corpo/pedra/bordas/itens; pedras novas têm aviso visual.

Coleção de skins data-driven: Classic grátis, Cat500, Robot1000, Dino2000 e Dragon5000 Coins; os preços e IDs legados são preservados. Common/Rare e algumas Epic podem usar Coins. Ghost/Candy Dragon têm requisitos de gameplay planejados; skins Premium Legendary/Mythic são visíveis e podem ser pré-visualizadas, mas não compráveis nem equipáveis. Nenhuma skin dá bônus de gameplay. Detalhes e família Dragon estão em `SKINS.md`.

GameOver oferece revive uma vez apenas em DEV. Moedas são creditadas pelo delta; XP e estatísticas só ao concluir/reiniciar. Partida abandonada pelo pause é finalizada normalmente. Sem cloud save ou dinheiro real.

Playtesting: comparar joystick normal/canhoto, mortes após turbo, frutas utilizadas, conforto da câmera e vontade de repetir a partida. Os testes automáticos validam regras e fluxos; não comprovam diversão ou FPS real.
