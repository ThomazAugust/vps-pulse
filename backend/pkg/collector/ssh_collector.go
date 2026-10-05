package collector

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	"vps-panel-agent/pkg/models"

	"golang.org/x/crypto/ssh"
)

type SSHSystemCollector struct {
	client *ssh.Client
}

func NewSSHSystemCollector(client *ssh.Client) *SSHSystemCollector {
	return &SSHSystemCollector{client: client}
}

func runWithTimeout(session *ssh.Session, cmd string, timeout time.Duration) ([]byte, error) {
	done := make(chan struct{})
	var out []byte
	var err error
	go func() {
		out, err = session.Output(cmd)
		close(done)
	}()
	select {
	case <-time.After(timeout):
		return nil, fmt.Errorf("timeout executing ssh command")
	case <-done:
		return out, err
	}
}

func (c *SSHSystemCollector) Collect() (models.HostInfo, models.CPUInfo, models.MemoryInfo, []models.DiskInfo, []models.NetInfo, []models.ProcessInfo) {
	// Implementação básica de coleta via comandos bash concatenados para reduzir overhead
	// Em um ambiente real de produção com agentless, comandos como awk/sed seriam extensivamente usados.
	
	hostInfo := models.HostInfo{Hostname: "SSH-Remote", OS: "linux"}
	cpuInfo := models.CPUInfo{ModelName: "SSH-CPU"}
	memInfo := models.MemoryInfo{}
	diskInfo := []models.DiskInfo{}
	netInfo := []models.NetInfo{}
	procInfo := []models.ProcessInfo{}

	session, err := c.client.NewSession()
	if err != nil {
		fmt.Printf("[SSH Collector] Erro ao criar session: %v\n", err)
		return hostInfo, cpuInfo, memInfo, diskInfo, netInfo, procInfo
	}
	defer session.Close()

	// Obtendo Hostname, Uptime, OS, Memória e Disco com timeout de 3 segundos
	cmd := `hostname; cat /proc/uptime; grep PRETTY_NAME /etc/os-release | cut -d= -f2 | tr -d '"'; top -bn1 | grep "Cpu(s)" | awk '{print $2 + $4}'; nproc; free -b; df -B1`
	if out, err := runWithTimeout(session, cmd, 3*time.Second); err == nil {
		lines := strings.Split(string(out), "\n")
		if len(lines) > 0 && strings.TrimSpace(lines[0]) != "" {
			hostInfo.Hostname = strings.TrimSpace(lines[0])
		}
		if len(lines) > 1 {
			parts := strings.Fields(lines[1])
			if len(parts) > 0 {
				uptimeFloat, _ := strconv.ParseFloat(parts[0], 64)
				hostInfo.Uptime = uint64(uptimeFloat)
			}
		}
		if len(lines) > 2 && strings.TrimSpace(lines[2]) != "" {
			hostInfo.OS = strings.TrimSpace(lines[2])
		}
		if len(lines) > 3 {
			if cpuUsage, err := strconv.ParseFloat(strings.TrimSpace(lines[3]), 64); err == nil {
				cpuInfo.TotalPercent = cpuUsage
			}
		}
		if len(lines) > 4 {
			if cores, err := strconv.Atoi(strings.TrimSpace(lines[4])); err == nil && cores > 0 {
				cpuInfo.CoresCount = cores
				cpuInfo.PerCorePercent = make([]float64, cores)
				for i := range cpuInfo.PerCorePercent {
					cpuInfo.PerCorePercent[i] = cpuInfo.TotalPercent
				}
			}
		}
		
		inDf := false
		for _, line := range lines {
			if strings.HasPrefix(line, "Mem:") {
				parts := strings.Fields(line)
				if len(parts) >= 7 {
					memInfo.Total, _ = strconv.ParseUint(parts[1], 10, 64)
					memInfo.Used, _ = strconv.ParseUint(parts[2], 10, 64)
					memInfo.Free, _ = strconv.ParseUint(parts[3], 10, 64)
					memInfo.Available, _ = strconv.ParseUint(parts[6], 10, 64)
					if memInfo.Total > 0 {
						memInfo.UsedPercent = float64(memInfo.Used) / float64(memInfo.Total) * 100.0
					}
				}
			} else if strings.HasPrefix(line, "Filesystem") {
				inDf = true
			} else if inDf && len(line) > 0 && !strings.HasPrefix(line, "tmpfs") && !strings.HasPrefix(line, "devtmpfs") {
				parts := strings.Fields(line)
				if len(parts) >= 6 {
					d := models.DiskInfo{
						Device:     parts[0],
						Mountpoint: parts[5],
					}
					d.Total, _ = strconv.ParseUint(parts[1], 10, 64)
					d.Used, _ = strconv.ParseUint(parts[2], 10, 64)
					d.Free, _ = strconv.ParseUint(parts[3], 10, 64)
					if d.Total > 0 {
						d.UsedPercent = float64(d.Used) / float64(d.Total) * 100.0
					}
					diskInfo = append(diskInfo, d)
				}
			}
		}
	} else {
		fmt.Printf("[SSH Collector] Erro ao executar comandos: %v\n", err)
	}

	return hostInfo, cpuInfo, memInfo, diskInfo, netInfo, procInfo
}

