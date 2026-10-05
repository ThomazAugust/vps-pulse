package collector

import (
	"context"
	"io"
	"vps-panel-agent/pkg/models"
)

type SystemCollector interface {
	Collect() (models.HostInfo, models.CPUInfo, models.MemoryInfo, []models.DiskInfo, []models.NetInfo, []models.ProcessInfo)
}

type DockerCollector interface {
	Collect(ctx context.Context) models.DockerSummary
	Action(ctx context.Context, containerID, action string) error
	GetLogs(ctx context.Context, containerID, tail string) (io.ReadCloser, error)
}
