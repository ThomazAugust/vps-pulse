# Especificações: Controle do Docker (Backend & Frontend)

## 1. Backend

### 1.1 Contrato da Interface `DockerCollector`
Localização: `pkg/collector/collector.go`
```go
type DockerCollector interface {
    Collect(ctx context.Context) models.DockerSummary
    Action(ctx context.Context, containerID, action string) error
    GetLogs(ctx context.Context, containerID string, tail string) (io.ReadCloser, error)
}
```

### 1.2 Ações Suportadas (`action`)
- `start`: Inicia contêiner (`docker start <id>` ou API SDK).
- `stop`: Para contêiner (`docker stop <id>` ou API SDK).
- `restart`: Reinicia contêiner (`docker restart <id>` ou API SDK).
- `remove` / `delete`: Remove contêiner (`docker rm -f <id>` ou `ContainerRemove(ctx, id, ContainerRemoveOptions{Force: true})`).

### 1.3 Endpoints REST
- `POST /api/containers/{id}/action`
  - Payload: `{"action": "start" | "stop" | "restart" | "remove"}`
  - Respostas:
    - 200 OK: `{"success": true}`
    - 400 Bad Request: `JSON inválido` ou ação não reconhecida
    - 401 Unauthorized: Caso token Bearer não confira
    - 500 Internal Server Error: Mensagem de erro retornada pelo Docker/SSH

---

## 2. Frontend

### 2.1 Interface dos Cards de Contêineres
- Botões de ação contextual:
  - Se contêiner em execução: Botão **Reiniciar** (`rotate-cw`) e **Parar** (`square`).
  - Se contêiner parado: Botão **Iniciar** (`play`) e **Remover** (`trash-2`).
- Diálogo de confirmação para remoção:
  - Exibe confirmação com o nome do contêiner antes de disparar `remove`.
- Estado de carregamento nos botões para evitar múltiplos cliques simultâneos.
