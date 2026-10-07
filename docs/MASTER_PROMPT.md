# COIN SNAKE — MASTER DEVELOPMENT PROMPT

Você está trabalhando no projeto existente **Coin Snake**.

Stack obrigatória:

- Phaser.js
- TypeScript
- Vite
- Capacitor
- Android
- npm

O objetivo é desenvolver um jogo mobile casual 2D original, divertido, expansível e comercialmente viável.

IMPORTANTE:
Este projeto JÁ PODE conter diversas funcionalidades implementadas.

ANTES DE ALTERAR QUALQUER ARQUIVO:

1. analise toda a estrutura existente;
2. identifique o que já funciona;
3. leia README e documentação;
4. identifique Scenes, Entities, Systems e Services existentes;
5. preserve funcionalidades funcionando;
6. não recrie sistemas desnecessariamente;
7. não substitua uma arquitetura boa apenas para adequá-la a este prompt;
8. implemente somente o que ainda não existe ou o que precisa de melhoria;
9. faça alterações pequenas, modulares e testáveis.

Não quero apenas exemplos ou pseudocódigo.

Implemente diretamente no projeto.

==================================================
1. CONCEITO DO JOGO
==================================================

Nome:

COIN SNAKE

Conceito principal:

COLETE
↓
CRESÇA
↓
EXPLORE
↓
ENTRE EM PORTAIS
↓
ENFRENTE DESAFIOS
↓
DERROTE BOSSES
↓
GANHE RECOMPENSAS
↓
DESBLOQUEIE CONTEÚDO
↓
JOGUE NOVAMENTE

Coin Snake deve começar como um jogo casual simples, mas possuir profundidade suficiente para futuramente receber:

- novos mundos;
- bosses;
- coleção;
- pets;
- skins;
- modos diferentes;
- eventos;
- multiplayer Arena.

As moedas são exclusivamente virtuais.

NUNCA relacionar moedas do jogo com:

- dinheiro real;
- Pix;
- criptomoeda;
- prêmio financeiro.

==================================================
2. FILOSOFIA DE GAMEPLAY
==================================================

O jogo deve ser:

- fácil de entender;
- difícil de dominar;
- divertido em sessões curtas;
- agradável com uma mão;
- visualmente amigável;
- apropriado para público amplo;
- interessante também para crianças;
- recompensador sem ser agressivo.

O jogador deve constantemente tomar pequenas decisões:

"Pego essa moeda?"

"Uso Turbo agora?"

"Fico maior ou pego Shrink Fruit?"

"Entro nesse portal?"

"Estou preparado para enfrentar o boss?"

"Continuo coletando ou entro no Boss Portal?"

==================================================
3. GREEN VALLEY — HUB DA PARTIDA
==================================================

Green Valley deve ser o mundo central.

O jogador começa nele.

Durante a partida:

GREEN VALLEY
↓
portal aparece
↓
jogador entra
↓
outro mundo desbloqueado
↓
desafio naquele mundo
↓
portal de retorno
↓
GREEN VALLEY

Depois:

outro portal pode aparecer.

O Green Valley funciona como HUB dinâmico da run.

Não substituir essa mecânica.

==================================================
4. SISTEMA DE PORTAIS
==================================================

Criar/expandir:

PortalSystem.

Tipos previstos:

NORMAL_PORTAL
BOSS_PORTAL
GOLDEN_PORTAL
MYSTERY_PORTAL

No escopo atual:

NORMAL_PORTAL e BOSS_PORTAL devem funcionar.

NORMAL PORTAL:

leva aleatoriamente a um mundo já desbloqueado.

Evitar repetição excessiva do mesmo mundo.

Depois daquele trecho/desafio:

o jogador retorna ao Green Valley.

==================================================
5. BOSS ENERGY
==================================================

Criar:

BossEnergy.

As moedas coletadas durante a run alimentam a barra do boss.

Valores iniciais:

Normal Coin = +1
Blue Coin = +5
Diamond = +20
Golden Coin = +50

BossEnergy é separado de:

Score
MatchCoins
TotalCoins.

Moedas NÃO são gastas para abrir Boss Portal.

BossEnergy é apenas requisito.

==================================================
6. BOSS METER
==================================================

HUD:

