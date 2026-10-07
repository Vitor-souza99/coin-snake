# Roadmap a partir do master prompt

A instrução final pede implementar somente a próxima fase necessária, preservando o que funciona. A base disponível nesta conversa ainda não tinha joystick, turbo manual ou paisagem real; por isso esta entrega é a fase de controles, não o jogo completo do roadmap.

## Entregue — versão1.1
Controles, resize/rotação, look-ahead, turbo e Shrink Fruit, migração e configurações. Sistemas originais preservados.

## Implementação inicial — portais e mundos (protótipo)
Há catálogo `WorldDefinition`, sorteio de mundos desbloqueados por nível, portal de retorno e variação visual. Candy aplica slowdown global; Ocean aplica leve deriva. Sticky zones localizadas, testes de repetição e playtest ainda faltam.

## Implementação inicial — bosses e pets (protótipo)
Há BossEnergy separada do saldo, Boss Portal opcional com expiração de25s, King Snake/Candy Monster com três estados de fase, Boss Coins separadas, recompensas idempotentes, Bee e Candy Blob com um pet equipado. A luta usa coleta de moedas para dano. Telegraph, padrões, balanceamento e validação de jogo ainda são necessários.

## Implementação inicial — progressão (protótipo)
Coin Rush de60s, conquistas iniciais, contador de mastery e analytics local/no-op. Mastery não concede cosméticos; áudio por mundo, AdMob e compras reais continuam fora do escopo até playtesting e definição de público. Não implantar multiplayer, backend, conta ou lojas pagas nesta fase.

## Futuro Arena
Coin King: até8 jogadores, cinco minutos, líder com coroa, arena reduzindo e moedas parciais ao morrer. Servidor autoritativo com WebSocket; cliente sem autoridade sobre saldo/resultados. Colyseus/PostgreSQL/Redis/Supabase são opções futuras, nenhuma dependência instalada agora.
