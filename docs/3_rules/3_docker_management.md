# Regras: Gerenciamento de Contêineres Docker

## 1. Segurança & Autorização
- **Confirmação Obrigatória na Exclusão**: A exclusão de um contêiner é irreversível. A interface deve solicitar confirmação explícita do usuário antes de enviar a requisição de remoção.
- **Validação de Comandos**: As ações recebidas pela rota `/api/containers/{id}/action` devem ser validadas estritamente contra uma lista permitida (`start`, `stop`, `restart`, `remove`), prevenindo qualquer injeção de parâmetros nos comandos CLI sobre SSH.

## 2. Resiliência & Fallback SSH
- **Permissões do Docker na VPS**:
  - Quando a chamada direta de `docker ps` falhar por permissão negada no socket (`Got permission denied while trying to connect to the Docker daemon socket`), o agente deve tentar invocar via `sudo docker ...` ou logar instruções claras de adicionar o usuário ao grupo `docker` (`sudo usermod -aG docker <user>`).
- **Timeouts**: Qualquer operação do Docker via SSH não deve travar a execução do agente. Deve utilizar timeout máximo de 10 segundos.