BOSS PORTAL

███████░░░
350 / 500

Primeiro requisito:

500 BossEnergy.

Quando atingir:

BossPortalAvailable = true.

Mostrar:

BOSS PORTAL READY!

==================================================
7. BOSS PORTAL
==================================================

Após completar BossEnergy:

spawnar Boss Portal.

Características:

- aparência diferente de portal normal;
- dourado/vermelho;
- partículas;
- símbolo de coroa;
- som exclusivo;
- efeito pulsante.

O jogador NÃO é obrigado a entrar.

Pode:

- continuar coletando;
- procurar Shield;
- procurar Shrink Fruit;
- carregar Turbo;
- entrar quando quiser.

Portal permanece durante período razoável.

Exemplo:

25 segundos.

Se desaparecer:

não apagar injustamente toda progressão.

==================================================
8. ESCOLHA DE BOSS
==================================================

Boss disponível depende dos mundos desbloqueados.

Exemplo:

somente Green Valley:
King Snake.

Green Valley + Candy:
King Snake
Candy Monster.

Green Valley + Candy + Ocean:
King Snake
Candy Monster
Kraken.

Evitar repetir continuamente o mesmo boss.

Criar:

BossDefinition.

==================================================
9. BOSS SYSTEM
==================================================

BossDefinition deve permitir:

id
name
worldId
maxHealth
phases
movementSpeed
attackInterval
rewardCoins
rewardXP
petReward
visualConfig
musicId.

Não hardcode todos os bosses diretamente em GameScene.

==================================================
10. KING SNAKE
==================================================

Primeiro boss:

KING SNAKE.

Tema:

Green Valley.

Visual:

Snake grande com coroa.

HP inicial:

10.

Jogador NÃO ataca com armas.

A batalha continua baseada em:

movimento
+
coleta
+
desvio.

Durante luta:

Boss Coins aparecem.

Cada Boss Coin:

-1 HP.

Boss Coin:

- não é atraída pelo Magnet;
- não aumenta TotalCoins;
- não conta como Coin comum;
- possui visual especial.

==================================================
11. FASES DO KING SNAKE
==================================================

PHASE 1

HP 10–7.

- movimento lento;
- ataques simples;
- serve para ensinar.

PHASE 2

HP 6–4.

- movimento mais rápido;
- obstáculos temporários;
- padrões mais agressivos.

PHASE 3

HP 3–0.

- arena um pouco menor;
- mais intensidade;
- maior frequência de Boss Coins;
- efeitos visuais mais fortes.

A dificuldade deve permanecer justa.

==================================================
12. FUTUROS BOSSES
==================================================

Preparar arquitetura para:

Candy Monster
Kraken
Sand Serpent
Ice King
Alien Snake
Cyber Dragon
Lava Worm.

Implementar agora apenas bosses já necessários ao estado atual do projeto.

==================================================
13. RECOMPENSAS DE BOSS
==================================================

Bosses devem ser importantes para progressão.

Primeira vitória pode conceder:

- pet;
- acessório;
- Coins;
- XP.

Vitórias seguintes:

- Coins;
- XP;
- progressão;
- futuramente boss tokens.

==================================================
14. PET SYSTEM
==================================================

Criar:

PetSystem.

Somente 1 pet equipado por vez.

Pets:

- acompanham a Snake;
- não possuem colisão;
- são principalmente coleção;
- oferecem benefícios LEVES.

Não criar pay-to-win.

==================================================
15. PET 1 — BEE
==================================================

Nome:

Bee

Raridade:

RARE.

Desbloqueio:

primeira vitória contra King Snake.

Descrição:

"Uma pequena abelha aventureira que encontra moedas especiais."

Benefício:

+3 pontos percentuais na chance de Blue Coin.

Exemplo:

Normal:
75%

Blue:
18%

Diamond:
6%

Golden:
1%

Com Bee:

Normal:
72%

Blue:
21%

Diamond:
6%

Golden:
1%

Não alterar Diamond ou Golden.

==================================================
16. PET 2 — CANDY BLOB
==================================================

Nome:

Candy Blob.

Raridade:

RARE.

Desbloqueio:

primeira vitória contra Candy Monster.

Descrição:

"Um pequeno companheiro doce que ajuda você a evoluir."

