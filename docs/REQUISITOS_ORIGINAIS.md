# COIN SNAKE — DESENVOLVIMENTO COMPLETO DO MVP

Quero que você atue como engenheiro de software sênior especializado em desenvolvimento de jogos mobile 2D.

Sua tarefa é CRIAR, e não apenas explicar, um jogo mobile funcional chamado **Coin Snake**.

Você tem autorização para:

- criar arquivos;
- criar pastas;
- instalar dependências npm;
- executar comandos;
- alterar configurações;
- criar testes;
- executar testes;
- corrigir erros encontrados;
- configurar o projeto Android;
- refatorar quando necessário;
- criar documentação.

Não fique apenas me mostrando exemplos de código.

Implemente diretamente no projeto.

Não me peça confirmação a cada etapa.

Quando houver uma decisão técnica pequena ou ambígua, escolha uma solução sensata, implemente e documente a decisão.

---

# 1. OBJETIVO DO PROJETO

Criar um jogo casual 2D para celular chamado:

**Coin Snake**

Conceito:

O jogador controla uma cobra em movimento contínuo.

O objetivo é:

- coletar moedas;
- aumentar a pontuação;
- crescer;
- criar combos;
- pegar moedas raras;
- utilizar power-ups;
- evitar obstáculos;
- bater recordes;
- completar missões;
- acumular moedas permanentes;
- desbloquear novas skins.

O jogo deve ser:

- fácil de aprender;
- divertido;
- visualmente alegre;
- adequado para público amplo;
- atraente também para crianças;
- jogável com uma mão;
- focado inicialmente em Android;
- preparado para futura monetização.

NÃO haverá recompensa em dinheiro real.

As moedas são exclusivamente moedas virtuais do jogo.

Nunca associe moedas do jogo a reais, dólares, Pix, criptomoedas ou qualquer recompensa financeira.

---

# 2. STACK OBRIGATÓRIA

Utilize:

- Phaser.js
- TypeScript
- Vite
- Capacitor
- Android
- npm

Não utilizar:

- React;
- Vue;
- Angular;
- Unity;
- Godot;
- frameworks UI desnecessários.

A aplicação deve ser essencialmente:

Phaser
+
TypeScript
+
Vite
↓
Capacitor
↓
Android

Utilize versões estáveis e compatíveis entre si.

Não utilize versões beta, alpha, RC ou nightly.

Verifique as versões atuais antes da instalação.

Use Node.js 22 ou superior.

---

# 3. CRIAÇÃO INICIAL DO PROJETO

Caso o diretório ainda não contenha um projeto adequado:

crie um projeto Vite com template:

vanilla-ts

Instale Phaser.

Configure TypeScript em modo strict.

Depois configure Capacitor.

Utilize:

App Name:

Coin Snake

App ID:

com.coinsnake.game

webDir:

dist

Adicione a plataforma Android.

Ao final deve existir:

android/

e deve ser possível executar:

npm run build

seguido de:

npx cap sync android

e:

npx cap open android

Não execute comandos destrutivos sem necessidade.

---

# 4. ESTRUTURA DO PROJETO

Organize o código aproximadamente desta maneira:

src/
├── main.ts
│
├── game/
│   ├── config.ts
│   │
│   ├── scenes/
│   │   ├── BootScene.ts
│   │   ├── MainMenuScene.ts
│   │   ├── GameScene.ts
│   │   ├── ShopScene.ts
│   │   ├── MissionsScene.ts
│   │   └── GameOverScene.ts
│   │
│   ├── entities/
│   │   ├── Snake.ts
│   │   ├── Coin.ts
│   │   ├── PowerUp.ts
│   │   └── Obstacle.ts
│   │
│   ├── systems/
│   │   ├── SaveSystem.ts
│   │   ├── EconomySystem.ts
│   │   ├── ComboSystem.ts
│   │   ├── MissionSystem.ts
│   │   ├── PowerUpSystem.ts
│   │   └── DifficultySystem.ts
│   │
│   ├── services/
│   │   ├── HapticsService.ts
│   │   ├── AudioService.ts
│   │   └── AdsService.ts
│   │
│   ├── data/
│   │   ├── balance.ts
│   │   ├── skins.ts
│   │   ├── missions.ts
│   │   └── powerups.ts
│   │
│   ├── ui/
│   │   ├── Button.ts
│   │   ├── HUD.ts
│   │   └── Modal.ts
│   │
│   ├── utils/
│   │   ├── math.ts
│   │   ├── random.ts
│   │   └── constants.ts
│   │
│   └── types/
│       └── game.ts
│
├── styles/
│   └── global.css
│
└── vite-env.d.ts

