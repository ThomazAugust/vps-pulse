package main

import (
	"flag"
	"fmt"
	"os"

	"vps-panel-agent/pkg/server"
)

func main() {
	portFlag := flag.String("port", getEnv("VPS_PORT", "8080"), "Porta para execução do servidor (ex: 8080)")
	tokenFlag := flag.String("token", getEnv("VPS_TOKEN", ""), "Token Bearer para autenticação de segurança (opcional)")
	staticFlag := flag.String("static", getEnv("VPS_STATIC_DIR", "../frontend/dist"), "Diretório com os arquivos estáticos da SPA (opcional)")
	flag.Parse()

	fmt.Println("======================================================")
	fmt.Println("       🚀 VPS Pulse Agent - Monitor em Tempo Real    ")
	fmt.Println("======================================================")
	if *tokenFlag != "" {
		fmt.Printf("🔒 Autenticação ATIVA (Token configurado)\n")
	} else {
		fmt.Printf("⚠️  Autenticação DESATIVADA (Acesso livre em rede local ou proxy)\n")
	}

	srv := server.NewServer(*portFlag, *tokenFlag, *staticFlag)
	if err := srv.Start(); err != nil {
		fmt.Fprintf(os.Stderr, "Erro fatal ao iniciar servidor: %v\n", err)
		os.Exit(1)
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