Benefício:

+5% XP da run.

Exemplo:

baseXP = 200

finalXP = 210.

Aplicar somente ao XP da partida.

Não multiplicar Coins.

==================================================
17. VISUAL DOS PETS
==================================================

Bee:

- cartoon;
- amigável;
- pequena;
- asas;
- flutuação;
- animação suave.

Candy Blob:

- criatura gelatinosa;
- bounce;
- squash/stretch leve;
- amigável.

Pets devem seguir a Snake com interpolação suave.

Não usar física complexa.

==================================================
18. PET COLLECTION
==================================================

Criar coleção.

Mostrar pets bloqueados.

Exemplo:

BEE

🔒 Derrote King Snake.

CANDY BLOB

🔒 Derrote Candy Monster.

Estados:

LOCKED
UNLOCKED
EQUIPPED.

Permitir:

EQUIP
UNEQUIP.

==================================================
19. SNAKE MOVEMENT
==================================================

Movimento NÃO deve usar grid clássico.

Snake se movimenta continuamente.

Controles devem parecer suaves e naturais.

Separar:

baseSpeed
maxTurnSpeed
steeringSmoothness
turboMultiplier.

Não permitir virada instantânea absurda de 180°.

==================================================
20. FLOATING JOYSTICK
==================================================

Implementar joystick mobile flutuante.

Quando jogador toca na região de controle:

joystick aparece naquele local.

Ao arrastar:

define direção desejada.

Ao soltar:

desaparece suavemente.

Possuir:

- base;
- knob;
- dead zone;
- raio máximo;
- transparência.

==================================================
21. JOYSTICK SMOOTHING
==================================================

Joystick define:

desiredDirection.

Snake gira gradualmente usando:

angular interpolation
turn rate
steering smoothing.

Isso deve produzir curvas agradáveis.

==================================================
22. CONTROLE PARA CANHOTOS
==================================================

Configuração:

NORMAL

Joystick esquerda.
Turbo direita.

LEFT-HANDED

Joystick direita.
Turbo esquerda.

Persistir escolha.

==================================================
23. CONTROLES PC
==================================================

Manter:

WASD
Arrow Keys
Mouse.

Útil para desenvolvimento.

Evitar conflito entre input mobile e desktop.

==================================================
24. TURBO
==================================================

Adicionar botão:

⚡ TURBO.

Funciona enquanto pressionado.

Criar:

TurboMeter.

Valor:

0–100.

Turbo:

velocidade aproximadamente +40%.

Mas:

curvas ficam ligeiramente mais difíceis.

O jogador deve sentir risco/recompensa.

==================================================
25. TURBO ENERGY
==================================================

Turbo diminui enquanto pressionado.

Quando não utilizado:

regenera lentamente.

Coins também carregam Turbo.

Valores:

Normal Coin +1
Blue +3
Diamond +8
Golden +15.

Centralizar em config.

==================================================
26. TURBO FEEDBACK
==================================================

Durante Turbo:

- trail;
- partículas;
- leve feedback visual;
- SFX;
- haptic;
- câmera mostra mais área à frente.

Não exagerar.

==================================================
27. SHRINK FRUIT
==================================================

Criar item especial:

SHRINK FRUIT.

Visual:

fruta mágica claramente diferente de Coin.

Ao coletar:

reduzir aproximadamente:

25% dos segmentos atuais.

Exemplo:

20
↓
15.

Nunca deixar menos de:

5 segmentos.

==================================================
28. REGRAS DA SHRINK FRUIT
==================================================

Shrink Fruit:

- não conta como Coin;
- não aumenta Score;
- não aumenta Combo;
- não carrega Boss Energy;
- não pode ser puxada pelo Magnet;
- desaparece após aproximadamente 10 segundos;
- entra em cooldown depois.

Cooldown inicial:

20–35 segundos aleatórios.

O item deve ser uma escolha consciente.

==================================================
29. POR QUE SHRINK É ÚTIL
==================================================

Snake grande:

+ ocupa mais espaço;
- mais difícil de manobrar.

Snake pequena:

+ mais móvel;
+ melhor para áreas estreitas;
- menos presença física.

Shrinking é estratégia, não punição.

==================================================
30. COINS
==================================================

