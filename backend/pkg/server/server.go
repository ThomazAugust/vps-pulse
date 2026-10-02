package server

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"vps-panel-agent/pkg/collector"
	"vps-panel-agent/pkg/models"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Permite acesso a partir de qualquer frontend autorizado
	},
}

type Server struct {
	port            string
	token           string
	staticDir       string
	sysCollector    *collector.SystemCollector
	dockerCollector *collector.DockerCollector

	clientsMu sync.Mutex
	clients   map[*websocket.Conn]bool

	lastPayload models.SystemPayload
	payloadMu   sync.RWMutex
}

func NewServer(port, token, staticDir string) *Server {
	return &Server{
		port:            port,
		token:           token,
		staticDir:       staticDir,
		sysCollector:    collector.NewSystemCollector(),
		dockerCollector: collector.NewDockerCollector(),
		clients:         make(map[*websocket.Conn]bool),
	}
}

func (s *Server) Start() error {
	// Iniciar rotina periódica de coleta e broadcast
	go s.telemetryLoop()

	mux := http.NewServeMux()

	// CORS & Auth Middleware
	wrap := func(h http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusOK)
				return
			}

			h(w, r)
		}
	}

	mux.HandleFunc("/health", wrap(s.handleHealth))
	mux.HandleFunc("/api/stats", wrap(s.handleStats))
	mux.HandleFunc("/api/containers/", wrap(s.handleContainerRoutes))
	mux.HandleFunc("/ws", s.handleWebSocket)

	// Servir frontend SPA estático caso exista a pasta
	if s.staticDir != "" {
		if _, err := os.Stat(s.staticDir); err == nil {
			fileServer := http.FileServer(http.Dir(s.staticDir))
			mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
				path := filepath.Join(s.staticDir, filepath.Clean(r.URL.Path))
				if _, err := os.Stat(path); os.IsNotExist(err) {
					// Fallback SPA para index.html
					http.ServeFile(w, r, filepath.Join(s.staticDir, "index.html"))
					return
				}
				fileServer.ServeHTTP(w, r)
			})
			fmt.Printf("📦 Servindo SPA frontend estático em: %s\n", s.staticDir)
		}
	}

	addr := ":" + s.port
	fmt.Printf("🚀 Agente VPS rodando em http://0.0.0.0%s (WebSocket: ws://0.0.0.0%s/ws)\n", addr, addr)
	return http.ListenAndServe(addr, mux)
}

func (s *Server) telemetryLoop() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		h, cpu, mem, disks, net, procs := s.sysCollector.Collect()
		dock := s.dockerCollector.Collect(context.Background())

		payload := models.SystemPayload{
			Host:      h,
			CPU:       cpu,
			Memory:    mem,
			Disks:     disks,
			Network:   net,
			Docker:    dock,
			Processes: procs,
		}

		s.payloadMu.Lock()
		s.lastPayload = payload
		s.payloadMu.Unlock()

		// Transmitir aos clientes WebSocket conectados
		s.broadcastStats(payload)
	}
}

func (s *Server) broadcastStats(payload models.SystemPayload) {
	msg := models.WsMessage{
		Type: "stats",
		Data: payload,
	}

	bytes, err := json.Marshal(msg)
	if err != nil {
		return
	}

	s.clientsMu.Lock()
	defer s.clientsMu.Unlock()

	for conn := range s.clients {
		if err := conn.WriteMessage(websocket.TextMessage, bytes); err != nil {
			conn.Close()
			delete(s.clients, conn)
		}
	}
}

func (s *Server) checkAuth(r *http.Request) bool {
	if s.token == "" {
		return true // Sem token configurado
	}

	// Verificar query param ?token=...
	if r.URL.Query().Get("token") == s.token {
		return true
	}

	// Verificar Header Authorization: Bearer <token>
	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		bearer := strings.TrimPrefix(authHeader, "Bearer ")
		return bearer == s.token
	}

	return false
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok","agent":"vps-panel-agent"}`))
}

func (s *Server) handleStats(w http.ResponseWriter, r *http.Request) {
	if !s.checkAuth(r) {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	s.payloadMu.RLock()
	data := s.lastPayload
	s.payloadMu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func (s *Server) handleContainerRoutes(w http.ResponseWriter, r *http.Request) {
	if !s.checkAuth(r) {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	// Rotas esperadas:
	// POST /api/containers/{id}/action
	// GET  /api/containers/{id}/logs
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 4 {
		http.NotFound(w, r)
		return
	}

	containerID := parts[2]
	endpoint := parts[3]

	if endpoint == "action" && r.Method == http.MethodPost {
		var req struct {
			Action string `json:"action"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "JSON inválido", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
		defer cancel()

		if err := s.dockerCollector.Action(ctx, containerID, req.Action); err != nil {
			http.Error(w, fmt.Sprintf("Erro ao executar ação %s: %v", req.Action, err), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"success":true}`))
		return
	}

	if endpoint == "logs" && r.Method == http.MethodGet {
		tail := r.URL.Query().Get("tail")
		if tail == "" {
			tail = "100"
		}

		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		reader, err := s.dockerCollector.GetLogs(ctx, containerID, tail)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer reader.Close()

		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		io.Copy(w, reader)
		return
	}

	http.NotFound(w, r)
}

func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	if !s.checkAuth(r) {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Printf("Falha no upgrade WebSocket: %v\n", err)
		return
	}

	s.clientsMu.Lock()
	s.clients[conn] = true
	s.clientsMu.Unlock()

	// Enviar snapshot inicial imediato
	s.payloadMu.RLock()
	initialData := s.lastPayload
	s.payloadMu.RUnlock()

	msg := models.WsMessage{Type: "stats", Data: initialData}
	if bytes, err := json.Marshal(msg); err == nil {
		conn.WriteMessage(websocket.TextMessage, bytes)
	}

	// Leitor para manter viva ou receber mensagens do cliente
	go func() {
		defer func() {
			s.clientsMu.Lock()
			delete(s.clients, conn)
			s.clientsMu.Unlock()
			conn.Close()
		}()

		for {
			_, message, err := conn.ReadMessage()
			if err != nil {
				break
			}

			// Tratar mensagens recebidas do cliente (ex: subscribe_logs)
			var clientMsg struct {
				Type        string `json:"type"`
				ContainerID string `json:"containerId"`
			}
			if err := json.Unmarshal(message, &clientMsg); err == nil {
				if clientMsg.Type == "subscribe_logs" && clientMsg.ContainerID != "" {
					s.streamContainerLogs(conn, clientMsg.ContainerID)
				}
			}
		}
	}()
}

func (s *Server) streamContainerLogs(conn *websocket.Conn, containerID string) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	reader, err := s.dockerCollector.GetLogs(ctx, containerID, "100")
	if err != nil {
		conn.WriteJSON(models.WsMessage{Type: "log_chunk", Data: fmt.Sprintf("Erro ao ler logs: %v", err)})
		return
	}
	defer reader.Close()

	buf := make([]byte, 4096)
	for {
		n, err := reader.Read(buf)
		if n > 0 {
			// Remover cabeçalhos multiplex do Docker (primeiros 8 bytes de cada frame se presente)
			cleanText := string(buf[:n])
			conn.WriteJSON(models.WsMessage{Type: "log_chunk", Data: cleanText})
		}
		if err != nil {
			break
		}
	}
}