public/
└── assets/

tests/

docs/
├── GAME_DESIGN.md
├── ARCHITECTURE.md
└── IMPLEMENTATION_STATUS.md

Caso uma estrutura ligeiramente diferente seja tecnicamente melhor, você pode adaptá-la.

Mantenha separação clara entre:

gameplay,
dados,
interface,
persistência,
serviços nativos.

---

# 5. GAME RESOLUTION

O jogo deve funcionar prioritariamente em orientação:

PORTRAIT.

Utilize resolução lógica:

720 x 1280

Configure Phaser Scale Manager usando estratégia equivalente a:

FIT

e:

CENTER_BOTH.

A interface deve se adaptar a diferentes proporções de tela.

Considere:

- notch;
- status bar;
- navigation bar;
- safe areas.

Utilize CSS env() quando necessário.

O canvas deve preencher adequadamente dispositivos móveis sem distorcer a proporção.

---

# 6. GAMEPLAY DA COBRA

NÃO quero a movimentação clássica em grid.

Quero movimentação contínua e fluida.

A cobra se movimenta continuamente para frente.

Controles mobile:

O jogador toca ou arrasta o dedo indicando a direção desejada.

A cabeça deve girar progressivamente em direção ao toque.

Não deve haver mudanças instantâneas e bruscas de 180 graus.

Para desenvolvimento no computador também implemente:

- WASD;
- setas;
- mouse.

Utilize velocidade inicial aproximadamente:

230 unidades por segundo.

Utilize limite de velocidade de rotação para deixar a movimentação suave.

---

# 7. CORPO DA COBRA

A Snake deve começar com:

5 segmentos.

Não faça cada segmento simplesmente seguir diretamente o segmento anterior.

Crie um sistema baseado em histórico/trail da posição da cabeça.

A cabeça registra posições ao longo do caminho.

Cada segmento utiliza pontos anteriores desse histórico para manter distância aproximadamente uniforme.

Isso deve criar curvas suaves.

Ao coletar uma moeda:

a cobra cresce.

Adicionar:

1 segmento.

Defina um limite de segurança alto para evitar degradação exagerada de desempenho.

Exemplo:

180 segmentos.

Mesmo depois desse limite a coleta de moedas e pontuação deve continuar funcionando.

---

# 8. COLISÕES

A partida deve terminar quando a cabeça colidir com:

- parede da arena;
- obstáculo;
- parte válida do próprio corpo.

Evite detectar colisão com os primeiros segmentos imediatamente próximos à cabeça.

Quando Shield estiver ativo:

a primeira colisão fatal deve ser ignorada.

Depois:

Shield = false.

Adicione feedback visual indicando a quebra do escudo.

---

# 9. MOEDAS

Implemente quatro tipos.

NORMAL COIN

Valor:

1

Probabilidade aproximada:

75%

---

BLUE COIN

Valor:

5

Probabilidade:

18%

---

DIAMOND COIN

Valor:

20

Probabilidade:

6%

---

GOLDEN COIN

Valor:

50

Probabilidade:

1%

Centralize esses números em:

balance.ts

para facilitar balanceamento posterior.

Não espalhe magic numbers pelo código.

---

# 10. SPAWN DE MOEDAS

Moedas devem surgir em posições aleatórias válidas.

Nunca spawnar:

- dentro da cobra;
- dentro de obstáculo;
- muito próximo das bordas;
- em posição impossível de alcançar.

Depois que uma moeda for coletada:

gere outra.

Pode haver mais moedas simultaneamente conforme a dificuldade aumentar.

Utilize object pooling quando fizer sentido.

Evite criação e destruição excessiva de objetos por frame.

---

