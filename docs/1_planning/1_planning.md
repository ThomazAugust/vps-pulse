# Planejamento Inicial do VPS Pulse

## Visão Geral
O VPS Pulse nasceu da necessidade de um painel de monitoramento em tempo real que fosse **ultraleve**, focando em telemetria contínua sem a complexidade de bancos de dados ou agentes pesados.

## Objetivos Principais
1. **Zero Persistência**: Nenhuma necessidade de banco de dados (SQLite, MySQL, etc.). O painel deve ser um reflexo instantâneo da saúde da VPS e não um histórico de longo prazo.
2. **Eficiência Extrema**: O agente backend não deve consumir mais de ~10MB de RAM, permitindo rodar em VPS de baixíssimo custo (ex: 512MB RAM).
3. **Foco em Docker**: O painel deve oferecer uma visualização detalhada e controle nativo (iniciar, parar, reiniciar, logs) sobre os contêineres Docker rodando na máquina.
4. **Modernidade**: Uma interface (SPA) que impressione pela estética (Glassmorphism / Dark Tech) e que traga gráficos em tempo real via WebSockets.

## Decisões Arquiteturais
- **Backend (Go)**: Escolhido pela performance, tipagem estática forte, facilidade de compilação em um binário único e baixíssimo consumo de recursos.
- **Frontend (Vite + Vanilla JS/CSS)**: Evitar frameworks pesados (como React ou Vue) para manter o bundle final extremamente leve, utilizando a velocidade de build do Vite.
- **Comunicação**: 100% dependente de WebSockets para telemetria em tempo real, reduzindo overhead HTTP.
