# Tarefas: Implementação do Controle do Docker

## Checklist de Tarefas

- [x] **1. Backend: Implementar ação de remoção e suporte a sudo/docker**
  - [x] Adicionar suporte a `action == "remove"` ou `"delete"` em `LocalDockerCollector` (`pkg/collector/docker.go`).
  - [x] Adicionar suporte a `action == "remove"` em `SSHDockerCollector` (`pkg/collector/ssh_collector.go`).
  - [x] No `SSHDockerCollector`, permitir fallback para `sudo docker ps -a` se `docker ps -a` retornar erro de permissão.

- [x] **2. Frontend: Adicionar botão de remoção e feedback de ações**
  - [x] Adicionar ícone de lixeira (`trash-2`) para contêineres parados no template HTML (`renderDockerContainers`).
  - [x] Implementar diálogo de confirmação amigável antes de remover.
  - [x] Adicionar suporte à ação `remove` no handler de cliques de containers (`bindContainerActionButtons`).
  - [x] Feedback visual de ação em andamento (desabilitar botão temporariamente).

- [x] **3. Validação e Testes**
  - [x] Validar compilação do Backend (`go build ./...`).
  - [x] Validar build do Frontend (`npx vite build`).