# 11. PONTUAÇÃO

Tenha duas variáveis separadas:

Score

e:

MatchCoins.

Score serve para recorde.

MatchCoins representa as moedas obtidas naquela partida.

Exemplo base:

Normal Coin:
+10 Score

Blue Coin:
+50 Score

Diamond:
+200 Score

Golden:
+500 Score

O combo poderá multiplicar Score.

MatchCoins deve receber o valor real da moeda:

1
5
20
50.

---

# 12. COMBO SYSTEM

Implemente combo.

Se o jogador pegar outra moeda dentro de aproximadamente:

2.5 segundos

o combo aumenta.

Exemplo:

x1
x2
x3
x4
x5

Limite inicialmente:

x5.

Se passar o tempo sem coletar moeda:

Combo volta para x1.

Mostre feedback:

COMBO x2

COMBO x3

COMBO x4

COMBO x5 🔥

Faça animações sutis e satisfatórias.

---

# 13. POWER-UPS

Implemente inicialmente:

MAGNET

Duração:

8 segundos.

Durante esse período moedas próximas são atraídas para a cabeça da Snake.

---

SHIELD

Protege contra uma colisão fatal.

Depois de utilizado:

desaparece.

---

TURBO

Duração:

5 segundos.

Durante Turbo:

- Snake fica mais rápida;
- Score recebido é multiplicado por 2;
- criar feedback visual.

Os power-ups devem surgir ocasionalmente no mapa.

Centralize:

- probabilidades;
- duração;
- intensidade;

em arquivos de configuração.

---

# 14. DIFICULDADE PROGRESSIVA

A dificuldade deve aumentar gradualmente conforme:

- tempo de partida;
- Score;
- tamanho da Snake.

A dificuldade pode alterar:

- velocidade da Snake;
- quantidade de obstáculos;
- frequência de moedas;
- padrões do mapa.

Evite dificuldade injusta.

Crie:

DifficultySystem.

O sistema precisa ser facilmente balanceável.

---

# 15. GAME OVER

Quando o jogador morrer:

transicione para:

GameOverScene.

Exiba:

GAME OVER

Score

Best Score

Coins collected

Combo máximo

Tempo sobrevivido

Missões atualizadas

Botões:

JOGAR NOVAMENTE

MENU

Implemente também o espaço visual para:

REVIVER

mas conecte inicialmente a um AdsService de desenvolvimento.

---

# 16. ADS SERVICE

Não instale SDK AdMob real nesta primeira implementação.

Crie uma abstração:

AdsService.

Interface conceitual:

showRewardedAd(reason)

isRewardedAdReady()

showInterstitial()

No ambiente de desenvolvimento:

showRewardedAd()

pode simular sucesso.

Precisaremos futuramente substituir a implementação pela integração real com anúncios.

Recompensas futuras possíveis:

- reviver uma vez;
- dobrar moedas da partida;
- abrir baú.

NUNCA utilizar anúncios para gerar:

- dinheiro real;
- saldo Pix;
- criptomoeda;
- vale-presente.

---

# 17. REVIVE

Implemente estrutura para:

1 revive por partida.

Quando morrer:

opção:

REVIVER

Se recompensa simulada do AdsService retornar sucesso:

- Snake reaparece;
- recebe aproximadamente 2 segundos de invencibilidade;
- obstáculos imediatamente próximos são afastados ou removidos;
- partida continua.

Não permitir segundo revive na mesma partida.

---

# 18. ECONOMIA

Quando a partida acabar:

MatchCoins

devem ser adicionadas a:

TotalCoins.

TotalCoins representa o saldo permanente do jogador.

Nunca utilizar TotalCoins como Score.

Persistir TotalCoins.

---

# 19. SISTEMA DE SAVE

Utilize:

@capacitor/preferences

ou solução oficial equivalente compatível com a versão escolhida do Capacitor.

Crie:

SaveSystem.

Persistir:

TotalCoins
BestScore
SelectedSkin
UnlockedSkins
XP
PlayerLevel
CompletedMissions
Settings
FirstLaunch
Statistics

O sistema deve funcionar também durante desenvolvimento no browser.

