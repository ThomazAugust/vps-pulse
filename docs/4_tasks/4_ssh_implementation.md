# Tarefas Implementadas: Feature SSH (Modo Híbrido)

## Refatoração do Backend
- [ ] Criar a interface `Collector` (ou `TelemetryCollector`) em Go para padronizar os retornos de CPU, Mem, Disk e Docker.
- [ ] Mover a lógica atual dependente do `gopsutil` e Docker Socket para uma implementação chamada `LocalCollector`.
- [ ] Adicionar `golang.org/x/crypto/ssh` ao projeto.
- [ ] Criar a implementação `SSHCollector` que faz túnel SSH e roda comandos CLI.
- [ ] Atualizar o handler WebSocket para aceitar um payload de configuração e decidir qual `Collector` instanciar.

## Atualização do Frontend
- [ ] Adicionar botão (Toggle ou Select) para escolha do modo de conexão: "Local" vs "SSH".
- [ ] Implementar condicional na interface: exibir o formulário de `IP`, `Usuário` e `Chave Privada` apenas se o modo "SSH" for selecionado.
- [ ] Atualizar a lógica do WebSocket para enviar a configuração escolhida.
- [ ] Resetar dados visuais (Charts) sempre que houver troca de modo de monitoramento.