Manter tipos:

Normal
Blue
Diamond
Golden.

Valores econômicos:

Normal = 1
Blue = 5
Diamond = 20
Golden = 50.

Score separado de Coins.

==================================================
31. COMBO
==================================================

Se nova Coin for coletada dentro de aproximadamente:

2.5 segundos

aumentar Combo.

Máximo inicial:

x5.

Combo multiplica Score.

Não necessariamente MatchCoins.

Feedback:

COMBO x2
COMBO x3
COMBO x4
COMBO x5 🔥

==================================================
32. POWER-UPS
==================================================

Manter:

MAGNET
SHIELD
TURBO POWER-UP, caso exista.

MAGNET:

atrai Coins.

NÃO atrai:

Shrink Fruit
Boss Coin
Portal
Boss items.

SHIELD:

protege de 1 colisão fatal.

==================================================
33. CAMERA LOOK-AHEAD
==================================================

Snake não deve ficar sempre exatamente no centro.

Mostrar mais área na direção do movimento.

Durante Turbo:

aumentar suavemente o look-ahead.

Câmera deve permanecer confortável.

==================================================
34. MUNDOS
==================================================

Cada mundo precisa alterar gameplay.

Nunca criar apenas "novo background".

==================================================
35. GREEN VALLEY
==================================================

Mundo central.

Características:

- simples;
- bonito;
- acolhedor;
- aprendizagem;
- pedras;
- troncos;
- vegetação.

Boss:

King Snake.

==================================================
36. CANDY WORLD
==================================================

Características:

- doces;
- chocolate;
- pirulitos;
- visual alegre.

Mecânica:

STICKY ZONES.

Áreas reduzem temporariamente velocidade.

Nunca prender jogador de maneira injusta.

Boss:

Candy Monster.

Recompensa de primeira vitória:

Candy Blob.

==================================================
37. OCEAN WORLD
==================================================

Características:

- corais;
- bolhas;
- plantas;
- conchas.

Mecânica:

OCEAN CURRENTS.

Correntes aplicam força suave.

Jogador continua tendo controle.

Boss futuro:

Kraken.

==================================================
38. FUTUROS MUNDOS
==================================================

Arquitetura preparada para:

Desert
Ice World
Space
Cyber City
Volcano.

Mecânicas previstas:

Desert:
Sandstorm.

Ice:
Slippery steering.

Space:
Portals + meteors.

Cyber:
Lasers + moving obstacles.

Volcano:
Lava zones.

Não implementar todos antes de validar o jogo.

==================================================
39. COIN RUSH
==================================================

Preparar/implementar após gameplay principal estável.

Duração:

60 segundos.

Objetivo:

coletar máximo de Coins.

Mais Coins.

Mais combos.

Mais intensidade.

Nos últimos 10 segundos:

COIN FRENZY.

Colisão não causa Game Over.

Sugestão:

-3 segundos
+
reset Combo.

==================================================
40. ENDLESS MODE
==================================================

Modo principal.

Objetivo:

sobreviver.

Dificuldade aumenta gradualmente.

Recorde individual.

==================================================
41. SNAKE COLLECTION
==================================================

Criar pequena coleção para MVP.

COMMON:

Classic Snake
Cat Snake

RARE:

Robot Snake
Dino Snake

EPIC:

Dragon Snake
Ghost Snake

LEGENDARY:

Rainbow Snake

MYTHIC:

Void Serpent.

==================================================
42. RARIDADE
==================================================

Raridade deve ser principalmente visual.

COMMON:
visual simples.

RARE:
detalhes adicionais.

EPIC:
efeitos/trails.

LEGENDARY:
animações especiais.

MYTHIC:
efeito visual muito marcante.

Não aumentar drasticamente poder.

==================================================
43. SHOP
==================================================

Loja inicial usa:

TotalCoins.

Permitir:

comprar skins
selecionar skins.

Não implementar dinheiro real nesta fase.

Cada card:

- preview;
- nome;
- rarity;
- price;
- status.

Estados:

BUY
EQUIP
EQUIPPED
LOCKED.

==================================================
44. SNAKE MASTERY
==================================================

Preparar arquitetura.

Cada Snake pode ganhar Mastery XP ao ser usada.