Trate dados corrompidos ou inexistentes utilizando valores padrão seguros.

Inclua:

save version.

Exemplo:

saveVersion: 1

Isso permitirá futuras migrations.

---

# 20. SKINS

Implemente inicialmente:

Classic Snake

Preço:

0

---

Cat Snake

Preço:

500

---

Robot Snake

Preço:

1000

---

Dino Snake

Preço:

2000

---

Dragon Snake

Preço:

5000

Cada skin deve ter aparência visual própria.

Por enquanto NÃO dependa de assets externos.

Crie os visuais usando Phaser Graphics / generateTexture ou SVGs originais simples.

A cabeça da Snake deve ser simpática.

Utilize:

- olhos;
- pequenas expressões;
- detalhes diferentes por skin.

O corpo deve combinar visualmente com a cabeça.

---

# 21. SHOP SCENE

Crie uma loja.

Mostrar:

saldo de moedas.

Cada skin deve ter:

preview
nome
preço
estado

Estados:

GRÁTIS

COMPRAR

SELECIONADA

USAR

BLOQUEADA

Ao comprar:

validar saldo.

Subtrair moedas.

Persistir desbloqueio.

Permitir selecionar qualquer skin adquirida.

---

# 22. MISSIONS

Crie MissionsScene.

Implemente inicialmente três missões ativas.

Exemplos:

Colete 100 moedas.

Faça 2.000 pontos em uma única partida.

Pegue 3 power-ups.

Outros tipos que a arquitetura deve permitir:

- sobreviver X segundos;
- atingir combo;
- coletar Golden Coin;
- usar Magnet;
- jogar X partidas.

Cada missão deve conter:

id
title
description
target
progress
reward
type

Missões recompensam:

TotalCoins.

O jogador precisa clicar:

COLETAR

para receber recompensa.

Evite entregar a mesma recompensa duas vezes.

---

# 23. MISSÕES DIÁRIAS

Prepare a arquitetura para missões diárias.

Para o MVP:

use data local.

Ao mudar o dia:

gere ou reinicie missões elegíveis.

Persista:

data da última geração.

Não é necessário backend nessa versão.

Documente que um usuário poderia alterar o relógio do aparelho e que um servidor seria necessário no futuro para segurança completa.

---

# 24. XP E LEVEL

Implemente:

XP

e:

PlayerLevel.

Ganhar XP por:

- partidas;
- Score;
- missões.

Não confundir:

XP,
Score,
Coins.

Exemplo:

Coins = economia

Score = desempenho na partida

XP = progressão da conta

Exiba uma barra simples de XP no MainMenu.

---

# 25. MAIN MENU

Crie MainMenuScene visualmente atraente.

Exibir:

COIN SNAKE

personagem Snake animado.

TotalCoins.

Player Level.

XP progress bar.

Best Score.

Botões grandes:

JOGAR

SKINS

MISSÕES

Configuração de som.

Utilize interface amigável para touch.

Evite texto excessivamente pequeno.

---

# 26. VISUAL

O estilo visual deve ser:

- cartunesco;
- alegre;
- limpo;
- colorido;
- amigável;
- moderno;
- casual mobile.

Referência conceitual:

jogos mobile casuais, sem copiar nenhum jogo específico.

Não copie:

- personagens;
- assets;
- logotipos;
- interfaces;
- nomes;

de jogos existentes.

Tudo deve ser original.

---

# 27. PRIMEIRO MAPA

Nome:

GREEN VALLEY

Visual:

- tons verdes;
- chão suave;
- pequenas decorações;
- pontos;
- folhas;
- pedras estilizadas.

Esses objetos decorativos não precisam ter colisão.

Obstáculos podem ser:

- pedras;
- troncos;
- arbustos especiais.

Não sobrecarregar visualmente.

Priorizar legibilidade.

---

# 28. EFEITOS

Adicione pequenos efeitos ao coletar moedas:

- scale;
- partículas;
- texto flutuante;
- pequeno flash;
- feedback visual.

Exemplo:

+1

+5

+20

+50

Para Golden Coin:

efeito mais especial.

Evite efeitos pesados.

O objetivo é manter 60 FPS em aparelhos intermediários.

---

