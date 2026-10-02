package collector

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"sync"
	"time"

	"vps-panel-agent/pkg/models"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
)

type DockerCollector struct {
	cli *client.Client
	mu  sync.Mutex
}

func NewDockerCollector() *DockerCollector {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		fmt.Printf("[Docker] Aviso: Docker client não inicializado: %v\n", err)
		return &DockerCollector{cli: nil}
	}
	return &DockerCollector{cli: cli}
}

func (d *DockerCollector) Collect(ctx context.Context) models.DockerSummary {
	summary := models.DockerSummary{
		Containers: []models.ContainerInfo{},
	}

	if d.cli == nil {
		// Re-tentar inicializar se não existia
		if cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation()); err == nil {
			d.cli = cli
		} else {
			return summary
		}
	}

	containers, err := d.cli.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		return summary
	}

	summary.Total = len(containers)

	for _, c := range containers {
		cName := "unnamed"
		if len(c.Names) > 0 {
			cName = strings.TrimPrefix(c.Names[0], "/")
		}

		switch c.State {
		case "running":
			summary.Running++
		case "paused":
			summary.Paused++
		default:
			summary.Stopped++
		}

		var ports []string
		for _, p := range c.Ports {
			if p.PublicPort > 0 {
				ports = append(ports, fmt.Sprintf("%s:%d->%d/%s", p.IP, p.PublicPort, p.PrivatePort, p.Type))
			} else {
				ports = append(ports, fmt.Sprintf("%d/%s", p.PrivatePort, p.Type))
			}
		}

		info := models.ContainerInfo{
			ID:     c.ID[:12],
			Name:   cName,
			Image:  c.Image,
			State:  c.State,
			Status: c.Status,
			Ports:  ports,
		}

		// Se o contêiner estiver rodando, extrair telemetria de CPU e memória
		if c.State == "running" {
			d.populateContainerStats(ctx, c.ID, &info)
		}

		summary.Containers = append(summary.Containers, info)
	}

	return summary
}

func (d *DockerCollector) populateContainerStats(ctx context.Context, containerID string, info *models.ContainerInfo) {
	statsCtx, cancel := context.WithTimeout(ctx, 800*time.Millisecond)
	defer cancel()

	resp, err := d.cli.ContainerStats(statsCtx, containerID, false)
	if err != nil {
		return
	}
	defer resp.Body.Close()

	var stats container.StatsResponse
	if err := json.NewDecoder(resp.Body).Decode(&stats); err != nil {
		return
	}

	// 1. Cálculo de CPU % (Delta)
	cpuDelta := float64(stats.CPUStats.CPUUsage.TotalUsage) - float64(stats.PreCPUStats.CPUUsage.TotalUsage)
	systemDelta := float64(stats.CPUStats.SystemUsage) - float64(stats.PreCPUStats.SystemUsage)
	onlineCPUs := float64(stats.CPUStats.OnlineCPUs)
	if onlineCPUs == 0 {
		onlineCPUs = float64(len(stats.CPUStats.CPUUsage.PercpuUsage))
	}
	if onlineCPUs == 0 {
		onlineCPUs = 1
	}

	if systemDelta > 0 && cpuDelta > 0 {
		info.CPUPercent = (cpuDelta / systemDelta) * onlineCPUs * 100.0
	}

	// 2. Cálculo de Memória
	memUsage := stats.MemoryStats.Usage
	if cache, ok := stats.MemoryStats.Stats["cache"]; ok {
		if memUsage >= cache {
			memUsage -= cache
		}
	}
	info.MemoryUsage = memUsage
	info.MemoryLimit = stats.MemoryStats.Limit
	if info.MemoryLimit > 0 {
		info.MemoryPercent = (float64(memUsage) / float64(info.MemoryLimit)) * 100.0
	}

	// 3. Cálculo de Network Rx / Tx
	var rxTotal, txTotal uint64
	for _, netObj := range stats.Networks {
		rxTotal += netObj.RxBytes
		txTotal += netObj.TxBytes
	}
	info.NetworkRx = rxTotal
	info.NetworkTx = txTotal

	// 4. Block I/O
	var readTotal, writeTotal uint64
	for _, bio := range stats.BlkioStats.IoServiceBytesRecursive {
		switch strings.ToLower(bio.Op) {
		case "read":
			readTotal += bio.Value
		case "write":
			writeTotal += bio.Value
		}
	}
	info.BlockRead = readTotal
	info.BlockWrite = writeTotal
}

func (d *DockerCollector) Action(ctx context.Context, containerID, action string) error {
	if d.cli == nil {
		return fmt.Errorf("docker indisponível")
	}

	timeoutSec := 10
	stopOpts := container.StopOptions{Timeout: &timeoutSec}

	switch action {
	case "start":
		return d.cli.ContainerStart(ctx, containerID, container.StartOptions{})
	case "stop":
		return d.cli.ContainerStop(ctx, containerID, stopOpts)
	case "restart":
		return d.cli.ContainerRestart(ctx, containerID, stopOpts)
	default:
		return fmt.Errorf("ação desconhecida: %s", action)
	}
}

func (d *DockerCollector) GetLogs(ctx context.Context, containerID string, tail string) (io.ReadCloser, error) {
	if d.cli == nil {
		return nil, fmt.Errorf("docker indisponível")
	}

	opts := container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Follow:     false,
		Tail:       tail,
		Timestamps: true,
	}

	return d.cli.ContainerLogs(ctx, containerID, opts)
}
