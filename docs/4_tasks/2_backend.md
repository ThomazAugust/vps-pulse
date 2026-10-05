# Tarefas Implementadas: Backend

## Estruturação e Core
- [x] Inicialização do projeto **Go** (`go mod init`).
- [x] Configuração da função main com parser de flags (`-port`, `-token`, `-static`).

## Coletores de Telemetria (Collectors)
- [x] Implementação da integração com a biblioteca `gopsutil` para capturar carga de CPU (Total e por Core).
- [x] Captura de métricas avançadas de Memória (Swap, Buffers, Cache).
- [x] Leitura de partições de Disco e I/O de rede (`eth0`).
- [x] Leitura nativa do `/var/run/docker.sock` para listagem de contêineres e seus respectivos status.

## Comunicação e Endpoints (Server)
- [x] Criação de structs em `/models` para a serialização perfeita de telemetria em JSON.
- [x] Implementação de rotas HTTP nativas para fornecer a pasta estática `/dist` do Frontend.
- [x] Implementação de um Upgrade Handler para transformar conexões HTTP em conexões WebSocket.
- [x] Sistema de Loop infinito eficiente rodando através de *Goroutines* que lê os collectors e empurra pelo WebSocket.
- [x] Middleware HTTP para validar Tokens Bearer.
- [x] Criação de Endpoints REST dedicados para receber ações nos contêineres (Start/Stop/Restart).