# 29. HAPTIC FEEDBACK

Utilize:

@capacitor/haptics

quando executando nativamente.

Exemplos:

Coin:
impact leve.

Golden Coin:
impact maior.

Power-up:
feedback distinto.

Game Over:
feedback de erro.

No navegador:

o serviço deve falhar silenciosamente ou usar fallback.

Crie:

HapticsService.

Não espalhe chamadas diretas ao plugin pelo jogo.

---

# 30. ÁUDIO

Crie:

AudioService.

A arquitetura precisa suportar:

- SFX;
- música;
- mute;
- volume.

Caso não existam arquivos de áudio disponíveis:

não bloqueie o projeto.

Utilize implementação simples/fallback e documente onde os assets deverão ser inseridos posteriormente.

Configurações de áudio devem ser persistidas.

---

# 31. PAUSE

Durante GameScene:

adicionar botão pause.

Abrir modal:

PAUSADO

CONTINUAR

REINICIAR

MENU

Quando app Android for colocado em background:

pause automaticamente.

Quando retornar:

não retome instantaneamente de maneira perigosa.

Permita ao jogador continuar conscientemente.

---

# 32. PERFORMANCE

Priorize desempenho mobile.

Evite:

- criar objetos em todo update();
- arrays enormes recriados por frame;
- garbage collection excessiva;
- partículas ilimitadas;
- listeners duplicados;
- timers esquecidos;
- leaks ao trocar Scene.

Destrua listeners quando necessário.

Use pools onde fizer sentido.

Meta:

60 FPS em dispositivo Android intermediário.

---

# 33. TYPE SAFETY

TypeScript:

strict = true.

Evite:

any.

Utilize:

interfaces,
types,
enums somente quando fizer sentido.

Não crie abstrações desnecessariamente complicadas.

Código deve permanecer legível.

---

# 34. TESTES

Instale e configure:

Vitest

para testar principalmente lógica que não depende diretamente do renderer Phaser.

Crie testes para pelo menos:

EconomySystem

ComboSystem

Save data validation

Mission progression

Game balance utilities

Não force unit tests complexos para renderização Phaser.

O objetivo é testar regras de negócio.

---

# 35. QUALIDADE DE CÓDIGO

Configure:

ESLint

e TypeScript.

Scripts esperados:

npm run dev

npm run build

npm run preview

npm run typecheck

npm run test

npm run lint

Se algum script não fizer sentido, documente.

Antes de concluir:

todos devem executar sem erros.

---

# 36. RESPONSIVIDADE

Teste conceitualmente pelo menos:

360 x 640

390 x 844

412 x 915

720 x 1280

1080 x 1920

O layout não pode:

- cortar botões;
- esconder HUD;
- deformar o canvas;
- colocar elementos importantes sob notch.

---

# 37. ANDROID

Configure Capacitor Android corretamente.

Depois de:

npm run build

deve ser possível executar:

npx cap sync android

Configure orientação:

portrait.

Nome:

Coin Snake.

Package:

com.coinsnake.game

Não solicite permissões Android desnecessárias.

Mantenha AndroidManifest mínimo.

Use apenas permissões requeridas pelas funcionalidades existentes.

---

# 38. CICLO DE BUILD

Adicione scripts úteis ao package.json, se apropriado.

Exemplo conceitual:

android:sync

android:open

android:run

Um fluxo esperado deve ser:

npm run build

npm run android:sync

npm run android:open

Documente o processo no README.

---

# 39. FUTURA PLAY STORE

Prepare a arquitetura considerando futura publicação na Google Play.

Mas NÃO implemente ainda:

- pagamentos reais;
- login;
- backend;
- multiplayer;
- leaderboard online;
- AdMob real.

Crie pontos de extensão quando necessário.

---

# 40. FUTURO BACKEND

A arquitetura deverá permitir futuramente integrar:

Supabase.

Possíveis recursos:

- conta;
- cloud save;
- ranking;
- eventos;
- missões remotas;
- analytics;
- configuração remota.

Não instalar Supabase agora.

Evite acoplar regras principais a armazenamento local.

Use interfaces/services para permitir essa evolução.

---

# 41. FUTUROS MUNDOS

