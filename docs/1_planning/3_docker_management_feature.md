# Planejamento & Feature: Gerenciamento de Contêineres Docker (Listar, Iniciar, Parar, Remover)

## Visão Geral
Esta feature permite o controle completo do ciclo de vida dos contêineres Docker diretamente pela interface web do VPS Pulse, tanto no modo **Local** quanto no modo **Remoto (Agentless SSH)**.

## Casos de Uso
1. **Listagem em Tempo Real**:
   - Visualização de todos os contêineres (`running`, `paused`, `exited`), incluindo ID, nome, imagem, portas e status.
   - Atualização automática a cada ciclo de telemetria (1s).
   - Suporte a ambientes onde o usuário SSH padrão precisa de privilégios (`sudo docker` ou grupo `docker`).

2. **Iniciar Contêiner (`start`)**:
   - Permite ligar contêineres que estejam parados (`exited` ou `created`).
   - Feedback imediato de carregamento na interface.

3. **Parar Contêiner (`stop`)**:
   - Envia sinal gracioso de parada (com timeout) para contêineres em execução.

4. **Reiniciar Contêiner (`restart`)**:
   - Reinicia contêineres sem necessidade de login manual via terminal.

5. **Remover Contêiner (`remove` / `delete`)**:
   - Exclui contêineres parados (ou força exclusão de contêineres quando solicitado).
   - Modal ou confirmação prévia para evitar deleções acidentais.
