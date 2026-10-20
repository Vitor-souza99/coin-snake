# Coin Snake 1.1 — Controles e responsividade

Esta atualização inclui controle suave, joystick, turbo manual, Shrink Fruit e rotação da interface. Também traz sistemas iniciais de mundos, portais, bosses, pets e Coin Rush; consulte `docs/IMPLEMENTATION_STATUS.md` para conhecer as limitações e o estado de validação.

## Abrir no Windows
1. Extraia o ZIP em uma pasta nova. Guarde seu projeto anterior.
2. Abra a pasta `coin-snake` no VS Code (a que contém `package.json`).
3. No terminal: `npm install` e depois `npm run dev`.
4. Abra o endereço exibido. Também há `INICIAR_WINDOWS.bat` para iniciar pelo Explorador.

Node.js 22.12 ou superior. O projeto depende do servidor Vite: não abra index.html por duplo clique.

## Atualizar o Android
1. Instale as dependências com `npm install`.
2. Rode `npm run android:sync`.
3. Rode `npm run android:open`.
4. Aguarde a sincronização no Android Studio e gere o APK de debug.
5. Instale sobre a versão anterior, usando o mesmo pacote e a mesma assinatura, para manter o save. Desinstalar ou limpar dados apaga o progresso local.

`com.coinsnake.game` foi mantido; versionCode agora é 2. A orientação respeita a preferência de rotação do aparelho (`fullUser`). Ative a rotação automática do Android para testar horizontal/vertical. Só reconstruir a página web não atualiza o APK: sincronize, compile e instale novamente.

O ZIP contém fontes Android, não um APK/AAB compilado. Android SDK, Gradle e aparelho real precisam ser validados no seu computador.

## Qual código foi atualizado
A base é o Coin Snake MVP entregue anteriormente nesta conversa. Mudanças feitas somente no seu VS Code, ou em outro projeto, não estão disponíveis nesta cópia. Compare-as antes de substituir arquivos; não descarte chaves de assinatura, assets próprios ou configurações locais.

## O que mudou
- Joystick flutuante com zona morta, suavização, captura por dedo e modo canhoto.
- Turbo enquanto pressionado, barra 0–100, consumo, regeneração e recarga por moedas.
- Fruta roxa: reduz 25% do corpo, mínimo de cinco segmentos, vida de 10s e cooldown de 20–35s.
- Canvas responsivo; telas com composição horizontal real, câmera com look-ahead e pausa segura ao girar.
- Configurações de som/vibração, redução de efeitos e dicas reapresentáveis.
- Save v3 com migração de versões anteriores e proteção contra sobrescrever um save de versão futura.
- Loja, missões, pontuação, combos, powers e revive dev preservados.

Leia `README.md` e `docs/IMPLEMENTATION_STATUS.md` para comandos, validações e limites.
