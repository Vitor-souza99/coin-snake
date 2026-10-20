# Coin Snake 1.1

Jogo casual de cobra com movimento contínuo em Green Valley. Esta entrega executa a **próxima fase necessária** solicitada no master prompt: controles, turbo, Shrink Fruit e responsividade. O roadmap de portais/bosses/pets foi preservado para fases seguintes. Moedas exclusivamente virtuais.

## Executar

Node.js 22.12+ e npm. Na pasta que contém package.json:

```bash
npm install
npm run dev
```

Abra o endereço exibido, geralmente http://127.0.0.1:5173. Mantenha o terminal aberto. No Windows, `INICIAR_WINDOWS.bat` verifica Node/npm, instala dependências se necessário e inicia o servidor. Não abra index.html diretamente. `npm ci` reproduz as dependências do lockfile.

## Controles

| Entrada | Ação |
|---|---|
| Arrastar na área inferior do joystick | Define direção; aparece onde o dedo toca |
| Soltar joystick | Cobra mantém a direção atual |
| Segurar Turbo | Acelera em 40% enquanto houver energia |
| WASD / setas | Direção no computador |
| Shift | Turbo no computador |
| Clique e arraste na arena | Mira por mouse |
| Escape / espaço / botão Pausa | Pausa e retomada manual |

Em Ajustar controles e som, ative modo canhoto para inverter os controles, ajuste o volume de efeitos, mute/vibração e redução de efeitos. A rotação durante a run **pausa** o jogo e mantém a partida, evitando colisões enquanto você reposiciona os dedos. A área do joystick usa um dedo; Turbo aceita outro simultaneamente.

## Mecânicas

- Quatro moedas: 1/5/20/50; score base 10/50/200/500.
- Combo até ×5 em 2,5 segundos; multiplica apenas score.
- Turbo manual: 100 de capacidade, consumo 24/s, regeneração 11/s após 0,6s; ao esgotar, solte o botão e recupere ao menos 15 para voltar. Moedas carregam 1/3/8/15. Curvas ficam 16% mais lentas. **Não dobra score.**
- O power-up Turbo existente continua por 5s, dobra score e não gasta a barra. A velocidade não acumula dois bônus.
- Shrink Fruit roxa: −25% de segmentos, arredondado para baixo, mínimo 5. Não dá moedas, score ou combo; Magnet não a atrai. Dura 10s. Após coleta/expiração, cooldown aleatório de 20–35s; só surge com pelo menos oito segmentos.
- Magnet e Shield preservados. Escudo absorve uma colisão e oferece proteção breve.
- Arena Green Valley ampliada para acompanhar a câmera. O número inicial de moedas e pedras foi ajustado para a área maior.
- Cinco skins, três missões diárias, XP, níveis, recorde e estatísticas persistentes.

## Comandos

| Comando | Uso |
|---|---|
| `npm run dev` | Desenvolvimento |
| `npm run build` | Verificar tipos e gerar dist/ |
| `npm run preview` | Servir build local |
| `npm run typecheck` | Verificar TypeScript strict |
| `npm run lint` | ESLint |
| `npm run test` | Testes automatizados de regras |
| `npm run test:browser` | Smoke test com servidor dev ativo |
| `npm run android:sync` | Build + cap sync android |
| `npm run android:open` | Abrir Android Studio |
| `npm run android:run` | Build + executar Android configurado |

Para testar pela rede: `npm run dev -- --host 0.0.0.0`. O acesso depende da rede/firewall. No browser, o save pertence à origem (endereço e porta).

## Android e APK

Capacitor 8.5.2, pacote `com.coinsnake.game`, SDK alvo/compilação 36, min SDK 24. Projeto Android incluído; versionCode 2 e versionName 1.1.0.

```bash
npm install
npm run android:sync
npm run android:open
```

Instale Android Studio 2025.2.1+ compatível com Capacitor 8, SDK 36 e o JDK indicado pelo Android Studio. Aguarde Gradle. Para APK de teste, selecione a variante debug e use Build → Generate/Build APK(s). Saída habitual: `android/app/build/outputs/apk/debug/app-debug.apk`. Para a Play Store, gere AAB assinado.