Exemplo futuro:

Dragon Lv1
↓
Lv3 detalhe visual
↓
Lv5 Fire Trail
↓
Lv10 evolução
↓
Lv20 Ancient Dragon.

Para MVP:

pode implementar estrutura básica.

Não criar sistema excessivamente complexo.

==================================================
45. PLAYER LEVEL
==================================================

Separar:

Score
Coins
XP
PlayerLevel
SnakeMastery.

Exemplo de desbloqueios:

Level 1:
Green Valley.

Level 3:
Missions.

Level 5:
Candy World.

Level 7:
Coin Rush.

Level 10:
Ocean.

Outros mundos futuramente.

Centralizar progressão em config.

==================================================
46. MISSIONS
==================================================

Missões iniciais:

Colete 100 Coins.

Faça 2.000 Score.

Pegue 3 Power-ups.

Tipos futuros:

survive
combo
goldenCoin
bossDefeat
portalUse
turboUse
shrinkFruitUse.

==================================================
47. ACHIEVEMENTS
==================================================

Preparar arquitetura.

Exemplos:

FIRST RUN

COIN HUNTER

COMBO MASTER

BOSS HUNTER

PET COLLECTOR

WORLD TRAVELER.

Implementar depois que loop principal estiver estável.

==================================================
48. ÁUDIO
==================================================

Criar:

AudioService.

Separar:

musicVolume
sfxVolume
muted.

Persistir.

==================================================
49. SFX IMPORTANTES
==================================================

Criar suporte para:

coin_normal
coin_blue
coin_diamond
coin_golden
combo
turbo_start
turbo_loop
turbo_end
shrink
magnet
shield
shield_break
portal_open
portal_enter
boss_portal_spawn
boss_portal_enter
boss_hit
boss_phase
boss_defeat
ui_click
ui_confirm
ui_error
pet_bee
pet_blob.

==================================================
50. VARIAÇÃO DE COIN SOUND
==================================================

Coins comuns devem ter pequena variação de pitch.

Evitar som idêntico repetido centenas de vezes.

Combo deve subir sonoramente.

==================================================
51. MÚSICA
==================================================

Preparar:

green_valley_theme
candy_world_theme
ocean_theme
boss_theme.

Quando entrar em portal:

fade da música anterior.

Ao boss:

boss theme.

Ao vencer:

victory fanfare.

==================================================
52. PET AUDIO
==================================================

Bee:

pequeno buzz ocasional.

Candy Blob:

blop/bounce.

Não tocar constantemente.

==================================================
53. AUDIO FALLBACK
==================================================

Caso asset não exista:

não quebrar jogo.

Warning apenas em DEV.

==================================================
54. HAPTICS
==================================================

Usar HapticsService quando disponível.

Exemplos:

Coin:
leve.

Golden:
médio.

Turbo:
pulso.

Boss Portal:
impacto.

Boss defeat:
success.

Não exagerar.

==================================================
55. RESPONSIVIDADE
==================================================

Jogo precisa funcionar em:

portrait
landscape.

Não travar orientação.

==================================================
56. PHASER SCALE
==================================================

Preferir arquitetura responsiva.

Avaliar:

Phaser.Scale.RESIZE

ou solução equivalente apropriada ao projeto.

Canvas deve acompanhar viewport.

Não usar apenas um canvas 720x1280 reduzido em landscape.

==================================================
57. RESPONSIVE LAYOUT SYSTEM
==================================================

Criar sistema central para:

screenWidth
screenHeight
orientation
isPortrait
isLandscape
safeArea
centerX
centerY.

Scenes devem responder a resize.

==================================================
58. PORTRAIT
==================================================

Portrait:

layout vertical.

Gameplay:

joystick inferior esquerdo
Turbo inferior direito
HUD superior.

==================================================
59. LANDSCAPE
==================================================

Landscape:

layout real horizontal.

Não simplesmente mostrar UI portrait estreita no centro.

Gameplay deve aproveitar largura.

Menu pode usar duas colunas.

==================================================
60. ANDROID ORIENTATION
==================================================

Não bloquear:

screenOrientation="portrait".

Remover qualquer:

ScreenOrientation.lock('portrait')

ou equivalente.

Respeitar rotação do Android.

