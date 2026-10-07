# Progressão de mundos

| Mundo | Tipo | Requisitos | Estado |
|---|---|---|---|
| Green Valley | Inicial | Nenhum | Implementado e sempre disponível |
| Candy World | Progressão | Nível 5, derrotar King Snake e visitar Green Valley | Implementado |
| Ocean World | Progressão | Nível 10, derrotar Candy Monster e desbloquear Candy World | Implementado |
| Desert, Ice World, Space | Gratuito futuro | Níveis 15, 20 e 25 | Prévia; gameplay futuro |
| Dragon Kingdom, Haunted Realm, Prehistoric World | Premium futuro | Sem requisitos públicos de compra | Prévia bloqueada; sem compra real |

Os portais de viagem usam sorteio ponderado apenas entre mundos implementados e desbloqueados. Fora de Green Valley, o portal de retorno permanece direcionado ao hub. A seleção manual inicia uma partida no mundo escolhido. Premium não é desbloqueável por nível, save local ou moeda virtual.

O save v5 preserva os IDs legados `green-valley`, `candy-world` e `ocean`, normaliza aliases com underscore e adiciona `selectedWorld`. Saves v1–v4 continuam aceitos; Ocean legado implica Candy desbloqueado para manter a progressão coerente, e o mundo selecionado inválido retorna a Green Valley.

## Candy World

O mapa mantém estrutura reconhecível entre partidas e conteúdo variável. A **Candy Plaza** central é aberta e segura para orientação; a **Lollipop Forest** usa pirulitos de três tamanhos como obstáculos; o **Syrup Swamp** contém Sticky Zones, que reduzem velocidade para 0,75 e recuperam suavemente ao sair. A **Gummy Garden** possui poucos Gummies previsíveis que saltam lentamente e usam a colisão normal de obstáculos (Shield continua válido).

O **Chocolate River** é terreno atravessável com desaceleração; não é uma parede sólida. Duas Wafer Bridges largas cruzam o trecho e evitam obrigar a cobra grande a atravessar hazard. A **Candy Boss Arena** é uma praça visual, sem iniciar chefe automaticamente: Candy Monster continua acessível apenas pelo sistema de portal/chefe e Boss Energy existente.

Uma oportunidade rara de **Candy Coin** pode aparecer após intervalo longo: vale 25 MatchCoins e 1000 pontos, participa do combo e do ímã, sem carteira nova. Shrink Fruit mantém as regras globais e pode ocasionalmente surgir perto de uma área opcional/arena. Rotas abertas contornam obstáculos; geometria regional é ancorada às dimensões da arena para portrait, landscape e câmera panorâmica.

## Ocean World

O layout relativo separa **Coral Lagoon** (chegada ampla e calma), **Coral Reef** (corais com hitbox circular previsível), **Current Channel**, **Bubble Garden**, **Deep Trench** opcional e **Kraken Arena** em ruínas. O portal de retorno e a câmera global continuam funcionando; o portal de chefe continua sendo a única entrada para Kraken e aparece na arena temática.

As zonas locais aplicam corrente aditiva ao vetor de movimento, mantendo steering normal: SOFT 12, STRONG 25 e RAPID 36 unidades/s, com clamp final de 350. A geometria é relativa à arena, e o spawn inicial não recebe corrente STRONG/RAPID. Corrente não é dano nem consome Shield.

Bolhas decorativas não colidem; Bonus Bubbles são limitadas a três e podem dar 1–3 MatchCoins, pequena carga de Turbo e raramente uma Blue Coin. Na Deep Trench, a chance extra de Blue/Diamond nas Coins repostas é 4%; Pearl recebe chance adicional de 3,5 pontos percentuais. Golden não é promovida nem se torna comum.

**Pearl Coin** (ID `pearl_coin`) é exclusiva do Ocean, vale 30 MatchCoins e 1500 pontos e usa o saldo normal da partida. É rara (8% por tentativa, cooldown de 42 s) e pode sair de uma concha que abre por proximidade ou timer. O Kraken continua no BossSystem e recompensa Baby Octopus (EPIC); o bônus futuro de +5% Magnet Duration permanece metadata já existente, sem novo PetSystem.

Cards mostram descrição, tema procedural, mecânica prevista, recompensas e requisitos inclusive quando bloqueados. Temas e conteúdo não implementados são previews e não entram em portais.