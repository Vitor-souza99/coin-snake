# Coleção de skins

As skins são cosméticas: não modificam velocidade, curva, Turbo, Coins, dano, vida ou qualquer atributo de jogo. Efeitos usam texturas geradas com Phaser Graphics e partículas limitadas, para manter o custo baixo em aparelhos móveis.

## Raridades

- **COMMON**: aparência simples.
- **RARE**: detalhes extras no corpo e na cabeça.
- **EPIC**: padrões, trail e partículas leves.
- **LEGENDARY**: trail/partículas temáticas e variação visual durante Turbo.
- **MYTHIC**: adornos exclusivos, trail e partículas limitadas, Turbo e modo Vitória no preview.

Toda raridade é comunicada em texto nos cards e no preview; cor e borda são apenas reforço visual.

## Catálogo e desbloqueio

| Skin | Raridade | Desbloqueio |
| --- | --- | --- |
| Classic Snake | COMMON | Grátis |
| Green Snake | COMMON | Grátis |
| Orange Snake | COMMON | 1.000 Coins |
| Cat Snake | RARE | 500 Coins (preço legado preservado) |
| Robot Snake | RARE | 1.000 Coins |
| Dino Snake | RARE | 2.000 Coins |
| Ghost Snake | EPIC | Derrotar qualquer chefe |
| Dragon Snake | EPIC | 5.000 Coins (preço legado preservado) |
| Candy Dragon | EPIC | Recompensa de chefe Candy Monster (hook de gameplay futuro) |
| Fire Dragon, Rainbow Serpent, Leviathan, Frost Wyvern | LEGENDARY | Premium, bloqueadas |
| Ancient Dragon, Void Serpent, Celestial Dragon, Inferno Titan | MYTHIC | Premium, bloqueadas |

Os IDs existentes `classic`, `cat`, `robot`, `dino` e `dragon` e os saldos já ganhos são preservados. Cat, Robot, Dino e Dragon mantêm os preços publicados no catálogo anterior.

## Dragon family

`family: "dragon"` agrupa Dragon Snake (EPIC), Fire Dragon (LEGENDARY) e Ancient/Celestial Dragon (MYTHIC), além de Candy Dragon. A família é metadata de catálogo; não há árvore de progressão complexa.

## Collection e preview

Os cards são data-driven, mostram nome, raridade textual, status e preço/requisito. ALL, OWNED, LOCKED e filtro simples de raridade refinam a lista. Tocar no card ou em VIEW abre `SkinPreviewScene`, inclusive para premium bloqueada.

O preview apresenta segmentos completos animados em trajetória elíptica suave, trail temático, partículas decorativas e controles Normal/Turbo; Legendary/Mythic também oferecem Vitória. Rotação redimensiona a composição. Ao fechar, a cena pára e destrói sprites, Graphics, listeners e o canvas gerenciado pela cena; não existe emissor de partículas contínuo no preview.

## Premium e compras futuras

Premium tem `coinPrice: null`, metadata opcional `futureProductId` (`coinsnake.skin.*`) e não pode ser comprada por Coins nem equipada sem propriedade válida. O preview visual continua liberado. A UI informa “Premium — em breve”; não apresenta preços fictícios.

`PurchaseService` define `isAvailable`, `getProduct`, `purchase` e `restorePurchases`, mas atualmente é no-op (`notAvailable`). Google Play Billing, SDKs, transações e pagamento real não foram implementados. Integrar futuramente com verificação confiável da loja antes de conceder entitlement.

`unlockedSkins` registra itens gratuitos/de gameplay/Coins; `premiumEntitlements` existe separadamente como cache informativo. O conteúdo salvo localmente **não é prova de compra** e o serviço de hoje sempre retorna lista vazia na migração, sem conceder Premium. Nunca habilitar entitlements premium apenas por edição/debug de save em produção.

## Saves e DEV

Save v4 migra v1/v2/v3, mantém IDs e skins de propriedade válidos, seleciona apenas skin já desbloqueada e inicializa `premiumEntitlements` vazio. Versões futuras continuam protegidas contra sobrescrita. Não há unlock DEV de premium habilitado nesta entrega; UI de compra, se adicionada para QA, deve ficar estritamente sob `import.meta.env.DEV`.