Não implemente ainda todos eles.

Documente a futura expansão:

Green Valley
Candy World
Ocean
Desert
Space
Cyber City

Somente Green Valley precisa funcionar no MVP.

---

# 42. ACESSIBILIDADE E CRIANÇAS

O jogo deve possuir:

- botões grandes;
- bom contraste;
- ícones acompanhados por texto quando importante;
- instruções simples;
- linguagem amigável.

Não utilize:

- dark patterns;
- contagem regressiva enganosa;
- falsa escassez;
- mecanismos que tentem enganar crianças;
- linguagem do tipo "você perdeu dinheiro";
- recompensa financeira.

A monetização futura deve ser separada do gameplay principal.

---

# 43. TELA DE TUTORIAL

Na primeira partida:

mostrar tutorial extremamente curto.

Exemplo:

"Arraste para mover"

"Pegue moedas"

"Evite obstáculos"

Máximo:

3 passos.

Depois começar a partida.

Salvar:

tutorialCompleted.

Não mostrar novamente, exceto caso futuramente exista opção para rever tutorial.

---

# 44. ESTATÍSTICAS

Salvar localmente:

TotalGames

TotalCoinsCollected

HighestScore

LongestSurvivalTime

HighestCombo

TotalPowerUpsCollected

Essas informações não precisam de uma tela própria no MVP.

Apenas implemente a estrutura.

---

# 45. GAME STATE

Evite variáveis globais soltas.

Crie modelos claros para:

RunState

PlayerProfile

Settings

GameStatistics

MissionProgress.

O estado de uma partida deve ficar separado do estado persistente do jogador.

---

# 46. BALANCE.TS

Centralize valores importantes.

Exemplos:

snake speed
rotation speed
segment spacing
combo timeout
combo maximum
coin probabilities
coin score
power-up duration
power-up spawn chance
difficulty progression
skin prices
XP values.

Quero conseguir balancear o jogo alterando principalmente um arquivo.

---

# 47. ASSETS

O MVP deve executar mesmo sem assets externos.

Crie gráficos simples programaticamente usando Phaser Graphics e generateTexture sempre que possível.

Exemplos:

Snake
Coins
Power-ups
Obstacles
Particles

Não baixe imagens aleatórias da internet.

Não utilize assets protegidos por copyright.

Deixe arquitetura preparada para substituir posteriormente:

public/assets/

---

# 48. README

Crie README.md profissional contendo:

## Coin Snake

Descrição.

Stack.

Requisitos.

Instalação.

Executar no navegador.

Build.

Android setup.

Android Studio.

Estrutura do projeto.

Scripts.

Arquitetura.

Como adicionar uma skin.

Como adicionar uma moeda.

Como adicionar power-up.

Como criar nova missão.

Como fazer build Android.

Próximos passos.

---

# 49. DOCUMENTAÇÃO

Crie:

docs/GAME_DESIGN.md

contendo:

conceito,
gameplay loop,
economia,
progressão,
power-ups,
skins,
missões.

Crie:

docs/ARCHITECTURE.md

explicando:

Scenes
Entities
Systems
Services
Save
Android/Capacitor.

Crie:

docs/IMPLEMENTATION_STATUS.md

com checklist:

[x] concluído

[ ] pendente.

Atualize esse documento durante a implementação.

---

# 50. GAMEPLAY LOOP

O ciclo principal deve ser:

Main Menu
↓
Play
↓
Control Snake
↓
Collect Coins
↓
Grow
↓
Build Combo
↓
Collect Power-ups
↓
Difficulty Increases
↓
Game Over
↓
Receive Coins / XP
↓
Complete Missions
↓
Buy / Unlock Skins
↓
Play Again

Esse loop é prioridade.

---

# 51. ORDEM DE IMPLEMENTAÇÃO

Implemente nesta ordem.

FASE 1

Project setup.

Phaser.

Vite.

TypeScript.

Base Scenes.

---

FASE 2

Snake movement.

Touch controls.

Body trail.

Growth.

---

FASE 3

Coins.

Score.

Combo.

---

FASE 4

Collision.

Obstacles.

Game Over.

---

FASE 5

