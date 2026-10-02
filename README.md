# 🚀 VPS Pulse • Painel de Monitoramento em Tempo Real

Painel moderno e ultraleve para monitorar a saúde da sua **VPS**, recursos de hardware (**CPU, Memória, Disco, Rede e Processos**) e **Contêineres Docker** em tempo real via WebSockets.

---

## 🌟 Principais Recursos

- **Zero Banco de Dados**: A aplicação é 100% voltada ao monitoramento em tempo real (telemetria contínua via WebSocket), sem persistência desnecessária ou acúmulo de dados na VPS.
- **Visualização Dedicada para Docker**:
  - Resumo de integridade (Em execução, Pausados, Parados, Total).
  - Telemetria individual por contêiner: % de CPU, Memória em MB/%, Tráfego de Rede (Rx/Tx) e E/S de Disco (Block I/O).
  - Portas mapeadas e comandos diretos: **Iniciar, Parar, Reiniciar** e **Visualizador de Logs em Tempo Real**.
- **Hardware & Sistema**:
  - Carga média (1m, 5m, 15m), Uptime e informações do Kernel/SO.
  - Consumo geral de CPU e medidores individuais para **cada núcleo de processamento**.
  - Detalhamento de Memória RAM (Em uso, Livre, Cache, Buffers e Swap).
  - Partições de disco com leitura e escrita em MB/s.
  - Placas de rede (`eth0`, `docker0`, etc.) com taxas de upload/download em tempo real.
- **Top Processos Ativos**:
  - Listagem dos processos consumindo mais recursos no sistema, com busca e filtros dinâmicos.
- **Frontend SPA Moderno**:
  - Construído com **HTML5, Vanilla CSS puro (design dark tech com glassmorphism) e JavaScript (Vite)**.
  - Modo Demonstração integrado para testes visuais imediatos sem necessidade de conexão ativa.
- **Backend Agente em Go**:
  - Consumo minúsculo de memória (~10MB de RAM).
  - Comunicação nativa com o `/var/run/docker.sock`.
  - Autenticação opcional via Token Bearer.

---

## 📁 Estrutura do Repositório

```
painel-vps/
├── frontend/             # Single Page Application (Vite + Vanilla CSS + JS)
│   ├── src/
│   │   ├── charts.js     # Gráficos em tempo real com Chart.js
│   │   ├── mockData.js   # Gerador de dados de simulação
│   │   ├── style.css     # Design System Dark Tech / Glassmorphism
│   │   └── main.js       # Lógica central, WebSocket e controle de UI
│   ├── index.html
│   └── package.json
├── backend/              # Agente Go (Daemon de telemetria)
│   ├── pkg/
│   │   ├── collector/    # Coletores de SO (gopsutil) e Docker (Unix socket)
│   │   ├── models/       # Estruturas de dados JSON
│   │   └── server/       # Servidor HTTP, WebSocket e rotas de controle
│   ├── Dockerfile        # Imagem Alpine ultraleve (< 25MB)
│   ├── go.mod
│   └── main.go
└── docker-compose.yml    # Deploy com 1 comando na VPS
```

---

## ⚡ Como Rodar Localmente (Desenvolvimento)

### 1. Iniciar o Frontend SPA
```bash
cd frontend
npm install
npm run dev
```
Acesse `http://localhost:5173` no seu navegador. O painel iniciará imediatamente no **Modo Demonstração** para você interagir com todos os componentes visuais.

### 2. Iniciar o Agente Go
```bash
cd backend
go run main.go -port 8080
```
Ao iniciar o backend, clique em **"Usar VPS Real"** no topo da página para conectar o painel ao agente via WebSocket!

---

## 🚢 Deploy na VPS de Produção

### Opção 1: Via Docker Compose (Recomendado)

Na sua VPS, clone este repositório e rode:
```bash
docker compose up -d
```
O agente subirá como serviço de fundo, mapeando o `/var/run/docker.sock` e servindo o painel na porta `8080`.

> **Dica de Segurança**: Para proteger o painel com token, edite o `docker-compose.yml` e defina `VPS_TOKEN=seu_token_secreto`.

---

### Opção 2: Binário Nativo Go (Sem Docker)

Você pode compilar o executável estático diretamente da sua máquina para a VPS Linux:
```bash
# Compilar binário para Linux (amd64)
env GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o vps-agent main.go
```
Copie o arquivo `vps-agent` e a pasta `frontend/dist` para sua VPS e execute:
```bash
./vps-agent -port 8080 -token "meu-token-forte" -static "./dist"
```
Ou crie um serviço no `systemd` para inicialização automática no boot.
