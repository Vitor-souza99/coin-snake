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

Cards mostram descrição, tema procedural, mecânica prevista, recompensas e requisitos inclusive quando bloqueados. Temas e conteúdo não implementados são previews e não entram em portais.