==================================================
61. SAFE AREA
==================================================

Canvas pode ocupar tela.

HUD e controles devem respeitar:

safe-area-inset-top
bottom
left
right.

Evitar aplicar safe-area duas vezes.

==================================================
62. SAVE SYSTEM
==================================================

Persistir:

TotalCoins
BestScore
XP
PlayerLevel
SelectedSkin
UnlockedSkins
SelectedPet
UnlockedPets
BossesDefeated
FirstBossDefeated
Statistics
Settings
AudioSettings
ControlPreference
TutorialCompleted.

Usar:

saveVersion.

Implementar migrations.

Nunca quebrar saves antigos.

==================================================
63. STATISTICS
==================================================

Salvar:

TotalGames
TotalCoinsCollected
HighestScore
HighestCombo
LongestRun
BossesDefeated
PortalsUsed
ShrinkFruitsCollected
TurboUses.

==================================================
64. TUTORIAL
==================================================

Primeira partida:

"Use o joystick para mover."

"Pegue moedas."

"Evite obstáculos."

Quando Turbo aparecer:

"Segure para acelerar."

Primeira Shrink Fruit:

"Esta fruta reduz seu tamanho."

Primeiro Boss Portal:

"Entre para enfrentar um Boss."

Mostrar cada ajuda apenas uma vez.

==================================================
65. PERFORMANCE
==================================================

Meta:

60 FPS em Android intermediário.

Evitar:

- criação de objetos por frame;
- arrays temporários excessivos;
- partículas ilimitadas;
- listeners duplicados;
- física desnecessária;
- timers esquecidos;
- memory leaks.

Utilizar pooling quando adequado.

==================================================
66. OBJECT POOLING
==================================================

Considerar pooling para:

Coins
Particles
Shrink Fruits
Boss Coins
Power-ups.

==================================================
67. TYPE SAFETY
==================================================

TypeScript:

strict = true.

Evitar:

any
@ts-ignore.

Resolver causas reais.

==================================================
68. CONFIGURAÇÃO CENTRAL
==================================================

Valores de balanceamento devem ficar em configs.

Exemplo:

movement.ts
coins.ts
turbo.ts
items.ts
worlds.ts
bosses.ts
pets.ts
skins.ts
progression.ts
audio.ts
portals.ts.

Evitar magic numbers.

==================================================
69. EVENT ARCHITECTURE
==================================================

Evitar acoplamento.

Exemplo:

CoinCollected
↓
EconomySystem
TurboSystem
BossSystem
MissionSystem
AudioSystem.

Não fazer Coin chamar manualmente vários sistemas.

Utilizar EventEmitter ou solução existente adequada.

==================================================
70. DEBUG MENU
==================================================

Somente:

import.meta.env.DEV.

Permitir:

Add Coins
Add XP
Fill Turbo
Set Snake Size
Spawn Shrink Fruit
Fill BossEnergy
Spawn Boss Portal
Start King Snake
Damage Boss
Unlock Bee
Unlock Candy Blob
Unlock World.

Nunca produção.

==================================================
71. TESTES
==================================================

Usar Vitest para regras de negócio.

Testar:

Economy
Combo
Turbo
Shrink
BossEnergy
Boss unlock
Boss phases
Boss rewards
Pet unlock
Pet modifiers
World unlock
XP
Save migration.

Não criar testes frágeis para renderização.

==================================================
72. QUALITY COMMANDS
==================================================

Manter scripts:

npm run dev
npm run build
npm run typecheck
npm run lint
npm run test.

Após cada fase:

typecheck
test
lint
build.

Não continuar com erro.

==================================================
73. CAPACITOR
==================================================

App:

Coin Snake.

Package:

com.coinsnake.game.

webDir:

dist.

Android precisa continuar funcionando após:

npm run build
npx cap sync android.

==================================================
74. MONETIZAÇÃO — APENAS ARQUITETURA
==================================================

Não implementar compras reais agora.

Deixar preparado para futuro:

AdsService
PurchaseService.

Monetização futura possível:

- anúncios;
- remover anúncios;
- skins premium;
- Legendary/Mythic;
- trails;
- acessórios;
- world packs;
- passes futuramente.

Não criar vantagens competitivas fortes pagas.