Power-ups.

Difficulty.

Effects.

---

FASE 6

Save System.

Economy.

Best Score.

Statistics.

---

FASE 7

Main Menu.

Shop.

Skins.

---

FASE 8

Missions.

XP.

Level.

---

FASE 9

Capacitor.

Preferences.

Haptics.

Android.

---

FASE 10

Tests.

Lint.

Build.

Documentation.

---

# 52. MUITO IMPORTANTE — COMO VOCÊ DEVE TRABALHAR

Não gere centenas de linhas e assuma que funcionam.

Após cada grande fase:

1. compile;
2. execute typecheck;
3. execute os testes existentes;
4. corrija os erros;
5. só depois continue.

Se encontrar problema arquitetural:

corrija antes de continuar.

Não esconda erros com:

@ts-ignore

ou:

any.

Não desative regras apenas para fazer build passar.

Resolva a causa real.

---

# 53. GIT

Se a pasta ainda não estiver versionada:

inicialize Git.

Crie:

.gitignore.

Ignore:

node_modules
dist
arquivos temporários
arquivos de IDE quando apropriado
builds intermediários.

NÃO ignore o projeto Android gerado pelo Capacitor se a estratégia escolhida exigir versioná-lo.

Faça a estrutura ficar pronta para um repositório GitHub.

Não faça push para nenhum repositório sem autorização/configuração existente.

---

# 54. CRITÉRIOS DE ACEITAÇÃO

Antes de considerar a tarefa concluída, verifique:

[ ] projeto abre

[ ] npm install funciona

[ ] npm run dev funciona

[ ] Snake se movimenta

[ ] touch funciona

[ ] teclado funciona

[ ] Snake cresce

[ ] Coins funcionam

[ ] moedas especiais funcionam

[ ] Score funciona

[ ] Combo funciona

[ ] colisão funciona

[ ] Game Over funciona

[ ] Magnet funciona

[ ] Shield funciona

[ ] Turbo funciona

[ ] TotalCoins persiste

[ ] BestScore persiste

[ ] Shop funciona

[ ] skins podem ser compradas

[ ] skin selecionada persiste

[ ] Missions funcionam

[ ] recompensas das Missions funcionam

[ ] XP funciona

[ ] PlayerLevel funciona

[ ] tutorial funciona

[ ] pause funciona

[ ] save funciona

[ ] layout mobile funciona

[ ] npm run typecheck passa

[ ] npm run test passa

[ ] npm run lint passa

[ ] npm run build passa

[ ] Capacitor está configurado

[ ] android/ existe

[ ] npx cap sync android funciona

[ ] documentação existe

Não marque algo como concluído se não tiver sido realmente implementado.

---

# 55. RESULTADO FINAL

Quando terminar, me apresente um relatório curto contendo:

## Implementado

Liste o que funciona.

## Arquitetura

Explique resumidamente a estrutura criada.

## Testes

Informe quais comandos foram executados e os resultados.

## Android

Informe se:

npx cap sync android

funcionou.

## Como executar

Forneça exatamente os comandos:

npm install
npm run dev

e o processo Android.

## Pendências

Liste SOMENTE funcionalidades realmente ainda não implementadas.

## Próxima evolução recomendada

Indique os próximos passos, provavelmente:

1. substituir gráficos temporários por arte profissional;
2. sons e música;
3. playtesting;
4. analytics;
5. AdMob;
6. Supabase/ranking;
7. Play Store.

---

# 56. REGRA FINAL

Quero um MVP FUNCIONAL.

Não quero apenas:

- mockups;
- pseudocódigo;
- arquivos vazios;
- TODOs no lugar das mecânicas principais;
- explicações de como eu poderia implementar.

Implemente de fato.

Você pode utilizar placeholders visuais criados programaticamente, mas:

gameplay,
progressão,
save,
shop,
missions,
Android

devem estar funcionalmente implementados.

Comece analisando o diretório atual.

Em seguida apresente em poucas linhas o plano que seguirá e comece imediatamente a implementação.

Não pare depois do setup.

Continue até atingir os critérios de aceitação ou encontrar uma limitação concreta do ambiente que realmente impeça a continuação.