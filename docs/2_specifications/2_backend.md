# Especificações: Backend

## Stack Tecnológico
- **Linguagem**: Go (Golang).
- **Bibliotecas Principais**:
  - `gopsutil` e Socket Unix: Mantidos para suporte pleno à **Conexão Local**.
  - `golang.org/x/crypto/ssh`: Para gerenciamento de túneis, execução remota via CLI e suporte à **Conexão Remota (Agentless)**.

## Limitações e Desempenho
- **Consumo de RAM**: Máximo estipulado de ~10MB (gerenciado pelo garbage collector eficiente do Go).
- **Tamanho do Binário**: Extremamente pequeno e compilado de forma estática, sem dependências de pacotes externos na VPS.

## Arquitetura Interna (`pkg/`)
- `collector/`:
  - **Interface Collector**: Uma abstração criada para lidar com múltiplas origens de dados.
  - **LocalCollector**: Usa `gopsutil` e o `/var/run/docker.sock` para o modo local.
  - **SSHCollector**: Envia comandos remotamente (ex: `cat /proc/stat`, CLI do Docker) via sessão SSH.
- `models/`: Estruturas (structs) fortemente tipadas em Go, que são serializadas em JSON para envio ao Frontend.
- `server/`: Contém os manipuladores (handlers) HTTP padrão, Upgrade para WebSockets e lógica de estabelecimento do cliente SSH.

## Comunicação e Endpoints
- **Servidor HTTP**: Roda localmente por padrão na porta `8080`.
- **Rotas**:
  - Servidor de arquivos estáticos (Frontend SPA).
  - Endpoint de WebSocket repassando configurações de IP, Usuário e Chave para a inicialização da sessão SSH.
  - Endpoints HTTP REST para comandos do Docker enviados via CLI sobre o túnel SSH.
