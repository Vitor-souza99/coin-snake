# Controles e rotação

Normal: joystick inferior esquerdo; turbo direito. Canhoto: inverso. A base aparece no toque, direção é o vetor a partir desse ponto e não a posição absoluta da cobra. Dead zone9px evita ruído. Knob limitado a54px; soltar mantém a direção atual. A captura do pointer impede que o turbo roube o dedo do joystick. pointercancel/lostcapture/background/resize limpam estados.

Mouse na arena continua apontando destino. WASD/setas assumem prioridade enquanto pressionados. Shift segura turbo. Escape/espaço pausa; o tutorial exige seu botão de confirmação para registrar a nova dica.

O canvas acompanha a viewport via RESIZE. UI reorganiza com media query landscape; menus usam duas colunas quando cabe, listas rolam. A arena mantém coordenadas mundiais estáveis. Ao mudar orientação a partida pausa, conservando ID, tempo, score e posição.

Android: fullUser respeita a configuração de rotação automática do sistema. Se estiver bloqueada no Android, destrave para testar. Refaça build/sync/APK para levar alterações ao celular. Teste físico não foi executado aqui.
