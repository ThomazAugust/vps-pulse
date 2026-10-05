# Regras: Backend

## Banco de Dados
- **Zero Persistência**: É **proibido** utilizar qualquer banco de dados (relacional ou NoSQL). Toda a informação trafegada deve ser "em memória" ou buscada instantaneamente do Sistema Operacional (Telemetria Real-Time). O objetivo é evitar desgaste de disco (I/O) desnecessário na VPS.

## Segurança e Ações
## Segurança e Ações
- **Autenticação SSH**: Quando em modo Remoto, a autenticação e as ações dependem da sessão SSH gerada via Chave Privada. No modo Local, comandos rodam sob as permissões do usuário do daemon.
- **Resiliência do WebSocket**: O backend deve ser capaz de gerenciar a coleta local e remota. Caso o SSH falhe ou a chave seja inválida, o servidor Go **não deve** ser encerrado (panic). O erro deve ser trafegado pelo WebSocket para notificar a UI, mantendo o processo local ativo.

## Performance
- **Garbage Collection e Memória**: O código Go deve ser escrito com foco na redução de alocações (reaproveitamento de Structs/Buffers) para garantir que o consumo do daemon não ultrapasse a marca dos ~10MB de RAM.
- **Eficiência de Rede**: O payload do WebSocket (JSON) deve enviar apenas as mudanças (deltas) ou pacotes otimizados para evitar saturação da banda de rede da VPS.
