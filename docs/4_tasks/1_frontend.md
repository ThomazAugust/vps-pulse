# Tarefas Implementadas: Frontend

## Estruturação do Projeto
- [x] Inicialização do projeto base utilizando **Vite** para desenvolvimento ultrarrápido.
- [x] Limpeza de arquivos padrão e configuração do diretório `src/`.

## Layout e Estilização Visual (CSS)
- [x] Implementação de variáveis CSS globais (Dark Tech).
- [x] Criação de classes utilitárias para o design de "Glassmorphism".
- [x] Desenvolvimento do Grid layout responsivo (Dashboard).
- [x] Estilização de botões de controle (Iniciar/Parar/Reiniciar).

## Lógica e Telemetria (JavaScript)
- [x] Desenvolvimento do sistema de Mock de Dados (`mockData.js`) para o Modo de Demonstração (gerando dados fictícios de CPU, Memória, Disco, Rede).
- [x] Integração da biblioteca **Chart.js** para gráficos em tempo real dinâmicos (Atualização via buffers e janelas de tempo limitadas).
- [x] Implementação do cliente **WebSocket** (`main.js`) com sistema de reconexão e tratamento de estados da UI (conectado, desconectado, autenticando).
- [x] Mapeamento de dados recebidos pelo JSON do backend direto nos DOM Elements e Gráficos correspondentes.
- [x] Criação de funções HTTP REST para disparar comandos de ação no Docker (Start, Stop, Restart).
- [x] Implementação do visualizador dinâmico de logs em modal.