==================================================
75. FUTUROS PREMIUM COSMETICS
==================================================

Possíveis conteúdos:

Legendary Snake
Mythic Snake
Trails
Hats
Victory Effects
Pet cosmetics.

Dinheiro real deve comprar principalmente:

estilo
conteúdo
conveniência.

Não vitória.

==================================================
76. FUTURO MULTIPLAYER
==================================================

NÃO implementar multiplayer nesta fase.

Mas evitar arquitetura que torne impossível adicionar depois.

Planejamento futuro:

COIN SNAKE ARENA.

Possíveis modos:

Coin King
Last Snake Standing
Boss Raid
Team Battle.

==================================================
77. COIN KING FUTURO
==================================================

Ideia:

8 jogadores.

5 minutos.

Objetivo:

mais Coins ao final.

Ao morrer:

parte das Coins cai no mapa.

Líder recebe coroa visual.

Arena diminui com o tempo.

NÃO implementar agora.

Documentar para futuro.

==================================================
78. ONLINE ARCHITECTURE FUTURA
==================================================

Futuramente:

Phaser Client
↓
WebSocket
↓
Authoritative Server
↓
Node/TypeScript
↓
Colyseus
↓
PostgreSQL/Redis/Supabase.

Cliente nunca deve ser autoridade sobre:

kills
Coins
Boss
resultado.

Não instalar isso agora.

==================================================
79. ANALYTICS
==================================================

Criar apenas abstração:

AnalyticsService.

No MVP:

Noop ou console DEV.

Eventos importantes:

gameStarted
gameEnded
coinCollected
portalEntered
shrinkCollected
turboActivated
bossPortalEntered
bossDefeated
petUnlocked
skinPurchased.

==================================================
80. MVP ATUAL
==================================================

Prioridade atual:

1. movimento excelente;
2. responsividade/orientação;
3. Coins;
4. Combo;
5. Turbo;
6. Shrink Fruit;
7. Green Valley Hub;
8. Portal System;
9. Candy World;
10. Ocean;
11. Boss Meter;
12. Boss Portal;
13. King Snake;
14. Candy Monster quando Candy World estiver pronto;
15. Bee;
16. Candy Blob;
17. pequena loja de skins;
18. áudio;
19. save;
20. testes.

==================================================
81. NÃO EXPANDIR DEMAIS O MVP
==================================================

Não implementar agora:

- 20 mundos;
- 50 pets;
- multiplayer;
- temporadas;
- battle pass;
- backend;
- login;
- cloud save;
- gacha;
- loot box paga;
- NFT;
- criptomoeda.

Primeiro validar diversão.

==================================================
82. PÓS-MVP
==================================================

Somente depois de teste real:

Coin Rush
Achievements
Snake Mastery expandida
mais mundos
Kraken
novos pets
trails
accessories
events
analytics real
AdMob.

==================================================
83. VALIDAÇÃO DO MVP
==================================================

O jogo precisa responder:

"Jogadores querem fazer outra partida?"

Observar futuramente:

session duration
runs per session
restart rate
portal usage
boss attempts
boss completion
skin purchases com Coins
pet unlock engagement.

==================================================
84. GAME FEEL
==================================================

Prioridade absoluta:

controle gostoso.

Se necessário escolher entre:

mais features

ou

movimentação melhor

escolha movimentação.

Feedback importante:

visual
audio
haptics
particles
animation.

==================================================
85. UI
==================================================

Interface:

- limpa;
- grande;
- amigável;
- touch-friendly;
- poucos elementos simultâneos.

Gameplay HUD:

Score
Coins
Combo
Turbo
Boss Meter.

Em Boss Fight:

Boss HP substitui Boss Meter.

==================================================
86. ARQUITETURA SUGERIDA
==================================================

Não precisa seguir exatamente se projeto atual já tiver boa arquitetura.

Estrutura conceitual:

src/game/

scenes/
BootScene
MainMenuScene
GameScene
ShopScene
PetsScene
MissionsScene
BossScene
GameOverScene
WorldSelectScene

entities/
Snake
Coin
ShrinkFruit
PowerUp
Boss
KingSnake
Pet

