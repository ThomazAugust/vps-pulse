# Planejamento: Modelo Híbrido (Local + SSH)

## Visão Geral
A arquitetura do VPS Pulse será expandida para um modelo **Híbrido**. O objetivo é permitir que o usuário escolha entre monitorar a máquina local (onde o agente Go está rodando) ou monitorar uma máquina remota sem necessidade de instalar agentes (Agentless remoto via SSH).

## Nova Arquitetura
- **Conexão Local**: Utiliza a biblioteca `gopsutil` e o socket local do Docker (`/var/run/docker.sock`). Funciona idêntico à versão original.
- **Conexão SSH (Remota)**: O backend Go, rodando localmente, estabelece um túnel seguro via SSH para a VPS destino, executando comandos CLI e fazendo parse do texto retornado.
- **Transição pela Interface**: O usuário define a modalidade no Frontend. Se optar por SSH, insere IP, Usuário e Chave Privada; o WebSocket notifica o Go para instanciar a rotina correspondente de telemetria sem derrubar o servidor.