Para atualizar mantendo progresso, use mesmo ID e assinatura do app anterior. Não desinstale nem limpe dados. Preserve sua chave de assinatura e configurações locais. Não há chave privada no ZIP.

A orientação está configurada como **fullUser**: respeita o bloqueio/rotação automática do aparelho. A configuração portrait foi removida. Para ver alterações no celular, gere e instale um APK novo; somente rodar Vite não atualiza o aplicativo instalado.

**Executado aqui:** build web e `cap sync android`. **Ainda não executado:** build Gradle, instalação física/emulador, rotação/haptics reais, benchmark de FPS e publicação. Este pacote não contém APK/AAB compilado.

## Responsividade e arquitetura

Phaser 3.90 + TypeScript + Vite; sem React/Vue. `Phaser.Scale.RESIZE` acompanha a área disponível. `#app` aplica safe area uma vez; `#stage` contém canvas e camada de interface. `LayoutSystem` centraliza dimensões/orientação e insets. Menus, HUD e controles usam HTML/CSS nativo associado ao ciclo das Scenes, com botões acessíveis e listas roláveis. Isso substitui as coordenadas rígidas de 720×1280, preservando sistemas e mecânicas.

A câmera é somente de mundo; HUD não sofre zoom. Look-ahead interpola posição à frente da cobra e cresce no turbo. Mudar proporção não altera tamanho do mundo, score ou posição física. A cobra mantém buffer circular por distância. Simulação usa passo de 1/120s; pools de segmentos/moedas/fruta e partículas limitadas.

`data/controls.ts`: direção, joystick, turbo, fruta, câmera. `data/balance.ts`: moedas, arena, dificuldade, powers e XP. `systems/`: regras puras e persistência. `entities/`: itens e cobra. `ui/`: DOM responsivo e controles. `GameScene` coordena os sistemas, com evento coinCollected para fan-out de coleta. `AudioService` sintetiza sons leves e tem volumes separados; não há trilha musical pronta.

## Save e migração

`saveVersion: 3` adiciona preferências, dicas, frutas/turbo e estatísticas. A migração conserva saldo, XP, skins, missões, recordes e flags anteriores. Saves de versão superior a 3 não são sobrescritos. Dados corrompidos usam defaults e mensagem de erro. Escritas são serializadas. Sem login, backend ou cloud save.

Moedas são creditadas pelo delta a cada morte. XP/estatísticas são consolidados ao finalizar pelo menu/reiniciar. A run interrompida por encerramento forçado do processo não é restaurada. Missões usam data local; alterar relógio/save não é protegido por servidor.

## Desenvolvimento e anúncio simulado

`DEV` aparece somente em `npm run dev`. Oferece +Coins/XP, encher turbo, corpo de 20 segmentos, gerar fruta e escudo. São ferramentas de teste, não recursos de produção. O handle `window.coinSnake` e a simulação de revive também são exclusivos de DEV. Produção não inclui menu de debug nem SDK publicitário. Revive mantém ganhos, restaura cinco segmentos e concede invencibilidade breve; limite de uma vez por run.

## Testes de navegador

```bash
npx playwright install chromium
# Terminal 1:
npm run dev
# Terminal 2:
npm run test:browser
```

`COIN_TEST_URL` permite outro endereço; `COIN_BROWSER_EXECUTABLE` permite um Chromium instalado. O script usa contexto descartável e posicionamentos controlados para casos de teste. Capturas em browser-results/. Verifica rotação, oito resoluções, dois dedos, modo canhoto, teclado, fruta, ímã, turbo, save, migração, revive, loja e missões.

## Escopo e próximos passos

O master prompt completo está em `docs/MASTER_PROMPT.md`. Há uma implementação inicial dos sistemas de portal/mundos, bosses/pets, Coin Rush, conquistas e mastery; consulte `docs/IMPLEMENTATION_STATUS.md` para limitações. Candy usa slowdown global e Ocean uma leve deriva (não há zonas localizadas); bosses precisam playtest, e analytics/compras reais não são integrados. Não considere esta build pronta para publicação.

Antes de ampliar o jogo, valide a sensação de controle, a legibilidade e o desempenho no seu celular. Esta atualização parte da versão entregue nesta conversa; modificações feitas somente no seu VS Code não foram incorporadas automaticamente.