systems/
EconomySystem
ComboSystem
TurboSystem
PortalSystem
BossSystem
PetSystem
WorldSystem
MissionSystem
SaveSystem
DifficultySystem

services/
AudioService
HapticsService
AdsService
AnalyticsService

ui/
FloatingJoystick
TurboButton
HUD
BossMeter
BossHealthBar
Modal

data/
movement
coins
turbo
items
worlds
bosses
pets
skins
progression
audio.

==================================================
87. DOCUMENTAÇÃO
==================================================

Manter:

README.md
GAME_DESIGN.md
ARCHITECTURE.md
IMPLEMENTATION_STATUS.md.

Criar se necessário:

WORLDS.md
BOSSES.md
PETS.md
CONTROLS.md
AUDIO_ASSETS.md
ROADMAP.md.

==================================================
88. ROADMAP
==================================================

v0.1
Core Snake.

v0.2
Coins / Combo / Turbo.

v0.3
Portals / Green Valley Hub / Shrink.

v0.4
Boss Portal / King Snake / Bee.

v0.5
Candy World / Candy Monster / Candy Blob.

MVP TEST.

Depois:

v0.6
Ocean / Coin Rush.

v0.7
Achievements / Mastery / more cosmetics.

v1.0
Play Store / Ads / premium cosmetics.

v2.0
Coin Snake Arena Beta.

==================================================
89. CRITÉRIOS DE ACEITAÇÃO
==================================================

Não considerar funcionalidade pronta apenas porque existe placeholder.

Ao final do escopo atual, verificar:

[ ] Snake possui controle suave.
[ ] Floating Joystick funciona.
[ ] Turbo funciona.
[ ] Turbo Meter funciona.
[ ] Coins recarregam Turbo.
[ ] Shrink Fruit funciona.
[ ] Magnet ignora Shrink Fruit.
[ ] Green Valley funciona como Hub.
[ ] Portais normais funcionam.
[ ] Mundos desbloqueados podem ser sorteados.
[ ] Retorno ao Green Valley funciona.
[ ] BossEnergy funciona.
[ ] BossMeter funciona.
[ ] Boss Portal funciona.
[ ] King Snake funciona.
[ ] Boss possui fases.
[ ] Boss Coins funcionam.
[ ] Bee é recompensa do King Snake.
[ ] Bee modifica Blue Coin corretamente.
[ ] Candy Blob está preparado ou implementado conforme Candy Monster.
[ ] Pets podem ser equipados.
[ ] Loja de skins funciona.
[ ] Save funciona.
[ ] AudioService funciona.
[ ] Portrait funciona.
[ ] Landscape funciona.
[ ] Android gira corretamente.
[ ] Safe area funciona.
[ ] typecheck passa.
[ ] tests passam.
[ ] lint passa.
[ ] build passa.
[ ] npx cap sync android funciona.

==================================================
90. COMO VOCÊ DEVE TRABALHAR
==================================================

Não implemente tudo de uma vez.

Primeiro:

analise o estado atual.

Depois informe brevemente:

IMPLEMENTADO ATUALMENTE
FALTANDO
PROBLEMAS IDENTIFICADOS
PRÓXIMA FASE

Depois comece a implementação.

Trabalhe em fases.

Após cada fase:

1. executar typecheck;
2. executar testes;
3. executar lint;
4. executar build;
5. corrigir problemas;
6. atualizar IMPLEMENTATION_STATUS.md.

Nunca destruir uma funcionalidade existente silenciosamente.

Se uma implementação existente for incompatível:

explique tecnicamente antes de refatorar.

==================================================
91. PRINCÍPIO FINAL
==================================================

Não quero transformar Coin Snake em um jogo enorme sem foco.

O núcleo precisa ser:

DIVERTIDO
↓
SATISFATÓRIO
↓
FÁCIL DE ENTENDER
↓
COM DECISÕES INTERESSANTES
↓
COM MOTIVO PARA JOGAR NOVAMENTE.

Novos sistemas só devem existir se ajudarem um desses pontos.

A identidade principal do Coin Snake deve ser:

"Uma Snake que coleta, cresce, atravessa portais, explora mundos e enfrenta bosses para desbloquear novas recompensas."

Comece analisando o projeto atual e implemente somente a próxima fase necessária, preservando tudo que já estiver funcionando.