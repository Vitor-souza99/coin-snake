# Status — Coin Snake roadmap implementation (7 de outubro de 2026)

## Identidade visual inicial Coin Snake (8 de outubro de 2026)
- [x] Criados masters SVG originais do símbolo Snake + Coin, wordmark horizontal/stacked e silhueta monocromática.
- [x] Gerados PNG do símbolo e master opaco 512×512 para Play Store; script reproduzível usa Playwright já instalado.
- [x] Android: foreground/background do adaptive icon, recursos legacy, monochrome themed icon e splashes portrait/landscape atualizados sem plugin novo.
- [x] Criada `LogoScene` após boot com reveal curto, toque/tecla para pular, reduced motion e fallback sem asset; segue ao menu sem dependência cosmética crítica.
- [x] Main Menu substitui heading/mascote duplicados pelo logo stacked; layout CSS contempla landscape e movimento reduzido.
- [x] `BRANDING.md` documenta conceito, paleta, fontes, exports e Feature Graphic separada.
- [x] `npx cap sync android` concluiu sem instalar dependências ou novos plugins; build Gradle não disponível por falta de Java/JAVA_HOME no ambiente.
- [x] Typecheck, unit tests (74/74) e production build passam.
- [x] Teste browser direcionado confirmou a intro/menu sem erros e botões dentro do viewport em 8 tamanhos portrait/landscape.
- [ ] Lint global ainda falha em `src/game/services/AdsService.ts:34` (`_reason` não utilizado), em arquivo preexistente fora desta entrega; smoke test ampla chega ao Game e falha depois porque o tutorial inicial intercepta o controle pause que ela tenta acionar.
- [ ] Build Gradle não executado: Java/JAVA_HOME não está instalado/configurado neste ambiente.

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

## Coleção visual de skins
- [x] Catálogo data-driven com raridades COMMON/RARE/EPIC/LEGENDARY/MYTHIC, requisitos, família Dragon e configuração cosmética.
- [x] Catálogo exposto na coleção com filtros ALL/OWNED/LOCKED/raridade e cards sempre visualizáveis.
- [x] Preview animado em cena própria: corpo completo, trail, Turbo e Vitória; limpeza no encerramento e suporte a resize.
- [x] Legendary/Mythic Premium bloqueadas; Coins não as compram e o save não concede ownership premium.
- [x] PurchaseService no-op com API de disponibilidade/produto/compra/restauração; sem SDK ou pagamentos reais.
- [x] Save v4 migra v1/v2/v3, preserva propriedade e seleção válidas e separa `premiumEntitlements` (não autoritativo).
- [ ] Testar preview/coleção, rotação e efeitos no jogo, especialmente FPS em Android intermediário.
- [ ] Candy Dragon é metadata/requisito planejado; a recompensa automática após Candy Monster ainda requer integração explícita.

Detalhes da coleção: [`SKINS.md`](SKINS.md).

## Roadmap — parcial, necessita playtest e fechamento
- [x] Redesign regional procedural do Candy World, Sticky Zones localizadas, Gummies lentos, rio atravessável com pontes largas e Candy Coin sem nova carteira.
- [x] Layout Ocean regional, correntes vetoriais SOFT/STRONG/RAPID, corais, Bubble Garden, Deep Trench, Pearl Coin e Kraken Arena visual.
- [ ] Playtest real de leitura/navegação em cobra grande, bosses, portrait/landscape e Android; arena do boss é visual e não altera fases do encontro.
- [x] Save v5 migra v1–v4, preserva IDs legados de mundo, salva seleção e não concede Premium por save.
- [x] Seleção de mundo no menu com cards, preview procedural, requisitos e estados bloqueado/futuro/Premium.
- [x] Requisitos Candy (nível 5 + King Snake) e Ocean (nível 10 + Candy Monster), reconciliação após level/boss.
- [x] Portais ponderados filtram destinos não implementados, bloqueados, Premium e mundo atual; retorno ao Green Valley preservado.
- [x] Catálogo de bosses, encontro King Snake/Candy Monster, fases, energia, Boss Coins e recompensas locais.
- [x] Bee/Candy Blob, seleção de pet, bônus de spawn e XP, tela de coleção.
- [x] Coin Rush de 60 segundos, conquistas iniciais, mastery simples e serviço de analytics local/no-op.
- [ ] Playtest manual do redesign Ocean (Snake pequena/grande, Turbo, Magnet, Shield, orientação e câmera panorâmica); Kraken não recebeu novas fases/tentáculos neste escopo.
- [ ] Bosses/portais precisam balanceamento e teste manual; ataques e controles atuais são protótipos.
- [ ] Mastery não concede cosméticos e a UI só mostra contador básico.
- [ ] Música final, temas por mundo e fanfarras.
- [ ] Coin Rush ainda precisa validar fluxo de Game Over/revive e recompensas em aparelho.
- [ ] PurchaseService é boundary no-op; compras reais não integradas.
- [ ] Playtest visual/responsivo e balanceamento dos portais em dispositivo real.
- [ ] Backend, multiplayer, login, cloud save, anúncios/compras reais e Play Store.

BossEnergy e Boss Coins são campos separados do saldo; a fruta continua isolada da economia. Recursos novos não foram testados em aparelho Android e não devem ser considerados prontos para publicação.
