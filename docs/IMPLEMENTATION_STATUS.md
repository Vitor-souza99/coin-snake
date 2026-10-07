# Status — Coin Snake roadmap implementation (7 de outubro de 2026)

## Fase concluída nesta entrega
- [x] Análise da base anterior, sem trocar a stack ou os sistemas de economia/missões.
- [x] Joystick flutuante, dead zone, captura independente por dedo, suavização.
- [x] Modo canhoto persistido, mouse/WASD/setas preservados.
- [x] Turbo de segurar, consumo/regeneração, recarga por tipo de moeda, curva mais lenta, trail, SFX e haptic.
- [x] Turbo power-up preservado e sem empilhamento indevido de velocidade.
- [x] Shrink Fruit com redução, piso, expiração/cooldown e exclusão de Magnet/Score/Combo/Coins.
- [x] Câmera de mundo com look-ahead; arena ampliada com densidade ajustada.
- [x] Phaser RESIZE; menus portrait/landscape reais; HUD separado da câmera.
- [x] Safe area aplicada uma vez; ResizeObserver; pausa segura ao mudar orientação.
- [x] Android fullUser e versionCode 2.
- [x] Configurações de controles/áudio, vibração, redução de efeitos e reapresentação das dicas.
- [x] Save v3: migração v1/v2, preferências/estatísticas novas e proteção de versão futura.
- [x] Debug apenas DEV para recursos implementados.
- [x] Loja, missões, skins, economia, combos, powers e revive dev preservados.

## Verificado
- [x] npm run typecheck.
- [x] npm run test: 34 testes.
- [x] npm run lint.
- [x] npm run build.
- [x] npm run android:sync (web assets copiados; build Gradle do APK/AAB não executado).
- [x] Teste Chromium: 360×640, 390×844, 412×915, 720×1280, 1080×1920, 844×390, 915×412 e 1280×720 (após restaurar menu compacto).
- [x] Dois dedos simultâneos, Shift, joystick canhoto, release, pausa e retomada.
- [x] Rotação preserva run e pausa; safe area simulada; HUD/controles dentro da tela.
- [x] Fruta, piso de tamanho, exclusão do ímã e da economia; moeda carrega turbo.
- [x] GameOver, um revive, persistência, migração no boot, compra de skin e resgate.
- [x] Capturas de menu/jogo portrait e landscape inspecionadas.

## Ainda não verificado no ambiente
- [ ] Compilação Gradle do APK/AAB (SDK existe; JDK/Java não está instalado ou não está configurado no ambiente).
- [ ] Instalação no seu aparelho, notch/rotação e haptics reais.
- [ ] Desempenho de 60 FPS em Android intermediário; balanceamento por playtesting.

## Roadmap — parcial, necessita playtest e fechamento
- [x] Save v3 migra v1/v2 e armazena pets, bosses, mundos, conquistas e mastery.
- [x] Catálogo de mundos com níveis de desbloqueio, portais, viagem/retorno e aparência base.
- [x] Catálogo de bosses, encontro King Snake/Candy Monster, fases, energia, Boss Coins e recompensas locais.
- [x] Bee/Candy Blob, seleção de pet, bônus de spawn e XP, tela de coleção.
- [x] Coin Rush de 60 segundos, conquistas iniciais, mastery simples e serviço de analytics local/no-op.
- [ ] Candy aplica redução global de velocidade e Ocean aplica leve deriva; sticky zones espaciais localizadas ainda não existem.
- [ ] Bosses/portais precisam balanceamento e teste manual; ataques e controles atuais são protótipos.
- [ ] Mastery não concede cosméticos e a UI só mostra contador básico.
- [ ] Música final, temas por mundo e fanfarras.
- [ ] Coin Rush ainda precisa validar fluxo de Game Over/revive e recompensas em aparelho.
- [ ] PurchaseService é boundary no-op; compras reais não integradas.
- [ ] Backend, multiplayer, login, cloud save, anúncios/compras reais e Play Store.

BossEnergy e Boss Coins são campos separados do saldo; a fruta continua isolada da economia. Recursos novos não foram testados em aparelho Android e não devem ser considerados prontos para publicação.
