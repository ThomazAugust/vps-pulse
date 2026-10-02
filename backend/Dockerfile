# =========================================================================
# Multi-stage Dockerfile para o VPS Pulse Agent (Golang)
# Gera uma imagem ultraleve (< 25MB) para execução em VPS Linux
# =========================================================================

# Estágio 1: Compilação
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Instalar dependências de build básicas
RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Compilação estática com flags de otimização de tamanho (-s -w)
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o vps-agent main.go

# Estágio 2: Execução mínima
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /app/vps-agent /app/vps-agent

# Diretório para arquivos estáticos da SPA caso queira servir tudo em 1 porta
RUN mkdir -p /app/static

EXPOSE 8080

ENTRYPOINT ["/app/vps-agent"]
CMD ["-port", "8080", "-static", "/app/static"]
