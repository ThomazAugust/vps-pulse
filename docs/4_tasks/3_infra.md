# Tarefas Implementadas: Infraestrutura

## Containerização e Deploy
- [x] Desenvolvimento de um `Dockerfile` Multistage usando `alpine`.
- [x] Otimização da imagem Docker para pesar menos de 25MB (contendo apenas o binário estático do Go e os arquivos estáticos compilados do frontend).
- [x] Configuração correta de permissões para mapeamento de volumes do socket do Docker no container (permissões do daemon).

## Orquestração Facilitada
- [x] Criação do arquivo `docker-compose.yml` final, permitindo o deploy completo com um único comando (`docker compose up -d`).
- [x] Mapeamento de variáveis de ambiente no Compose (como `VPS_TOKEN`) para configuração dinâmica pelo usuário final na hora de implantar.

## Compilação Estática
- [x] Configuração e documentação dos comandos no `README` (`env GOOS=linux GOARCH=amd64 go build...`) para compilar o binário puro, incluindo remoção de símbolos de debug (`-ldflags="-s -w"`) para reduzir o tamanho do arquivo executável final.
