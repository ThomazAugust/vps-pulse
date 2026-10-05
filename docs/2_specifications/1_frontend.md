# Especificações: Frontend

## Stack Tecnológico
- **Build Tool**: Vite (rápido e leve).
- **Linguagem**: JavaScript Vanilla (ES6+).
- **Estilização**: Vanilla CSS3.
- **Gráficos**: Chart.js.

## Design System
- **Tema**: Dark Tech.
- **Estilo Visual**: Glassmorphism (uso intensivo de `backdrop-filter: blur`, fundos semi-transparentes).
- **Paleta de Cores**: Tons de preto, cinza escuro, azul ciano neon e verde esmeralda para status saudáveis.

## Integrações
- **Seleção de Conexão (Local vs SSH)**:
  - O painel exibe uma interface condicional. Se o usuário escolher "SSH", um formulário solicita `IP da VPS`, `Usuário` e `Chave Privada`.
  - Caso escolha "Local", esses campos não são exigidos.
- **WebSockets**:
  - A conexão com o backend Go local ocorre via `WebSocket`, repassando o "Modo" desejado (e as credenciais, se aplicável).
  - Tratamento de reconexão automática e feedback visual para perda de conexão.
- **Mock Mode (Demonstração)**:
  - Capacidade nativa de funcionar sem um backend conectado, utilizando dados fictícios (`mockData.js`) para exibição imediata do potencial visual da ferramenta.

## Estrutura de Diretórios e Arquivos Relevantes
- `src/main.js`: Controlador principal da SPA e do WebSocket.
- `src/charts.js`: Configurações e instâncias dinâmicas dos gráficos (Chart.js).
- `src/style.css`: Toda a lógica visual, variáveis CSS e design system.
- `src/mockData.js`: Lógica de geração de telemetria artificial.
