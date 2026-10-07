# Design 1.1 — Próxima fase: controle

Objetivo desta versão: manter o loop atual de coletar/crescer/combos/skins/missões e tornar o movimento confortável nas duas orientações. Portais, mundos e bosses pertencem à sequência de desenvolvimento, não a este build.

O mundo Green Valley é uma arena com câmera móvel. A cobra se move a 230 unidades/s inicialmente; giro máximo 4,4 rad/s, interpolação exponencial do alvo, corpo por histórico espacial. Joystick usa raio 54px e dead zone 9px.

Turbo manual: 40% mais rápido, curvas 16% mais difíceis, barra 100, custo 24/s, regen 11/s após 0,6s. Esgotar exige soltar e recuperar 15. Recargas de moedas: 1,3,8,15. Power-up Turbo de 5s preserva score dobrado e energia; nunca dobra duas vezes velocidade.

Shrink Fruit surge após 20–35s quando comprimento >=8 e há posição livre próxima; vida 10s. Reduz 25%, mínimo cinco. Não gera/gasta Coins, score ou combo e não é magnetizável. Serve para aliviar o manejo de corpo comprido; não é punição.

Moedas: 1/5/20/50; pesos75/18/6/1, score10/50/200/500. Combo até ×5 com janela de2,5s. Arena maior usa18 moedas iniciais (cap30),8 obstáculos iniciais (cap16). Spawn exclui corpo/pedra/bordas/itens; pedras novas têm aviso visual.

Loja original: Classic0, Cat500, Robot1000, Dino2000, Dragon5000. Missões e XP permanecem acessíveis como no MVP, sem impor retroativamente novos bloqueios por nível. Benefícios futuros de pets não são simulados.

GameOver oferece revive uma vez apenas em DEV. Moedas são creditadas pelo delta; XP e estatísticas só ao concluir/reiniciar. Partida abandonada pelo pause é finalizada normalmente. Sem cloud save ou dinheiro real.

Playtesting: comparar joystick normal/canhoto, mortes após turbo, frutas utilizadas, conforto da câmera e vontade de repetir a partida. Os testes automáticos validam regras e fluxos; não comprovam diversão ou FPS real.
