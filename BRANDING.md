# Coin Snake — identidade visual

## Conceito

Marca original e casual que combina uma cobrinha verde, de expressão amigável, envolvendo uma moeda dourada. O corpo aberto sugere um **C** e movimento circular; contorno escuro, formas arredondadas e poucos detalhes mantêm a leitura em tamanhos pequenos.

## Cores

| Cor | Hex | Uso |
| --- | --- | --- |
| Snake Green | `#35A85C` | Corpo e palavra SNAKE |
| Deep Outline | `#174A3A` | Contorno e contraste |
| Coin Gold | `#FFD45B` | Moeda e palavra COIN |
| Background Teal | `#20A79B` | Fundo do launcher adaptativo |
| Cream | `#FFFDF0` | Brilhos, lettering e contraste |

## Masters e exports

- `assets/branding/coin-snake-symbol.svg`: símbolo sem lettering.
- `assets/branding/coin-snake-logo-horizontal.svg`: composição horizontal para peças futuras.
- `assets/branding/coin-snake-logo-stacked.svg`: composição empilhada usada no menu portrait.
- `assets/branding/coin-snake-monochrome.svg`: silhueta monocromática.
- `assets/branding/coin-snake-symbol.png`: textura leve carregada pela intro Phaser.
- `assets/branding/coin-snake-play-store-512.png`: PNG 512×512, opaco, master do launcher para Play Store.
- `scripts/generate-brand-assets.mjs`: geração reproduzível via Playwright já presente no projeto; não adiciona dependências.

## Android app icon

O adaptive icon mantém o fundo teal separado do foreground vetorial transparente. O símbolo ocupa a região central com margem de segurança; variantes legacy ficam em `android/app/src/main/res/mipmap-*`. Os XMLs `mipmap-anydpi-v26` referenciam o foreground, o background e o recurso monochrome para launchers compatíveis com themed icons. A fonte monocromática é `assets/branding/coin-snake-monochrome.svg`.

## Splash e intro

A splash Android usa somente o símbolo central sobre fundo verde-teal, sem texto ou plugin adicional. Os PNGs existentes portrait/landscape são atualizados preservando seus qualifiers. A duração segue o ciclo nativo de inicialização, sem delay intencional.

Após carregar o save e a orientação, `BootScene` solicita a textura do símbolo e inicia `LogoScene`; se o asset falhar, a cena mostra uma moeda textual e prossegue normalmente. A intro tem aproximadamente 1,5 s, aceita toque/tecla para avançar e respeita `settings.reducedMotion`; depois faz fade para o menu. O logo stacked do menu tem movimento CSS discreto, removido pela configuração do jogo ou pela preferência de redução de movimento do sistema.

## Play Store

O ícone master não contém texto promocional, badge nem transparência. A **Feature Graphic é um asset separado** (1024×500); não se deve ampliar o launcher icon para substituir essa peça. Materiais promocionais podem usar o logo horizontal ou stacked.