type SSHDockerCollector struct {
	client *ssh.Client
}

func NewSSHDockerCollector(client *ssh.Client) *SSHDockerCollector {
	return &SSHDockerCollector{client: client}
}

func (d *SSHDockerCollector) Collect(ctx context.Context) models.DockerSummary {
	summary := models.DockerSummary{}

	session, err := d.client.NewSession()
	if err != nil {
		return summary
	}
	defer session.Close()

	// Obtém lista de containers (tenta docker direto, se falhar ou não tiver permissão, tenta sudo docker -n)
	dockerCmd := `docker ps -a --format '{"id":"{{.ID}}","name":"{{.Names}}","image":"{{.Image}}","state":"{{.State}}","status":"{{.Status}}","ports":"{{.Ports}}"}' 2>/dev/null || sudo -n docker ps -a --format '{"id":"{{.ID}}","name":"{{.Names}}","image":"{{.Image}}","state":"{{.State}}","status":"{{.Status}}","ports":"{{.Ports}}"}' 2>/dev/null`
	out, err := runWithTimeout(session, dockerCmd, 3*time.Second)
	if err != nil {
		return summary
	}

	scanner := bufio.NewScanner(bytes.NewReader(out))
	for scanner.Scan() {
		line := scanner.Text()
		var temp map[string]string
		if err := json.Unmarshal([]byte(line), &temp); err == nil {
			c := models.ContainerInfo{
				ID:     temp["id"],
				Name:   temp["name"],
				Image:  temp["image"],
				State:  temp["state"],
				Status: temp["status"],
			}
			if temp["ports"] != "" {
				c.Ports = []string{temp["ports"]}
			}
			summary.Containers = append(summary.Containers, c)
			summary.Total++
			switch c.State {
			case "running":
				summary.Running++
			case "paused":
				summary.Paused++
			default:
				summary.Stopped++
			}
		}
	}

	return summary
}

func (d *SSHDockerCollector) Action(ctx context.Context, containerID, action string) error {
	session, err := d.client.NewSession()
	if err != nil {
		return err
	}
	defer session.Close()

	var cmd string
	switch action {
	case "start":
		cmd = fmt.Sprintf("docker start %s 2>/dev/null || sudo -n docker start %s", containerID, containerID)
	case "stop":
		cmd = fmt.Sprintf("docker stop %s 2>/dev/null || sudo -n docker stop %s", containerID, containerID)
	case "restart":
		cmd = fmt.Sprintf("docker restart %s 2>/dev/null || sudo -n docker restart %s", containerID, containerID)
	case "remove", "delete":
		cmd = fmt.Sprintf("docker rm -f %s 2>/dev/null || sudo -n docker rm -f %s", containerID, containerID)
	default:
		return fmt.Errorf("ação inválida: %s", action)
	}

	_, err = session.Output(cmd)
	return err
}

type sessionReadCloser struct {
	io.Reader
	session *ssh.Session
}

func (s *sessionReadCloser) Close() error {
	return s.session.Close()
}

func (d *SSHDockerCollector) GetLogs(ctx context.Context, containerID string, tail string) (io.ReadCloser, error) {
	session, err := d.client.NewSession()
	if err != nil {
		return nil, err
	}

	stdout, err := session.StdoutPipe()
	if err != nil {
		session.Close()
		return nil, err
	}

	if tail == "" {
		tail = "100"
	}

	cmd := fmt.Sprintf("docker logs --tail %s -f %s", tail, containerID)
	if err := session.Start(cmd); err != nil {
		session.Close()
		return nil, err
	}

	// Não chamamos defer session.Close() aqui porque queremos manter a sessão aberta para o tail
	// Ela será fechada quando o ReadCloser for fechado.
	return &sessionReadCloser{Reader: stdout, session: session}, nil
}

