# Arquitetura 1.1

O Phaser continua como engine, com Scenes Boot, Menu, Game, Shop, Missions e GameOver; Settings é nova. A versão anterior tinha todos os elementos em coordenadas rígidas 720×1280. Para suportar paisagem real sem miniaturizar botões, a interface passou a HTML/CSS nativo por ScreenUI. Não há framework de UI. GameScene preserva simulação, colisões, pooling e sistemas de gameplay.

## Camadas
- Canvas: mundo, cobra, coins, obstacles, powers, fruta e partículas.
- ScreenUI: menus, HUD, modais e configurações; acompanha lifecycle SHUTDOWN.
- FloatingJoystick/TurboButton: Pointer Events com capture por ID, release/cancel e AbortController para limpeza.
- LayoutSystem: dimensões, orientação, centro e safe area. CSS usa insets só no contêiner externo.
- Câmera: zoom uniforme dependente da menor dimensão, lerp de look-ahead e limites de mundo. Nenhum resize reseta a run.

## Sistemas preservados
SaveStorage abstrai persistência, Preferences implementa browser/Android. Economy, Combo, Mission, PowerUp e Difficulty mantêm responsabilidades. A coleta emite coinCollected; a entidade Coin não chama serviços externos. GameScene trata score/economia/turbo/feedback no handler.

## Novas regras puras
TurboSystem centraliza energia, exaustão, recuperação e ativações. SteeringSystem suaviza o alvo, e Snake limita a taxa efetiva de rotação. ShrinkSystem calcula novo comprimento/cooldown; ShrinkFruit é uma entidade única reutilizável com timer de vida. Não participa do array de moedas, logo não é puxada pelo ímã.

## Save
Schema v2 mantém a mesma chave Preferences. Validação migra v1 sem redefinir saldo, desbloqueios e progresso. Estatísticas contam frutas e turbo ao finalizar uma run. Saves futuros bloqueiam writeback para não destruir dados desconhecidos. Hints são independentes do tutorial antigo, garantindo instrução do novo joystick a jogadores existentes.

## Áudio e ciclo de vida
Efeitos Web Audio com variação de pitch por moeda/combo; limite de vozes e loop discreto para turbo. Volumes de efeitos/música separados, sem música pronta. Pausa/morte/shutdown interrompem o loop. Ao voltar do background ou mudar orientação, a run aguarda ação explícita. Listener DOM, câmera e joystick são removidos no shutdown.

## Android
Mesmo ID, versão 1.1.0/code 2. fullUser respeita rotação definida pelo usuário. Nenhum ScreenOrientation.lock. Safe area é CSS; behavior real do WebView depende de validação em dispositivo. Java/Gradle/fontes nativos permanecem do Capacitor gerado.

Os helpers Phaser antigos Button/HUD/Modal/Theme ainda estão no fonte para referência; as Scenes de menu já usam ScreenUI. O texto flutuante da arena reutiliza Theme.text. Não há lógica duplicada de economia.
